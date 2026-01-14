# Content Script Split Design (No Build)

Date: 2026-01-14
Status: Approved

## Context
`content/content.js` is ~2900 lines and mixes UI, DOM scanning, batching, and messaging. This makes changes risky and hard to reason about.

## Goals
- Split content script by responsibility without behavior changes.
- Keep performance and batching behavior identical.
- Avoid adding a build step or ESM imports.
- Reduce cross-feature coupling and make future changes safer.

## Non-goals
- No functional changes or UI redesigns.
- No new settings or translation logic changes.
- No changes to background or options scripts.

## Constraints
- No build step or bundler.
- Content scripts must load in a strict order via `manifest.json`.
- Use ASCII for code and documentation updates.

## Proposed Module Layout
All modules attach functions and state to a shared namespace `window.AI_TRANSLATOR_CONTENT` (`ctx`).

- `content/content-bootstrap.js`
  - Create `ctx`, settings defaults, and shared state.
  - `t()`, `applyTheme()`, `loadSettings()`, `setupStorageListener()`, `init()`.
- `content/content-utils.js`
  - `escapeHtml()`, `copyToClipboard()`, extension context guards.
- `content/content-language.js`
  - Target language options and helpers.
  - `normalizeTargetLang()`, `getTargetLangLabel()`, `buildTargetLangMenu()`, `getEffectiveTargetLang()`.
- `content/content-float-ball.js`
  - Float ball UI, dock logic, float menu actions, visibility updates.
- `content/content-selection.js`
  - Selection button, tracking, and triggers.
- `content/content-popup.js`
  - Translation popup UI, drag behavior, `translateText()`, `showTranslationResult()`.
- `content/content-input-dialog.js`
  - Input translation dialog UI and flow.
- `content/content-page-translation.js`
  - DOM scanning, math placeholders, batching, concurrency, insertions, progress UI.
- `content/content-messaging.js`
  - `setupMessageListener()` and message dispatch.
- `content/content.js`
  - Thin entrypoint calling `ctx.init()`.

## Load Order
`manifest.json` will load content scripts in this order:
1) `i18n/messages.js`
2) `content/content-bootstrap.js`
3) `content/content-utils.js`
4) `content/content-language.js`
5) `content/content-float-ball.js`
6) `content/content-selection.js`
7) `content/content-popup.js`
8) `content/content-input-dialog.js`
9) `content/content-page-translation.js`
10) `content/content-messaging.js`
11) `content/content.js`

## State and Data Flow
`ctx.settings` and `ctx.state` hold shared values. Updates use `Object.assign` to preserve object identity across modules.

Paths:
- Selection -> popup -> `translateText()` -> background -> UI update.
- Float ball -> translate page -> page translation pipeline -> progress UI.
- Runtime messages -> settings merge -> update theme/float ball and show results.

## Error Handling
- Use `isExtensionContextAvailable()` guard before messaging.
- Map "Extension context invalidated" to localized UI text.
- Batch translation errors are aggregated and shown once in progress UI.
- Closing the progress bar does not cancel translation (status only).

## Testing
- Run existing Playwright specs:
  - `npm run test:float-ball`
  - `npm run test:sidebar`
  - `npm run test:math`
  - `npm run test:nav`
- Manual smoke test: selection translate, page translate, toggle translations, input dialog, close progress bar.

## Migration Steps
1) Create new module files and move code without behavior changes.
2) Replace direct globals with `ctx` references.
3) Update `manifest.json` content script order.
4) Keep `content/content.js` as entrypoint only.
