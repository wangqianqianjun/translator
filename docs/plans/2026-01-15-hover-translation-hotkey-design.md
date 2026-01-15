# Hover Translation Hotkey Design

## Goal
Make hover translation use a configurable modifier key (default Shift), keep translations persistent until toggled off, and decouple selection translation from hover translation.

## Summary
Hover translation will be triggered by a modifier key (Shift/Alt/Ctrl/Meta) plus hover, with translations inserted below the paragraph and kept visible until the same hotkey is pressed again while hovering the paragraph. The hover hotkey is stored in `chrome.storage.sync` as `hoverTranslationHotkey`, with default Shift. Selection translation gets its own settings: `enableSelection` remains the toggle for showing the selection button, while `selectionTranslationMode` determines inline vs popup display for selection translations (including context menu results). Hover translation no longer affects selection translation behavior.

## Behavior Details
When the user holds the configured modifier and hovers a paragraph, translation is requested and inserted as a sibling below the block. Releasing the modifier does not remove the translation. If the user presses the modifier again while hovering the same paragraph, the translation is removed to restore the original. Hover translation respects `enableHoverTranslation` and skips inputs, editable fields, math, code, and extension UI. Selection translation respects `enableSelection` and `selectionTranslationMode`, with inline translation reusing the existing placeholder and math reinsertion flow.

## Settings and UI
The options page adds a dropdown for the hover hotkey (Shift/Alt/Ctrl/Meta) and a dropdown for selection translation display (inline below paragraph vs popup). Hints are updated to clarify the default modifier and the inline/popup behavior. Existing settings remain backward compatible with sensible defaults.

## Risks and Mitigations
Hover toggling relies on accurate block detection under the pointer; to reduce misses, the hovered block will be tracked via mouse events and `elementFromPoint` fallback. To avoid unwanted triggers, key handling ignores inputs and repeated keydown events. All inline translations are tracked per block so toggling off removes only the correct translation.
