// Default prompt template
const DEFAULT_PROMPT = `You are a professional translator. Translate the given text to {targetLang}.
Rules:
1. Provide ONLY the translation, no explanations or notes
2. Maintain the original formatting (line breaks, punctuation)
3. Keep technical terms, brand names, and proper nouns in their original form when appropriate
4. If the text is already in the target language, return it EXACTLY as is (no paraphrasing or reordering)
5. Translate naturally, not literally`;

// Provider configurations
const PROVIDERS = {
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    models: ['gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini', 'o3', 'o3-mini', 'o4-mini'],
    defaultModel: 'gpt-4.1-mini'
  },
  anthropic: {
    name: 'Anthropic Claude',
    endpoint: 'https://api.anthropic.com/v1/messages',
    models: ['claude-opus-4-5-20251124', 'claude-sonnet-4-5-20250929', 'claude-haiku-4-5-20251022', 'claude-opus-4-1-20250805', 'claude-sonnet-4-20250514', 'claude-opus-4-20250514'],
    defaultModel: 'claude-sonnet-4-5-20250929'
  },
  gemini: {
    name: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    models: ['gemini-3-flash', 'gemini-3-pro', 'gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
    defaultModel: 'gemini-3-flash'
  },
  deepseek: {
    name: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    models: ['deepseek-chat', 'deepseek-reasoner'],
    defaultModel: 'deepseek-chat'
  },
  openrouter: {
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    models: [
      // Anthropic Claude
      'anthropic/claude-opus-4.5',
      'anthropic/claude-sonnet-4.5',
      'anthropic/claude-haiku-4.5',
      'anthropic/claude-opus-4.1',
      'anthropic/claude-sonnet-4',
      'anthropic/claude-opus-4',
      // OpenAI
      'openai/gpt-4.1',
      'openai/gpt-4.1-mini',
      'openai/gpt-4.1-nano',
      'openai/gpt-4o',
      'openai/gpt-4o-mini',
      'openai/o3',
      'openai/o3-mini',
      'openai/o4-mini',
      // Google Gemini
      'google/gemini-3-flash',
      'google/gemini-3-pro',
      'google/gemini-2.5-pro',
      'google/gemini-2.5-flash',
      // DeepSeek
      'deepseek/deepseek-chat',
      'deepseek/deepseek-reasoner'
    ],
    defaultModel: 'anthropic/claude-sonnet-4.5'
  },
  ollama: {
    name: 'Ollama (Local)',
    endpoint: 'http://localhost:11434/v1/chat/completions',
    models: ['llama3.3', 'qwen2.5', 'deepseek-r1', 'gemma2'],
    defaultModel: 'llama3.3'
  },
  lmstudio: {
    name: 'LM Studio (Local)',
    endpoint: 'http://localhost:1234/v1/chat/completions',
    models: [],
    defaultModel: ''
  },
  custom: {
    name: 'Custom',
    endpoint: '',
    models: [],
    defaultModel: ''
  }
};

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
  
  // Update title attributes
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const text = t(key);
    if (text && text !== key) {
      el.title = text;
    }
  });
  
  // Update document title
  document.title = `AI Translator - ${t('settings')}`;
}

// Hint translations map
const hintTranslations = {
  'en': {
    apiEndpoint: 'Supports OpenAI compatible API',
    apiKey: 'Your API key is stored securely locally',
    enableSelection: 'Show translate button on text selection',
    enableHoverTranslation: 'Hold Shift while hovering paragraphs to translate',
    showFloatBall: 'Show quick translation button at page corner',
    customPrompt: 'Available variable: {targetLang} - target language. Leave empty for default.',
    presetPrompts: 'Click to apply a preset translation style'
  },
  'zh-CN': {
    apiEndpoint: '支持 OpenAI 兼容的 API 接口',
    apiKey: '你的 API 密钥将安全存储在本地',
    enableSelection: '选中文本后显示翻译按钮',
    enableHoverTranslation: '按住 Shift 悬停段落进行翻译',
    showFloatBall: '页面右下角显示快捷翻译按钮',
    customPrompt: '可用变量: {targetLang} - 目标语言名称。留空使用默认 Prompt。',
    presetPrompts: '点击快速应用预设翻译风格'
  },
  'zh-TW': {
    apiEndpoint: '支持 OpenAI 相容的 API 接口',
    apiKey: '你的 API 密鑰將安全存儲在本地',
    enableSelection: '選中文本後顯示翻譯按鈕',
    enableHoverTranslation: '按住 Shift 懸停段落進行翻譯',
    showFloatBall: '頁面右下角顯示快捷翻譯按鈕',
    customPrompt: '可用變量: {targetLang} - 目標語言名稱。留空使用默認 Prompt。',
    presetPrompts: '點擊快速應用預設翻譯風格'
  },
  'ja': {
    apiEndpoint: 'OpenAI互換APIをサポート',
    apiKey: 'APIキーはローカルに安全に保存されます',
    enableSelection: 'テキスト選択時に翻訳ボタンを表示',
    enableHoverTranslation: 'Shift を押しながら段落にホバーして翻訳',
    showFloatBall: 'ページの角にクイック翻訳ボタンを表示',
    customPrompt: '使用可能な変数: {targetLang} - ターゲット言語。空欄でデフォルトを使用。',
    presetPrompts: 'クリックしてプリセット翻訳スタイルを適用'
  },
  'ko': {
    apiEndpoint: 'OpenAI 호환 API 지원',
    apiKey: 'API 키는 로컬에 안전하게 저장됩니다',
    enableSelection: '텍스트 선택 시 번역 버튼 표시',
    enableHoverTranslation: 'Shift 를 누른 채 문단에 마우스를 올리면 번역',
    showFloatBall: '페이지 모서리에 빠른 번역 버튼 표시',
    customPrompt: '사용 가능한 변수: {targetLang} - 대상 언어. 기본값을 사용하려면 비워 두세요.',
    presetPrompts: '클릭하여 프리셋 번역 스타일 적용'
  },
  'fr': {
    apiEndpoint: 'Prend en charge l\'API compatible OpenAI',
    apiKey: 'Votre clé API est stockée en toute sécurité localement',
    enableSelection: 'Afficher le bouton de traduction lors de la sélection de texte',
    enableHoverTranslation: 'Maintenez Shift et survolez un paragraphe pour traduire',
    showFloatBall: 'Afficher le bouton de traduction rapide dans le coin de la page',
    customPrompt: 'Variable disponible: {targetLang} - langue cible. Laissez vide pour utiliser le défaut.',
    presetPrompts: 'Cliquez pour appliquer un style de traduction prédéfini'
  },
  'de': {
    apiEndpoint: 'Unterstützt OpenAI-kompatible API',
    apiKey: 'Ihr API-Schlüssel wird sicher lokal gespeichert',
    enableSelection: 'Übersetzungsschaltfläche bei Textauswahl anzeigen',
    enableHoverTranslation: 'Mit Shift über Absätze fahren, um zu übersetzen',
    showFloatBall: 'Schnellübersetzungsschaltfläche in der Seitenecke anzeigen',
    customPrompt: 'Verfügbare Variable: {targetLang} - Zielsprache. Leer lassen für Standard.',
    presetPrompts: 'Klicken Sie, um einen voreingestellten Übersetzungsstil anzuwenden'
  },
  'es': {
    apiEndpoint: 'Compatible con API de OpenAI',
    apiKey: 'Su clave API se almacena de forma segura localmente',
    enableSelection: 'Mostrar botón de traducción al seleccionar texto',
    enableHoverTranslation: 'Mantén Shift y pasa el ratón por un párrafo para traducir',
    showFloatBall: 'Mostrar botón de traducción rápida en la esquina de la página',
    customPrompt: 'Variable disponible: {targetLang} - idioma de destino. Dejar vacío para usar el valor predeterminado.',
    presetPrompts: 'Haga clic para aplicar un estilo de traducción predefinido'
  },
  'pt': {
    apiEndpoint: 'Suporta API compatível com OpenAI',
    apiKey: 'Sua chave API é armazenada com segurança localmente',
    enableSelection: 'Mostrar botão de tradução ao selecionar texto',
    enableHoverTranslation: 'Segure Shift e passe o mouse no parágrafo para traduzir',
    showFloatBall: 'Mostrar botão de tradução rápida no canto da página',
    customPrompt: 'Variável disponível: {targetLang} - idioma de destino. Deixe vazio para usar o padrão.',
    presetPrompts: 'Clique para aplicar um estilo de tradução predefinido'
  },
  'ru': {
    apiEndpoint: 'Поддерживает API, совместимый с OpenAI',
    apiKey: 'Ваш API-ключ надёжно хранится локально',
    enableSelection: 'Показывать кнопку перевода при выделении текста',
    enableHoverTranslation: 'Удерживайте Shift и наведите на абзац для перевода',
    showFloatBall: 'Показывать кнопку быстрого перевода в углу страницы',
    customPrompt: 'Доступная переменная: {targetLang} - целевой язык. Оставьте пустым для значения по умолчанию.',
    presetPrompts: 'Нажмите, чтобы применить предустановленный стиль перевода'
  }
};

// Apply hints i18n
function applyHintsI18n(lang) {
  const uiLang = getUILanguage(lang);
  const hints = hintTranslations[uiLang] || hintTranslations['en'];
  
  document.querySelectorAll('[data-i18n-hint]').forEach(el => {
    const key = el.getAttribute('data-i18n-hint');
    if (hints[key]) {
      el.textContent = hints[key];
    }
  });
}

// DOM Elements
const elements = {
  provider: document.getElementById('provider'),
  apiEndpoint: document.getElementById('apiEndpoint'),
  customEndpointGroup: document.getElementById('customEndpointGroup'),
  apiKey: document.getElementById('apiKey'),
  modelSelect: document.getElementById('modelSelect'),
  modelName: document.getElementById('modelName'),
  targetLang: document.getElementById('targetLang'),
  enableSelection: document.getElementById('enableSelection'),
  enableHoverTranslation: document.getElementById('enableHoverTranslation'),
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

// Preset prompt templates
const PROMPT_PRESETS = {
  standard: `You are a professional translator. Translate the given text to {targetLang}.
Rules:
1. Provide ONLY the translation, no explanations or notes
2. Maintain the original formatting (line breaks, punctuation)
3. Keep technical terms, brand names, and proper nouns in their original form when appropriate
4. If the text is already in the target language, return it EXACTLY as is (no paraphrasing or reordering)
5. Translate naturally, not literally`,

  literal: `You are a precise translator. Translate the given text to {targetLang}.
Rules:
1. Provide ONLY the translation, no explanations
2. Translate as literally as possible while maintaining grammatical correctness
3. Preserve the original sentence structure when possible
4. Keep all technical terms, names, and proper nouns unchanged
5. If the text is already in the target language, return it EXACTLY as is (no paraphrasing or reordering)`,

  creative: `You are a creative translator and language artist. Translate the given text to {targetLang}.
Rules:
1. Provide ONLY the translation, no explanations
2. Prioritize natural, fluent expression in the target language
3. Adapt idioms and cultural references to equivalent expressions in the target culture
4. Maintain the tone and emotion of the original text
5. If the text is already in the target language, return it EXACTLY as is (no paraphrasing or reordering)`
};

// Get browser language and map to supported language
function getBrowserLanguage() {
  const browserLang = navigator.language || navigator.userLanguage || 'en';
  const supportedLangs = ['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'ru'];

  // Exact match
  if (supportedLangs.includes(browserLang)) {
    return browserLang;
  }

  // Map common variants
  const langMap = {
    'zh': 'zh-CN',
    'zh-Hans': 'zh-CN',
    'zh-Hant': 'zh-TW',
    'en-US': 'en',
    'en-GB': 'en',
    'ja-JP': 'ja',
    'ko-KR': 'ko',
    'fr-FR': 'fr',
    'de-DE': 'de',
    'es-ES': 'es',
    'pt-BR': 'pt',
    'pt-PT': 'pt',
    'ru-RU': 'ru'
  };

  if (langMap[browserLang]) {
    return langMap[browserLang];
  }

  // Try prefix match
  const prefix = browserLang.split('-')[0];
  const prefixMatch = supportedLangs.find(lang => lang.startsWith(prefix));
  if (prefixMatch) {
    return prefixMatch;
  }

  // Default to English
  return 'en';
}

// Default settings
const defaultSettings = {
  provider: 'openai',
  apiEndpoint: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  modelName: 'gpt-4.1-mini',
  targetLang: '', // Empty means use browser language
  targetLangSetByUser: false, // Track if user ever set the language
  enableSelection: true,
  enableHoverTranslation: true,
  showFloatBall: true,
  autoDetect: true,
  customPrompt: '',
  theme: 'light'
};

// Update model dropdown based on provider
function updateModelDropdown(providerKey, currentModel = '') {
  const provider = PROVIDERS[providerKey];
  const select = elements.modelSelect;

  // Clear existing options
  select.innerHTML = '';

  if (provider && provider.models.length > 0) {
    // Add default empty option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select Model --';
    select.appendChild(defaultOption);

    // Add model options
    provider.models.forEach(model => {
      const option = document.createElement('option');
      option.value = model;
      option.textContent = model;
      select.appendChild(option);
    });

    // Set current model if it exists in the list
    if (currentModel && provider.models.includes(currentModel)) {
      select.value = currentModel;
      elements.modelName.value = '';
    } else if (currentModel) {
      // Model not in list, put it in custom input
      select.value = '';
      elements.modelName.value = currentModel;
    } else {
      // Use default model
      select.value = provider.defaultModel || '';
      elements.modelName.value = '';
    }
  } else {
    // No predefined models, use custom input only
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Enter model name --';
    select.appendChild(defaultOption);
    elements.modelName.value = currentModel;
  }
}

// Handle provider change
function onProviderChange() {
  const providerKey = elements.provider.value;
  const provider = PROVIDERS[providerKey];

  // Show/hide custom endpoint input
  if (providerKey === 'custom') {
    elements.customEndpointGroup.style.display = 'block';
  } else {
    elements.customEndpointGroup.style.display = 'none';
    // Auto-fill endpoint for known providers
    if (provider) {
      elements.apiEndpoint.value = provider.endpoint;
    }
  }

  // Update model dropdown
  updateModelDropdown(providerKey);
}

// Handle model select change
function onModelSelectChange() {
  const selectedModel = elements.modelSelect.value;
  if (selectedModel) {
    // Clear custom input when selecting from dropdown
    elements.modelName.value = '';
  }
}

// Get effective model name (from dropdown or custom input)
function getEffectiveModelName() {
  const selectValue = elements.modelSelect.value;
  const customValue = elements.modelName.value.trim();
  return customValue || selectValue;
}

// Detect provider from endpoint URL
function detectProviderFromEndpoint(endpoint) {
  if (!endpoint) return 'custom';

  for (const [key, provider] of Object.entries(PROVIDERS)) {
    if (key !== 'custom' && provider.endpoint && endpoint === provider.endpoint) {
      return key;
    }
  }

  // Check for partial matches
  if (endpoint.includes('openai.com')) return 'openai';
  if (endpoint.includes('anthropic.com')) return 'anthropic';
  if (endpoint.includes('generativelanguage.googleapis.com')) return 'gemini';
  if (endpoint.includes('deepseek.com')) return 'deepseek';
  if (endpoint.includes('openrouter.ai')) return 'openrouter';
  if (endpoint.includes('localhost:11434')) return 'ollama';
  if (endpoint.includes('localhost:1234')) return 'lmstudio';

  return 'custom';
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  setupEventListeners();
});

// Load settings from storage
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(defaultSettings);

    // Determine target language: use browser language if user never set it
    let targetLang = result.targetLang;
    if (!result.targetLangSetByUser || !targetLang) {
      targetLang = getBrowserLanguage();
    }

    // Determine provider from saved settings or detect from endpoint
    let provider = result.provider;
    if (!provider || !PROVIDERS[provider]) {
      provider = detectProviderFromEndpoint(result.apiEndpoint);
    }

    // Set provider dropdown
    elements.provider.value = provider;

    // Set endpoint
    elements.apiEndpoint.value = result.apiEndpoint;

    // Show/hide custom endpoint group
    if (provider === 'custom') {
      elements.customEndpointGroup.style.display = 'block';
    } else {
      elements.customEndpointGroup.style.display = 'none';
    }

    // Update model dropdown and set current model
    updateModelDropdown(provider, result.modelName);

    elements.apiKey.value = result.apiKey;
    elements.targetLang.value = targetLang;
    elements.enableSelection.checked = result.enableSelection;
    elements.enableHoverTranslation.checked = result.enableHoverTranslation;
    elements.showFloatBall.checked = result.showFloatBall;
    elements.autoDetect.checked = result.autoDetect;
    elements.customPrompt.value = result.customPrompt || '';

    // Apply theme
    applyTheme(result.theme || 'light');

    // Apply i18n based on target language
    applyI18n(targetLang);
    applyHintsI18n(targetLang);
  } catch (error) {
    console.error('Failed to load settings:', error);
    showStatus(t('connectionFailed'), 'error');
  }
}

// Apply theme
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
}

// Toggle theme
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  applyTheme(newTheme);
  
  // Save theme preference
  chrome.storage.sync.set({ theme: newTheme });
  
  // Notify content scripts
  notifyContentScripts({ theme: newTheme });
}

// Save settings to storage
async function saveSettings() {
  const providerKey = elements.provider.value;
  const provider = PROVIDERS[providerKey];

  // Get endpoint: use provider's endpoint unless custom
  let apiEndpoint = elements.apiEndpoint.value.trim();
  if (providerKey !== 'custom' && provider) {
    apiEndpoint = provider.endpoint;
  }

  // Get model name from dropdown or custom input
  const modelName = getEffectiveModelName();

  const settings = {
    provider: providerKey,
    apiEndpoint: apiEndpoint,
    apiKey: elements.apiKey.value.trim(),
    modelName: modelName,
    targetLang: elements.targetLang.value,
    targetLangSetByUser: true, // Mark that user has explicitly set the language
    enableSelection: elements.enableSelection.checked,
    enableHoverTranslation: elements.enableHoverTranslation.checked,
    showFloatBall: elements.showFloatBall.checked,
    autoDetect: elements.autoDetect.checked,
    customPrompt: elements.customPrompt.value.trim(),
    theme: document.documentElement.getAttribute('data-theme') || 'light'
  };

  // Validation
  if (!settings.apiEndpoint) {
    showStatus(t('pleaseEnterApiEndpoint'), 'error');
    if (providerKey === 'custom') {
      elements.apiEndpoint.focus();
    }
    return;
  }

  if (!settings.apiKey) {
    showStatus(t('pleaseEnterApiKey'), 'error');
    elements.apiKey.focus();
    return;
  }

  if (!settings.modelName) {
    showStatus(t('pleaseEnterModelName') || 'Please select or enter a model name', 'error');
    elements.modelName.focus();
    return;
  }

  try {
    await chrome.storage.sync.set(settings);
    showStatus(t('settingsSaved'), 'success');

    // Notify all tabs about settings change
    notifyContentScripts(settings);

    // Update UI language if target language changed
    applyI18n(settings.targetLang);
    applyHintsI18n(settings.targetLang);
  } catch (error) {
    console.error('Failed to save settings:', error);
    showStatus(t('connectionFailed'), 'error');
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

// Detect if the API endpoint is Anthropic Claude API
function isClaudeAPI(endpoint) {
  if (!endpoint) return false;
  return endpoint.includes('anthropic.com') || endpoint.includes('/v1/messages');
}

// Test API connection
async function testConnection() {
  const providerKey = elements.provider.value;
  const provider = PROVIDERS[providerKey];

  // Get endpoint
  let apiEndpoint = elements.apiEndpoint.value.trim();
  if (providerKey !== 'custom' && provider) {
    apiEndpoint = provider.endpoint;
  }

  const apiKey = elements.apiKey.value.trim();
  const modelName = getEffectiveModelName();

  if (!apiEndpoint || !apiKey) {
    showStatus(t('pleaseConfigureApi'), 'warning');
    return;
  }

  showStatus(t('translating'), 'warning');

  try {
    let response;

    if (isClaudeAPI(apiEndpoint)) {
      // Use Claude API format
      response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: modelName || 'claude-sonnet-4-5-20250929',
          max_tokens: 20,
          messages: [
            { role: 'user', content: 'Hi' }
          ]
        })
      });
    } else {
      // Use OpenAI-compatible API format
      response = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: modelName || 'gpt-4.1-mini',
          messages: [
            { role: 'user', content: 'Hi' }
          ],
          max_tokens: 20
        })
      });
    }

    if (response.ok) {
      showStatus(t('connectionSuccess'), 'success');
    } else {
      const error = await response.json().catch(() => ({}));
      showStatus(`${t('connectionFailed')}: ${error.error?.message || response.status}`, 'error');
    }
  } catch (error) {
    showStatus(`${t('connectionFailed')}: ${error.message}`, 'error');
  }
}

// Reset prompt to default
function resetPrompt() {
  elements.customPrompt.value = DEFAULT_PROMPT;
  showStatus(t('resetToDefault'), 'success');
}

// Apply preset prompt
function applyPresetPrompt(presetName) {
  if (PROMPT_PRESETS[presetName]) {
    elements.customPrompt.value = PROMPT_PRESETS[presetName];
    showStatus(t('presetApplied') || 'Preset applied', 'success');
  }
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

  // Provider change handler
  elements.provider.addEventListener('change', onProviderChange);

  // Model select change handler
  elements.modelSelect.addEventListener('change', onModelSelectChange);

  // Preset prompt buttons
  document.querySelectorAll('.btn-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const preset = btn.getAttribute('data-preset');
      applyPresetPrompt(preset);
    });
  });

  // Save on Ctrl+S / Cmd+S
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveSettings();
    }
  });
}
