/**
 * Hover translation E2E tests
 */
const { test, expect } = require('./fixtures');

test.describe('Hover Translation', () => {
  test('shows and hides inline translation on Shift hover', async ({ page }) => {
    await page.goto('https://example.com');
    await page.waitForSelector('#ai-translator-float-ball');

    const paragraph = page.locator('p').first();
    await paragraph.scrollIntoViewIfNeeded();

    await page.keyboard.down('Shift');
    await paragraph.hover();

    await page.waitForSelector('.ai-translator-hover-translation', { state: 'attached' });

    await page.keyboard.up('Shift');
    await page.waitForSelector('.ai-translator-hover-translation', { state: 'detached' });
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
});
