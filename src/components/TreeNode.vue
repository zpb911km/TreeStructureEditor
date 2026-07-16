<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick, inject } from "vue";
import type { TreeNode } from "../types";
import { fullMarkdownParser, renderMath } from "../utils/markdown";
import RichEditor from "./RichEditor.vue";
import FloatEditor from "./FloatEditor.vue";
import { loadConfig } from "../apis";
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
  (
    e: "moveTo",
    draggedId: string,
    targetId: string,
    position: "before" | "after" | "child",
  ): void;
}

type DropPosition = "before" | "after" | "child" | null;
const props = withDefaults(defineProps<Props>(), {
  level: 0,
  parentChildren: () => [],
  nodeIndex: 0,
});
const emit = defineEmits<Emits>();
const padMode = ref(false);
const isEditing = ref(false);
const localContent = ref(props.node.content || "");
const isMobile = ref(false);
const showDropdown = ref(false);
const nodeRef = ref<HTMLElement | null>(null);

// 拖放状态
const isDragging = ref(false);
const dropPosition = ref<DropPosition>(null);
const isDragOver = ref(false);
const isInvalidTarget = ref(false);

// 全局拖拽感知（来自 EditorView provide）
const isDraggingGlobally = inject("isDraggingGlobally", ref(false));
const isDropZoneHovered = ref(false);

const isRoot = computed(() => props.level === 0);
const canDrag = computed(() => !isRoot.value && !isEditing.value);
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768;
};
onMounted(async () => {
  checkMobile();
  window.addEventListener("resize", checkMobile);

  // 加载配置
  const config = await loadConfig();
  padMode.value = config.padMode ? config.padMode : false;

  // 初始渲染数学公式
  if (!isEditing.value) {
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
  if (nodeRef.value && (!isEditing.value || padMode.value)) {
    nextTick(() => {
      renderMath();
    });
  }
});

// 全局拖拽结束时，清理目标节点上残留的拖放状态
watch(isDraggingGlobally, (val) => {
  if (!val) {
    isDragOver.value = false;
    dropPosition.value = null;
    isInvalidTarget.value = false;
    isDropZoneHovered.value = false;
  }
});

// ═══════════════════════════════════════════
// 拖放事件处理
// ═══════════════════════════════════════════

const getDropPositionFromCursor = (e: DragEvent): DropPosition => {
  const target = nodeRef.value;
  if (!target) return null;
  const rect = target.getBoundingClientRect();
  const y = e.clientY - rect.top;
  const h = rect.height;
  const ratio = y / h;

  // 上 30% → before，中间 40% → child（任何节点都可作为容器），下 30% → after
  if (ratio < 0.3) return "before";
  if (ratio > 0.7) return "after";
  return "child";
};

// 拖拽自动滚动参数
const SCROLL_THRESHOLD = 50; // 距离边界 px
const SCROLL_STEP = 15; // 每帧滚动 px

const autoScroll = (e: DragEvent) => {
  const scrollEl = document.scrollingElement || document.documentElement;
  const viewH = window.innerHeight;
  const mouseY = e.clientY;

  if (mouseY < SCROLL_THRESHOLD) {
    scrollEl.scrollTop -= SCROLL_STEP;
  } else if (mouseY > viewH - SCROLL_THRESHOLD) {
    scrollEl.scrollTop += SCROLL_STEP;
  }

  // 水平滚动（靠近左右边界时）
  const mouseX = e.clientX;
  const viewW = window.innerWidth;
  if (mouseX < SCROLL_THRESHOLD) {
    scrollEl.scrollLeft -= SCROLL_STEP;
  } else if (mouseX > viewW - SCROLL_THRESHOLD) {
    scrollEl.scrollLeft += SCROLL_STEP;
  }
};

const handleDragStart = (e: DragEvent) => {
  if (!canDrag.value || !e.dataTransfer) {
    e.preventDefault();
    return;
  }

  // 记录拖拽 ID（非响应式，直接写 window）
  e.dataTransfer.setData("text/plain", props.node.id);
  e.dataTransfer.effectAllowed = "move";
  (window as any).__tree_drag_id = props.node.id;

  // ⚠️ 延迟响应式状态变更！避免 Vue 同步重渲染破坏浏览器拖拽会话初始化
  requestAnimationFrame(() => {
    isDragging.value = true;
    isDraggingGlobally.value = true;
  });
};

const handleDragOver = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  if (!e.dataTransfer) return;
  e.dataTransfer.dropEffect = "move";

  // 从共享状态读取（比 getData 更可靠，且可在 dragover 中使用）
  const draggedId: string | undefined = (window as any).__tree_drag_id;

  // 不能拖到自己身上
  if (draggedId === props.node.id) {
    isInvalidTarget.value = true;
    isDragOver.value = true;
    e.dataTransfer.dropEffect = "none";
    dropPosition.value = null;
    return;
  }

  const pos = getDropPositionFromCursor(e);

  isDragOver.value = true;
  isInvalidTarget.value = false;
  dropPosition.value = pos;

  // 拖拽到边界时自动滚动页面
  autoScroll(e);
};

const handleDragLeave = () => {
  isDragOver.value = false;
  dropPosition.value = null;
  isInvalidTarget.value = false;
};

const handleDrop = (e: DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isDragOver.value = false;
  isInvalidTarget.value = false;

  const draggedId = e.dataTransfer?.getData("text/plain");
  const targetId = props.node.id;
  const pos = dropPosition.value;

  dropPosition.value = null;

  if (!draggedId || !pos || draggedId === targetId) return;

  // 恢复被拖拽节点的不透明度（由 dragEnd 统一处理，但提前触发也没关系）
  emit("moveTo", draggedId, targetId, pos);
};

const handleDragEnd = () => {
  isDragging.value = false;
  isDraggingGlobally.value = false;
  isDragOver.value = false;
  dropPosition.value = null;
  isInvalidTarget.value = false;
  (window as any).__tree_drag_id = undefined;
};

// ═══════════════════════════════════════════
// 深层 drop zone：当子节点遮挡 branch 自身拖放区时的后备落点
// ═══════════════════════════════════════════

const handleDropZoneDragOver = (e: DragEvent) => {
  e.preventDefault();
  isDropZoneHovered.value = true;
};

const handleDropZoneDragLeave = () => {
  isDropZoneHovered.value = false;
};

const handleDropZoneDrop = (e: DragEvent) => {
  e.preventDefault();
  isDropZoneHovered.value = false;

  const draggedId: string | undefined = (window as any).__tree_drag_id;
  if (!draggedId || draggedId === props.node.id) return;

  emit("moveTo", draggedId, props.node.id, "child");
};

// ═══════════════════════════════════════════

const handleTitleChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  emit("update", props.node.id, { title: target.value });
};
const handleEdit = () => {
  isEditing.value = true;
  showDropdown.value = false;
};
const handleAddChild = () => {
  emit("addChild", props.node.id, "branch");
  showDropdown.value = false;
};
const handleDelete = () => {
  emit("delete", props.node.id);
  showDropdown.value = false;
};
const handleNodeClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  // 排除拖拽手柄、输入框、按钮等交互元素
  if (target.closest('[draggable="true"]')) return;
  if (target.closest("input, button, textarea, select")) return;
  isEditing.value = true;
};
</script>
<template>
  <li class="relative mb-1 pl-1">
    <div
      ref="nodeRef"
      class="p-1 rounded-lg relative transition-all duration-150 bg-white dark:bg-gray-800/30 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
      :class="[
        isDragOver && !isInvalidTarget
          ? 'ring-2 ring-indigo-400 dark:ring-indigo-500'
          : '',
        isInvalidTarget ? 'ring-2 ring-red-400 dark:ring-red-500' : '',
        dropPosition === 'child'
          ? 'ring-4 ring-indigo-400 dark:ring-indigo-500'
          : '',
        isDragging ? 'opacity-50' : '',
      ]"
      @click="handleNodeClick"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <!-- 拖放位置指示器 -->
      <!-- before 指示器（顶部插入线） -->
      <div
        class="absolute left-0 right-0 h-1 z-20 pointer-events-none transition-all duration-100"
        :class="[
          dropPosition === 'before'
            ? 'top-0 bg-indigo-500 dark:bg-indigo-400 shadow-lg shadow-indigo-500/50'
            : 'top-0 bg-transparent',
          '',
        ]"
      ></div>
      <!-- after 指示器（底部插入线） -->
      <div
        class="absolute left-0 right-0 h-1 z-20 pointer-events-none transition-all duration-100"
        :class="[
          dropPosition === 'after'
            ? 'bottom-0 bg-indigo-500 dark:bg-indigo-400 shadow-lg shadow-indigo-500/50'
            : 'bottom-0 bg-transparent',
          '',
        ]"
      ></div>
      <!-- 浮动在右上角的按钮容器 -->
      <div
        class="absolute top-2 right-2 flex flex-wrap gap-1 z-10 max-w-[95%] justify-end"
      >
        <!-- ══════ 移动端 ══════ -->
        <template v-if="isMobile">
          <div class="relative">
            <button
              class="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/70"
              @click.stop="showDropdown = !showDropdown"
            >
              ⋯
            </button>
            <div
              v-if="showDropdown"
              class="dropdown-content absolute right-0 mt-1 w-28 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg dark:text-white z-20"
            >
              <div class="py-1">
                <button
                  class="w-full text-left px-3 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                  @click="handleEdit"
                >
                  ✏️ Edit
                </button>
              </div>
              <div class="border-t border-gray-200 dark:border-gray-700 my-1" />
              <div class="py-1">
                <button
                  class="w-full text-left px-3 py-1 text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
                  @click="handleAddChild"
                >
                  + Child
                </button>
              </div>
              <div class="border-t border-gray-200 dark:border-gray-700 my-1" />
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
          <!-- 移动端拖拽手柄 -->
          <div
            v-if="canDrag"
            draggable="true"
            class="inline-flex items-center px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-grab active:cursor-grabbing select-none transition-colors"
            @dragstart="handleDragStart"
            @dragend="handleDragEnd"
            title="拖拽移动"
          >
            ⠿
          </div>
        </template>

        <!-- ══════ 桌面端 ══════ -->
        <template v-else>
          <div class="flex space-x-1">
            <button
              class="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/70"
              @click.stop="handleEdit"
            >
              Edit
            </button>
            <button
              class="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded hover:bg-indigo-200 dark:hover:bg-indigo-900/70"
              @click.stop="handleAddChild"
            >
              + Child
            </button>
            <button
              class="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/70"
              @click.stop="handleDelete"
            >
              Delete
            </button>
          </div>
          <!-- 桌面端拖拽手柄 -->
          <div
            v-if="canDrag"
            draggable="true"
            class="inline-flex items-center px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 rounded hover:bg-indigo-100 dark:hover:bg-indigo-900/50 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-grab active:cursor-grabbing select-none transition-colors"
            @dragstart="handleDragStart"
            @dragend="handleDragEnd"
            title="拖拽移动"
          >
            ⠿
          </div>
        </template>
      </div>
      <!-- 内容区域 -->
      <div class="w-full">
        <div class="flex items-center">
          <button
            v-if="node.content || node.children.length > 0"
            class="mr-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 focus:outline-none"
            @click.stop="
              emit('update', node.id, { collapsed: !node.collapsed })
            "
          >
            {{ node.collapsed ? "▶" : "▼" }}
          </button>
          <input
            type="text"
            :value="node.title"
            class="font-bold text-base md:text-lg bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-300 dark:focus:ring-indigo-600 text-gray-900 dark:text-white min-w-0 w-full"
            placeholder="Node title"
            @change="handleTitleChange"
          />
        </div>
        <template v-if="!node.collapsed">
          <div v-if="isEditing">
            <FloatEditor
              v-if="padMode"
              v-model="localContent"
              @blur="isEditing = false"
            />
            <RichEditor
              v-else
              v-model="localContent"
              @blur="isEditing = false"
            />
          </div>
          <!--
            padMode：编辑时保留预览，实现即时渲染（含公式）
            非 padMode：编辑时隐藏预览，只展示编辑器
          -->
          <div
            v-show="!isEditing || padMode"
            class="prose prose-blue dark:prose-invert markdown-preview cursor-text"
            v-html="fullMarkdownParser(localContent)"
          ></div>
        </template>
        <ul
          v-if="!node.collapsed && node.children.length > 0"
          class="ml-0 pl-0 border-l-2 border-solid border-indigo-200 dark:border-indigo-700"
          @click.stop
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
            @move-to="
              (draggedId, targetId, pos) =>
                $emit('moveTo', draggedId, targetId, pos)
            "
          />
        </ul>

        <!-- child 落点指示器（细线样式，与底部 after 指示器保持间距） -->
        <div
          v-if="!node.collapsed && isDraggingGlobally"
          class="flex items-center justify-center h-[3px] m-1 cursor-pointer select-none rounded transition-colors duration-100 mb-1"
          :class="
            isDropZoneHovered ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''
          "
          @dragover.prevent="handleDropZoneDragOver"
          @dragleave="handleDropZoneDragLeave"
          @drop.stop="handleDropZoneDrop"
        >
          <div
            class="w-full rounded-full pointer-events-none transition-all duration-100"
            :class="
              isDropZoneHovered
                ? 'h-[3px] bg-indigo-500 dark:bg-indigo-400 shadow-lg shadow-indigo-500/50'
                : 'h-[2px] bg-indigo-300 dark:bg-indigo-500/40'
            "
          ></div>
        </div>
      </div>
    </div>
  </li>
</template>
