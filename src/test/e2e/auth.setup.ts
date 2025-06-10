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
    // Navigate to the app with extended timeout for CI
    const timeout = process.env.CI ? 90000 : 60000;
    await page.goto('http://127.0.0.1:5173', { 
      timeout,
      waitUntil: 'domcontentloaded' 
    });
    console.log('📡 Successfully navigated to app');
    
    // Wait for network to settle
    await page.waitForLoadState('networkidle', { timeout: 45000 });
    console.log('🌐 Network settled');
    
    // In CI, we need to be more aggressive about waiting for React to mount
    if (process.env.CI) {
      console.log('🔧 CI environment detected - using robust app detection');
      
      // Wait for Vite to inject the React app
      await page.waitForFunction(() => {
        // Check if Vite has loaded
        return (window as any).__vite_is_modern_browser !== undefined;
      }, { timeout: 30000 }).catch(() => {
        console.log('⚠️ Vite detection timeout, proceeding anyway');
      });
      
      // Wait for React to mount with multiple fallbacks
      let appDetected = false;
      const maxAttempts = 6;
      
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          await page.waitForFunction(() => {
            const root = document.getElementById('root');
            if (!root) return false;
            
            // Check for React content indicators
            const hasContent = root.innerHTML.length > 100;
            const hasReactRoot = (root as any)._reactRootContainer || (root as any)._reactInternalFiber;
            const hasNavigation = !!document.querySelector('nav.nav-container');
            
            return hasContent || hasReactRoot || hasNavigation;
          }, { timeout: 15000 });
          
          appDetected = true;
          console.log(`✅ App content detected on attempt ${attempt}!`);
          break;
        } catch {
          console.log(`⏳ App detection attempt ${attempt}/${maxAttempts} failed, retrying...`);
          if (attempt < maxAttempts) {
            await page.reload({ waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(2000);
          }
        }
      }
      
      if (!appDetected) {
        console.log('⚠️ App content not detected after all attempts');
        console.log('🔍 Capturing page state for debugging...');
        
        // Capture debugging information
        const html = await page.content();
        const rootContent = await page.evaluate(() => {
          const root = document.getElementById('root');
          return {
            exists: !!root,
            innerHTML: root?.innerHTML || 'No root element',
            childNodes: root?.childNodes.length || 0
          };
        });
        
        console.log('📊 Root element state:', JSON.stringify(rootContent, null, 2));
        
        // Check for JavaScript errors
        const errors = await page.evaluate(() => {
          return (window as any).__playwright_errors || [];
        });
        
        if (errors.length > 0) {
          console.log('🚨 JavaScript errors detected:', errors);
        }
      }
    } else {
      // Local development - simpler detection
      try {
        await page.waitForFunction(() => {
          const root = document.getElementById('root');
          return root && root.innerHTML.length > 0;
        }, { timeout: 30000 });
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
