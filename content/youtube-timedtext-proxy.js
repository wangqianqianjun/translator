// Page-context helper to fetch timedtext with YouTube cookies.
(function() {
  'use strict';

  if (window.__aiTranslatorTimedtextProxy) return;
  window.__aiTranslatorTimedtextProxy = true;

  window.addEventListener('message', async (event) => {
    const data = event.data;
    if (!data || data.source !== 'ai-translator' || data.type !== 'YT_TIMEDTEXT_REQUEST') return;
    const requestId = data.requestId;
    const url = data.url;
    if (!requestId || !url) return;

    try {
      const response = await fetch(url, { credentials: 'include' });
      const text = await response.text();
      window.postMessage({
        source: 'ai-translator',
        type: 'YT_TIMEDTEXT_RESPONSE',
        requestId,
        ok: response.ok,
        status: response.status,
        contentType: response.headers.get('content-type') || '',
        contentLength: response.headers.get('content-length') || '',
        text,
      }, '*');
    } catch (error) {
      window.postMessage({
        source: 'ai-translator',
        type: 'YT_TIMEDTEXT_RESPONSE',
        requestId,
        ok: false,
        status: 0,
        error: String(error),
        text: '',
      }, '*');
    }
  });
})();
