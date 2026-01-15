/**
 * Hover translation E2E tests
 */
const { test, expect } = require('./fixtures');
const { setExtensionSettings } = require('./helpers');

async function addTestParagraphs(page) {
  await page.evaluate(() => {
    const existing = document.getElementById('ai-translator-test-blocks');
    if (existing) return;
    const container = document.createElement('div');
    container.id = 'ai-translator-test-blocks';
    container.innerHTML = `
      <p id="hover-para-one">First test paragraph for hover translation.</p>
      <p id="hover-para-two">Second test paragraph for hover translation.</p>
    `;
    document.body.appendChild(container);
  });
}

test.describe('Hover Translation', () => {
  test('keeps hover translations for multiple paragraphs', async ({ page }) => {
    await page.goto('https://example.com');
    await page.waitForSelector('#ai-translator-float-ball');

    await addTestParagraphs(page);

    const paragraphOne = page.locator('#hover-para-one');
    const paragraphTwo = page.locator('#hover-para-two');

    await page.keyboard.down('Shift');
    await paragraphOne.hover();
    await page.waitForSelector('#hover-para-one + .ai-translator-hover-translation', { state: 'attached' });

    await paragraphTwo.hover();
    await page.waitForFunction(() => {
      return document.querySelectorAll('.ai-translator-hover-translation').length === 2;
    });

    await page.keyboard.up('Shift');
  });

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

  test('selection translation persists after selection clears', async ({ page }) => {
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
    await page.waitForTimeout(200);
    await page.waitForSelector('.ai-translator-selection-translation', { state: 'attached' });
  });

  test('escape clears all inline translations', async ({ page }) => {
    await page.goto('https://example.com');
    await page.waitForSelector('#ai-translator-float-ball');

    await addTestParagraphs(page);

    const paragraphOne = page.locator('#hover-para-one');
    const paragraphTwo = page.locator('#hover-para-two');

    await page.keyboard.down('Shift');
    await paragraphOne.hover();
    await page.waitForSelector('#hover-para-one + .ai-translator-hover-translation', { state: 'attached' });
    await paragraphTwo.hover();
    await page.waitForFunction(() => {
      return document.querySelectorAll('.ai-translator-hover-translation').length === 2;
    });
    await page.keyboard.up('Shift');

    await page.keyboard.press('Escape');
    await page.waitForFunction(() => {
      return document.querySelectorAll('.ai-translator-hover-translation').length === 0;
    });
  });

  test('right-click on paragraph clears inline translation', async ({ page }) => {
    await page.goto('https://example.com');
    await page.waitForSelector('#ai-translator-float-ball');

    await addTestParagraphs(page);
    const paragraphOne = page.locator('#hover-para-one');

    await page.keyboard.down('Shift');
    await paragraphOne.hover();
    await page.waitForSelector('#hover-para-one + .ai-translator-hover-translation', { state: 'attached' });
    await page.keyboard.up('Shift');

    await page.dispatchEvent('#hover-para-one', 'contextmenu', { button: 2 });
    await page.waitForSelector('#hover-para-one + .ai-translator-hover-translation', { state: 'detached' });
  });

  test('right-click on translation clears inline translation', async ({ page }) => {
    await page.goto('https://example.com');
    await page.waitForSelector('#ai-translator-float-ball');

    await addTestParagraphs(page);
    const paragraphOne = page.locator('#hover-para-one');

    await page.keyboard.down('Shift');
    await paragraphOne.hover();
    await page.waitForSelector('#hover-para-one + .ai-translator-hover-translation', { state: 'attached' });
    await page.keyboard.up('Shift');

    await page.dispatchEvent('.ai-translator-hover-translation', 'contextmenu', { button: 2 });
    await page.waitForSelector('#hover-para-one + .ai-translator-hover-translation', { state: 'detached' });
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
