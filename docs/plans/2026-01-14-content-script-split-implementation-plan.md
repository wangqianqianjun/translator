# Content Script Split Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Split `content/content.js` into layered modules without changing behavior.

**Architecture:** Introduce a shared `window.AI_TRANSLATOR_CONTENT` namespace (`ctx`) and move related logic into dedicated files loaded in a fixed order by `manifest.json`. Keep `content/content.js` as a thin entrypoint that calls `ctx.init()`.

**Tech Stack:** Vanilla JS (Chrome extension content scripts), Playwright (existing tests).

---

### Task 1: Add bootstrap module and move shared state/constants

**Files:**
- Create: `content/content-bootstrap.js`
- Modify: `content/content.js`

**Step 1: Write the failing test**

No new tests (refactor only). Note: Playwright currently fails without installed browsers.

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL due to missing Playwright browsers (documented in previous run).

**Step 3: Write minimal implementation**

Create `content/content-bootstrap.js`:
```js
(function() {
  'use strict';
  const ctx = window.AI_TRANSLATOR_CONTENT || {};
  window.AI_TRANSLATOR_CONTENT = ctx;

  ctx.constants = {
    FLOAT_BALL_SIZE: 36,
    EDGE_SNAP_THRESHOLD: 100,
    DOCK_PADDING_FRONT: -6,
    DOCK_PADDING_BACK: 8,
    DOCK_PADDING_VERTICAL: 4,
    MATH_CONTAINER_SELECTOR: 'math, mjx-container, mjx-math, .MathJax, .MathJax_Display, .MathJax_CHTML, .mjx-chtml, .mjx-math, .MJXc-display, .katex, .katex-display',
    TARGET_LANGUAGE_OPTIONS: [
      { value: 'zh-CN', label: '简体中文' },
      { value: 'zh-TW', label: '繁体中文' },
      { value: 'en', label: 'English' },
      { value: 'ja', label: '日本語' },
      { value: 'ko', label: '한국어' },
      { value: 'fr', label: 'Français' },
      { value: 'de', label: 'Deutsch' },
      { value: 'es', label: 'Español' },
      { value: 'pt', label: 'Português' },
      { value: 'ru', label: 'Русский' }
    ]
  };

  ctx.settings = ctx.settings || {
    enableSelection: true,
    showFloatBall: true,
    autoDetect: true,
    targetLang: 'zh-CN',
    theme: 'light'
  };

  ctx.state = ctx.state || {
    translationPopup: null,
    floatBall: null,
    floatBallContainer: null,
    floatMenu: null,
    inputDialog: null,
    selectionButton: null,
    lastSelectedText: '',
    lastSelectionPos: { x: 0, y: 0 },
    isTranslatingPage: false,
    floatBallDragged: false,
    translationsVisible: true,
    translationProgress: { current: 0, total: 0 },
    pageHasBeenTranslated: false,
    translationRequestId: 0
  };

  ctx.t = function(key) {
    const uiLang = getUILanguage(ctx.settings.targetLang);
    return getMessage(key, uiLang);
  };

  ctx.applyTheme = function(theme) {
    document.documentElement.setAttribute('data-ai-translator-theme', theme);
  };

  ctx.isExtensionContextAvailable = function() {
    return typeof chrome !== 'undefined' && chrome?.runtime?.sendMessage;
  };

  ctx.isExtensionContextInvalidated = function(error) {
    if (!ctx.isExtensionContextAvailable()) return true;
    if (!error) return false;
    const message = String(error?.message || error);
    return message.includes('Extension context invalidated');
  };

  ctx.loadSettings = async function() {
    try {
      const result = await chrome.storage.sync.get({
        enableSelection: true,
        showFloatBall: true,
        autoDetect: true,
        targetLang: 'zh-CN',
        theme: 'light'
      });
      Object.assign(ctx.settings, result);
      ctx.applyTheme(ctx.settings.theme);
    } catch (error) {
      Object.assign(ctx.settings, {
        enableSelection: true,
        showFloatBall: true,
        autoDetect: true,
        targetLang: 'zh-CN',
        theme: 'light'
      });
    }
  };

  ctx.setupStorageListener = function() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== 'sync') return;
      if (changes.showFloatBall) {
        ctx.settings.showFloatBall = changes.showFloatBall.newValue;
        if (ctx.updateFloatBallVisibility) ctx.updateFloatBallVisibility();
      }
      if (changes.theme) {
        ctx.settings.theme = changes.theme.newValue;
        ctx.applyTheme(ctx.settings.theme);
      }
    });
  };

  ctx.init = async function() {
    try {
      await ctx.loadSettings();
      if (ctx.setupSelectionListener) ctx.setupSelectionListener();
      if (ctx.setupMessageListener) ctx.setupMessageListener();
      ctx.setupStorageListener();
      if (ctx.createFloatBall) ctx.createFloatBall();
    } catch (error) {
      console.error('AI Translator: Initialization failed', error);
    }
  };
})();
```

Update `content/content.js` to only call `window.AI_TRANSLATOR_CONTENT.init()`.

**Step 4: Run test to verify it passes**

Run: `npm test`  
Expected: FAIL (missing Playwright browsers).

**Step 5: Commit**

```bash
git add content/content-bootstrap.js content/content.js
git commit -m "refactor: add content script bootstrap module"
```

---

### Task 2: Extract utilities and language helpers

**Files:**
- Create: `content/content-utils.js`
- Create: `content/content-language.js`
- Modify: `content/content.js`

**Step 1: Write the failing test**

No new tests.

**Step 2: Run test to verify it fails**

Run: `npm test`  
Expected: FAIL (missing Playwright browsers).

**Step 3: Write minimal implementation**

Move to `content/content-utils.js`:
```js
(function() {
  'use strict';
  const ctx = window.AI_TRANSLATOR_CONTENT;
  ctx.escapeHtml = function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  };
  ctx.copyToClipboard = async function(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
  };
})();
```

Move to `content/content-language.js`:
```js
(function() {
  'use strict';
  const ctx = window.AI_TRANSLATOR_CONTENT;
  const options = ctx.constants.TARGET_LANGUAGE_OPTIONS;

  ctx.getEffectiveTargetLang = function() {
    if (ctx.settings.targetLang) return ctx.settings.targetLang;
    return navigator.language || navigator.userLanguage || 'en';
  };
  ctx.normalizeTargetLang = function(lang) { /* move existing logic */ };
  ctx.getTargetLangLabel = function(lang) { /* move existing logic */ };
  ctx.buildTargetLangMenu = function(selectedLang) { /* move existing logic */ };
  ctx.getLangBase = function(lang) { /* move existing logic */ };
  ctx.getLanguageDetectionText = function(text) { /* move existing logic */ };
})();
```

Update `content/content.js` to remove the moved helper functions and use `ctx.*` references.

**Step 4: Run test to verify it passes**

Run: `npm test`  
Expected: FAIL (missing Playwright browsers).

**Step 5: Commit**

```bash
git add content/content-utils.js content/content-language.js content/content.js
git commit -m "refactor: extract content utils and language helpers"
```

---

### Task 3: Extract float ball and selection UI

**Files:**
- Create: `content/content-float-ball.js`
- Create: `content/content-selection.js`
- Modify: `content/content.js`

**Step 1: Write the failing test**

No new tests.

**Step 2: Run test to verify it fails**

Run: `npm test`  
Expected: FAIL (missing Playwright browsers).

**Step 3: Write minimal implementation**

Move float ball related functions, DOM nodes, and handlers to `content/content-float-ball.js`. Attach functions to `ctx`:
- `createFloatBall`
- `ensureFloatBallExists`
- `updateFloatBallVisibility`
- `adjustFloatBallPosition`
- `showFloatMenu`
- `hideFloatMenu`
- `toggleTranslationsVisibility`
- `positionDockContainer`

Move selection logic to `content/content-selection.js` and attach:
- `setupSelectionListener`
- `showSelectionButton`
- `hideSelectionButton`
- `getSelectedText`

Update references to use `ctx.state` (e.g., `ctx.state.floatBall`) and helper functions (`ctx.t`, `ctx.applyTheme`, etc.).

**Step 4: Run test to verify it passes**

Run: `npm test`  
Expected: FAIL (missing Playwright browsers).

**Step 5: Commit**

```bash
git add content/content-float-ball.js content/content-selection.js content/content.js
git commit -m "refactor: extract float ball and selection modules"
```

---

### Task 4: Extract popup and input dialog flows

**Files:**
- Create: `content/content-popup.js`
- Create: `content/content-input-dialog.js`
- Modify: `content/content.js`

**Step 1: Write the failing test**

No new tests.

**Step 2: Run test to verify it fails**

Run: `npm test`  
Expected: FAIL (missing Playwright browsers).

**Step 3: Write minimal implementation**

Move translation popup and `translateText` flow into `content/content-popup.js`. Export on ctx:
- `showTranslationPopup`
- `showTranslationResult`
- `hideTranslationPopup`
- `setupPopupDrag`
- `setupLanguageDropdown`
- `translateText`
- `showCopyFeedback`
- `isSingleWordText`
- `getDetectedLang`
- `speakText`

Move input dialog UI and flow into `content/content-input-dialog.js`:
- `showInputDialog`
- `hideInputDialog`

Update all references to use `ctx.copyToClipboard`, `ctx.escapeHtml`, and shared state.

**Step 4: Run test to verify it passes**

Run: `npm test`  
Expected: FAIL (missing Playwright browsers).

**Step 5: Commit**

```bash
git add content/content-popup.js content/content-input-dialog.js content/content.js
git commit -m "refactor: extract popup and input dialog modules"
```

---

### Task 5: Extract page translation pipeline

**Files:**
- Create: `content/content-page-translation.js`
- Modify: `content/content.js`

**Step 1: Write the failing test**

No new tests.

**Step 2: Run test to verify it fails**

Run: `npm test`  
Expected: FAIL (missing Playwright browsers).

**Step 3: Write minimal implementation**

Move batching, DOM scan, math placeholder handling, insertion, and progress UI into `content/content-page-translation.js`. Export functions on ctx:
- `translatePage`
- `collectTranslatableBlocks`
- `createSmartBatches`
- `splitBlocksByViewport`
- `runWithConcurrency`
- `shouldSkipTranslation`
- `filterBlocksByLanguage`
- `insertTranslationBlock`
- `buildTranslationContentWithMath`
- `showPageTranslationProgress`
- `updatePageTranslationProgress`
- `hidePageTranslationProgress`
- `showTranslationError`
- `showAlreadyTranslatedMessage`
- `showTranslatingHint`
- `forceHideProgressBar`
- plus math helpers: `isMathElement`, `isIconElement`, `getTextWithMathPlaceholders`, `getTextOffsetLeft`, `isHorizontalFlexParent`, `getInlineTranslationTarget`

Update uses of constants via `ctx.constants.*` and state via `ctx.state`.

**Step 4: Run test to verify it passes**

Run: `npm test`  
Expected: FAIL (missing Playwright browsers).

**Step 5: Commit**

```bash
git add content/content-page-translation.js content/content.js
git commit -m "refactor: extract page translation pipeline"
```

---

### Task 6: Extract message listener and finalize entrypoint

**Files:**
- Create: `content/content-messaging.js`
- Modify: `content/content.js`
- Modify: `manifest.json`

**Step 1: Write the failing test**

No new tests.

**Step 2: Run test to verify it fails**

Run: `npm test`  
Expected: FAIL (missing Playwright browsers).

**Step 3: Write minimal implementation**

Move runtime message handling into `content/content-messaging.js` and export `setupMessageListener`.

Update `manifest.json` content scripts order:
```json
"js": [
  "i18n/messages.js",
  "content/content-bootstrap.js",
  "content/content-utils.js",
  "content/content-language.js",
  "content/content-float-ball.js",
  "content/content-selection.js",
  "content/content-popup.js",
  "content/content-input-dialog.js",
  "content/content-page-translation.js",
  "content/content-messaging.js",
  "content/content.js"
]
```

Ensure `content/content.js` only calls:
```js
(function() {
  'use strict';
  window.AI_TRANSLATOR_CONTENT?.init?.();
})();
```

**Step 4: Run test to verify it passes**

Run: `npm test`  
Expected: FAIL (missing Playwright browsers).

**Step 5: Commit**

```bash
git add content/content-messaging.js content/content.js manifest.json
git commit -m "refactor: extract messaging and wire content script order"
```

---

### Task 7: Sanity check and summary

**Files:**
- Modify: `docs/plans/2026-01-14-content-script-split-implementation-plan.md`

**Step 1: Write the failing test**

No tests.

**Step 2: Run test to verify it fails**

Skip (tests require Playwright install).

**Step 3: Write minimal implementation**

Add a short note in the plan about Playwright browser install requirement and the fixture change.

Notes:
- Playwright requires `npx playwright install` to download the Chromium browser used by tests.
- Fixed `test/e2e/fixtures.js` CommonJS destructuring (`test: base`) to avoid syntax errors.

**Step 4: Run test to verify it passes**

Skip.

**Step 5: Commit**

```bash
git add docs/plans/2026-01-14-content-script-split-implementation-plan.md
git commit -m "docs: note test environment requirements"
```
