import { createRouter, createWebHistory } from 'vue-router';
import Editor from '../views/Editor.vue';
import AISettings from '../views/AISettings.vue';
import FileBrowserView from '../views/FileBrowserView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/editor',
      name: 'editor',
      component: Editor,
    },
    {
      path: '/ai-settings',
      name: 'ai-settings',
      component: AISettings,
    },
    {
      path: '/files',
      name: 'files',
      component: FileBrowserView,
    },
  ],
});

export default router;