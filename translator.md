# AI Translator - Chrome 智能翻译插件

一个基于 AI 的 Chrome 浏览器翻译插件，支持划词翻译和全文翻译。

## 功能特性

1. **划词翻译** - 选中文本后自动弹出翻译窗口，显示原文和译文
2. **全文翻译** - 一键翻译整个页面，译文显示在原文下方，保持页面布局
3. **右键菜单** - 右键快速翻译选中文本或整个页面
4. **自定义配置** - 支持配置自定义 AI API 地址和密钥
5. **多语言支持** - 支持中、英、日、韩、法、德、西、俄等多种语言

## 项目结构

```
translator/
├── manifest.json          # Chrome 扩展配置文件
├── background/
│   └── background.js      # 后台脚本，处理 AI API 调用
├── content/
│   ├── content.js         # 内容脚本，处理页面交互
│   └── content.css        # 翻译弹窗和行内翻译样式
├── popup/
│   ├── popup.html         # 设置页面 HTML
│   ├── popup.css          # 设置页面样式
│   └── popup.js           # 设置页面逻辑
├── icons/
│   ├── icon16.png         # 扩展图标 16x16
│   ├── icon32.png         # 扩展图标 32x32
│   ├── icon48.png         # 扩展图标 48x48
│   ├── icon128.png        # 扩展图标 128x128
│   └── generate-icons.html # 图标生成工具
└── scripts/
    └── generate-icons.js  # 图标生成脚本
```

## 安装使用

### 1. 加载扩展

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择 `translator` 文件夹

### 2. 配置 API

1. 点击浏览器工具栏中的扩展图标
2. 填写 API 配置：
   - **API 地址**: OpenAI 兼容的 API 端点（如 `https://api.openai.com/v1/chat/completions`）
   - **API Key**: 你的 API 密钥
   - **模型名称**: 使用的模型（如 `gpt-4o-mini`）
3. 选择目标翻译语言
4. 点击「保存设置」

### 3. 使用翻译

**划词翻译:**
- 在任意网页选中文字，自动弹出翻译窗口
- 可点击「复制」按钮复制译文

**全文翻译:**
- 点击扩展图标，点击「翻译当前页面」按钮
- 或右键点击页面空白处，选择「翻译整个页面」

**右键翻译:**
- 选中文字后右键，选择「翻译选中文本」

## 生成精美图标

默认图标是简单的占位图标。如需精美图标：

**方法一：浏览器生成**
1. 用浏览器打开 `icons/generate-icons.html`
2. 点击「下载全部图标」

**方法二：Node.js 生成**
```bash
npm install canvas
node scripts/generate-icons.js
```

## 支持的 API

支持任何兼容 OpenAI Chat Completions API 的服务：
- OpenAI (gpt-4o, gpt-4o-mini, gpt-3.5-turbo 等)
- Azure OpenAI
- Claude (通过兼容 API)
- 本地部署的 LLM (如 Ollama, LM Studio)

## 技术说明

- **Manifest V3** - 使用最新的 Chrome 扩展规范
- **Content Script** - 直接操作 DOM 实现页面翻译
- **Chrome Storage API** - 安全存储用户配置
- **Service Worker** - 后台处理 API 请求


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