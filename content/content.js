// AI Translator Content Script
(function() {
  'use strict';

  // i18n helper - get UI language based on target language
  function t(key) {
    const uiLang = getUILanguage(settings.targetLang);
    return getMessage(key, uiLang);
  }

  // Constants
  const FLOAT_BALL_SIZE = 36;  // Slightly larger ball for better presence
  const EDGE_SNAP_THRESHOLD = 100;
  // Monica-style: ball at front, small tail extends to edge
  const DOCK_PADDING_FRONT = -6;  // Ball extends BEYOND container front (negative = ball sticks out)
  const DOCK_PADDING_BACK = 8;    // Tail behind ball
  const DOCK_PADDING_VERTICAL = 4;

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
  let floatBallContainer = null; // Background container for docked state
  let floatMenu = null;
  let isTranslatingPage = false;
  let floatBallDragged = false; // Track if ball was dragged (not just clicked)
  let translationsVisible = true; // Track if page translations are visible

  // Initialize
  init();

  async function init() {
    console.log('AI Translator: Initializing...');
    try {
      await loadSettings();
      setupSelectionListener();
      setupMessageListener();
      setupStorageListener();
      createFloatBall();
      console.log('AI Translator: Initialization complete, showFloatBall =', settings.showFloatBall);
    } catch (error) {
      console.error('AI Translator: Initialization failed', error);
    }
  }

  // Listen for storage changes to stay in sync
  function setupStorageListener() {
    chrome.storage.onChanged.addListener((changes, namespace) => {
      if (namespace !== 'sync') return;

      if (changes.showFloatBall) {
        console.log('AI Translator: Storage changed, showFloatBall:', changes.showFloatBall.oldValue, '->', changes.showFloatBall.newValue);
        settings.showFloatBall = changes.showFloatBall.newValue;
        updateFloatBallVisibility();
      }

      if (changes.theme) {
        settings.theme = changes.theme.newValue;
        applyTheme(settings.theme);
      }
    });
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
      console.log('AI Translator: Settings loaded', { showFloatBall: settings.showFloatBall, theme: settings.theme });
      applyTheme(settings.theme);
    } catch (error) {
      console.error('AI Translator: Failed to load settings', error);
      // Use default settings on error
      settings = {
        enableSelection: true,
        showFloatBall: true,
        autoDetect: true,
        targetLang: 'zh-CN',
        theme: 'dark'
      };
    }
  }

  // Apply theme to translator elements
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-ai-translator-theme', theme);
  }

  // ==================== Float Ball ====================

  // Ensure float ball exists in DOM (recreate if removed by page's JS)
  function ensureFloatBallExists() {
    // Check if float ball was removed from DOM
    if (floatBall && !document.body.contains(floatBall)) {
      console.log('AI Translator: Float ball was removed from DOM, recreating...');
      floatBall = null;
      floatBallContainer = null;
    }

    // Create if doesn't exist
    if (!floatBall) {
      createFloatBall();
      // Reapply theme after recreation (React hydration may have removed attributes)
      applyTheme(settings.theme);
      return true; // Was recreated
    }
    return false; // Already existed
  }

  function createFloatBall() {
    // Remove existing references if elements don't exist in DOM
    if (floatBall && !document.body.contains(floatBall)) {
      floatBall = null;
    }
    if (floatBallContainer && !document.body.contains(floatBallContainer)) {
      floatBallContainer = null;
    }

    if (floatBall) return;

    // Ensure document.body exists
    if (!document.body) {
      console.error('AI Translator: document.body not available');
      return;
    }

    // Create container for docked state background
    floatBallContainer = document.createElement('div');
    floatBallContainer.id = 'ai-translator-float-ball-container';
    document.body.appendChild(floatBallContainer);

    // Create float ball
    floatBall = document.createElement('div');
    floatBall.id = 'ai-translator-float-ball';
    floatBall.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
    try {
      const savedPosition = localStorage.getItem('ai-translator-float-position');
      if (savedPosition) {
        const { x, y, docked } = JSON.parse(savedPosition);
        if (typeof x === 'number' && typeof y === 'number') {
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;

          let validX = x;
          let validY = y;
          let validDocked = docked;

          // Recalculate docked position for current viewport
          if (docked === 'right') {
            validX = viewportWidth - FLOAT_BALL_SIZE - DOCK_PADDING_BACK;
          } else if (docked === 'left') {
            validX = DOCK_PADDING_FRONT;
          } else {
            validX = Math.max(8, Math.min(x, viewportWidth - FLOAT_BALL_SIZE - 8));
            validDocked = null;
          }

          validY = Math.max(8, Math.min(y, viewportHeight - FLOAT_BALL_SIZE - 8));

          floatBall.style.right = 'auto';
          floatBall.style.bottom = 'auto';
          floatBall.style.left = `${validX}px`;
          floatBall.style.top = `${validY}px`;

          // Apply docked state
          if (validDocked) {
            setDockedState(validDocked, validX, validY);
          }

          // Update saved position if adjusted
          if (x !== validX || y !== validY || docked !== validDocked) {
            localStorage.setItem('ai-translator-float-position', JSON.stringify({
              x: validX,
              y: validY,
              docked: validDocked
            }));
          }
        }
      }
    } catch (error) {
      console.warn('AI Translator: Failed to load saved position, using default', error);
      localStorage.removeItem('ai-translator-float-position');
    }

    document.body.appendChild(floatBall);
    console.log('AI Translator: Float ball created');

    // Setup drag and click handling
    setupFloatBallInteraction();

    // Update visibility based on settings
    // Re-read from storage to ensure we have the latest value
    chrome.storage.sync.get({ showFloatBall: true }).then(result => {
      settings.showFloatBall = result.showFloatBall;
      updateFloatBallVisibility();
    }).catch(() => {
      // On error, use current settings value
      updateFloatBallVisibility();
    });
  }

  // Set docked state with container background
  function setDockedState(side, ballX, ballY) {
    floatBall.classList.add('docked');
    floatBallContainer.classList.remove('docked-left', 'docked-right');
    floatBallContainer.classList.add('docked-' + side);

    // Container dimensions - minimal capsule wrapping the ball
    const containerWidth = FLOAT_BALL_SIZE + DOCK_PADDING_FRONT + DOCK_PADDING_BACK;
    const containerHeight = FLOAT_BALL_SIZE + DOCK_PADDING_VERTICAL * 2;

    if (side === 'right') {
      floatBallContainer.style.right = '0';
      floatBallContainer.style.left = 'auto';
    } else {
      floatBallContainer.style.left = '0';
      floatBallContainer.style.right = 'auto';
    }
    floatBallContainer.style.top = (ballY - DOCK_PADDING_VERTICAL) + 'px';
    floatBallContainer.style.width = containerWidth + 'px';
    floatBallContainer.style.height = containerHeight + 'px';
  }

  // Clear docked state
  function clearDockedState() {
    floatBall.classList.remove('docked');
    floatBallContainer.classList.remove('docked-left', 'docked-right');
  }

  function setupFloatBallInteraction() {
    let isDragging = false;
    let dragStartX, dragStartY;
    let ballStartX, ballStartY;
    let dragDistance = 0;

    // Mouse down - start drag
    floatBall.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // Only left click

      isDragging = true;
      dragDistance = 0;
      floatBallDragged = false;

      dragStartX = e.clientX;
      dragStartY = e.clientY;

      const rect = floatBall.getBoundingClientRect();
      ballStartX = rect.left;
      ballStartY = rect.top;

      // Remove any transition during drag
      floatBall.style.transition = 'none';
      floatBall.classList.add('dragging');

      e.preventDefault();
    });

    // Mouse move - update position
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - dragStartX;
      const deltaY = e.clientY - dragStartY;
      dragDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // Mark as dragged if moved more than 3 pixels
      if (dragDistance > 3) {
        floatBallDragged = true;
        // Remove docked state while dragging
        clearDockedState();
      }

      // Calculate new position
      let newX = ballStartX + deltaX;
      let newY = ballStartY + deltaY;

      // Clamp to viewport
      const maxX = window.innerWidth - FLOAT_BALL_SIZE;
      const maxY = window.innerHeight - FLOAT_BALL_SIZE;
      newX = Math.max(0, Math.min(newX, maxX));
      newY = Math.max(0, Math.min(newY, maxY));

      // Apply position immediately (no transition)
      floatBall.style.right = 'auto';
      floatBall.style.bottom = 'auto';
      floatBall.style.left = newX + 'px';
      floatBall.style.top = newY + 'px';
    });

    // Mouse up - end drag, apply snap
    document.addEventListener('mouseup', (e) => {
      if (!isDragging) return;
      isDragging = false;
      floatBall.classList.remove('dragging');

      if (floatBallDragged) {
        // Get current position
        const rect = floatBall.getBoundingClientRect();
        let finalX = rect.left;
        let finalY = rect.top;

        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Check distance to edges
        const distLeft = finalX;
        const distRight = viewportWidth - finalX - FLOAT_BALL_SIZE;

        let dockedSide = null;

        // Snap to left or right edge (dock to edge)
        // Ball nearly flush with container front edge
        if (distLeft <= EDGE_SNAP_THRESHOLD && distLeft < distRight) {
          finalX = DOCK_PADDING_FRONT;
          dockedSide = 'left';
        } else if (distRight <= EDGE_SNAP_THRESHOLD) {
          finalX = viewportWidth - FLOAT_BALL_SIZE - DOCK_PADDING_BACK;
          dockedSide = 'right';
        }

        // Clamp vertical position
        const maxY = viewportHeight - FLOAT_BALL_SIZE - 8;
        finalY = Math.max(8, Math.min(finalY, maxY));

        // Apply animation
        floatBall.style.transition = 'left 0.2s ease-out, top 0.2s ease-out';
        floatBall.style.left = finalX + 'px';
        floatBall.style.top = finalY + 'px';

        // Apply docked state with container
        if (dockedSide) {
          setTimeout(() => {
            setDockedState(dockedSide, finalX, finalY);
          }, 50);
        }

        setTimeout(() => {
          if (floatBall) floatBall.style.transition = 'none';
        }, 200);

        // Save position and docked state
        localStorage.setItem('ai-translator-float-position', JSON.stringify({
          x: finalX,
          y: finalY,
          docked: dockedSide
        }));
      } else {
        // It was a click, not a drag
        toggleFloatMenu();
      }
    });

    // Handle window resize
    window.addEventListener('resize', () => {
      if (!floatBall || isDragging) return;

      const rect = floatBall.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Recalculate position for docked state
      const isDockedRight = floatBallContainer.classList.contains('docked-right');
      const isDockedLeft = floatBallContainer.classList.contains('docked-left');

      let newX = rect.left;
      if (isDockedRight) {
        newX = viewportWidth - FLOAT_BALL_SIZE - DOCK_PADDING_BACK;
        floatBall.style.left = newX + 'px';
        floatBallContainer.style.right = '0';
      } else if (isDockedLeft) {
        newX = DOCK_PADDING_FRONT;
        floatBall.style.left = newX + 'px';
      }

      // Clamp vertical position
      const maxY = viewportHeight - FLOAT_BALL_SIZE - 8;
      const newY = Math.max(8, Math.min(rect.top, maxY));

      if (newY !== rect.top) {
        floatBall.style.top = newY + 'px';
      }

      // Update container position if docked
      if (isDockedRight || isDockedLeft) {
        floatBallContainer.style.top = (newY - DOCK_PADDING_VERTICAL) + 'px';
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
      <button class="ai-translator-menu-item" data-action="translate-input">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
        </svg>
        ${t('inputTranslate')}
      </button>
      <button class="ai-translator-menu-item" data-action="translate-selection">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35"/>
          <path d="M18.5 10l-4.5 12h2l1.12-3h4.75L23 22h2l-4.5-12h-2z"/>
        </svg>
        ${t('translateSelection')}
      </button>
      <button class="ai-translator-menu-item" data-action="translate-page">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2"/>
          <path d="M3 9h18M9 21V9"/>
        </svg>
        ${t('translatePage')}
      </button>
      ${hasTranslations ? `
      <button class="ai-translator-menu-item" data-action="toggle-translations">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${translationsVisible ? 
            '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>' :
            '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'
          }
        </svg>
        ${translationsVisible ? t('hideTranslations') : t('showTranslations')}
      </button>
      ` : ''}
      <div class="ai-translator-menu-divider"></div>
      <button class="ai-translator-menu-item" data-action="settings">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09"/>
        </svg>
        ${t('openSettings')}
      </button>
    `;

    // Position menu above the ball
    const ballRect = floatBall.getBoundingClientRect();
    const menuWidth = 180;
    const menuHeight = hasTranslations ? 220 : 180;
    
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
      case 'translate-input':
        showInputTranslateDialog();
        break;
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

  // ==================== Input Translate Dialog ====================

  let inputDialog = null;

  function showInputTranslateDialog() {
    if (inputDialog) {
      inputDialog.remove();
    }

    // Ensure theme is applied
    applyTheme(settings.theme);

    inputDialog = document.createElement('div');
    inputDialog.id = 'ai-translator-input-dialog';
    inputDialog.innerHTML = `
      <div class="ai-translator-input-overlay"></div>
      <div class="ai-translator-input-modal">
        <div class="ai-translator-input-header">
          <span class="ai-translator-input-title">${t('inputTextTranslation')}</span>
          <button class="ai-translator-input-close" title="${t('close')}">×</button>
        </div>
        <div class="ai-translator-input-body">
          <div class="ai-translator-input-section">
            <label class="ai-translator-input-label">${t('inputText')}</label>
            <textarea 
              class="ai-translator-input-textarea" 
              id="ai-translator-input-text"
              placeholder="${t('inputPlaceholder')}"
              rows="4"
            ></textarea>
          </div>
          <div class="ai-translator-input-actions">
            <button class="ai-translator-input-btn ai-translator-input-btn-primary" id="ai-translator-do-translate">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0014.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35"/>
                <path d="M18.5 10l-4.5 12h2l1.12-3h4.75L23 22h2l-4.5-12h-2z"/>
              </svg>
              ${t('translate')}
            </button>
          </div>
          <div class="ai-translator-input-section ai-translator-result-section" id="ai-translator-result-section" style="display: none;">
            <label class="ai-translator-input-label">${t('translatedText')}</label>
            <div class="ai-translator-input-result" id="ai-translator-result-text"></div>
            <button class="ai-translator-input-btn ai-translator-input-btn-copy" id="ai-translator-copy-result">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
              </svg>
              ${t('copyTranslation')}
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(inputDialog);

    // Focus on textarea
    const textarea = inputDialog.querySelector('#ai-translator-input-text');
    setTimeout(() => textarea.focus(), 100);

    // Event listeners
    inputDialog.querySelector('.ai-translator-input-close').addEventListener('click', hideInputDialog);
    inputDialog.querySelector('.ai-translator-input-overlay').addEventListener('click', hideInputDialog);
    
    inputDialog.querySelector('#ai-translator-do-translate').addEventListener('click', async () => {
      const text = textarea.value.trim();
      if (!text) return;
      
      const resultSection = inputDialog.querySelector('#ai-translator-result-section');
      const resultText = inputDialog.querySelector('#ai-translator-result-text');
      
      resultSection.style.display = 'block';
      resultText.innerHTML = `<div class="ai-translator-input-loading"><div class="ai-translator-spinner"></div><span>${t('translating')}</span></div>`;
      
      try {
        const response = await chrome.runtime.sendMessage({
          type: 'TRANSLATE',
          text: text,
          targetLang: settings.targetLang
        });
        
        if (response.error) {
          resultText.innerHTML = `<div class="ai-translator-input-error">${escapeHtml(response.error)}</div>`;
        } else {
          resultText.textContent = response.translation;
        }
      } catch (error) {
        resultText.innerHTML = `<div class="ai-translator-input-error">${t('translationFailed')}</div>`;
      }
    });

    inputDialog.querySelector('#ai-translator-copy-result').addEventListener('click', async () => {
      const resultText = inputDialog.querySelector('#ai-translator-result-text').textContent;
      if (resultText && !resultText.includes(t('translating'))) {
        await copyToClipboard(resultText);
        const copyBtn = inputDialog.querySelector('#ai-translator-copy-result');
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M20 6L9 17l-5-5"/>
          </svg>
          ${t('copied')}
        `;
        setTimeout(() => copyBtn.innerHTML = originalHTML, 1500);
      }
    });

    // Enter key to translate (Ctrl+Enter or Cmd+Enter)
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        inputDialog.querySelector('#ai-translator-do-translate').click();
      }
    });

    // Escape to close
    document.addEventListener('keydown', handleInputDialogEscape);
  }

  function handleInputDialogEscape(e) {
    if (e.key === 'Escape' && inputDialog) {
      hideInputDialog();
    }
  }

  function hideInputDialog() {
    if (inputDialog) {
      inputDialog.remove();
      inputDialog = null;
      document.removeEventListener('keydown', handleInputDialogEscape);
    }
  }

  function updateFloatBallVisibility() {
    // Ensure showFloatBall has a valid boolean value
    const shouldShow = settings.showFloatBall !== false;

    // If should show, ensure float ball exists (recreate if removed by page)
    if (shouldShow) {
      ensureFloatBallExists();
    }

    if (floatBall && document.body.contains(floatBall)) {
      // Use setProperty with !important to override any page CSS
      floatBall.style.setProperty('display', shouldShow ? 'flex' : 'none', 'important');
      floatBall.style.setProperty('visibility', shouldShow ? 'visible' : 'hidden', 'important');
      floatBall.style.setProperty('opacity', shouldShow ? '1' : '0', 'important');

      // Also update container visibility
      if (floatBallContainer && document.body.contains(floatBallContainer)) {
        floatBallContainer.style.setProperty('display', shouldShow ? 'block' : 'none', 'important');
      }

      // Ensure float ball is in viewport when showing
      if (shouldShow) {
        ensureFloatBallInViewport();
      }

      console.log('AI Translator: Float ball visibility updated, display =', floatBall.style.display,
                  ', element in DOM =', document.body.contains(floatBall));
    } else if (shouldShow) {
      console.warn('AI Translator: Float ball not in DOM, cannot update visibility');
    }
  }

  // Ensure float ball is within the visible viewport
  function ensureFloatBallInViewport() {
    if (!floatBall || !document.body.contains(floatBall)) return;

    const rect = floatBall.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Validate viewport dimensions
    if (viewportWidth <= 0 || viewportHeight <= 0) return;

    let needsAdjustment = false;

    // Default position (bottom right corner)
    const defaultLeft = Math.max(8, viewportWidth - FLOAT_BALL_SIZE - 24);
    const defaultTop = Math.max(8, viewportHeight - FLOAT_BALL_SIZE - 80);

    let newLeft = rect.left;
    let newTop = rect.top;

    // Check if ball has invalid dimensions (not rendered yet or hidden)
    if (rect.width === 0 || rect.height === 0) {
      needsAdjustment = true;
      newLeft = defaultLeft;
      newTop = defaultTop;
    }
    // Check if ball is outside viewport
    else if (rect.left < 0 || rect.right > viewportWidth ||
             rect.top < 0 || rect.bottom > viewportHeight) {
      needsAdjustment = true;
      // Clamp to viewport
      newLeft = Math.max(8, Math.min(rect.left, viewportWidth - FLOAT_BALL_SIZE - 8));
      newTop = Math.max(8, Math.min(rect.top, viewportHeight - FLOAT_BALL_SIZE - 8));

      // If still invalid, use default
      if (newLeft < 0 || newLeft > viewportWidth - FLOAT_BALL_SIZE ||
          newTop < 0 || newTop > viewportHeight - FLOAT_BALL_SIZE) {
        newLeft = defaultLeft;
        newTop = defaultTop;
      }
    }

    if (needsAdjustment) {
      floatBall.style.setProperty('left', `${newLeft}px`, 'important');
      floatBall.style.setProperty('top', `${newTop}px`, 'important');
      floatBall.style.setProperty('right', 'auto', 'important');
      floatBall.style.setProperty('bottom', 'auto', 'important');
      console.log('AI Translator: Float ball position adjusted to', newLeft, newTop);

      // Clear any invalid saved position
      localStorage.removeItem('ai-translator-float-position');
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
      <span>${t('translate')}</span>
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

    // Ensure theme is applied
    applyTheme(settings.theme);

    translationPopup = document.createElement('div');
    translationPopup.className = 'ai-translator-popup';
    translationPopup.innerHTML = `
      <div class="ai-translator-header">
        <span class="ai-translator-title">${t('aiTranslate')}</span>
        <button class="ai-translator-close" title="${t('close')}">×</button>
      </div>
      <div class="ai-translator-content">
        <div class="ai-translator-source">
          <div class="ai-translator-label">${t('original')}</div>
          <div class="ai-translator-text">${escapeHtml(text)}</div>
        </div>
        <div class="ai-translator-divider"></div>
        <div class="ai-translator-result">
          <div class="ai-translator-label">${t('translation')}</div>
          <div class="ai-translator-translation">
            <div class="ai-translator-loading">
              <div class="ai-translator-spinner"></div>
              <span>${t('translating')}</span>
            </div>
          </div>
        </div>
      </div>
      <div class="ai-translator-actions">
        <button class="ai-translator-btn ai-translator-copy" title="${t('copyTranslation')}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          ${t('copy')}
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
      if (translationText && !translationText.includes(t('translating'))) {
        copyToClipboard(translationText);
        showCopyFeedback();
      }
    });

    // 添加拖动功能
    setupPopupDrag(translationPopup);

    // Trigger translation
    translateText(text);
  }

  // 显示已完成的翻译结果（用于右键菜单翻译）
  function showTranslationResult(text, translation) {
    hideTranslationPopup();

    // Ensure theme is applied
    applyTheme(settings.theme);

    translationPopup = document.createElement('div');
    translationPopup.className = 'ai-translator-popup';
    translationPopup.innerHTML = `
      <div class="ai-translator-header">
        <span class="ai-translator-title">${t('aiTranslate')}</span>
        <button class="ai-translator-close" title="${t('close')}">×</button>
      </div>
      <div class="ai-translator-content">
        <div class="ai-translator-source">
          <div class="ai-translator-label">${t('original')}</div>
          <div class="ai-translator-text">${escapeHtml(text)}</div>
        </div>
        <div class="ai-translator-divider"></div>
        <div class="ai-translator-result">
          <div class="ai-translator-label">${t('translation')}</div>
          <div class="ai-translator-translation">${escapeHtml(translation)}</div>
        </div>
      </div>
      <div class="ai-translator-actions">
        <button class="ai-translator-btn ai-translator-copy" title="${t('copyTranslation')}">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
          </svg>
          ${t('copy')}
        </button>
      </div>
    `;

    // 居中显示弹窗
    const popupWidth = 320;
    const popupHeight = 200;
    let posX = (window.innerWidth - popupWidth) / 2;
    let posY = (window.innerHeight - popupHeight) / 2;

    translationPopup.style.left = `${posX}px`;
    translationPopup.style.top = `${posY}px`;

    document.body.appendChild(translationPopup);

    // Event listeners
    translationPopup.querySelector('.ai-translator-close').addEventListener('click', hideTranslationPopup);
    translationPopup.querySelector('.ai-translator-copy').addEventListener('click', () => {
      copyToClipboard(translation);
      showCopyFeedback();
    });

    // 添加拖动功能
    setupPopupDrag(translationPopup);
  }

  // 设置弹窗拖动功能
  function setupPopupDrag(popup) {
    const header = popup.querySelector('.ai-translator-header');
    if (!header) return;

    let isDragging = false;
    let startX, startY, initialX, initialY;

    header.style.cursor = 'move';

    header.addEventListener('mousedown', (e) => {
      // 忽略关闭按钮
      if (e.target.classList.contains('ai-translator-close')) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = popup.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;

      popup.style.transition = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newX = initialX + deltaX;
      let newY = initialY + deltaY;

      // 保持在视口内
      const popupRect = popup.getBoundingClientRect();
      newX = Math.max(0, Math.min(window.innerWidth - popupRect.width, newX));
      newY = Math.max(0, Math.min(window.innerHeight - popupRect.height, newY));

      popup.style.left = `${newX}px`;
      popup.style.top = `${newY}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        popup.style.transition = '';
      }
    });
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
        translationEl.innerHTML = `<div class="ai-translator-error">${t('translationFailed')}</div>`;
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
        ${t('copied')}
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

  // 翻译进度追踪
  let translationProgress = { current: 0, total: 0 };

  // 追踪页面是否已经翻译过
  let pageHasBeenTranslated = false;

  async function translatePage() {
    // 检查是否已经翻译过此页面
    if (pageHasBeenTranslated) {
      console.log('AI Translator: Page already translated');
      showPageTranslationProgress();
      showAlreadyTranslatedMessage();
      return;
    }

    if (isTranslatingPage) {
      console.log('AI Translator: Already translating page');
      // 如果进度条被关闭了，重新显示它并恢复进度
      let existingProgress = document.getElementById('ai-translator-progress');
      if (!existingProgress) {
        showPageTranslationProgress();
        existingProgress = document.getElementById('ai-translator-progress');
        // 恢复当前进度
        if (translationProgress.total > 0) {
          updatePageTranslationProgress(translationProgress.current, translationProgress.total);
        }
      }
      // 闪烁提示正在翻译中
      showTranslatingHint(existingProgress);
      return;
    }

    // 检查是否已经有翻译内容（页面可能在之前的会话中翻译过）
    const existingTranslations = document.querySelectorAll('.ai-translator-inline-block').length;
    if (existingTranslations > 0) {
      console.log('AI Translator: Found existing translations');
      pageHasBeenTranslated = true;
      showPageTranslationProgress();
      showAlreadyTranslatedMessage();
      return;
    }

    isTranslatingPage = true;
    translationProgress = { current: 0, total: 0 };
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

      translationProgress.total = translatableBlocks.length;

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

        translationProgress.current += batch.length;
        updatePageTranslationProgress(translationProgress.current, translationProgress.total);
      };

      // 并发执行所有批次
      await runWithConcurrency(batches, processBatch, CONCURRENCY);

      // 标记页面已翻译
      pageHasBeenTranslated = true;
      hidePageTranslationProgress();
    } catch (error) {
      console.error('AI Translator: Page translation failed', error);
      hidePageTranslationProgress();
    } finally {
      isTranslatingPage = false;
      translationProgress = { current: 0, total: 0 };
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
    // 内联可翻译元素 - 这些元素即使不是块级也应单独翻译
    const inlineTags = ['A', 'SPAN', 'LABEL', 'BUTTON'];
    const skipTags = ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'TEXTAREA', 'INPUT', 'SELECT', 'CODE', 'PRE', 'SVG', 'CANVAS', 'KBD', 'SAMP', 'VAR'];
    // 容器元素 - 这些元素不应作为整体翻译，应递归处理子元素
    const containerTags = ['NAV', 'UL', 'OL', 'DIV', 'SECTION', 'ARTICLE', 'ASIDE', 'HEADER', 'FOOTER', 'MAIN'];
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

    // 检查元素是否有可翻译的子元素（用于判断是否应该递归而非整体翻译）
    function hasTranslatableChildren(element) {
      for (const child of element.children) {
        // 跳过数学公式元素 - 数学公式应该作为整体保留，不应该导致父元素被拆分
        if (isMathElement(child)) {
          continue;
        }
        // 跳过图标元素
        if (isIconElement(child)) {
          continue;
        }
        const childTag = child.tagName;
        // 如果子元素是块级或内联可翻译元素，且有文本内容
        if ((blockTags.includes(childTag) || inlineTags.includes(childTag)) &&
            child.textContent.trim().length >= 2) {
          return true;
        }
        // 递归检查
        if (hasTranslatableChildren(child)) {
          return true;
        }
      }
      return false;
    }

    // 检查元素是否有多个可翻译的直接子元素（用于判断是否应该递归而非整体翻译）
    // 这对于导航菜单等结构很重要，避免将整个菜单作为一个块翻译
    function hasMultipleTranslatableDirectChildren(element) {
      let count = 0;
      for (const child of element.children) {
        const childTag = child.tagName;
        // 如果子元素是块级或内联可翻译元素，且有文本内容
        if ((blockTags.includes(childTag) || inlineTags.includes(childTag)) &&
            child.textContent.trim().length >= 2) {
          count++;
          if (count >= 2) return true;
        }
      }
      return false;
    }

    // 获取元素的直接文本内容（不包括子元素的文本）
    function getDirectText(element) {
      let text = '';
      for (const child of element.childNodes) {
        if (child.nodeType === Node.TEXT_NODE) {
          const content = child.textContent.trim();
          if (content) {
            text += content + ' ';
          }
        }
      }
      return text.trim();
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

      // 跳过数学公式的隐藏辅助元素（只跳过重复的隐藏版本）
      if (element.classList.contains('MJX_Assistive_MathML') ||
          element.classList.contains('katex-mathml') ||
          element.classList.contains('sr-only') ||
          element.classList.contains('visually-hidden') ||
          element.classList.contains('MathJax_Preview')) return;

      // 检查是否有直接文本内容
      const directText = getDirectText(element);
      const hasDirectText = directText.length >= 2;

      // 对于任何有可翻译子元素的元素，检查是否应该递归处理而非整体翻译
      // 这确保导航菜单等嵌套结构的每个项被单独翻译
      // 注意：只有当子元素是【块级元素】时才递归，内联元素（如 <a>、<span>）应该包含在整体翻译中
      if (hasTranslatableChildren(element)) {
        let shouldRecurse = false;
        for (const child of element.children) {
          // 跳过数学公式和图标
          if (isMathElement(child) || isIconElement(child)) {
            continue;
          }
          const childTag = child.tagName;
          // 只有当直接子元素是【块级】可翻译元素时才递归
          // 内联元素（如 a, span）应该作为父元素内容的一部分整体翻译
          if (blockTags.includes(childTag) && child.textContent.trim().length >= 2) {
            shouldRecurse = true;
            break;
          }
          // 情况2：直接子元素是容器元素（如 div, ul）且包含可翻译内容
          if (containerTags.includes(childTag) && hasTranslatableChildren(child)) {
            shouldRecurse = true;
            break;
          }
        }

        // 如果满足递归条件，递归处理子元素而不是整体翻译
        if (shouldRecurse) {
          for (const child of element.children) {
            processElement(child);
          }
          return;
        }
      }

      // 对于内联元素（如链接、按钮），如果有文本内容，单独翻译
      if (inlineTags.includes(tagName)) {
        const { text, mathElements } = getTextWithMathPlaceholders(element);
        if (text && text.length >= 2 && text.length <= 500) {
          // 跳过看起来像代码的文本
          if (!looksLikeCode(text)) {
            blocks.push({
              element: element,
              text: text,
              tagName: tagName,
              mathElements: mathElements
            });
            return;
          }
        }
      }

      // 对于块级元素
      if (blockTags.includes(tagName) || hasDirectText) {
        const { text, mathElements } = getTextWithMathPlaceholders(element);
        if (text && text.length >= 2 && text.length <= 2000) {
          // 跳过看起来像代码的文本（排除数学占位符后判断）
          const textWithoutMath = text.replace(/【MATH_\d+】/g, '');
          if (textWithoutMath && looksLikeCode(textWithoutMath)) {
            // 递归处理子元素，可能有非代码的部分
            for (const child of element.children) {
              processElement(child);
            }
            return;
          }

          blocks.push({
            element: element,
            text: text,
            tagName: tagName,
            mathElements: mathElements // 保存公式信息
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

  // 获取清理后的数学公式 HTML（移除辅助元素，保留视觉渲染）
  function getCleanMathHtml(node) {
    // 克隆节点以避免修改原始 DOM
    const clone = node.cloneNode(true);

    // 需要移除的辅助元素选择器
    const assistiveSelectors = [
      '.MJX_Assistive_MathML',      // MathJax 3 辅助 MathML
      '.mjx-assistive-mml',          // MathJax 3 辅助 MathML (小写)
      '.katex-mathml',               // KaTeX 辅助 MathML
      '.katex-html[aria-hidden]',    // KaTeX 隐藏的 HTML
      '.sr-only',                    // 屏幕阅读器专用
      '.visually-hidden',            // 视觉隐藏
      '.MathJax_Preview',            // MathJax 预览
      'annotation',                  // MathML annotation
      'semantics > mrow:not(:first-child)', // MathML semantics 中的额外内容
    ];

    // 移除所有辅助元素
    assistiveSelectors.forEach(selector => {
      try {
        clone.querySelectorAll(selector).forEach(el => el.remove());
      } catch (e) {
        // 忽略无效选择器
      }
    });

    // 移除 aria-hidden="true" 但保留可见内容的元素
    // 注意：不移除整个元素，只移除 aria-hidden 属性下的某些特定子元素

    // 确保数学公式保持内联显示
    // 为克隆的元素添加内联样式以确保正确渲染
    clone.style.display = 'inline';
    clone.style.verticalAlign = 'baseline';

    return clone.outerHTML;
  }

  // 检测元素是否是数学公式
  function isMathElement(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;

    // 检查标签名
    const mathTags = ['MATH', 'MJX-CONTAINER', 'MJX-MATH'];
    if (mathTags.includes(el.tagName)) return true;

    // 检查常见的数学公式类名
    const mathClasses = [
      'MathJax', 'MathJax_Display', 'MathJax_Preview',
      'mjx-math', 'mjx-chtml', 'mjx-container',
      'katex', 'katex-display',
      'math', 'equation'
    ];
    if (mathClasses.some(cls => el.classList?.contains(cls))) return true;

    // 检查 data 属性
    if (el.hasAttribute?.('data-mathml') || el.hasAttribute?.('data-latex')) return true;

    return false;
  }

  // 检测元素是否是图标元素（图标跳过，不翻译也不保留占位符）
  function isIconElement(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;

    // SVG 图标
    if (el.tagName === 'SVG' || el.tagName === 'svg') return true;

    // Font Awesome 和其他图标库
    const classList = el.classList;
    if (classList) {
      const iconClasses = ['fa', 'fas', 'far', 'fal', 'fad', 'fab', 'fa-solid', 'fa-regular',
        'fa-light', 'fa-duotone', 'fa-brands', 'fa-icon', 'icon', 'iconfont', 'material-icons',
        'glyphicon', 'bi', 'feather', 'lucide'];
      if (iconClasses.some(cls => classList.contains(cls))) return true;
      // 检查是否包含 fa- 开头的类
      if (Array.from(classList).some(cls => cls.startsWith('fa-'))) return true;
    }

    return false;
  }

  // 获取元素内容，用占位符替换数学公式（图标直接跳过）
  // 返回 { text: string, mathElements: Array<{placeholder: string, html: string}> }
  function getTextWithMathPlaceholders(element) {
    let text = '';
    const mathElements = [];
    let mathIndex = 0;

    // 跳过的隐藏类名
    const hiddenClasses = [
      'MJX_Assistive_MathML', 'katex-mathml', 'sr-only',
      'visually-hidden', 'MathJax_Preview'
    ];

    function processNode(node) {
      if (node.nodeType === Node.TEXT_NODE) {
        let content = node.textContent;
        if (content) {
          // 过滤掉 CSS 样式文本（如 .fa-secondary{opacity:.4}）
          content = content.replace(/\.[\w-]+\s*\{[^}]*\}/g, '');
          // 过滤掉 CSS 选择器残留
          content = content.replace(/\.fa-[\w-]+/g, '');
          if (content.trim()) {
            text += content;
          }
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // 跳过 script 和 style 标签
        if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;

        // 跳过隐藏的辅助元素
        const classList = node.classList;
        if (hiddenClasses.some(cls => classList?.contains(cls))) return;

        // 跳过 display:none
        const style = window.getComputedStyle(node);
        if (style.display === 'none') return;

        // 跳过图标元素（图标是装饰，翻译不需要包含图标）
        if (isIconElement(node)) {
          return;
        }

        // 检测是否是数学公式 - 保留占位符
        if (isMathElement(node)) {
          const placeholder = `【MATH_${mathIndex}】`;
          // 克隆节点并移除辅助元素，避免显示重复内容
          const cleanedHtml = getCleanMathHtml(node);
          mathElements.push({
            placeholder: placeholder,
            html: cleanedHtml
          });
          text += placeholder;
          mathIndex++;
          return;
        }

        // 递归处理子节点
        for (const child of node.childNodes) {
          processNode(child);
        }
      }
    }

    for (const child of element.childNodes) {
      processNode(child);
    }

    return { text: text.trim(), mathElements };
  }

  // 获取元素的直接文本内容（向后兼容）
  function getDirectTextContent(element) {
    const { text } = getTextWithMathPlaceholders(element);
    return text;
  }

  // 获取元素内文本相对于元素左边界的偏移量（跳过 icon/svg 等前置元素）
  function getTextOffsetLeft(element) {
    const elementRect = element.getBoundingClientRect();
    if (elementRect.width === 0) return 0;

    // 递归查找第一个文本节点的位置
    function findFirstTextRect(node) {
      for (const child of node.childNodes) {
        if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
          // 使用 Range 获取文本节点的位置
          const range = document.createRange();
          range.selectNodeContents(child);
          const rects = range.getClientRects();
          if (rects.length > 0) {
            return rects[0];
          }
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          // 跳过 icon 类元素
          const tagName = child.tagName.toLowerCase();
          if (tagName === 'svg' || tagName === 'img' || tagName === 'i' ||
              tagName === 'icon' || child.classList.contains('icon') ||
              isIconElement(child)) {
            continue;
          }
          // 递归搜索子元素
          const result = findFirstTextRect(child);
          if (result) return result;
        }
      }
      return null;
    }

    const textRect = findFirstTextRect(element);
    if (textRect) {
      return Math.max(0, textRect.left - elementRect.left);
    }

    return 0;
  }

  // 检测父元素是否是水平 flex 布局
  function isHorizontalFlexParent(element) {
    const parent = element.parentElement;
    if (!parent) return false;

    const style = window.getComputedStyle(parent);
    const display = style.display;
    const flexDirection = style.flexDirection;

    // 检查是否是水平 flex 布局（flex-direction: row 或 row-reverse）
    if ((display === 'flex' || display === 'inline-flex') &&
        (flexDirection === 'row' || flexDirection === 'row-reverse' || flexDirection === '')) {
      return true;
    }

    return false;
  }

  // 插入翻译块
  function insertTranslationBlock(block, translation) {
    const element = block.element;
    if (!element || !element.parentNode) return;

    // 检查是否已经翻译过，防止重复
    if (element.classList.contains('ai-translator-translated')) return;

    // 标记为已翻译
    element.classList.add('ai-translator-translated');

    // 还原数学公式：将占位符替换回原始 HTML
    let finalTranslation = translation;
    if (block.mathElements && block.mathElements.length > 0) {
      for (const math of block.mathElements) {
        finalTranslation = finalTranslation.replace(math.placeholder, math.html);
      }
    }

    // 复制所有关键样式，包括颜色
    const computedStyle = window.getComputedStyle(element);
    const baseStyle = `
      font-size: ${computedStyle.fontSize};
      font-family: ${computedStyle.fontFamily};
      font-weight: ${computedStyle.fontWeight};
      line-height: ${computedStyle.lineHeight};
      text-align: ${computedStyle.textAlign};
      color: ${computedStyle.color};
      letter-spacing: ${computedStyle.letterSpacing};
      opacity: 0.85;
    `;

    // 检测是否在水平 flex 布局中
    const isHorizontalFlex = isHorizontalFlexParent(element);

    if (isHorizontalFlex) {
      // 对于水平 flex 布局（如顶部导航），将翻译插入到元素内部
      // 翻译显示在原文右侧（inline），保持菜单栏高度不变
      const translationEl = document.createElement('span');
      translationEl.className = 'ai-translator-inline-block ai-translator-inline-right';

      if (block.mathElements && block.mathElements.length > 0) {
        translationEl.innerHTML = ' ' + finalTranslation;
      } else {
        translationEl.textContent = ' ' + translation;
      }

      translationEl.style.cssText = `
        font-size: 0.85em;
        font-family: ${computedStyle.fontFamily};
        font-weight: ${computedStyle.fontWeight};
        line-height: ${computedStyle.lineHeight};
        color: ${computedStyle.color};
        letter-spacing: ${computedStyle.letterSpacing};
        opacity: 0.7;
        display: inline;
        margin: 0;
        padding: 0;
      `;

      // 将翻译作为子元素追加到原元素内部（显示在原文右侧）
      element.appendChild(translationEl);
    } else {
      // 对于非水平 flex 布局（如侧边栏），插入为同级元素
      const translationEl = document.createElement(element.tagName);
      translationEl.className = 'ai-translator-inline-block';

      if (block.mathElements && block.mathElements.length > 0) {
        translationEl.innerHTML = finalTranslation;
      } else {
        translationEl.textContent = translation;
      }

      // 计算原文文本相对于元素的偏移量（跳过 icon 等前置元素）
      const textOffset = getTextOffsetLeft(element);

      translationEl.style.cssText = baseStyle + `
        margin: 0;
        padding: 0;
        padding-left: ${textOffset}px;
        box-sizing: border-box;
      `;

      // 插入到原元素后面
      element.after(translationEl);
    }
  }

  function showPageTranslationProgress() {
    let progressEl = document.getElementById('ai-translator-progress');
    if (!progressEl) {
      progressEl = document.createElement('div');
      progressEl.id = 'ai-translator-progress';
      progressEl.innerHTML = `
        <div class="ai-translator-progress-content">
          <div class="ai-translator-progress-header">
            <span class="ai-translator-progress-text">${t('translatingProgress')}</span>
            <span class="ai-translator-progress-percent">0%</span>
          </div>
          <div class="ai-translator-progress-track">
            <div class="ai-translator-progress-bar"></div>
          </div>
        </div>
        <button class="ai-translator-progress-close" title="${t('closeTranslation')}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      `;
      document.body.appendChild(progressEl);
      
      // 定位到翻译球下方
      positionProgressBar();
      
      // 添加关闭按钮事件 - 使用 mousedown 确保在拖动逻辑之前触发
      const closeBtn = progressEl.querySelector('.ai-translator-progress-close');
      closeBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        forceHideProgressBar();
      });
      
      // 添加拖动功能
      setupProgressBarDrag(progressEl);
    }
  }

  function setupProgressBarDrag(progressEl) {
    let isDragging = false;
    let startX, startY, initialX, initialY;

    progressEl.addEventListener('mousedown', (e) => {
      // 忽略关闭按钮点击
      if (e.target.classList.contains('ai-translator-progress-close')) return;
      
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = progressEl.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      
      progressEl.classList.add('dragging');
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      let newX = initialX + deltaX;
      let newY = initialY + deltaY;

      // 保持在视口内
      const progressWidth = 220;
      const progressHeight = 60;
      newX = Math.max(0, Math.min(window.innerWidth - progressWidth, newX));
      newY = Math.max(0, Math.min(window.innerHeight - progressHeight, newY));

      progressEl.style.left = `${newX}px`;
      progressEl.style.top = `${newY}px`;
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        progressEl.classList.remove('dragging');
      }
    });
  }

  function positionProgressBar() {
    const progressEl = document.getElementById('ai-translator-progress');
    if (!progressEl || !floatBall) return;
    
    const ballRect = floatBall.getBoundingClientRect();
    const progressWidth = 220;
    
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

  function forceHideProgressBar() {
    const progressEl = document.getElementById('ai-translator-progress');
    if (progressEl) {
      progressEl.classList.add('ai-translator-progress-done');
      setTimeout(() => progressEl.remove(), 300);
    }
    // 注意：不重置 isTranslatingPage，翻译任务可能还在后台运行
    // isTranslatingPage 只在翻译真正完成时才重置（在 finally 块中）
  }

  function showTranslatingHint(progressEl) {
    if (!progressEl) return;
    
    // 避免重复触发
    if (progressEl.classList.contains('ai-translator-progress-hint')) return;
    
    const textEl = progressEl.querySelector('.ai-translator-progress-text');
    if (!textEl) return;
    
    const originalText = textEl.textContent;
    
    // 添加闪烁动画类
    progressEl.classList.add('ai-translator-progress-hint');
    
    // 淡出当前文字
    textEl.classList.add('ai-translator-text-fade-out');
    
    setTimeout(() => {
      // 切换文字并淡入
      textEl.textContent = t('pleaseWait');
      textEl.classList.remove('ai-translator-text-fade-out');
      textEl.classList.add('ai-translator-text-fade-in');
      
      // 1.2秒后淡出提示文字
      setTimeout(() => {
        textEl.classList.remove('ai-translator-text-fade-in');
        textEl.classList.add('ai-translator-text-fade-out');
        
        setTimeout(() => {
          // 切换回原文字并淡入
          textEl.textContent = originalText;
          textEl.classList.remove('ai-translator-text-fade-out');
          textEl.classList.add('ai-translator-text-fade-in');
          progressEl.classList.remove('ai-translator-progress-hint');
          
          setTimeout(() => {
            textEl.classList.remove('ai-translator-text-fade-in');
          }, 200);
        }, 200);
      }, 1200);
    }, 200);
  }

  function showAlreadyTranslatedMessage() {
    const progressEl = document.getElementById('ai-translator-progress');
    if (progressEl) {
      progressEl.innerHTML = `
        <div class="ai-translator-progress-content ai-translator-progress-info">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
            <path d="M12 16v-4M12 8h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          <span>${t('pageAlreadyTranslated')}</span>
        </div>
        <button class="ai-translator-progress-close" title="${t('close')}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      `;
      progressEl.classList.add('ai-translator-progress-info-state');
      
      // 重新绑定关闭按钮事件
      const closeBtn = progressEl.querySelector('.ai-translator-progress-close');
      closeBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        forceHideProgressBar();
      });
      
      // 3秒后自动关闭
      setTimeout(() => {
        if (progressEl.parentNode) {
          progressEl.classList.add('ai-translator-progress-done');
          setTimeout(() => {
            if (progressEl.parentNode) progressEl.remove();
          }, 300);
        }
      }, 3000);
    }
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
      // 显示成功状态，保留关闭按钮
      progressEl.innerHTML = `
        <div class="ai-translator-progress-content ai-translator-progress-success">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M7.5 12.5L10.5 15.5L16.5 9.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
          </svg>
          <span>${t('translationComplete')}</span>
        </div>
        <button class="ai-translator-progress-close" title="${t('close')}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      `;
      progressEl.classList.add('ai-translator-progress-success-state');
      
      // 重新绑定关闭按钮事件
      const closeBtn = progressEl.querySelector('.ai-translator-progress-close');
      closeBtn.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
      });
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        forceHideProgressBar();
      });
      
      // 5秒后自动关闭
      setTimeout(() => {
        if (progressEl.parentNode) {
          progressEl.classList.add('ai-translator-progress-done');
          setTimeout(() => {
            if (progressEl.parentNode) progressEl.remove();
          }, 300);
        }
      }, 5000);
    }
  }

  // ==================== Message Listener ====================

  function setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('AI Translator: Received message', message.type, message);
      switch (message.type) {
        case 'TRANSLATE_PAGE':
          translatePage();
          break;
        case 'SHOW_TRANSLATION':
          // 右键菜单翻译选中文本的结果显示
          showTranslationResult(message.text, message.translation);
          break;
        case 'SETTINGS_UPDATED':
          // Only update showFloatBall if explicitly provided in the message
          const prevShowFloatBall = settings.showFloatBall;
          settings = { ...settings, ...message.settings };
          // If showFloatBall was not in the message, preserve the previous value
          if (!('showFloatBall' in message.settings)) {
            settings.showFloatBall = prevShowFloatBall;
          }
          console.log('AI Translator: Settings updated, showFloatBall changed from', prevShowFloatBall, 'to', settings.showFloatBall);
          updateFloatBallVisibility();
          if (message.settings.theme) {
            applyTheme(message.settings.theme);
          }
          break;
        case 'TOGGLE_FLOAT_BALL':
          console.log('AI Translator: TOGGLE_FLOAT_BALL received, show =', message.show);
          // 只有当值确实改变时才更新，避免无效的切换
          if (settings.showFloatBall !== message.show) {
            settings.showFloatBall = message.show;
            updateFloatBallVisibility();
          }
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
