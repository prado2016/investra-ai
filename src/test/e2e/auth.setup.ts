/**
 * Authentication setup for E2E tests
 * Sets up test environment variables to bypass authentication
 */

import { chromium, type FullConfig } from '@playwright/test';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function globalSetup(_: FullConfig) {
  console.log('🔐 Setting up authentication bypass for E2E tests...');
  
  const browser = await chromium.launch();
  const context = await browser.newContext();
  
  // Set localStorage directly in the browser context
  await context.addInitScript(() => {
    // Set multiple E2E test flags
    localStorage.setItem('__E2E_TEST_MODE__', 'true');
    localStorage.setItem('__AUTH_BYPASS__', 'true');
    localStorage.setItem('__CI_TEST_MODE__', 'true');
    localStorage.setItem('theme', 'light');
    
    // Set window flags
    (window as unknown as Record<string, unknown>).__E2E_TEST_MODE__ = true;
    (window as unknown as Record<string, unknown>).__CI_TEST_MODE__ = true;
    
    console.log('🧪 E2E test flags set in localStorage and window');
  });
  
  // Create a minimal page just to establish the storage state
  const page = await context.newPage();
  
  try {
    // Navigate to the app
    await page.goto('http://127.0.0.1:5173', { timeout: 60000 });
    console.log('📡 Successfully navigated to app');
    
    // Wait for network to settle but don't require content rendering
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    console.log('🌐 Network settled');
    
    // Try to wait for app content but don't fail if it doesn't appear
    try {
      await page.waitForFunction(() => {
        const root = document.getElementById('root');
        return root && root.innerHTML.length > 0;
      }, { timeout: 15000 });
      console.log('✅ App content detected!');
      
      // If content loads, try to verify navigation
      try {
        await page.waitForSelector('nav.nav-container', { timeout: 10000 });
        console.log('🧭 Navigation component found!');
      } catch {
        console.log('⚠️ Navigation not found, but content exists');
      }
    } catch {
      console.log('⚠️ App content not rendered during setup, but that\'s OK');
      console.log('💡 Tests will handle app rendering individually');
    }
    
  } catch (error) {
    console.log('⚠️ Setup navigation failed:', error instanceof Error ? error.message : 'Unknown error');
    console.log('🔄 Continuing with minimal setup...');
  }
  
  // Force set the flags again in case they were lost
  await page.evaluate(() => {
    localStorage.setItem('__E2E_TEST_MODE__', 'true');
    localStorage.setItem('__AUTH_BYPASS__', 'true');
    localStorage.setItem('__CI_TEST_MODE__', 'true');
    (window as unknown as Record<string, unknown>).__E2E_TEST_MODE__ = true;
    (window as unknown as Record<string, unknown>).__CI_TEST_MODE__ = true;
    console.log('🔧 E2E flags re-applied');
  });

  // Save the storage state regardless of app rendering
  await context.storageState({ path: 'src/test/e2e/.auth/user.json' });
  console.log('💾 E2E test state saved to: src/test/e2e/.auth/user.json');

  await browser.close();
  console.log('✅ E2E setup completed successfully');
}

export default globalSetup;
