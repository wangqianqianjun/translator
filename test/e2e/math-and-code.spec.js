/**
 * Math Formula and Code Block E2E Tests
 * Tests that math formulas and code blocks are preserved during translation
 */
const { test, expect } = require('./fixtures');
const { testSites } = require('./test-sites');
const {
  waitForFloatBall,
  triggerPageTranslation,
  waitForTranslationComplete,
  countElements,
} = require('./helpers');

test.describe('Math Formula Preservation', () => {
  // Skip in CI environment (requires API key)
  test.skip(({ }) => !process.env.AI_TRANSLATOR_API_KEY, 'Requires API key');

  for (const site of testSites.mathFormulas) {
    test(`should preserve math formulas on ${site.name}`, async ({ page }) => {
      await page.goto(site.url);
      await page.waitForLoadState('networkidle');
      await waitForFloatBall(page);

      // Count math elements before translation
      const mathCountBefore = await countElements(page, site.selectors.mathElement);
      expect(mathCountBefore).toBeGreaterThan(0);

      // Trigger translation
      await triggerPageTranslation(page);
      await waitForTranslationComplete(page);

      // Count math elements after translation
      const mathCountAfter = await countElements(page, site.selectors.mathElement);

      // Math elements should still exist
      expect(mathCountAfter).toBe(mathCountBefore);
    });

    test(`math formulas should not be translated on ${site.name}`, async ({ page }) => {
      await page.goto(site.url);
      await page.waitForLoadState('networkidle');
      await waitForFloatBall(page);

      // Get math element content before translation
      const mathContentBefore = await page.evaluate((selector) => {
        const mathEl = document.querySelector(selector);
        return mathEl ? mathEl.innerHTML : null;
      }, site.selectors.mathElement);

      expect(mathContentBefore).not.toBeNull();

      // Trigger translation
      await triggerPageTranslation(page);
      await waitForTranslationComplete(page);

      // Get math element content after translation
      const mathContentAfter = await page.evaluate((selector) => {
        const mathEl = document.querySelector(selector);
        return mathEl ? mathEl.innerHTML : null;
      }, site.selectors.mathElement);

      // Math content should be unchanged
      expect(mathContentAfter).toBe(mathContentBefore);
    });
  }
});

test.describe('Code Block Preservation', () => {
  // Skip in CI environment (requires API key)
  test.skip(({ }) => !process.env.AI_TRANSLATOR_API_KEY, 'Requires API key');

  for (const site of testSites.codeBlocks) {
    test(`should preserve code blocks on ${site.name}`, async ({ page }) => {
      await page.goto(site.url);
      await page.waitForLoadState('networkidle');
      await waitForFloatBall(page);

      // Count code blocks before translation
      const codeCountBefore = await countElements(page, site.selectors.codeBlock);
      expect(codeCountBefore).toBeGreaterThan(0);

      // Get first code block content
      const codeContentBefore = await page.evaluate((selector) => {
        const codeEl = document.querySelector(selector);
        return codeEl ? codeEl.textContent : null;
      }, site.selectors.codeBlock);

      // Trigger translation
      await triggerPageTranslation(page);
      await waitForTranslationComplete(page);

      // Count code blocks after translation
      const codeCountAfter = await countElements(page, site.selectors.codeBlock);

      // Code blocks should still exist
      expect(codeCountAfter).toBe(codeCountBefore);

      // Code content should be unchanged
      const codeContentAfter = await page.evaluate((selector) => {
        const codeEl = document.querySelector(selector);
        return codeEl ? codeEl.textContent : null;
      }, site.selectors.codeBlock);

      expect(codeContentAfter).toBe(codeContentBefore);
    });

    test(`code blocks should not have translation appended on ${site.name}`, async ({ page }) => {
      await page.goto(site.url);
      await page.waitForLoadState('networkidle');
      await waitForFloatBall(page);

      // Trigger translation
      await triggerPageTranslation(page);
      await waitForTranslationComplete(page);

      // Check that code blocks don't have translation class
      const codeWithTranslation = await page.evaluate((selector) => {
        const codeEls = document.querySelectorAll(selector);
        for (const el of codeEls) {
          if (el.classList.contains('ai-translator-translated')) {
            return true;
          }
          // Check parent pre element
          const pre = el.closest('pre');
          if (pre && pre.classList.contains('ai-translator-translated')) {
            return true;
          }
        }
        return false;
      }, site.selectors.codeBlock);

      expect(codeWithTranslation).toBe(false);
    });
  }
});

test.describe('Math and Code - Visual Check', () => {
  test('should take screenshot of page with math formulas', async ({ page }) => {
    const site = testSites.mathFormulas[0];
    await page.goto(site.url);
    await page.waitForLoadState('networkidle');

    // Take screenshot showing math formulas
    const mathElement = page.locator(site.selectors.mathElement).first();
    await mathElement.scrollIntoViewIfNeeded();

    await page.screenshot({
      path: 'test/results/math-formulas.png',
      fullPage: false,
    });
  });
});
