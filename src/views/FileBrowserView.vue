<script setup lang="ts">
import { useRouter } from "vue-router";
import FileBrowser from "../components/FileBrowser.vue";
import { onMounted } from "vue";
import { mkTreePathDir } from "../apis";

const router = useRouter();

const handleFileSelected = (filePath: string) => {
  // 导航到编辑器并传递文件路径
  router.push({
    name: 'editor',
    query: { file: filePath }
  });
};

onMounted(async () => {
  await mkTreePathDir();
});
</script>

<template>
  <div class="file-browser-view">
    <div class="max-w-4xl mx-auto">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-3xl font-bold text-gray-800 dark:text-white">文件浏览器</h2>
      </div>

      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
        <FileBrowser @file-selected="handleFileSelected" />
      </div>
    </div>
  </div>
</template>

