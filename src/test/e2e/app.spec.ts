import { test, expect } from '@playwright/test'

test.describe('Investra AI App', () => {
  test.beforeEach(async ({ page }) => {
    // Set E2E flags before navigation
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__E2E_TEST_MODE__ = true;
      (window as unknown as Record<string, unknown>).__CI_TEST_MODE__ = true;
      localStorage.setItem('__E2E_TEST_MODE__', 'true');
      localStorage.setItem('__AUTH_BYPASS__', 'true');
      localStorage.setItem('__CI_TEST_MODE__', 'true');
    });
    
    // Navigate to the app
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 45000 });
    
    // Wait for the app to render with extended timeout
    await page.waitForLoadState('networkidle', { timeout: 45000 });
  })

  test('should load the homepage', async ({ page }) => {
    // Wait for React to fully mount and render with more time
    await page.waitForFunction(() => {
      const root = document.getElementById('root');
      return root && root.innerHTML.length > 0;
    }, { timeout: 45000 });
    
    // Wait specifically for the nav element to be present
    await page.waitForSelector('nav.nav-container', { timeout: 30000 });
    
    // Check if the main title is visible (Dashboard page)
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 30000 });
    
    // Check if navigation is present
    await expect(page.locator('nav.nav-container')).toBeVisible({ timeout: 10000 });
    
    // Verify the page title
    await expect(page).toHaveTitle(/Investra/);
  })

  test('should have working navigation', async ({ page }) => {
    // Ensure main app is loaded first
    await page.waitForSelector('nav.nav-container', { timeout: 30000 });
    
    // Test navigation to positions page
    await page.click('text=Positions', { timeout: 15000 })
    await expect(page).toHaveURL(/.*positions/, { timeout: 15000 })
    await expect(page.locator('h1').filter({ hasText: 'Positions' })).toBeVisible({ timeout: 15000 })
    
    // Test navigation to transactions page
    await page.click('text=Transactions', { timeout: 15000 })
    await expect(page).toHaveURL(/.*transactions/, { timeout: 15000 })
    
    // Test navigation back to home
    await page.click('text=Dashboard', { timeout: 15000 })
    await expect(page).toHaveURL('/', { timeout: 15000 })
  })

  test('should be responsive', async ({ page }) => {
    // Wait for navigation to be present first
    await page.waitForSelector('nav.nav-container', { timeout: 30000 });
    
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 })
    await expect(page.locator('nav.nav-container')).toBeVisible({ timeout: 10000 })
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('nav.nav-container')).toBeVisible({ timeout: 10000 })
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('nav.nav-container')).toBeVisible({ timeout: 10000 })
  })
})
