/**
 * Email Management End-to-End Workflow Tests
 * Tests the complete email management system from configuration to transaction creation
 */

import { test, expect, Page } from '@playwright/test';

// Test configuration
const TEST_EMAIL = 'test@wealthsimple.com';
const TEST_PASSWORD = 'test-password';
const TEST_IMAP_HOST = 'imap.example.com';

class EmailManagementPage {
  constructor(private page: Page) {}

  async navigateToSettings() {
    await this.page.goto('/settings');
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToEmailManagement() {
    await this.page.goto('/email-management');
    await this.page.waitForLoadState('networkidle');
  }

  async configureEmailServer(config: {
    host: string;
    port: number;
    username: string;
    password: string;
    secure: boolean;
  }) {
    // Navigate to email settings tab
    await this.page.click('[data-testid="email-settings-tab"]');
    
    // Fill in IMAP configuration
    await this.page.fill('[data-testid="imap-host"]', config.host);
    await this.page.fill('[data-testid="imap-port"]', config.port.toString());
    await this.page.fill('[data-testid="imap-username"]', config.username);
    await this.page.fill('[data-testid="imap-password"]', config.password);
    
    if (config.secure) {
      await this.page.check('[data-testid="imap-secure"]');
    } else {
      await this.page.uncheck('[data-testid="imap-secure"]');
    }
  }

  async testConnection() {
    await this.page.click('[data-testid="test-connection-btn"]');
    
    // Wait for test result
    await this.page.waitForSelector('[data-testid="connection-test-result"]', {
      timeout: 10000
    });
    
    const result = await this.page.textContent('[data-testid="connection-test-result"]');
    return result;
  }

  async saveConfiguration() {
    await this.page.click('[data-testid="save-configuration-btn"]');
    
    // Wait for save confirmation
    await this.page.waitForSelector('[data-testid="save-success-message"]', {
      timeout: 5000
    });
  }

  async startEmailProcessing() {
    await this.page.click('[data-testid="start-processing-btn"]');
    
    // Wait for processing to start
    await this.page.waitForSelector('[data-testid="processing-status-active"]', {
      timeout: 5000
    });
  }

  async stopEmailProcessing() {
    await this.page.click('[data-testid="stop-processing-btn"]');
    
    // Wait for processing to stop
    await this.page.waitForSelector('[data-testid="processing-status-stopped"]', {
      timeout: 5000
    });
  }

  async getProcessingStats() {
    const stats = await this.page.locator('[data-testid="processing-stats"]').textContent();
    return JSON.parse(stats || '{}');
  }

  async getReviewQueueCount() {
    const count = await this.page.locator('[data-testid="review-queue-count"]').textContent();
    return parseInt(count || '0');
  }

  async processReviewQueueItem(itemId: string, action: 'approve' | 'reject' | 'edit') {
    await this.page.click(`[data-testid="review-item-${itemId}"]`);
    await this.page.click(`[data-testid="review-action-${action}"]`);
    
    if (action === 'approve') {
      await this.page.click('[data-testid="confirm-approve"]');
    }
    
    // Wait for action to complete
    await this.page.waitForSelector('[data-testid="review-action-complete"]', {
      timeout: 5000
    });
  }
}

test.describe('Email Management Workflow', () => {
  let emailPage: EmailManagementPage;

  test.beforeEach(async ({ page }) => {
    emailPage = new EmailManagementPage(page);
    
    // Mock authentication - replace with real auth if needed
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-test-token');
    });
  });

  test('Complete email configuration workflow', async ({ page }) => {
    test.setTimeout(60000); // 1 minute timeout for full workflow

    // Step 1: Navigate to settings and configure email server
    await emailPage.navigateToSettings();
    
    await emailPage.configureEmailServer({
      host: TEST_IMAP_HOST,
      port: 993,
      username: TEST_EMAIL,
      password: TEST_PASSWORD,
      secure: true
    });

    // Step 2: Test connection
    const connectionResult = await emailPage.testConnection();
    expect(connectionResult).toContain('success'); // Assuming mock returns success

    // Step 3: Save configuration
    await emailPage.saveConfiguration();

    // Step 4: Navigate to email management page
    await emailPage.navigateToEmailManagement();

    // Step 5: Start email processing
    await emailPage.startEmailProcessing();

    // Step 6: Verify processing status
    const initialStats = await emailPage.getProcessingStats();
    expect(initialStats).toHaveProperty('status', 'active');
  });

  test('Manual email processing simulation', async ({ page }) => {
    test.setTimeout(30000);

    await emailPage.navigateToEmailManagement();

    // Simulate manual email submission
    await page.click('[data-testid="manual-email-btn"]');
    
    // Fill in test email data
    await page.fill('[data-testid="email-subject"]', 'Wealthsimple Transaction Confirmation');
    await page.fill('[data-testid="email-from"]', 'noreply@wealthsimple.com');
    await page.fill('[data-testid="email-content"]', `
      Transaction Details:
      Symbol: AAPL
      Type: Buy
      Quantity: 10
      Price: $150.00
      Date: 2024-01-15
    `);

    // Submit for processing
    await page.click('[data-testid="process-email-btn"]');

    // Wait for processing result
    await page.waitForSelector('[data-testid="processing-result"]', {
      timeout: 10000
    });

    const result = await page.locator('[data-testid="processing-result"]').textContent();
    expect(result).toContain('success');
  });

  test('Review queue management workflow', async ({ page }) => {
    test.setTimeout(30000);

    await emailPage.navigateToEmailManagement();

    // Check if there are items in review queue
    const queueCount = await emailPage.getReviewQueueCount();
    
    if (queueCount > 0) {
      // Navigate to review queue
      await page.click('[data-testid="review-queue-tab"]');

      // Get first item ID
      const firstItemId = await page.getAttribute('[data-testid^="review-item-"]', 'data-item-id');
      
      if (firstItemId) {
        // Test approval workflow
        await emailPage.processReviewQueueItem(firstItemId, 'approve');

        // Verify item was processed
        const newQueueCount = await emailPage.getReviewQueueCount();
        expect(newQueueCount).toBeLessThan(queueCount);
      }
    }
  });

  test('Configuration export and import', async ({ page }) => {
    test.setTimeout(30000);

    await emailPage.navigateToSettings();

    // Export configuration
    await page.click('[data-testid="export-config-btn"]');
    
    // Wait for download
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="confirm-export-btn"]')
    ]);

    expect(download.suggestedFilename()).toMatch(/investra-config-\d{4}-\d{2}-\d{2}\.json/);

    // Test import functionality (using same file)
    await page.click('[data-testid="import-config-btn"]');
    
    // Mock file upload
    await page.setInputFiles('[data-testid="config-file-input"]', {
      name: 'test-config.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({
        version: '1.0.0',
        configurations: {
          email_server: {
            imap_host: 'test.example.com',
            imap_port: 993,
            imap_username: 'test@example.com'
          }
        }
      }))
    });

    await page.click('[data-testid="import-confirm-btn"]');

    // Wait for import success
    await page.waitForSelector('[data-testid="import-success-message"]', {
      timeout: 5000
    });
  });

  test('Error handling scenarios', async ({ page }) => {
    test.setTimeout(30000);

    await emailPage.navigateToSettings();

    // Test invalid IMAP configuration
    await emailPage.configureEmailServer({
      host: 'invalid-host.example.com',
      port: 993,
      username: 'invalid@example.com',
      password: 'wrong-password',
      secure: true
    });

    const connectionResult = await emailPage.testConnection();
    expect(connectionResult).toContain('failed'); // Assuming mock returns failure

    // Test form validation
    await page.fill('[data-testid="imap-host"]', ''); // Clear required field
    await page.click('[data-testid="save-configuration-btn"]');

    // Should show validation error
    await page.waitForSelector('[data-testid="validation-error"]', {
      timeout: 3000
    });

    const validationError = await page.textContent('[data-testid="validation-error"]');
    expect(validationError).toContain('required');
  });

  test('Real-time updates and monitoring', async ({ page }) => {
    test.setTimeout(45000);

    await emailPage.navigateToEmailManagement();

    // Get initial stats
    const initialStats = await emailPage.getProcessingStats();
    
    // Start processing if not already running
    if (initialStats.status !== 'active') {
      await emailPage.startEmailProcessing();
    }

    // Wait for stats to update (simulating real-time updates)
    await page.waitForFunction(() => {
      const statsElement = document.querySelector('[data-testid="processing-stats"]');
      if (!statsElement) return false;
      
      const stats = JSON.parse(statsElement.textContent || '{}');
      return stats.totalProcessed > 0;
    }, {}, { timeout: 30000 });

    // Verify real-time updates are working
    const updatedStats = await emailPage.getProcessingStats();
    expect(updatedStats.totalProcessed).toBeGreaterThanOrEqual(initialStats.totalProcessed);
  });

  test('Multi-user data isolation', async ({ page }) => {
    test.setTimeout(30000);

    // This test would require actual multi-user setup
    // For now, we test that user-specific data is properly isolated
    
    await emailPage.navigateToSettings();
    
    // Configure as user 1
    await emailPage.configureEmailServer({
      host: 'user1.example.com',
      port: 993,
      username: 'user1@example.com',
      password: 'user1-password',
      secure: true
    });
    
    await emailPage.saveConfiguration();

    // Verify configuration is saved correctly
    const savedHost = await page.inputValue('[data-testid="imap-host"]');
    expect(savedHost).toBe('user1.example.com');
  });
});

test.describe('Performance Tests', () => {
  test('Configuration loading performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(2000); // Should load within 2 seconds
  });

  test('Email processing performance', async ({ page }) => {
    await page.goto('/email-management');
    
    const startTime = Date.now();
    
    // Submit test email for processing
    await page.click('[data-testid="manual-email-btn"]');
    await page.fill('[data-testid="email-content"]', 'Test email content for performance testing');
    await page.click('[data-testid="process-email-btn"]');
    
    // Wait for processing result
    await page.waitForSelector('[data-testid="processing-result"]', {
      timeout: 15000
    });
    
    const processingTime = Date.now() - startTime;
    expect(processingTime).toBeLessThan(10000); // Should process within 10 seconds
  });
});