import { test, expect } from '@playwright/test'

test.describe('Stock Tracker App', () => {
  test.beforeEach(async ({ page }) => {
    // Set a timeout for page navigation
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 30000 })
  })

  test('should load the homepage', async ({ page }) => {
    // Check if the main title is visible
    await expect(page.locator('h1')).toContainText('Stock', { timeout: 10000 })
    
    // Check if navigation is present
    await expect(page.locator('nav')).toBeVisible({ timeout: 5000 })
    
    // Check if the app loads without console errors
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    // Wait for network to settle with timeout
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    expect(errors).toHaveLength(0)
  })

  test('should have working navigation', async ({ page }) => {
    // Test navigation to positions page
    await page.click('text=Positions', { timeout: 5000 })
    await expect(page).toHaveURL(/.*positions/, { timeout: 10000 })
    await expect(page.locator('h1')).toContainText('Positions', { timeout: 5000 })
    
    // Test navigation to transactions page
    await page.click('text=Transactions', { timeout: 5000 })
    await expect(page).toHaveURL(/.*transactions/, { timeout: 10000 })
    
    // Test navigation back to home
    await page.click('text=Dashboard', { timeout: 5000 })
    await expect(page).toHaveURL('/', { timeout: 10000 })
  })

  test('should be responsive', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 })
    await expect(page.locator('nav')).toBeVisible({ timeout: 5000 })
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('nav')).toBeVisible({ timeout: 5000 })
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('nav')).toBeVisible({ timeout: 5000 })
  })
})
