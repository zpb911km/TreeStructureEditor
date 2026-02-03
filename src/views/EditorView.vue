<script setup lang="ts">
import { watch, onMounted, onUnmounted, nextTick } from "vue";
import { useRouter, useRoute } from "vue-router";
import TreeNode from "../components/TreeNode.vue";
import { generateId } from "../utils/tree";
import { exportMarkdownParser, renderMath } from "../utils/markdown";
import {
  showSuccess,
  showError,
  showInfo,
  showWarning,
} from "../utils/notifications";
import { initAISuggestionService } from "../services/aiSuggestion";
import type { TreeNode as TreeNodeType } from "../types";
import {
  loadAIConfig,
  loadConfig,
  loadFile,
  outputFile,
  saveFile,
} from "../apis";
import { tree, shortPath } from "../utils/tree";

const router = useRouter();
const route = useRoute();

const updateNode = (id: string, updates: Partial<TreeNodeType>): void => {
  const updateNodeRecursively = (node: TreeNodeType): TreeNodeType => {
    if (node.id === id) {
      return { ...node, ...updates };
    }

    if (node.children) {
      return {
        ...node,
        children: node.children.map(updateNodeRecursively),
      };
    }

    return node;
  };

  tree.value = updateNodeRecursively(tree.value);
};

const deleteNode = (id: string): void => {
  const deleteNodeRecursively = (node: TreeNodeType): TreeNodeType => {
    if (!node.children) return node;

    const filteredChildren = node.children.filter((child) => child.id !== id);

    if (filteredChildren.length !== node.children.length) {
      return { ...node, children: filteredChildren };
    }

    return {
      ...node,
      children: node.children.map(deleteNodeRecursively),
    };
  };

  tree.value = deleteNodeRecursively(tree.value);
};

const addChildNode = (parentId: string, type: "branch" | "leaf"): void => {
  const newNode: TreeNodeType = {
    id: generateId(),
    type,
    title: type === "branch" ? "New Branch" : `Leaf ${Date.now()}`,
    content: type === "leaf" ? "# New Leaf" : "",
    children: type === "branch" ? [] : undefined,
  };

  const addNodeRecursively = (node: TreeNodeType): TreeNodeType => {
    if (node.id === parentId) {
      return {
        ...node,
        children: [...(node.children || []), newNode],
      };
    }

    if (node.children) {
      return {
        ...node,
        children: node.children.map(addNodeRecursively),
      };
    }

    return node;
  };

  tree.value = addNodeRecursively(tree.value);
};

const moveNode = (id: string, direction: "up" | "down"): void => {
  const findAndMove = (
    node: TreeNodeType,
  ): { node: TreeNodeType; found: boolean } => {
    if (!node.children) return { node, found: false };

    let nodeIndex = -1;
    let found = false;

    for (let i = 0; i < node.children.length; i++) {
      if (node.children[i].id === id) {
        nodeIndex = i;
        found = true;
        break;
      }
    }

    if (found) {
      if (
        (direction === "up" && nodeIndex > 0) ||
        (direction === "down" && nodeIndex < node.children.length - 1)
      ) {
        const newChildren = [...node.children];
        const targetIndex = direction === "up" ? nodeIndex - 1 : nodeIndex + 1;

        [newChildren[nodeIndex], newChildren[targetIndex]] = [
          newChildren[targetIndex],
          newChildren[nodeIndex],
        ];

        return {
          node: { ...node, children: newChildren },
          found: true,
        };
      } else {
        return { node, found: true };
      }
    }

    const updatedChildren: TreeNodeType[] = [];
    let foundInChildren = false;

    for (const child of node.children) {
      if (foundInChildren) {
        updatedChildren.push(child);
      } else {
        const result = findAndMove(child);
        updatedChildren.push(result.node);
        if (result.found) {
          foundInChildren = true;
        }
      }
    }

    return {
      node: { ...node, children: updatedChildren },
      found: foundInChildren,
    };
  };

  const result = findAndMove(tree.value);
  if (result.found) {
    tree.value = result.node;
  }
};

const saveToFile = async (): Promise<void> => {
  const dataStr = JSON.stringify(tree.value, null, 2);
  try {
    if (!shortPath.value) {
      showError("Please select a file");
      router.push("/files");
      return;
    }
    saveFile(shortPath.value, dataStr);
  } catch (error) {
    console.error("Error saving file:", error);
    showError("Failed to save document: " + (error as Error).message);
  }
};

const handleFileUpload = async (): Promise<void> => {
  // 导航到文件浏览器
  router.push("/files");
};

const loadFileByPath = async (filePath: string): Promise<void> => {
  if (!filePath || !filePath.endsWith("json")) {
    showError("Please select a json file");
    router.push("/files");
    return;
  }
  let content = await loadFile(filePath);
  if (!content || content.trim() === "") {
    const root: TreeNodeType = {
      id: generateId(),
      title: "Root",
      type: "branch",
      children: [],
    };
    content = JSON.stringify(root);
    showWarning("This file is empty. Initializing with a new tree structure.");
  }
  try {
    const parsedTree = JSON.parse(content) as TreeNodeType;
    tree.value = parsedTree;
  } catch (error) {
    console.error("Error parsing JSON:", error);
    showError("Failed to parse document: " + error);
    return;
  }
  shortPath.value = filePath;
  showSuccess("Document opened successfully!");

  // 文件加载后渲染数学公式
  nextTick(() => {
    renderMath();
  });
};

let autoSaveTimer: number | null = null;

const setupAutoSave = (): void => {
  if (!shortPath.value) return;
  autoSaveTimer = window.setInterval(
    async () => {
      try {
        saveToFile();
        console.log("Auto-saved successfully");
        showSuccess("Document auto-saved successfully!");
      } catch (err) {
        console.error("Auto-save failed:", err);
        showError("Auto-save failed: " + err);
      }
    },
    1000 * 60 * 1,
  );
};

const clearAutoSave = (): void => {
  if (autoSaveTimer !== null) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
};

watch([shortPath], () => {
  clearAutoSave();
  setupAutoSave();
});

watch(
  () => route.query.file,
  (newFile) => {
    if (newFile && newFile !== shortPath.value) {
      showInfo(`selected file: ${newFile}`);
      loadFileByPath(newFile as string);
    }
  },
);

watch([tree], () => {
  if (shortPath.value === null) {
    showWarning("Please choose or create a file to edit.");
    router.push({ path: "/files" });
  }
});

const generateHTML = async (): Promise<void> => {
  try {
    showInfo("Generating HTML for printing...");

    const generateTreeHTML = (node: TreeNodeType, level = 0): string => {
      let html = "";
      const marginLeft = 10;

      if (node.type === "branch") {
        html += `<div style="margin-left: ${marginLeft}px; border-left: 3px double #000;">`;
        html += `<div style="margin-left: ${marginLeft}px; margin-bottom: 10px; font-weight: bold; font-size: 1.2em;">`;
        html += `${node.title}`;
        html += "</div>";

        if (node.children && node.children.length > 0) {
          html += `<div style="margin-left: ${marginLeft}px;">`;
          node.children.forEach((child) => {
            html += generateTreeHTML(child, level + 1);
          });
          html += "</div>";
        }
        html += "</div>";
      } else {
        html += `<div style="margin-left: ${marginLeft}px; margin-bottom: 10px; padding-left: 10px; border-left: 1px solid #000;">`;
        const parsedContent = exportMarkdownParser(node.content || "");
        html += parsedContent;
        html += "</div>";
      }

      return html;
    };

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tree.value.title || "Tree Editor Document"}</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.0/dist/katex.min.css">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.4;
            margin: 20px;
            background: white;
            color: black;
        }
        h1 {
            text-align: center;
            margin-bottom: 20px;
            font-size: 1.8em;
            color: black;
            border-bottom: 2px solid black;
            padding-bottom: 10px;
        }
        @media print {
            body {
                margin: 15mm 15mm 15mm 15mm;
            }
        }
        @page {
            margin: 15mm;
            size: auto;
            @bottom-center {
                content: "Generated by TreeStructureEditor (https://github.com/zpb911km/TreeStructureEditor)\A Please give it a star on GitHub if you like it, thanks!";
                font-size: 6pt;
                color: #666;
                white-space: pre;
                text-align: center;
            }
            @bottom-right {
                content: "第 " counter(page) " 页 / 共 " counter(pages) " 页";
                font-size: 10pt;
                color: #555;
            }
        }
    </style>
</head>
<body>
    <h1>${tree.value.title || "Tree Editor Document"}</h1>
    <div class="tree-content">
        ${generateTreeHTML(tree.value)}
    </div>
</body>
</html>`;
    outputFile(
      shortPath.value ? shortPath.value : "document.json",
      htmlContent,
    );
  } catch (error) {
    console.error("Error during HTML generation:", error);
    showError("Error during HTML generation: " + error);
  }
};

onMounted(async () => {
  setupAutoSave();

  const config = await loadConfig();
  const useAI = config.useAI;
  if (useAI) {
    // 初始化 AI 建议服务 - 从配置文件加载
    loadAIConfig().then(async (config) => {
      if (config) {
        console.log("[Editor] Initializing AI suggestion service from config");
        initAISuggestionService(config);
      } else {
        console.warn(
          "[Editor] No AI config found. AI suggestions will not be available.",
        );
      }
    });
  }

  // 检查是否有文件路径参数
  const filePath = route.query.file as string;
  if (filePath) {
    await loadFileByPath(filePath);
  }

  // 初始渲染数学公式
  nextTick(() => {
    renderMath();
  });
});

onUnmounted(() => {
  clearAutoSave();
});
</script>

<template>
  <div class="mx-auto">
    <div
      class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4"
    >
      <div class="flex flex-wrap gap-3">
        <button
          class="px-5 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-xl shadow-md hover:from-blue-600 hover:to-indigo-700 transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          @click="saveToFile"
        >
          Save Document
        </button>
        <button
          class="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl shadow-md hover:from-emerald-600 hover:to-teal-700 transition-all transform hover:-translate-y-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          @click="handleFileUpload"
        >
          Open Document
        </button>
        <button
          class="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-xl shadow-md hover:from-amber-600 hover:to-orange-700 transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
          @click="generateHTML"
        >
          Export to HTML
        </button>
      </div>

      <div
        class="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 flex-1 max-w-md"
      >
        <div class="flex items-center max-w-md">
          <span class="text-slate-500 dark:text-slate-400 mr-2">File:</span>
          <span
            class="font-mono font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded max-w-md"
          >
            {{ shortPath || "Untitled" }}
          </span>
        </div>
      </div>
    </div>

    <!-- 树形编辑器 -->
    <div class="tree">
      <ul class="list-none p-0 m-0">
        <TreeNode
          :node="tree"
          :parent-children="[tree]"
          :node-index="0"
          :level="0"
          @update="updateNode"
          @delete="deleteNode"
          @add-child="addChildNode"
          @move="moveNode"
        />
      </ul>
    </div>
  </div>
</template>

<style scoped>
@import "../index.css";
</style>
