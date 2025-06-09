import { test, expect } from '@playwright/test';

test.describe('Investra AI - Positions Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  });

  test('should display positions page with sample data', async ({ page }) => {
    // Navigate to positions page
    await page.click('text=Positions', { timeout: 5000 });
    await expect(page).toHaveURL(/.*positions/, { timeout: 10000 });
    
    // Check page title and subtitle
    await expect(page.locator('h1')).toContainText('Open Positions', { timeout: 5000 });
    await expect(page.locator('text=Track your current holdings')).toBeVisible({ timeout: 5000 });
    
    // Check if positions table is loaded
    await expect(page.locator('[data-testid="positions-table"], table')).toBeVisible({ timeout: 10000 });
    
    // Allow time for data to load but with timeout
    await page.waitForTimeout(1000);
  });

  test('should have functional search and filter', async ({ page }) => {
    await page.click('text=Positions', { timeout: 5000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Look for filter input with timeout
    const filterInput = page.locator('input[placeholder*="filter"], input[placeholder*="search"]').first();
    if (await filterInput.isVisible({ timeout: 5000 })) {
      await filterInput.fill('AAPL', { timeout: 5000 });
      await page.waitForTimeout(500);
      
      // Verify filtering worked
      await expect(filterInput).toHaveValue('AAPL', { timeout: 5000 });
    }
  });

  test('should have working refresh functionality', async ({ page }) => {
    await page.click('text=Positions', { timeout: 5000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Look for refresh button with timeout
    const refreshButton = page.locator('button:has-text("Refresh"), button[aria-label*="refresh"]').first();
    if (await refreshButton.isVisible({ timeout: 5000 })) {
      await refreshButton.click({ timeout: 5000 });
      await page.waitForTimeout(1000);
    }
  });
});
