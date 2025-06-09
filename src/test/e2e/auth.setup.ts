/**
 * Authentication setup for E2E tests
 * Sets up test environment variables to bypass authentication
 */

import { chromium, type FullConfig } from '@playwright/test';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function globalSetup(_: FullConfig) {
  console.log('🔐 Setting up authentication bypass for E2E tests...');
  
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  // Set environment variable to enable test mode
  await page.addInitScript(() => {
    // Set a global flag that the app can detect
    (window as unknown as Record<string, unknown>).__E2E_TEST_MODE__ = true;
    
    // Also set it in localStorage for persistence
    localStorage.setItem('__E2E_TEST_MODE__', 'true');
    
    console.log('🧪 E2E test mode enabled - window.__E2E_TEST_MODE__:', (window as unknown as Record<string, unknown>).__E2E_TEST_MODE__);
  });
  
  // Navigate to the app with test mode enabled
  await page.goto('http://127.0.0.1:5173');

  // Wait for the app to load
  await page.waitForLoadState('networkidle');
  
  // Give extra time for the app to initialize
  await page.waitForTimeout(3000);

  // Save the test context state
  await page.context().storageState({ path: 'src/test/e2e/.auth/user.json' });
  
  console.log('💾 E2E test state saved to: src/test/e2e/.auth/user.json');

  await browser.close();
}

export default globalSetup;
