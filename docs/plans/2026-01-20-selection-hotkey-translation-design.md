# Selection Hotkey Translation Design

## Goal
Remove the click-to-show selection button, add a selection hotkey translation path with a configurable modifier (default Ctrl), keep right-click selection translation, and allow canceling via hotkey toggle or Esc.

## Non-Goals
- No changes to background translation APIs, batching, or prompt handling.
- No new UI surface beyond options settings.
- No changes to hover translation behavior.

## User Experience
- Clicking or selecting text no longer shows a translate button.
- After selecting text, pressing the selection hotkey triggers translation.
- Inline vs popup display continues to follow `selectionTranslationMode`.
- Pressing the selection hotkey again cancels the selection translation.
- Esc cancels selection translations and any popup, consistent with current behavior.
- Right-click "Translate Selection" remains available.

## Architecture and Data Flow
Content scripts keep tracking selection state (`lastSelectedText`, `lastSelectionRange`, `lastSelectionElement`, `lastSelectionPos`) but do not render the selection button. A new keydown handler checks:
- `enableSelection` is true
- selection text length is within 2-5000
- target is not inside inputs, contentEditable, or extension UI

On valid hotkey press (no repeats), it clones the selection range and calls:
- `translateSelectionInline(...)` when `selectionTranslationMode === 'inline'`
- `showTranslationPopup(...)` otherwise, positioned via selection rect with fallback to last mouse position

Cancel toggle checks for existing selection translations and/or open selection popup; if present, it clears those instead of starting a new translation. Hover translations are not affected.

## Settings and Validation
Add `selectionTranslationHotkey` to `chrome.storage.sync` with options `Shift`, `Alt`, `Control`, `Meta` and default `Control`. The options UI adds a dropdown under selection settings. When both hover and selection translations are enabled and the hotkeys match, saving is blocked and a status error is shown.

## Error Handling
- Ignore invalid or empty selections.
- Ignore key repeats and input/editable targets.
- On cancel, reset `selectionTranslationPending` and bump request IDs to ignore late responses.

## i18n
Add new messages for:
- selection hotkey label
- selection hotkey hint
- hotkey conflict error

Provide at least `en`, `zh-CN`, and `zh-TW` translations; other languages can fall back to English.

## Testing
Manual checks:
- Selection hotkey triggers inline translation and popup translation.
- Clicking no longer shows selection button.
- Right-click selection translation still works.
- Hotkey toggle cancels selection translation.
- Esc clears inline translations and closes popup.
- Hover translation unaffected.
- Conflict hotkeys block saving with a clear error.
- Input/editable fields are ignored.
