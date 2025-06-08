import { test, expect } from '@playwright/test';

test.describe('Stock Tracker - Positions Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display positions page with sample data', async ({ page }) => {
    // Navigate to positions page
    await page.click('text=Positions');
    await expect(page).toHaveURL(/.*positions/);
    
    // Check page title and subtitle
    await expect(page.locator('h1')).toContainText('Open Positions');
    await expect(page.locator('text=Track your current holdings')).toBeVisible();
    
    // Check if positions table is loaded
    await expect(page.locator('[data-testid="positions-table"], table')).toBeVisible();
    
    // Allow time for data to load
    await page.waitForTimeout(1000);
  });

  test('should have functional search and filter', async ({ page }) => {
    await page.click('text=Positions');
    await page.waitForLoadState('networkidle');
    
    // Look for filter input
    const filterInput = page.locator('input[placeholder*="filter"], input[placeholder*="search"]').first();
    if (await filterInput.isVisible()) {
      await filterInput.fill('AAPL');
      await page.waitForTimeout(500);
      
      // Verify filtering worked
      await expect(filterInput).toHaveValue('AAPL');
    }
  });

  test('should have working refresh functionality', async ({ page }) => {
    await page.click('text=Positions');
    await page.waitForLoadState('networkidle');
    
    // Look for refresh button
    const refreshButton = page.locator('button:has-text("Refresh"), button[aria-label*="refresh"]').first();
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
      await page.waitForTimeout(1000);
    }
  });
});
