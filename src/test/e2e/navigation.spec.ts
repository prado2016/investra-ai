import { test, expect } from '@playwright/test';

test.describe('Investra AI - Navigation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  });

  test('should navigate between all pages', async ({ page }) => {
    // Test Dashboard
    await expect(page.locator('h1').filter({ hasText: 'Dashboard' })).toContainText('Dashboard', { timeout: 10000 });
    
    // Test Positions page
    await page.click('text=Positions', { timeout: 5000 });
    await expect(page).toHaveURL(/.*positions/, { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Positions', { timeout: 5000 });
    
    // Test Transactions page  
    await page.click('text=Transactions', { timeout: 5000 });
    await expect(page).toHaveURL(/.*transactions/, { timeout: 10000 });
    
    // Test Settings page
    await page.click('text=Settings', { timeout: 5000 });
    await expect(page).toHaveURL(/.*settings/, { timeout: 10000 });
    
    // Return to Dashboard
    await page.click('text=Dashboard', { timeout: 5000 });
    await expect(page).toHaveURL('/', { timeout: 10000 });
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check navigation is still accessible
    await expect(page.locator('nav.nav-container')).toBeVisible({ timeout: 5000 });
    
    // Test navigation still works on mobile
    await page.click('text=Positions', { timeout: 5000 });
    await expect(page).toHaveURL(/.*positions/, { timeout: 10000 });
  });
});
