<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from "vue";
import type { TreeNode } from "../types";
import { fullMarkdownParser, renderMath } from "../utils/markdown";
import Editor from "./Editor.vue";
interface Props {
  node: TreeNode;
  level?: number;
  parentChildren?: TreeNode[];
  nodeIndex?: number;
}
interface Emits {
  (e: "update", id: string, updates: Partial<TreeNode>): void;
  (e: "delete", id: string): void;
  (e: "addChild", parentId: string, type: "branch" | "leaf"): void;
  (e: "move", id: string, direction: "up" | "down"): void;
}
const props = withDefaults(defineProps<Props>(), {
  level: 0,
  parentChildren: () => [],
  nodeIndex: 0,
});
const emit = defineEmits<Emits>();
const isEditing = ref(false);
const localContent = ref(props.node.content || "");
const expanded = ref(true);
const isMobile = ref(false);
const showDropdown = ref(false);
const nodeRef = ref<HTMLElement | null>(null);
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
};
onMounted(() => {
  checkMobile();
  window.addEventListener("resize", checkMobile);

  // 初始渲染数学公式
  if (props.node.type === "leaf" && !isEditing.value) {
    nextTick(() => {
      renderMath();
    });
  }
});

watch(
  () => props.node.content,
  (newContent) => {
    localContent.value = newContent || "";
  },
);
watch(localContent, (newContent) => {
  if (isEditing.value) {
    emit("update", props.node.id, { content: newContent });
  }
});

watch([localContent, isEditing], () => {
  if (!isEditing.value && nodeRef.value) {
    nextTick(() => {
      renderMath();
    });
  }
});
const handleTitleChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  emit("update", props.node.id, { title: target.value });
};
const handleAddBranch = () => {
  emit("addChild", props.node.id, "branch");
  showDropdown.value = false;
};
const handleAddLeaf = () => {
  emit("addChild", props.node.id, "leaf");
  showDropdown.value = false;
};
const handleMove = (direction: "up" | "down") => {
  emit("move", props.node.id, direction);
  showDropdown.value = false;
};
const handleDelete = () => {
  emit("delete", props.node.id);
  showDropdown.value = false;
};
const handleNodeClick = () => {
  if (props.node.type === "leaf") {
    isEditing.value = true;
  }
  // 枝干节点不进入编辑模式
};
const canMoveUp = computed(() => props.nodeIndex > 0);
const canMoveDown = computed(
  () =>
    props.parentChildren && props.nodeIndex < props.parentChildren.length - 1,
);
</script>
<template>
  <li
    class="relative mb-1 pl-1"
    :class="{ 'cursor-pointer': node.type === 'branch' }"
  >
    <div
      ref="nodeRef"
      class="p-2 rounded-lg relative"
      :class="[
        node.type === 'branch'
          ? 'bg-blue-50 dark:bg-blue-900/30 border-2 border-blue-200 dark:border-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/50'
          : 'bg-emerald-50 dark:bg-emerald-900/30 border-2 border-emerald-200 dark:border-emerald-700',
      ]"
      @click="handleNodeClick"
    >
      <!-- 浮动在右上角的按钮容器 -->
      <div class="absolute top-2 right-2 flex space-x-1 z-10">
        <!-- Mobile dropdown menu -->
        <div v-if="isMobile" class="relative">
          <button
            class="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/70"
            @click.stop="showDropdown = !showDropdown"
          >
            ⋯
          </button>
          <div
            v-if="showDropdown"
            class="dropdown-content absolute right-0 mt-1 w-32 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-20"
          >
            <div class="py-1">
              <button
                v-if="canMoveUp"
                class="w-full text-left px-3 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="handleMove('up')"
              >
                ↑ 上移
              </button>
              <button
                v-if="canMoveDown"
                class="w-full text-left px-3 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="handleMove('down')"
              >
                ↓ 下移
              </button>
            </div>
            <div class="border-t border-gray-200 dark:border-gray-700 my-1" />
            <div v-if="node.type === 'branch'" class="py-1">
              <button
                class="w-full text-left px-3 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="handleAddBranch"
              >
                + Branch
              </button>
              <button
                class="w-full text-left px-3 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                @click="handleAddLeaf"
              >
                + Leaf
              </button>
            </div>
            <div
              v-if="node.type === 'leaf'"
              class="border-t border-gray-200 dark:border-gray-700 my-1"
            >
              <div class="py-1">
                <button
                  class="w-full text-left px-3 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                  @click="handleDelete"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
        <!-- Desktop buttons -->
        <div v-else class="flex space-x-1">
          <div class="flex space-x-1">
            <button
              :disabled="!canMoveUp"
              :hidden="!canMoveUp"
              class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              @click.stop="handleMove('up')"
            >
              ↑
            </button>
            <button
              :disabled="!canMoveDown"
              :hidden="!canMoveDown"
              class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50"
              @click.stop="handleMove('down')"
            >
              ↓
            </button>
          </div>
          <div v-if="node.type === 'branch'" class="flex space-x-1">
            <button
              class="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-900/70"
              @click.stop="handleAddBranch"
            >
              + Branch
            </button>
            <button
              class="px-2 py-1 text-xs bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded hover:bg-emerald-200 dark:hover:bg-emerald-900/70"
              @click.stop="handleAddLeaf"
            >
              + Leaf
            </button>
          </div>
          <button
            class="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/70"
            @click.stop="handleDelete"
          >
            Delete
          </button>
        </div>
      </div>
      <!-- 内容区域 -->
      <div class="w-full">
        <div v-if="node.type === 'branch'" class="flex items-center">
          <button
            class="mr-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 focus:outline-none"
            @click.stop="expanded = !expanded"
          >
            {{ expanded ? "▼" : "▶" }}
          </button>
          <input
            type="text"
            :value="node.title"
            class="font-bold text-lg bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-300 dark:focus:ring-blue-600 text-gray-900 dark:text-white"
            placeholder="Branch title"
            @change="handleTitleChange"
          />
        </div>
        <div v-else>
          <Editor
            v-if="isEditing"
            v-model="localContent"
            @blur="isEditing = false"
          />
          <div
            v-else
            class="prose prose-blue dark:prose-invert markdown-preview"
            v-html="fullMarkdownParser(localContent)"
          ></div>
        </div>
        <ul
          v-if="expanded && node.children && node.children.length > 0"
          class="ml-2 pl-0 border-dashed border-blue-200 dark:border-blue-700"
        >
          <TreeNode
            v-for="(child, index) in node.children"
            :key="child.id"
            :node="child"
            :level="level + 1"
            :parent-children="node.children"
            :node-index="index"
            @update="(id, updates) => $emit('update', id, updates)"
            @delete="(id) => $emit('delete', id)"
            @add-child="(parentId, type) => $emit('addChild', parentId, type)"
            @move="(id, direction) => $emit('move', id, direction)"
          />
        </ul>
      </div>
    </div>
  </li>
</template>
