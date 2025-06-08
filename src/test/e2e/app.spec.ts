import { test, expect } from '@playwright/test'

test.describe('Stock Tracker App', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('should load the homepage', async ({ page }) => {
    // Check if the main title is visible
    await expect(page.locator('h1')).toContainText('Stock')
    
    // Check if navigation is present
    await expect(page.locator('nav')).toBeVisible()
    
    // Check if the app loads without console errors
    const errors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text())
      }
    })
    
    await page.waitForLoadState('networkidle')
    expect(errors).toHaveLength(0)
  })

  test('should have working navigation', async ({ page }) => {
    // Test navigation to positions page
    await page.click('text=Positions')
    await expect(page).toHaveURL(/.*positions/)
    await expect(page.locator('h1')).toContainText('Positions')
    
    // Test navigation to transactions page
    await page.click('text=Transactions')
    await expect(page).toHaveURL(/.*transactions/)
    
    // Test navigation back to home
    await page.click('text=Dashboard')
    await expect(page).toHaveURL('/')
  })

  test('should be responsive', async ({ page }) => {
    // Test desktop view
    await page.setViewportSize({ width: 1280, height: 720 })
    await expect(page.locator('nav')).toBeVisible()
    
    // Test tablet view
    await page.setViewportSize({ width: 768, height: 1024 })
    await expect(page.locator('nav')).toBeVisible()
    
    // Test mobile view
    await page.setViewportSize({ width: 375, height: 667 })
    await expect(page.locator('nav')).toBeVisible()
  })
})
