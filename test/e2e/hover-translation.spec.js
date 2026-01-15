/**
 * Hover translation E2E tests
 */
const { test, expect } = require('./fixtures');
const { setExtensionSettings } = require('./helpers');

test.describe('Hover Translation', () => {
  test('toggles translation on hotkey press and persists after keyup', async ({ page }) => {
    await page.goto('https://example.com');
    await page.waitForSelector('#ai-translator-float-ball');

    const paragraph = page.locator('p').first();
    await paragraph.scrollIntoViewIfNeeded();

    await page.keyboard.down('Shift');
    await paragraph.hover();

    await page.waitForSelector('.ai-translator-hover-translation', { state: 'attached' });

    await page.keyboard.up('Shift');
    await page.waitForTimeout(200);
    await page.waitForSelector('.ai-translator-hover-translation', { state: 'attached' });

    await page.keyboard.down('Shift');
    await page.waitForSelector('.ai-translator-hover-translation', { state: 'detached' });
    await page.keyboard.up('Shift');
  });

  test('supports configurable hover hotkey', async ({ page }) => {
    await page.goto('https://example.com');
    await page.waitForSelector('#ai-translator-float-ball');

    await setExtensionSettings(page, { hoverTranslationHotkey: 'Alt' });

    const paragraph = page.locator('p').first();
    await paragraph.scrollIntoViewIfNeeded();

    await page.keyboard.down('Shift');
    await paragraph.hover();
    await page.waitForTimeout(300);
    await page.keyboard.up('Shift');
    await page.waitForSelector('.ai-translator-hover-translation', { state: 'detached' });

    await page.keyboard.down('Alt');
    await paragraph.hover();
    await page.waitForSelector('.ai-translator-hover-translation', { state: 'attached' });
    await page.keyboard.up('Alt');
  });

  test('selection translation renders inline and clears on deselect', async ({ page }) => {
    await page.goto('https://example.com');
    await page.waitForSelector('#ai-translator-float-ball');

    const paragraph = page.locator('p').first();
    await paragraph.scrollIntoViewIfNeeded();
    await paragraph.selectText();
    const box = await paragraph.boundingBox();
    if (box) {
      await page.dispatchEvent('p', 'mouseup', {
        clientX: box.x + Math.min(10, box.width / 2),
        clientY: box.y + Math.min(10, box.height / 2),
      });
    }

    await page.waitForSelector('#ai-translator-selection-btn', { state: 'visible' });
    await page.click('#ai-translator-selection-btn');

    await page.waitForSelector('.ai-translator-selection-translation', { state: 'attached' });

    await page.evaluate(() => window.getSelection().removeAllRanges());
    await page.waitForSelector('.ai-translator-selection-translation', { state: 'detached' });
  });

  test('selection translation works when hover translation is disabled', async ({ page }) => {
    await page.goto('https://example.com');
    await page.waitForSelector('#ai-translator-float-ball');

    await setExtensionSettings(page, {
      enableHoverTranslation: false,
      selectionTranslationMode: 'inline',
    });

    const paragraph = page.locator('p').first();
    await paragraph.scrollIntoViewIfNeeded();
    await paragraph.selectText();
    const box = await paragraph.boundingBox();
    if (box) {
      await page.dispatchEvent('p', 'mouseup', {
        clientX: box.x + Math.min(10, box.width / 2),
        clientY: box.y + Math.min(10, box.height / 2),
      });
    }

    await page.waitForSelector('#ai-translator-selection-btn', { state: 'visible' });
    await page.click('#ai-translator-selection-btn');

    await page.waitForSelector('.ai-translator-selection-translation', { state: 'attached' });
  });
});
