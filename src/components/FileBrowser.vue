<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import {
  getFilePaths,
  deleteFile,
  createFile,
  createDirectory,
  renameFile,
} from "../apis";
import { showError } from "../utils/notifications";
import { FileNode } from "../types";
import * as path from "@tauri-apps/api/path";

const props = defineProps<{
  parentDir?: FileNode | null | undefined;
  path?: string;
}>();

const router = useRouter();
const files = ref<FileNode[]>([]);
const expandedDirs = ref<Set<string>>(new Set());
const editingNode = ref<{ name: string; isDirectory: boolean } | null>(null);
const editingPath = ref<string | null>(null);
const newName = ref<string>("");

const loadFiles = async () => {
  getFilePaths(props.parentDir, props.path)
    .then((filePaths) => {
      files.value = filePaths;
    })
    .catch((error) => {
      showError("loadFiles error" + error);
    });
};

const getNodePath = (node: FileNode) => {
  if (props.path) {
    return props.path + path.sep() + node.name;
  }
  return node.name;
};

const toggleDirectory = (node: FileNode) => {
  const nodePath = getNodePath(node);
  if (expandedDirs.value.has(nodePath)) {
    expandedDirs.value.delete(nodePath);
  } else {
    expandedDirs.value.add(nodePath);
  }
};

const onFileSelected = async (node: FileNode) => {
  const nodePath = getNodePath(node);
  emit("file-selected", nodePath);
  router.push({
    name: "editor",
    query: { file: nodePath },
  });
};

const emit = defineEmits<{
  (e: "file-selected", filePath: string): void;
  (e: "refresh"): void;
}>();

const startRename = (node: FileNode) => {
  editingNode.value = { name: node.name, isDirectory: node.isDirectory };
  editingPath.value = getNodePath(node);
  newName.value = node.name;
};

const confirmRename = async () => {
  if (!editingPath.value || !newName.value.trim()) {
    editingNode.value = null;
    editingPath.value = null;
    return;
  }

  try {
    await renameFile(editingPath.value, newName.value.trim());
    editingNode.value = null;
    editingPath.value = null;
    newName.value = "";
    await loadFiles();
    emit("refresh");
  } catch (error) {
    showError("rename error: " + error);
  }
};

const cancelRename = () => {
  editingNode.value = null;
  editingPath.value = null;
  newName.value = "";
};

const handleDelete = async (node: FileNode) => {
  try {
    const nodePath = getNodePath(node);
    await deleteFile(nodePath);
    await loadFiles();
    emit("refresh");
  } catch (error) {
    showError("delete error: " + error);
  }
};

const handleCreateFile = async () => {
  const fileName = prompt("file name:");
  if (!fileName || !fileName.trim()) {
    return;
  }

  try {
    await createFile(props.path || null, fileName.trim());
    await loadFiles();
    emit("refresh");
  } catch (error) {
    showError("creat error: " + error);
  }
};

const handleCreateDirectory = async () => {
  const dirName = prompt("folder name:");
  if (!dirName || !dirName.trim()) {
    return;
  }

  try {
    await createDirectory(props.path || null, dirName.trim());
    await loadFiles();
    emit("refresh");
  } catch (error) {
    showError("mkdir error: " + error);
  }
};

const isEditing = (node: FileNode) => {
  return editingNode.value && editingNode.value.name === node.name;
};

const getNodeIcon = (node: FileNode) => {
  if (node.isDirectory) {
    return expandedDirs.value.has(getNodePath(node)) ? "📂" : "📁";
  } else if (node.isFile) {
    if (node.name.endsWith(".json")) {
      return "🌲";
    } else if (node.name.endsWith(".html")) {
      return "🌐";
    } else {
      return "📄";
    }
  }
};

const onNodeClicked = (node: FileNode) => {
  if (node.isDirectory) {
    return toggleDirectory(node);
  } else if (node.isFile) {
    if (node.name.endsWith(".json")) {
      return onFileSelected(node);
    } else {
      return;
    }
  } else {
    return;
  }
};

onMounted(() => {
  loadFiles();
});
</script>

<template>
  <div class="file-browser">
    <div class="create-buttons mb-4 flex gap-2">
      <button
        @click="handleCreateFile"
        class="px-3 py-1.5 bg-blue-500 dark:bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-600 dark:hover:bg-blue-700 transition-colors"
      >
        新建文件
      </button>
      <button
        @click="handleCreateDirectory"
        class="px-3 py-1.5 bg-green-500 dark:bg-green-600 text-white text-sm rounded-lg hover:bg-green-600 dark:hover:bg-green-700 transition-colors"
      >
        新建文件夹
      </button>
    </div>

    <div v-for="fileNode in files" :key="fileNode.name" class="file-item">
      <div
        class="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer group"
        @click="onNodeClicked(fileNode)"
      >
        <span class="text-lg">
          {{ getNodeIcon(fileNode) }}
        </span>

        <span
          v-if="!isEditing(fileNode)"
          class="flex-1 text-gray-700 dark:text-gray-300"
        >
          {{ fileNode.name }}
        </span>

        <input
          v-else
          v-model="newName"
          @click.stop
          @keyup.enter="confirmRename"
          @keyup.esc="cancelRename"
          class="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600"
          ref="renameInput"
          @blur="confirmRename"
        />

        <div
          class="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1"
        >
          <button
            @click.stop="startRename(fileNode)"
            class="p-1 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded transition-colors"
            title="重命名"
          >
            ✏️
          </button>
          <button
            @click.stop="handleDelete(fileNode)"
            class="p-1 text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
            title="删除"
          >
            🗑️
          </button>
        </div>
      </div>

      <div
        v-if="fileNode.isDirectory && expandedDirs.has(getNodePath(fileNode))"
        class="ml-6 border-l-2 border-gray-200 dark:border-gray-700 pl-2"
      >
        <FileBrowser
          :parent-dir="fileNode"
          :path="getNodePath(fileNode)"
          @file-selected="(filePath) => emit('file-selected', filePath)"
          @refresh="loadFiles"
        />
      </div>
    </div>

    <div
      v-if="files.length === 0"
      class="text-center py-8 text-gray-400 dark:text-gray-500"
    >
      此文件夹为空
    </div>
  </div>
</template>

<style scoped>
.file-browser {
  max-width: 100%;
}

.file-item {
  user-select: none;
}

.file-item:hover .opacity-0 {
  opacity: 1;
}
</style>
