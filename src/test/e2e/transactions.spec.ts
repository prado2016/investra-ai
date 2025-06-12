import { test, expect, Page } from '@playwright/test';

test.describe('Basic Transactions Page Check', () => {
  test('Navigate and check title', async ({ page }) => {
    console.log('Attempting to navigate to /transactions...');
    // Try a longer navigation timeout just in case.
    await page.goto('/transactions', { timeout: 30000 });
    console.log('Navigation to /transactions complete.');

    console.log('Attempting to get page title...');
    const title = await page.title();
    console.log(`Page title is: "${title}"`);

    // Check if the title includes "Transactions".
    // The actual title might be more specific due to usePageTitle hook.
    await expect(page).toHaveTitle(/Transactions/, { timeout: 10000 });
    console.log('Page title check successful.');

    // Check for a very basic, consistently present element
    await expect(page.locator('body')).toBeVisible({ timeout: 10000 });
    console.log('Body element is visible.');
  });
});
