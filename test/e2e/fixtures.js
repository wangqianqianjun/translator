/**
 * Playwright fixtures for Chrome Extension testing
 * Extends base test with extension-loaded browser context
 */
const { test as base, chromium } = require('@playwright/test');
const path = require('path');

// Path to the extension
const extensionPath = path.resolve(__dirname, '../../');

/**
 * Extended test fixture that loads the Chrome extension
 */
const test = base.extend({
  /**
   * Browser context with extension loaded
   * Uses persistent context to support Chrome extensions
   */
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      headless: false, // Extensions require headed mode
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
      viewport: { width: 1280, height: 720 },
    });

    // Wait for extension to be ready
    await context.waitForEvent('page');

    await use(context);
    await context.close();
  },

  /**
   * Extension page - for accessing extension popup/options
   */
  extensionId: async ({ context }, use) => {
    // Get extension ID from service worker
    let extensionId;

    // Wait for service worker to be registered
    const serviceWorkers = await context.serviceWorkers();
    if (serviceWorkers.length > 0) {
      const url = serviceWorkers[0].url();
      const match = url.match(/chrome-extension:\/\/([^/]+)/);
      if (match) {
        extensionId = match[1];
      }
    }

    // Fallback: wait for service worker
    if (!extensionId) {
      const worker = await context.waitForEvent('serviceworker');
      const url = worker.url();
      const match = url.match(/chrome-extension:\/\/([^/]+)/);
      if (match) {
        extensionId = match[1];
      }
    }

    await use(extensionId);
  },

  /**
   * Create a new page with extension loaded
   */
  page: async ({ context }, use) => {
    const page = await context.newPage();
    await use(page);
    await page.close();
  },
});

const { expect } = require('@playwright/test');

module.exports = { test, expect, extensionPath };
