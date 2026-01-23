import { showSuccess } from "../utils/notifications";

interface AISuggestionConfig {
  apiKey: string;
  baseURL: string;
  model: string;
}

interface CompletionRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

interface CompletionResponse {
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

class AISuggestionService {
  private config: AISuggestionConfig;

  constructor(config: AISuggestionConfig) {
    this.config = config;
  }

  /**
   * 获取 AI 建议文本
   */
  async getSuggestion(
    content: string,
    position: { lineNumber: number; column: number },
  ): Promise<string | null> {
    console.log("[AISuggestion] getSuggestion called");
    try {
      const suggestion = await this.callAI(content, position);
      return suggestion;
    } catch (error) {
      console.error("[AISuggestion] Error in getSuggestion:", error);
      return null;
    }
  }

  /**
   * 调用 OpenAI 格式的 API
   */
  private async callAI(
    content: string,
    position: { lineNumber: number; column: number },
  ): Promise<string | null> {
    const lines = content.split("\n");
    const currentLine = lines[position.lineNumber - 1] || "";
    const beforeCursor = currentLine.substring(0, position.column - 1);

    // 构建提示词
    const prompt = this.buildPrompt(
      content,
      position.lineNumber,
      position.column,
    );

    const requestBody: CompletionRequest = {
      model: this.config.model,
      messages: [
        {
          role: "system",
          content: "补全文本。只输出补全内容,无解释,无代码块标记。",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 500,
      stream: false,
    };

    const response = await fetch(`${this.config.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AISuggestion] API request failed", {
        status: response.status,
        errorText,
      });
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data: CompletionResponse = await response.json();
    showSuccess(`获取AI建议成功, 消耗${data.usage?.total_tokens} tokens`);

    if (data.choices && data.choices.length > 0) {
      const suggestion = data.choices[0].message.content?.trim();
      let cleaned = suggestion || "";
      // 删除suggestion前方重复的beforeCursor
      try {
        if (cleaned.startsWith(beforeCursor)) {
          cleaned = cleaned.replace(beforeCursor, "");
        }
      } catch (error) {
        console.error("[AISuggestion] Error cleaning suggestion:", error);
      }
      return cleaned;
    }
    return null;
  }

  /**
   * 构建提示词
   */
  private buildPrompt(
    content: string,
    lineNumber: number,
    column: number,
  ): string {
    // 在content中插入"<光标位置>"作为提示
    const lines = content.split("\n");
    const beforeCursor =
      lines.slice(0, lineNumber - 1).join("\n") +
      "\n" +
      lines[lineNumber - 1].slice(0, column);
    const afterCursor =
      lines[lineNumber - 1].slice(column) +
      "\n" +
      lines.slice(lineNumber).join("\n");
    const shortBeforeCursor = beforeCursor.slice(
      beforeCursor.length - 500,
      beforeCursor.length,
    );
    const shortAfterCursor = afterCursor.slice(0, 500);
    // 优化:简化提示词格式
    return `${shortBeforeCursor}<光标位置>${shortAfterCursor}\n\n请在光标位置进行补全:`;
  }
  /**
   * 更新配置
   */
  updateConfig(config: Partial<AISuggestionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 重新加载配置
   */
  reloadConfig(config: AISuggestionConfig): void {
    this.config = config;
  }
}

// 导出单例实例
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
