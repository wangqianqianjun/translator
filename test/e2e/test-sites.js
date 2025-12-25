/**
 * Test sites covering different layout types and features
 */
const testSites = {
  // Sidebar navigation with icons (vertical menu)
  sidebarWithIcons: [
    {
      name: 'OpenRouter Docs',
      url: 'https://openrouter.ai/docs/quickstart',
      selectors: {
        menuItem: '.fern-sidebar-link',
        menuIcon: '.fern-sidebar-link svg',
        menuText: '.fern-sidebar-link-title-inner',
      },
    },
    {
      name: 'Anthropic Docs',
      url: 'https://docs.anthropic.com/en/docs/welcome',
      selectors: {
        menuItem: '[data-testid="sidebar-link"]',
        menuIcon: '[data-testid="sidebar-link"] svg',
        menuText: '[data-testid="sidebar-link"] span',
      },
    },
  ],

  // Horizontal navigation (top menu bar)
  horizontalNav: [
    {
      name: 'GitHub',
      url: 'https://github.com',
      selectors: {
        navItem: 'nav a',
      },
    },
    {
      name: 'Hacker News',
      url: 'https://news.ycombinator.com',
      selectors: {
        navItem: '.pagetop a',
      },
    },
  ],

  // Pages with math formulas
  mathFormulas: [
    {
      name: 'Wikipedia Math',
      url: 'https://en.wikipedia.org/wiki/Euler%27s_formula',
      selectors: {
        mathElement: '.mwe-math-element',
        mathFallback: '.mwe-math-fallback-image-inline',
      },
    },
  ],

  // Pages with code blocks
  codeBlocks: [
    {
      name: 'MDN Web Docs',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Functions',
      selectors: {
        codeBlock: 'pre code',
      },
    },
  ],

  // React SPA pages (test float ball persistence)
  reactSPA: [
    {
      name: 'React Dev',
      url: 'https://react.dev/learn',
      selectors: {
        spaLink: 'nav a',
      },
    },
  ],

  // Long article pages
  articles: [
    {
      name: 'BBC News',
      url: 'https://www.bbc.com/news',
      selectors: {
        article: 'article',
        headline: 'h3',
      },
    },
  ],
};

module.exports = { testSites };
