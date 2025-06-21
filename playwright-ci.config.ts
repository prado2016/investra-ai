import { defineConfig, devices } from '@playwright/test'

/**
 * Fast CI-optimized Playwright configuration
 * Minimal setup for GitHub Actions speed
 */
export default defineConfig({
  testDir: './src/test/e2e',
  
  // Much faster timeouts
  globalTimeout: 5 * 60 * 1000, // 5 minutes total
  timeout: 30 * 1000, // 30 seconds per test
  expect: { timeout: 5 * 1000 }, // 5 seconds for assertions
  
  fullyParallel: false,
  forbidOnly: true,
  retries: 0, // No retries to save time
  workers: 1,
  
  // Minimal reporting
  reporter: [
    ['line'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],
  
  use: {
    baseURL: 'http://127.0.0.1:5173',
    
    // Fast timeouts
    actionTimeout: 10 * 1000,
    navigationTimeout: 15 * 1000,
    
    // No media for speed
    screenshot: 'off',
    video: 'off',
    trace: 'off',
    
    // Fast browser settings
    launchOptions: {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-extensions'
      ]
    }
  },

  // Only basic tests
  projects: [
    {
      name: 'chromium-basic',
      use: { 
        ...devices['Desktop Chrome'],
      },
      testIgnore: [
        '**/performance-load.spec.ts',
        '**/integration-test-suite.spec.ts',
        '**/*.disabled'
      ]
    },
  ],

  // Use built static files instead of dev server for speed
  webServer: {
    command: 'npm run build && npx vite preview --port 5173 --host',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    timeout: 60 * 1000, // 1 minute to start
    stdout: 'ignore',
    stderr: 'pipe'
  },
})
