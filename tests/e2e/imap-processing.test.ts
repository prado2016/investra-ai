/**
 * IMAP Email Processing End-to-End Tests
 * Tests IMAP connection, email fetching, processing, and transaction creation
 */

import { test, expect, Page } from '@playwright/test';

interface IMAPTestConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
}

class IMAPProcessingPage {
  constructor(private page: Page) {}

  async navigateToEmailManagement() {
    await this.page.goto('/email-management');
    await this.page.waitForLoadState('networkidle');
  }

  async getIMAPStatus() {
    const statusElement = await this.page.locator('[data-testid="imap-status"]');
    const status = await statusElement.textContent();
    return status?.toLowerCase() || 'unknown';
  }

  async startIMAPService() {
    await this.page.click('[data-testid="start-imap-btn"]');
    
    // Wait for service to start
    await this.page.waitForSelector('[data-testid="imap-status-running"]', {
      timeout: 10000
    });
  }

  async stopIMAPService() {
    await this.page.click('[data-testid="stop-imap-btn"]');
    
    // Wait for service to stop
    await this.page.waitForSelector('[data-testid="imap-status-stopped"]', {
      timeout: 10000
    });
  }

  async restartIMAPService() {
    await this.page.click('[data-testid="restart-imap-btn"]');
    
    // Wait for service to restart
    await this.page.waitForSelector('[data-testid="imap-status-running"]', {
      timeout: 15000
    });
  }

  async triggerManualProcessing() {
    await this.page.click('[data-testid="process-now-btn"]');
    
    // Wait for processing to complete
    await this.page.waitForSelector('[data-testid="manual-processing-complete"]', {
      timeout: 30000
    });
  }

  async getProcessingStats() {
    const statsElement = await this.page.locator('[data-testid="processing-stats"]');
    const statsText = await statsElement.textContent();
    return JSON.parse(statsText || '{}');
  }

  async getIMAPHealthMetrics() {
    const metricsElement = await this.page.locator('[data-testid="imap-health-metrics"]');
    const metricsText = await metricsElement.textContent();
    return JSON.parse(metricsText || '{}');
  }

  async viewIMAPLogs() {
    await this.page.click('[data-testid="view-imap-logs-btn"]');
    await this.page.waitForSelector('[data-testid="imap-logs-modal"]');
  }

  async getLastProcessedEmails(count: number = 10) {
    const emailElements = await this.page.locator('[data-testid^="processed-email-"]').all();
    const emails = [];
    
    for (let i = 0; i < Math.min(count, emailElements.length); i++) {
      const emailData = await emailElements[i].textContent();
      emails.push(JSON.parse(emailData || '{}'));
    }
    
    return emails;
  }

  async checkTransactionCreation(emailId: string) {
    // Navigate to transactions page to verify
    await this.page.goto('/transactions');
    await this.page.waitForLoadState('networkidle');
    
    // Look for transaction with the email ID reference
    const transactionElement = await this.page.locator(`[data-email-id="${emailId}"]`).first();
    return await transactionElement.isVisible();
  }
}

test.describe('IMAP Processing Integration', () => {
  let imapPage: IMAPProcessingPage;

  test.beforeEach(async ({ page }) => {
    imapPage = new IMAPProcessingPage(page);
    
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-test-token');
    });
  });

  test('IMAP service lifecycle management', async ({ page }) => {
    test.setTimeout(60000);

    await imapPage.navigateToEmailManagement();

    // Check initial status
    const initialStatus = await imapPage.getIMAPStatus();
    console.log('Initial IMAP status:', initialStatus);

    // Start IMAP service if not running
    if (!initialStatus.includes('running')) {
      await imapPage.startIMAPService();
    }

    // Verify service is running
    const runningStatus = await imapPage.getIMAPStatus();
    expect(runningStatus).toContain('running');

    // Test restart functionality
    await imapPage.restartIMAPService();
    
    const restartedStatus = await imapPage.getIMAPStatus();
    expect(restartedStatus).toContain('running');

    // Stop service
    await imapPage.stopIMAPService();
    
    const stoppedStatus = await imapPage.getIMAPStatus();
    expect(stoppedStatus).toContain('stopped');
  });

  test('Manual email processing trigger', async ({ page }) => {
    test.setTimeout(45000);

    await imapPage.navigateToEmailManagement();

    // Ensure IMAP service is running
    const status = await imapPage.getIMAPStatus();
    if (!status.includes('running')) {
      await imapPage.startIMAPService();
    }

    // Get initial stats
    const initialStats = await imapPage.getProcessingStats();
    console.log('Initial processing stats:', initialStats);

    // Trigger manual processing
    await imapPage.triggerManualProcessing();

    // Get updated stats
    const updatedStats = await imapPage.getProcessingStats();
    console.log('Updated processing stats:', updatedStats);

    // Verify processing occurred (stats should have changed)
    expect(updatedStats.lastProcessedAt).toBeTruthy();
  });

  test('Email processing workflow with transaction creation', async ({ page }) => {
    test.setTimeout(60000);

    await imapPage.navigateToEmailManagement();

    // Ensure service is running
    const status = await imapPage.getIMAPStatus();
    if (!status.includes('running')) {
      await imapPage.startIMAPService();
    }

    // Trigger processing
    await imapPage.triggerManualProcessing();

    // Check for processed emails
    const processedEmails = await imapPage.getLastProcessedEmails(5);
    console.log('Processed emails:', processedEmails);

    if (processedEmails.length > 0) {
      // Verify transaction creation for first processed email
      const firstEmail = processedEmails[0];
      if (firstEmail.id) {
        const transactionCreated = await imapPage.checkTransactionCreation(firstEmail.id);
        expect(transactionCreated).toBe(true);
      }
    }
  });

  test('IMAP health monitoring and metrics', async ({ page }) => {
    test.setTimeout(30000);

    await imapPage.navigateToEmailManagement();

    // Get health metrics
    const healthMetrics = await imapPage.getIMAPHealthMetrics();
    console.log('IMAP health metrics:', healthMetrics);

    // Verify essential metrics are present
    expect(healthMetrics).toHaveProperty('connectionStatus');
    expect(healthMetrics).toHaveProperty('lastHeartbeat');
    expect(healthMetrics).toHaveProperty('emailsProcessed');

    // Connection status should be valid
    expect(['connected', 'disconnected', 'error', 'connecting']).toContain(healthMetrics.connectionStatus);
  });

  test('IMAP error handling and recovery', async ({ page }) => {
    test.setTimeout(60000);

    await imapPage.navigateToEmailManagement();

    // First configure with invalid IMAP settings to test error handling
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
    
    // Select email configuration
    await page.click('[data-testid="settings-tab-email_server"]');
    
    // Set invalid configuration
    await page.fill('[data-testid="config-field-imap_host"]', 'invalid-host.nonexistent');
    await page.fill('[data-testid="config-field-imap_username"]', 'invalid@nonexistent.com');
    await page.fill('[data-testid="config-field-imap_password"]', 'wrong-password');
    
    // Save invalid config
    await page.click('[data-testid="save-config-email_server"]');
    await page.waitForSelector('[data-testid="save-success-email_server"]');

    // Go back to email management
    await imapPage.navigateToEmailManagement();

    // Try to start IMAP service with invalid config
    try {
      await imapPage.startIMAPService();
      
      // Should show error status
      await page.waitForSelector('[data-testid="imap-status-error"]', {
        timeout: 15000
      });
      
      const errorStatus = await imapPage.getIMAPStatus();
      expect(errorStatus).toContain('error');
      
    } catch (error) {
      // Expected to fail - verify error handling
      console.log('Expected error with invalid configuration:', error);
    }

    // Now fix the configuration with valid settings
    await page.goto('/settings');
    await page.click('[data-testid="settings-tab-email_server"]');
    
    // Set valid test configuration
    await page.fill('[data-testid="config-field-imap_host"]', 'imap.gmail.com');
    await page.fill('[data-testid="config-field-imap_username"]', 'test@gmail.com');
    await page.fill('[data-testid="config-field-imap_password"]', 'valid-password');
    
    await page.click('[data-testid="save-config-email_server"]');
    await page.waitForSelector('[data-testid="save-success-email_server"]');

    // Return to email management and test recovery
    await imapPage.navigateToEmailManagement();
    
    // Restart service with valid config
    await imapPage.restartIMAPService();
    
    const recoveredStatus = await imapPage.getIMAPStatus();
    expect(recoveredStatus).toContain('running');
  });

  test('Real-time IMAP status updates', async ({ page }) => {
    test.setTimeout(45000);

    await imapPage.navigateToEmailManagement();

    // Monitor status changes over time
    let statusChanges: string[] = [];
    
    // Listen for status updates
    page.on('response', async (response) => {
      if (response.url().includes('/api/imap/status')) {
        const responseData = await response.json().catch(() => ({}));
        if (responseData.data?.status) {
          statusChanges.push(responseData.data.status);
        }
      }
    });

    // Start service and monitor
    const initialStatus = await imapPage.getIMAPStatus();
    if (!initialStatus.includes('running')) {
      await imapPage.startIMAPService();
    }

    // Wait for real-time updates
    await page.waitForTimeout(10000);

    // Stop service
    await imapPage.stopIMAPService();

    // Wait for final status
    await page.waitForTimeout(2000);

    // Verify we received status updates
    expect(statusChanges.length).toBeGreaterThan(0);
    console.log('Status changes observed:', statusChanges);
  });

  test('IMAP log viewing and debugging', async ({ page }) => {
    test.setTimeout(30000);

    await imapPage.navigateToEmailManagement();

    // Open IMAP logs
    await imapPage.viewIMAPLogs();

    // Verify logs modal is visible
    await expect(page.locator('[data-testid="imap-logs-modal"]')).toBeVisible();

    // Check for log entries
    const logEntries = await page.locator('[data-testid^="log-entry-"]').all();
    expect(logEntries.length).toBeGreaterThan(0);

    // Verify log structure
    if (logEntries.length > 0) {
      const firstLogText = await logEntries[0].textContent();
      expect(firstLogText).toBeTruthy();
      expect(firstLogText!.length).toBeGreaterThan(0);
    }

    // Close logs modal
    await page.click('[data-testid="close-logs-modal"]');
    await expect(page.locator('[data-testid="imap-logs-modal"]')).toBeHidden();
  });

  test('Configuration hot-reload for IMAP service', async ({ page }) => {
    test.setTimeout(60000);

    await imapPage.navigateToEmailManagement();

    // Start with initial configuration
    const initialStatus = await imapPage.getIMAPStatus();
    if (!initialStatus.includes('running')) {
      await imapPage.startIMAPService();
    }

    // Get initial health metrics
    const initialMetrics = await imapPage.getIMAPHealthMetrics();

    // Change configuration
    await page.goto('/settings');
    await page.click('[data-testid="settings-tab-email_server"]');
    
    // Modify batch size (non-connection setting)
    await page.fill('[data-testid="config-field-batch_size"]', '20');
    await page.click('[data-testid="save-config-email_server"]');
    await page.waitForSelector('[data-testid="save-success-email_server"]');

    // Return to email management
    await imapPage.navigateToEmailManagement();

    // Wait for hot-reload to take effect
    await page.waitForTimeout(5000);

    // Verify service is still running with new configuration
    const updatedStatus = await imapPage.getIMAPStatus();
    expect(updatedStatus).toContain('running');

    // Verify configuration change took effect
    const updatedMetrics = await imapPage.getIMAPHealthMetrics();
    expect(updatedMetrics.lastConfigUpdate).not.toBe(initialMetrics.lastConfigUpdate);
  });

  test('Concurrent email processing handling', async ({ page }) => {
    test.setTimeout(60000);

    await imapPage.navigateToEmailManagement();

    // Ensure service is running
    const status = await imapPage.getIMAPStatus();
    if (!status.includes('running')) {
      await imapPage.startIMAPService();
    }

    // Trigger multiple manual processing requests rapidly
    const processingPromises = [];
    
    for (let i = 0; i < 3; i++) {
      processingPromises.push(
        page.click('[data-testid="process-now-btn"]').catch(() => {
          // Some clicks might fail due to rapid firing - that's expected
        })
      );
      await page.waitForTimeout(100); // Small delay between clicks
    }

    // Wait for all processing to complete
    await Promise.allSettled(processingPromises);

    // Wait for final processing to complete
    await page.waitForSelector('[data-testid="manual-processing-complete"]', {
      timeout: 30000
    });

    // Verify system handled concurrent requests gracefully
    const finalStats = await imapPage.getProcessingStats();
    expect(finalStats).toBeTruthy();
    expect(finalStats.lastProcessedAt).toBeTruthy();
  });
});

test.describe('IMAP Performance Tests', () => {
  test('Email processing performance', async ({ page }) => {
    test.setTimeout(60000);

    const imapPage = new IMAPProcessingPage(page);

    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-test-token');
    });

    await imapPage.navigateToEmailManagement();

    // Ensure service is running
    const status = await imapPage.getIMAPStatus();
    if (!status.includes('running')) {
      await imapPage.startIMAPService();
    }

    // Measure processing time
    const startTime = Date.now();
    await imapPage.triggerManualProcessing();
    const processingTime = Date.now() - startTime;

    console.log('Processing time:', processingTime);
    expect(processingTime).toBeLessThan(30000); // Should complete within 30 seconds

    // Verify throughput
    const stats = await imapPage.getProcessingStats();
    if (stats.totalProcessed > 0) {
      const avgTimePerEmail = processingTime / stats.totalProcessed;
      expect(avgTimePerEmail).toBeLessThan(10000); // Less than 10 seconds per email
    }
  });

  test('Memory usage during IMAP processing', async ({ page }) => {
    test.setTimeout(45000);

    const imapPage = new IMAPProcessingPage(page);

    await page.addInitScript(() => {
      localStorage.setItem('auth-token', 'mock-test-token');
    });

    // Monitor memory usage
    let memorySnapshots: number[] = [];

    const takeMemorySnapshot = async () => {
      const memory = await page.evaluate(() => {
        if ('memory' in performance) {
          return (performance as any).memory.usedJSHeapSize;
        }
        return 0;
      });
      memorySnapshots.push(memory);
    };

    await imapPage.navigateToEmailManagement();

    // Baseline memory
    await takeMemorySnapshot();

    // Start service
    const status = await imapPage.getIMAPStatus();
    if (!status.includes('running')) {
      await imapPage.startIMAPService();
    }

    await takeMemorySnapshot();

    // Process emails
    await imapPage.triggerManualProcessing();
    await takeMemorySnapshot();

    // Wait and take final snapshot
    await page.waitForTimeout(5000);
    await takeMemorySnapshot();

    console.log('Memory snapshots:', memorySnapshots);

    // Verify no significant memory leaks
    if (memorySnapshots.length >= 3) {
      const initialMemory = memorySnapshots[0];
      const finalMemory = memorySnapshots[memorySnapshots.length - 1];
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    }
  });
});