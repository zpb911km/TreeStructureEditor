# TreeStructureEditor

![TreeStructureEditor](image.png)

> 一个基于树状结构的 Markdown 编辑器，专为知识整理和结构化笔记设计

---

## 📖 项目简介

TreeStructureEditor 是一个处理**树状文本文件**的编辑器。项目始于 2023 年（作者高三时期），随着大模型技术的发展，在 2026 年迎来了新的可能性。

核心理念：用**树状层级结构**组织知识，每个节点都是一份可编辑的 Markdown，**所见即所得**。

- 🪴 **节点即内容** — 统一的节点模型，每个节点可嵌套子节点，结构无限层级
- ✍️ **内联编辑** — 点击即编辑，Markdown 实时渲染
- 🤖 **AI 深度融合** — 智能补全 + 对话式 AI 助手，支持流式输出与 FIM 模式
- 📱 **多端支持** — Windows / Linux / Android

---

## ✨ 核心特性

### 🌳 树状结构 + 统一节点模型

- **统一节点** — 不再区分「枝干/叶子」，每个节点都可包含子节点和 Markdown 内容
- **拖拽排序** — 拖拽节点调整层级和顺序
- **展开/收起** — 自如折叠长文档
- **节点管理** — 添加、删除、复制、移动，一应俱全

### ✍️ 编辑器

- **Monaco Editor** — 与 VS Code 同源的编辑器核心，代码高亮、智能缩进
- **Markdown 实时渲染** — 编写即预览
- **LaTeX 公式** — KaTeX 引擎，完美渲染数学公式
- **富文本面板** — 符号面板、Markdown 快捷插入，降低记忆负担

### 🤖 AI 双模式

| 模式 | 说明 |
|------|------|
| **Inline Completion** | 在编辑器中直接触发 AI 补全（Tab 接受），支持 FIM（Fill-in-the-Middle）模式 |
| **AI Chat** | 独立对话页面，支持流式流式输出、图片预览，可基于当前上下文提问 |

- 支持 OpenAI 格式 API（OpenAI / DeepSeek / 百炼 / GLM 等）
- 流式输出（Streaming）
- FIM 模式补全（更快、更准）
- CORS 绕过（通过 Tauri HTTP 插件）

### 📂 文件管理

- **打开/保存** JSON 格式的树文件
- **文件浏览器** — 可视化浏览和选择文件
- **自动保存** — 每分钟自动保存，不再丢内容
- **导出 HTML** — 一键导出为打印友好的 HTML

### 🎨 用户体验

- **4 页面路由** — 编辑器 / 文件浏览 / AI 对话 / 设置，底部导航栏切换
- **主题系统** — 深色/浅色模式切换
- **通知系统** — 操作反馈一目了然
- **响应式布局** — 桌面和移动端均适配

---

## 🎯 适用场景

- 📝 **笔记记录** — 日常学习笔记
- 🧠 **知识结构整理** — 构建个人知识体系
- 📚 **学习资料整理** — 课程笔记、复习资料
- 📖 **无电子设备查阅** — 学校复习、纸质开卷考试
- 🤖 **AI 生成内容整理** — 整理 AI 输出的结构化内容（告别 Word 粘贴的烦恼 😡）
- 🗂️ **纸质笔记归档** — 数字化纸质笔记（推荐使用 AI 代替 OCR）

---

## 🛠️ 功能清单

| 分类 | 功能 | 状态 |
|------|------|:----:|
| **树结构** | 统一节点模型（无 branch/leaf 区分） | ✅ |
| | 节点展开/收起 | ✅ |
| | 节点拖拽排序 | ✅ |
| | 节点添加/删除/复制 | ✅ |
| | 节点上下移动 | ✅ |
| **编辑** | Markdown 完整支持 | ✅ |
| | LaTeX 公式渲染（KaTeX） | ✅ |
| | 代码高亮 | ✅ |
| | Monaco Editor | ✅ |
| | 符号/公式快捷插入面板 | ✅ |
| | 富文本编辑面板（遮罩层） | ✅ |
| **文件** | 打开 JSON 文件 | ✅ |
| | 保存文件 | ✅ |
| | 自动保存（每分钟） | ✅ |
| | 文件浏览器视图 | ✅ |
| | 导出 HTML | ✅ |
| | 统一文件操作 API | ✅ |
| **AI** | Inline Completion（AI 内联补全） | ✅ |
| | FIM（Fill-in-the-Middle）模式 | ✅ |
| | AI Chat 对话页面 | ✅ |
| | 流式输出（Streaming） | ✅ |
| | CORS 绕过（Tauri HTTP 插件） | ✅ |
| | 图片预览（聊天中） | ✅ |
| **UI** | 底部导航栏（4 页面路由） | ✅ |
| | 深色/浅色主题切换 | ✅ |
| | 通知系统 | ✅ |
| | 响应式布局 | ✅ |
| | 内部剪贴板 | ✅ |
| **跨平台** | Windows | ✅ |
| | Linux | ✅ |
| | Android | ✅ |

---

## 🚀 使用方法

### 下载预编译包

前往 [Releases](https://github.com/zpb911km/TreeStructureEditor/releases) 下载对应平台的版本。

| 平台 | 格式 |
|------|------|
| Windows | `.msi` / `.exe` |
| Linux | `.deb` / `.AppImage` |
| Android | `.apk` |

### 开发者

```bash
# 克隆项目
git clone https://github.com/zpb911km/TreeStructureEditor.git
cd TreeStructureEditor

# 安装依赖（需要 pnpm）
pnpm install

# 运行开发模式（桌面）
pnpm td

# 运行开发模式（Android）
pnpm tda

# 构建生产版本
pnpm tb

# 构建 Windows 交叉编译
pnpm tbw

# 代码格式化
pnpm format
```

> ⚠️ **注意**：AI 功能需要自行申请 API Key 并在设置中配置。支持 OpenAI 格式的 API（OpenAI、DeepSeek、百炼 Qwen、GLM 等）。

---

## 🛠️ 技术栈

### 前端

| 技术 | 用途 |
|------|------|
| **Vue 3** + Composition API | 框架 |
| **TypeScript** | 类型安全 |
| **Vite 6** | 构建工具 |
| **Tailwind CSS 3** | 样式 |
| **Monaco Editor** | 代码/文本编辑器 |
| **Vue Router** | 页面路由 |
| **Marked** | Markdown 解析 |
| **KaTeX** | LaTeX 公式渲染 |
| **Prettier** | 代码格式化 |

### 后端

| 技术 | 用途 |
|------|------|
| **Tauri 2** | 桌面/移动端框架 |
| **Rust** | 后端语言 |
| **tauri-plugin-fs** | 文件系统 |
| **tauri-plugin-http** | HTTP 请求（CORS 绕过） |

### 目录结构

```
TreeStructureEditor/
├── src/                        # 前端源代码
│   ├── apis/                   # API 层（文件操作、AI 请求等）
│   │   └── index.ts
│   ├── components/             # Vue 组件
│   │   ├── AISettingsPanel.vue # AI 设置面板
│   │   ├── FileBrowser.vue     # 文件浏览器组件
│   │   ├── FileList.vue        # 文件列表
│   │   ├── FloatEditor.vue     # 浮动编辑器（遮罩层、符号面板等）
│   │   ├── NotificationSystem.vue # 通知系统
│   │   ├── RichEditor.vue      # 富文本编辑器
│   │   └── TreeNode.vue        # 树节点组件
│   ├── router/                 # 路由配置
│   │   └── index.ts
│   ├── services/               # 服务层
│   │   └── aiSuggestion.ts     # AI 补全服务
│   ├── types/                  # TypeScript 类型定义
│   │   └── index.ts            # TreeNode, AIConfig 等
│   ├── utils/                  # 工具函数
│   │   ├── markdown.ts         # Markdown 处理
│   │   ├── notifications.ts    # 通知工具
│   │   ├── theme.ts            # 主题切换
│   │   └── tree.ts             # 树结构工具
│   ├── views/                  # 页面级组件
│   │   ├── AIChatView.vue      # AI 对话页面
│   │   ├── EditorView.vue      # 编辑器主页
│   │   ├── FileBrowserView.vue # 文件浏览页面
│   │   └── Settings.vue        # 设置页面
│   ├── App.vue                 # 主应用组件（底部导航栏）
│   ├── index.html              # HTML 入口
│   ├── main.ts                 # 应用入口
│   ├── index.css               # 全局样式
│   └── vite-env.d.ts           # Vite 类型声明
├── src-tauri/                  # Tauri 后端（Rust）
│   ├── src/
│   │   ├── lib.rs              # Rust 库文件
│   │   └── main.rs             # Rust 入口
│   ├── Cargo.toml              # Rust 依赖配置
│   └── tauri.conf.json         # Tauri 配置
├── package.json                # Node.js 依赖配置
├── tsconfig.json               # TypeScript 配置
├── vite.config.ts              # Vite 配置
└── tailwind.config.js          # Tailwind CSS 配置
```

---

## 🔧 配置说明

### AI 功能配置

1. 点击底部导航栏的 **设置** 图标进入设置页面
2. 或直接点击编辑器中的 **AI API Settings** 按钮
3. 填写以下信息：
   - **API Key** — 你的 API 密钥
   - **Base URL** — API 服务地址（如 `https://api.openai.com/v1`）
   - **Model** — 模型名称（如 `gpt-3.5-turbo`、`deepseek-chat`）
   - **Stream** — 是否启用流式输出
   - **FIM** — 是否启用 Fill-in-the-Middle 模式
4. 配置自动保存到 `~/.TreeStructureEditor/ai_api.json`

### 支持的 API

- OpenAI 官方 API
- DeepSeek API
- 百炼平台（Qwen 系列）
- GLM 系列
- 其他兼容 OpenAI 格式的 API

### 主题切换

- 在设置页面切换 **深色模式 / 浅色模式**
- 或通过编辑器中的主题按钮快速切换

---

## 📸 截图

![TreeStructureEditor 主界面](image.png)
*树状结构编辑器主界面 — 节点管理 + Markdown 编辑*

---

## 📄 许可证

本项目采用 **GNU General Public License v3** 许可证。

---

## 🤝 贡献

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支（`git checkout -b feat/AmazingFeature`）
3. 提交更改（`git commit -m 'feat: add some amazing feature'`）
4. 推送到分支（`git push origin feat/AmazingFeature`）
5. 开启 Pull Request

### 风格指南

- 使用 Composition API + `<script setup>` 语法
- 提交信息遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范
- 提交前运行 `pnpm format` 格式化代码

---

## 📝 更新日志

### 2026-07
- 🎯 统一树节点模型，移除 branch/leaf 类型区分
- 🤖 AI 对话页面 + 图片消息预览
- 🔄 树节点拖拽排序功能
- ⚡ FIM + Streaming 支持，CORS 绕过
- 🧩 浮动编辑器重构：遮罩层、符号面板、Markdown 面板增强
- 🧭 路由重构 + 底部导航栏（4 页面）
- 📂 文件浏览器视图 + 统一文件操作 API
- 📋 内部剪贴板
- 🌗 主题系统（深色/浅色切换）
- 📱 Android 端适配

### 2026-01
- 🤖 AI 智能补全（Inline Completion）
- 🎨 Tailwind CSS 全面重构 UI
- 💾 自动保存功能
- 🔗 多 API 支持（OpenAI / DeepSeek / 百炼）

### 2023
- 🎉 项目初始版本发布
- 🌳 基础树状结构编辑功能

---

## 🙏 致谢

感谢所有为本项目做出贡献的开发者和用户！

---

**TreeStructureEditor** • 让知识结构化变得简单
