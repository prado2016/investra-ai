import { test, expect } from '@playwright/test';

test.describe('Stock Tracker - Navigation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate between all pages', async ({ page }) => {
    // Test Dashboard
    await expect(page.locator('h1')).toContainText('Stock');
    
    // Test Positions page
    await page.click('text=Positions');
    await expect(page).toHaveURL(/.*positions/);
    await expect(page.locator('h1')).toContainText('Positions');
    
    // Test Transactions page  
    await page.click('text=Transactions');
    await expect(page).toHaveURL(/.*transactions/);
    
    // Test Settings page
    await page.click('text=Settings');
    await expect(page).toHaveURL(/.*settings/);
    
    // Return to Dashboard
    await page.click('text=Dashboard');
    await expect(page).toHaveURL('/');
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check navigation is still accessible
    await expect(page.locator('nav')).toBeVisible();
    
    // Test navigation still works on mobile
    await page.click('text=Positions');
    await expect(page).toHaveURL(/.*positions/);
  });
});
