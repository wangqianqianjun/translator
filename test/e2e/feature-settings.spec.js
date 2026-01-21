const { test, expect } = require('./fixtures');
const { setExtensionSettings } = require('./helpers');

async function getSetting(context, key) {
  let worker = context.serviceWorkers()[0];
  if (!worker) {
    worker = await context.waitForEvent('serviceworker');
  }
  return worker.evaluate((settingKey) => new Promise((resolve) => {
    chrome.storage.sync.get([settingKey], (result) => resolve(result[settingKey]));
  }), key);
}

test('options toggle updates youtube caption setting', async ({ page, context, extensionId }) => {
  await setExtensionSettings(page, {
    targetLang: 'en',
    targetLangSetByUser: true,
  });

  const optionsUrl = `chrome-extension://${extensionId}/options/options.html`;
  await page.goto(optionsUrl);

  const toggle = page.locator('#enableYoutubeCaptionTranslation');
  await expect(toggle).toBeVisible();
  await toggle.check();

  await expect.poll(async () => getSetting(context, 'enableYoutubeCaptionTranslation')).toBe(true);
});

test('popup toggle updates youtube caption setting', async ({ page, context, extensionId }) => {
  const popupUrl = `chrome-extension://${extensionId}/popup/popup.html`;
  await page.goto(popupUrl);

  const toggle = page.locator('#toggleYoutubeCaptions');
  await expect(toggle).toBeVisible();
  await toggle.click();

  await expect.poll(async () => getSetting(context, 'enableYoutubeCaptionTranslation')).toBe(true);
});
