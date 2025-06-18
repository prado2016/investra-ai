import { test, expect } from '@playwright/test'

test.describe('Investra AI App - Basic Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Set E2E flags before navigation
    await page.addInitScript(() => {
      (window as any).__E2E_TEST_MODE__ = true;
      (window as any).__CI_TEST_MODE__ = true;
      localStorage.setItem('__E2E_TEST_MODE__', 'true');
      localStorage.setItem('__AUTH_BYPASS__', 'true');
      localStorage.setItem('__CI_TEST_MODE__', 'true');
    });
    
    // Navigate to the app
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60000 });
  })

  test('should load the app without crashing', async ({ page }) => {
    // Just verify the page loads and doesn't crash
    await page.waitForTimeout(3000);
    
    // Check basic page structure exists
    const body = await page.locator('body');
    await expect(body).toBeVisible();
    
    // Verify the page title contains expected text
    await expect(page).toHaveTitle(/Investra/);
    
    // Check that we have a root element (even if empty)
    const root = await page.locator('#root');
    await expect(root).toBeAttached();
  })

  test('should load without JavaScript errors', async ({ page }) => {
    let hasErrors = false;
    
    // Listen for console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('Console error:', msg.text());
        hasErrors = true;
      }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
      console.log('Page error:', error.message);
      hasErrors = true;
    });
    
    // Wait for app to load
    await page.waitForTimeout(5000);
    
    // Check that we don't have critical errors
    expect(hasErrors).toBe(false);
  })

  test('should respond to viewport changes', async ({ page }) => {
    // Test different viewport sizes without requiring specific content
    const viewports = [
      { width: 1280, height: 720 }, // Desktop
      { width: 768, height: 1024 }, // Tablet  
      { width: 375, height: 667 }   // Mobile
    ];
    
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(1000);
      
      // Just verify the page is still accessible
      const body = await page.locator('body');
      await expect(body).toBeVisible();
    }
  })
})