# Translator Extension Wiki

## Overview
This Chrome extension translates selected text and full pages using an AI API. It prioritizes performance by batching requests, keeps math/LaTeX intact, and lets users configure their own API provider, key, model, and prompt.

## Core Components
- `manifest.json`: MV3 config, permissions, background service worker, content scripts, options page, popup.
- `background/background.js`: API orchestration, prompt building, error parsing, provider auto-detection.
- `content/content.js`: DOM scanning, batching, page translation, UI overlays, math/LaTeX preservation.
- `options/*`: settings UI (API provider, key, model, prompt, theme).
- `popup/*`: quick actions (translate page, toggle float ball, open settings).
- `i18n/messages.js`: UI localization based on target language.

## Translation Pipeline
1. Content script collects translatable blocks (paragraphs, headings, inline text).
2. Blocks are batched and sent to background via `TRANSLATE_BATCH_FAST`.
3. Background calls OpenAI-compatible or Claude API, returns translations.
4. Content script inserts translated blocks inline or as siblings.

## Batching and Performance
- Token-aware batching with conservative estimates:
  - `MAX_BATCH_TOKENS` (default 3200)
  - `MAX_BATCH_CHARS` and `MAX_BATCH_ITEMS` as secondary guards
- "Soft priority" for first screen: priority batches are queued first but do not block later batches.
- Concurrency pool (default 12) for parallel requests.

## Math and LaTeX Preservation
- Math DOM (MathJax/KaTeX/MathML) is detected and replaced by placeholders.
- Plain-text LaTeX (`$...$`, `$$...$$`, `\(...\)`, `\[...\]`) is replaced by placeholders.
- Prompts always include placeholder preservation rules.
- Placeholders are re-inserted into the translated output without HTML serialization.

## Safety Filters and Skip Rules
- Skip code-like blocks and common code containers.
- Skip table nodes (`TABLE`, `TR`, `TD`, `TH`, etc.) to avoid breaking layouts.
- Skip math containers (`.mjx-chtml`, `.MathJax_CHTML`, `.katex`, etc.) entirely to prevent formula corruption.

## Settings and Customization
- User-configurable: API endpoint, API key, model, target language, custom prompt.
- Custom prompt applies to single, batch, and page translation.
- Batch translations append strict output-format rules to ensure parsing is stable.

## UI and UX Features
- Floating action ball with docking and drag support.
- Selection translation button and translation popup with copy.
- Page translation progress indicator and hide/show translations toggle.

## Error Handling
- Unified API error parsing across vendors (OpenAI, Claude, OpenRouter, etc.).
- User-friendly error messages for common status codes.
