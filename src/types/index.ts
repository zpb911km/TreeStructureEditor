export type NodeType = "branch" | "leaf";

export interface TreeNode {
  id: string;
  type: NodeType;
  title: string;
  content?: string;
  children?: TreeNode[];
}

export interface Notification {
  id: number;
  message: string;
  type: "success" | "error" | "warning" | "info";
  fadeOut?: boolean;
}

export interface AIConfig {
  apiKey: string;
  baseURL: string;
  model: string;

  /** 是否启用流式输出（逐 token 显示） */
  streamEnabled?: boolean;

  /** 模型是否支持 FIM（Fill-in-the-Middle）模式 */
  fimEnabled?: boolean;

  /** 最大生成 token 数 */
  maxTokens?: number;

  /** 温度参数 */
  temperature?: number;
}

export interface FileNode {
  name: string;
  isDirectory: boolean;
  isFile: boolean;
}

export interface Config {
  useAI?: boolean;
  darkMode?: boolean;
  padMode?: boolean;
}
