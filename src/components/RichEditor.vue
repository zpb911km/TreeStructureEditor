<template>
  <div ref="editorContainer" class="monaco-editor-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { getAISuggestionService } from "../services/aiSuggestion";
import { loadDarkMode } from "../utils/theme";

const props = defineProps({
  modelValue: String,
});

const emit = defineEmits(["update:modelValue", "blur"]);

const editorContainer = ref<HTMLElement | null>(null);
let editorInstance: monaco.editor.IStandaloneCodeEditor | null = null;
let completionProvider: monaco.IDisposable | null = null;
let contentChangeListener: monaco.IDisposable | null = null;
let aiTriggerAction: monaco.IDisposable | null = null;

// ── 流式会话状态 ──────────────────────────────────────────
interface StreamSession {
  /** 当前累积的补全文本 */
  accumulated: string;
  /** 是否仍在接收 token */
  active: boolean;
  /** 用于取消请求的 AbortController */
  abortController: AbortController;
  /** 防抖：避免 token 到达过快导致频繁触发 */
  triggerDebounce: ReturnType<typeof setTimeout> | null;
}

let currentStream: StreamSession | null = null;

// ── Inline Suggestion 状态 ───────────────────────────────
/**
 * 当前要展示的 Inline Suggestion。
 * provideInlineCompletions 会从这里读取数据，
 * Monaco 将其渲染为真正的幽灵文本（不修改文档内容）。
 */
let currentInlineSuggestion: string | null = null;
/** 补全生成时的光标位置，用于 provider 判断是否还在原位 */
let suggestionPosition: { lineNumber: number; column: number } | null = null;
/** 标记当前编辑是否为 AI 写入，用于跳过 content change 处理 */
let isAIEdit = false;

// 更新 Monaco Editor 主题
const updateEditorTheme = async () => {
  if (!editorInstance) return;
  const isDark = await loadDarkMode();
  monaco.editor.setTheme(isDark ? "vs-dark" : "vs");
};

onMounted(() => {
  // 配置 Monaco Editor worker
  self.MonacoEnvironment = {
    getWorker: () => new editorWorker(),
  };

  editorInstance = monaco.editor.create(editorContainer.value!, {
    value: props.modelValue || "",
    language: "markdown",
    theme: "vs",
    minimap: { enabled: false },
    fontSize: 16,
    lineNumbers: "on",
    scrollBeyondLastLine: false,
    wordWrap: "on",
    automaticLayout: true,
    padding: { top: 8, bottom: 8 },
    suggest: {
      showKeywords: true,
      showSnippets: true,
      showStatusBar: true,
      preview: true,
      previewMode: "subwordSmart",
    },
    inlineSuggest: {
      enabled: true,
    },
    bracketPairColorization: { enabled: true },
    autoClosingBrackets: "always",
    autoClosingQuotes: "always",
    autoSurround: "languageDefined",
    quickSuggestions: true,
    acceptSuggestionOnEnter: "on",
    tabCompletion: "on",
    suggestOnTriggerCharacters: true,
  });

  editorInstance.focus();

  // 初始化主题
  updateEditorTheme();

  // 监听主题变化
  const themeObserver = new MutationObserver(() => {
    updateEditorTheme();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });

  // ✅ 注册 AI 快捷键 (Ctrl+\) + 真正的 Inline Suggestion Provider
  registerAISuggestionShortcut();
  registerInlineSuggestionProvider();

  // ✅ 键盘监听：Ctrl+\ 触发补全（addAction 的 keybindings 可能不稳定，这里做双重保障）
  editorInstance.onKeyDown((e) => {
    if (
      (e.browserEvent as KeyboardEvent).key === "\\" &&
      (e.browserEvent as KeyboardEvent).ctrlKey
    ) {
      e.preventDefault();
      e.stopPropagation();
      triggerCompletion();
    }
  });

  // ✅ 用户输入 → 取消流式请求（Monaco 会自动隐藏 inline suggestion）
  contentChangeListener = editorInstance.onDidChangeModelContent(() => {
    // AI 内部操作（如 ZWS 触发/幽灵文本清除）跳过处理
    if (isAIEdit) return;

    // 用户主动输入时，清除过期的 suggestion 状态
    currentInlineSuggestion = null;
    suggestionPosition = null;
    abortCurrentStream();
    emit("update:modelValue", editorInstance!.getValue());
    adjustEditorHeight();
  });

  // 监听失去焦点事件
  editorInstance.onDidBlurEditorWidget(() => {
    emit("blur");
  });

  adjustEditorHeight();
});

// ── 流式会话控制 ──────────────────────────────────────────

/** 取消当前正在进行的流式请求 */
function abortCurrentStream() {
  if (currentStream) {
    console.log("[Editor] Aborting current stream");
    currentStream.abortController.abort();
    if (currentStream.triggerDebounce) {
      clearTimeout(currentStream.triggerDebounce);
    }
    currentStream = null;
  }
}

/**
 * 强制 Monaco 重新求值内联建议（幽灵文本）。
 *
 * ⚠️ Monaco 0.55.1 源码分析：
 *   `editor.action.inlineSuggest.trigger` 命令通过 `asyncTransaction` 交易系统
 *   执行 → `model.trigger(tx, ...)`. 但独立包的交易系统 (tx) 不完整，
 *   命令静默失败，provider 不会被调用。
 *
 *   **正常工作的路径**：用户打字 → `onDidType` 事件 → `model.trigger()` (无 tx) → provider.
 *
 * 这里的策略：
 *   1. 先尝试命令（可能在部分版本中生效）
 *   2. 使用 `type` 命令插入零宽空格（\u200B）→ 触发 `onDidType` → `model.trigger()`
 *   3. 在同一同步块中用 pushEditOperations 删除 ZWS（不可见，isAIEdit 跳过事件处理）
 *
 *   ZWS 插入和删除在同一微任务中完成，用户无感知，文档最终不受影响。
 */
function forceInlineSuggestRefresh() {
  if (!editorInstance) return;
  const ed = editorInstance;

  // 尝试命令触发（部分构建可能支持）
  try {
    ed.trigger("keyboard", "editor.action.inlineSuggest.trigger", {});
  } catch {
    /* ignore */
  }

  // 核心：通过 type 命令插入 ZWS，触发 onDidType → model.trigger()
  const model = ed.getModel();
  const pos = ed.getPosition();
  if (!model || !pos) return;

  isAIEdit = true;
  // 插入 ZWS → 触发 onDidType → model.trigger() → provider 被调用
  ed.trigger("keyboard", "type", { text: "\u200B" });
  // 立即删除 ZWS → 文档恢复原状
  model.pushEditOperations(
    null,
    [
      {
        range: new monaco.Range(
          pos.lineNumber,
          pos.column,
          pos.lineNumber,
          pos.column + 1,
        ),
        text: "",
      },
    ],
    () => [new monaco.Selection(pos.lineNumber, pos.column, pos.lineNumber, pos.column)],
  );
  isAIEdit = false;
}

/**
 * 手动触发一次流式 AI 补全，使用 Monaco 原生 Inline Suggestion 显示。
 *
 * 流程：
 *   1. 发起流式请求
 *   2. 每个 token 到达 → 更新 currentInlineSuggestion
 *   3. forceInlineSuggestRefresh() → Monaco 调用 provider → 渲染幽灵文本
 *   4. 用户按 Tab 接受 / 继续输入自动消失
 */
function triggerCompletion() {
  if (!editorInstance) return;

  const model = editorInstance.getModel();
  if (!model) return;

  const aiService = getAISuggestionService();
  if (!aiService) return;

  // 取消已有流
  abortCurrentStream();
  // 清除之前的 inline suggestion
  currentInlineSuggestion = null;
  suggestionPosition = null;

  const position = editorInstance.getPosition() || { lineNumber: 1, column: 1 };
  suggestionPosition = { ...position };

  const abortController = new AbortController();
  currentStream = {
    accumulated: "",
    active: true,
    abortController,
    triggerDebounce: null,
  };

  // 首次触发 provider（即使还没数据，让 Monaco 进入"待命"状态）
  currentInlineSuggestion = "";
  forceInlineSuggestRefresh();

  aiService
    .getSuggestionStream(
      model.getValue(),
      { lineNumber: position.lineNumber, column: position.column },
      (text: string) => {
        if (!currentStream || !currentStream.active) return;
        currentStream.accumulated = text;

        // 更新数据后强制重新触发 provider
        currentInlineSuggestion = text;
        forceInlineSuggestRefresh();
      },
      abortController.signal,
    )
    .then((finalText) => {
      if (currentStream) {
        currentStream.active = false;
        if (finalText) {
          currentInlineSuggestion = finalText;
          forceInlineSuggestRefresh();
        } else {
          currentInlineSuggestion = null;
          suggestionPosition = null;
          forceInlineSuggestRefresh();
        }
        currentStream = null;
      }
      console.log(
        "[Editor] Stream completed, final length:",
        finalText?.length,
      );
    })
    .catch((err) => {
      if (err?.name !== "AbortError") {
        console.error("[Editor] Stream error:", err);
      }
      currentInlineSuggestion = null;
      suggestionPosition = null;
      if (currentStream) {
        currentStream.active = false;
        currentStream = null;
      }
      // 触发空渲染来清除 inline suggest
      forceInlineSuggestRefresh();
    });
}

/**
 * 注册 AI 快捷键：Ctrl+\ 手动触发补全
 */
const registerAISuggestionShortcut = () => {
  if (!editorInstance) return;

  aiTriggerAction = editorInstance.addAction({
    id: "ai-trigger-completion",
    label: "Trigger AI Completion",
    keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Backslash],
    contextMenuGroupId: "navigation",
    contextMenuOrder: 1.5,
    run: () => {
      triggerCompletion();
    },
  });
};

/**
 * 注册真正的 Inline Suggestion Provider。
 *
 * Monaco 在需要显示幽灵文本时调用 provideInlineCompletions，
 * 我们从 currentInlineSuggestion 读取数据返回。
 * 数据不存在或光标位置不匹配时返回空数组（不显示幽灵文本）。
 */
const registerInlineSuggestionProvider = () => {
  completionProvider = monaco.languages.registerInlineCompletionsProvider(
    "markdown",
    {
      provideInlineCompletions: (model, position, _context, token) => {
        if (token.isCancellationRequested) return { items: [] };

        // 没有待显示的补全 → 不显示
        if (!currentInlineSuggestion || !suggestionPosition) {
          return { items: [] };
        }

        // 光标位置已改变 → 不显示（用户继续输入了）
        if (
          position.lineNumber !== suggestionPosition.lineNumber ||
          position.column !== suggestionPosition.column
        ) {
          return { items: [] };
        }

        // 缩进对齐
        const lineContent = model.getLineContent(position.lineNumber);
        const leadingWs = lineContent.match(/^\s*/)?.[0] || "";
        const aligned = currentInlineSuggestion
          .split("\n")
          .map((ln, i) => (i === 0 ? ln : leadingWs + ln))
          .join("\n");

        return {
          items: [
            {
              insertText: aligned,
              range: new monaco.Range(
                position.lineNumber,
                position.column,
                position.lineNumber,
                position.column,
              ),
            },
          ],
        };
      },
      disposeInlineCompletions: () => {
        console.log("[Editor] Disposing AI inline suggestion provider");
      },
    },
  );
};

const adjustEditorHeight = () => {
  if (!editorInstance || !editorContainer.value) return;

  const contentHeight = editorInstance.getContentHeight();
  const containerHeight = editorContainer.value.getBoundingClientRect().height;

  if (contentHeight !== containerHeight) {
    editorContainer.value.style.height = `${contentHeight + 10}px`;
    editorInstance.layout(); // 重要：通知编辑器重新计算布局
    editorInstance.setScrollPosition({ scrollTop: 0 }); // 可选：每次内容变化时重置滚动条
  }
};

// 监听外部传入的值变化
watch(
  () => props.modelValue,
  (newValue) => {
    if (
      editorInstance &&
      newValue !== undefined &&
      newValue !== editorInstance.getValue()
    ) {
      editorInstance.setValue(newValue);
    }
  },
);

onBeforeUnmount(() => {
  console.log("[Editor] onBeforeUnmount - Cleaning up resources");
  // 取消正在进行的流式请求
  abortCurrentStream();
  currentInlineSuggestion = null;
  suggestionPosition = null;
  // 清理快捷键
  aiTriggerAction?.dispose();
  aiTriggerAction = null;
  contentChangeListener?.dispose();
  if (completionProvider) {
    console.log("[Editor] Disposing inlineCompletionProvider");
    completionProvider.dispose();
    completionProvider = null;
  }
  if (editorInstance) {
    console.log("[Editor] Disposing editorInstance");
    editorInstance.dispose();
    editorInstance = null;
  }
  console.log("[Editor] Cleanup complete");
});
</script>

<style scoped>
.monaco-editor-container {
  width: 100%;
  min-height: 200px;
  border: 2px solid #10b981;
  border-radius: 0.5rem;
}

.monaco-editor-container:focus-within {
  box-shadow: 0 0 0 2px #34d399;
  border-color: #34d399;
}

.dark .monaco-editor-container {
  border-color: #059669;
}

.dark .monaco-editor-container:focus-within {
  box-shadow: 0 0 0 2px #10b981;
  border-color: #10b981;
}
</style>
