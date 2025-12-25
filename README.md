# AI Translator

<p align="center">
  <a href="#english">🇬🇧 English</a> | <a href="#中文">🇨🇳 中文</a>
</p>

---

<a id="english"></a>

## 🌐 AI Translator - Chrome Extension

An AI-powered Chrome browser translation extension that supports selection translation and full-page translation, making web translation smarter and more natural.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Chrome](https://img.shields.io/badge/Chrome-Extension-green.svg)
![Manifest](https://img.shields.io/badge/Manifest-V3-orange.svg)

### ✨ Features

#### Smart Translation
- **Math Formula Preservation**: Automatically detects and preserves MathJax/KaTeX formulas without translation
- **Code Block Protection**: Code snippets remain untouched during translation
- **Elegant Menu Translation**: Sidebar translations align perfectly with original text (not icons)
- **Custom Prompts**: Customize translation style with your own prompts (formal, casual, technical, etc.)

#### Selection Translation
- Shows a translate button when text is selected
- Click the button to open translation popup
- Copy translation with one click
- Translation window stays visible until explicitly closed

#### Full-Page Translation
- Translate the entire webpage with one click
- Translations appear below original text, preserving layout
- Inherits original styling (font, color, size)
- Toggle show/hide translations
- High-performance batch translation (100 items/batch, 8 concurrent)

#### Float Ball
- Draggable quick action button
- Supports translating selection, page, and toggling translations
- Position auto-saves, persists across page navigation

#### Other Features
- Right-click context menu translation
- Dark/Light theme toggle
- Multi-language support (10+ languages)
- Input text translation dialog

### 🚀 Installation

#### 1. Download

```bash
git clone https://github.com/your-username/translator.git
cd translator
```

#### 2. Load in Chrome

1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the `translator` folder

#### 3. Configure API

1. Click the extension icon in the browser toolbar
2. Click "Settings"
3. Fill in API configuration:
   - **API Endpoint**: e.g., `https://api.openai.com/v1/chat/completions`
   - **API Key**: Your API key
   - **Model Name**: e.g., `gpt-4o-mini`
4. Select target translation language
5. Click "Save Settings"

### 📖 Usage

#### Selection Translation

1. Select text on any webpage
2. Click the "Translate" button that appears
3. View translation result, click to copy
4. Press `Esc` or click × to close

#### Full-Page Translation

**Method 1: Float Ball**
1. Click the float ball in the bottom-right corner
2. Select "Translate Page"

**Method 2: Extension Menu**
1. Click the extension icon in toolbar
2. Click "Translate Page"

**Method 3: Context Menu**
1. Right-click on the page
2. Select "Translate this page"

#### Show/Hide Translations

After translation:
1. Click the float ball
2. Select "Hide Translations" or "Show Translations"
3. Translations are preserved, no need to re-translate

### ⚙️ Supported APIs

**Works with any OpenAI-compatible API endpoint.** Just configure the endpoint URL, API key, and model name.

| Service | Example API Endpoint | Notes |
|---------|---------------------|-------|
| OpenAI | `https://api.openai.com/v1/chat/completions` | GPT-4o, GPT-4o-mini, etc. |
| Azure OpenAI | `https://your-resource.openai.azure.com/...` | |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` | Gemini Pro, Flash, etc. |
| DeepSeek | `https://api.deepseek.com/v1/chat/completions` | DeepSeek-V3, etc. |
| OpenRouter | `https://openrouter.ai/api/v1/chat/completions` | **Claude, Gemini, Llama, etc.** |
| Ollama (Local) | `http://localhost:11434/v1/chat/completions` | Local models |
| LM Studio (Local) | `http://localhost:1234/v1/chat/completions` | Local models |

> **Note**: To use Anthropic Claude, use OpenRouter with model name like `anthropic/claude-sonnet-4` - Anthropic's native API format is not compatible.

### 🌍 Supported Languages

简体中文 • 繁体中文 • English • 日本語 • 한국어 • Français • Deutsch • Español • Português • Русский

### 📁 Project Structure

```
translator/
├── manifest.json          # Chrome extension configuration
├── background/            # Background script
├── content/               # Content script & styles
├── popup/                 # Popup menu
├── options/               # Settings page
├── i18n/                  # Internationalization
└── icons/                 # Extension icons
```

### 📄 License

MIT License

---

<a id="中文"></a>

## 🌐 AI Translator - 智能翻译插件

一款基于 AI 的 Chrome 浏览器翻译插件，支持划词翻译和全文翻译，让网页翻译更智能、更自然。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Chrome](https://img.shields.io/badge/Chrome-Extension-green.svg)
![Manifest](https://img.shields.io/badge/Manifest-V3-orange.svg)

### ✨ 功能特性

#### 智能翻译
- **数学公式保留**：自动识别并保留 MathJax/KaTeX 数学公式，不会被翻译破坏
- **代码块保护**：代码片段在翻译过程中保持原样不变
- **优雅的菜单翻译**：侧边栏译文与原文精确对齐（而非与图标对齐）
- **自定义 Prompt**：支持自定义翻译风格（正式、口语化、技术文档等）

#### 划词翻译
- 选中文本后显示翻译按钮
- 点击按钮弹出翻译窗口
- 支持复制译文
- 翻译窗口保持显示，不会自动消失

#### 全文翻译
- 一键翻译整个网页
- 译文显示在原文下方，保持原网页布局
- 继承原文样式（字体、颜色、大小）
- 支持显示/隐藏译文切换
- 高性能批量翻译（100条/批，8并发）

#### 悬浮球
- 可拖动的快捷操作球
- 支持翻译选中文本、翻译页面、显示/隐藏译文
- 位置自动保存，跨页面保持

#### 其他功能
- 右键菜单快速翻译
- 深色/浅色主题切换
- 支持多种目标语言（10+语言）
- 输入文本翻译对话框

### 🚀 安装使用

#### 1. 下载插件

```bash
git clone https://github.com/your-username/translator.git
cd translator
```

#### 2. 加载到 Chrome

1. 打开 Chrome 浏览器
2. 地址栏输入 `chrome://extensions/`
3. 开启右上角「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择 `translator` 文件夹

#### 3. 配置 API

1. 点击浏览器工具栏中的插件图标
2. 点击「打开设置」
3. 填写 API 配置：
   - **API 地址**: 如 `https://api.openai.com/v1/chat/completions`
   - **API Key**: 你的 API 密钥
   - **模型名称**: 如 `gpt-4o-mini`
4. 选择目标翻译语言
5. 点击「保存设置」

### 📖 使用方法

#### 划词翻译

1. 在网页中选中需要翻译的文字
2. 点击出现的「翻译」按钮
3. 查看翻译结果，可点击复制
4. 按 `Esc` 或点击 × 关闭翻译窗口

#### 全文翻译

**方式一：悬浮球**
1. 点击页面右下角的悬浮球
2. 选择「翻译整个页面」

**方式二：插件菜单**
1. 点击浏览器工具栏的插件图标
2. 点击「翻译当前页面」

**方式三：右键菜单**
1. 在页面空白处右键
2. 选择「翻译整个页面」

#### 显示/隐藏译文

翻译完成后：
1. 点击悬浮球
2. 选择「隐藏译文」或「显示译文」
3. 译文会被保留，再次显示无需重新翻译

### ⚙️ 支持的 API

**支持所有 OpenAI 兼容的 API 接口**，只需配置接口地址、API Key 和模型名称即可。

| 服务 | API 地址示例 | 说明 |
|------|-------------|------|
| OpenAI | `https://api.openai.com/v1/chat/completions` | GPT-4o, GPT-4o-mini 等 |
| Azure OpenAI | `https://your-resource.openai.azure.com/...` | |
| Google Gemini | `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` | Gemini Pro, Flash 等 |
| DeepSeek | `https://api.deepseek.com/v1/chat/completions` | DeepSeek-V3 等 |
| OpenRouter | `https://openrouter.ai/api/v1/chat/completions` | **Claude, Gemini, Llama 等** |
| Ollama (本地) | `http://localhost:11434/v1/chat/completions` | 本地模型 |
| LM Studio (本地) | `http://localhost:1234/v1/chat/completions` | 本地模型 |

> **注意**：如需使用 Anthropic Claude，请通过 OpenRouter 调用，模型名如 `anthropic/claude-sonnet-4`。Anthropic 官方 API 格式与 OpenAI 不兼容。

### 🌍 支持的语言

简体中文 • 繁体中文 • English • 日本語 • 한국어 • Français • Deutsch • Español • Português • Русский

### 📁 项目结构

```
translator/
├── manifest.json          # Chrome 扩展配置
├── background/            # 后台脚本
├── content/               # 内容脚本 & 样式
├── popup/                 # 弹出菜单
├── options/               # 设置页面
├── i18n/                  # 国际化
└── icons/                 # 插件图标
```

### 📄 License

MIT License

---

<p align="center"><b>Made with ❤️</b></p>
