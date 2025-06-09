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
    
    // Also set CI flag for more aggressive detection
    (window as unknown as Record<string, unknown>).__CI_TEST_MODE__ = true;
    
    console.log('🧪 E2E test mode enabled - window.__E2E_TEST_MODE__:', (window as unknown as Record<string, unknown>).__E2E_TEST_MODE__);
  });
  
  // Navigate to the app with test mode enabled
  await page.goto('http://127.0.0.1:5173');

  // Wait for the app to load
  await page.waitForLoadState('networkidle', { timeout: 60000 });
  
  // Try to wait for content to appear with multiple strategies
  try {
    // First, wait for any content in the root div
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.innerHTML.length > 0;
    }, { timeout: 30000 });
    
    console.log('🎯 Root content detected, waiting for navigation...');
    
    // Then wait for navigation specifically
    await page.waitForSelector('nav.nav-container', { timeout: 30000 });
    
    console.log('🧭 Navigation found, waiting for Dashboard...');
    
    // Finally verify the Dashboard is visible
    await page.waitForSelector('h1:has-text("Dashboard")', { timeout: 15000 });
    
    console.log('✅ Dashboard confirmed, setup complete!');
    
  } catch (error) {
    console.log('⚠️ Initial setup failed, trying alternative approach...');
    
    // Alternative: Just ensure we have minimal viable state
    await page.evaluate(() => {
      // Force set the E2E mode again
      (window as unknown as Record<string, unknown>).__E2E_TEST_MODE__ = true;
      localStorage.setItem('__E2E_TEST_MODE__', 'true');
      localStorage.setItem('__AUTH_BYPASS__', 'true');
    });
    
    // Reload and try once more
    await page.reload({ waitUntil: 'networkidle' });
    
    // Wait for any content at all
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.innerHTML.length > 0;
    }, { timeout: 30000 });
    
    console.log('🔄 Alternative setup completed');
  }

  // Save the test context state
  await page.context().storageState({ path: 'src/test/e2e/.auth/user.json' });
  
  console.log('💾 E2E test state saved to: src/test/e2e/.auth/user.json');

  await browser.close();
}

export default globalSetup;
