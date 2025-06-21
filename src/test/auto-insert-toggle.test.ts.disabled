/**
 * Auto-Insert Toggle Functionality Tests
 * Tests the complete flow from UI toggle to email processing routing
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EmailProcessingService } from '../services/email/emailProcessingService';
import { EmailConfigurationService } from '../services/emailConfigurationService';
import { ManualReviewQueue } from '../services/email/manualReviewQueue';

// Mock dependencies
vi.mock('../services/emailConfigurationService');
vi.mock('../services/email/manualReviewQueue');
vi.mock('../services/supabaseService');

const mockEmailConfigurationService = vi.mocked(EmailConfigurationService);
const mockManualReviewQueue = vi.mocked(ManualReviewQueue);

describe('Auto-Insert Toggle Functionality', () => {
  const testEmailData = {
    subject: 'Wealthsimple Trade - You bought AAPL',
    fromEmail: 'no-reply@wealthsimple.com',
    htmlContent: `
      <html>
        <body>
          <h1>Trade Confirmation</h1>
          <p>You bought 100 shares of AAPL at $150.50 per share.</p>
          <p>Total: $15,050.00</p>
          <p>Date: 2025-01-15</p>
        </body>
      </html>
    `,
    textContent: 'Trade Confirmation: You bought 100 shares of AAPL at $150.50 per share. Total: $15,050.00'
  };

  const testConfigId = 'test-config-123';

  beforeEach(() => {
    vi.clearAllMocks();
    ManualReviewQueue.clearQueue();
  });

  describe('Auto-Insert Enabled (Default Behavior)', () => {
    beforeEach(() => {
      // Mock auto-insert setting as enabled
      mockEmailConfigurationService.getAutoInsertSetting.mockResolvedValue({
        data: true,
        error: null,
        success: true
      });
    });

    it('should create transaction directly when auto-insert is enabled', async () => {
      const result = await EmailProcessingService.processEmail(
        testEmailData.subject,
        testEmailData.fromEmail,
        testEmailData.htmlContent,
        testEmailData.textContent,
        { configId: testConfigId }
      );

      expect(result.success).toBe(true);
      expect(result.transactionCreated).toBe(true);
      expect(result.queuedForReview).toBe(false);
      expect(result.transaction).toBeDefined();
      expect(result.reviewQueueId).toBeUndefined();
    });

    it('should log auto-insert enabled decision', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      await EmailProcessingService.processEmail(
        testEmailData.subject,
        testEmailData.fromEmail,
        testEmailData.htmlContent,
        testEmailData.textContent,
        { configId: testConfigId }
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Auto-insert setting: ENABLED')
      );
    });

    it('should not call ManualReviewQueue when auto-insert is enabled', async () => {
      await EmailProcessingService.processEmail(
        testEmailData.subject,
        testEmailData.fromEmail,
        testEmailData.htmlContent,
        testEmailData.textContent,
        { configId: testConfigId }
      );

      expect(mockManualReviewQueue.addToQueue).not.toHaveBeenCalled();
    });
  });

  describe('Auto-Insert Disabled (Manual Review)', () => {
    beforeEach(() => {
      // Mock auto-insert setting as disabled
      mockEmailConfigurationService.getAutoInsertSetting.mockResolvedValue({
        data: false,
        error: null,
        success: true
      });

      // Mock ManualReviewQueue.addToQueue
      mockManualReviewQueue.addToQueue.mockResolvedValue({
        id: 'queue-item-123',
        emailData: expect.any(Object),
        emailIdentification: expect.any(Object),
        duplicateDetectionResult: expect.any(Object),
        queuedAt: new Date().toISOString(),
        priority: 'medium',
        status: 'pending',
        portfolioId: 'test-portfolio-123',
        potentialDuplicates: [],
        escalationLevel: 0,
        tags: [],
        confidence: 0.95,
        riskScore: 0.2
      });
    });

    it('should queue for manual review when auto-insert is disabled', async () => {
      const result = await EmailProcessingService.processEmail(
        testEmailData.subject,
        testEmailData.fromEmail,
        testEmailData.htmlContent,
        testEmailData.textContent,
        { configId: testConfigId }
      );

      expect(result.success).toBe(true);
      expect(result.transactionCreated).toBe(false);
      expect(result.queuedForReview).toBe(true);
      expect(result.reviewQueueId).toBe('queue-item-123');
      expect(result.transaction).toBeUndefined();
    });

    it('should log auto-insert disabled decision', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      
      await EmailProcessingService.processEmail(
        testEmailData.subject,
        testEmailData.fromEmail,
        testEmailData.htmlContent,
        testEmailData.textContent,
        { configId: testConfigId }
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Auto-insert setting: DISABLED')
      );
    });

    it('should call ManualReviewQueue.addToQueue with correct parameters', async () => {
      await EmailProcessingService.processEmail(
        testEmailData.subject,
        testEmailData.fromEmail,
        testEmailData.htmlContent,
        testEmailData.textContent,
        { configId: testConfigId }
      );

      expect(mockManualReviewQueue.addToQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'AAPL',
          transactionType: 'buy',
          quantity: 100,
          price: 150.50
        }),
        expect.objectContaining({
          subject: testEmailData.subject,
          fromEmail: testEmailData.fromEmail
        }),
        expect.objectContaining({
          isDuplicate: false,
          recommendation: 'review'
        }),
        expect.any(String) // portfolioId
      );
    });
  });

  describe('Configuration Error Handling', () => {
    it('should default to auto-insert enabled when configId is not provided', async () => {
      const result = await EmailProcessingService.processEmail(
        testEmailData.subject,
        testEmailData.fromEmail,
        testEmailData.htmlContent,
        testEmailData.textContent,
        {} // No configId
      );

      expect(result.success).toBe(true);
      expect(result.transactionCreated).toBe(true);
      expect(result.queuedForReview).toBe(false);
      expect(mockEmailConfigurationService.getAutoInsertSetting).not.toHaveBeenCalled();
    });

    it('should default to auto-insert enabled when configuration service fails', async () => {
      mockEmailConfigurationService.getAutoInsertSetting.mockResolvedValue({
        data: null,
        error: 'Configuration not found',
        success: false
      });

      const result = await EmailProcessingService.processEmail(
        testEmailData.subject,
        testEmailData.fromEmail,
        testEmailData.htmlContent,
        testEmailData.textContent,
        { configId: testConfigId }
      );

      expect(result.success).toBe(true);
      expect(result.transactionCreated).toBe(true);
      expect(result.queuedForReview).toBe(false);
    });

    it('should handle configuration service exceptions gracefully', async () => {
      mockEmailConfigurationService.getAutoInsertSetting.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await EmailProcessingService.processEmail(
        testEmailData.subject,
        testEmailData.fromEmail,
        testEmailData.htmlContent,
        testEmailData.textContent,
        { configId: testConfigId }
      );

      expect(result.success).toBe(true);
      expect(result.transactionCreated).toBe(true);
      expect(result.queuedForReview).toBe(false);
    });
  });

  describe('Manual Review Queue Processing', () => {
    beforeEach(() => {
      // Mock auto-insert as disabled for these tests
      mockEmailConfigurationService.getAutoInsertSetting.mockResolvedValue({
        data: false,
        error: null,
        success: true
      });
    });

    it('should handle manual review queue failures gracefully', async () => {
      mockManualReviewQueue.addToQueue.mockRejectedValue(
        new Error('Queue is full')
      );

      const result = await EmailProcessingService.processEmail(
        testEmailData.subject,
        testEmailData.fromEmail,
        testEmailData.htmlContent,
        testEmailData.textContent,
        { configId: testConfigId }
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to queue for manual review: Queue is full');
    });
  });

  describe('Integration with Email Configuration Service', () => {
    it('should call getAutoInsertSetting with correct configId', async () => {
      mockEmailConfigurationService.getAutoInsertSetting.mockResolvedValue({
        data: true,
        error: null,
        success: true
      });

      await EmailProcessingService.processEmail(
        testEmailData.subject,
        testEmailData.fromEmail,
        testEmailData.htmlContent,
        testEmailData.textContent,
        { configId: testConfigId }
      );

      expect(mockEmailConfigurationService.getAutoInsertSetting).toHaveBeenCalledWith(testConfigId);
    });
  });
});
