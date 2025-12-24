// AI Translator Content Script
(function() {
  'use strict';

  // State
  let settings = {
    enableSelection: true,
    showFloatBall: true,
    autoDetect: true,
    targetLang: 'zh-CN',
    theme: 'dark'
  };
  let translationPopup = null;
  let floatBall = null;
  let floatMenu = null;
  let isTranslatingPage = false;
  let floatBallDragged = false; // Track if ball was dragged (not just clicked)
  let translationsVisible = true; // Track if page translations are visible

  // Initialize
  init();

  async function init() {
    await loadSettings();
    setupSelectionListener();
    setupMessageListener();
    createFloatBall();
  }

  // Load settings from storage
  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get({
        enableSelection: true,
        showFloatBall: true,
        autoDetect: true,
        targetLang: 'zh-CN',
        theme: 'dark'
      });
      settings = result;
      applyTheme(settings.theme);
    } catch (error) {
      console.error('AI Translator: Failed to load settings', error);
    }
  }

  // Apply theme to translator elements
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-ai-translator-theme', theme);
  }

  // ==================== Float Ball ====================

  function createFloatBall() {
    if (floatBall) return;

    floatBall = document.createElement('div');
    floatBall.id = 'ai-translator-float-ball';
    floatBall.innerHTML = `
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04z" fill="url(#iconGradient)"/>
        <path d="M18.5 10l-4.5 12h2l1.12-3h4.75L23 22h2l-4.5-12h-2zm-2.62 7l1.62-4.33L19.12 17h-3.24z" fill="url(#iconGradient)"/>
        <defs>
          <linearGradient id="iconGradient" x1="0" y1="0" x2="24" y2="24">
            <stop offset="0%" stop-color="#a78bfa"/>
            <stop offset="100%" stop-color="#818cf8"/>
          </linearGradient>
        </defs>
      </svg>
    `;

    // Load saved position or use default
    const savedPosition = localStorage.getItem('ai-translator-float-position');
    if (savedPosition) {
      const { x, y } = JSON.parse(savedPosition);
      floatBall.style.right = 'auto';
      floatBall.style.left = `${x}px`;
      floatBall.style.top = `${y}px`;
    }

    document.body.appendChild(floatBall);

    // Setup drag and click handling
    setupFloatBallInteraction();

    // Update visibility based on settings
    updateFloatBallVisibility();
  }

  function setupFloatBallInteraction() {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    floatBall.addEventListener('mousedown', (e) => {
      isDragging = true;
      floatBallDragged = false;
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = floatBall.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      
      floatBall.classList.add('dragging');
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      // Only count as drag if moved more than 5 pixels
      if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
        floatBallDragged = true;
      }

      let newX = initialX + deltaX;
      let newY = initialY + deltaY;

      // Keep within viewport
      const ballSize = 48;
      newX = Math.max(0, Math.min(window.innerWidth - ballSize, newX));
      newY = Math.max(0, Math.min(window.innerHeight - ballSize, newY));

      floatBall.style.right = 'auto';
      floatBall.style.left = `${newX}px`;
      floatBall.style.top = `${newY}px`;
    });

    document.addEventListener('mouseup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      floatBall.classList.remove('dragging');

      if (floatBallDragged) {
        // Save position
        const rect = floatBall.getBoundingClientRect();
        localStorage.setItem('ai-translator-float-position', JSON.stringify({
          x: rect.left,
          y: rect.top
        }));
      } else {
        // It was a click, not a drag - show menu
        toggleFloatMenu();
      }
    });
  }

  function toggleFloatMenu() {
    if (floatMenu) {
      hideFloatMenu();
      return;
    }

    // Check if there are translations on the page
    const hasTranslations = document.querySelectorAll('.ai-translator-inline-block').length > 0;
    
    floatMenu = document.createElement('div');
    floatMenu.id = 'ai-translator-float-menu';
    floatMenu.innerHTML = `
      <button class="ai-translator-menu-item" data-action="translate-selection">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35"/>
          <path d="M18.5 10l-4.5 12h2l1.12-3h4.75L23 22h2l-4.5-12h-2z"/>
        </svg>
        翻译选中文本
      </button>
      <button class="ai-translator-menu-item" data-action="translate-page">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18M9 21V9"/>
        </svg>
        翻译整个页面
      </button>
      ${hasTranslations ? `
      <button class="ai-translator-menu-item" data-action="toggle-translations">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${translationsVisible ? 
            '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>' :
            '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
          }
        </svg>
        ${translationsVisible ? '隐藏译文' : '显示译文'}
      </button>
      ` : ''}
      <div class="ai-translator-menu-divider"></div>
      <button class="ai-translator-menu-item" data-action="settings">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09"/>
        </svg>
        打开设置
      </button>
    `;

    // Position menu above the ball
    const ballRect = floatBall.getBoundingClientRect();
    const menuWidth = 180;
    const menuHeight = hasTranslations ? 180 : 140;
    
    let left = ballRect.left + (ballRect.width / 2) - (menuWidth / 2);
    let top = ballRect.top - menuHeight - 10;

    // Adjust if off screen
    if (left < 10) left = 10;
    if (left + menuWidth > window.innerWidth - 10) left = window.innerWidth - menuWidth - 10;
    if (top < 10) top = ballRect.bottom + 10;

    floatMenu.style.left = `${left}px`;
    floatMenu.style.top = `${top}px`;

    document.body.appendChild(floatMenu);

    // Menu item click handlers
    floatMenu.querySelectorAll('.ai-translator-menu-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        handleMenuAction(action);
        hideFloatMenu();
      });
    });

    // Close menu on outside click (delayed to prevent immediate close)
    setTimeout(() => {
      document.addEventListener('mousedown', handleOutsideClick);
    }, 100);
  }

  function handleOutsideClick(e) {
    if (floatMenu && !floatMenu.contains(e.target) && !floatBall.contains(e.target)) {
      hideFloatMenu();
    }
  }

  function hideFloatMenu() {
    if (floatMenu) {
      floatMenu.remove();
      floatMenu = null;
      document.removeEventListener('mousedown', handleOutsideClick);
    }
  }

  function handleMenuAction(action) {
    switch (action) {
      case 'translate-selection':
        const selectedText = getSelectedText() || lastSelectedText;
        if (selectedText) {
          const pos = lastSelectionPos.x ? lastSelectionPos : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
          showTranslationPopup(selectedText, pos.x, pos.y);
          hideSelectionButton();
        }
        break;
      case 'translate-page':
        translatePage();
        break;
      case 'toggle-translations':
        toggleTranslationsVisibility();
        break;
      case 'settings':
        chrome.runtime.sendMessage({ type: 'OPEN_OPTIONS' });
        break;
    }
  }

  // Toggle visibility of all page translations
  function toggleTranslationsVisibility() {
    translationsVisible = !translationsVisible;
    
    const translations = document.querySelectorAll('.ai-translator-inline-block');
    translations.forEach(el => {
      if (translationsVisible) {
        el.classList.remove('ai-translator-hidden');
      } else {
        el.classList.add('ai-translator-hidden');
      }
    });
  }

  function updateFloatBallVisibility() {
    if (floatBall) {
      floatBall.style.display = settings.showFloatBall ? 'flex' : 'none';
    }
  }

  // ==================== Selection Translation ====================

  let selectionButton = null;
  let lastSelectedText = '';
  let lastSelectionPos = { x: 0, y: 0 };

  function setupSelectionListener() {
    let selectionTimeout = null;

    document.addEventListener('mouseup', (e) => {
      if (!settings.enableSelection) return;
      
      // Ignore if clicking inside our elements
      if (translationPopup && translationPopup.contains(e.target)) return;
      if (floatBall && floatBall.contains(e.target)) return;
      if (floatMenu && floatMenu.contains(e.target)) return;
      if (selectionButton && selectionButton.contains(e.target)) return;

      // Clear any existing timeout
      if (selectionTimeout) {
        clearTimeout(selectionTimeout);
      }

      // Delay to allow selection to complete
      selectionTimeout = setTimeout(() => {
        const selectedText = getSelectedText();
        if (selectedText && selectedText.length >= 2 && selectedText.length <= 5000) {
          // Show translate button instead of auto-translating
          lastSelectedText = selectedText;
          lastSelectionPos = { x: e.clientX, y: e.clientY };
          showSelectionButton(e.clientX, e.clientY);
        } else {
          hideSelectionButton();
        }
      }, 100);
    });

    // Hide selection button on click outside (but not the popup)
    document.addEventListener('mousedown', (e) => {
      if (selectionButton && !selectionButton.contains(e.target)) {
        hideSelectionButton();
      }
    });

    // Hide popup on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        hideTranslationPopup();
        hideFloatMenu();
        hideSelectionButton();
      }
    });
  }

  // Show small translate button near selection
  function showSelectionButton(x, y) {
    hideSelectionButton();

    selectionButton = document.createElement('div');
    selectionButton.id = 'ai-translator-selection-btn';
    selectionButton.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35"/>
        <path d="M18.5 10l-4.5 12h2l1.12-3h4.75L23 22h2l-4.5-12h-2z"/>
      </svg>
      <span>翻译</span>
    `;

    // Position button above the selection
    let posX = x - 40;
    let posY = y - 45;

    // Keep within viewport
    if (posX < 10) posX = 10;
    if (posX + 80 > window.innerWidth) posX = window.innerWidth - 90;
    if (posY < 10) posY = y + 20;

    selectionButton.style.left = `${posX}px`;
    selectionButton.style.top = `${posY}px`;

    document.body.appendChild(selectionButton);

    // Click to translate
    selectionButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (lastSelectedText) {
        showTranslationPopup(lastSelectedText, lastSelectionPos.x, lastSelectionPos.y);
        hideSelectionButton();
      }
    });
  }

  function hideSelectionButton() {
    if (selectionButton) {
      selectionButton.remove();
      selectionButton = null;
    }
  }

  function getSelectedText() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return '';
    return selection.toString().trim();
  }

  function showTranslationPopup(text, x, y) {
    hideTranslationPopup();

    translationPopup = document.createElement('div');
    translationPopup.className = 'ai-translator-popup';
    translationPopup.innerHTML = `
      <div class="ai-translator-header">
        <span class="ai-translator-title">AI 翻译</span>
        <button class="ai-translator-close" title="关闭">×</button>
      </div>
      <div class="ai-translator-content">
        <div class="ai-translator-source">
          <div class="ai-translator-label">原文</div>
          <div class="ai-translator-text">${escapeHtml(text)}</div>
        </div>
        <div class="ai-translator-divider"></div>
        <div class="ai-translator-result">
          <div class="ai-translator-label">译文</div>
          <div class="ai-translator-translation">
            <div class="ai-translator-loading">
              <div class="ai-translator-spinner"></div>
              <span>翻译中...</span>
            </div>
          </div>
        </div>
      </div>
      <div class="ai-translator-actions">
        <button class="ai-translator-btn ai-translator-copy" title="复制译文">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          复制
        </button>
      </div>
    `;

    // Position popup
    const popupWidth = 320;
    const popupHeight = 200;
    let posX = x + 10;
    let posY = y + 10;

    // Adjust position to stay within viewport
    if (posX + popupWidth > window.innerWidth) {
      posX = window.innerWidth - popupWidth - 20;
    }
    if (posY + popupHeight > window.innerHeight) {
      posY = y - popupHeight - 10;
    }
    if (posX < 10) posX = 10;
    if (posY < 10) posY = 10;

    translationPopup.style.left = `${posX}px`;
    translationPopup.style.top = `${posY}px`;

    document.body.appendChild(translationPopup);

    // Event listeners
    translationPopup.querySelector('.ai-translator-close').addEventListener('click', hideTranslationPopup);
    translationPopup.querySelector('.ai-translator-copy').addEventListener('click', () => {
      const translationText = translationPopup.querySelector('.ai-translator-translation').textContent;
      if (translationText && !translationText.includes('翻译中')) {
        copyToClipboard(translationText);
        showCopyFeedback();
      }
    });

    // Trigger translation
    translateText(text);
  }

  function hideTranslationPopup() {
    if (translationPopup) {
      translationPopup.remove();
      translationPopup = null;
    }
  }

  async function translateText(text) {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE',
        text: text,
        targetLang: settings.targetLang
      });

      if (!translationPopup) return;

      const translationEl = translationPopup.querySelector('.ai-translator-translation');
      
      if (response.error) {
        translationEl.innerHTML = `<div class="ai-translator-error">${escapeHtml(response.error)}</div>`;
      } else {
        translationEl.textContent = response.translation;
      }
    } catch (error) {
      console.error('AI Translator: Translation failed', error);
      if (translationPopup) {
        const translationEl = translationPopup.querySelector('.ai-translator-translation');
        translationEl.innerHTML = `<div class="ai-translator-error">翻译失败，请重试</div>`;
      }
    }
  }

  async function copyToClipboard(text) {
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
  }

  function showCopyFeedback() {
    const copyBtn = translationPopup?.querySelector('.ai-translator-copy');
    if (copyBtn) {
      const originalText = copyBtn.innerHTML;
      copyBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 6L9 17l-5-5"/>
        </svg>
        已复制
      `;
      setTimeout(() => {
        if (copyBtn) copyBtn.innerHTML = originalText;
      }, 1500);
    }
  }

  // ==================== Page Translation ====================

  const MAX_BATCH_CHARS = 2500; // 每批次最大字符数
  const MAX_BATCH_ITEMS = 25;   // 每批次最大段落数
  const CONCURRENCY = 8;        // 并发数
  const DELIMITER = '<<<>>>';   // 分隔符

  async function translatePage() {
    if (isTranslatingPage) {
      console.log('AI Translator: Already translating page');
      return;
    }

    isTranslatingPage = true;
    showPageTranslationProgress();

    try {
      // 收集需要翻译的元素（以块级元素为单位）
      const translatableBlocks = collectTranslatableBlocks(document.body);
      
      if (translatableBlocks.length === 0) {
        hidePageTranslationProgress();
        isTranslatingPage = false;
        return;
      }

      // 按字符数和段落数智能分批
      const batches = createSmartBatches(translatableBlocks);
      
      console.log(`AI Translator: ${translatableBlocks.length} blocks, ${batches.length} batches, concurrency: ${CONCURRENCY}`);

      let processedCount = 0;
      const totalCount = translatableBlocks.length;

      // 使用 Promise 池进行并发控制
      const processBatch = async (batch) => {
        const texts = batch.map(item => item.text);
        
        try {
          const response = await chrome.runtime.sendMessage({
            type: 'TRANSLATE_BATCH_FAST',
            texts: texts,
            targetLang: settings.targetLang,
            delimiter: DELIMITER
          });

          if (response.translations) {
            response.translations.forEach((translation, i) => {
              if (batch[i] && translation) {
                insertTranslationBlock(batch[i], translation);
              }
            });
          }
        } catch (error) {
          console.error('AI Translator: Batch translation failed', error);
        }

        processedCount += batch.length;
        updatePageTranslationProgress(processedCount, totalCount);
      };

      // 并发执行所有批次
      await runWithConcurrency(batches, processBatch, CONCURRENCY);

      hidePageTranslationProgress();
    } catch (error) {
      console.error('AI Translator: Page translation failed', error);
      hidePageTranslationProgress();
    } finally {
      isTranslatingPage = false;
    }
  }

  // 智能分批：根据字符数和段落数限制
  function createSmartBatches(blocks) {
    const batches = [];
    let currentBatch = [];
    let currentChars = 0;

    for (const block of blocks) {
      const textLen = block.text.length;
      
      // 如果当前批次加入这个 block 后会超限，先保存当前批次
      if (currentBatch.length > 0 && 
          (currentChars + textLen > MAX_BATCH_CHARS || currentBatch.length >= MAX_BATCH_ITEMS)) {
        batches.push(currentBatch);
        currentBatch = [];
        currentChars = 0;
      }
      
      currentBatch.push(block);
      currentChars += textLen;
    }
    
    // 保存最后一个批次
    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }
    
    return batches;
  }

  // 并发控制函数
  async function runWithConcurrency(items, processor, concurrency) {
    const results = [];
    let index = 0;
    
    async function runNext() {
      const currentIndex = index++;
      if (currentIndex >= items.length) return;
      
      await processor(items[currentIndex]);
      results[currentIndex] = true;
      
      // 继续处理下一个
      await runNext();
    }
    
    // 启动 concurrency 个并发任务
    const workers = [];
    for (let i = 0; i < Math.min(concurrency, items.length); i++) {
      workers.push(runNext());
    }
    
    await Promise.all(workers);
    return results;
  }

  // 收集可翻译的块级元素
  function collectTranslatableBlocks(root) {
    const blocks = [];
    const blockTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TD', 'TH', 'FIGCAPTION', 'BLOCKQUOTE', 'DT', 'DD'];
    const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'TEXTAREA', 'INPUT', 'SELECT', 'CODE', 'PRE', 'SVG', 'CANVAS', 'KBD', 'SAMP', 'VAR'];
    // 用于检测代码/脚本内容的模式
    const codePatterns = [
      /^[\s\S]*<script[\s>]/i,       // 包含 <script 标签
      /^[\s\S]*<\/script>/i,         // 包含 </script> 标签
      /^[\s\S]*<noscript[\s>]/i,     // 包含 <noscript 标签
      /function\s*\([^)]*\)\s*\{/,   // JavaScript 函数定义
      /var\s+\w+\s*=/,               // var 声明
      /const\s+\w+\s*=/,             // const 声明
      /let\s+\w+\s*=/,               // let 声明
      /document\.(getElementById|querySelector|createElement)/, // DOM 操作
      /^\s*(import|export)\s+/m,     // ES6 模块
      /^\s*def\s+\w+\s*\(/m,         // Python 函数
      /^\s*class\s+\w+[\s:(]/m,      // 类定义
      /^\s*@\w+\s*$/m,               // 装饰器
      /^\s*#\s*(include|define|ifdef)/m, // C/C++ 预处理
      /\{\s*"[^"]+"\s*:\s*/,         // JSON 对象
      /^\s*```/m,                     // Markdown 代码块标记
      /self\.\w+\s*=/,               // Python self
      /super\(\)/,                   // super 调用
      /nn\.Module/,                  // PyTorch
      /torch\.\w+/,                  // PyTorch
      /np\.\w+/,                     // NumPy
    ];
    
    // 检查文本是否看起来像代码
    function looksLikeCode(text) {
      // 如果包含大量特殊字符，可能是代码
      const specialCharRatio = (text.match(/[{}()\[\];=<>]/g) || []).length / text.length;
      if (specialCharRatio > 0.1) return true;
      
      // 检查代码模式
      for (const pattern of codePatterns) {
        if (pattern.test(text)) return true;
      }
      
      return false;
    }
    
    function processElement(element) {
      if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
      
      const tagName = element.tagName;
      
      // 跳过不需要翻译的元素
      if (skipTags.includes(tagName)) return;
      if (element.isContentEditable) return;
      if (element.closest('.ai-translator-popup, .ai-translator-translated, #ai-translator-float-ball, #ai-translator-float-menu, #ai-translator-progress, #ai-translator-selection-btn')) return;
      if (element.classList.contains('ai-translator-translated')) return;
      
      // 跳过被 skipTags 包含的元素
      if (element.closest(skipTags.map(t => t.toLowerCase()).join(','))) return;
      
      // 跳过代码块容器
      if (element.closest('.highlight, .codehilite, .sourceCode, .code-block, [class*="language-"], [class*="highlight"]')) return;
      
      // 检查是否是块级元素且有直接文本内容
      const hasDirectText = Array.from(element.childNodes).some(
        child => child.nodeType === Node.TEXT_NODE && child.textContent.trim().length >= 2
      );
      
      if (blockTags.includes(tagName) || hasDirectText) {
        const text = getDirectTextContent(element);
        if (text && text.length >= 2 && text.length <= 2000) {
          // 跳过看起来像代码的文本
          if (looksLikeCode(text)) {
            // 递归处理子元素，可能有非代码的部分
            for (const child of element.children) {
              processElement(child);
            }
            return;
          }
          
          blocks.push({
            element: element,
            text: text,
            tagName: tagName
          });
          return; // 不再递归处理子元素
        }
      }
      
      // 递归处理子元素
      for (const child of element.children) {
        processElement(child);
      }
    }
    
    processElement(root);
    return blocks;
  }

  // 获取元素的直接文本内容（不包括子元素的深层文本）
  function getDirectTextContent(element) {
    let text = '';
    for (const child of element.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) {
        text += child.textContent;
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        // 对于内联元素，包含其文本
        const display = window.getComputedStyle(child).display;
        if (display === 'inline' || display === 'inline-block') {
          text += child.textContent;
        }
      }
    }
    return text.trim();
  }

  // 插入翻译块
  function insertTranslationBlock(block, translation) {
    const element = block.element;
    if (!element || !element.parentNode) return;
    
    // 标记为已翻译
    element.classList.add('ai-translator-translated');
    
    // 创建翻译元素，继承原元素的样式
    const translationEl = document.createElement(element.tagName);
    translationEl.className = 'ai-translator-inline-block';
    translationEl.textContent = translation;
    
    // 复制所有关键样式，包括颜色
    const computedStyle = window.getComputedStyle(element);
    translationEl.style.cssText = `
      font-size: ${computedStyle.fontSize};
      font-family: ${computedStyle.fontFamily};
      font-weight: ${computedStyle.fontWeight};
      line-height: ${computedStyle.lineHeight};
      text-align: ${computedStyle.textAlign};
      color: ${computedStyle.color};
      letter-spacing: ${computedStyle.letterSpacing};
      margin: 0;
      padding: 0;
      opacity: 0.85;
    `;
    
    // 插入到原元素后面
    element.after(translationEl);
  }

  function showPageTranslationProgress() {
    let progressEl = document.getElementById('ai-translator-progress');
    if (!progressEl) {
      progressEl = document.createElement('div');
      progressEl.id = 'ai-translator-progress';
      progressEl.innerHTML = `
        <div class="ai-translator-progress-header">
          <span class="ai-translator-progress-text">正在翻译...</span>
          <span class="ai-translator-progress-percent">0%</span>
        </div>
        <div class="ai-translator-progress-track">
          <div class="ai-translator-progress-bar"></div>
        </div>
      `;
      document.body.appendChild(progressEl);
      
      // 定位到翻译球下方
      positionProgressBar();
    }
  }

  function positionProgressBar() {
    const progressEl = document.getElementById('ai-translator-progress');
    if (!progressEl || !floatBall) return;
    
    const ballRect = floatBall.getBoundingClientRect();
    const progressWidth = 160;
    
    let left = ballRect.left + (ballRect.width / 2) - (progressWidth / 2);
    let top = ballRect.bottom + 12;
    
    // 确保不超出屏幕
    if (left < 10) left = 10;
    if (left + progressWidth > window.innerWidth - 10) {
      left = window.innerWidth - progressWidth - 10;
    }
    if (top + 60 > window.innerHeight) {
      top = ballRect.top - 70;
    }
    
    progressEl.style.left = `${left}px`;
    progressEl.style.top = `${top}px`;
  }

  function updatePageTranslationProgress(current, total) {
    const progressBar = document.querySelector('#ai-translator-progress .ai-translator-progress-bar');
    const progressPercent = document.querySelector('#ai-translator-progress .ai-translator-progress-percent');
    if (progressBar && progressPercent) {
      const percent = Math.round((current / total) * 100);
      progressBar.style.width = `${percent}%`;
      progressPercent.textContent = `${percent}%`;
    }
  }

  function hidePageTranslationProgress() {
    const progressEl = document.getElementById('ai-translator-progress');
    if (progressEl) {
      // 显示成功状态
      progressEl.innerHTML = `
        <div class="ai-translator-progress-success">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M7.5 12.5L10.5 15.5L16.5 9.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span>翻译完成</span>
        </div>
      `;
      progressEl.classList.add('ai-translator-progress-success-state');
      
      // 5秒后自动关闭
      setTimeout(() => {
        progressEl.classList.add('ai-translator-progress-done');
        setTimeout(() => progressEl.remove(), 300);
      }, 5000);
    }
  }

  // ==================== Message Listener ====================

  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'TRANSLATE_PAGE':
          translatePage();
          break;
        case 'SETTINGS_UPDATED':
          settings = { ...settings, ...message.settings };
          updateFloatBallVisibility();
          if (message.settings.theme) {
            applyTheme(message.settings.theme);
          }
          break;
        case 'TOGGLE_FLOAT_BALL':
          settings.showFloatBall = message.show;
          updateFloatBallVisibility();
          break;
      }
    });
  }

  // ==================== Utility Functions ====================

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
