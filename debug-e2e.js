// Simple debug script to see what's happening in E2E tests
const { chromium } = require('playwright');

(async () => {
  try {
    console.log('Starting debug script...');
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    // Add console logging
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    
    // Add the same init script as our E2E setup
    await page.addInitScript(() => {
      // Set a global flag that the app can detect
      window.__E2E_TEST_MODE__ = true;
      
      // Set environment variables for the app
      if (!window.process) {
        window.process = { env: {} };
      }
      window.process.env.E2E_TEST_MODE = 'true';
      
      console.log('🧪 E2E test mode enabled in browser');
    });
    
    console.log('Navigating to app...');
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    console.log('Waiting for app to load...');
    // Wait a bit for the app to load
    await page.waitForTimeout(5000);
    
    // Check what we see
    const title = await page.title();
    console.log('Page title:', title);
    
    const h1Content = await page.locator('h1').textContent().catch(() => 'No h1 found');
    console.log('H1 content:', h1Content);
    
    const bodyContent = await page.locator('body').textContent();
    console.log('Body content (first 500 chars):', bodyContent.substring(0, 500));
    
    // Check if our E2E flag is set
    const isE2EMode = await page.evaluate(() => {
      return {
        windowFlag: !!window.__E2E_TEST_MODE__,
        processFlag: window.process?.env?.E2E_TEST_MODE === 'true',
        urlFlag: window.location.search.includes('e2e-test=true')
      };
    });
    console.log('E2E mode flags:', isE2EMode);
    
    console.log('Waiting a bit more...');
    await page.waitForTimeout(2000);
    await browser.close();
    console.log('Debug script completed');
  } catch (error) {
    console.error('Debug script error:', error);
  }
})();
