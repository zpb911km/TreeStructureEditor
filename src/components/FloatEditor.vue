<template>
  <div
    style="
      background-color: rgba(0, 0, 0, 0.01);
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 49;
    "
    @click=""
    @wheel=""
    @touchstart=""
  >
    <div
      ref="floatContainer"
      class="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl overflow-hidden flex flex-col"
      :style="containerStyle"
    >
      <!-- 标题栏 -->
      <div
        ref="dragHandle"
        class="bg-emerald-500 dark:bg-emerald-600 text-white px-4 py-2 cursor-move flex justify-between items-center select-none"
        @touchstart="handleTouchStart"
        @touchmove="handleTouchMove"
        @touchend="handleTouchEnd"
        @mousedown="handleMouseDown"
      >
        <span class="font-semibold text-sm">编辑器</span>
        <button
          @click="toggleExpand"
          class="bg-white/20 hover:bg-white/30 text-white px-2 py-1 rounded text-xs"
        >
          {{ isExpanded ? "▼" : "▲" }}
        </button>
      </div>

      <div v-show="isExpanded" class="flex flex-col flex-1 relative">
        <!-- 查找替换面板 -->
        <div
          v-if="showFindReplace"
          class="bg-gray-100 dark:bg-gray-700 p-3 border-b dark:border-gray-600"
        >
          <div class="flex gap-2 mb-2">
            <input
              ref="findInput"
              v-model="findText"
              class="flex-1 px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="查找..."
              @keydown.enter="handleFindNext"
              @keydown.esc="showFindReplace = false"
            />
            <button
              @click="handleFindNext"
              class="px-3 py-2 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg text-sm hover:bg-emerald-500 hover:text-white"
            >
              🔍
            </button>
            <button
              @click="handleFindPrev"
              class="px-3 py-2 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg text-sm hover:bg-emerald-500 hover:text-white"
            >
              ◀
            </button>
          </div>
          <div class="flex gap-2">
            <input
              v-model="replaceText"
              class="flex-1 px-3 py-2 text-sm border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="替换..."
              @keydown.enter="handleReplace"
            />
            <button
              @click="handleReplace"
              class="px-3 py-2 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg text-sm hover:bg-emerald-500 hover:text-white"
            >
              替换
            </button>
            <button
              @click="handleReplaceAll"
              class="px-3 py-2 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg text-sm hover:bg-emerald-500 hover:text-white"
            >
              全部
            </button>
            <button
              @click="showFindReplace = false"
              class="px-3 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600"
            >
              ✕
            </button>
          </div>
          <div
            v-if="findResult"
            class="text-xs text-gray-500 dark:text-gray-400 mt-2"
          >
            {{ findResult }}
          </div>
        </div>

        <!-- 符号面板 -->
        <div
          v-if="showSymbolPanel"
          class="bg-gray-100 dark:bg-gray-700 p-3 border-b dark:border-gray-600 max-h-48 overflow-y-auto relative"
        >
          <div class="flex gap-1 mb-2 overflow-x-auto pb-1">
            <button
              v-for="tab in symbolTabs"
              :key="tab.id"
              :class="[
                'px-3 py-1.5 text-xs rounded-lg whitespace-nowrap',
                activeSymbolTab === tab.id
                  ? 'bg-emerald-500 text-white'
                  : 'bg-white dark:bg-gray-600 dark:text-white',
              ]"
              @click="activeSymbolTab = tab.id"
            >
              {{ tab.name }}
            </button>
          </div>
          <div class="flex flex-wrap gap-1">
            <button
              v-for="symbol in currentSymbols"
              :key="symbol"
              class="w-8 h-8 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg text-base flex items-center justify-center hover:bg-emerald-500 hover:text-white dark:text-white"
              @click="insertSymbol(symbol)"
            >
              {{ symbol }}
            </button>
          </div>
          <!-- Unicode 分页控制 -->
          <div
            v-if="activeSymbolTab === 'unicode'"
            class="flex items-center justify-center gap-2 mt-2 pt-2 border-t dark:border-gray-600"
          >
            <button
              @click="prevUnicodePage"
              :disabled="unicodePage === 0"
              :class="[
                'px-2 py-1 text-xs rounded',
                unicodePage === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-600 hover:bg-emerald-500 hover:text-white dark:text-white',
              ]"
            >
              ◀
            </button>
            <span class="text-xs text-gray-600 dark:text-gray-400"
              >{{ unicodePage + 1 }} / {{ totalUnicodePages }}</span
            >
            <button
              @click="nextUnicodePage"
              :disabled="unicodePage >= totalUnicodePages - 1"
              :class="[
                'px-2 py-1 text-xs rounded',
                unicodePage >= totalUnicodePages - 1
                  ? 'opacity-50 cursor-not-allowed'
                  : 'bg-white dark:bg-gray-600 hover:bg-emerald-500 hover:text-white dark:text-white',
              ]"
            >
              ▶
            </button>
          </div>
          <button
            @click="showSymbolPanel = false"
            class="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
          >
            ✕
          </button>
        </div>

        <!-- Markdown 面板 -->
        <div
          v-if="showMarkdownPanel"
          class="bg-gray-100 dark:bg-gray-700 p-3 border-b dark:border-gray-600 max-h-44 overflow-y-auto relative"
        >
          <div class="grid grid-cols-5 gap-2">
            <button
              v-for="item in markdownItems"
              :key="item.name"
              class="p-2 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg text-xs flex flex-col items-center gap-1 hover:bg-emerald-500 hover:text-white dark:text-white"
              @click="insertMarkdown(item)"
            >
              <!-- <span class="text-lg">{{ item.icon }}</span> -->
              <span>{{ item.name }}</span>
            </button>
          </div>
          <button
            @click="showMarkdownPanel = false"
            class="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
          >
            ✕
          </button>
        </div>

        <!-- 编辑操作面板 -->
        <div
          v-if="showEditPanel"
          class="bg-gray-100 dark:bg-gray-700 p-3 border-b dark:border-gray-600 max-h-48 overflow-y-auto relative"
        >
          <div class="grid grid-cols-9 gap-2">
            <button
              @click="insertNewline"
              class="p-2 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg text-xs flex flex-col items-center gap-1 hover:bg-emerald-500 hover:text-white dark:text-white"
            >
              <span class="text-xs">↵</span>
            </button>
            <button
              @click="insertIndent"
              class="p-2 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg text-xs flex flex-col items-center gap-1 hover:bg-emerald-500 hover:text-white dark:text-white"
            >
              <span class="text-xs">⤵</span>
            </button>
            <button
              @click="insertBackspace"
              class="p-2 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg text-xs flex flex-col items-center gap-1 hover:bg-emerald-500 hover:text-white dark:text-white"
            >
              <span class="text-xs">⌫</span>
            </button>
            <button
              @click="insertSpace"
              class="p-2 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg text-xs flex flex-col items-center gap-1 hover:bg-emerald-500 hover:text-white dark:text-white"
            >
              <span class="text-xs">␣</span>
            </button>
            <button
              @click="insertDelete"
              class="p-2 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg text-xs flex flex-col items-center gap-1 hover:bg-emerald-500 hover:text-white dark:text-white"
            >
              <span class="text-xs">⌦</span>
            </button>
            <button
              @click="selectAll"
              class="p-2 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg text-xs flex flex-col items-center gap-1 hover:bg-emerald-500 hover:text-white dark:text-white"
            >
              <span class="text-xs">⎔</span>
            </button>
            <button
              @click="copyText"
              class="p-2 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg text-xs flex flex-col items-center gap-1 hover:bg-emerald-500 hover:text-white dark:text-white"
            >
              <span class="text-xs">⧉</span>
            </button>
            <button
              @click="cutText"
              class="p-2 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg text-xs flex flex-col items-center gap-1 hover:bg-emerald-500 hover:text-white dark:text-white"
            >
              <span class="text-xs">✂</span>
            </button>
            <button
              @click="pasteText"
              class="p-2 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg text-xs flex flex-col items-center gap-1 hover:bg-emerald-500 hover:text-white dark:text-white"
            >
              <span class="text-xs">📋</span>
            </button>
            <button
              @click="duplicateLine"
              class="p-2 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg text-xs flex flex-col items-center gap-1 hover:bg-emerald-500 hover:text-white dark:text-white"
            >
              <span class="text-xs">⧉⤵</span>
            </button>
            <button
              @click="deleteLine"
              class="p-2 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg text-xs flex flex-col items-center gap-1 hover:bg-emerald-500 hover:text-white dark:text-white"
            >
              <span class="text-xs">✕⤵</span>
            </button>
            <button
              @click="moveLineUp"
              class="p-2 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg text-xs flex flex-col items-center gap-1 hover:bg-emerald-500 hover:text-white dark:text-white"
            >
              <span class="text-xs">↑⤵</span>
            </button>
            <button
              @click="moveLineDown"
              class="p-2 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg text-xs flex flex-col items-center gap-1 hover:bg-emerald-500 hover:text-white dark:text-white"
            >
              <span class="text-xs">↓⤵</span>
            </button>
            <button
              @click="handleUndo"
              class="p-2 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg text-xs flex flex-col items-center gap-1 hover:bg-emerald-500 hover:text-white dark:text-white"
              :disabled="!canUndo"
              title="撤销"
            >
              ↩️
            </button>
            <button
              @click="handleRedo"
              class="p-2 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg text-xs flex flex-col items-center gap-1 hover:bg-emerald-500 hover:text-white dark:text-white"
              :disabled="!canRedo"
              title="重做"
            >
              ↪️
            </button>
          </div>
          <button
            @click="showEditPanel = false"
            class="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600"
          >
            ✕
          </button>
        </div>

        <!-- 文本编辑区域 -->
        <textarea
          ref="textareaRef"
          v-model="localValue"
          class="flex-1 w-full p-4 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 resize-none font-mono text-sm leading-relaxed focus:outline-none whitespace-pre-wrap"
          @input="handleInput"
          @keydown="handleKeydown"
          @select="handleTextSelect"
          spellcheck="false"
        ></textarea>

        <!-- 工具栏 -->
        <div
          class="flex gap-1 p-2 bg-gray-100 dark:bg-gray-700 border-t dark:border-gray-600 flex-wrap"
        >
          <button
            @click="toggleFindReplace"
            class="flex-1 min-w-10 h-10 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg flex items-center justify-center text-lg hover:bg-emerald-500 hover:text-white dark:text-white"
            title="查找替换"
          >
            🔍
          </button>
          <button
            @click="handleComplete"
            class="flex-1 min-w-10 h-10 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg flex items-center justify-center text-lg hover:bg-emerald-500 hover:text-white dark:text-white"
            title="AI补全"
          >
            ✨
          </button>
          <button
            @click="toggleEditPanel"
            class="flex-1 min-w-10 h-10 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg flex items-center justify-center text-lg hover:bg-emerald-500 hover:text-white dark:text-white"
            title="编辑操作"
          >
            ⌨️
          </button>
          <button
            @click="toggleSymbolPanel"
            class="flex-1 min-w-10 h-10 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg flex items-center justify-center text-lg hover:bg-emerald-500 hover:text-white dark:text-white"
            title="符号"
          >
            🔣
          </button>
          <button
            @click="toggleMarkdownPanel"
            class="flex-1 min-w-10 h-10 bg-white dark:bg-gray-600 border dark:border-gray-500 rounded-lg flex items-center justify-center text-lg hover:bg-emerald-500 hover:text-white dark:text-white"
            title="Markdown"
          >
            📝
          </button>
          <button
            @click="handleSave"
            class="flex-1 min-w-10 h-10 bg-blue-500 text-white border border-blue-500 rounded-lg flex items-center justify-center text-lg hover:bg-blue-600"
            title="保存"
          >
            💾
          </button>
        </div>

        <!-- 调整大小手柄 -->
        <div
          class="absolute bottom-14 right-0 w-6 h-6 cursor-se-resize bg-gradient-to-tl from-emerald-500 to-transparent rounded-tl-lg"
          @touchstart="handleResizeStart"
          @mousedown="handleResizeMouseDown"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  watch,
  onMounted,
  onBeforeUnmount,
  nextTick,
  inject,
} from "vue";
import { getAISuggestionService } from "../services/aiSuggestion";
import { showInfo } from "../utils/notifications";

const props = defineProps({
  modelValue: String,
});

const emit = defineEmits(["update:modelValue", "blur"]);

const floatContainer = ref<HTMLElement | null>(null);
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const findInput = ref<HTMLInputElement | null>(null);

const localValue = ref(props.modelValue || "");
const isExpanded = ref(true);
const showFindReplace = ref(false);
const showSymbolPanel = ref(false);
const showMarkdownPanel = ref(false);
const showEditPanel = ref(true);
const findText = ref("");
const replaceText = ref("");
const findResult = ref("");
const currentFindIndex = ref(-1);
const findMatches = ref<number[]>([]);

const internalClipboard = inject<{
  text: any;
  selection: any;
  setText: (text: string) => void;
  getText: () => string;
  clear: () => void;
  setSelection: (start: number, end: number) => void;
  getSelection: () => { start: number; end: number };
}>("internalClipboard");

const activeSymbolTab = ref("common");
const symbolTabs = [
  { id: "common", name: "常用" },
  { id: "math", name: "数学" },
  { id: "arrow", name: "箭头" },
  { id: "greek", name: "希腊" },
  { id: "currency", name: "货币" },
  { id: "misc", name: "其他" },
  { id: "unicode", name: "全部" },
];

// 分页状态
const unicodePage = ref(0);
const symbolsPerPage = 100;

// 生成所有可打印的 Unicode 符号
const generateUnicodeSymbols = () => {
  const symbols: string[] = [];
  const ranges = [
    { start: 0x20a0, end: 0x20cf, name: "货币符号" }, // 货币符号 20A0–20CF
    { start: 0x2100, end: 0x214f, name: "字母式符号" }, // 字母式符号 2100–214F
    { start: 0x2300, end: 0x23ff, name: "杂项工业符号" }, // 杂项工业符号 2300–23FF
    { start: 0x2600, end: 0x26ff, name: "杂项符号" }, // 杂项符号 2600–26FF
    { start: 0x2700, end: 0x27bf, name: "印刷符号" }, // 印刷符号 2700–27BF
    { start: 0x27c0, end: 0x27ef, name: "杂项数学符号A" }, // 杂项数学符号A 27C0–27EF
    { start: 0x2980, end: 0x29ff, name: "杂项数学符号B" }, // 杂项数学符号B 2980–29FF
    { start: 0x2b00, end: 0x2bff, name: "杂项符号和箭头" }, // 杂项符号和箭头 2B00–2BFF
  ];

  for (const range of ranges) {
    for (let i = range.start; i <= range.end; i++) {
      try {
        const char = String.fromCharCode(i);
        // 检查是否是有效的 Unicode 字符
        if (char.length === 1) {
          symbols.push(char);
        }
      } catch (e) {
        // 跳过无效字符
      }
    }
  }
  return symbols;
};

const allUnicodeSymbols = generateUnicodeSymbols();

const symbolLibrary = {
  common:
    "! ? , . ; : ' \" ( ) [ ] { } / \\ @ # $ % ^ & * _ - + = ~ | < > ` ~ 《 》".split(
      " ",
    ),
  math: "× ÷ ± ≠ ≤ ≥ ≈ ∞ ∂ ∇ ∑ ∏ ∫ √ π φ θ α β γ δ ε λ μ σ ω ∪ ∩ ∈ ∉ ∀ ∃ ∅ ℜ ℑ".split(
    " ",
  ),
  arrow: "← → ↑ ↓ ↖ ↗ ↘ ↙ ⇐ ⇒ ⇑ ⇓ ↔ ↕ ⇄ ⇆ ⇚ ⇛ ↩ ↪ ↫ ↬ ↮ ↰ ↱ ↶ ↷ ↺ ↻".split(" "),
  greek:
    "Α Β Γ Δ Ε Ζ Η Θ Ι Κ Λ Μ Ν Ξ Ο Π Ρ Σ Τ Υ Φ Χ Ψ Ω α β γ δ ε ζ η θ ι κ λ μ ν ξ ο π ρ σ τ υ φ χ ψ ω".split(
      " ",
    ),
  currency: "€ £ ¥ ₽ ₩ ₹ ₪ ₱ ₫ ₸ ₺ ₼ ₾ ₿".split(" "),
  misc: "★ ♥ ♦ ♣ ♠ • † ‡ ‰ ‱ ′ ″ ‴ ‵ ‶ ‷ ‸ ‹ › ‼ ‽ ‾ ‿ ⁀ ⁁ ⁂ ⁃ ⁄ ⁅ ⁆ ⁇ ⁈ ⁉ ⁊ ⁋ ⁌ ⁍ ⁎ ⁏".split(
    " ",
  ),
  unicode: allUnicodeSymbols,
};

// 获取当前页的符号
const currentSymbols = computed(() => {
  if (activeSymbolTab.value !== "unicode") {
    return (
      symbolLibrary[activeSymbolTab.value as keyof typeof symbolLibrary] || []
    );
  }
  const start = unicodePage.value * symbolsPerPage;
  const end = start + symbolsPerPage;
  return allUnicodeSymbols.slice(start, end);
});

// 总页数
const totalUnicodePages = computed(() => {
  return Math.ceil(allUnicodeSymbols.length / symbolsPerPage);
});

// 下一页
const nextUnicodePage = () => {
  if (unicodePage.value < totalUnicodePages.value - 1) {
    unicodePage.value++;
  }
};

// 上一页
const prevUnicodePage = () => {
  if (unicodePage.value > 0) {
    unicodePage.value--;
  }
};

// 切换标签时重置页码
watch(activeSymbolTab, () => {
  unicodePage.value = 0;
});

const markdownItems = [
  { name: "#", icon: "# ", insert: "# " },
  { name: "##", icon: "## ", insert: "## " },
  { name: "###", icon: "### ", insert: "### " },
  { name: "**", icon: "**粗**", insert: "****", select: [2, 2] },
  { name: "*", icon: "*斜*", insert: "**", select: [1, 1] },
  { name: "~", icon: "~~删~~", insert: "~~~~", select: [2, 2] },
  { name: "`", icon: "`代码`", insert: "``", select: [1, 1] },
  { name: "```", icon: "```", insert: "```\n\n```", select: [4, 4] },
  { name: ">", icon: "> ", insert: "> " },
  { name: "-", icon: "- ", insert: "- " },
  { name: "1.", icon: "1. ", insert: "1. " },
  { name: "---", icon: "---", insert: "\n---\n" },
  {
    name: "表",
    icon: "表格",
    insert: "| 标题1 | 标题2 |\n|-------|-------|\n| 内容1 | 内容2 |",
  },
  { name: "任务", icon: "- [ ]", insert: "- [ ] " },
  { name: "=", icon: "==高亮==", insert: "====", select: [2, 2] },
];

const position = ref({ x: 20, y: 20 });
const size = ref({ width: 320, height: 400 });
const isDragging = ref(false);
const dragOffset = ref({ x: 0, y: 0 });
const isResizing = ref(false);
const resizeStartSize = ref({ width: 0, height: 0 });
const resizeStartPos = ref({ x: 0, y: 0 });
const history = ref<string[]>([]);
const historyIndex = ref(-1);
const maxHistoryLength = 50;
const isLoading = ref(false);

const containerStyle = computed(() => ({
  left: `${position.value.x}px`,
  top: `${position.value.y}px`,
  width: `${size.value.width}px`,
  height: isExpanded.value ? `${size.value.height}px` : "auto",
}));

const canUndo = computed(() => historyIndex.value > 0);
const canRedo = computed(() => historyIndex.value < history.value.length - 1);

const addToHistory = (value: string) => {
  if (historyIndex.value < history.value.length - 1) {
    history.value = history.value.slice(0, historyIndex.value + 1);
  }
  history.value.push(value);
  if (history.value.length > maxHistoryLength) {
    history.value.shift();
  } else {
    historyIndex.value++;
  }
};

onMounted(() => {
  const centerX = (window.innerWidth - size.value.width) / 2;
  const centerY = (window.innerHeight - size.value.height) / 2;
  position.value = { x: centerX, y: centerY };
  if (localValue.value) {
    history.value = [localValue.value];
    historyIndex.value = 0;
  }
});

watch(
  () => props.modelValue,
  (newValue) => {
    if (newValue !== undefined && newValue !== localValue.value) {
      localValue.value = newValue;
      addToHistory(newValue);
    }
  },
);

const handleInput = () => {
  addToHistory(localValue.value);
  emit("update:modelValue", localValue.value);
};

const handleTextSelect = () => {};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.ctrlKey && e.key === "z" && !e.shiftKey) {
    e.preventDefault();
    handleUndo();
  }
  if (
    (e.ctrlKey && e.key === "y") ||
    (e.ctrlKey && e.shiftKey && e.key === "z")
  ) {
    e.preventDefault();
    handleRedo();
  }
  if (e.ctrlKey && e.key === "s") {
    e.preventDefault();
    handleSave(e);
  }
  if (e.ctrlKey && e.key === "f") {
    e.preventDefault();
    toggleFindReplace();
  }
  if (e.ctrlKey && e.key === "h") {
    e.preventDefault();
    showFindReplace.value = true;
    nextTick(() => {
      findInput.value?.focus();
    });
  }
  if (e.key === "Tab") {
    e.preventDefault();
    insertIndent();
  }
};

const handleUndo = () => {
  if (canUndo.value) {
    historyIndex.value--;
    localValue.value = history.value[historyIndex.value];
    emit("update:modelValue", localValue.value);
  }
};

const handleRedo = () => {
  if (canRedo.value) {
    historyIndex.value++;
    localValue.value = history.value[historyIndex.value];
    emit("update:modelValue", localValue.value);
  }
};

const handleSave = (e?: Event) => {
  e?.stopPropagation();
  textareaRef.value?.blur();
  showInfo("保存成功");
  emit("blur");
};

const insertSymbol = (symbol: string) => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const newValue = value.substring(0, start) + symbol + value.substring(end);
  localValue.value = newValue;
  addToHistory(newValue);
  emit("update:modelValue", newValue);
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus();
      textareaRef.value.setSelectionRange(
        start + symbol.length,
        start + symbol.length,
      );
    }
  });
};

const insertNewline = () => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const lines = value.substring(0, start).split("\n");
  const currentLine = lines[lines.length - 1];
  const indent = currentLine.match(/^\s*/)?.[0] || "";
  const newValue =
    value.substring(0, start) + "\n" + indent + value.substring(end);
  localValue.value = newValue;
  addToHistory(newValue);
  emit("update:modelValue", newValue);
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus();
      textareaRef.value.setSelectionRange(
        start + 1 + indent.length,
        start + 1 + indent.length,
      );
    }
  });
};

const insertIndent = () => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const newValue = value.substring(0, start) + "  " + value.substring(end);
  localValue.value = newValue;
  addToHistory(newValue);
  emit("update:modelValue", newValue);
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus();
      textareaRef.value.setSelectionRange(start + 2, start + 2);
    }
  });
};

const insertBackspace = () => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  if (start === end && start === 0) return;
  const deleteStart = start === end ? start - 1 : start;
  const newValue = value.substring(0, deleteStart) + value.substring(end);
  localValue.value = newValue;
  addToHistory(newValue);
  emit("update:modelValue", newValue);
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus();
      textareaRef.value.setSelectionRange(deleteStart, deleteStart);
    }
  });
};

const insertSpace = () => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const newValue = value.substring(0, start) + " " + value.substring(end);
  localValue.value = newValue;
  addToHistory(newValue);
  emit("update:modelValue", newValue);
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus();
      textareaRef.value.setSelectionRange(start + 1, start + 1);
    }
  });
};

const insertDelete = () => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  if (start === end && start === value.length) return;
  const deleteEnd = start === end ? start + 1 : end;
  const newValue = value.substring(0, start) + value.substring(deleteEnd);
  localValue.value = newValue;
  addToHistory(newValue);
  emit("update:modelValue", newValue);
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus();
      textareaRef.value.setSelectionRange(start, start);
    }
  });
};

const selectAll = () => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  textarea.focus();
  textarea.select();
};

const copyText = async () => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  const selectedText = getSelectedText();
  if (selectedText) {
    try {
      internalClipboard?.setText(selectedText);
      internalClipboard?.setSelection(
        textarea.selectionStart,
        textarea.selectionEnd,
      );
      showInfo("已复制");
    } catch (err) {
      showInfo("复制失败");
    }
  } else {
    showInfo("请先选择文本");
  }
};

const cutText = async () => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  const selectedText = getSelectedText();
  if (selectedText) {
    try {
      internalClipboard?.setText(selectedText);
      internalClipboard?.setSelection(
        textarea.selectionStart,
        textarea.selectionEnd,
      );
      insertBackspace();
      showInfo("已剪切");
    } catch (err) {
      showInfo("剪切失败");
    }
  } else {
    showInfo("请先选择文本");
  }
};

const pasteText = async () => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  try {
    const text = internalClipboard?.getText() || "";
    if (!text) {
      showInfo("剪贴板为空");
      return;
    }
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const newValue = value.substring(0, start) + text + value.substring(end);
    localValue.value = newValue;
    addToHistory(newValue);
    emit("update:modelValue", newValue);
    nextTick(() => {
      if (textareaRef.value) {
        textareaRef.value.focus();
        textareaRef.value.setSelectionRange(
          start + text.length,
          start + text.length,
        );
      }
    });
    showInfo("已粘贴");
  } catch (err) {
    showInfo("粘贴失败");
  }
};

const duplicateLine = () => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  const value = textarea.value;
  const start = textarea.selectionStart;
  const lines = value.split("\n");
  let lineStart = 0;
  let lineEnd = value.length;
  for (let i = 0; i < lines.length; i++) {
    const lineStartPos = lineStart;
    const lineEndPos = lineStart + lines[i].length;
    if (start >= lineStartPos && start <= lineEndPos + 1) {
      lineStart = lineStartPos;
      lineEnd = lineEndPos + 1;
      break;
    }
    lineStart = lineEndPos + 1;
  }
  const currentLine = value.substring(lineStart, lineEnd);
  const newValue =
    value.substring(0, lineEnd) + currentLine + "\n" + value.substring(lineEnd);
  localValue.value = newValue;
  addToHistory(newValue);
  emit("update:modelValue", newValue);
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus();
      textareaRef.value.setSelectionRange(
        lineEnd + currentLine.length,
        lineEnd + currentLine.length,
      );
    }
  });
};

const deleteLine = () => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  const value = textarea.value;
  const start = textarea.selectionStart;
  const lines = value.split("\n");
  let lineStart = 0;
  let lineEnd = value.length;
  for (let i = 0; i < lines.length; i++) {
    const lineStartPos = lineStart;
    const lineEndPos = lineStart + lines[i].length;
    if (start >= lineStartPos && start <= lineEndPos + 1) {
      lineStart = lineStartPos;
      lineEnd = lineEndPos + 1;
      break;
    }
    lineStart = lineEndPos + 1;
  }
  const newValue = value.substring(0, lineStart) + value.substring(lineEnd);
  localValue.value = newValue;
  addToHistory(newValue);
  emit("update:modelValue", newValue);
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus();
      textareaRef.value.setSelectionRange(lineStart, lineStart);
    }
  });
};

const moveLineUp = () => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  const value = textarea.value;
  const start = textarea.selectionStart;
  const lines = value.split("\n");
  if (lines.length < 2) return;
  let currentLineIndex = -1;
  let pos = 0;
  for (let i = 0; i < lines.length; i++) {
    const lineEnd = pos + lines[i].length;
    if (start >= pos && start <= lineEnd + 1) {
      currentLineIndex = i;
      break;
    }
    pos = lineEnd + 1;
  }
  if (currentLineIndex <= 0) return;
  const temp = lines[currentLineIndex - 1];
  lines[currentLineIndex - 1] = lines[currentLineIndex];
  lines[currentLineIndex] = temp;
  const newValue = lines.join("\n");
  localValue.value = newValue;
  addToHistory(newValue);
  emit("update:modelValue", newValue);
};

const moveLineDown = () => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  const value = textarea.value;
  const start = textarea.selectionStart;
  const lines = value.split("\n");
  if (lines.length < 2) return;
  let currentLineIndex = -1;
  let pos = 0;
  for (let i = 0; i < lines.length; i++) {
    const lineEnd = pos + lines[i].length;
    if (start >= pos && start <= lineEnd + 1) {
      currentLineIndex = i;
      break;
    }
    pos = lineEnd + 1;
  }
  if (currentLineIndex >= lines.length - 1) return;
  const temp = lines[currentLineIndex + 1];
  lines[currentLineIndex + 1] = lines[currentLineIndex];
  lines[currentLineIndex] = temp;
  const newValue = lines.join("\n");
  localValue.value = newValue;
  addToHistory(newValue);
  emit("update:modelValue", newValue);
};

const insertMarkdown = (item: any) => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const value = textarea.value;
  const selectedText = value.substring(start, end);
  let insertText = item.insert;
  if (item.select && selectedText) {
    const [selStart, selEnd] = item.select;
    insertText =
      item.insert.substring(0, selStart) +
      selectedText +
      item.insert.substring(selEnd);
  }
  const newValue =
    value.substring(0, start) + insertText + value.substring(end);
  localValue.value = newValue;
  addToHistory(newValue);
  emit("update:modelValue", newValue);
  nextTick(() => {
    if (textareaRef.value) {
      textareaRef.value.focus();
      if (item.select) {
        const [selStart, selEnd] = item.select;
        const actualStart = start + selStart;
        const actualEnd =
          start +
          (item.select && selectedText
            ? selStart + selectedText.length
            : selEnd);
        textareaRef.value.setSelectionRange(actualStart, actualEnd);
      } else {
        textareaRef.value.setSelectionRange(
          start + insertText.length,
          start + insertText.length,
        );
      }
    }
  });
};

const toggleFindReplace = () => {
  showFindReplace.value = !showFindReplace.value;
  showSymbolPanel.value = false;
  showMarkdownPanel.value = false;
  showEditPanel.value = false;
  if (showFindReplace.value) {
    nextTick(() => {
      findInput.value?.focus();
      if (
        textareaRef.value &&
        textareaRef.value.selectionStart !== textareaRef.value.selectionEnd
      ) {
        findText.value = getSelectedText();
      }
    });
  }
};

const toggleSymbolPanel = () => {
  showSymbolPanel.value = !showSymbolPanel.value;
  showFindReplace.value = false;
  showMarkdownPanel.value = false;
  showEditPanel.value = false;
};

const toggleMarkdownPanel = () => {
  showMarkdownPanel.value = !showMarkdownPanel.value;
  showFindReplace.value = false;
  showSymbolPanel.value = false;
  showEditPanel.value = false;
};

const toggleEditPanel = () => {
  showEditPanel.value = !showEditPanel.value;
  showFindReplace.value = false;
  showSymbolPanel.value = false;
  showMarkdownPanel.value = false;
};

const getSelectedText = () => {
  const textarea = textareaRef.value;
  if (!textarea) return "";
  return textarea.value.substring(
    textarea.selectionStart,
    textarea.selectionEnd,
  );
};

const findAllMatches = () => {
  if (!findText.value) {
    findMatches.value = [];
    return;
  }
  const text = localValue.value;
  const searchStr = findText.value;
  const matches: number[] = [];
  let index = 0;
  while ((index = text.indexOf(searchStr, index)) !== -1) {
    matches.push(index);
    index += searchStr.length;
  }
  findMatches.value = matches;
  currentFindIndex.value = -1;
  if (matches.length === 0) {
    findResult.value = "未找到匹配项";
  } else {
    findResult.value = `找到 ${matches.length} 个匹配项`;
  }
};

const selectRange = (start: number, end: number) => {
  const textarea = textareaRef.value;
  if (!textarea) return;
  textarea.focus();
  textarea.setSelectionRange(start, end);
};

const handleFindNext = () => {
  const textarea = textareaRef.value;
  if (!textarea || !findText.value) return;
  findAllMatches();
  if (findMatches.value.length === 0) {
    showInfo("未找到匹配项");
    return;
  }
  const currentPos = textarea.selectionEnd;
  let nextIndex = findMatches.value.findIndex((pos) => pos >= currentPos);
  if (nextIndex === -1) {
    nextIndex = 0;
  }
  currentFindIndex.value = nextIndex;
  const matchPos = findMatches.value[nextIndex];
  selectRange(matchPos, matchPos + findText.value.length);
  findResult.value = `${nextIndex + 1} / ${findMatches.value.length}`;
};

const handleFindPrev = () => {
  const textarea = textareaRef.value;
  if (!textarea || !findText.value) return;
  findAllMatches();
  if (findMatches.value.length === 0) {
    showInfo("未找到匹配项");
    return;
  }
  const currentPos = textarea.selectionStart;
  let prevIndex = findMatches.value.findIndex((pos) => pos > currentPos);
  if (prevIndex === -1) {
    prevIndex = findMatches.value.length - 1;
  } else {
    prevIndex -= 1;
  }
  currentFindIndex.value = prevIndex;
  const matchPos = findMatches.value[prevIndex];
  selectRange(matchPos, matchPos + findText.value.length);
  findResult.value = `${prevIndex + 1} / ${findMatches.value.length}`;
};

const handleReplace = () => {
  const textarea = textareaRef.value;
  if (!textarea || !findText.value) return;
  const selectedText = getSelectedText();
  if (selectedText === findText.value) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const newValue =
      value.substring(0, start) + replaceText.value + value.substring(end);
    localValue.value = newValue;
    addToHistory(newValue);
    emit("update:modelValue", newValue);
    nextTick(() => {
      if (textareaRef.value) {
        textareaRef.value.focus();
        textareaRef.value.setSelectionRange(
          start + replaceText.value.length,
          start + replaceText.value.length,
        );
      }
    });
    findAllMatches();
    handleFindNext();
  } else {
    showInfo("请先选中要替换的文本");
  }
};

const handleReplaceAll = () => {
  if (!findText.value) return;
  const value = localValue.value;
  const newValue = value.split(findText.value).join(replaceText.value);
  const count = (
    value.match(new RegExp(escapeRegExp(findText.value), "g")) || []
  ).length;
  localValue.value = newValue;
  addToHistory(newValue);
  emit("update:modelValue", newValue);
  showInfo(`已替换 ${count} 处`);
  findAllMatches();
};

const escapeRegExp = (string: string) => {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const handleComplete = async () => {
  const aiService = getAISuggestionService();
  if (!aiService) {
    showInfo("AI 服务不可用");
    return;
  }
  const textarea = textareaRef.value;
  if (!textarea) return;
  const start = textarea.selectionStart;
  const value = textarea.value;
  const beforeCursor = value.substring(0, start);
  const lines = beforeCursor.split("\n");
  const lastLine = lines[lines.length - 1];
  const lineNumber = lines.length;
  const column = lastLine.length + 1;
  try {
    isLoading.value = true;
    showInfo("正在获取 AI 补全...");
    const suggestion = await aiService.getSuggestion(value, {
      lineNumber,
      column,
    });
    if (
      suggestion &&
      typeof suggestion === "string" &&
      suggestion.trim() !== ""
    ) {
      const currentLine = lines[lines.length - 1];
      const leadingWhitespace = currentLine.match(/^\s*/)?.[0] || "";
      const alignedSuggestion = suggestion
        .split("\n")
        .map((line, i) => (i === 0 ? line : leadingWhitespace + line))
        .join("\n");
      const newValue =
        value.substring(0, start) + alignedSuggestion + value.substring(start);
      localValue.value = newValue;
      addToHistory(newValue);
      emit("update:modelValue", newValue);
      setTimeout(() => {
        if (textareaRef.value) {
          textareaRef.value.selectionStart = textareaRef.value.selectionEnd =
            start + alignedSuggestion.length;
        }
      }, 0);
      showInfo("AI 补全完成");
    } else {
      showInfo("没有获取到补全建议");
    }
  } catch (error) {
    console.error("AI 补全错误:", error);
    showInfo("AI 补全失败");
  } finally {
    isLoading.value = false;
  }
};

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

const handleMouseDown = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  if (!floatContainer.value) return;
  isDragging.value = true;
  const rect = floatContainer.value.getBoundingClientRect();
  dragOffset.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
  document.addEventListener("mousemove", handleMouseMove);
  document.addEventListener("mouseup", handleMouseUp);
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value || !floatContainer.value) return;
  const x = e.clientX - dragOffset.value.x;
  const y = e.clientY - dragOffset.value.y;
  const maxX = window.innerWidth - floatContainer.value.offsetWidth;
  const maxY = window.innerHeight - floatContainer.value.offsetHeight;
  position.value = {
    x: Math.max(0, Math.min(x, maxX)),
    y: Math.max(0, Math.min(y, maxY)),
  };
};

const handleMouseUp = () => {
  isDragging.value = false;
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
};

let touchStartPos = { x: 0, y: 0 };

const handleTouchStart = (e: TouchEvent) => {
  e.stopPropagation();
  if (!floatContainer.value) return;
  const touch = e.touches[0];
  touchStartPos = { x: touch.clientX, y: touch.clientY };
  isDragging.value = true;
};

const handleTouchMove = (e: TouchEvent) => {
  e.stopPropagation();
  if (!isDragging.value || !floatContainer.value) return;
  const touch = e.touches[0];
  const dx = touch.clientX - touchStartPos.x;
  const dy = touch.clientY - touchStartPos.y;
  const newX = position.value.x + dx;
  const newY = position.value.y + dy;
  const maxX = window.innerWidth - floatContainer.value.offsetWidth;
  const maxY = window.innerHeight - floatContainer.value.offsetHeight;
  position.value = {
    x: Math.max(0, Math.min(newX, maxX)),
    y: Math.max(0, Math.min(newY, maxY)),
  };
  touchStartPos = { x: touch.clientX, y: touch.clientY };
};

const handleTouchEnd = (e: TouchEvent) => {
  e.stopPropagation();
  isDragging.value = false;
};

const handleResizeMouseDown = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  if (!floatContainer.value) return;
  isResizing.value = true;
  resizeStartSize.value = {
    width: size.value.width,
    height: size.value.height,
  };
  resizeStartPos.value = { x: e.clientX, y: e.clientY };
  document.addEventListener("mousemove", handleResizeMouseMove);
  document.addEventListener("mouseup", handleResizeMouseUp);
};

const handleResizeMouseMove = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  if (!isResizing.value) return;
  const dx = e.clientX - resizeStartPos.value.x;
  const dy = e.clientY - resizeStartPos.value.y;
  size.value = {
    width: Math.max(200, resizeStartSize.value.width + dx),
    height: Math.max(200, resizeStartSize.value.height + dy),
  };
};

const handleResizeMouseUp = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
  isResizing.value = false;
  document.removeEventListener("mousemove", handleResizeMouseMove);
  document.removeEventListener("mouseup", handleResizeMouseUp);
};

let resizeTouchStartPos = { x: 0, y: 0 };

const handleResizeStart = (e: TouchEvent) => {
  e.preventDefault();
  e.stopPropagation();
  if (!floatContainer.value) return;
  const touch = e.touches[0];
  resizeTouchStartPos = { x: touch.clientX, y: touch.clientY };
  resizeStartSize.value = {
    width: size.value.width,
    height: size.value.height,
  };
  isResizing.value = true;
  document.addEventListener("touchmove", handleResizeTouchMove, {
    passive: false,
  });
  document.addEventListener("touchend", handleResizeTouchEnd);
};

const handleResizeTouchMove = (e: TouchEvent) => {
  if (!isResizing.value) return;
  e.preventDefault();
  const touch = e.touches[0];
  const dx = touch.clientX - resizeTouchStartPos.x;
  const dy = touch.clientY - resizeTouchStartPos.y;
  size.value = {
    width: Math.max(200, resizeStartSize.value.width + dx),
    height: Math.max(200, resizeStartSize.value.height + dy),
  };
};

const handleResizeTouchEnd = () => {
  isResizing.value = false;
  document.removeEventListener("touchmove", handleResizeTouchMove);
  document.removeEventListener("touchend", handleResizeTouchEnd);
};

onBeforeUnmount(() => {
  document.removeEventListener("mousemove", handleMouseMove);
  document.removeEventListener("mouseup", handleMouseUp);
  document.removeEventListener("mousemove", handleResizeMouseMove);
  document.removeEventListener("mouseup", handleResizeMouseUp);
  document.removeEventListener("touchmove", handleResizeTouchMove);
  document.removeEventListener("touchend", handleResizeTouchEnd);
});
</script>
