# TreeStructureEditor

![TreeStructureEditor](image.png)

> 一个基于树状结构的 Markdown 编辑器，专为知识整理和结构化笔记设计

## 📖 项目简介

TreeStructureEditor 是一个处理树状文本文件的编辑器，项目始于 2023 年（作者高三时期），随着大模型技术的发展，本项目在 2026 年迎来了新的可能性。

本项目旨在解决知识结构化整理的痛点，通过树状层级结构、Markdown 编辑、LaTeX 公式支持和 AI 智能辅助，为用户提供一个高效的知识管理工具。

## ✨ 核心特性

### 🌳 整理知识结构为树状结构
- **枝干节点**：用于组织和分类，可包含多个子节点
- **叶子节点**：用于存储具体内容，支持 Markdown 编辑
- **灵活管理**：节点展开收起、上下移动、删除、添加、编辑一应俱全

### ✍️ 录入顺手
- **Markdown 支持**：原生 Markdown 语法，所见即所得
- **LaTeX 公式**：完美支持数学公式渲染
- **AI 智能补全**：基于大模型的智能文本补全，提升写作效率

### 📄 导出便于打印的资料
- **HTML 导出**：一键导出为 HTML 格式
- **打印优化**：方便调整缩放，适配各种纸张尺寸
- **样式微调**：提供灵活的样式调整能力

## 🎯 适用场景

- 📝 **笔记记录**：日常学习笔记
- 🧠 **知识结构整理**：构建个人知识体系
- 📚 **学习资料整理**：课程笔记、复习资料
- 📖 **无电子设备查阅**：学校复习、纸质开卷考试
- 🤖 **AI 生成内容整理**：整理 AI 输出的结构化内容（告别 Word 粘贴的烦恼😡）
- 🗂️ **纸质笔记归档**：数字化纸质笔记（推荐使用 AI 代替 OCR）

## 🛠️ 功能特性

### 树状结构管理
- ✅ 枝干节点与叶子节点
- ✅ 节点展开/收起
- ✅ 节点上下移动
- ✅ 节点删除
- ✅ 节点添加
- ✅ 节点编辑

### 文件操作
- ✅ 打开文件（JSON 格式）
- ✅ 保存文件
- ✅ 自动保存（每分钟）
- ✅ 导出为 HTML

### 编辑功能
- ✅ Markdown 完整支持
- ✅ LaTeX 公式渲染
- ✅ 代码高亮
- ✅ Monaco Editor 编辑器
- ✅ AI 智能补全（支持 OpenAI 格式 API）

### 用户体验
- ✅ 现代化 UI 设计（Tailwind CSS）
- ✅ 响应式布局
- ✅ 通知系统
- ✅ 跨平台支持（Windows、Linux）

## 🚀 使用方法

### Windows 用户
1. 下载压缩包
2. 解压后直接运行可执行文件

### Linux 用户
1. 下载安装包
2. 安装后运行

### 开发者
```bash
# 克隆项目
git clone https://github.com/yourusername/TreeStructureEditor.git
cd TreeStructureEditor

# 安装依赖（需要 pnpm）
pnpm install

# 运行开发模式
pnpm run tauri:dev

# 构建生产版本
pnpm run tauri:build

# 代码格式化
pnpm run format
```

> ⚠️ **注意**：需要自行申请 API Key 并在设置中配置，才能使用 AI 功能。支持 OpenAI 格式的 API（如 OpenAI、DeepSeek、Claude 等）。

## 🛠️ 技术栈

### 前端
- **Vue 3**
- **TypeScript**
- **Vite**
- **Tailwind CSS**
- **Monaco Editor**
- **Marked**
- **KaTeX**

### 后端
- **Tauri 2**
- **Rust**
- **dirs**

### 开发工具
- **pnpm**
- **Prettier**
- **PostCSS**

## 📦 项目结构

```
TreeStructureEditor/
├── src/                    # 前端源代码
│   ├── components/         # Vue 组件
│   │   ├── AISettings.vue  # AI 设置组件
│   │   ├── Editor.vue      # Monaco 编辑器组件
│   │   ├── NotificationSystem.vue  # 通知系统组件
│   │   └── TreeNode.vue    # 树节点组件
│   ├── services/           # 服务层
│   │   └── aiSuggestion.ts # AI 补全服务
│   ├── types/              # TypeScript 类型定义
│   ├── utils/              # 工具函数
│   │   ├── markdown.ts     # Markdown 处理
│   │   ├── notifications.ts # 通知工具
│   │   └── tree.ts         # 树结构工具
│   ├── App.vue             # 主应用组件
│   └── main.ts             # 应用入口
├── src-tauri/              # Tauri 后端（Rust）
│   ├── src/
│   │   ├── lib.rs          # Rust 库文件
│   │   └── main.rs         # Rust 入口文件
│   ├── Cargo.toml          # Rust 依赖配置
│   └── tauri.conf.json     # Tauri 配置文件
├── package.json            # Node.js 依赖配置
├── tsconfig.json           # TypeScript 配置
├── vite.config.ts          # Vite 配置
└── tailwind.config.js      # Tailwind CSS 配置
```

## 🔧 配置说明

### AI 功能配置
1. 点击界面上的 "AI API Settings" 按钮
2. 填写以下信息：
   - **API Key**：你的 API 密钥
   - **Base URL**：API 服务地址（如 `https://api.openai.com/v1`）
   - **Model**：使用的模型名称（如 `gpt-3.5-turbo`）
3. 配置会自动保存到 `~/.TreeStructureEditor/ai_api.json`

### 支持的 API
- OpenAI 官方 API
- 其他兼容 OpenAI 格式的 API
  - 如百炼平台的Qwen, DeepSeek, GLM 等

## 📄 许可证

本项目采用 GPLv3 许可证。

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📝 更新日志

### 2026-01-06
- 添加 AI 智能补全功能
- 优化 UI 设计，使用 Tailwind CSS
- 添加自动保存功能
- 支持多种 AI API

### 2023
- 项目初始版本发布
- 基础树状结构编辑功能

## 📸 截图

![TreeStructureEditor 主界面](image.png)

## 🙏 致谢

感谢所有为本项目做出贡献的开发者和用户！

---

**TreeStructureEditor** • 让知识结构化变得简单

