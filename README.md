# AI Translator - Chrome Extension

**[🇨🇳 中文文档](./README_CN.md)**

---

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

**Made with ❤️**
