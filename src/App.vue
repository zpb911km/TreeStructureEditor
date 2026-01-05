<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { open, save } from '@tauri-apps/plugin-dialog'
import TreeNode from './components/TreeNode.vue'
import NotificationSystem from './components/NotificationSystem.vue'
import { generateId, initialTree } from './utils/tree'
import { exportMarkdownParser, renderMath } from './utils/markdown'
import { showSuccess, showError, showInfo } from './utils/notifications'
import type { TreeNode as TreeNodeType } from './types'

const tree = ref<TreeNodeType>(JSON.parse(JSON.stringify(initialTree)))
const fileName = ref<string | null>(null)

const updateNode = (id: string, updates: Partial<TreeNodeType>): void => {
  const updateNodeRecursively = (node: TreeNodeType): TreeNodeType => {
    if (node.id === id) {
      return { ...node, ...updates }
    }

    if (node.children) {
      return {
        ...node,
        children: node.children.map(updateNodeRecursively)
      }
    }

    return node
  }

  tree.value = updateNodeRecursively(tree.value)
}

const deleteNode = (id: string): void => {
  const deleteNodeRecursively = (node: TreeNodeType): TreeNodeType => {
    if (!node.children) return node

    const filteredChildren = node.children.filter((child) => child.id !== id)

    if (filteredChildren.length !== node.children.length) {
      return { ...node, children: filteredChildren }
    }

    return {
      ...node,
      children: node.children.map(deleteNodeRecursively)
    }
  }

  tree.value = deleteNodeRecursively(tree.value)
}

const addChildNode = (parentId: string, type: 'branch' | 'leaf'): void => {
  const newNode: TreeNodeType = {
    id: generateId(),
    type,
    title: type === 'branch' ? 'New Branch' : `Leaf ${Date.now()}`,
    content: type === 'leaf' ? '# New Leaf' : '',
    children: type === 'branch' ? [] : undefined
  }

  const addNodeRecursively = (node: TreeNodeType): TreeNodeType => {
    if (node.id === parentId) {
      return {
        ...node,
        children: [...(node.children || []), newNode]
      }
    }

    if (node.children) {
      return {
        ...node,
        children: node.children.map(addNodeRecursively)
      }
    }

    return node
  }

  tree.value = addNodeRecursively(tree.value)
}

const moveNode = (id: string, direction: 'up' | 'down'): void => {
  const findAndMove = (node: TreeNodeType): { node: TreeNodeType; found: boolean } => {
    if (!node.children) return { node, found: false }

    let nodeIndex = -1
    let found = false

    for (let i = 0; i < node.children.length; i++) {
      if (node.children[i].id === id) {
        nodeIndex = i
        found = true
        break
      }
    }

    if (found) {
      if (
        (direction === 'up' && nodeIndex > 0) ||
        (direction === 'down' && nodeIndex < node.children.length - 1)
      ) {
        const newChildren = [...node.children]
        const targetIndex = direction === 'up' ? nodeIndex - 1 : nodeIndex + 1

        ;[newChildren[nodeIndex], newChildren[targetIndex]] = [newChildren[targetIndex], newChildren[nodeIndex]]

        return {
          node: { ...node, children: newChildren },
          found: true
        }
      } else {
        return { node, found: true }
      }
    }

    const updatedChildren: TreeNodeType[] = []
    let foundInChildren = false

    for (const child of node.children) {
      if (foundInChildren) {
        updatedChildren.push(child)
      } else {
        const result = findAndMove(child)
        updatedChildren.push(result.node)
        if (result.found) {
          foundInChildren = true
        }
      }
    }

    return {
      node: { ...node, children: updatedChildren },
      found: foundInChildren
    }
  }

  const result = findAndMove(tree.value)
  if (result.found) {
    tree.value = result.node
  }
}

const saveToFile = async (): Promise<void> => {
  const dataStr = JSON.stringify(tree.value, null, 2)

  try {
    if (fileName.value === null) {
      const newPath = await save({
        defaultPath: 'document.json',
        filters: [{ name: 'JSON', extensions: ['json'] }]
      })

      if (newPath === null) {
        return
      }

      fileName.value = newPath
    }

    await invoke('save_file', {
      path: fileName.value,
      content: dataStr
    })

    showSuccess('Document saved successfully!')
  } catch (error) {
    console.error('Error saving file:', error)
    showError('Failed to save document: ' + (error as Error).message)
  }
}

const handleFileUpload = async (): Promise<void> => {
  try {
    const selected = await open({
      filters: [{ name: 'TreeStructureEditor Files', extensions: ['json'] }]
    })

    if (selected === null) {
      showInfo('File opening cancelled.')
      return
    }

    const filePath = selected as string
    fileName.value = filePath

    const fileContent = await invoke<string>('open_file', { path: filePath })
    const parsedTree = JSON.parse(fileContent) as TreeNodeType
    tree.value = parsedTree
    showSuccess('Document opened successfully!')

    // 文件加载后渲染数学公式
    nextTick(() => {
      renderMath()
    })
  } catch (error) {
    console.error('Error reading or parsing file:', error)
    showError('Failed to open document: ' + (error as Error).message)
  }
}

let autoSaveTimer: number | null = null

const setupAutoSave = (): void => {
  if (!fileName.value) return

  autoSaveTimer = window.setInterval(async () => {
    const dataStr = JSON.stringify(tree.value, null, 2)
    try {
      await invoke('save_file', {
        path: fileName.value!,
        content: dataStr
      })
      console.log('Auto-saved successfully')
      showSuccess('Document auto-saved successfully!')
    } catch (err) {
      console.error('Auto-save failed:', err)
      showError('Auto-save failed: ' + (err as Error).message)
    }
  }, 1000 * 60 * 1)
}

const clearAutoSave = (): void => {
  if (autoSaveTimer !== null) {
    clearInterval(autoSaveTimer)
    autoSaveTimer = null
  }
}

watch([fileName, tree], () => {
  clearAutoSave()
  setupAutoSave()
})

const generateHTML = async (): Promise<void> => {
  try {
    showInfo('Generating HTML for printing...')

    const generateTreeHTML = (node: TreeNodeType, level = 0): string => {
      let html = ''
      const marginLeft = level * 10

      if (node.type === 'branch') {
        html += `<div style="margin-left: ${marginLeft}px; margin-bottom: 10px; font-weight: bold; font-size: 1.2em;">`
        html += `${node.title}`
        html += '</div>'

        if (node.children && node.children.length > 0) {
          html += `<div style="margin-left: ${marginLeft}px;">`
          node.children.forEach((child) => {
            html += generateTreeHTML(child, level + 1)
          })
          html += '</div>'
        }
      } else {
        html += `<div style="margin-left: ${marginLeft}px; margin-bottom: 10px; padding-left: 10px; border-left: 2px solid #000;">`
        const parsedContent = exportMarkdownParser(node.content || '')
        html += parsedContent
        html += '</div>'
      }

      return html
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${tree.value.title || 'Tree Editor Document'}</title>
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
    </style>
</head>
<body>
    <h1>${tree.value.title || 'Tree Editor Document'}</h1>
    <div class="tree-content">
        ${generateTreeHTML(tree.value)}
    </div>
</body>
</html>`

    if (fileName.value) {
      const htmlPath = fileName.value.replace(/\.json$/, '.html')

      try {
        await invoke('save_file', {
          path: htmlPath,
          content: htmlContent
        })
        showSuccess('HTML exported successfully!')
      } catch (error) {
        console.error('Error saving HTML:', error)
        showError('Error saving HTML: ' + (error as Error).message)
      }
    } else {
      const newName = await save({
        defaultPath: 'document.html',
        filters: [{ name: 'HTML Files', extensions: ['html'] }]
      })

      if (newName) {
        try {
          await invoke('save_file', {
            path: newName,
            content: htmlContent
          })
          showSuccess('HTML exported successfully!')
        } catch (error) {
          console.error('Error saving HTML:', error)
          showError('Error saving HTML: ' + (error as Error).message)
        }
      } else {
        showInfo('HTML export cancelled.')
      }
    }
  } catch (error) {
    console.error('Error during HTML generation:', error)
    showError('Error during HTML generation: ' + (error as Error).message)
  }
}

onMounted(() => {
  setupAutoSave()

  // 初始渲染数学公式
  nextTick(() => {
    renderMath()
  })
})

onUnmounted(() => {
  clearAutoSave()
})
</script>

<template>
  <div class="mx-auto">
    <header class="text-center mb-10">
      <h1 class="text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-700 mb-4">
        TreeStructureEditor
      </h1>
      <p class="text-lg text-slate-700 mx-auto">
        A hierarchical markdown editor with visual tree structure
      </p>
    </header>

    <div class="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
      <div class="flex flex-wrap gap-3">
        <button
          class="px-5 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-medium rounded-xl shadow-md hover:from-blue-600 hover:to-indigo-700 transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2"
          @click="saveToFile"
        >
          Save Document
        </button>
        <button
          class="px-5 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-medium rounded-xl shadow-md hover:from-emerald-600 hover:to-teal-700 transition-all transform hover:-translate-y-1 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
          @click="handleFileUpload"
        >
          Open Document
        </button>
        <button
          class="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-medium rounded-xl shadow-md hover:from-amber-600 hover:to-orange-700 transition-all transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"
          @click="generateHTML"
        >
          Export to HTML
        </button>
      </div>

      <div class="bg-white rounded-xl shadow-md p-4 flex-1">
        <div class="flex items-center">
          <span class="text-slate-500 mr-2">File:</span>
          <span class="font-mono font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded">
            {{ fileName || 'Untitled' }}
          </span>
        </div>
      </div>
    </div>

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

    <footer class="mt-12 text-center text-slate-500 text-sm">
      <p>TreeStructureEditor • Hierarchical Markdown Editor • by zpb911km</p>
    </footer>

    <NotificationSystem />
  </div>
</template>

<style scoped>
@import './index.css';
</style>