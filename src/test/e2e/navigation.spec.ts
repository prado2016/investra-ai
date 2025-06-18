import { test, expect } from '@playwright/test'

test.describe('Investra AI - Basic Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Set E2E flags before navigation
    await page.addInitScript(() => {
      (window as any).__E2E_TEST_MODE__ = true;
      (window as any).__CI_TEST_MODE__ = true;
      localStorage.setItem('__E2E_TEST_MODE__', 'true');
      localStorage.setItem('__AUTH_BYPASS__', 'true');
      localStorage.setItem('__CI_TEST_MODE__', 'true');
    });
    
    await page.goto('/', { timeout: 60000 })
    await page.waitForTimeout(2000);
  })

  test('should navigate to different routes', async ({ page }) => {
    // Test that homepage loads
    await expect(page).toHaveURL('/');
    
    // Test basic route navigation by URL (don't require specific content)
    const routes = ['/positions', '/transactions', '/summary', '/settings'];
    
    for (const route of routes) {
      await page.goto(route, { timeout: 30000 });
      await expect(page).toHaveURL(route);
      await page.waitForTimeout(1000);
    }
    
    // Navigate back to home
    await page.goto('/', { timeout: 30000 });
    await expect(page).toHaveURL('/');
  })

  test('should handle URL navigation without errors', async ({ page }) => {
    // Navigate to a non-existent route
    await page.goto('/non-existent-route', { timeout: 30000 });
    
    // Just check that page doesn't crash
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  })
})