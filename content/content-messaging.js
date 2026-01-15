// AI Translator Content Script Messaging
(function() {
  'use strict';

  const ctx = window.AI_TRANSLATOR_CONTENT;
  if (!ctx) return;

  const { settings } = ctx;
  const applyTheme = ctx.applyTheme;

  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('AI Translator: Received message', message.type, message);
      switch (message.type) {
        case 'TRANSLATE_PAGE':
          if (ctx.translatePage) {
            ctx.translatePage();
          }
          break;
        case 'SHOW_TRANSLATION':
          // 右键菜单翻译选中文本的结果显示
          if (!settings.enableSelection) break;
          if (ctx.isSelectionInlineEnabled && ctx.isSelectionInlineEnabled() && ctx.showInlineSelectionTranslation) {
            ctx.showInlineSelectionTranslation(message.text, message.translation);
          } else if (ctx.showTranslationResult) {
            ctx.showTranslationResult(message.text, message.translation, message.phonetic, message.isWord);
          }
          break;
        case 'SETTINGS_UPDATED':
          // Only update showFloatBall if explicitly provided in the message
          const prevShowFloatBall = settings.showFloatBall;
          Object.assign(settings, message.settings);
          // If showFloatBall was not in the message, preserve the previous value
          if (!('showFloatBall' in message.settings)) {
            settings.showFloatBall = prevShowFloatBall;
          }
          console.log('AI Translator: Settings updated, showFloatBall changed from', prevShowFloatBall, 'to', settings.showFloatBall);
          if (ctx.updateFloatBallVisibility) {
            ctx.updateFloatBallVisibility();
          }
          if (message.settings.theme) {
            applyTheme(message.settings.theme);
          }
          if ('enableHoverTranslation' in message.settings && !message.settings.enableHoverTranslation) {
            if (ctx.clearHoverTranslation) ctx.clearHoverTranslation();
            if (ctx.clearSelectionTranslation) ctx.clearSelectionTranslation();
          }
          if ('enableSelection' in message.settings && !message.settings.enableSelection) {
            if (ctx.clearSelectionTranslation) ctx.clearSelectionTranslation();
            if (ctx.hideSelectionButton) ctx.hideSelectionButton();
          }
          if ('selectionTranslationMode' in message.settings && message.settings.selectionTranslationMode !== 'inline') {
            if (ctx.clearSelectionTranslation) ctx.clearSelectionTranslation();
          }
          break;
        case 'TOGGLE_FLOAT_BALL':
          console.log('AI Translator: TOGGLE_FLOAT_BALL received, show =', message.show);
          // 只有当值确实改变时才更新，避免无效的切换
          if (settings.showFloatBall !== message.show) {
            settings.showFloatBall = message.show;
            if (ctx.updateFloatBallVisibility) {
              ctx.updateFloatBallVisibility();
            }
          }
          break;
      }
    });
  }

  ctx.setupMessageListener = setupMessageListener;
})();
