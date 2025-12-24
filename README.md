# AI Translator - Chrome Extension

[English](#english) | [中文](#chinese)

---

<a name="english"></a>

## 🌐 AI Translator

An AI-powered Chrome browser translation extension that supports selection translation and full-page translation, making web translation smarter and more natural.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Chrome](https://img.shields.io/badge/Chrome-Extension-green.svg)
![Manifest](https://img.shields.io/badge/Manifest-V3-orange.svg)

## ✨ Features

### Selection Translation
- Shows a translate button when text is selected
- Click the button to open translation popup
- Copy translation with one click
- Translation window stays visible until explicitly closed

### Full-Page Translation
- Translate the entire webpage with one click
- Translations appear below original text, preserving layout
- Inherits original styling (font, color, size)
- Toggle show/hide translations
- High-performance batch translation (100 items/batch, 8 concurrent)

### Float Ball
- Draggable quick action button
- Supports translating selection, page, and toggling translations
- Position auto-saves

### Other Features
- Right-click context menu translation
- Customizable translation prompts
- Dark/Light theme toggle
- Multi-language support (10+ languages)
- Input text translation dialog

## 🚀 Installation

### 1. Download

```bash
git clone https://github.com/your-username/translator.git
cd translator
```

### 2. Load in Chrome

1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the `translator` folder

### 3. Configure API

1. Click the extension icon in the browser toolbar
2. Click "Settings"
3. Fill in API configuration:
   - **API Endpoint**: e.g., `https://api.openai.com/v1/chat/completions`
   - **API Key**: Your API key
   - **Model Name**: e.g., `gpt-4o-mini`
4. Select target translation language
5. Click "Save Settings"

## 📖 Usage

### Selection Translation

1. Select text on any webpage
2. Click the "Translate" button that appears
3. View translation result, click to copy
4. Press `Esc` or click × to close

### Full-Page Translation

**Method 1: Float Ball**
1. Click the float ball in the bottom-right corner
2. Select "Translate Page"

**Method 2: Extension Menu**
1. Click the extension icon in toolbar
2. Click "Translate Page"

**Method 3: Context Menu**
1. Right-click on the page
2. Select "Translate this page"

### Show/Hide Translations

After translation:
1. Click the float ball
2. Select "Hide Translations" or "Show Translations"
3. Translations are preserved, no need to re-translate

### Theme Toggle

1. Open settings page
2. Click the ☀️/🌙 icon in the top-right to toggle theme

## ⚙️ Supported APIs

Supports any service compatible with OpenAI Chat Completions API:

| Service | Example API Endpoint |
|---------|---------------------|
| OpenAI | `https://api.openai.com/v1/chat/completions` |
| Azure OpenAI | `https://your-resource.openai.azure.com/...` |
| Claude (compatible) | Use compatibility layer |
| Ollama | `http://localhost:11434/v1/chat/completions` |
| LM Studio | `http://localhost:1234/v1/chat/completions` |

## 🌍 Supported Languages

- 简体中文 (Simplified Chinese)
- 繁体中文 (Traditional Chinese)
- English
- 日本語 (Japanese)
- 한국어 (Korean)
- Français (French)
- Deutsch (German)
- Español (Spanish)
- Português (Portuguese)
- Русский (Russian)

## 📁 Project Structure

```
translator/
├── manifest.json          # Chrome extension configuration
├── background/
│   └── background.js      # Background script, handles API calls
├── content/
│   ├── content.js         # Content script, page interaction
│   └── content.css        # Translation UI styles
├── popup/
│   ├── popup.html         # Popup menu
│   ├── popup.css
│   └── popup.js
├── options/
│   ├── options.html       # Settings page
│   ├── options.css
│   └── options.js
├── i18n/
│   └── messages.js        # Internationalization messages
├── icons/                  # Extension icons
└── scripts/
    └── generate-icons.js  # Icon generation script
```

## 🎨 Custom Prompt

Customize translation prompts in settings using `{targetLang}` variable:

```
You are a professional translator. Translate the given text to {targetLang}.
Rules:
1. Provide ONLY the translation
2. Keep technical terms in original form
3. Translate naturally, not literally
```

## 🔧 Development

```bash
# Install dependencies (optional, for icon generation)
npm install

# Generate icons
npm run icons

# Package for distribution
npm run zip
```

## 📄 License

MIT License

## 🤝 Contributing

Issues and Pull Requests are welcome!

---

<a name="chinese"></a>

## 🌐 AI Translator - 智能翻译插件

一款基于 AI 的 Chrome 浏览器翻译插件，支持划词翻译和全文翻译，让网页翻译更智能、更自然。

## ✨ 功能特性

### 划词翻译
- 选中文本后显示翻译按钮
- 点击按钮弹出翻译窗口
- 支持复制译文
- 翻译窗口保持显示，不会自动消失

### 全文翻译
- 一键翻译整个网页
- 译文显示在原文下方，保持原网页布局
- 继承原文样式（字体、颜色、大小）
- 支持显示/隐藏译文切换
- 高性能批量翻译（100条/批，8并发）

### 悬浮球
- 可拖动的快捷操作球
- 支持翻译选中文本、翻译页面、显示/隐藏译文
- 位置自动保存

### 其他功能
- 右键菜单快速翻译
- 定制化翻译 Prompt
- 深色/浅色主题切换
- 支持多种目标语言（10+语言）
- 输入文本翻译对话框

## 🚀 安装使用

### 1. 下载插件

```bash
git clone https://github.com/your-username/translator.git
cd translator
```

### 2. 加载到 Chrome

1. 打开 Chrome 浏览器
2. 地址栏输入 `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择 `translator` 文件夹

### 3. 配置 API

1. 点击浏览器工具栏中的插件图标
2. 点击「打开设置」
3. 填写 API 配置：
   - **API 地址**: 如 `https://api.openai.com/v1/chat/completions`
   - **API Key**: 你的 API 密钥
   - **模型名称**: 如 `gpt-4o-mini`
4. 选择目标翻译语言
5. 点击「保存设置」

## 📖 使用方法

### 划词翻译

1. 在网页中选中需要翻译的文字
2. 点击出现的「翻译」按钮
3. 查看翻译结果，可点击复制
4. 按 `Esc` 或点击 × 关闭翻译窗口

### 全文翻译

**方式一：悬浮球**
1. 点击页面右下角的悬浮球
2. 选择「翻译整个页面」

**方式二：插件菜单**
1. 点击浏览器工具栏的插件图标
2. 点击「翻译当前页面」

**方式三：右键菜单**
1. 在页面空白处右键
2. 选择「翻译整个页面」

### 显示/隐藏译文

翻译完成后：
1. 点击悬浮球
2. 选择「隐藏译文」或「显示译文」
3. 译文会被保留，再次显示无需重新翻译

### 主题切换

1. 打开设置页面
2. 点击右上角的 ☀️/🌙 图标切换主题

## ⚙️ 支持的 API

支持任何兼容 OpenAI Chat Completions API 的服务：

| 服务 | API 地址示例 |
|------|-------------|
| OpenAI | `https://api.openai.com/v1/chat/completions` |
| Azure OpenAI | `https://your-resource.openai.azure.com/...` |
| Claude (兼容) | 使用兼容层 |
| Ollama | `http://localhost:11434/v1/chat/completions` |
| LM Studio | `http://localhost:1234/v1/chat/completions` |

## 🌍 支持的语言

- 简体中文
- 繁体中文
- English
- 日本語
- 한국어
- Français
- Deutsch
- Español
- Português
- Русский

## 🎨 自定义 Prompt

在设置页面可以自定义翻译 Prompt，使用 `{targetLang}` 变量插入目标语言：

```
You are a professional translator. Translate the given text to {targetLang}.
Rules:
1. Provide ONLY the translation
2. Keep technical terms in original form
3. Translate naturally, not literally
```

## 🔧 开发

```bash
# 安装依赖（可选，用于生成图标）
npm install

# 生成精美图标
npm run icons

# 打包发布
npm run zip
```

## 📄 License

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**Made with ❤️**
