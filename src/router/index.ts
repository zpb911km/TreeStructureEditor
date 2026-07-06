import { createRouter, createWebHistory } from "vue-router";
import Editor from "../views/EditorView.vue";
import Settings from "../views/Settings.vue";
import FileBrowserView from "../views/FileBrowserView.vue";
import AIChatView from "../views/AIChatView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "editor",
      component: Editor,
    },
    {
      path: "/settings",
      name: "settings",
      component: Settings,
    },
    {
      path: "/files",
      name: "files",
      component: FileBrowserView,
    },
    {
      path: "/ai-chat",
      name: "ai-chat",
      component: AIChatView,
    },
  ],
});

export default router;
