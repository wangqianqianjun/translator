// AI Translator Content Script Hover Translation
(function() {
  'use strict';

  const ctx = window.AI_TRANSLATOR_CONTENT;
  if (!ctx) return;

  const { settings, constants, state } = ctx;
  const { MATH_CONTAINER_SELECTOR } = constants;
  const t = ctx.t;

  const BLOCK_TAGS = new Set([
    'P', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
    'BLOCKQUOTE', 'FIGCAPTION', 'DT', 'DD'
  ]);
  const SKIP_SELECTOR = '.ai-translator-popup, .ai-translator-inline-block, .ai-translator-hover-translation, .ai-translator-selection-translation, #ai-translator-float-ball, #ai-translator-float-menu, #ai-translator-progress, #ai-translator-selection-btn';
  const SKIP_TAG_SELECTOR = 'script, style, noscript, iframe, textarea, input, select, code, pre, svg, canvas, kbd, samp, var';
  const POSITION_CLASSES = /\b(absolute|fixed|sticky|relative|inset-\S*|top-\S*|bottom-\S*|left-\S*|right-\S*|z-\S*)\b/g;

  let hotkeyDown = false;
  let activeHotkey = null;

  const INLINE_SOURCE_CLASS = 'ai-translator-inline-source';
  const hoverTranslations = new Map();
  const selectionTranslations = new Map();
  const inlineTranslationSources = new WeakMap();
  const hoverRequestIds = new Map();
  const selectionRequestIds = new Map();

  const translationCache = new WeakMap();

  function markInlineSource(block, kind) {
    if (!block) return;
    block.classList.add(INLINE_SOURCE_CLASS);
    if (kind === 'hover') {
      block.dataset.aiTranslatorInlineHover = '1';
    } else if (kind === 'selection') {
      block.dataset.aiTranslatorInlineSelection = '1';
    }
  }

  function unmarkInlineSource(block, kind) {
    if (!block) return;
    if (kind === 'hover') {
      delete block.dataset.aiTranslatorInlineHover;
    } else if (kind === 'selection') {
      delete block.dataset.aiTranslatorInlineSelection;
    }
    if (!block.dataset.aiTranslatorInlineHover && !block.dataset.aiTranslatorInlineSelection) {
      block.classList.remove(INLINE_SOURCE_CLASS);
    }
  }

  function trackInlineTranslation(block, translationEl, kind) {
    if (!block || !translationEl) return;
    const map = kind === 'hover' ? hoverTranslations : selectionTranslations;
    const existing = map.get(block);
    if (existing && existing !== translationEl) {
      inlineTranslationSources.delete(existing);
      existing.remove();
    }
    map.set(block, translationEl);
    inlineTranslationSources.set(translationEl, block);
    markInlineSource(block, kind);
  }

  function bumpRequestId(map, block) {
    const next = (map.get(block) || 0) + 1;
    map.set(block, next);
    return next;
  }

  function removeInlineTranslation(block, kind) {
    const map = kind === 'hover' ? hoverTranslations : selectionTranslations;
    if (!block || !map.has(block)) return;
    bumpRequestId(kind === 'hover' ? hoverRequestIds : selectionRequestIds, block);
    const translationEl = map.get(block);
    if (translationEl) {
      inlineTranslationSources.delete(translationEl);
      translationEl.remove();
    }
    map.delete(block);
    unmarkInlineSource(block, kind);
  }

  function clearInlineTranslations(map, kind) {
    const blocks = Array.from(map.keys());
    blocks.forEach((block) => removeInlineTranslation(block, kind));
  }

  function clearInlineTranslationsForBlock(block) {
    removeInlineTranslation(block, 'hover');
    removeInlineTranslation(block, 'selection');
  }

  function hasInlineTranslation(block) {
    return hoverTranslations.has(block) || selectionTranslations.has(block);
  }

  function setupHoverTranslation() {
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    document.addEventListener('mouseover', handleMouseOver, true);
    document.addEventListener('contextmenu', handleContextMenu, true);
  }

  function getHoverHotkey() {
    const hotkey = settings.hoverTranslationHotkey || 'Shift';
    if (hotkey === 'Shift' || hotkey === 'Alt' || hotkey === 'Control' || hotkey === 'Meta') {
      return hotkey;
    }
    return 'Shift';
  }

  function isHotkeyEvent(event) {
    return event.key === getHoverHotkey();
  }

  function isHotkeyModifierActive(event) {
    const hotkey = getHoverHotkey();
    if (hotkey === 'Shift') return event.shiftKey;
    if (hotkey === 'Alt') return event.altKey;
    if (hotkey === 'Control') return event.ctrlKey;
    if (hotkey === 'Meta') return event.metaKey;
    return false;
  }

  function getHoveredTarget() {
    const hovered = document.querySelectorAll(':hover');
    return hovered.length ? hovered[hovered.length - 1] : null;
  }

  function handleKeyDown(event) {
    if (!settings.enableHoverTranslation) return;
    if (!isHotkeyEvent(event)) return;
    if (event.repeat) return;

    hotkeyDown = true;
    activeHotkey = event.key;

    const block = resolveBlockFromTarget(getHoveredTarget());
    if (!block) return;

    if (hoverTranslations.has(block)) {
      removeInlineTranslation(block, 'hover');
      return;
    }

    translateHoverBlock(block);
  }

  function handleKeyUp(event) {
    if (event.key !== activeHotkey) return;
    hotkeyDown = false;
    activeHotkey = null;
  }

  function handleMouseOver(event) {
    const hotkeyActive = hotkeyDown || isHotkeyModifierActive(event);
    if (!hotkeyActive || !settings.enableHoverTranslation) return;
    if (!hotkeyDown) {
      hotkeyDown = true;
      activeHotkey = getHoverHotkey();
    }

    const block = resolveBlockFromTarget(event.target);
    if (!block || hoverTranslations.has(block)) return;

    translateHoverBlock(block);
  }

  function handleContextMenu(event) {
    const translationEl = event.target.closest('.ai-translator-inline-block');
    if (translationEl && inlineTranslationSources.has(translationEl)) {
      const block = inlineTranslationSources.get(translationEl);
      if (block) clearInlineTranslationsForBlock(block);
      return;
    }

    const block = resolveBlockFromTarget(event.target);
    if (!block || !hasInlineTranslation(block)) return;
    clearInlineTranslationsForBlock(block);
  }

  function clearHoverTranslation() {
    clearInlineTranslations(hoverTranslations, 'hover');
  }

  function clearSelectionTranslation() {
    clearInlineTranslations(selectionTranslations, 'selection');
  }

  function resolveBlockFromTarget(target) {
    if (!target) return null;
    let el = target.nodeType === Node.ELEMENT_NODE ? target : target.parentElement;
    if (!el) return null;

    if (el.closest(SKIP_SELECTOR)) return null;
    if (el.closest(SKIP_TAG_SELECTOR)) return null;
    if (MATH_CONTAINER_SELECTOR && el.closest(MATH_CONTAINER_SELECTOR)) return null;

    while (el && el !== document.body && el !== document.documentElement) {
      if (BLOCK_TAGS.has(el.tagName)) {
        if (!isValidBlock(el)) return null;
        return el;
      }
      el = el.parentElement;
    }

    return null;
  }

  function isValidBlock(element) {
    if (!element || element.nodeType !== Node.ELEMENT_NODE) return false;
    if (element.isContentEditable) return false;
    if (element.closest(SKIP_SELECTOR)) return false;
    if (element.closest(SKIP_TAG_SELECTOR)) return false;
    if (MATH_CONTAINER_SELECTOR && element.closest(MATH_CONTAINER_SELECTOR)) return false;
    if (element.classList.contains('ai-translator-translated')) return false;
    if (ctx.isMathElement && ctx.isMathElement(element)) return false;
    return true;
  }

  function getBlockText(element) {
    if (ctx.getTextWithMathPlaceholders) {
      return ctx.getTextWithMathPlaceholders(element);
    }
    return { text: element.textContent?.trim() || '', mathElements: [] };
  }

  function buildCacheKey(text, targetLang) {
    return `${targetLang || ''}::${text}`;
  }

  function getCachedTranslation(block, cacheKey) {
    const entry = translationCache.get(block);
    if (!entry) return '';
    return entry.get(cacheKey) || '';
  }

  function setCachedTranslation(block, cacheKey, translation) {
    let entry = translationCache.get(block);
    if (!entry) {
      entry = new Map();
      translationCache.set(block, entry);
    }
    entry.set(cacheKey, translation);
  }

  async function translateHoverBlock(block) {
    if (!block || hoverTranslations.has(block)) return;

    const { text, mathElements } = getBlockText(block);
    if (!text || text.length < 2 || text.length > 2000) return;

    const targetLang = ctx.getEffectiveTargetLang ? ctx.getEffectiveTargetLang() : settings.targetLang;
    const cacheKey = buildCacheKey(text, targetLang);
    const cached = getCachedTranslation(block, cacheKey);
    if (cached) {
      const translationEl = renderInlineTranslation(block, cached, mathElements, { kind: 'hover' });
      trackInlineTranslation(block, translationEl, 'hover');
      return;
    }

    const requestId = bumpRequestId(hoverRequestIds, block);
    if (!ctx.isExtensionContextAvailable || !ctx.isExtensionContextAvailable()) {
      const translationEl = renderInlineTranslation(block, t('extensionContextInvalidated'), [], { kind: 'hover', isError: true });
      trackInlineTranslation(block, translationEl, 'hover');
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE',
        text,
        targetLang,
        mode: 'text'
      });

      if (hoverRequestIds.get(block) !== requestId) return;

      if (response?.error) {
        const translationEl = renderInlineTranslation(block, response.error, [], { kind: 'hover', isError: true });
        trackInlineTranslation(block, translationEl, 'hover');
        return;
      }

      const translation = response?.translation || '';
      setCachedTranslation(block, cacheKey, translation);
      const translationEl = renderInlineTranslation(block, translation, mathElements, { kind: 'hover' });
      trackInlineTranslation(block, translationEl, 'hover');
    } catch (error) {
      if (hoverRequestIds.get(block) !== requestId) return;
      const message = ctx.isExtensionContextInvalidated && ctx.isExtensionContextInvalidated(error)
        ? t('extensionContextInvalidated')
        : t('translationFailed');
      const translationEl = renderInlineTranslation(block, message, [], { kind: 'hover', isError: true });
      trackInlineTranslation(block, translationEl, 'hover');
    }
  }

  function extractLatexPlaceholders(text) {
    if (!text) return { text: '', mathElements: [] };

    const mathElements = [];
    let mathIndex = 0;

    function addPlaceholder(raw) {
      mathIndex += 1;
      const placeholder = `{{${mathIndex}}}`;
      mathElements.push({ placeholder, type: 'text', text: raw });
      return placeholder;
    }

    function shouldTreatAsInlineLatex(content) {
      const trimmed = content.trim();
      if (!trimmed) return false;
      if (/^\d[\d,.\s]*$/.test(trimmed)) return false;
      if (/\\/.test(trimmed)) return true;
      if (/[\^_={}|<>]/.test(trimmed)) return true;
      if (/[\p{Sm}]/u.test(trimmed)) return true;
      if (/[\p{L}]/u.test(trimmed)) return true;
      return false;
    }

    let result = text;
    result = result.replace(/\\\(([\s\S]+?)\\\)/g, (match) => addPlaceholder(match));
    result = result.replace(/\\\[([\s\S]+?)\\\]/g, (match) => addPlaceholder(match));
    result = result.replace(/\$\$([\s\S]+?)\$\$/g, (match) => addPlaceholder(match));
    result = result.replace(/(^|[^\\])\$([^\n$]+?)\$/g, (match, prefix, inner) => {
      if (!shouldTreatAsInlineLatex(inner)) {
        return match;
      }
      const placeholder = addPlaceholder(`$${inner}$`);
      return prefix + placeholder;
    });

    return { text: result, mathElements };
  }

  function resolveSelectionAnchor(anchorEl) {
    if (anchorEl && anchorEl.nodeType === Node.ELEMENT_NODE) return anchorEl;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const anchorNode = selection.anchorNode || selection.focusNode || selection.getRangeAt(0).commonAncestorContainer;
    if (!anchorNode) return null;

    return anchorNode.nodeType === Node.ELEMENT_NODE ? anchorNode : anchorNode.parentElement;
  }

  async function translateSelectionInline(text, anchorEl) {
    if (!text || !ctx.isSelectionInlineEnabled || !ctx.isSelectionInlineEnabled()) return;

    const anchor = resolveSelectionAnchor(anchorEl);
    const block = resolveBlockFromTarget(anchor);
    if (!block) return;

    state.selectionTranslationPending = true;
    clearSelectionTranslation();

    const extracted = extractLatexPlaceholders(text);
    const safeText = extracted.text;
    const mathElements = extracted.mathElements;

    const targetLang = ctx.getEffectiveTargetLang ? ctx.getEffectiveTargetLang() : settings.targetLang;
    const cacheKey = buildCacheKey(safeText, targetLang);
    const cached = getCachedTranslation(block, cacheKey);
    if (cached) {
      const translationEl = renderInlineTranslation(block, cached, mathElements, { kind: 'selection' });
      trackInlineTranslation(block, translationEl, 'selection');
      state.selectionTranslationPending = false;
      return;
    }

    const requestId = bumpRequestId(selectionRequestIds, block);
    if (!ctx.isExtensionContextAvailable || !ctx.isExtensionContextAvailable()) {
      const translationEl = renderInlineTranslation(block, t('extensionContextInvalidated'), [], { kind: 'selection', isError: true });
      trackInlineTranslation(block, translationEl, 'selection');
      state.selectionTranslationPending = false;
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE',
        text: safeText,
        targetLang,
        mode: 'text'
      });

      if (selectionRequestIds.get(block) !== requestId) {
        state.selectionTranslationPending = false;
        return;
      }

      if (response?.error) {
        const translationEl = renderInlineTranslation(block, response.error, [], { kind: 'selection', isError: true });
        trackInlineTranslation(block, translationEl, 'selection');
        state.selectionTranslationPending = false;
        return;
      }

      const translation = response?.translation || '';
      setCachedTranslation(block, cacheKey, translation);
      const translationEl = renderInlineTranslation(block, translation, mathElements, { kind: 'selection' });
      trackInlineTranslation(block, translationEl, 'selection');
      state.selectionTranslationPending = false;
    } catch (error) {
      if (selectionRequestIds.get(block) !== requestId) {
        state.selectionTranslationPending = false;
        return;
      }
      const message = ctx.isExtensionContextInvalidated && ctx.isExtensionContextInvalidated(error)
        ? t('extensionContextInvalidated')
        : t('translationFailed');
      const translationEl = renderInlineTranslation(block, message, [], { kind: 'selection', isError: true });
      trackInlineTranslation(block, translationEl, 'selection');
      state.selectionTranslationPending = false;
    }
  }

  function showInlineSelectionTranslation(text, translation, anchorEl) {
    if (!text || !ctx.isSelectionInlineEnabled || !ctx.isSelectionInlineEnabled()) return;

    const anchor = resolveSelectionAnchor(anchorEl);
    const block = resolveBlockFromTarget(anchor);
    if (!block) return;

    clearSelectionTranslation();
    const translationEl = renderInlineTranslation(block, translation || '', [], { kind: 'selection' });
    trackInlineTranslation(block, translationEl, 'selection');
  }

  function buildBaseStyle(computedStyle, omitColor = false) {
    return `
      font-size: ${computedStyle.fontSize};
      font-family: ${computedStyle.fontFamily};
      font-weight: ${computedStyle.fontWeight};
      line-height: ${computedStyle.lineHeight};
      text-align: ${computedStyle.textAlign};
      ${omitColor ? '' : `color: ${computedStyle.color};`}
      letter-spacing: ${computedStyle.letterSpacing};
      opacity: 0.85;
    `;
  }

  function renderInlineTranslation(block, translation, mathElements = [], options = {}) {
    const { kind, isError } = options;
    const isHorizontalFlex = ctx.isHorizontalFlexParent ? ctx.isHorizontalFlexParent(block) : false;
    const inlineTarget = isHorizontalFlex && ctx.getInlineTranslationTarget
      ? ctx.getInlineTranslationTarget(block)
      : block;
    const computedStyle = window.getComputedStyle(inlineTarget);
    const className = kind === 'hover' ? 'ai-translator-hover-translation' : 'ai-translator-selection-translation';

    if (isHorizontalFlex) {
      const translationEl = document.createElement('span');
      translationEl.className = `ai-translator-inline-block ai-translator-inline-right ${className}`;

      if (mathElements.length && ctx.buildTranslationContentWithMath) {
        ctx.buildTranslationContentWithMath(translationEl, translation, mathElements, ' ');
      } else {
        translationEl.textContent = ` ${translation}`;
      }

      translationEl.style.cssText = `
        font-size: 0.85em;
        font-family: ${computedStyle.fontFamily};
        font-weight: ${computedStyle.fontWeight};
        line-height: ${computedStyle.lineHeight};
        ${isError ? '' : `color: ${computedStyle.color};`}
        letter-spacing: ${computedStyle.letterSpacing};
        opacity: 0.7;
        display: inline;
        margin: 0;
        padding: 0;
      `;

      if (isError) {
        translationEl.classList.add('ai-translator-error');
      }

      inlineTarget.appendChild(translationEl);
      return translationEl;
    }

    const translationEl = document.createElement(block.tagName);
    if (block.className) {
      translationEl.className = block.className
        .replace('ai-translator-translated', '')
        .replace(POSITION_CLASSES, '')
        .trim();
    }
    translationEl.classList.add('ai-translator-inline-block', className);

    if (mathElements.length && ctx.buildTranslationContentWithMath) {
      ctx.buildTranslationContentWithMath(translationEl, translation, mathElements);
      translationEl.style.opacity = '0.85';
    } else {
      translationEl.textContent = translation;
      translationEl.style.cssText = buildBaseStyle(computedStyle, isError) + `
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      `;
    }

    if (isError) {
      translationEl.classList.add('ai-translator-error');
    }

    if (ctx.getTextOffsetLeft) {
      const textOffset = ctx.getTextOffsetLeft(block);
      if (textOffset > 0) {
        translationEl.style.setProperty('padding-left', `${textOffset}px`, 'important');
      }
    }

    if (block.hasAttribute('slot')) {
      const internalTranslation = document.createElement('span');
      internalTranslation.className = `ai-translator-inline-block ${className}`;

      if (mathElements.length && ctx.buildTranslationContentWithMath) {
        ctx.buildTranslationContentWithMath(internalTranslation, translation, mathElements);
        internalTranslation.style.opacity = '0.85';
      } else {
        internalTranslation.textContent = translation;
        internalTranslation.style.cssText = buildBaseStyle(computedStyle, isError) + `
          display: block;
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        `;
      }

      if (isError) {
        internalTranslation.classList.add('ai-translator-error');
      }
      block.appendChild(internalTranslation);
      return internalTranslation;
    }

    block.after(translationEl);
    return translationEl;
  }

  ctx.setupHoverTranslation = setupHoverTranslation;
  ctx.clearHoverTranslation = clearHoverTranslation;
  ctx.clearSelectionTranslation = clearSelectionTranslation;
  ctx.translateSelectionInline = translateSelectionInline;
  ctx.showInlineSelectionTranslation = showInlineSelectionTranslation;
})();
