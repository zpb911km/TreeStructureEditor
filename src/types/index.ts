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
