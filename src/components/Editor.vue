<!-- MonacoEditor.vue -->
<template>
  <div ref="editorContainer" class="monaco-editor-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { getAISuggestionService } from "../services/aiSuggestion";

const props = defineProps({
  modelValue: String,
});

const emit = defineEmits(["update:modelValue", "blur"]);

const editorContainer = ref<HTMLElement | null>(null);
let editorInstance: monaco.editor.IStandaloneCodeEditor | null = null;
let inlineCompletionProvider: monaco.IDisposable | null = null;

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
    lineNumbers: "off",
    scrollBeyondLastLine: false,
    wordWrap: "on",
    automaticLayout: true,
    padding: { top: 8, bottom: 8 },
    suggest: {
      showKeywords: false,
      showSnippets: false,
      showStatusBar: true,
      preview: true,
      previewMode: 'subwordSmart'
    },
    bracketPairColorization: { enabled: true },
    autoClosingBrackets: "always",
    autoClosingQuotes: "always",
    autoSurround: "languageDefined",
    quickSuggestions: false,
    acceptSuggestionOnEnter: "on",
    tabCompletion: "on",
    suggestOnTriggerCharacters: false
  });

  editorInstance.focus();

  // 注册 AI 建议提供者
  registerAISuggestionProvider();

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

/**
 * 注册 AI 建议提供者
 */
const registerAISuggestionProvider = () => {
  console.log('[Editor] Registering AI suggestion provider');
  const aiService = getAISuggestionService();
  if (!aiService) {
    console.warn('[Editor] AI suggestion service not available');
    return;
  }

  // 使用标准的代码补全而不是内联补全
  inlineCompletionProvider = monaco.languages.registerCompletionItemProvider('markdown', {
    provideCompletionItems: async (model, position, context, token) => {
      try {
        console.log('[Editor] provideCompletionItems invoked', {
          position,
          triggerKind: context.triggerKind
        });

        // 如果请求已被取消,直接返回
        if (token.isCancellationRequested) {
          console.log('[Editor] Request cancelled before API call');
          return { suggestions: [] };
        }

        const suggestion = await aiService.getSuggestion(
          model.getValue(),
          { lineNumber: position.lineNumber, column: position.column }
        );

        if (!suggestion) {
          console.log('[Editor] No suggestion available');
          return { suggestions: [] };
        }

        console.log('[Editor] Returning suggestion', { suggestion });

        return {
          suggestions: [
            {
              label: 'AI Suggestion',
              kind: monaco.languages.CompletionItemKind.Text,
              insertText: suggestion,
              insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              detail: 'AI-generated suggestion',
              documentation: {
                value: suggestion,
                isTrusted: true,
                supportHtml: false
              },
              range: {
                startLineNumber: position.lineNumber,
                startColumn: position.column,
                endLineNumber: position.lineNumber,
                endColumn: position.column
              },
              sortText: '0', // 确保排在最前面
              preselect: true // 自动预选
            }
          ]
        };
      } catch (error) {
        console.error('[Editor] Completion error:', error);
        return { suggestions: [] };
      }
    }
  });
  console.log('[Editor] AI suggestion provider registered successfully');
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
  if (inlineCompletionProvider) {
    console.log('[Editor] Disposing inlineCompletionProvider');
    inlineCompletionProvider.dispose();
    inlineCompletionProvider = null;
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
</style>
