<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import type { TreeNode } from '../types'
import { fullMarkdownParser, renderMath } from '../utils/markdown'

interface Props {
  node: TreeNode
  level?: number
  parentChildren?: TreeNode[]
  nodeIndex?: number
}

interface Emits {
  (e: 'update', id: string, updates: Partial<TreeNode>): void
  (e: 'delete', id: string): void
  (e: 'addChild', parentId: string, type: 'branch' | 'leaf'): void
  (e: 'move', id: string, direction: 'up' | 'down'): void
}

const props = withDefaults(defineProps<Props>(), {
  level: 0,
  parentChildren: () => [],
  nodeIndex: 0
})

const emit = defineEmits<Emits>()

const isEditing = ref(false)
const localContent = ref(props.node.content || '')
const expanded = ref(true)
const isMobile = ref(false)
const showDropdown = ref(false)

const nodeRef = ref<HTMLElement | null>(null)
const textareaRef = ref<HTMLTextAreaElement | null>(null)

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // 初始渲染数学公式
  if (props.node.type === 'leaf' && !isEditing.value) {
    nextTick(() => {
      renderMath()
    })
  }
})

watch(() => props.node.content, (newContent) => {
  localContent.value = newContent || ''
})

watch([localContent, isEditing], () => {
  if (!isEditing.value && nodeRef.value) {
    nextTick(() => {
      renderMath()
    })
  }
})

watch([isEditing, localContent], () => {
  if (isEditing.value && textareaRef.value) {
    nextTick(() => {
      adjustTextareaHeight()
    })
  }
})

const adjustTextareaHeight = () => {
  if (textareaRef.value) {
    const savedScrollTop = window.pageYOffset || document.documentElement.scrollTop
    const savedScrollLeft = window.pageXOffset || document.documentElement.scrollLeft

    textareaRef.value.style.height = 'auto'
    const newHeight = textareaRef.value.scrollHeight + 'px'
    textareaRef.value.style.height = newHeight

    window.scrollTo(savedScrollLeft, savedScrollTop)
  }
}

const handleContentChange = (e: Event) => {
  const target = e.target as HTMLTextAreaElement
  const newContent = target.value
  const textarea = target
  const scrollTop = textarea.scrollTop
  const scrollLeft = textarea.scrollLeft

  // 立即调整高度
  textarea.style.height = 'auto'
  const newHeight = textarea.scrollHeight + 'px'
  textarea.style.height = newHeight

  localContent.value = newContent
  emit('update', props.node.id, { content: newContent })

  // 恢复滚动位置
  requestAnimationFrame(() => {
    textarea.scrollTop = scrollTop
    textarea.scrollLeft = scrollLeft
  })
}

const handleTitleChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update', props.node.id, { title: target.value })
}

const handleAddBranch = () => {
  emit('addChild', props.node.id, 'branch')
  showDropdown.value = false
}

const handleAddLeaf = () => {
  emit('addChild', props.node.id, 'leaf')
  showDropdown.value = false
}

const handleMove = (direction: 'up' | 'down') => {
  emit('move', props.node.id, direction)
  showDropdown.value = false
}

const handleDelete = () => {
  emit('delete', props.node.id)
  showDropdown.value = false
}

const handleNodeClick = () => {
  if (props.node.type === 'leaf') {
    isEditing.value = true
    nextTick(() => {
      if (textareaRef.value) {
        const savedScrollTop = window.pageYOffset || document.documentElement.scrollTop
        textareaRef.value.focus()
        // 初始化textarea高度
        adjustTextareaHeight()
        window.scrollTo(0, savedScrollTop)
      }
    })
  } else {
    isEditing.value = true
  }
}

const canMoveUp = computed(() => props.nodeIndex > 0)
const canMoveDown = computed(() => props.parentChildren && props.nodeIndex < props.parentChildren.length - 1)
</script>

<template>
  <li class="relative mb-1 pl-1" :class="{ 'cursor-pointer': node.type === 'branch' }">
    <div ref="nodeRef" class="p-2 rounded-lg relative" :class="[
      node.type === 'branch'
        ? 'bg-blue-50 border-2 border-blue-200 hover:bg-blue-100'
        : 'bg-emerald-50 border-2 border-emerald-200'
    ]" @click="handleNodeClick">
      <!-- 浮动在右上角的按钮容器 -->
      <div class="absolute top-2 right-2 flex space-x-1 z-10">
        <!-- Mobile dropdown menu -->
        <div v-if="isMobile" class="relative">
          <button class="px-2 py-1 text-xs bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200"
            @click.stop="showDropdown = !showDropdown">
            ⋯
          </button>
          <div v-if="showDropdown"
            class="dropdown-content absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-20">
            <div class="py-1">
              <button v-if="canMoveUp" class="w-full text-left px-3 py-1 text-xs hover:bg-gray-100"
                @click="handleMove('up')">
                ↑ 上移
              </button>
              <button v-if="canMoveDown" class="w-full text-left px-3 py-1 text-xs hover:bg-gray-100"
                @click="handleMove('down')">
                ↓ 下移
              </button>
            </div>
            <div class="border-t border-gray-200 my-1" />
            <div v-if="node.type === 'branch'" class="py-1">
              <button class="w-full text-left px-3 py-1 text-xs hover:bg-gray-100" @click="handleAddBranch">
                + Branch
              </button>
              <button class="w-full text-left px-3 py-1 text-xs hover:bg-gray-100" @click="handleAddLeaf">
                + Leaf
              </button>
            </div>
            <div v-if="node.type === 'leaf'" class="border-t border-gray-200 my-1">
              <div class="py-1">
                <button class="w-full text-left px-3 py-1 text-xs text-red-600 hover:bg-red-50" @click="handleDelete">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Desktop buttons -->
        <div v-else class="flex space-x-1">
          <div class="flex space-x-1">
            <button :disabled="!canMoveUp" :hidden="!canMoveUp"
              class="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
              @click.stop="handleMove('up')">
              ↑
            </button>
            <button :disabled="!canMoveDown" :hidden="!canMoveDown"
              class="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
              @click.stop="handleMove('down')">
              ↓
            </button>
          </div>

          <div v-if="node.type === 'branch'" class="flex space-x-1">
            <button class="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              @click.stop="handleAddBranch">
              + Branch
            </button>
            <button class="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
              @click.stop="handleAddLeaf">
              + Leaf
            </button>
          </div>
          <button class="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200" @click.stop="handleDelete">
            Delete
          </button>
        </div>
      </div>


      <!-- 内容区域 -->
      <div class="w-full">
        <div v-if="node.type === 'branch'" class="flex items-center">
          <button class="mr-2 text-blue-600 hover:text-blue-800 focus:outline-none" @click.stop="expanded = !expanded">
            {{ expanded ? '▼' : '▶' }}
          </button>
          <input type="text" :value="node.title"
            class="font-bold text-lg bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-300"
            placeholder="Branch title" @change="handleTitleChange">
        </div>

        <div v-else>
          <textarea v-if="isEditing" ref="textareaRef" v-model="localContent" rows="1"
            class="w-full min-h-20 p-3 border-2 border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-400 focus:border-emerald-500 resize-none overflow-hidden"
            placeholder="Write markdown here..." @input="handleContentChange" @blur="isEditing = false" />
          <div v-else class="prose prose-blue markdown-preview" v-html="fullMarkdownParser(localContent)">
          </div>
        </div>

        <ul v-if="expanded && node.children && node.children.length > 0"
          class="ml-2 pl-0 border-dashed border-blue-200">
          <TreeNode v-for="(child, index) in node.children" :key="child.id" :node="child" :level="level + 1"
            :parent-children="node.children" :node-index="index" @update="(id, updates) => $emit('update', id, updates)"
            @delete="(id) => $emit('delete', id)" @add-child="(parentId, type) => $emit('addChild', parentId, type)"
            @move="(id, direction) => $emit('move', id, direction)" />
        </ul>
      </div>
    </div>
  </li>
</template>