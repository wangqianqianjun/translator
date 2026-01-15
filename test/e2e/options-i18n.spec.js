const { test, expect } = require('./fixtures');
const { getMessage } = require('../../i18n/messages');
const { setExtensionSettings } = require('./helpers');

test('options hints use i18n keys', async ({ page, extensionId }) => {
  await setExtensionSettings(page, {
    targetLang: 'en',
    targetLangSetByUser: true,
  });

  const optionsUrl = `chrome-extension://${extensionId}/options/options.html`;
  await page.goto(optionsUrl);
  await page.waitForSelector('#provider');

  const hint = page.locator('[data-i18n-hint="hintApiEndpoint"]');
  await expect(hint).toHaveCount(1);
  await expect(hint).toHaveText(getMessage('hintApiEndpoint', 'en'));

  await expect(page.locator('#apiKey')).toHaveAttribute('placeholder', getMessage('placeholderApiKey', 'en'));
  await expect(page.locator('#toggleApiKey')).toHaveAttribute('title', getMessage('toggleApiKey', 'en'));
  await expect(page.locator('#provider option[value="openai"]')).toHaveText(getMessage('providerOpenai', 'en'));
  await expect(page.locator('#targetLang option[value="zh-CN"]')).toHaveText(getMessage('langZhCN', 'en'));
});
