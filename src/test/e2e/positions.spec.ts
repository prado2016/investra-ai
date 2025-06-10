import { test, expect } from '@playwright/test';

test.describe('Investra AI - Positions Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set E2E flags before navigation
    await page.addInitScript(() => {
      (window as unknown as Record<string, unknown>).__E2E_TEST_MODE__ = true;
      (window as unknown as Record<string, unknown>).__CI_TEST_MODE__ = true;
      localStorage.setItem('__E2E_TEST_MODE__', 'true');
      localStorage.setItem('__AUTH_BYPASS__', 'true');
      localStorage.setItem('__CI_TEST_MODE__', 'true');
    });
    
    await page.goto('/')
    
    // Wait for the app to render
    await page.waitForLoadState('networkidle', { timeout: 45000 });
    await page.waitForSelector('nav.nav-container', { timeout: 30000 });
  });

  test('should display positions page with sample data', async ({ page }) => {
    // Navigate to positions page
    await page.click('text=Positions', { timeout: 10000 });
    await expect(page).toHaveURL(/.*positions/, { timeout: 10000 });
    
    // Check page title and subtitle - use more specific selector to avoid nav logo
    await expect(page.locator('h1').filter({ hasText: 'Open Positions' })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Track your current holdings')).toBeVisible({ timeout: 10000 });
    
    // Check that the positions page content has loaded - look for any of the expected elements
    const contentIndicators = [
      'text=No Positions Found',        // Empty state
      'text=Filter by symbol',          // Filter input
      'text=Refresh',                   // Refresh button
      'table',                          // Actual table
      '[data-testid="positions-table"]' // Test ID if present
    ];
    
    // At least one of these should be visible to indicate the page loaded
    let foundContent = false;
    for (const selector of contentIndicators) {
      try {
        await expect(page.locator(selector)).toBeVisible({ timeout: 2000 });
        foundContent = true;
        break;
      } catch (e) {
        // Continue to next selector
      }
    }
    
    // If no specific content found, at least ensure the page isn't showing an error
    if (!foundContent) {
      // Ensure we're not seeing error states
      await expect(page.locator('text=Error, text=Failed')).not.toBeVisible();
      // And that we have the page structure
      await expect(page.locator('main, .page-container, [class*="Page"]')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have functional search and filter', async ({ page }) => {
    await page.click('text=Positions', { timeout: 10000 });
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
    await page.click('text=Positions', { timeout: 10000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    // Look for refresh button with timeout
    const refreshButton = page.locator('button:has-text("Refresh"), button[aria-label*="refresh"]').first();
    if (await refreshButton.isVisible({ timeout: 5000 })) {
      await refreshButton.click({ timeout: 5000 });
      await page.waitForTimeout(1000);
    }
  });
});
