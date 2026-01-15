// AI Translator Content Script Bootstrap
(function() {
  'use strict';

  const ctx = window.AI_TRANSLATOR_CONTENT || {};
  window.AI_TRANSLATOR_CONTENT = ctx;

  if (!ctx.constants) {
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
  }

  if (!ctx.settings) {
    ctx.settings = {
      enableSelection: true,
      enableHoverTranslation: true,
      showFloatBall: true,
      autoDetect: true,
      targetLang: 'zh-CN',
      theme: 'light'
    };
  }

  if (!ctx.state) {
    ctx.state = {
      translationPopup: null,
      floatBall: null,
      floatBallContainer: null,
      floatMenu: null,
      inputDialog: null,
      selectionButton: null,
      lastSelectedText: '',
      lastSelectionPos: { x: 0, y: 0 },
      lastSelectionElement: null,
      isTranslatingPage: false,
      floatBallDragged: false,
      translationsVisible: true,
      translationProgress: { current: 0, total: 0 },
      pageHasBeenTranslated: false,
      translationRequestId: 0,
      selectionTranslationPending: false
    };
  }

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
        enableHoverTranslation: true,
        showFloatBall: true,
        autoDetect: true,
        targetLang: 'zh-CN',
        theme: 'light'
      });
      Object.assign(ctx.settings, result);
      ctx.applyTheme(ctx.settings.theme);
    } catch (error) {
      console.error('AI Translator: Failed to load settings', error);
      Object.assign(ctx.settings, {
        enableSelection: true,
        enableHoverTranslation: true,
        showFloatBall: true,
        autoDetect: true,
        targetLang: 'zh-CN',
        theme: 'light'
      });
    }
    console.log('AI Translator: Settings loaded', {
      showFloatBall: ctx.settings.showFloatBall,
      theme: ctx.settings.theme
    });
  };

  ctx.setupStorageListener = function() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== 'sync') return;

      if (changes.showFloatBall) {
        console.log('AI Translator: Storage changed, showFloatBall:', changes.showFloatBall.oldValue, '->', changes.showFloatBall.newValue);
        ctx.settings.showFloatBall = changes.showFloatBall.newValue;
        if (ctx.updateFloatBallVisibility) {
          ctx.updateFloatBallVisibility();
        }
      }

      if (changes.theme) {
        ctx.settings.theme = changes.theme.newValue;
        ctx.applyTheme(ctx.settings.theme);
      }
    });
  };

  ctx.init = async function() {
    console.log('AI Translator: Initializing...');
    try {
      await ctx.loadSettings();
      if (ctx.setupSelectionListener) ctx.setupSelectionListener();
      if (ctx.setupHoverTranslation) ctx.setupHoverTranslation();
      if (ctx.setupMessageListener) ctx.setupMessageListener();
      ctx.setupStorageListener();
      if (ctx.createFloatBall) ctx.createFloatBall();
      console.log('AI Translator: Initialization complete, showFloatBall =', ctx.settings.showFloatBall);
    } catch (error) {
      console.error('AI Translator: Initialization failed', error);
    }
  };
})();
