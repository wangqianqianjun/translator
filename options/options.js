// Default prompt template
const DEFAULT_PROMPT = `You are a professional translator. Translate the given text to {targetLang}. 
Rules:
1. Provide ONLY the translation, no explanations or notes
2. Maintain the original formatting (line breaks, punctuation)
3. Keep technical terms, brand names, and proper nouns in their original form when appropriate
4. If the text is already in the target language, return it as is
5. Translate naturally, not literally`;

// DOM Elements
const elements = {
  apiEndpoint: document.getElementById('apiEndpoint'),
  apiKey: document.getElementById('apiKey'),
  modelName: document.getElementById('modelName'),
  targetLang: document.getElementById('targetLang'),
  enableSelection: document.getElementById('enableSelection'),
  showFloatBall: document.getElementById('showFloatBall'),
  autoDetect: document.getElementById('autoDetect'),
  customPrompt: document.getElementById('customPrompt'),
  saveSettings: document.getElementById('saveSettings'),
  testConnection: document.getElementById('testConnection'),
  resetPrompt: document.getElementById('resetPrompt'),
  toggleApiKey: document.getElementById('toggleApiKey'),
  themeToggle: document.getElementById('themeToggle'),
  statusMessage: document.getElementById('statusMessage'),
  eyeIcon: document.getElementById('eyeIcon')
};

// Default settings
const defaultSettings = {
  apiEndpoint: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  modelName: 'gpt-4o-mini',
  targetLang: 'zh-CN',
  enableSelection: true,
  showFloatBall: true,
  autoDetect: true,
  customPrompt: '',
  theme: 'dark'
};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupEventListeners();
});

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(defaultSettings);
    
    elements.apiEndpoint.value = result.apiEndpoint;
    elements.apiKey.value = result.apiKey;
    elements.modelName.value = result.modelName;
    elements.targetLang.value = result.targetLang;
    elements.enableSelection.checked = result.enableSelection;
    elements.showFloatBall.checked = result.showFloatBall;
    elements.autoDetect.checked = result.autoDetect;
    elements.customPrompt.value = result.customPrompt || '';
    
    // Apply theme
    applyTheme(result.theme || 'dark');
  } catch (error) {
    console.error('Failed to load settings:', error);
    showStatus('加载设置失败', 'error');
  }
}

// Apply theme
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

// Toggle theme
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  
  // Save theme preference
  chrome.storage.sync.set({ theme: newTheme });
  
  // Notify content scripts
  notifyContentScripts({ theme: newTheme });
}

// Save settings to storage
async function saveSettings() {
  const settings = {
    apiEndpoint: elements.apiEndpoint.value.trim(),
    apiKey: elements.apiKey.value.trim(),
    modelName: elements.modelName.value.trim(),
    targetLang: elements.targetLang.value,
    enableSelection: elements.enableSelection.checked,
    showFloatBall: elements.showFloatBall.checked,
    autoDetect: elements.autoDetect.checked,
    customPrompt: elements.customPrompt.value.trim(),
    theme: document.documentElement.getAttribute('data-theme') || 'dark'
  };

  // Validation
  if (!settings.apiEndpoint) {
    showStatus('请填写 API 地址', 'error');
    elements.apiEndpoint.focus();
    return;
  }

  if (!settings.apiKey) {
    showStatus('请填写 API Key', 'error');
    elements.apiKey.focus();
    return;
  }

  try {
    await chrome.storage.sync.set(settings);
    showStatus('✓ 设置已保存', 'success');
    
    // Notify all tabs about settings change
    notifyContentScripts(settings);
  } catch (error) {
    console.error('Failed to save settings:', error);
    showStatus('保存设置失败', 'error');
  }
}

// Notify content scripts
async function notifyContentScripts(settings) {
  try {
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        type: 'SETTINGS_UPDATED',
        settings
      }).catch(() => {});
    });
  } catch (error) {
    // Ignore errors
  }
}

// Test API connection
async function testConnection() {
  const apiEndpoint = elements.apiEndpoint.value.trim();
  const apiKey = elements.apiKey.value.trim();
  const modelName = elements.modelName.value.trim();

  if (!apiEndpoint || !apiKey) {
    showStatus('请先填写 API 地址和 Key', 'warning');
    return;
  }

  showStatus('正在测试连接...', 'warning');

  try {
    const response = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: modelName || 'gpt-4o-mini',
        messages: [
          { role: 'user', content: 'Hi' }
        ],
        max_tokens: 5
      })
    });

    if (response.ok) {
      showStatus('✓ 连接成功！API 配置正确', 'success');
    } else {
      const error = await response.json().catch(() => ({}));
      showStatus(`连接失败: ${error.error?.message || response.status}`, 'error');
    }
  } catch (error) {
    showStatus(`连接失败: ${error.message}`, 'error');
  }
}

// Reset prompt to default
function resetPrompt() {
  elements.customPrompt.value = DEFAULT_PROMPT;
  showStatus('已恢复默认 Prompt', 'success');
}

// Toggle API Key visibility
function toggleApiKeyVisibility() {
  const isPassword = elements.apiKey.type === 'password';
  elements.apiKey.type = isPassword ? 'text' : 'password';
  
  if (isPassword) {
    elements.eyeIcon.innerHTML = `
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    `;
  } else {
    elements.eyeIcon.innerHTML = `
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    `;
  }
}

// Show status message
function showStatus(message, type) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message ${type}`;
  
  if (type === 'success') {
    setTimeout(() => {
      elements.statusMessage.classList.add('hidden');
    }, 3000);
  }
}

// Setup event listeners
function setupEventListeners() {
  elements.saveSettings.addEventListener('click', saveSettings);
  elements.testConnection.addEventListener('click', testConnection);
  elements.resetPrompt.addEventListener('click', resetPrompt);
  elements.toggleApiKey.addEventListener('click', toggleApiKeyVisibility);
  elements.themeToggle.addEventListener('click', toggleTheme);
  
  // Save on Ctrl+S / Cmd+S
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveSettings();
    }
  });
}
