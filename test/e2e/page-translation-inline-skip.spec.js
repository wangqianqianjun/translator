const { test, expect } = require('./fixtures');
const { setExtensionSettings, triggerPageTranslation } = require('./helpers');
const http = require('http');

function startMockOpenAIServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      if (req.method !== 'POST') {
        res.writeHead(404);
        res.end();
        return;
      }

      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => {
        let content = '';
        try {
          const data = JSON.parse(body);
          content = data?.messages?.[data.messages.length - 1]?.content || '';
        } catch {
          content = '';
        }

        const delimiter = '<<<>>>';
        if (content.includes(delimiter)) {
          content = content
            .split(delimiter)
            .map((segment) => (segment ? `[T] ${segment}` : segment))
            .join(delimiter);
        } else if (content) {
          content = `[T] ${content}`;
        }

        const response = JSON.stringify({
          choices: [{ message: { content } }]
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(response);
      });
    });

    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      resolve({
        server,
        endpoint: `http://127.0.0.1:${port}/v1/chat/completions`
      });
    });
  });
}

test('page translation skips blocks with inline translation', async ({ page }) => {
  const { server, endpoint } = await startMockOpenAIServer();

  try {
    await setExtensionSettings(page, {
      apiEndpoint: endpoint,
      apiKey: 'test-key',
      modelName: 'gpt-4.1-mini',
      targetLang: 'zh-CN',
      autoDetect: false,
      enableHoverTranslation: true,
      hoverTranslationHotkey: 'Shift'
    });

    await page.goto('https://example.com');
    await page.waitForSelector('#ai-translator-float-ball');

    await page.evaluate(() => {
      const container = document.createElement('div');
      container.id = 'inline-translation-test';
      container.innerHTML = `
        <p id="inline-para-one">Inline translation paragraph one.</p>
        <p id="inline-para-two">Inline translation paragraph two.</p>
      `;
      document.body.appendChild(container);
    });

    const paragraphOne = page.locator('#inline-para-one');
    const paragraphTwo = page.locator('#inline-para-two');

    await page.keyboard.down('Shift');
    await paragraphOne.hover();
    await page.waitForSelector('#inline-para-one + .ai-translator-hover-translation', { state: 'attached' });
    await page.keyboard.up('Shift');

    await triggerPageTranslation(page);

    await page.waitForFunction(() => {
      const el = document.getElementById('inline-para-two');
      return el && el.classList.contains('ai-translator-translated');
    });

    await expect(paragraphOne).not.toHaveClass(/ai-translator-translated/);
    await expect(page.locator('#inline-translation-test .ai-translator-inline-block')).toHaveCount(2);
  } finally {
    server.close();
  }
});
