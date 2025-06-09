import { test, expect } from '@playwright/test'

test.describe('Investra AI App', () => {
  test.beforeEach(async ({ page }) => {
    // Set a timeout for page navigation and ensure E2E mode is active
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 })
    
    // Ensure E2E test mode is set
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__E2E_TEST_MODE__ = true;
      (window as unknown as Record<string, unknown>).__CI_TEST_MODE__ = true;
      localStorage.setItem('__E2E_TEST_MODE__', 'true');
      localStorage.setItem('__AUTH_BYPASS__', 'true');
    });
    
    // Wait for the app to render
    await page.waitForLoadState('networkidle', { timeout: 30000 });
  })

  test('should load the homepage', async ({ page }) => {
    // Wait for React to fully mount and render
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.innerHTML.length > 0;
    }, { timeout: 30000 });
    
    // Wait specifically for the nav element to be present
    await page.waitForSelector('nav.nav-container', { timeout: 15000 });
    
    // Check if the main title is visible (Dashboard page)
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 15000 });
    
    // Check if navigation is present
    await expect(page.locator('nav.nav-container')).toBeVisible({ timeout: 5000 });
    
    // Verify the page title
    await expect(page).toHaveTitle(/Investra/);
  })

  test('should have working navigation', async ({ page }) => {
    // Ensure main app is loaded first
    await page.waitForSelector('nav.nav-container', { timeout: 15000 });
    
    // Test navigation to positions page
    await page.click('text=Positions', { timeout: 10000 })
    await expect(page).toHaveURL(/.*positions/, { timeout: 10000 })
    await expect(page.locator('h1').filter({ hasText: 'Positions' })).toBeVisible({ timeout: 10000 })
    
    // Test navigation to transactions page
    await page.click('text=Transactions', { timeout: 10000 })
    await expect(page).toHaveURL(/.*transactions/, { timeout: 10000 })
    
    // Test navigation back to home
    await page.click('text=Dashboard', { timeout: 10000 })
    await expect(page).toHaveURL('/', { timeout: 10000 })
  })

  test('should be responsive', async ({ page }) => {
    // Wait for navigation to be present first
    await page.waitForSelector('nav.nav-container', { timeout: 15000 });
    
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
