import { defineConfig, devices } from '@playwright/test'

/**
 * CI-specific Playwright configuration
 * Optimized for GitHub Actions headless environment
 */
export default defineConfig({
  testDir: './src/test/e2e',
  globalSetup: './src/test/e2e/auth.setup.ts',
  
  // Extended timeouts for CI environment
  globalTimeout: 45 * 60 * 1000, // 45 minutes
  timeout: 120 * 1000, // 2 minutes per test
  expect: { timeout: 20 * 1000 }, // 20s for assertions
  
  fullyParallel: false, // Sequential for stability
  forbidOnly: true,
  retries: 2, // More retries for flaky CI
  workers: 1, // Single worker for CI
  
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/results.xml' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['line'],
    ['github'] // GitHub Actions integration
  ],
  
  use: {
    baseURL: 'http://127.0.0.1:5173',
    
    // Extended timeouts for CI
    actionTimeout: 30 * 1000,
    navigationTimeout: 90 * 1000,
    
    // Better debugging
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // Headless optimizations for CI
    launchOptions: {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-ipc-flooding-protection'
      ]
    }
  },

  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        storageState: 'src/test/e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false, // Always start fresh in CI
    timeout: 240 * 1000, // 4 minutes to start
    stdout: 'pipe',
    stderr: 'pipe',
    env: {
      NODE_ENV: 'test',
      CI: 'true',
      VITE_E2E_MODE: 'true',
      VITE_CI: 'true'
    }
  },
})
