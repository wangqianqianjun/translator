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
  let hoverBlock = null;
  let hoverTranslationEl = null;
  let hoverRequestId = 0;
  let selectionTranslationEl = null;
  let selectionRequestId = 0;

  const translationCache = new WeakMap();

  function setupHoverTranslation() {
    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('keyup', handleKeyUp, true);
    document.addEventListener('mouseover', handleMouseOver, true);
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

    if (hoverBlock === block && hoverTranslationEl) {
      clearHoverTranslation();
      return;
    }

    removeHoverTranslationElement();
    hoverBlock = block;
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
    if (!block || block === hoverBlock) return;

    removeHoverTranslationElement();
    hoverBlock = block;
    translateHoverBlock(block);
  }

  function clearHoverTranslation() {
    hoverRequestId += 1;
    removeHoverTranslationElement();
    hoverBlock = null;
  }

  function removeHoverTranslationElement() {
    if (hoverTranslationEl) {
      hoverTranslationEl.remove();
      hoverTranslationEl = null;
    }
  }

  function clearSelectionTranslation() {
    selectionRequestId += 1;
    if (selectionTranslationEl) {
      selectionTranslationEl.remove();
      selectionTranslationEl = null;
    }
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
    if (!block) return;

    const { text, mathElements } = getBlockText(block);
    if (!text || text.length < 2 || text.length > 2000) return;

    const targetLang = ctx.getEffectiveTargetLang ? ctx.getEffectiveTargetLang() : settings.targetLang;
    const cacheKey = buildCacheKey(text, targetLang);
    const cached = getCachedTranslation(block, cacheKey);
    if (cached) {
      hoverTranslationEl = renderInlineTranslation(block, cached, mathElements, { kind: 'hover' });
      return;
    }

    const requestId = ++hoverRequestId;
    if (!ctx.isExtensionContextAvailable || !ctx.isExtensionContextAvailable()) {
      hoverTranslationEl = renderInlineTranslation(block, t('extensionContextInvalidated'), [], { kind: 'hover', isError: true });
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE',
        text,
        targetLang,
        mode: 'text'
      });

      if (requestId !== hoverRequestId || block !== hoverBlock) return;

      if (response?.error) {
        hoverTranslationEl = renderInlineTranslation(block, response.error, [], { kind: 'hover', isError: true });
        return;
      }

      const translation = response?.translation || '';
      setCachedTranslation(block, cacheKey, translation);
      hoverTranslationEl = renderInlineTranslation(block, translation, mathElements, { kind: 'hover' });
    } catch (error) {
      if (requestId !== hoverRequestId || block !== hoverBlock) return;
      const message = ctx.isExtensionContextInvalidated && ctx.isExtensionContextInvalidated(error)
        ? t('extensionContextInvalidated')
        : t('translationFailed');
      hoverTranslationEl = renderInlineTranslation(block, message, [], { kind: 'hover', isError: true });
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
      selectionTranslationEl = renderInlineTranslation(block, cached, mathElements, { kind: 'selection' });
      state.selectionTranslationPending = false;
      return;
    }

    const requestId = ++selectionRequestId;
    if (!ctx.isExtensionContextAvailable || !ctx.isExtensionContextAvailable()) {
      selectionTranslationEl = renderInlineTranslation(block, t('extensionContextInvalidated'), [], { kind: 'selection', isError: true });
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

      if (requestId !== selectionRequestId) {
        state.selectionTranslationPending = false;
        return;
      }

      if (response?.error) {
        selectionTranslationEl = renderInlineTranslation(block, response.error, [], { kind: 'selection', isError: true });
        state.selectionTranslationPending = false;
        return;
      }

      const translation = response?.translation || '';
      setCachedTranslation(block, cacheKey, translation);
      selectionTranslationEl = renderInlineTranslation(block, translation, mathElements, { kind: 'selection' });
      state.selectionTranslationPending = false;
    } catch (error) {
      if (requestId !== selectionRequestId) {
        state.selectionTranslationPending = false;
        return;
      }
      const message = ctx.isExtensionContextInvalidated && ctx.isExtensionContextInvalidated(error)
        ? t('extensionContextInvalidated')
        : t('translationFailed');
      selectionTranslationEl = renderInlineTranslation(block, message, [], { kind: 'selection', isError: true });
      state.selectionTranslationPending = false;
    }
  }

  function showInlineSelectionTranslation(text, translation, anchorEl) {
    if (!text || !ctx.isSelectionInlineEnabled || !ctx.isSelectionInlineEnabled()) return;

    const anchor = resolveSelectionAnchor(anchorEl);
    const block = resolveBlockFromTarget(anchor);
    if (!block) return;

    clearSelectionTranslation();
    selectionTranslationEl = renderInlineTranslation(block, translation || '', [], { kind: 'selection' });
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
