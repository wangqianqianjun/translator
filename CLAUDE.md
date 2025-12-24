# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Translator is a Chrome Extension (Manifest V3) that translates web content using OpenAI-compatible APIs. It supports selection translation, full-page translation, and a floating ball UI.

## Commands

```bash
npm run icons    # Generate extension icons (requires canvas package)
npm run zip      # Create distributable zip file
```

No build step required - the extension loads directly in Chrome as an unpacked extension.

**To test changes**: Load unpacked extension in Chrome via `chrome://extensions/` with Developer Mode enabled, then reload after changes.

## Architecture

### Component Communication Flow

```
[Popup/Options] <--chrome.storage--> [Background Service Worker] <--messages--> [Content Script]
                                            |
                                            v
                                    [OpenAI-compatible API]
```

### Main Components

1. **Background Service Worker** (`background/background.js`)
   - Handles all API requests to translation endpoints
   - Manages context menus and theme icon updates
   - Three translation methods: single, batch (numbered `[1]...[2]...`), fast batch (delimiter-based)
   - Stores default settings and translation prompts

2. **Content Script** (`content/content.js`)
   - Injected into all webpages for DOM interaction
   - Text extraction with code/math detection
   - Batch translation with concurrency control (8 workers, max 2500 chars or 25 items per batch)
   - UI components: selection button, float ball, translation popup, progress bar

3. **Popup** (`popup/`) - Quick access panel for common actions

4. **Options** (`options/`) - Full settings page with API configuration and feature toggles

5. **i18n** (`i18n/messages.js`) - 10+ language translations, auto-selects based on target language

### Key Technical Patterns

- **Math formula preservation**: Detects MathJax/KaTeX elements, replaces with placeholders during translation, restores after
- **Code detection**: Regex patterns skip non-human text (code blocks, JSON, Markdown syntax)
- **Storage**: Chrome sync storage for cross-device settings
- **Theming**: CSS variables for dark/light theme support

### API Compatibility

Works with any OpenAI Chat Completions-compatible API:
- OpenAI, Azure OpenAI, Claude (via compatible endpoints), Ollama, LM Studio
- Request format: `{model, messages, temperature, max_tokens}`
- Response: `{choices[0].message.content}`

## Default Configuration

```javascript
apiEndpoint: 'https://api.openai.com/v1/chat/completions'
modelName: 'gpt-4o-mini'
targetLang: 'zh-CN'
theme: 'dark'
```
