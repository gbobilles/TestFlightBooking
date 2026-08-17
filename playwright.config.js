const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  timeout: 60000,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: 'html',

  projects: [
    {
      name: 'web',
      testDir: './tests/web',
      use: {
        ...devices['Desktop Chrome'],
        baseURL: process.env.WEB_BASE_URL || 'https://www.cheapflights.com.au',
        headless: process.env.HEADLESS === 'false' ? false : true,
        viewport: { width: 1440, height: 900 },
        screenshot: 'only-on-failure',
        trace: 'retain-on-failure',
      },
    },
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        baseURL: process.env.RESTFUL_BOOKER_URL || 'https://restful-booker.herokuapp.com',
      },
    },
  ],
});
