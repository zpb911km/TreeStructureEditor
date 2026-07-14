<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from "vue";
import { showSuccess, showError } from "../utils/notifications";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import katex from "katex";
import "katex/dist/katex.min.css";

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
const fileUploadRef = ref<HTMLInputElement | null>(null);
const cameraUploadRef = ref<HTMLInputElement | null>(null);

// Tree context from EditorView (injected via window)
const treeContext = ref<{ fileName?: string | null }>({});

// ─── Computed ───────────────────────────────────────────
const currentConv = computed(() =>
  conversations.value.find((c) => c.id === currentConvId.value),
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
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings.value));
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
      JSON.stringify(conversations.value),
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
    localStorage.setItem(STORAGE_KEYS.CURRENT_CONV, currentConvId.value || "");
  } catch (e) {
    // ignore
  }
}

// ─── Utilities ──────────────────────────────────────────
function generateId(): string {
  return (
    "conv_" + Date.now() + "_" + Math.random().toString(36).substring(2, 11)
  );
}

function escapeHtml(str: string): string {
  if (!str) return "";
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
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

/** 从消息中提取纯文本预览（去除图片部分） */
function getMessagePreview(msg: ChatMessage): string {
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.content)) {
    const textParts = msg.content
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .filter(Boolean);
    const hasImg = msg.content.some((p) => p.type === "image_url");
    let preview = textParts.length > 0 ? textParts.join(" ") : "";
    if (hasImg) {
      const imgCount = msg.content.filter((p) => p.type === "image_url").length;
      preview = (preview ? preview + " " : "") + `[${imgCount}张图片]`;
    }
    return preview;
  }
  return "";
}

/** 获取消息中所有图片 URL */
function getImageUrls(msg: ChatMessage): string[] {
  if (!Array.isArray(msg.content)) return [];
  return msg.content
    .filter((p) => p.type === "image_url" && p.image_url?.url)
    .map((p) => p.image_url!.url);
}

/** 确保 API URL 指向正确的 /chat/completions 端点 */
function buildChatUrl(url: string): string {
  const trimmed = url.replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) return trimmed;
  return trimmed + "/chat/completions";
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

// ─── Settings ───────────────────────────────────────────
function openSettingsModal() {
  settingsModalOpen.value = true;
}

function closeSettingsModal() {
  settingsModalOpen.value = false;
}

function saveSettings() {
  saveSettingsToDisk();
  showSuccess("设置已保存");
  settingsModalOpen.value = false;
}

// ─── Send / API ─────────────────────────────────────────
function handleInputKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    if (isGenerating.value) stopGeneration();
    else sendMessage();
  }
}

function handleTextareaInput(event: Event) {
  const textarea = event.target as HTMLTextAreaElement;
  textarea.style.height = "auto";
  textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px";
}

async function sendMessage() {
  const text = messageInput.value.trim();
  if (!text && uploadedFiles.value.length === 0) return;
  if (!currentConvId.value) createNewChat();
  const conv = conversations.value.find((c) => c.id === currentConvId.value);
  if (!conv) return;

  const userMsg: ChatMessage = {
    id: generateId(),
    role: "user",
    content: text,
    timestamp: Date.now(),
  };
  conv.messages.push(userMsg);

  // Attach files
  if (uploadedFiles.value.length > 0) {
    const parts: ChatContentPart[] = [];
    if (text) parts.push({ type: "text", text });
    uploadedFiles.value.forEach((file) => {
      if (file.dataUrl) {
        parts.push({ type: "image_url", image_url: { url: file.dataUrl } });
      } else if (file.textContent) {
        parts.push({
          type: "text",
          text: `[Attached file: ${file.name}]\n\`\`\`\n${file.textContent}\n\`\`\``,
        });
      } else {
        parts.push({
          type: "text",
          text: `[Attached file: ${file.name} (${file.size} bytes)]`,
        });
      }
    });
    userMsg.content =
      parts.length === 1 && parts[0].type === "text"
        ? parts[0].text || ""
        : (parts as any);
  }

  // 自动生成标题：取第一条用户消息的前 30 个字符
  if (conv.messages.filter((m) => m.role === "user").length === 1) {
    const preview = getMessagePreview(userMsg);
    if (preview) {
      conv.title = preview.length > 30 ? preview.slice(0, 30) + "…" : preview;
    }
  }

  messageInput.value = "";
  uploadedFiles.value = [];
  scrollToBottom();

  await callAPI(conv);
}

async function callAPI(conv: Conversation) {
  console.log(
    `[AIChat] callAPI start | url=${settings.value.apiUrl} | model=${settings.value.model} | streaming=${settings.value.streaming}`,
  );
  isGenerating.value = true;
  abortController.value = new AbortController();

  const apiMessages: {
    role: string;
    content: any;
    reasoning_content?: string;
  }[] = [];
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

  const assistantMsg = reactive<ChatMessage>({
    id: generateId(),
    role: "assistant",
    content: "",
    thinking: "",
    timestamp: Date.now(),
    _isStreaming: true,
    _id: "thinking_" + Math.random().toString(36).substring(2, 11),
  });
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
      const apiUrl = buildChatUrl(settings.value.apiUrl);
      console.log(`[AIChat] resolved apiUrl=${apiUrl}`);
      await streamResponse(requestBody, assistantMsg, conv, apiUrl);
    } else {
      const apiUrl = buildChatUrl(settings.value.apiUrl);
      console.log(`[AIChat] resolved apiUrl=${apiUrl}`);
      await nonStreamResponse(requestBody, assistantMsg, conv, apiUrl);
    }
  } catch (error: any) {
    if (error.name === "AbortError") {
      console.log("[AIChat] Request aborted by user");
      assistantMsg.content =
        (assistantMsg.content as string) + "\n\n[已停止生成]";
    } else {
      console.error(`[AIChat] Request failed:`, {
        message: error.message,
        name: error.name,
        stack: error.stack?.slice(0, 300),
      });
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
  conv: Conversation,
  apiUrl: string,
) {
  console.log(`[AIChat] streamResponse >> POST ${apiUrl}`);
  console.log(
    `[AIChat] requestBody model=${requestBody.model}, messages=${requestBody.messages?.length ?? 0}`,
  );

  const response = await tauriFetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + settings.value.apiKey,
    },
    body: JSON.stringify(requestBody),
    signal: abortController.value?.signal,
  });

  console.log(
    `[AIChat] streamResponse << status=${response.status} ${response.statusText}`,
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      `[AIChat] streamResponse error body: ${errorText.slice(0, 500)}`,
    );
    throw new Error("HTTP " + response.status + ": " + errorText);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    console.error(
      "[AIChat] streamResponse: response.body is not readable (no getReader)",
    );
    throw new Error("Response body is not readable");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let fullContent = "";
  let fullThinking = "";
  let tokenCount = 0;

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
        if (data === "[DONE]") {
          console.log(
            `[AIChat] streamResponse received [DONE], total tokens=${tokenCount}`,
          );
          continue;
        }
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta;
          if (!delta) continue;
          if (delta.content) {
            fullContent += delta.content;
            assistantMsg.content = fullContent;
            tokenCount++;
            if (tokenCount % 20 === 0) {
              console.log(
                `[AIChat] streamResponse progress: ${tokenCount} tokens, contentLen=${fullContent.length}`,
              );
            }
          }
          if (delta.reasoning_content || delta.reasoning) {
            fullThinking += delta.reasoning_content || delta.reasoning || "";
            assistantMsg.thinking = fullThinking;
          }
          assistantMsg._isStreaming = true;
        } catch (e) {
          console.warn(
            `[AIChat] streamResponse parse error for line: ${data.slice(0, 80)}...`,
          );
        }
      }
    }
    console.log(
      `[AIChat] streamResponse done: ${tokenCount} tokens, contentLen=${fullContent.length}`,
    );
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
  conv: Conversation,
  apiUrl: string,
) {
  console.log(`[AIChat] nonStreamResponse >> POST ${apiUrl}`);
  console.log(
    `[AIChat] requestBody model=${requestBody.model}, messages=${requestBody.messages?.length ?? 0}`,
  );

  const response = await tauriFetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + settings.value.apiKey,
    },
    body: JSON.stringify(requestBody),
    signal: abortController.value?.signal,
  });

  console.log(
    `[AIChat] nonStreamResponse << status=${response.status} ${response.statusText}`,
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(
      `[AIChat] nonStreamResponse error body: ${errorText.slice(0, 500)}`,
    );
    throw new Error("HTTP " + response.status + ": " + errorText);
  }

  const data = await response.json();
  console.log(
    `[AIChat] nonStreamResponse data choices=${data.choices?.length ?? 0}`,
  );

  const choice = data.choices?.[0]?.message;
  if (choice) {
    assistantMsg.content = choice.content || "";
    assistantMsg.thinking = choice.reasoning_content || choice.reasoning || "";
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

/** 插入 AI 回复为树节点 */
function insertAsNode(content: string) {
  const insertFn = (window as any).__insertAINode__;
  if (typeof insertFn === "function") {
    insertFn(typeof content === "string" ? content : JSON.stringify(content));
    showSuccess("已插入到树中");
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(
      typeof content === "string" ? content : JSON.stringify(content),
    );
    showSuccess("已复制到剪贴板（请在编辑器中插入）");
  }
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
        file.name,
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

function handleCameraCapture(event: Event) {
  const input = event.target as HTMLInputElement;
  const files = Array.from(input.files || []);
  input.value = "";
  files.forEach((file) => {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedFiles.value.push({
          name: `📷 ${file.name}`,
          type: file.type,
          size: file.size,
          dataUrl: e.target?.result as string,
        });
      };
      reader.readAsDataURL(file);
    }
  });
}

// ─── Lightbox ───────────────────────────────────────────
function openLightbox(src: string) {
  lightboxSrc.value = src;
  lightboxOpen.value = true;
}

function closeLightbox() {
  lightboxOpen.value = false;
}

// ─── Markdown + KaTeX Rendering ─────────────────────────
/** 渲染 Markdown 为 HTML（含 KaTeX 公式） */
function renderMarkdown(text: string): string {
  if (!text) return "";

  // Step 1: 保护代码块内容不被后续处理破坏
  const codeBlocks: string[] = [];
  let processed = text.replace(
    /```(\w*)\n?([\s\S]*?)```/g,
    (_match, lang, code) => {
      const idx = codeBlocks.length;
      codeBlocks.push(
        `<pre><button class="copy-code">复制</button><code class="language-${lang || ""}">${escapeHtml(
          code.trim(),
        )}</code></pre>`,
      );
      return `%%CODEBLOCK_${idx}%%`;
    },
  );

  // Step 2: 保护内联代码
  const inlineCodes: string[] = [];
  processed = processed.replace(/`([^`]+)`/g, (_match, code) => {
    const idx = inlineCodes.length;
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`);
    return `%%INLINECODE_${idx}%%`;
  });

  // Step 3: KaTeX — display math ($$...$$)
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_match, math) => {
    try {
      return katex.renderToString(math.trim(), {
        displayMode: true,
        throwOnError: false,
      });
    } catch (e) {
      return `<div class="katex-error" style="color:red">公式错误: ${escapeHtml(
        math.trim(),
      )}</div>`;
    }
  });

  // Step 4: KaTeX — inline math ($...$)
  processed = processed.replace(
    /(?<!\$)\$([^$\n]+?)\$(?!\$)/g,
    (_match, math) => {
      try {
        return katex.renderToString(math.trim(), {
          displayMode: false,
          throwOnError: false,
        });
      } catch (e) {
        return `<span class="katex-error" style="color:red">$${escapeHtml(
          math.trim(),
        )}$</span>`;
      }
    },
  );

  // Step 5: 标准 Markdown 语法
  processed = processed
    // 标题
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    // 加粗 + 斜体
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // 行内图片
    .replace(
      /!\[([^\]]*)\]\(([^)]+)\)/g,
      '<img src="$2" alt="$1" class="msg-img" />',
    )
    // 链接
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>',
    )
    // 引用
    .replace(/^> (.+)$/gm, "<blockquote>$1</blockquote>")
    // 无序列表
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    // 水平线
    .replace(/^---$/gm, "<hr />")
    // 段落（双换行分隔）
    .replace(/\n\n/g, "</p><p>")
    // 换行
    .replace(/\n/g, "<br />");

  // Wrap in <p> if not already
  if (!processed.startsWith("<")) {
    processed = "<p>" + processed + "</p>";
  }

  // Step 6: 恢复代码块和内联代码
  processed = processed.replace(/%%CODEBLOCK_(\d+)%%/g, (_match, idx) => {
    return codeBlocks[parseInt(idx)] || "";
  });
  processed = processed.replace(/%%INLINECODE_(\d+)%%/g, (_match, idx) => {
    return inlineCodes[parseInt(idx)] || "";
  });

  return processed;
}

// ─── Event Delegation ───────────────────────────────────
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

  // Insert as node
  const insertBtn = target.closest(".insert-node");
  if (insertBtn) {
    const idx = parseInt(insertBtn.getAttribute("data-idx") || "0");
    const conv = conversations.value.find((c) => c.id === currentConvId.value);
    if (conv && conv.messages[idx]) {
      const msg = conv.messages[idx];
      const text =
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content);
      insertAsNode(text);
    }
    return;
  }

  // Copy code
  const codeCopyBtn = target.closest(".copy-code");
  if (codeCopyBtn) {
    const pre = codeCopyBtn.parentElement;
    const code = pre?.querySelector("code");
    if (code) {
      navigator.clipboard.writeText(code.textContent || "").then(() => {
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

// ─── Lifecycle ──────────────────────────────────────────
onMounted(() => {
  loadAllState();

  // Read tree context from window (injected by EditorView)
  treeContext.value = (window as any).__tree_context__ || {};

  // Ensure at least one conversation exists
  if (!currentConvId.value && conversations.value.length === 0) {
    createNewChat();
  } else if (currentConvId.value) {
    const found = conversations.value.find((c) => c.id === currentConvId.value);
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
    class="h-full flex flex-col bg-gray-50 dark:bg-slate-900 text-gray-800 dark:text-slate-200 overflow-hidden pb-20"
    @click="handleMessageClick"
  >
    <!-- Tree Context Bar -->
    <div
      v-if="treeContext.fileName"
      class="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 text-sm text-blue-700 dark:text-blue-300 flex-shrink-0"
    >
      <svg
        class="w-4 h-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
        />
      </svg>
      <span class="font-medium">当前文件：</span>
      <span class="font-mono text-xs">{{ treeContext.fileName }}</span>
      <span class="ml-auto text-xs text-blue-500 dark:text-blue-400"
        >AI 回复可插入为树节点</span
      >
    </div>

    <div class="flex flex-1 w-full overflow-hidden">
      <!-- Sidebar Overlay (mobile) -->
      <div
        v-if="sidebarOpen"
        class="fixed inset-0 bg-black/40 z-30 md:hidden"
        @click="closeSidebarMobile"
      ></div>

      <!-- Sidebar -->
      <aside
        class="w-72 flex-shrink-0 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col transition-all duration-300 z-40 fixed md:static inset-y-0 left-0 pt-16 md:pt-0 md:translate-x-0"
        :class="
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        "
      >
        <div class="p-4 border-b border-gray-200 dark:border-slate-700">
          <h2
            class="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2"
          >
            <svg
              class="w-5 h-5 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
            AI 对话
          </h2>
        </div>

        <button
          class="mx-4 mt-3 mb-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
          @click="createNewChat"
        >
          <svg
            class="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M12 5v14m7-7H5"
            />
          </svg>
          新建对话
        </button>

        <div class="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          <div
            v-if="conversations.length === 0"
            class="text-center py-12 text-gray-400 dark:text-slate-500"
          >
            <div class="text-3xl mb-2">💬</div>
            <p class="text-sm">暂无对话</p>
          </div>
          <div
            v-for="conv in conversations"
            :key="conv.id"
            class="group flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors text-sm"
            :class="
              conv.id === currentConvId
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'hover:bg-gray-100 dark:hover:bg-slate-700/50 text-gray-700 dark:text-slate-300'
            "
            @click="switchConversation(conv.id)"
          >
            <span class="text-base flex-shrink-0 mt-0.5">💬</span>
            <div class="flex-1 min-w-0">
              <div class="truncate font-medium">{{ conv.title || "新对话" }}</div>
              <div
                v-if="conv.messages.length > 0"
                class="flex flex-wrap items-center gap-1 mt-1"
              >
                <template v-for="imgUrl in getImageUrls(conv.messages[conv.messages.length - 1]).slice(0, 3)" :key="imgUrl">
                  <img
                    :src="imgUrl"
                    class="w-6 h-6 rounded object-cover border border-gray-300 dark:border-slate-600 flex-shrink-0 cursor-pointer"
                    @click.stop="openLightbox(imgUrl)"
                    alt="缩略图"
                  />
                </template>
                <span class="text-xs text-gray-400 dark:text-slate-500 truncate flex-1">
                  {{ getMessagePreview(conv.messages[conv.messages.length - 1]).slice(0, 50) }}
                </span>
              </div>
            </div>
            <div
              class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            >
              <button
                class="p-1 rounded hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-400 hover:text-gray-600 dark:hover:text-slate-200"
                title="重命名"
                @click.stop="renameConversation(conv.id)"
              >
                ✎
              </button>
              <button
                class="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500"
                title="删除"
                @click.stop="deleteConversation(conv.id)"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        <div class="p-4 border-t border-gray-200 dark:border-slate-700">
          <button
            class="w-full px-4 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-600 dark:text-slate-300 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
            @click="openSettingsModal"
          >
            <svg
              class="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            设置
          </button>
        </div>
      </aside>

      <!-- Main Chat Area -->
      <main class="flex-1 flex flex-col min-w-0">
        <!-- Chat Header -->
        <div
          class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50"
        >
          <div class="flex items-center gap-3">
            <button
              class="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-500 dark:text-slate-400"
              @click="toggleSidebar"
            >
              <svg
                class="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div
              v-if="currentConv"
              class="text-sm text-gray-500 dark:text-slate-400"
            >
              {{ currentConv.messages.length }} 条消息
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span
              class="px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800"
            >
              {{ currentModelDisplay }}
            </span>
            <button
              v-if="currentConv && currentConv.messages.length > 0"
              class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
              title="清空对话"
              @click="clearCurrentChat"
            >
              <svg
                class="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          </div>
        </div>

        <!-- Messages -->
        <div class="chat-area flex-1 overflow-y-auto px-4 py-6 scroll-smooth">
          <div
            v-if="!currentConv || currentConv.messages.length === 0"
            class="flex flex-col items-center justify-center h-full text-center px-6"
          >
            <div
              class="w-20 h-20 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-3xl mb-4"
            >
              💬
            </div>
            <h2
              class="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-2"
            >
              AI 助手
            </h2>
            <p
              class="text-sm text-gray-400 dark:text-slate-500 max-w-md leading-relaxed"
            >
              在下方输入问题，AI 可以帮你<br />
              生成内容、解答疑问、编写代码...
            </p>
          </div>

          <div
            v-else
            class="mx-auto space-y-6"
            style="max-width: min(900px, 100%)"
          >
            <div
              v-for="(msg, idx) in currentConv.messages"
              :key="msg.id || idx"
              class="group"
            >
              <!-- User Message -->
              <div v-if="msg.role === 'user'" class="flex gap-3 items-start">
                <div
                  class="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white text-sm font-semibold shadow-sm"
                >
                  U
                </div>
                <div class="flex-1 min-w-0">
                  <div
                    class="px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 text-sm leading-relaxed whitespace-pre-wrap break-words"
                  >
                    <template v-if="typeof msg.content === 'string'">
                      {{ msg.content }}
                    </template>
                    <template v-else-if="Array.isArray(msg.content)">
                      <template v-for="(part, pi) in msg.content" :key="pi">
                        <img
                          v-if="part.type === 'image_url'"
                          :src="part.image_url?.url"
                          class="msg-img inline-block max-w-[160px] max-h-[160px] rounded-lg border border-emerald-300 dark:border-emerald-600 cursor-pointer my-1 object-cover"
                          @click.stop="openLightbox(part.image_url?.url || '')"
                          alt="用户上传图片"
                        />
                        <span v-else-if="part.type === 'text'">{{ part.text }}</span>
                      </template>
                    </template>
                  </div>
                </div>
              </div>

              <!-- Assistant Message -->
              <div v-else class="flex gap-3 items-start">
                <div
                  class="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold shadow-sm"
                >
                  AI
                </div>
                <div class="flex-1 min-w-0">
                  <!-- Thinking block -->
                  <div
                    v-if="msg.thinking"
                    class="thinking-block mb-2 rounded-lg bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 overflow-hidden"
                  >
                    <div
                      class="thinking-toggle flex items-center gap-2 px-3 py-2 cursor-pointer select-none text-xs font-medium text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700/50 transition-colors"
                    >
                      <span
                        class="arrow inline-block transition-transform duration-200"
                        >▶</span
                      >
                      <span>深度思考</span>
                      <span class="text-gray-400 dark:text-slate-500">·</span>
                      <span class="text-gray-400 dark:text-slate-500"
                        >{{ msg.thinking.length }} 字符</span
                      >
                    </div>
                    <div
                      class="thinking-content hidden px-3 pb-3 text-xs text-gray-500 dark:text-slate-400 leading-relaxed max-h-48 overflow-y-auto"
                    >
                      {{ msg.thinking }}
                    </div>
                  </div>

                  <!-- Main content -->
                  <div
                    class="px-4 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700 text-gray-800 dark:text-slate-200 text-sm leading-relaxed markdown-body"
                    v-html="
                      renderMarkdown(
                        typeof msg.content === 'string'
                          ? msg.content
                          : Array.isArray(msg.content)
                            ? msg.content
                                .map((p) =>
                                  p.type === 'text' ? p.text : '[图片]',
                                )
                                .join('\n')
                            : '',
                      )
                    "
                  ></div>

                  <!-- Streaming indicator -->
                  <div
                    v-if="msg._isStreaming"
                    class="flex items-center gap-1.5 mt-1.5 px-1"
                  >
                    <span
                      class="streaming-dot w-1.5 h-1.5 bg-blue-500 rounded-full"
                    ></span>
                    <span class="text-xs text-blue-500">生成中...</span>
                  </div>

                  <!-- Message actions -->
                  <div
                    class="message-actions flex gap-1 mt-1.5 px-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <button
                      class="copy-msg msg-action-btn px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      :data-idx="idx"
                      title="复制"
                    >
                      复制
                    </button>
                    <button
                      class="regen-msg msg-action-btn px-2 py-1 rounded text-xs text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
                      :data-idx="idx"
                      title="重新生成"
                    >
                      重新生成
                    </button>
                    <button
                      class="del-msg msg-action-btn px-2 py-1 rounded text-xs text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      :data-idx="idx"
                      title="删除"
                    >
                      删除
                    </button>
                    <button
                      class="insert-node msg-action-btn px-2 py-1 rounded text-xs text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                      :data-idx="idx"
                      title="插入为树节点"
                    >
                      📄 插入为节点
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Input Area -->
        <div
          class="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50"
        >
          <div style="max-width: min(900px, 100%)" class="mx-auto">
            <!-- Uploaded files preview -->
            <div
              v-if="uploadedFiles.length > 0"
              class="flex flex-wrap gap-2 mb-2"
            >
              <div
                v-for="(file, fidx) in uploadedFiles"
                :key="fidx"
                class="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-xs text-gray-600 dark:text-slate-300"
              >
                <template v-if="file.dataUrl">
                  <img
                    :src="file.dataUrl"
                    class="w-5 h-5 rounded object-cover"
                  />
                </template>
                <template v-else>
                  <span class="text-base">📎</span>
                </template>
                <span class="max-w-[120px] truncate">{{ file.name }}</span>
                <button
                  class="ml-1 text-gray-400 hover:text-red-500 transition-colors"
                  @click="removeUploadedFile(fidx)"
                >
                  ✕
                </button>
              </div>
            </div>

            <div
              class="flex items-end gap-2 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-xl px-4 py-2 focus-within:border-blue-400 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/30 transition-all"
            >
              <button
                class="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                title="上传文件"
                @click="fileUploadRef?.click()"
              >
                <svg
                  class="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
              </button>
              <input
                ref="fileUploadRef"
                type="file"
                multiple
                accept="image/*,.txt,.md,.csv,.json,.js,.ts,.py,.html,.css,.xml,.yml,.yaml,.log,.sh,.c,.cpp,.h,.java,.go,.rs,.rb,.php,.sql"
                class="hidden"
                @change="handleFileUpload"
              />
              <button
                class="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
                title="拍照"
                @click="cameraUploadRef?.click()"
              >
                <svg
                  class="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
              <input
                ref="cameraUploadRef"
                type="file"
                accept="image/*"
                capture="environment"
                class="hidden"
                @change="handleCameraCapture"
              />

              <textarea
                id="messageInput"
                v-model="messageInput"
                placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
                rows="1"
                class="flex-1 bg-transparent border-none outline-none resize-none text-sm text-gray-800 dark:text-slate-200 placeholder-gray-400 dark:placeholder-slate-500 py-1.5 max-h-[200px]"
                @keydown="handleInputKeydown"
                @input="handleTextareaInput"
              ></textarea>

              <button
                class="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all"
                :class="
                  isGenerating
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                "
                @click="isGenerating ? stopGeneration() : sendMessage()"
              >
                <svg
                  v-if="!isGenerating"
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2.5"
                    d="M5 12h14M12 5l7 7-7 7"
                  />
                </svg>
                <svg
                  v-else
                  class="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <rect
                    x="6"
                    y="6"
                    width="12"
                    height="12"
                    rx="2"
                    stroke-width="2"
                  />
                </svg>
              </button>
            </div>

            <div class="flex items-center justify-between mt-2 px-1">
              <label class="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  v-model="settings.thinking"
                  @change="saveSettingsToDisk"
                  class="sr-only peer"
                />
                <div
                  class="w-8 h-4 bg-gray-300 dark:bg-slate-600 rounded-full peer-checked:bg-blue-500 relative transition-colors after:content-[''] after:absolute after:w-3 after:h-3 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 after:transition-all peer-checked:after:translate-x-4"
                ></div>
                <span class="text-xs text-gray-500 dark:text-slate-400"
                  >🧠 深度思考</span
                >
              </label>
              <span class="text-xs text-gray-400 dark:text-slate-500"
                >Enter 发送 · Shift+Enter 换行</span
              >
            </div>
          </div>
        </div>
      </main>
    </div>

    <!-- Settings Modal -->
    <div
      class="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center transition-opacity"
      :class="
        settingsModalOpen
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none'
      "
      @click="closeSettingsModal"
    >
      <div
        class="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto border border-gray-200 dark:border-slate-700"
        @click.stop
      >
        <div
          class="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800 z-10"
        >
          <h3
            class="text-lg font-semibold text-gray-800 dark:text-white flex items-center gap-2"
          >
            <svg
              class="w-5 h-5 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            设置
          </h3>
          <button
            class="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
            @click="closeSettingsModal"
          >
            ✕
          </button>
        </div>

        <div class="px-6 py-4 space-y-4">
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5"
              >API 地址</label
            >
            <input
              v-model="settings.apiUrl"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="https://api.openai.com/v1/chat/completions"
            />
            <p class="text-xs text-gray-400 dark:text-slate-500 mt-1">
              支持 OpenAI 兼容的 API 端点
            </p>
          </div>
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5"
              >API Key</label
            >
            <input
              v-model="settings.apiKey"
              type="password"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="sk-..."
            />
          </div>
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5"
              >模型名称</label
            >
            <input
              v-model="settings.model"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
              placeholder="gpt-3.5-turbo"
            />
            <p class="text-xs text-gray-400 dark:text-slate-500 mt-1">
              例如: gpt-3.5-turbo, gpt-4, claude-3-sonnet 等
            </p>
          </div>
          <div>
            <label
              class="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5"
              >系统提示词</label
            >
            <textarea
              v-model="settings.systemPrompt"
              rows="3"
              class="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
              placeholder="你是一个有用的 AI 助手..."
            ></textarea>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-gray-700 dark:text-slate-300"
              >流式输出</span
            >
            <label class="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                v-model="settings.streaming"
                class="sr-only peer"
              />
              <div
                class="w-10 h-5 bg-gray-300 dark:bg-slate-600 rounded-full peer-checked:bg-blue-500 relative transition-colors after:content-[''] after:absolute after:w-4 after:h-4 after:bg-white after:rounded-full after:top-0.5 after:left-0.5 after:transition-all peer-checked:after:translate-x-5"
              ></div>
            </label>
          </div>
        </div>

        <div
          class="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-slate-700"
        >
          <button
            class="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors"
            @click="closeSettingsModal"
          >
            取消
          </button>
          <button
            class="px-4 py-2 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition-colors"
            @click="saveSettings"
          >
            保存设置
          </button>
        </div>
      </div>
    </div>

    <!-- Lightbox -->
    <div
      class="fixed inset-0 bg-black/80 z-50 flex items-center justify-center transition-opacity"
      :class="
        lightboxOpen
          ? 'opacity-100 pointer-events-auto'
          : 'opacity-0 pointer-events-none'
      "
      @click="closeLightbox"
    >
      <img
        :src="lightboxSrc"
        alt=""
        class="max-w-[90vw] max-h-[90vh] object-contain rounded-lg"
      />
    </div>
  </div>
</template>

<style scoped>
/* ─── Streaming dot animation ─── */
.streaming-dot {
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

/* ─── Thinking arrow transition ─── */
.arrow.open {
  transform: rotate(90deg);
}

/* ─── Markdown body styling ─── */
.markdown-body h1 {
  font-size: 1.4rem;
  font-weight: 600;
  margin: 0.8rem 0 0.4rem;
}
.markdown-body h2 {
  font-size: 1.2rem;
  font-weight: 600;
  margin: 0.6rem 0 0.3rem;
}
.markdown-body h3 {
  font-size: 1.05rem;
  font-weight: 600;
  margin: 0.5rem 0 0.25rem;
}
.markdown-body p {
  margin: 0.5rem 0;
  line-height: 1.7;
}
.markdown-body strong {
  font-weight: 600;
}
.markdown-body em {
  font-style: italic;
}
.markdown-body ul {
  margin: 0.4rem 0;
  padding-left: 1.2rem;
}
.markdown-body li {
  margin: 0.2rem 0;
  line-height: 1.6;
}
.markdown-body blockquote {
  border-left: 3px solid #93c5fd;
  padding-left: 0.8rem;
  margin: 0.6rem 0;
  color: #64748b;
  font-style: italic;
}
.dark .markdown-body blockquote {
  border-left-color: #3b82f6;
  color: #94a3b8;
}
.markdown-body hr {
  margin: 1rem 0;
  border: 0;
  border-top: 1px solid #e2e8f0;
}
.dark .markdown-body hr {
  border-top-color: #334155;
}
.markdown-body a {
  color: #3b82f6;
  text-decoration: underline;
}
.markdown-body a:hover {
  color: #1d4ed8;
}
.markdown-body pre {
  background: #1e293b;
  color: #e2e8f0;
  padding: 0.8rem 1rem;
  border-radius: 8px;
  overflow-x: auto;
  font-size: 0.8rem;
  line-height: 1.5;
  margin: 0.6rem 0;
  position: relative;
}
.markdown-body code {
  font-family: "JetBrains Mono", "Fira Code", "Consolas", monospace;
  font-size: 0.8rem;
}
.markdown-body :not(pre) > code {
  background: #f1f5f9;
  color: #1e293b;
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-size: 0.75rem;
}
.dark .markdown-body :not(pre) > code {
  background: #334155;
  color: #e2e8f0;
}
.markdown-body .msg-img {
  max-width: 100%;
  border-radius: 8px;
  margin: 0.4rem 0;
  cursor: zoom-in;
}
.markdown-body .katex-display {
  margin: 0.6rem 0;
  overflow-x: auto;
  overflow-y: hidden;
}
.markdown-body .katex-error {
  color: #ef4444;
  font-size: 0.85rem;
}
.dark .markdown-body .katex {
  color: #e2e8f0;
}
.dark .markdown-body .katex-display .katex {
  color: #e2e8f0;
}

/* ─── Copy code button ─── */
.copy-code {
  position: absolute;
  top: 6px;
  right: 6px;
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: #94a3b8;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0;
}
pre:hover .copy-code {
  opacity: 1;
}
.copy-code:hover {
  background: rgba(255, 255, 255, 0.2);
  color: #e2e8f0;
}
</style>
