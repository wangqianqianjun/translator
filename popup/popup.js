// DOM Elements
const elements = {
  translatePage: document.getElementById('translatePage'),
  toggleFloatBall: document.getElementById('toggleFloatBall'),
  openSettings: document.getElementById('openSettings'),
  floatBallStatus: document.getElementById('floatBallStatus'),
  statusText: document.getElementById('statusText')
};

// Default settings
const defaultSettings = {
  apiKey: '',
  showFloatBall: true
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await checkStatus();
  setupEventListeners();
});

// Check API status and float ball state
async function checkStatus() {
  try {
    const settings = await chrome.storage.sync.get(defaultSettings);
    
    // Update float ball status
    elements.floatBallStatus.textContent = settings.showFloatBall ? '开启' : '关闭';
    
    // Check if API is configured
    if (!settings.apiKey) {
      elements.statusText.textContent = '未配置 API';
      document.body.classList.add('status-error');
    } else {
      elements.statusText.textContent = '就绪';
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
      elements.statusText.textContent = '请先配置 API';
      document.body.classList.add('status-error');
      // Open settings
      chrome.runtime.openOptionsPage();
      return;
    }

    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tabs[0]?.id) {
      elements.statusText.textContent = '无法获取页面';
      return;
    }

    // Send message to content script
    chrome.tabs.sendMessage(tabs[0].id, { type: 'TRANSLATE_PAGE' });
    
    elements.statusText.textContent = '正在翻译...';
    
    // Close popup after a short delay
    setTimeout(() => window.close(), 500);
  } catch (error) {
    console.error('Failed to translate page:', error);
    elements.statusText.textContent = '翻译失败';
  }
}

// Toggle float ball
async function toggleFloatBall() {
  try {
    const settings = await chrome.storage.sync.get(defaultSettings);
    const newState = !settings.showFloatBall;
    
    await chrome.storage.sync.set({ showFloatBall: newState });
    elements.floatBallStatus.textContent = newState ? '开启' : '关闭';
    
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

// Open settings page
function openSettings() {
  chrome.runtime.openOptionsPage();
  window.close();
}

// Setup event listeners
function setupEventListeners() {
  elements.translatePage.addEventListener('click', translateCurrentPage);
  elements.toggleFloatBall.addEventListener('click', toggleFloatBall);
  elements.openSettings.addEventListener('click', openSettings);
}
