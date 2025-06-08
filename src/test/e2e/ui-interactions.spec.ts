import { test, expect } from '@playwright/test';

test.describe('Stock Tracker - UI Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should handle theme switching', async ({ page }) => {
    // Look for theme toggle button/switch
    const themeToggle = page.locator('[data-testid="theme-toggle"], button:has-text("Mode"), label:has-text("Mode")').first();
    
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(500);
    }
  });

  test('should handle error states gracefully', async ({ page }) => {
    // Check for console errors during navigation
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Navigate through different pages
    await page.click('text=Positions');
    await page.waitForLoadState('networkidle');
    
    await page.click('text=Transactions');
    await page.waitForLoadState('networkidle');

    // Verify no critical errors occurred
    const criticalErrors = errors.filter(error => 
      !error.includes('Warning') && 
      !error.includes('router') &&
      !error.includes('survey')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('should load page performance benchmarks', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000);
  });
});
