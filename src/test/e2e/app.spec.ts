import { test, expect } from '@playwright/test'

test.describe('Investra AI App', () => {
  test.beforeEach(async ({ page }) => {
    // Set a timeout for page navigation
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 })
  })

  test('should load the homepage', async ({ page }) => {
    // Capture console messages and errors
    const consoleMessages: string[] = [];
    const jsErrors: string[] = [];
    
    page.on('console', msg => {
      const message = `${msg.type()}: ${msg.text()}`;
      console.log('PAGE LOG:', message);
      consoleMessages.push(message);
    });
    
    page.on('pageerror', err => {
      const errorMessage = `PAGE ERROR: ${err.message}`;
      console.log(errorMessage);
      jsErrors.push(errorMessage);
    });
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForTimeout(5000); // Give extra time for React to render
    
    // Check page content
    console.log('Page title:', await page.title());
    console.log('Page URL:', page.url());
    
    // Check if there are any script tags
    const scriptTags = await page.locator('script').count();
    console.log('Script tags found:', scriptTags);
    
    // Check if Vite is loading
    const viteScript = await page.locator('script[type="module"][src="/src/main.tsx"]').count();
    console.log('Vite main script found:', viteScript);
    
    // Check the root element
    const rootElement = await page.locator('#root').innerHTML();
    console.log('Root element HTML length:', rootElement.length);
    console.log('Root element HTML (first 1000 chars):', rootElement.substring(0, 1000));
    
    // Log errors and console messages
    console.log('JavaScript errors:', jsErrors);
    console.log('Console messages:', consoleMessages);
    
    // Check for specific elements with a longer wait
    const h1Elements = await page.locator('h1').count();
    console.log('Number of h1 elements:', h1Elements);
    
    // If no content, let's wait and try again
    if (rootElement.length === 0) {
      console.log('No content found, waiting longer...');
      await page.waitForTimeout(10000);
      const rootElementRetry = await page.locator('#root').innerHTML();
      console.log('Root element HTML after retry (length):', rootElementRetry.length);
    }
    
    // Check if the main title is visible (Dashboard page) - be specific to avoid nav logo
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toContainText('Dashboard', { timeout: 15000 })
    
    // Check if navigation is present (using nav element with class nav-container)
    await expect(page.locator('nav.nav-container')).toBeVisible({ timeout: 5000 })
    
    // Check if the app loads without console errors
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    // Wait for network to settle with timeout
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    expect(errors).toHaveLength(0)
  })

  test('should have working navigation', async ({ page }) => {
    // Test navigation to positions page
    await page.click('text=Positions', { timeout: 5000 })
    await expect(page).toHaveURL(/.*positions/, { timeout: 10000 })
    await expect(page.locator('h1').filter({ hasText: 'Positions' })).toContainText('Positions', { timeout: 5000 })
    
    // Test navigation to transactions page
    await page.click('text=Transactions', { timeout: 5000 })
    await expect(page).toHaveURL(/.*transactions/, { timeout: 10000 })
    
    // Test navigation back to home
    await page.click('text=Dashboard', { timeout: 5000 })
    await expect(page).toHaveURL('/', { timeout: 10000 })
  })

  test('should be responsive', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 })
    await expect(page.locator('nav.nav-container')).toBeVisible({ timeout: 5000 })
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('nav.nav-container')).toBeVisible({ timeout: 5000 })
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('nav.nav-container')).toBeVisible({ timeout: 5000 })
  })
})
