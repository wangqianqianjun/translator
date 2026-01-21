# YouTube Caption Translation + Fullscreen Float Ball Hide - Design

**Goal**
Add YouTube subtitle translation with a rolling 120s prefetch window and bilingual rendering (original line + translated line) plus auto-hide float ball while any element is fullscreen. Subtitle translation is gated by a feature setting (default off) and does not auto-enable CC.

## Requirements (Confirmed)
- Scope: YouTube only.
- Caption rendering: bilingual, original line + translated line beneath it.
- If caption language == target language, do not translate.
- Feature flag in Options and Popup; default off.
- Do not auto-enable CC; only translate when captions are already on.
- Prefetch window: 120 seconds ahead of playback time.
- Float ball: hide when `document.fullscreenElement` is truthy; restore on exit without changing user preference.

## Non-Goals
- Non-YouTube sites.
- DOM-only subtitle scraping fallback.
- Auto-toggle captions on YouTube.

## Architecture Overview
- New content module `content/content-youtube-captions.js` loaded by `manifest.json` and activated only on `youtube.com`.
- Captions are discovered via a page-context injector that reads `ytInitialPlayerResponse.captions.playerCaptionsTracklistRenderer.captionTracks` and returns tracks to the content script using `window.postMessage`.
- Timedtext is fetched via YouTube caption track URL (prefer `fmt=json3`) and parsed to `{startMs, endMs, text}` cues.
- A rolling 120s prefetch window enqueues upcoming cues for translation using existing `TRANSLATE_BATCH_FAST` in the background service worker.
- Translated cues are rendered as a second line inside the YouTube caption window container.

## Data Flow
1. Content script loads settings; exits early if feature flag is disabled.
2. On YouTube page ready (and SPA navigation changes), inject a small script to read caption tracks and post them back.
3. Select active caption track; if track language matches target language, disable translation for this video.
4. Detect captions enabled state (e.g., `.ytp-subtitles-button[aria-pressed="true"]` or caption container present). If captions are off, idle and retry.
5. Fetch timedtext JSON and parse cues.
6. On playback time updates, identify cues in [now, now + 120s] window; batch-translate uncached cues.
7. Render translated line under native captions, aligned with YouTube caption container styling.

## Component Details
- `content/content-youtube-captions.js`
  - Track discovery via injected script + `postMessage`.
  - Caption-enabled detection.
  - Timedtext fetch + parse (json3).
  - Translation queue with dedupe key `(trackId, startMs, text)` and cache.
  - Rolling prefetch window logic.
  - Overlay rendering inside `.ytp-caption-window-container`.
- `content/content-float-ball.js`
  - Add `fullscreenchange` listener; hide/show float ball at runtime without mutating `showFloatBall` in storage.
- `options/options.html` + `options/options.js`
  - New Feature Settings section with `enableYoutubeCaptionTranslation` toggle.
- `popup/popup.html` + `popup/popup.js`
  - Quick toggle for YouTube subtitle translation.
- `i18n/messages.js`
  - New strings for Feature Settings and toggle labels.

## Error Handling & Resilience
- If captions are unavailable or track discovery fails, log and disable subtitle translation for this video.
- Timedtext fetch retries with backoff (e.g., 0.5s, 2s, 5s) and then stops for current video.
- If language detection is unreliable (missing track language), sample a few cues and use `chrome.i18n.detectLanguage` to decide whether to translate; if unsure, proceed with translation.
- Translation failures keep original captions; retries allowed within a small budget.

## Performance
- Translation batching uses existing fast delimiter-based path; batch size capped (e.g., 10-20 cues) to control latency.
- Cache prevents repeat translation of the same cue.
- Rendering uses minimal DOM updates and `pointer-events: none`.

## Testing Plan
- Unit-ish tests for timedtext parsing, prefetch window selection, dedupe key logic.
- Integration/e2e (Playwright or fixtures):
  - Feature toggle enable/disable via Options and Popup.
  - Captions off => no overlay.
  - Captions on => translated line appears.
  - Target language equals track language => no translation requests.
  - Fullscreen hides float ball; exit restores.

## Open Questions
- None.
