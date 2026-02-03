<script setup lang="ts">
import { watch, provide, ref } from "vue";
import NotificationSystem from "./components/NotificationSystem.vue";
import { initializeTheme } from "./utils/theme";
import { tree } from "./utils/tree";

// 内部剪贴板
const clipboardText = ref("");
const clipboardSelection = ref({ start: 0, end: 0 });

// 剪贴板操作方法
const setClipboardText = (text: string) => {
  clipboardText.value = text;
};

const getClipboardText = () => {
  return clipboardText.value;
};

const clearClipboard = () => {
  clipboardText.value = "";
  clipboardSelection.value = { start: 0, end: 0 };
};

const setClipboardSelection = (start: number, end: number) => {
  clipboardSelection.value = { start, end };
};

const getClipboardSelection = () => {
  return clipboardSelection.value;
};

// 提供剪贴板功能给子组件
provide("internalClipboard", {
  text: clipboardText,
  selection: clipboardSelection,
  setText: setClipboardText,
  getText: getClipboardText,
  clear: clearClipboard,
  setSelection: setClipboardSelection,
  getSelection: getClipboardSelection,
});

initializeTheme();
watch(
  () => tree,
  () => {},
);
</script>

<template>
  <div class="min-h-screen flex flex-col pb-20">
    <main class="flex-grow pt-4 pb-20">
      <router-view />
    </main>
    <footer
      class="mt-12 text-center text-slate-500 dark:text-slate-400 text-sm"
    >
      <p>TreeStructureEditor • Hierarchical Markdown Editor • by zpb911km</p>
    </footer>

    <!-- 底部导航栏 -->
    <nav
      class="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shadow-lg z-50"
    >
      <div class="flex items-center justify-around max-w-md mx-auto h-full">
        <router-link
          to="/"
          class="flex flex-col items-center px-2 py-2 w-1/3 h-full"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-gray-600 dark:text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <span class="text-xs mt-1 text-gray-600 dark:text-slate-300"
            >Editor</span
          >
        </router-link>

        <router-link
          to="/files"
          class="flex flex-col items-center px-2 py-2 w-1/3 h-full"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-gray-600 dark:text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <span class="text-xs mt-1 text-gray-600 dark:text-slate-300"
            >Files</span
          >
        </router-link>

        <router-link
          to="/settings"
          class="flex flex-col items-center px-2 py-2 w-1/3 h-full"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5 text-gray-600 dark:text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span class="text-xs mt-1 text-gray-600 dark:text-slate-300"
            >Settings</span
          >
        </router-link>
      </div>
    </nav>

    <NotificationSystem />
  </div>
</template>

<style scoped>
@import "./index.css";

/* 添加激活状态样式 */
.router-link-active svg,
.router-link-exact-active svg {
  @apply text-blue-500 dark:text-blue-400;
}

.router-link-active span,
.router-link-exact-active span {
  @apply text-blue-500 dark:text-blue-400 font-medium;
}
</style>
