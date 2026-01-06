import type { TreeNode } from "../types";

export const generateId = (): string =>
  `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

export const initialTree: TreeNode = {
  id: generateId(),
  type: "branch",
  title: "Root",
  children: [
    {
      id: generateId(),
      type: "leaf",
      title: "Introduction",
      content:
        "# Welcome to TreeStructureEditor\n\nThis is a **tree-based** markdown editor where:\n\n- Branches organize content\n- Leaves contain editable markdown\n- Everything connects visually\n\nTry editing this leaf!",
    },
    {
      id: generateId(),
      type: "branch",
      title: "Documentation",
      children: [
        {
          id: generateId(),
          type: "leaf",
          title: "Features",
          content:
            "## Core Features\n\n- **Real-time rendering** of markdown\n- Tree structure with visual connections\n- File saving/loading\n- Intuitive node management\n- formulars\n\n> Perfect for organizing complex documents",
        },
        {
          id: generateId(),
          type: "leaf",
          title: "Every math formula",
          content:
            "## Math formulas\n\n- $ E=mc^2 $\n- $ \\frac{d}{dx}f(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h} $ \n\n ## math block\n\n$$ \\int_a^b f(x) dx $$\n\n ",
        },
      ],
    },
  ],
};
