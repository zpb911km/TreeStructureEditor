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
let idleTrigger: IdleTrigger | null = null;
let allowNextAICompletion = false; // 用于控制是否允许下一次 AI 补全
let completeCache: Map<string, string> = new Map();
let autoIdleTriggerLock = true;

// 更新 Monaco Editor 主题
const updateEditorTheme = async () => {
  if (!editorInstance) return;
  const isDark = await loadDarkMode();
  monaco.editor.setTheme(isDark ? "vs-dark" : "vs");
};

// ✅ 闲时检测器类
class IdleTrigger {
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly delay: number;
  private readonly onIdle: () => void;
  private disposed = false;

  constructor(delay: number, onIdle: () => void) {
    this.delay = delay;
    this.onIdle = onIdle;
    this.reset();
  }

  reset() {
    if (this.disposed) return;
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }
    this.timeoutId = setTimeout(() => {
      if (!this.disposed) {
        this.onIdle();
        // 触发后自动重置，准备下一次检测
        this.reset();
      }
    }, this.delay);
  }

  dispose() {
    this.disposed = true;
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

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
      previewMode: 'subwordSmart'
    },
    inlineSuggest: {
      enabled: true
    },
    bracketPairColorization: { enabled: true },
    autoClosingBrackets: "always",
    autoClosingQuotes: "always",
    autoSurround: "languageDefined",
    quickSuggestions: true,
    acceptSuggestionOnEnter: "on",
    tabCompletion: "on",
    suggestOnTriggerCharacters: true
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
    attributeFilter: ['class']
  });

  // ✅ 注册 AI 建议提供者（使用闲时检测）
  registerAISuggestionProvider();

  // ✅ 监听内容变化，用于重置闲时计时器
  contentChangeListener = editorInstance.onDidChangeModelContent(() => {
    if (idleTrigger) {
      idleTrigger.reset();
    }
    // 有输入时，重置允许标志
    allowNextAICompletion = false;
  });

  // 监听内容变化，实现双向绑定
  editorInstance.onDidChangeModelContent(() => {
    emit("update:modelValue", editorInstance!.getValue());
    adjustEditorHeight();
  });

  // 监听失去焦点事件
  editorInstance.onDidBlurEditorWidget(() => {
    emit("blur");
  });

  adjustEditorHeight();
});

const IDLE_DELAY = 3_000; // 3 秒无输入后触发 AI

/**
 * 判断是否应在当前位置触发 AI 行内补全（移除节流逻辑）
 */
function shouldTriggerAIWithoutThrottle(model: monaco.editor.ITextModel, position: monaco.Position): boolean {
  const lineNumber = position.lineNumber;
  const column = position.column;

  // 获取当前行内容
  const lineContent = model.getLineContent(lineNumber);

  // 1. 确保光标在行尾或只有空白字符在后面
  const textAfterCursor = lineContent.slice(column - 1);
  if (textAfterCursor.trim() !== '') {
    // 光标后有非空白字符，说明不是行尾，不触发
    return false;
  }

  // 2. 如果光标前是字母/数字/下划线，说明在单词中间，跳过（避免打断 typing）
  if (column > 1) {
    const charBefore = lineContent[column - 2];
    if (/[a-zA-Z0-9_]/.test(charBefore)) {
      return false;
    }
  }
  return true;
}

const getCacheKey = (model: monaco.editor.ITextModel, position: monaco.Position) => {
  const key = `${model.uri.toString()}:${position.lineNumber}:${position.column}`;
  console.log(`[Editor] Cache key: ${key}`);
  return key;
};

/**
 * 注册 AI 行内补全 Provider（Inline Completions）
 */
const registerAISuggestionProvider = () => {
  console.log('[Editor] Registering AI inline suggestion provider with idle detection');
  const aiService = getAISuggestionService();
  if (!aiService) {
    console.warn('[Editor] AI suggestion service not available');
    return;
  }

  // ✅ 创建闲时检测器
  idleTrigger = new IdleTrigger(IDLE_DELAY, () => {
    console.log('[Editor] User is idle, AI completion is now allowed');
    allowNextAICompletion = true;
    // 可选：触发一次 inline suggest（Monaco 会自动调用 provideInlineCompletions）
    if (!autoIdleTriggerLock) {
      editorInstance?.trigger('ai', 'editor.action.inlineSuggest.trigger', {});
      autoIdleTriggerLock = true;
    } else {
      console.log('[Editor] AI completion is locked by previous completion');
    }
  });

  completionProvider = monaco.languages.registerInlineCompletionsProvider('markdown', {
    provideInlineCompletions: async (model, position, _, token) => {
      try {
        if (token.isCancellationRequested) {
          return { items: [] };
        }

        // 解锁
        autoIdleTriggerLock = false;

        // ✅ 不再使用 shouldTriggerAI 做节流，而是依赖 idle 机制
        // 但我们仍保留“行尾”和“非单词中”判断，避免干扰
        const basicCheck = shouldTriggerAIWithoutThrottle(model, position);
        if (!basicCheck) {
          return { items: [] };
        }

        // ✅ 只有在 idle 后才允许触发
        if (!allowNextAICompletion) {
          console.log('[Editor] AI completion not allowed due to idle');
          return { items: [] };
        }

        // 消费一次允许标志
        allowNextAICompletion = false;
        
        let suggestion: string | null = null;

        const cacheKey = getCacheKey(model, position);
        if (completeCache.has(cacheKey)) {
          console.log('[Editor] Using cached completion for', cacheKey);
          suggestion = completeCache.get(cacheKey) || "";
        } else {
          console.log('[Editor] AI inline completion triggered at', position);
          showInfo('Asking AI for completion...');
          suggestion = await aiService.getSuggestion(
            model.getValue(),
            { lineNumber: position.lineNumber, column: position.column }
          );
          if (suggestion) {
            completeCache.set(cacheKey, suggestion);
          }
        }

        if (!suggestion || typeof suggestion !== 'string' || suggestion.trim() === '') {
          return { items: [] };
        }

        // ✅ 处理多行缩进对齐
        const currentLine = model.getLineContent(position.lineNumber);
        const leadingWhitespace = currentLine.match(/^\s*/)?.[0] || '';
        const alignedSuggestion = suggestion
          .split('\n')
          .map((line, i) => (i === 0 ? line : leadingWhitespace + line))
          .join('\n');

        // ✅ 返回行内补全项
        return {
          items: [
            {
              insertText: alignedSuggestion,
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column
              }
            }
          ]
        };
      } catch (error) {
        console.error('[Editor] AI inline completion error:', error);
        return { items: [] };
      }
    },
    disposeInlineCompletions: () => {
      console.log('[Editor] Disposing AI inline suggestion provider');
    }
  });

  console.log('[Editor] AI inline suggestion provider registered successfully');
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
    if (editorInstance && newValue !== undefined && newValue !== editorInstance.getValue()) {
      editorInstance.setValue(newValue);
    }
  },
);

onBeforeUnmount(() => {
  console.log('[Editor] onBeforeUnmount - Cleaning up resources');
  // ✅ 清理闲时检测器
  idleTrigger?.dispose();
  idleTrigger = null;
  contentChangeListener?.dispose();
  if (completionProvider) {
    console.log('[Editor] Disposing inlineCompletionProvider');
    completionProvider.dispose();
    completionProvider = null;
  }
  if (editorInstance) {
    console.log('[Editor] Disposing editorInstance');
    editorInstance.dispose();
    editorInstance = null;
  }
  console.log('[Editor] Cleanup complete');
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