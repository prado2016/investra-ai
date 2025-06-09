import { test, expect } from '@playwright/test'

test.describe('Investra AI - Navigation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    
    // Ensure E2E test mode is active
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__E2E_TEST_MODE__ = true;
      (window as unknown as Record<string, unknown>).__CI_TEST_MODE__ = true;
      localStorage.setItem('__E2E_TEST_MODE__', 'true');
      localStorage.setItem('__AUTH_BYPASS__', 'true');
    });
    
    // Wait for the app to render
    await page.waitForLoadState('networkidle', { timeout: 30000 });
    await page.waitForSelector('nav.nav-container', { timeout: 15000 });
  })

  test('should navigate between all pages', async ({ page }) => {
    // Test Dashboard - ensure it's visible first
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 15000 });
    
    // Test Positions page
    await page.click('text=Positions', { timeout: 10000 });
    await expect(page).toHaveURL(/.*positions/, { timeout: 10000 });
    await expect(page.locator('h1').filter({ hasText: 'Positions' })).toBeVisible({ timeout: 10000 });
    
    // Test Transactions page
    await page.click('text=Transactions', { timeout: 10000 });
    await expect(page).toHaveURL(/.*transactions/, { timeout: 10000 });
    
    // Test Summary page
    await page.click('text=Summary', { timeout: 10000 });
    await expect(page).toHaveURL(/.*summary/, { timeout: 10000 });
    
    // Test Settings page
    await page.click('text=Settings', { timeout: 10000 });
    await expect(page).toHaveURL(/.*settings/, { timeout: 10000 });
    
    // Navigate back to Dashboard
    await page.click('text=Dashboard', { timeout: 10000 });
    await expect(page).toHaveURL('/', { timeout: 10000 });
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toBeVisible({ timeout: 10000 });
  })

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check navigation is still accessible
    await expect(page.locator('nav.nav-container')).toBeVisible({ timeout: 10000 });
    
    // Test navigation still works on mobile
    await page.click('text=Positions', { timeout: 10000 });
    await expect(page).toHaveURL(/.*positions/, { timeout: 10000 });
  })
})
