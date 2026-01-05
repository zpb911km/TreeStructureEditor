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
  private cache: Map<string, string> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5分钟缓存

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
    console.log('[AISuggestion] getSuggestion called', { position, contentLength: content.length });
    const cacheKey = this.getCacheKey(content, position);
    const cached = this.cache.get(cacheKey);

    if (cached) {
      console.log('[AISuggestion] Returning cached suggestion', { cacheKey });
      return cached;
    }

    try {
      console.log('[AISuggestion] Calling AI API...', { content });
      const suggestion = await this.callAI(content, position);
      console.log('[AISuggestion] AI API response received', { suggestion: suggestion || 'null' });

      if (suggestion) {
        this.cache.set(cacheKey, suggestion);
        // 清理过期缓存
        setTimeout(() => this.cache.delete(cacheKey), this.cacheTimeout);
        console.log('[AISuggestion] Suggestion cached', { cacheKey });
      }

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
    console.log('[AISuggestion] callAI started', { position });
    const lines = content.split('\n');
    const currentLine = lines[position.lineNumber - 1] || '';
    const beforeCursor = currentLine.substring(0, position.column - 1);
    console.log('[AISuggestion] Context extracted', { currentLine, beforeCursor });

    // 构建提示词
    const prompt = this.buildPrompt(content, beforeCursor, position.lineNumber);
    console.log('[AISuggestion] Prompt built', { prompt: prompt });

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

    console.log('[AISuggestion] API response status', { status: response.status, ok: response.ok });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[AISuggestion] API request failed', { status: response.status, errorText });
      throw new Error(`API request failed: ${response.status} - ${errorText}`);
    }

    const data: CompletionResponse = await response.json();
    showSuccess(`获取AI建议成功, 消耗${data.usage?.total_tokens} tokens`);
    console.log('[AISuggestion] API response parsed', { data: data });
    
    if (data.choices && data.choices.length > 0) {
      const suggestion = data.choices[0].message.content?.trim();
      console.log('[AISuggestion] Raw suggestion received', { suggestion });

      // 清理建议文本
      let cleaned = this.cleanSuggestion(suggestion || '');
      // 删除suggestion前方重复的beforeCursor
      if (beforeCursor.endsWith(cleaned)) {
        cleaned = cleaned.substring(beforeCursor.length);
      }
      console.log('[AISuggestion] Cleaned suggestion', { cleaned });
      return cleaned;
    }

    console.warn('[AISuggestion] No choices in API response');
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
    return `${contextLines}\n\n补全: "${beforeCursor}"之后的文本:`;
  }

  /**
   * 清理建议文本
   */
  private cleanSuggestion(suggestion: string): string {
    // 移除常见的 markdown 代码块标记
    suggestion = suggestion.replace(/^```\w*\n?/gm, '');
    suggestion = suggestion.replace(/```$/gm, '');
    
    // 移除引号
    suggestion = suggestion.replace(/^["']|["']$/g, '');
    
    // 移除开头的换行
    suggestion = suggestion.replace(/^\n+/, '');
    
    return suggestion;
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(content: string, position: { lineNumber: number; column: number }): string {
    // 优化:只使用光标前 100 个字符,减少缓存键长度
    const lines = content.split('\n');
    const currentLine = lines[position.lineNumber - 1] || '';
    const beforeCursor = currentLine.substring(0, Math.min(position.column - 1, 200));

    // 优化:使用哈希或截断来避免过长的键
    return `${position.lineNumber}:${position.column}:${beforeCursor}`;
  }

  /**
   * 清空缓存
   */
  clearCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log('[AISuggestion] Cache cleared', { previousSize: size });
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<AISuggestionConfig>): void {
    console.log('[AISuggestion] Updating config', { oldConfig: this.config, newConfig: config });
    this.config = { ...this.config, ...config };
    console.log('[AISuggestion] Config updated', { newConfig: this.config });
  }
}

// 导出单例实例
let aiSuggestionService: AISuggestionService | null = null;

export function initAISuggestionService(config: AISuggestionConfig): AISuggestionService {
  console.log('[AISuggestion] initAISuggestionService called', { hasExisting: !!aiSuggestionService, config });
  if (!aiSuggestionService) {
    aiSuggestionService = new AISuggestionService(config);
    console.log('[AISuggestion] Service created');
  } else {
    aiSuggestionService.updateConfig(config);
    console.log('[AISuggestion] Service config updated');
  }
  return aiSuggestionService;
}

export function getAISuggestionService(): AISuggestionService | null {
  console.log('[AISuggestion] getAISuggestionService called', { exists: !!aiSuggestionService });
  return aiSuggestionService;
}