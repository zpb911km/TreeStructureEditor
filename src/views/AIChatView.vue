<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from "vue";
import { showSuccess, showError } from "../utils/notifications";

// ─── Types ──────────────────────────────────────────────
interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string | ChatContentPart[];
  thinking?: string;
  timestamp: number;
  _isStreaming?: boolean;
  _id?: string;
}

interface ChatContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface UploadedFile {
  name: string;
  type: string;
  size: number;
  dataUrl: string | null;
  textContent?: string;
}

interface AIChatSettings {
  apiUrl: string;
  apiKey: string;
  model: string;
  systemPrompt: string;
  streaming: boolean;
  thinking: boolean;
}

// ─── State ──────────────────────────────────────────────
const STORAGE_KEYS = {
  SETTINGS: "ai_chat_settings_v2",
  CONVERSATIONS: "ai_chat_conversations_v2",
  CURRENT_CONV: "ai_chat_current_conv_v2",
};

const defaultSettings: AIChatSettings = {
  apiUrl: "https://api.openai.com/v1/chat/completions",
  apiKey: "",
  model: "gpt-3.5-turbo",
  systemPrompt: "你是一个有用的 AI 助手。",
  streaming: true,
  thinking: false,
};

const settings = ref<AIChatSettings>({ ...defaultSettings });
const conversations = ref<Conversation[]>([]);
const currentConvId = ref<string | null>(null);
const isGenerating = ref(false);
const abortController = ref<AbortController | null>(null);
const uploadedFiles = ref<UploadedFile[]>([]);
const messageInput = ref("");
const sidebarOpen = ref(false);
const settingsModalOpen = ref(false);
const lightboxOpen = ref(false);
const lightboxSrc = ref("");
const darkMode = ref(false);
const fileUploadRef = ref<HTMLInputElement | null>(null);

// Computed
const currentConv = computed(() =>
  conversations.value.find((c) => c.id === currentConvId.value)
);

const currentModelDisplay = computed(() => settings.value.model);

// ─── Persistence ────────────────────────────────────────
function loadAllState() {
  loadSettings();
  loadCurrentConvId();
  loadConversations();
}

function loadSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      settings.value = { ...defaultSettings, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error("Load settings error:", e);
  }
}

function saveSettingsToDisk() {
  try {
    localStorage.setItem(
      STORAGE_KEYS.SETTINGS,
      JSON.stringify(settings.value)
    );
  } catch (e) {
    console.error("Save settings error:", e);
  }
}

function loadConversations() {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    if (saved) conversations.value = JSON.parse(saved);
  } catch (e) {
    console.error("Load conversations error:", e);
  }
}

function saveConversationsToDisk() {
  try {
    localStorage.setItem(
      STORAGE_KEYS.CONVERSATIONS,
      JSON.stringify(conversations.value)
    );
  } catch (e) {
    console.error("Save conversations error:", e);
  }
}

function loadCurrentConvId() {
  try {
    currentConvId.value =
      localStorage.getItem(STORAGE_KEYS.CURRENT_CONV) || null;
  } catch (e) {
    currentConvId.value = null;
  }
}

function saveCurrentConvId() {
  try {
    localStorage.setItem(
      STORAGE_KEYS.CURRENT_CONV,
      currentConvId.value || ""
    );
  } catch (e) {}
}

// ─── Utilities ──────────────────────────────────────────
function generateId(): string {
  return (
    "conv_" +
    Date.now() +
    "_" +
    Math.random().toString(36).substring(2, 11)
  );
}

function escapeHtml(str: string): string {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function scrollToBottom() {
  nextTick(() => {
    const chatArea = document.querySelector(".chat-area");
    if (chatArea) {
      setTimeout(() => {
        chatArea.scrollTop = chatArea.scrollHeight;
      }, 10);
    }
  });
}

// ─── UI: Sidebar ────────────────────────────────────────
function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
}

function closeSidebarMobile() {
  if (window.innerWidth <= 768) sidebarOpen.value = false;
}

// ─── UI: Conversations ──────────────────────────────────
function createNewChat() {
  if (isGenerating.value) stopGeneration();
  const conv: Conversation = {
    id: generateId(),
    title: "新对话",
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  conversations.value.unshift(conv);
  currentConvId.value = conv.id;
  saveConversationsToDisk();
  saveCurrentConvId();
  closeSidebarMobile();
}

function switchConversation(convId: string) {
  currentConvId.value = convId;
  saveCurrentConvId();
  closeSidebarMobile();
}

function deleteConversation(convId: string) {
  conversations.value = conversations.value.filter((c) => c.id !== convId);
  saveConversationsToDisk();
  if (currentConvId.value === convId) {
    currentConvId.value =
      conversations.value.length > 0 ? conversations.value[0].id : null;
    saveCurrentConvId();
  }
}

function renameConversation(convId: string) {
  const conv = conversations.value.find((c) => c.id === convId);
  if (!conv) return;
  const newName = prompt("重命名对话", conv.title);
  if (newName && newName.trim()) {
    conv.title = newName.trim();
    saveConversationsToDisk();
  }
}

function clearCurrentChat() {
  if (!currentConvId.value) return;
  if (isGenerating.value) stopGeneration();
  const conv = conversations.value.find((c) => c.id === currentConvId.value);
  if (conv) {
    conv.messages = [];
    conv.updatedAt = Date.now();
    saveConversationsToDisk();
    showSuccess("对话已清空");
  }
}

// ─── UI: Settings ───────────────────────────────────────
function openSettingsModal() {
  settingsModalOpen.value = true;
}

function closeSettingsModal() {
  settingsModalOpen.value = false;
}

function saveSettings() {
  saveSettingsToDisk();
  closeSettingsModal();
  showSuccess("设置已保存");
}

// ─── UI: Messages ───────────────────────────────────────
function formatUserContent(content: string | ChatContentPart[]): string {
  if (typeof content === "string")
    return escapeHtml(content).replace(/\n/g, "<br>");
  if (Array.isArray(content)) {
    let html = "";
    content.forEach((part) => {
      if (part.type === "text")
        html += escapeHtml(part.text || "").replace(/\n/g, "<br>") + "<br>";
      else if (part.type === "image_url" && part.image_url)
        html +=
          '<img src="' +
          part.image_url.url +
          '" alt="img" class="msg-img" style="max-width:300px;border-radius:8px;margin:4px 0;cursor:pointer">';
    });
    return html;
  }
  return escapeHtml(String(content));
}

function renderMarkdown(text: string): string {
  if (!text) return "";

  // Extract code blocks first
  const codeBlocks: { lang: string; code: string }[] = [];
  text = text.replace(
    /```(\w*)\n([\s\S]*?)```/g,
    (_match: string, lang: string, code: string) => {
      const idx = codeBlocks.length;
      codeBlocks.push({
        lang: lang || "code",
        code: escapeHtml(code.trim()),
      });
      return "%%CODEBLOCK_" + idx + "%%";
    }
  );

  // Inline code
  const inlineCodes: string[] = [];
  text = text.replace(/`([^`]+)`/g, (_match: string, code: string) => {
    const idx = inlineCodes.length;
    inlineCodes.push(escapeHtml(code));
    return "%%INLINECODE_" + idx + "%%";
  });

  // KaTeX display math $$...$$
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_match: string, formula: string) => {
    try {
      // Dynamically render katex
      const katex = (window as any).katex;
      if (katex) {
        const rendered = katex.renderToString(formula, {
          displayMode: true,
          throwOnError: false,
        });
        return '<div class="katex-display">' + rendered + "</div>";
      }
    } catch (e: any) {
      return '<div class="katex-display" style="color:#ff5c72;font-size:12px;">公式渲染错误</div>';
    }
    return _match;
  });

  // KaTeX inline $...$
  text = text.replace(/\$([^\$\n]+?)\$/g, (_match: string, formula: string) => {
    try {
      const katex = (window as any).katex;
      if (katex) {
        return katex.renderToString(formula, {
          displayMode: false,
          throwOnError: false,
        });
      }
    } catch (e: any) {
      return '<span style="color:#ff5c72;font-size:11px;">$' + escapeHtml(formula) + "$</span>";
    }
    return _match;
  });

  // Restore inline codes
  text = text.replace(
    /%%INLINECODE_(\d+)%%/g,
    (_match: string, idx: string) => {
      return "<code>" + inlineCodes[parseInt(idx)] + "</code>";
    }
  );

  // Restore code blocks
  text = text.replace(
    /%%CODEBLOCK_(\d+)%%/g,
    (_match: string, idx: string) => {
      const block = codeBlocks[parseInt(idx)];
      return (
        '<pre><span class="code-lang">' +
        block.lang +
        '</span><button class="copy-btn copy-code">复制</button><code>' +
        block.code +
        "</code></pre>"
      );
    }
  );

  // Inline formatting
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*(.+?)\*/g, "<em>$1</em>");
  text = text.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  text = text.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  text = text.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  text = text.replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>");
  text = text.replace(/^---$/gm, "<hr>");
  text = text.replace(/^[\s]*[-*] (.+)$/gm, "<li>$1</li>");
  text = text.replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");
  text = text.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener">$1</a>'
  );

  // Paragraphs
  text = text.replace(/\n\n/g, "</p><p>");
  text = text.replace(/\n/g, "<br>");
  if (!text.startsWith("<")) text = "<p>" + text + "</p>";

  return text;
}

function formatAssistantContent(msg: ChatMessage): string {
  let html = "";
  if (msg.thinking) {
    html +=
      '<div class="thinking-block"><div class="thinking-toggle" data-thinking="' +
      msg._id +
      '">' +
      '<span class="arrow open">▶</span><span>🧠 思考过程</span></div>' +
      '<div class="thinking-content" id="thinking_' +
      msg._id +
      '">' +
      escapeHtml(msg.thinking).replace(/\n/g, "<br>") +
      "</div></div>";
  }
  html += renderMarkdown(typeof msg.content === "string" ? msg.content : "");
  if (msg._isStreaming)
    html +=
      '<div class="streaming-indicator"><span class="streaming-dot"></span> 正在生成...</div>';
  return html;
}

// ─── API Calls ──────────────────────────────────────────
async function sendMessage() {
  if (isGenerating.value) {
    stopGeneration();
    return;
  }
  const text = messageInput.value.trim();
  if (!text && uploadedFiles.value.length === 0) return;

  if (!currentConvId.value) createNewChat();
  const conv = conversations.value.find((c) => c.id === currentConvId.value);
  if (!conv) return;

  // Build user content
  let userContent: string | ChatContentPart[];
  if (uploadedFiles.value.length > 0) {
    const parts: ChatContentPart[] = [];
    uploadedFiles.value.forEach((file) => {
      if (file.type.startsWith("image/") && file.dataUrl) {
        parts.push({
          type: "image_url",
          image_url: { url: file.dataUrl },
        });
      }
    });
    parts.push({
      type: "text",
      text: text || "请分析这些文件",
    });
    userContent = parts;
  } else {
    userContent = text;
  }

  // Add user message
  conv.messages.push({
    id: generateId(),
    role: "user",
    content: userContent,
    timestamp: Date.now(),
  });

  // Auto-title: first user message
  const userMsgCount = conv.messages.filter((m) => m.role === "user").length;
  if (userMsgCount === 1) {
    conv.title =
      text.substring(0, 30) + (text.length > 30 ? "..." : "") || "文件对话";
  }
  conv.updatedAt = Date.now();
  saveConversationsToDisk();

  messageInput.value = "";
  uploadedFiles.value = [];
  scrollToBottom();

  await callAPI(conv);
}

async function callAPI(conv: Conversation) {
  isGenerating.value = true;
  abortController.value = new AbortController();

  const apiMessages: { role: string; content: any; reasoning_content?: string }[] = [];
  if (settings.value.systemPrompt) {
    apiMessages.push({ role: "system", content: settings.value.systemPrompt });
  }
  conv.messages.forEach((msg) => {
    if (msg.role === "assistant" && msg.thinking) {
      apiMessages.push({
        role: "assistant",
        content: msg.content,
        reasoning_content: msg.thinking,
      });
    } else {
      apiMessages.push({ role: msg.role, content: msg.content });
    }
  });

  const assistantMsg: ChatMessage = {
    id: generateId(),
    role: "assistant",
    content: "",
    thinking: "",
    timestamp: Date.now(),
    _isStreaming: true,
    _id: "thinking_" + Math.random().toString(36).substring(2, 11),
  };
  conv.messages.push(assistantMsg);
  scrollToBottom();

  try {
    const requestBody: any = {
      model: settings.value.model,
      messages: apiMessages,
      stream: settings.value.streaming,
    };
    if (settings.value.thinking) {
      requestBody.reasoning_effort = "high";
    }

    if (settings.value.streaming) {
      await streamResponse(requestBody, assistantMsg, conv);
    } else {
      await nonStreamResponse(requestBody, assistantMsg, conv);
    }
  } catch (error: any) {
    if (error.name === "AbortError") {
      assistantMsg.content =
        (assistantMsg.content as string) + "\n\n[已停止生成]";
    } else {
      assistantMsg.content = "❌ 错误: " + escapeHtml(error.message);
      showError("请求失败: " + error.message);
    }
    assistantMsg._isStreaming = false;
    saveConversationsToDisk();
  } finally {
    isGenerating.value = false;
    abortController.value = null;
  }
}

async function streamResponse(
  requestBody: any,
  assistantMsg: ChatMessage,
  conv: Conversation
) {
  const response = await fetch(settings.value.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + settings.value.apiKey,
    },
    body: JSON.stringify(requestBody),
    signal: abortController.value?.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("HTTP " + response.status + ": " + errorText);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("Response body is not readable");

  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";
  let fullThinking = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta;
          if (!delta) continue;
          if (delta.content) {
            fullContent += delta.content;
            assistantMsg.content = fullContent;
          }
          if (delta.reasoning_content || delta.reasoning) {
            fullThinking += delta.reasoning_content || delta.reasoning || "";
            assistantMsg.thinking = fullThinking;
          }
          assistantMsg._isStreaming = true;
        } catch (e) {
          // Skip non-JSON lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  assistantMsg._isStreaming = false;
  assistantMsg.content = fullContent;
  assistantMsg.thinking = fullThinking;
  conv.updatedAt = Date.now();
  saveConversationsToDisk();
  scrollToBottom();
}

async function nonStreamResponse(
  requestBody: any,
  assistantMsg: ChatMessage,
  conv: Conversation
) {
  const response = await fetch(settings.value.apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + settings.value.apiKey,
    },
    body: JSON.stringify(requestBody),
    signal: abortController.value?.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error("HTTP " + response.status + ": " + errorText);
  }

  const data = await response.json();
  const choice = data.choices?.[0]?.message;
  if (choice) {
    assistantMsg.content = choice.content || "";
    assistantMsg.thinking =
      choice.reasoning_content || choice.reasoning || "";
  }
  assistantMsg._isStreaming = false;
  conv.updatedAt = Date.now();
  saveConversationsToDisk();
  scrollToBottom();
}

function stopGeneration() {
  if (abortController.value) {
    abortController.value.abort();
  }
}

// ─── Message Actions ────────────────────────────────────
function regenerateMessage(idx: number) {
  if (isGenerating.value) return;
  const conv = conversations.value.find((c) => c.id === currentConvId.value);
  if (!conv || idx < 1) return;

  let userMsgIdx = -1;
  for (let i = idx - 1; i >= 0; i--) {
    if (conv.messages[i].role === "user") {
      userMsgIdx = i;
      break;
    }
  }
  if (userMsgIdx === -1) return;

  conv.messages.splice(idx);
  saveConversationsToDisk();
  const userMsg = conv.messages[userMsgIdx];
  if (typeof userMsg.content === "string") {
    messageInput.value = userMsg.content;
  }
  callAPI(conv);
}

function deleteMessage(idx: number) {
  const conv = conversations.value.find((c) => c.id === currentConvId.value);
  if (!conv) return;
  conv.messages.splice(idx, 1);
  saveConversationsToDisk();
}

function copyMessage(idx: number) {
  const conv = conversations.value.find((c) => c.id === currentConvId.value);
  if (!conv || !conv.messages[idx]) return;
  const msg = conv.messages[idx];
  let text = "";
  if (typeof msg.content === "string") text = msg.content;
  else if (Array.isArray(msg.content)) {
    text = msg.content
      .map((p) => (p.type === "text" ? p.text : "[图片]"))
      .join("\n");
  }
  navigator.clipboard.writeText(text).then(() => showSuccess("已复制到剪贴板"));
}

// ─── File Upload ────────────────────────────────────────
function handleFileUpload(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  input.value = "";

  files.forEach((file) => {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedFiles.value.push({
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: e.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    } else if (
      file.type.startsWith("text/") ||
      /\.(txt|md|csv|json|js|ts|py|html|css|xml|yml|yaml|log|sh|c|cpp|h|java|go|rs|rb|php|sql)$/i.test(
        file.name
      )
    ) {
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedFiles.value.push({
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: null,
          textContent: e.target?.result as string,
        });
      };
      reader.readAsText(file);
    } else {
      uploadedFiles.value.push({
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: null,
      });
    }
  });
}

function removeUploadedFile(idx: number) {
  uploadedFiles.value.splice(idx, 1);
}

// ─── Lightbox ───────────────────────────────────────────
function openLightbox(src: string) {
  lightboxSrc.value = src;
  lightboxOpen.value = true;
}

function closeLightbox() {
  lightboxOpen.value = false;
}

// ─── Event Handlers ─────────────────────────────────────
function handleInputKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    if (isGenerating.value) stopGeneration();
    else sendMessage();
  }
}

function handleMessageClick(event: MouseEvent) {
  const target = event.target as HTMLElement;

  // Copy message
  const copyBtn = target.closest(".copy-msg");
  if (copyBtn) {
    const idx = parseInt(copyBtn.getAttribute("data-idx") || "0");
    copyMessage(idx);
    return;
  }

  // Regenerate
  const regenBtn = target.closest(".regen-msg");
  if (regenBtn) {
    regenerateMessage(parseInt(regenBtn.getAttribute("data-idx") || "0"));
    return;
  }

  // Delete message
  const delBtn = target.closest(".del-msg");
  if (delBtn) {
    deleteMessage(parseInt(delBtn.getAttribute("data-idx") || "0"));
    return;
  }

  // Copy code
  const codeCopyBtn = target.closest(".copy-code");
  if (codeCopyBtn) {
    const pre = codeCopyBtn.parentElement;
    const code = pre?.querySelector("code");
    if (code) {
      navigator.clipboard
        .writeText(code.textContent || "")
        .then(() => {
          codeCopyBtn.textContent = "已复制!";
          setTimeout(() => {
            codeCopyBtn.textContent = "复制";
          }, 2000);
        });
    }
    return;
  }

  // Image lightbox
  const msgImg = target.closest(".msg-img") as HTMLImageElement | null;
  if (msgImg) {
    openLightbox(msgImg.src);
    return;
  }

  // Thinking toggle
  const thinkingToggleEl = target.closest(".thinking-toggle");
  if (thinkingToggleEl) {
    const content = thinkingToggleEl.nextElementSibling as HTMLElement;
    const arrow = thinkingToggleEl.querySelector(".arrow") as HTMLElement;
    if (content) {
      content.classList.toggle("hidden");
      if (arrow) arrow.classList.toggle("open");
    }
  }
}

function handleTextareaInput(event: Event) {
  const textarea = event.target as HTMLTextAreaElement;
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
}

// ─── Lifecycle ──────────────────────────────────────────
onMounted(() => {
  loadAllState();

  // Check dark mode
  darkMode.value = document.documentElement.classList.contains("dark");

  // Ensure at least one conversation exists
  if (!currentConvId.value && conversations.value.length === 0) {
    createNewChat();
  } else if (currentConvId.value) {
    const found = conversations.value.find(
      (c) => c.id === currentConvId.value
    );
    if (!found) {
      currentConvId.value = null;
      saveCurrentConvId();
    }
  }

  // Listen for route changes to close sidebar
  const handleRouteChange = () => {
    if (window.innerWidth <= 768) sidebarOpen.value = false;
  };
  window.addEventListener("popstate", handleRouteChange);
});
</script>

<template>
  <div
    class="ai-chat-container"
    :class="{ 'dark-mode': darkMode }"
    @click="handleMessageClick"
  >
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ open: sidebarOpen }">
      <div class="sidebar-header">
        <div class="logo-box">🤖</div>
        <h1>AI Chat</h1>
      </div>
      <button class="new-chat-btn" @click="createNewChat">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.5"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
        新建对话
      </button>
      <div class="conversation-list">
        <div
          v-if="conversations.length === 0"
          class="empty-state"
        >
          <div class="empty-icon">💬</div>
          <p>暂无对话</p>
        </div>
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="conv-item"
          :class="{ active: conv.id === currentConvId }"
          @click="switchConversation(conv.id)"
        >
          <span class="conv-icon">💬</span>
          <span class="conv-title" :title="conv.title">{{ conv.title }}</span>
          <div class="conv-actions">
            <button
              class="conv-action-btn rename"
              :data-id="conv.id"
              title="重命名"
              @click.stop="renameConversation(conv.id)"
            >
              ✎
            </button>
            <button
              class="conv-action-btn delete"
              :data-id="conv.id"
              title="删除"
              @click.stop="deleteConversation(conv.id)"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
      <div class="sidebar-footer">
        <button class="settings-btn" @click="openSettingsModal">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
          >
            <circle cx="12" cy="12" r="3" />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
            />
          </svg>
          设置
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <!-- Header -->
      <header class="chat-header">
        <div class="chat-header-left">
          <button class="menu-toggle" @click="toggleSidebar">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div
            class="model-badge"
            title="点击设置"
            @click="openSettingsModal"
          >
            <span>{{ currentModelDisplay }}</span>
          </div>
        </div>
        <div class="chat-header-actions">
          <button
            class="header-action-btn"
            title="清空当前对话"
            @click="clearCurrentChat"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
            >
              <polyline points="3 6 5 6 21 6" />
              <path
                d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
              />
            </svg>
          </button>
        </div>
      </header>

      <!-- Chat Area -->
      <div class="chat-area" id="chatArea">
        <div class="chat-messages" id="chatMessages">
          <!-- Welcome screen when no messages -->
          <div
            v-if="!currentConv || currentConv.messages.length === 0"
            class="welcome-screen"
          >
            <div class="welcome-logo-box">💬</div>
            <h2>你好，有什么可以帮你的？</h2>
            <p>开始一段新的对话，支持文本、图片、代码和文档。</p>
          </div>

          <!-- Messages -->
          <div
            v-for="(msg, idx) in currentConv?.messages || []"
            :key="msg.id"
            class="message"
            :class="msg.role"
          >
            <div class="message-avatar">
              {{ msg.role === "user" ? "👤" : "🤖" }}
            </div>
            <div class="message-content">
              <div class="message-header">
                <span class="message-sender">{{
                  msg.role === "user" ? "你" : "AI"
                }}</span>
                <span class="message-time">{{ formatTime(msg.timestamp) }}</span>
              </div>
              <div class="message-body">
                <template v-if="msg.role === 'user'">
                  <span v-html="formatUserContent(msg.content)"></span>
                </template>
                <template v-else>
                  <span v-html="formatAssistantContent(msg)"></span>
                </template>
              </div>
              <div class="message-actions">
                <button class="msg-action-btn copy-msg" :data-idx="idx">
                  📋 复制
                </button>
                <button
                  v-if="msg.role === 'assistant'"
                  class="msg-action-btn regen-msg"
                  :data-idx="idx"
                >
                  🔄 重新生成
                </button>
                <button class="msg-action-btn del-msg" :data-idx="idx">
                  🗑️ 删除
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Input Area -->
      <div class="input-area">
        <div class="input-container">
          <div class="input-box">
            <!-- Uploaded files preview -->
            <div
              v-if="uploadedFiles.length > 0"
              class="uploaded-files-preview"
            >
              <div
                v-for="(file, idx) in uploadedFiles"
                :key="idx"
                class="uploaded-file-chip"
              >
                <img
                  v-if="file.dataUrl && file.type.startsWith('image/')"
                  :src="file.dataUrl"
                  :alt="file.name"
                />
                <span v-else class="file-icon">📎</span>
                <span>{{ file.name }}</span>
                <button
                  class="remove-file"
                  @click="removeUploadedFile(idx)"
                >
                  ✕
                </button>
              </div>
            </div>

            <div class="input-row">
              <div class="input-tools">
                <button
                  class="tool-btn"
                  title="上传文件"
                  @click="
                    fileUploadRef?.click()
                  "
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <path
                      d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
                    />
                  </svg>
                  <span class="tooltip">上传文件</span>
                </button>
                <input
                  ref="fileUploadRef"
                  type="file"
                  id="fileUpload"
                  multiple
                  style="display: none"
                  @change="handleFileUpload"
                />
              </div>
              <textarea
                id="messageInput"
                v-model="messageInput"
                placeholder="输入消息..."
                rows="1"
                @keydown="handleInputKeydown"
                @input="handleTextareaInput"
              ></textarea>
              <button
                class="send-btn"
                :class="{ 'stop-btn': isGenerating }"
                :title="isGenerating ? '停止' : '发送'"
                @click="sendMessage"
              >
                <svg
                  v-if="!isGenerating"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
                <svg
                  v-else
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <rect
                    x="6"
                    y="6"
                    width="12"
                    height="12"
                    rx="1"
                  />
                </svg>
              </button>
            </div>
          </div>
          <div class="input-footer">
            <label class="thinking-option">
              <input
                type="checkbox"
                v-model="settings.thinking"
                @change="saveSettingsToDisk"
              />
              <div class="thinking-switch"></div>
              <span class="thinking-label">🧠 深度思考</span>
            </label>
            <span class="input-hint">Enter 发送 · Shift+Enter 换行</span>
          </div>
        </div>
      </div>
    </main>

    <!-- Settings Modal -->
    <div class="modal-overlay" :class="{ show: settingsModalOpen }">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>⚙️ 设置</h3>
          <button class="modal-close" @click="closeSettingsModal">
            &times;
          </button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label class="form-label">API 地址</label>
            <input
              class="form-input"
              v-model="settings.apiUrl"
              placeholder="https://api.openai.com/v1/chat/completions"
            />
            <div class="form-hint">支持 OpenAI 兼容的 API 端点</div>
          </div>
          <div class="form-group">
            <label class="form-label">API Key</label>
            <input
              class="form-input"
              v-model="settings.apiKey"
              type="password"
              placeholder="sk-..."
            />
          </div>
          <div class="form-group">
            <label class="form-label">模型名称</label>
            <input
              class="form-input"
              v-model="settings.model"
              placeholder="gpt-3.5-turbo"
            />
            <div class="form-hint">
              例如: gpt-3.5-turbo, gpt-4, claude-3-sonnet 等
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">系统提示词</label>
            <textarea
              class="form-input"
              v-model="settings.systemPrompt"
              rows="3"
              placeholder="你是一个有用的 AI 助手..."
            ></textarea>
          </div>
          <div class="form-group">
            <label class="form-label">流式输出</label>
            <label class="thinking-option" style="cursor: pointer">
              <input type="checkbox" v-model="settings.streaming" />
              <div class="thinking-switch"></div>
              <span class="thinking-label">启用流式输出（SSE）</span>
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="closeSettingsModal">
            取消
          </button>
          <button class="btn btn-primary" @click="saveSettings">
            保存设置
          </button>
        </div>
      </div>
    </div>

    <!-- Lightbox -->
    <div class="lightbox" :class="{ show: lightboxOpen }" @click="closeLightbox">
      <img :src="lightboxSrc" alt="" />
    </div>
  </div>
</template>

<style scoped>
/* ── Reset & Variables ── */
.ai-chat-container {
  --bg-primary: #0f1117;
  --bg-secondary: #161922;
  --bg-tertiary: #1c2030;
  --bg-hover: #242838;
  --bg-active: #2a2f42;
  --border-color: #2a2f42;
  --text-primary: #e8eaed;
  --text-secondary: #9aa0ab;
  --text-muted: #5f6678;
  --accent: #6c8cff;
  --accent-hover: #8aa4ff;
  --accent-glow: rgba(108, 140, 255, 0.15);
  --danger: #ff5c72;
  --success: #4ade80;
  --warning: #fbbf24;
  --radius: 12px;
  --radius-sm: 8px;
  --radius-xs: 6px;
  --shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
  --transition: 0.2s ease;

  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Noto Sans SC", sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  /* 固定定位绕过 App.vue 布局干扰，底部留出导航栏高度 */
  position: fixed;
  inset: 0;
  bottom: 56px;
  overflow: hidden;
  display: flex;
  z-index: 40;
}

/* Reset for scoped component */
:deep(*) {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:deep(::-webkit-scrollbar) {
  width: 6px;
}
:deep(::-webkit-scrollbar-track) {
  background: transparent;
}
:deep(::-webkit-scrollbar-thumb) {
  background: var(--bg-active);
  border-radius: 3px;
}
:deep(::-webkit-scrollbar-thumb:hover) {
  background: var(--text-muted);
}

/* ── Sidebar ── */
.sidebar {
  width: 300px;
  min-width: 300px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  transition: transform 0.3s ease;
  z-index: 100;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-box {
  width: 36px;
  height: 36px;
  background: linear-gradient(135deg, var(--accent), #a78bfa);
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.sidebar-header h1 {
  font-size: 18px;
  font-weight: 600;
  background: linear-gradient(135deg, var(--accent), #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.new-chat-btn {
  margin: 16px 20px;
  padding: 12px;
  background: var(--accent);
  color: white;
  border: none;
  border-radius: var(--radius-sm);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all var(--transition);
  font-family: inherit;
}

.new-chat-btn:hover {
  background: var(--accent-hover);
  box-shadow: 0 0 20px var(--accent-glow);
  transform: translateY(-1px);
}

.conversation-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
}

.conv-item {
  padding: 12px 16px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: all var(--transition);
  margin-bottom: 2px;
  position: relative;
}

.conv-item:hover {
  background: var(--bg-hover);
}

.conv-item.active {
  background: var(--bg-active);
}

.conv-icon {
  font-size: 16px;
  color: var(--text-muted);
  flex-shrink: 0;
}

.conv-title {
  flex: 1;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-secondary);
}

.conv-item.active .conv-title {
  color: var(--text-primary);
}

.conv-actions {
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--transition);
  flex-shrink: 0;
}

.conv-item:hover .conv-actions {
  opacity: 1;
}

.conv-action-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 12px;
  transition: all var(--transition);
}

.conv-action-btn:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-primary);
}

.conv-action-btn.delete:hover {
  color: var(--danger);
  background: rgba(255, 92, 114, 0.1);
}

.sidebar-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

.settings-btn {
  width: 100%;
  padding: 10px 16px;
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: all var(--transition);
  font-family: inherit;
}

.settings-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
  border-color: var(--accent);
}

/* ── Main Content ── */
.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  position: relative;
}

.chat-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--bg-secondary);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}

.chat-header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.menu-toggle {
  display: none;
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
}

.model-badge {
  padding: 6px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 12px;
  color: var(--accent);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
}

.model-badge:hover {
  border-color: var(--accent);
  background: var(--accent-glow);
}

.chat-header-actions {
  display: flex;
  gap: 8px;
}

.header-action-btn {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  width: 36px;
  height: 36px;
  border-radius: var(--radius-xs);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  transition: all var(--transition);
}

.header-action-btn:hover {
  color: var(--text-primary);
  border-color: var(--accent);
}

/* ── Chat Area ── */
.chat-area {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  scroll-behavior: smooth;
}

.chat-messages {
  max-width: 800px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.welcome-screen {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 40px;
}

.welcome-logo-box {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  margin-bottom: 24px;
  background: linear-gradient(135deg, var(--accent), #a78bfa);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36px;
  box-shadow: 0 0 40px var(--accent-glow);
}

.welcome-screen h2 {
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 12px;
  background: linear-gradient(135deg, var(--text-primary), var(--accent));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.welcome-screen p {
  color: var(--text-muted);
  font-size: 14px;
  max-width: 400px;
  line-height: 1.6;
}

/* ── Message ── */
.message {
  display: flex;
  gap: 12px;
  animation: messageIn 0.3s ease;
}

@keyframes messageIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message-avatar {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
}

.message.user .message-avatar {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
}

.message.assistant .message-avatar {
  background: linear-gradient(135deg, var(--accent), #a78bfa);
  color: white;
}

.message-content {
  flex: 1;
  min-width: 0;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.message-sender {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.message-time {
  font-size: 11px;
  color: var(--text-muted);
}

.message-body {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-secondary);
  word-break: break-word;
}

.message-body :deep(p) {
  margin-bottom: 12px;
}

.message-body :deep(p:last-child) {
  margin-bottom: 0;
}

.message-body :deep(code) {
  background: var(--bg-tertiary);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 13px;
  color: var(--accent);
  font-family: "SF Mono", "Fira Code", Consolas, monospace;
}

.message-body :deep(pre) {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-sm);
  padding: 16px;
  overflow-x: auto;
  margin: 12px 0;
  position: relative;
}

.message-body :deep(pre code) {
  background: none;
  padding: 0;
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.6;
}

.message-body :deep(blockquote) {
  border-left: 3px solid var(--accent);
  padding-left: 16px;
  margin: 12px 0;
  color: var(--text-muted);
  font-style: italic;
}

.message-body :deep(ul),
.message-body :deep(ol) {
  padding-left: 24px;
  margin: 8px 0;
}

.message-body :deep(li) {
  margin-bottom: 4px;
}

.message-body :deep(h1),
.message-body :deep(h2),
.message-body :deep(h3) {
  color: var(--text-primary);
  margin: 16px 0 8px;
}

.message-body :deep(h1) {
  font-size: 20px;
}

.message-body :deep(h2) {
  font-size: 18px;
}

.message-body :deep(h3) {
  font-size: 16px;
}

.message-body :deep(img) {
  max-width: 100%;
  border-radius: var(--radius-sm);
  margin: 8px 0;
  cursor: pointer;
  transition: transform var(--transition);
}

.message-body :deep(img:hover) {
  transform: scale(1.02);
}

.message-body :deep(strong) {
  color: var(--text-primary);
}

.message-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 12px 0;
}

.message-body :deep(th),
.message-body :deep(td) {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  text-align: left;
  font-size: 13px;
}

.message-body :deep(th) {
  background: var(--bg-tertiary);
  font-weight: 600;
  color: var(--text-primary);
}

.message-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--border-color);
  margin: 16px 0;
}

.message-body :deep(a) {
  color: var(--accent);
  text-decoration: none;
}

.message-body :deep(a:hover) {
  text-decoration: underline;
}

/* KaTeX */
.message-body :deep(.katex) {
  font-size: 1.05em;
  color: var(--text-primary);
}

.message-body :deep(.katex-display) {
  margin: 16px 0;
  padding: 12px 16px;
  background: rgba(28, 32, 48, 0.6);
  border-radius: var(--radius-sm);
  overflow-x: auto;
}

.message-body :deep(.katex-display > .katex) {
  color: var(--text-primary);
  text-align: center;
}

:deep(.katex .mord),
:deep(.katex .mbin),
:deep(.katex .mrel),
:deep(.katex .minner),
:deep(.katex .mop) {
  color: var(--text-primary);
}

/* Copy btn */
:deep(.copy-btn) {
  position: absolute;
  top: 8px;
  right: 8px;
  background: var(--bg-active);
  border: 1px solid var(--border-color);
  color: var(--text-muted);
  padding: 4px 10px;
  border-radius: var(--radius-xs);
  font-size: 11px;
  cursor: pointer;
  transition: all var(--transition);
  font-family: inherit;
}

:deep(.copy-btn:hover) {
  color: var(--text-primary);
  border-color: var(--accent);
}

/* Code lang badge */
:deep(.code-lang) {
  position: absolute;
  top: 8px;
  right: 8px;
  background: var(--bg-active);
  color: var(--text-muted);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  text-transform: uppercase;
}

/* Streaming indicator */
:deep(.streaming-indicator) {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: var(--accent);
  margin-top: 4px;
}

:deep(.streaming-dot) {
  width: 6px;
  height: 6px;
  background: var(--accent);
  border-radius: 50%;
  animation: dotPulse 1s ease-in-out infinite;
}

@keyframes dotPulse {
  0%,
  80%,
  100% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1);
  }
}

/* ── Message Actions ── */
.message-actions {
  display: flex;
  gap: 4px;
  margin-top: 8px;
  opacity: 0;
  transition: opacity var(--transition);
}

.message:hover .message-actions {
  opacity: 1;
}

.msg-action-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  transition: all var(--transition);
  font-family: inherit;
}

.msg-action-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* ── Thinking Block ── */
:deep(.thinking-block) {
  background: rgba(108, 140, 255, 0.06);
  border: 1px solid rgba(108, 140, 255, 0.15);
  border-radius: var(--radius-sm);
  padding: 12px 16px;
  margin-bottom: 12px;
}

:deep(.thinking-toggle) {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--accent);
  font-weight: 500;
  user-select: none;
}

:deep(.thinking-toggle .arrow) {
  transition: transform 0.2s ease;
  font-size: 12px;
  display: inline-block;
}

:deep(.thinking-toggle .arrow.open) {
  transform: rotate(90deg);
}

:deep(.thinking-content) {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 8px;
}

:deep(.thinking-content.hidden) {
  display: none;
}

/* ── Input Area ── */
.input-area {
  padding: 16px 24px 24px;
  background: var(--bg-primary);
  flex-shrink: 0;
}

.input-container {
  max-width: 800px;
  margin: 0 auto;
}

.input-box {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  padding: 16px;
  transition: all var(--transition);
}

.input-box:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.uploaded-files-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}

.uploaded-file-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px 4px 4px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  font-size: 12px;
  color: var(--text-secondary);
}

.uploaded-file-chip img {
  width: 28px;
  height: 28px;
  object-fit: cover;
  border-radius: 4px;
}

.uploaded-file-chip .file-icon {
  font-size: 14px;
}

.uploaded-file-chip .remove-file {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 14px;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition);
  line-height: 1;
}

.uploaded-file-chip .remove-file:hover {
  color: var(--danger);
}

.input-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.input-tools {
  display: flex;
  gap: 4px;
  padding-bottom: 2px;
}

.tool-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all var(--transition);
  position: relative;
}

.tool-btn:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.tool-btn .tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-active);
  color: var(--text-primary);
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--transition);
  margin-bottom: 6px;
}

.tool-btn:hover .tooltip {
  opacity: 1;
}

#messageInput {
  flex: 1;
  background: none;
  border: none;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  outline: none;
  min-height: 24px;
  max-height: 200px;
  font-family: inherit;
  padding: 4px 0;
}

#messageInput::placeholder {
  color: var(--text-muted);
}

.send-btn {
  width: 40px;
  height: 40px;
  background: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  transition: all var(--transition);
  flex-shrink: 0;
}

.send-btn:hover {
  background: var(--accent-hover);
  transform: scale(1.05);
}

.send-btn.stop-btn {
  background: var(--danger);
}

.input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding: 0 4px;
}

.thinking-option {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  user-select: none;
}

.thinking-option input[type="checkbox"] {
  display: none;
}

.thinking-switch {
  width: 36px;
  height: 20px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  position: relative;
  transition: all var(--transition);
}

.thinking-switch::after {
  content: "";
  position: absolute;
  width: 14px;
  height: 14px;
  background: var(--text-muted);
  border-radius: 50%;
  top: 2px;
  left: 2px;
  transition: all var(--transition);
}

.thinking-option input:checked + .thinking-switch {
  background: var(--accent-glow);
  border-color: var(--accent);
}

.thinking-option input:checked + .thinking-switch::after {
  background: var(--accent);
  transform: translateX(16px);
}

.thinking-label {
  font-size: 12px;
  color: var(--text-muted);
}

.input-hint {
  font-size: 11px;
  color: var(--text-muted);
}

/* ── Modal ── */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.modal-overlay.show {
  opacity: 1;
  pointer-events: auto;
}

.modal {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius);
  width: 520px;
  max-width: 90vw;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: var(--shadow);
  transform: scale(0.95);
  transition: transform 0.2s ease;
}

.modal-overlay.show .modal {
  transform: scale(1);
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  background: var(--bg-secondary);
  z-index: 1;
}

.modal-header h3 {
  font-size: 16px;
  font-weight: 600;
}

.modal-close {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 24px;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
  transition: color var(--transition);
}

.modal-close:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xs);
  color: var(--text-primary);
  font-size: 14px;
  font-family: inherit;
  outline: none;
  transition: all var(--transition);
}

.form-input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.form-input::placeholder {
  color: var(--text-muted);
}

.form-hint {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 6px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  position: sticky;
  bottom: 0;
  background: var(--bg-secondary);
}

.btn {
  padding: 8px 20px;
  border-radius: var(--radius-xs);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition);
  font-family: inherit;
  border: none;
}

.btn-primary {
  background: var(--accent);
  color: white;
}

.btn-primary:hover {
  background: var(--accent-hover);
}

.btn-secondary {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-secondary:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

/* ── Lightbox ── */
.lightbox {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
}

.lightbox.show {
  opacity: 1;
  pointer-events: auto;
}

.lightbox img {
  max-width: 90vw;
  max-height: 90vh;
  border-radius: var(--radius);
  object-fit: contain;
}

/* ── Empty State ── */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--text-muted);
}

.empty-state .empty-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  font-size: 14px;
  line-height: 1.6;
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 56px;
    transform: translateX(-100%);
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .menu-toggle {
    display: flex;
  }

  .chat-area {
    padding: 16px;
  }

  .input-area {
    padding: 12px 16px 20px;
  }
}
</style>
