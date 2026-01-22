<script setup lang="ts">
import NotificationSystem from './components/NotificationSystem.vue';
import { useRouter } from 'vue-router';
import { onMounted } from 'vue';

onMounted(async () => {
  const router = useRouter();
  router.push('/editor');
});
</script>

<template>
<header class="text-center">
  <div class="flex flex-col md:flex-row items-center justify-between gap-6">
    <div class="text-center">
      <div
        class="md:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-cyan-500"
      >
        TreeStructureEditor
      </div>
      <p class="text-slate-700 mx-auto md:mx-0">
        A hierarchical markdown editor with visual tree structure
      </p>
    </div>
    <div class="flex justify-center space-x-4">
      <router-link to="/editor" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        Editor
      </router-link>
      <router-link to="/files" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        File Browser
      </router-link>
      <router-link to="/ai-settings" class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
        AI Settings
      </router-link>
    </div>
  </div>
</header>
  <div class="mx-auto">
    <router-view />
  </div>
  <footer class="mt-12 text-center text-slate-500 text-sm">
    <p>TreeStructureEditor • Hierarchical Markdown Editor • by zpb911km</p>
  </footer>
  <NotificationSystem />
</template>

<style scoped>
@import "./index.css";
</style>