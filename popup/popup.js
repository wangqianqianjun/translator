// DOM Elements
const elements = {
  translatePage: document.getElementById('translatePage'),
  toggleFloatBall: document.getElementById('toggleFloatBall'),
  toggleYoutubeCaptions: document.getElementById('toggleYoutubeCaptions'),
  openSettings: document.getElementById('openSettings'),
  floatBallStatus: document.getElementById('floatBallStatus'),
  youtubeCaptionsStatus: document.getElementById('youtubeCaptionsStatus'),
  statusText: document.getElementById('statusText')
};

// Default settings
const defaultSettings = {
  apiKey: '',
  showFloatBall: true,
  enableYoutubeCaptionTranslation: false,
  targetLang: 'zh-CN',
  theme: 'light'
};

// Apply theme
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

// Current UI language
let currentUILang = 'en';

// i18n helper
function t(key) {
  return getMessage(key, currentUILang);
}

// Apply i18n to page
function applyI18n(lang) {
  currentUILang = getUILanguage(lang);
  
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const text = t(key);
    if (text && text !== key) {
      el.textContent = text;
    }
  });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkStatus();
  setupEventListeners();
});

// Check API status and float ball state
async function checkStatus() {
  try {
    const settings = await chrome.storage.sync.get(defaultSettings);
    
    // Apply theme
    applyTheme(settings.theme || 'light');
    
    // Apply i18n based on target language
    applyI18n(settings.targetLang);
    
    // Update float ball status
    elements.floatBallStatus.textContent = settings.showFloatBall ? t('on') : t('off');
    elements.youtubeCaptionsStatus.textContent = settings.enableYoutubeCaptionTranslation ? t('on') : t('off');
    
    // Check if API is configured
    if (!settings.apiKey) {
      elements.statusText.textContent = t('apiNotConfigured');
      document.body.classList.add('status-error');
    } else {
      elements.statusText.textContent = t('ready');
    }
  } catch (error) {
    console.error('Failed to check status:', error);
  }
}

// Translate current page
async function translateCurrentPage() {
  try {
    const settings = await chrome.storage.sync.get(defaultSettings);
    
    if (!settings.apiKey) {
      elements.statusText.textContent = t('configureApiKeyFirst');
      document.body.classList.add('status-error');
      // Open settings
      chrome.runtime.openOptionsPage();
      return;
    }

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.id) {
      elements.statusText.textContent = t('translationFailed');
      return;
    }

    // Send message to content script
    chrome.tabs.sendMessage(tabs[0].id, { type: 'TRANSLATE_PAGE' });
    
    elements.statusText.textContent = t('translating');
    
    // Close popup after a short delay
    setTimeout(() => window.close(), 500);
  } catch (error) {
    console.error('Failed to translate page:', error);
    elements.statusText.textContent = t('translationFailed');
  }
}

// Toggle float ball
async function toggleFloatBall() {
  try {
    const settings = await chrome.storage.sync.get(defaultSettings);
    const newState = !settings.showFloatBall;
    
    await chrome.storage.sync.set({ showFloatBall: newState });
    elements.floatBallStatus.textContent = newState ? t('on') : t('off');
    
    // Notify all tabs
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'TOGGLE_FLOAT_BALL',
        show: newState
      }).catch(() => {});
    });
  } catch (error) {
    console.error('Failed to toggle float ball:', error);
  }
}

// Toggle YouTube captions translation
async function toggleYoutubeCaptions() {
  try {
    const settings = await chrome.storage.sync.get(defaultSettings);
    const newState = !settings.enableYoutubeCaptionTranslation;

    await chrome.storage.sync.set({ enableYoutubeCaptionTranslation: newState });
    elements.youtubeCaptionsStatus.textContent = newState ? t('on') : t('off');
  } catch (error) {
    console.error('Failed to toggle YouTube captions:', error);
  }
}

// Open settings page
function openSettings() {
  chrome.runtime.openOptionsPage();
  window.close();
}

// Setup event listeners
function setupEventListeners() {
  elements.translatePage.addEventListener('click', translateCurrentPage);
  elements.toggleFloatBall.addEventListener('click', toggleFloatBall);
  elements.toggleYoutubeCaptions.addEventListener('click', toggleYoutubeCaptions);
  elements.openSettings.addEventListener('click', openSettings);
}
