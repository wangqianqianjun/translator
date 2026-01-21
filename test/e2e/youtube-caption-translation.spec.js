const { test, expect } = require('./fixtures');
const { setExtensionSettings } = require('./helpers');

const html = `<!doctype html>
<html>
<head><meta charset="utf-8"></head>
<body>
  <div class="ytp-caption-window-container">
    <div class="ytp-caption-window">
      <span class="captions-text">Hello world</span>
    </div>
  </div>
  <button class="ytp-subtitles-button" aria-pressed="true"></button>
  <video id="video"></video>
  <script>
    window.ytInitialPlayerResponse = {
      videoDetails: { videoId: 'abc123' },
      captions: {
        playerCaptionsTracklistRenderer: {
          captionTracks: [
            { languageCode: 'en', baseUrl: 'https://www.youtube.com/api/timedtext?fmt=json3&lang=en' }
          ]
        }
      }
    };
  </script>
</body>
</html>`;

test('renders translated line when captions on and language differs', async ({ page, context }) => {
  await setExtensionSettings(page, {
    targetLang: 'zh-CN',
    targetLangSetByUser: true,
    apiKey: 'sk-test',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    modelName: 'gpt-4.1-mini',
    enableYoutubeCaptionTranslation: true,
  });

  await context.route('https://www.youtube.com/watch**', (route) => {
    route.fulfill({ status: 200, contentType: 'text/html', body: html });
  });

  await context.route('https://www.youtube.com/api/timedtext**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        events: [{ tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: 'Hello world' }] }]
      })
    });
  });

  await context.route('https://api.openai.com/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: { content: '你好世界' } }]
      })
    });
  });

  await page.goto('https://www.youtube.com/watch?v=abc123');

  await page.evaluate(() => {
    const video = document.querySelector('video');
    video.currentTime = 0.5;
    video.dispatchEvent(new Event('timeupdate'));
  });
  await expect(page.locator('#ai-translator-youtube-caption-overlay')).toContainText('你好世界');
});

test('skips translation when track language matches target', async ({ page, context }) => {
  let apiCalls = 0;

  await setExtensionSettings(page, {
    targetLang: 'en',
    targetLangSetByUser: true,
    apiKey: 'sk-test',
    apiEndpoint: 'https://api.openai.com/v1/chat/completions',
    modelName: 'gpt-4.1-mini',
    enableYoutubeCaptionTranslation: true,
  });

  await context.route('https://www.youtube.com/watch**', (route) => {
    route.fulfill({ status: 200, contentType: 'text/html', body: html });
  });

  await context.route('https://www.youtube.com/api/timedtext**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        events: [{ tStartMs: 0, dDurationMs: 2000, segs: [{ utf8: 'Hello world' }] }]
      })
    });
  });

  await context.route('https://api.openai.com/**', (route) => {
    apiCalls += 1;
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        choices: [{ message: { content: 'ignored' } }]
      })
    });
  });

  await page.goto('https://www.youtube.com/watch?v=abc123');
  await page.waitForTimeout(1500);

  expect(apiCalls).toBe(0);
});
