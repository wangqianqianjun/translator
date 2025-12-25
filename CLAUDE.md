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

## Bug Fixing Guidelines

修复 bug 时必须遵循以下流程：

1. **先找 Root Cause** - 不要急于修复表面症状，必须先定位根本原因
2. **代码层面排查** - 通过阅读代码、git history、日志分析等方式定位问题
3. **需要更多信息时主动询问** - 如果代码层面难以排查，应向用户请求：
   - Console 日志输出
   - 复现步骤
   - 环境信息（浏览器版本、页面 URL 等）
   - 截图或录屏
   - 相关的 DOM 结构或网络请求
4. **记录 Root Cause** - 在 commit message 中说明根本原因，而不仅仅是"修复了 XX 问题"
5. **验证修复** - 确保修复方案真正解决了根本原因，而不是绕过问题

## Default Configuration

```javascript
apiEndpoint: 'https://api.openai.com/v1/chat/completions'
modelName: 'gpt-4o-mini'
targetLang: 'zh-CN'
theme: 'dark'
```
