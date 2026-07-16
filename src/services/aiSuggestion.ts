import { showSuccess } from "../utils/notifications";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";

interface AISuggestionConfig {
  apiKey: string;
  baseURL: string;
  model: string;
  streamEnabled?: boolean;
  fimEnabled?: boolean;
  maxTokens?: number;
  temperature?: number;
}

interface ChatCompletionRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface CompletionResponse {
  choices: Array<{
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/** SSE 解析出的单条数据 */
interface SSEToken {
  content: string;
  finishReason: string | null;
}

// ─── SSE 流式解析器 ───────────────────────────────────────────────

async function* parseSSEStream(
  response: Response,
  abortSignal?: AbortSignal,
): AsyncGenerator<SSEToken> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Response body is not readable");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      if (abortSignal?.aborted) break;

      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      // 最后一段可能不完整，留在 buffer 中
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) continue; // 注释行 / 空行
        if (trimmed === "data: [DONE]") return;

        if (trimmed.startsWith("data: ")) {
          const jsonStr = trimmed.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;
            const finishReason = parsed.choices?.[0]?.finish_reason ?? null;

            if (delta?.content !== undefined || finishReason) {
              yield { content: delta?.content ?? "", finishReason };
            }
          } catch {
            // 非 JSON 行（如 ping），静默跳过
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

// ─── Service ─────────────────────────────────────────────────────

class AISuggestionService {
  private config: AISuggestionConfig;

  constructor(config: AISuggestionConfig) {
    this.config = {
      streamEnabled: false,
      fimEnabled: false,
      maxTokens: 500,
      temperature: 0.3,
      ...config,
    };
  }

  // ── 公开 API ──────────────────────────────────────────────

  /**
   * 获取 AI 建议（非流式，向后兼容）
   */
  async getSuggestion(
    content: string,
    position: { lineNumber: number; column: number },
    abortSignal?: AbortSignal,
  ): Promise<string | null> {
    try {
      const text = await this.callAI(content, position, abortSignal);
      return text;
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        console.log("[AISuggestion] Request aborted");
        return null;
      }
      console.error("[AISuggestion] Error in getSuggestion:", error);
      return null;
    }
  }

  /**
   * 获取流式 AI 建议（逐 token 回调）
   * @returns 最终完整文本，或 null（出错/取消）
   */
  async getSuggestionStream(
    content: string,
    position: { lineNumber: number; column: number },
    onToken: (text: string) => void,
    abortSignal?: AbortSignal,
  ): Promise<string | null> {
    if (!this.config.streamEnabled) {
      // 降级为非流式
      const result = await this.getSuggestion(content, position, abortSignal);
      if (result) onToken(result);
      return result;
    }

    try {
      const ctx = this.buildFIMContext(content, position);

      const url = `${this.config.baseURL}/chat/completions`;
      const body = this.buildChatBody(ctx.chatPrompt, true);

      const response = await tauriFetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({ ...body, stream: true }),
        signal: abortSignal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `API request failed: ${response.status} - ${errorText}`,
        );
      }

      let accumulated = "";

      for await (const token of parseSSEStream(response, abortSignal)) {
        accumulated += token.content;

        // 流式阶段：仅清理明显的前置重复，避免幽灵文本闪烁
        const cleaned = this.dedupeContext(accumulated, ctx.beforeCursor, "");
        onToken(cleaned);

        if (token.finishReason) {
          break;
        }
      }

      // 流结束：执行完整去重（前后文一起检查）
      const final = this.dedupeContext(
        accumulated,
        ctx.beforeCursor,
        ctx.suffix,
      );
      return final || null;
    } catch (error) {
      if ((error as Error)?.name === "AbortError") {
        console.log("[AISuggestion] Stream aborted");
        return null;
      }
      console.error("[AISuggestion] Error in getSuggestionStream:", error);
      return null;
    }
  }

  // ── 内部调用 ──────────────────────────────────────────────

  private async callAI(
    content: string,
    position: { lineNumber: number; column: number },
    abortSignal?: AbortSignal,
  ): Promise<string | null> {
    const ctx = this.buildFIMContext(content, position);

    const url = `${this.config.baseURL}/chat/completions`;
    const body = this.buildChatBody(ctx.chatPrompt, false);

    const response = await tauriFetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
      signal: abortSignal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data: CompletionResponse = await response.json();
    showSuccess(
      `获取AI建议成功, 消耗${data.usage?.total_tokens ?? "?"} tokens`,
    );

    if (data.choices?.[0]?.message?.content) {
      let cleaned = data.choices[0].message.content.trim();
      cleaned = this.dedupeContext(cleaned, ctx.beforeCursor, ctx.suffix);
      return cleaned;
    }
    return null;
  }

  // ── 请求体构建 ────────────────────────────────────────────

  private buildChatBody(
    prompt: string,
    stream: boolean,
  ): ChatCompletionRequest {
    return {
      model: this.config.model,
      messages: [
        {
          role: "system",
          content: "补全文本。只输出补全内容,无解释,无代码块标记。",
        },
        { role: "user", content: prompt },
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      stream,
    };
  }

  private buildFIMContext(
    content: string,
    position: { lineNumber: number; column: number },
  ) {
    const lines = content.split("\n");
    const beforeCursor =
      lines.slice(0, position.lineNumber - 1).join("\n") +
      "\n" +
      lines[position.lineNumber - 1].slice(0, position.column - 1);
    const afterCursor =
      lines[position.lineNumber - 1].slice(position.column - 1) +
      "\n" +
      lines.slice(position.lineNumber).join("\n");

    // 截取前后文范围，避免超长
    const shortBefore = beforeCursor.slice(-800);
    const shortAfter = afterCursor.slice(0, 800);

    const isAtEnd = shortAfter.trim().length === 0;

    let chatPrompt: string;
    if (isAtEnd) {
      // ── 文末续写：简单直接 ──
      chatPrompt = `以下文本需要续写。从结尾处继续，只输出续写内容：

${shortBefore}
---
`;
    } else {
      // ── 中间插入：明确告知不要重复前后文 ──
      chatPrompt = `在"<INSERT>"位置插入内容，使前后连贯。

--- 前面的内容 ---
${shortBefore}
<INSERT>
${shortAfter}
--- 后面的内容 ---

规则：
1. 只输出在 <INSERT> 位置应该插入的新内容
2. 不要重复"前面的内容"或"后面的内容"中的任何文字
3. 插入后整体应读起来自然连贯
`;
    }

    return {
      chatPrompt,
      fimPrompt: shortBefore,
      suffix: shortAfter,
      beforeCursor,
      isAtEnd,
    };
  }

  // ── 工具 ──────────────────────────────────────────────────

  /** 去除 AI 输出中可能重复的上下文（前置去重 + 后置去重） */
  private dedupeContext(
    text: string,
    beforeCursor: string,
    afterCursor: string,
  ): string {
    if (!text) return text;
    let result = text;

    // ── 前置去重：AI 有时复述 beforeCursor 结尾来衔接 ──
    // 滑动窗口匹配 result 开头与 beforeCursor 末尾的最长公共子串
    const beforeNorm = beforeCursor.replace(/\s+$/, "");
    let bestLen = 0;
    for (let i = 1; i <= Math.min(beforeNorm.length, result.length); i++) {
      const suffix = beforeNorm.slice(-i);
      if (result.startsWith(suffix)) bestLen = i;
    }
    if (bestLen > 10) result = result.slice(bestLen);

    // ── 后置去重：AI 有时在末尾重复 afterCursor 开头 ──
    if (afterCursor) {
      const afterNorm = afterCursor.replace(/^\s+/, "");
      bestLen = 0;
      for (let i = 1; i <= Math.min(afterNorm.length, result.length); i++) {
        const prefix = afterNorm.slice(0, i);
        if (result.endsWith(prefix)) bestLen = i;
      }
      if (bestLen > 10) result = result.slice(0, -bestLen);
    }

    return result;
  }

  // ── 配置更新 ──────────────────────────────────────────────

  updateConfig(config: Partial<AISuggestionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  reloadConfig(config: AISuggestionConfig): void {
    this.config = {
      streamEnabled: false,
      fimEnabled: false,
      maxTokens: 500,
      temperature: 0.3,
      ...config,
    };
  }
}

// ── 单例 ────────────────────────────────────────────────────────

let aiSuggestionService: AISuggestionService | null = null;

export function initAISuggestionService(
  config: AISuggestionConfig,
): AISuggestionService {
  if (!aiSuggestionService) {
    aiSuggestionService = new AISuggestionService(config);
  } else {
    aiSuggestionService.updateConfig(config);
  }
  return aiSuggestionService;
}

export function getAISuggestionService(): AISuggestionService | null {
  return aiSuggestionService;
}

export function reloadAISuggestionService(config: AISuggestionConfig): void {
  if (aiSuggestionService) {
    aiSuggestionService.reloadConfig(config);
  } else {
    aiSuggestionService = new AISuggestionService(config);
  }
}

export type { AISuggestionConfig };
