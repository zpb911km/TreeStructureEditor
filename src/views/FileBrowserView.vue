<script setup lang="ts">
import { useRouter } from "vue-router";
import FileBrowser from "../components/FileBrowser.vue";

const router = useRouter();

const handleFileSelected = (filePath: string) => {
  // 导航到编辑器并传递文件路径
  router.push({
    name: 'editor',
    query: { file: filePath }
  });
};
</script>

<template>
  <div class="file-browser-view">
    <div class="max-w-4xl mx-auto p-6">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-3xl font-bold text-gray-800">文件浏览器</h2>
        <button
          @click="router.push('/editor')"
          class="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          返回编辑器
        </button>
      </div>

      <div class="bg-white rounded-xl shadow-lg p-6">
        <FileBrowser @file-selected="handleFileSelected" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.file-browser-view {
  padding: 2rem;
}
</style>