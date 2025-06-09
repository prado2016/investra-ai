import { defineConfig, devices } from '@playwright/test'

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src/test/e2e',
  /* Global timeout for the entire test run */
  globalTimeout: process.env.CI ? 30 * 60 * 1000 : 0, // 30 minutes on CI, no limit locally
  /* Timeout for each test */
  timeout: process.env.CI ? 60 * 1000 : 30 * 1000, // 60s on CI, 30s locally
  /* Timeout for each action/assertion */
  expect: {
    timeout: process.env.CI ? 10 * 1000 : 5 * 1000, // 10s on CI, 5s locally
  },
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI ? [
    ['github'],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }]
  ] : [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }]
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://127.0.0.1:5173',

    /* Navigation timeout - prevent hanging on page loads */
    navigationTimeout: process.env.CI ? 30 * 1000 : 15 * 1000, // 30s on CI, 15s locally
    
    /* Action timeout - timeout for clicks, fills, etc. */
    actionTimeout: process.env.CI ? 10 * 1000 : 5 * 1000, // 10s on CI, 5s locally

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers - reduced for CI */
  projects: process.env.CI ? [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ] : [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: !process.env.CI,
    timeout: process.env.CI ? 120 * 1000 : 60 * 1000, // 2 minutes on CI, 1 minute locally
    /* Stdout to pipe */
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
