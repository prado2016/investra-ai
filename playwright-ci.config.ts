import { defineConfig, devices } from '@playwright/test'

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './src/test/e2e',
  /* Global timeout for the entire test run */
  globalTimeout: 20 * 60 * 1000, // 20 minutes on CI
  /* Timeout for each test */
  timeout: 90 * 1000, // 90 seconds per test
  /* Timeout for each action/assertion */
  expect: {
    timeout: 15 * 1000, // 15 seconds for expects
  },
  /* Run tests in files in parallel */
  fullyParallel: false, // Disabled for CI to reduce resource usage
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: true,
  /* Retry on CI */
  retries: 1,
  /* Opt out of parallel tests on CI. */
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['json', { outputFile: 'playwright-report/results.json' }],
    ['junit', { outputFile: 'playwright-report/results.xml' }],
    ['github'] // Add GitHub Actions reporter
  ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://127.0.0.1:5173',

    /* Navigation timeout - prevent hanging on page loads */
    navigationTimeout: 45 * 1000,
    
    /* Action timeout - timeout for clicks, fills, etc. */
    actionTimeout: 15 * 1000,

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Take screenshot on failure */
    screenshot: 'only-on-failure',
    
    /* Record video on failure */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers - reduced for CI */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Only run Chrome on CI to speed up tests
    // Firefox and Safari can be run locally or on specific branches
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false, // Don't reuse on CI
    timeout: 180 * 1000, // 3 minutes for server startup
    /* Stdout to pipe */
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
