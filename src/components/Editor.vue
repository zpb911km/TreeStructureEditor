<!-- MonacoEditor.vue -->
<template>
  <div ref="editorContainer" class="monaco-editor-container"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from "vue";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";

const props = defineProps({
  modelValue: String,
});

const emit = defineEmits(["update:modelValue", "blur"]);

const editorContainer = ref(null);
let editorInstance = null;

onMounted(() => {
  // 配置 Monaco Editor worker
  self.MonacoEnvironment = {
    getWorker: () => new editorWorker(),
  };

  editorInstance = monaco.editor.create(editorContainer.value, {
    value: props.modelValue || "",
    language: "markdown",
    theme: "vs",
    minimap: { enabled: false },
    fontSize: 14,
    lineNumbers: "off",
    scrollBeyondLastLine: false,
    wordWrap: "on",
    automaticLayout: true,
    padding: { top: 8, bottom: 8 },
    suggest: {
      showKeywords: true,
      showSnippets: true,
    },
    bracketPairColorization: { enabled: true },
    autoClosingBrackets: "always",
    autoClosingQuotes: "always",
    autoSurround: "languageDefined",
  });

  editorInstance.focus();

  // 监听内容变化，实现双向绑定
  editorInstance.onDidChangeModelContent(() => {
    emit("update:modelValue", editorInstance.getValue());
    adjustEditorHeight();
  });

  // 监听失去焦点事件
  editorInstance.onDidBlurEditorWidget(() => {
    emit("blur");
  });

  adjustEditorHeight();
});

const adjustEditorHeight = () => {
  if (!editorInstance) return;

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
    if (editorInstance && newValue !== editorInstance.getValue()) {
      editorInstance.setValue(newValue);
    }
  },
);

onBeforeUnmount(() => {
  if (editorInstance) {
    editorInstance.dispose();
  }
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
  ring: 2px;
  ring-color: #34d399;
  border-color: #34d399;
}
</style>
