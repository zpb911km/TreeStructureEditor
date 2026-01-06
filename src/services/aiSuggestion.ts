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
    position: { lineNumber: number; column: number }
  ): Promise<string | null> {
    try {
      const suggestion = await this.callAI(content, position);
      return suggestion;
    } catch (error) {
      console.error('[AISuggestion] Error in getSuggestion:', error);
      return null;
    }
  }

  /**
   * 调用 OpenAI 格式的 API
   */
  private async callAI(
    content: string,
    position: { lineNumber: number; column: number }
  ): Promise<string | null> {
    const lines = content.split('\n');
    const currentLine = lines[position.lineNumber - 1] || '';
    const beforeCursor = currentLine.substring(0, position.column - 1);

    // 构建提示词
    const prompt = this.buildPrompt(content, beforeCursor, position.lineNumber);

    const requestBody: CompletionRequest = {
      model: this.config.model,
      messages: [
        {
          role: 'system',
          content: '补全文本。只输出补全内容,无解释,无代码块标记。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 500, // 优化:降低到 150,通常足够短文本补全
      stream: false
    };

    const response = await fetch(`${this.config.baseURL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AISuggestion] API request failed', { status: response.status, errorText });
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data: CompletionResponse = await response.json();
    showSuccess(`获取AI建议成功, 消耗${data.usage?.total_tokens} tokens`);
    
    if (data.choices && data.choices.length > 0) {
      const suggestion = data.choices[0].message.content?.trim();
      // 清理建议文本
      let cleaned = this.cleanSuggestion(suggestion || '');
      // 删除suggestion前方重复的beforeCursor
      try {
        if (cleaned.startsWith(beforeCursor)) {
          cleaned = cleaned.replace(beforeCursor, '');
        }
      } catch (error) {
        console.error('[AISuggestion] Error cleaning suggestion:', error);
      }
      return cleaned;
    }
    return null;
  }

  /**
   * 构建提示词
   */
  private buildPrompt(content: string, beforeCursor: string, lineNumber: number): string {
    const lines = content.split('\n');
    const contextStart = Math.max(0, lineNumber - 10);
    const contextEnd = Math.min(lines.length, lineNumber + 5);

    const contextLines = lines.slice(contextStart, contextEnd).join('\n');

    // 优化:简化提示词格式
    return `${contextLines}\n\n补全: "${beforeCursor}"之后的文本。(注意开头不要重复${beforeCursor})`;
  }

  /**
   * 清理建议文本
   */
  private cleanSuggestion(suggestion: string): string {
    // // 移除常见的 markdown 代码块标记
    // suggestion = suggestion.replace(/^```\w*\n?/gm, '');
    // suggestion = suggestion.replace(/```$/gm, '');
    
    // // 移除引号
    // suggestion = suggestion.replace(/^["']|["']$/g, '');
    
    // // 移除开头的换行
    // suggestion = suggestion.replace(/^\n+/, '');
    
    return suggestion;
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

export function initAISuggestionService(config: AISuggestionConfig): AISuggestionService {
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