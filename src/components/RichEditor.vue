<template>
  <div ref="editorContainer" class="monaco-editor-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { getAISuggestionService } from "../services/aiSuggestion";
import { showInfo } from "../utils/notifications";
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

// ── 幽灵文本状态 ──────────────────────────────────────────
let ghostTextDecorations: monaco.editor.IEditorDecorationsCollection | null =
  null;
let isGhostTextActive = false;
/** 标志当前 edit 是否为 AI 插入，用于区分用户输入 vs AI 写入 */
let isAIEdit = false;
let keyDownListener: monaco.IDisposable | null = null;

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

  // ✅ 注册 AI 快捷键 (Alt+\) 手动触发补全 + 空的 inline provider
  registerAISuggestionShortcut();
  registerAIProviderStub();

  // ✅ 键盘监听：Alt+\ 触发补全，Tab 接受幽灵文本
  keyDownListener = editorInstance.onKeyDown((e) => {
    const browserEvent = e.browserEvent as KeyboardEvent;

    // Tab → 接受幽灵文本
    if (e.keyCode === monaco.KeyCode.Tab && isGhostTextActive) {
      e.preventDefault();
      e.stopPropagation();
      acceptGhostText();
      return;
    }

    // Alt+\ → 手动触发 AI 补全
    if (browserEvent.key === "\\" && browserEvent.altKey) {
      e.preventDefault();
      e.stopPropagation();
      triggerCompletion();
      return;
    }
  });

  // ✅ 监听内容变化：区分 AI 编辑 vs 用户输入
  contentChangeListener = editorInstance.onDidChangeModelContent(() => {
    if (isAIEdit) return;

    // 用户输入 → 移除幽灵文本 + 取消流
    if (isGhostTextActive) {
      removeGhostTextInternal();
    }
    abortCurrentStream();
  });

  // 监听内容变化，实现双向绑定（跳过 AI 编辑）
  editorInstance.onDidChangeModelContent(() => {
    if (!isAIEdit) {
      emit("update:modelValue", editorInstance!.getValue());
      adjustEditorHeight();
    }
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

/** 手动触发一次流式 AI 补全会话（无位置限制） */
function triggerCompletion() {
  if (!editorInstance) return;

  const model = editorInstance.getModel();
  if (!model) return;

  const aiService = getAISuggestionService();
  if (!aiService) return;

  // 取消已有的流 + 清理幽灵文本
  abortCurrentStream();
  removeGhostTextInternal();

  const position = editorInstance.getPosition() || { lineNumber: 1, column: 1 };

  const abortController = new AbortController();
  currentStream = {
    accumulated: "",
    active: true,
    abortController,
    triggerDebounce: null,
  };

  aiService
    .getSuggestionStream(
      model.getValue(),
      { lineNumber: position.lineNumber, column: position.column },
      (text: string) => {
        if (!currentStream || !currentStream.active) return;
        currentStream.accumulated = text;
        setGhostText(text, position);
      },
      abortController.signal,
    )
    .then((finalText) => {
      if (currentStream) {
        currentStream.active = false;
        if (finalText && editorInstance) {
          setGhostText(finalText, editorInstance.getPosition() ?? position);
        }
      }
      console.log(
        "[Editor] Stream completed, final length:",
        finalText?.length,
      );
    })
    .catch((err) => {
      console.error("[Editor] Stream error:", err);
      if (currentStream) {
        currentStream.active = false;
        currentStream = null;
      }
      removeGhostTextInternal();
    });
}

// ── 幽灵文本管理 ────────────────────────────────────────────

/** 将光标位置转换为 Monaco Position */
function toPos(p: { lineNumber: number; column: number }): monaco.Position {
  return new monaco.Position(p.lineNumber, p.column);
}

/** 在指定位置插入/更新幽灵文本 */
function setGhostText(
  text: string,
  insertAt: { lineNumber: number; column: number },
) {
  if (!editorInstance) return;
  const ed = editorInstance;
  const model = ed.getModel();
  if (!model) return;

  // 先删旧的
  removeGhostTextInternal();

  if (!text || text.trim() === "") return;

  // 缩进对齐
  const lineContent = model.getLineContent(insertAt.lineNumber);
  const leadingWs = lineContent.match(/^\s*/)?.[0] || "";
  const aligned = text
    .split("\n")
    .map((ln, i) => (i === 0 ? ln : leadingWs + ln))
    .join("\n");

  const insertRange = new monaco.Range(
    insertAt.lineNumber,
    insertAt.column,
    insertAt.lineNumber,
    insertAt.column,
  );

  isAIEdit = true;
  model.pushEditOperations(
    undefined,
    [{ range: insertRange, text: aligned }],
    () => [toPos(insertAt)],
  );
  isAIEdit = false;

  // 计算实际插入的结束位置
  const lines = aligned.split("\n");
  const endLine = insertAt.lineNumber + lines.length - 1;
  const endCol =
    lines.length === 1
      ? insertAt.column + aligned.length
      : lines[lines.length - 1].length + 1;

  const ghostRange = new monaco.Range(
    insertAt.lineNumber,
    insertAt.column,
    endLine,
    endCol,
  );

  ghostTextDecorations = model.createDecorationsCollection([
    {
      range: ghostRange,
      options: { inlineClassName: "ai-ghost-text-decoration" },
    },
  ]);

  isGhostTextActive = true;
}

/** 从文档中移除幽灵文本内容 + 清除装饰 */
function removeGhostTextInternal() {
  if (!isGhostTextActive || !editorInstance) return;
  const ed = editorInstance;
  const model = ed.getModel();
  if (!model) return;

  const ranges = ghostTextDecorations?.getRanges() ?? [];
  if (ranges.length === 0) {
    clearGhostTextDecorations();
    return;
  }

  const deleteRange = ranges[0];
  const cursorBack = new monaco.Position(
    deleteRange.startLineNumber,
    deleteRange.startColumn,
  );

  isAIEdit = true;
  model.pushEditOperations(
    undefined,
    [{ range: deleteRange, text: "" }],
    () => [cursorBack],
  );
  isAIEdit = false;

  clearGhostTextDecorations();
}

function clearGhostTextDecorations() {
  ghostTextDecorations?.clear();
  ghostTextDecorations = null;
  isGhostTextActive = false;
}

/** 接受幽灵文本（保留内容，仅移除装饰） */
function acceptGhostText() {
  if (!isGhostTextActive || !ghostTextDecorations) {
    currentStream = null;
    return;
  }
  ghostTextDecorations.clear();
  ghostTextDecorations = null;
  isGhostTextActive = false;
  currentStream = null;

  // 同步到父组件
  if (editorInstance) {
    emit("update:modelValue", editorInstance.getValue());
    adjustEditorHeight();
  }

  showInfo("AI suggestion accepted");
}

/**
 * 注册 AI 快捷键：Alt+\ 手动触发补全
 */
const registerAISuggestionShortcut = () => {
  if (!editorInstance) return;

  aiTriggerAction = editorInstance.addAction({
    id: "ai-trigger-completion",
    label: "Trigger AI Completion",
    keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.US_BSLASH],
    contextMenuGroupId: "navigation",
    contextMenuOrder: 1.5,
    run: () => {
      triggerCompletion();
    },
  });
};

/**
 * 注册一个空的 inline provider（占位用，避免 Monaco 报错）
 */
const registerAIProviderStub = () => {
  completionProvider = monaco.languages.registerInlineCompletionsProvider(
    "markdown",
    {
      provideInlineCompletions: async (_model, _position, _context, token) => {
        if (token.isCancellationRequested) return { items: [] };
        return { items: [] };
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
  // 清理幽灵文本
  removeGhostTextInternal();
  // ✅ 清理快捷键
  aiTriggerAction?.dispose();
  aiTriggerAction = null;
  keyDownListener?.dispose();
  keyDownListener = null;
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

<!-- 全局样式：Monaco 内部 decoration 不受 scoped 影响 -->
<style>
.ai-ghost-text-decoration {
  color: #888 !important;
  font-style: italic !important;
  opacity: 0.85 !important;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-underline-offset: 2px;
}
</style>
