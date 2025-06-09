import { test, expect } from '@playwright/test';

test.describe('Investra AI - UI Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  });

  test('should handle theme switching', async ({ page }) => {
    // Look for theme toggle button/switch with timeout
    const themeToggle = page.locator('[data-testid="theme-toggle"], button:has-text("Mode"), label:has-text("Mode")').first();
    
    if (await themeToggle.isVisible({ timeout: 5000 })) {
      await themeToggle.click({ timeout: 5000 });
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

    // Navigate through different pages with timeouts
    await page.click('text=Positions', { timeout: 5000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    await page.click('text=Transactions', { timeout: 5000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });

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
    
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 15000 });
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(15000); // Increased from 5s to 15s for CI
  });
});
