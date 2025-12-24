// AI Translator Background Script

// Update extension icon based on theme
async function updateIcon(theme) {
  const suffix = theme === 'light' ? '-light' : '';
  const iconPaths = {
    "16": `icons/icon16${suffix}.png`,
    "32": `icons/icon32${suffix}.png`,
    "48": `icons/icon48${suffix}.png`,
    "128": `icons/icon128${suffix}.png`
  };
  
  try {
    await chrome.action.setIcon({ path: iconPaths });
  } catch (error) {
    // If light icons don't exist, fall back to default icons
    if (suffix === '-light') {
      console.log('Light icons not found, using default icons');
      await chrome.action.setIcon({
        path: {
          "16": "icons/icon16.png",
          "32": "icons/icon32.png",
          "48": "icons/icon48.png",
          "128": "icons/icon128.png"
        }
      }).catch(() => {});
    }
  }
}

// Listen for storage changes to update icon
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'sync' && changes.theme) {
    updateIcon(changes.theme.newValue);
  }
});

// Initialize icon on startup
chrome.storage.sync.get({ theme: 'dark' }, (result) => {
  updateIcon(result.theme);
});

// Language display names
const languageNames = {
  'zh-CN': '简体中文',
  'zh-TW': '繁体中文',
  'en': 'English',
  'ja': '日本語',
  'ko': '한국어',
  'fr': 'Français',
  'de': 'Deutsch',
  'es': 'Español',
  'ru': 'Русский'
};

// Default prompt template
const DEFAULT_PROMPT = `You are a professional translator. Translate the given text to {targetLang}. 
Rules:
1. Provide ONLY the translation, no explanations or notes
2. Maintain the original formatting (line breaks, punctuation)
3. Keep technical terms, brand names, and proper nouns in their original form when appropriate
4. If the text is already in the target language, return it as is
5. Translate naturally, not literally`;

// Default batch prompt template
const DEFAULT_BATCH_PROMPT = `You are a professional translator. Translate the given numbered texts to {targetLang}.
Rules:
1. Return translations in the SAME numbered format: [1] translation1 [2] translation2 etc.
2. Keep the numbering system exactly as given
3. Maintain original formatting within each translation
4. Keep technical terms, brand names, and proper nouns in their original form when appropriate
5. If a text is already in the target language, return it as is
6. Translate naturally, not literally`;

// Get browser language and map to supported language
function getBrowserLanguage() {
  const browserLang = navigator.language || navigator.userLanguage || 'en';
  const supportedLangs = ['zh-CN', 'zh-TW', 'en', 'ja', 'ko', 'fr', 'de', 'es', 'pt', 'ru'];

  if (supportedLangs.includes(browserLang)) {
    return browserLang;
  }

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

  const prefix = browserLang.split('-')[0];
  const prefixMatch = supportedLangs.find(lang => lang.startsWith(prefix));
  if (prefixMatch) {
    return prefixMatch;
  }

  return 'en';
}

// Default settings
const defaultSettings = {
  apiEndpoint: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  modelName: 'gpt-4o-mini',
  targetLang: '', // Empty means use browser language
  targetLangSetByUser: false,
  customPrompt: ''
};

// Message listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.type) {
    case 'TRANSLATE':
      handleTranslate(message.text, message.targetLang)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true; // Keep channel open for async response

    case 'TRANSLATE_BATCH':
      handleBatchTranslate(message.texts, message.targetLang)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;

    case 'TRANSLATE_BATCH_FAST':
      handleBatchTranslateFast(message.texts, message.targetLang, message.delimiter)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;

    case 'OPEN_OPTIONS':
      chrome.runtime.openOptionsPage();
      break;
  }
});

// Context menu for right-click translation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'translate-selection',
    title: '翻译选中文本',
    contexts: ['selection']
  });

  chrome.contextMenus.create({
    id: 'translate-page',
    title: '翻译整个页面',
    contexts: ['page']
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'translate-selection' && info.selectionText) {
    try {
      const settings = await chrome.storage.sync.get(defaultSettings);
      const effectiveLang = getEffectiveTargetLang(settings);
      const result = await translateWithAI(info.selectionText, effectiveLang, settings);

      chrome.tabs.sendMessage(tab.id, {
        type: 'SHOW_TRANSLATION',
        text: info.selectionText,
        translation: result
      });
    } catch (error) {
      console.error('Translation failed:', error);
    }
  } else if (info.menuItemId === 'translate-page') {
    chrome.tabs.sendMessage(tab.id, { type: 'TRANSLATE_PAGE' });
  }
});

// Build prompt with variable substitution
function buildPrompt(template, targetLangName) {
  return template.replace(/\{targetLang\}/g, targetLangName);
}

// Get effective target language (browser language if not set by user)
function getEffectiveTargetLang(settings) {
  if (settings.targetLangSetByUser && settings.targetLang) {
    return settings.targetLang;
  }
  return getBrowserLanguage();
}

// Handle single text translation
async function handleTranslate(text, targetLang) {
  const settings = await chrome.storage.sync.get(defaultSettings);

  if (!settings.apiKey) {
    return { error: '请先在设置中配置 API Key' };
  }

  try {
    const effectiveLang = targetLang || getEffectiveTargetLang(settings);
    const translation = await translateWithAI(text, effectiveLang, settings);
    return { translation };
  } catch (error) {
    console.error('Translation error:', error);
    return { error: error.message || '翻译失败，请重试' };
  }
}

// Handle batch translation
async function handleBatchTranslate(texts, targetLang) {
  const settings = await chrome.storage.sync.get(defaultSettings);

  if (!settings.apiKey) {
    return { error: '请先在设置中配置 API Key' };
  }

  try {
    const effectiveLang = targetLang || getEffectiveTargetLang(settings);
    const translations = await translateBatchWithAI(texts, effectiveLang, settings);
    return { translations };
  } catch (error) {
    console.error('Batch translation error:', error);
    return { error: error.message || '翻译失败，请重试' };
  }
}

// Handle fast batch translation with delimiter
async function handleBatchTranslateFast(texts, targetLang, delimiter = '|||') {
  const settings = await chrome.storage.sync.get(defaultSettings);

  if (!settings.apiKey) {
    return { error: '请先在设置中配置 API Key' };
  }

  try {
    const effectiveLang = targetLang || getEffectiveTargetLang(settings);
    const translations = await translateBatchFastWithAI(texts, effectiveLang, settings, delimiter);
    return { translations };
  } catch (error) {
    console.error('Fast batch translation error:', error);
    return { error: error.message || '翻译失败，请重试' };
  }
}

// Translate single text with AI
async function translateWithAI(text, targetLang, settings) {
  const targetLangName = languageNames[targetLang] || targetLang;
  
  // Use custom prompt if provided, otherwise use default
  const promptTemplate = settings.customPrompt || DEFAULT_PROMPT;
  const systemPrompt = buildPrompt(promptTemplate, targetLangName);

  const response = await fetch(settings.apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: text }
      ],
      temperature: 0.3,
      max_tokens: 2000
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API 错误: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || text;
}

// Translate batch of texts with AI (numbered format)
async function translateBatchWithAI(texts, targetLang, settings) {
  const targetLangName = languageNames[targetLang] || targetLang;
  
  // Create numbered list for batch translation
  const numberedTexts = texts.map((text, i) => `[${i + 1}] ${text}`).join('\n\n');
  
  // For batch translation, always use the batch prompt format
  const systemPrompt = buildPrompt(DEFAULT_BATCH_PROMPT, targetLangName);

  const response = await fetch(settings.apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: numberedTexts }
      ],
      temperature: 0.3,
      max_tokens: 4000
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API 错误: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim() || '';
  
  // Parse numbered response
  const translations = parseNumberedResponse(content, texts.length);
  return translations;
}

// Fast batch prompt template
const FAST_BATCH_PROMPT = `You are a professional translator. Translate multiple text segments to {targetLang}.

CRITICAL RULES:
1. Input segments are separated by "<<<>>>"
2. Output translations MUST be separated by "<<<>>>" in the EXACT same order
3. Output ONLY the translations, nothing else
4. Keep technical terms, brand names, proper nouns in original form
5. If already in target language, return as is
6. MUST have exactly the same number of output segments as input

Example:
Input: Hello<<<>>>How are you<<<>>>Thank you
Output: 你好<<<>>>你好吗<<<>>>谢谢`;

// Fast batch translation with delimiter
async function translateBatchFastWithAI(texts, targetLang, settings, delimiter = '<<<>>>') {
  const targetLangName = languageNames[targetLang] || targetLang;
  
  // Join texts with delimiter
  const joinedTexts = texts.join(delimiter);
  
  const systemPrompt = FAST_BATCH_PROMPT.replace(/\{targetLang\}/g, targetLangName);

  const response = await fetch(settings.apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${settings.apiKey}`
    },
    body: JSON.stringify({
      model: settings.modelName,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: joinedTexts }
      ],
      temperature: 0.1,
      max_tokens: 16000
    })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `API 错误: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim() || '';
  
  // Parse by delimiter
  const translations = content.split(delimiter).map(t => t.trim());
  
  // Ensure we have the same number of translations as inputs
  while (translations.length < texts.length) {
    translations.push('');
  }
  
  return translations.slice(0, texts.length);
}

// Parse numbered response from AI
function parseNumberedResponse(content, expectedCount) {
  const translations = [];
  
  // Try to extract translations by numbered pattern
  for (let i = 1; i <= expectedCount; i++) {
    const pattern = new RegExp(`\\[${i}\\]\\s*([\\s\\S]*?)(?=\\[${i + 1}\\]|$)`, 'i');
    const match = content.match(pattern);
    if (match) {
      translations.push(match[1].trim());
    } else {
      translations.push('');
    }
  }
  
  // If parsing failed, try splitting by line
  if (translations.every(t => !t)) {
    const lines = content.split('\n').filter(line => line.trim());
    for (let i = 0; i < expectedCount; i++) {
      translations[i] = lines[i]?.replace(/^\[\d+\]\s*/, '').trim() || '';
    }
  }
  
  return translations;
}
