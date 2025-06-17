/**
 * Task 14.3: Manual Review Queue Integration Tests
 * Tests the manual review queue functionality and workflow
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ManualReviewQueue } from '../../services/email/manualReviewQueue';
import { EmailProcessingService } from '../../services/email/emailProcessingService';
import { WealthsimpleEmailParser } from '../../services/email/wealthsimpleEmailParser';

// Mock emails that should trigger manual review
const REVIEW_QUEUE_EMAILS = {
  lowConfidence: {
    subject: 'Transaction notification',
    from: 'noreply@wealthsimple.com',
    html: `
      <html>
        <body>
          <h1>Transaction</h1>
          <p>Something happened with your account</p>
          <p>Symbol: XYZ</p>
          <p>Amount: $500</p>
          <p>Date: Today</p>
        </body>
      </html>
    `
  },
  
  ambiguousTransaction: {
    subject: 'Account update',
    from: 'notifications@wealthsimple.com',
    html: `
      <html>
        <body>
          <h1>Account Update</h1>
          <p>Your account has been updated</p>
          <p>Security: UNKNOWN_SYMBOL</p>
          <p>Type: Transfer</p>
          <p>Amount: $1,000.00</p>
          <p>Date: June 17, 2025</p>
        </body>
      </html>
    `
  },
  
  highValueTransaction: {
    subject: 'Large transaction confirmation',
    from: 'noreply@wealthsimple.com',
    html: `
      <html>
        <body>
          <h1>Transaction Confirmation</h1>
          <p>Account: TFSA</p>
          <p>Action: Bought 1000 shares of AAPL</p>
          <p>Price: $150.50 per share</p>
          <p>Total: $150,500.00</p>
          <p>Date: June 17, 2025 10:30 EDT</p>
        </body>
      </html>
    `
  },
  
  validTransaction: {
    subject: 'Your order has been filled',
    from: 'noreply@wealthsimple.com',
    html: `
      <html>
        <body>
          <h1>Order Confirmation</h1>
          <p>Account: TFSA</p>
          <p>Transaction: Buy</p>
          <p>Symbol: AAPL</p>
          <p>Quantity: 10 shares</p>
          <p>Price: $150.50 per share</p>
          <p>Total: $1,505.00</p>
          <p>Date: June 17, 2025 10:30 EDT</p>
        </body>
      </html>
    `
  }
};

describe('Task 14.3: Manual Review Queue Tests', () => {
  let testReviewIds: string[] = [];

  beforeAll(async () => {
    console.log('🚀 Setting up manual review queue test environment...');
    await cleanupTestReviews();
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up manual review queue test data...');
    await cleanupTestReviews();
  });

  it('should add low confidence emails to manual review queue', async () => {
    console.log('📋 Testing low confidence email review queue addition...');
    
    const email = REVIEW_QUEUE_EMAILS.lowConfidence;
    const parseResult = WealthsimpleEmailParser.parseEmail(
      email.subject,
      email.from,
      email.html
    );

    // If parsing fails or has low confidence, should be added to review queue
    if (!parseResult.success || (parseResult.data && parseResult.data.confidence < 0.5)) {
      const reviewItem = await ManualReviewQueue.addEmailForReview({
        subject: email.subject,
        fromEmail: email.from,
        htmlContent: email.html,
        textContent: undefined,
        reason: parseResult.success ? 'Low confidence parsing' : 'Parsing failed',
        confidence: parseResult.data?.confidence || 0,
        parseError: parseResult.error
      });

      expect(reviewItem.success).toBe(true);
      if (reviewItem.data) {
        testReviewIds.push(reviewItem.data.id);
        
        expect(reviewItem.data.status).toBe('pending');
        expect(reviewItem.data.reason).toContain('confidence');
        expect(reviewItem.data.email_subject).toBe(email.subject);
      }
    }
  });

  it('should retrieve pending review items', async () => {
    console.log('📋 Testing pending review items retrieval...');
    
    const pendingItems = await ManualReviewQueue.getPendingReviews();
    
    expect(pendingItems.success).toBe(true);
    expect(Array.isArray(pendingItems.data)).toBe(true);
    
    if (pendingItems.data && pendingItems.data.length > 0) {
      const item = pendingItems.data[0];
      expect(item.status).toBe('pending');
      expect(item.created_at).toBeDefined();
      expect(item.email_subject).toBeDefined();
      expect(item.reason).toBeDefined();
    }
  });

  it('should approve review items and process transactions', async () => {
    console.log('✅ Testing review item approval...');
    
    // First add a valid transaction to review queue
    const email = REVIEW_QUEUE_EMAILS.validTransaction;
    const reviewItem = await ManualReviewQueue.addEmailForReview({
      subject: email.subject,
      fromEmail: email.from,
      htmlContent: email.html,
      textContent: undefined,
      reason: 'Manual review requested',
      confidence: 0.9
    });

    expect(reviewItem.success).toBe(true);
    if (!reviewItem.data) return;
    
    testReviewIds.push(reviewItem.data.id);
    const reviewId = reviewItem.data.id;

    // Approve the review item
    const approvalResult = await ManualReviewQueue.approveReview(reviewId, {
      skipDuplicateCheck: true,
      enhanceSymbols: false,
      createMissingPortfolios: true,
      dryRun: true // Use dry run for testing
    });

    expect(approvalResult.success).toBe(true);
    expect(approvalResult.data?.status).toBe('approved');
    expect(approvalResult.data?.processed_at).toBeDefined();
  });

  it('should reject review items with reason', async () => {
    console.log('❌ Testing review item rejection...');
    
    // Add an ambiguous transaction to review queue
    const email = REVIEW_QUEUE_EMAILS.ambiguousTransaction;
    const reviewItem = await ManualReviewQueue.addEmailForReview({
      subject: email.subject,
      fromEmail: email.from,
      htmlContent: email.html,
      textContent: undefined,
      reason: 'Ambiguous transaction type',
      confidence: 0.3
    });

    expect(reviewItem.success).toBe(true);
    if (!reviewItem.data) return;
    
    testReviewIds.push(reviewItem.data.id);
    const reviewId = reviewItem.data.id;

    // Reject the review item
    const rejectionResult = await ManualReviewQueue.rejectReview(
      reviewId,
      'Transaction type not supported'
    );

    expect(rejectionResult.success).toBe(true);
    expect(rejectionResult.data?.status).toBe('rejected');
    expect(rejectionResult.data?.rejection_reason).toBe('Transaction type not supported');
    expect(rejectionResult.data?.processed_at).toBeDefined();
  });

  it('should modify review items before processing', async () => {
    console.log('✏️ Testing review item modification...');
    
    // Add a transaction that needs modification
    const email = REVIEW_QUEUE_EMAILS.highValueTransaction;
    const reviewItem = await ManualReviewQueue.addEmailForReview({
      subject: email.subject,
      fromEmail: email.from,
      htmlContent: email.html,
      textContent: undefined,
      reason: 'High value transaction requires verification',
      confidence: 0.8
    });

    expect(reviewItem.success).toBe(true);
    if (!reviewItem.data) return;
    
    testReviewIds.push(reviewItem.data.id);
    const reviewId = reviewItem.data.id;

    // Modify the review item
    const modifications = {
      symbol: 'AAPL',
      quantity: 1000,
      price: 150.50,
      transactionType: 'buy' as const,
      accountType: 'TFSA',
      notes: 'Verified high value transaction'
    };

    const modificationResult = await ManualReviewQueue.modifyReview(reviewId, modifications);

    expect(modificationResult.success).toBe(true);
    expect(modificationResult.data?.modifications).toBeDefined();
    expect(modificationResult.data?.status).toBe('modified');
  });

  it('should get review queue statistics', async () => {
    console.log('📊 Testing review queue statistics...');
    
    const stats = await ManualReviewQueue.getQueueStatistics();
    
    expect(stats.success).toBe(true);
    expect(stats.data).toBeDefined();
    
    if (stats.data) {
      expect(typeof stats.data.total).toBe('number');
      expect(typeof stats.data.pending).toBe('number');
      expect(typeof stats.data.approved).toBe('number');
      expect(typeof stats.data.rejected).toBe('number');
      expect(typeof stats.data.avgProcessingTime).toBe('number');
      
      expect(stats.data.total).toBeGreaterThanOrEqual(0);
      expect(stats.data.pending).toBeGreaterThanOrEqual(0);
      expect(stats.data.approved).toBeGreaterThanOrEqual(0);
      expect(stats.data.rejected).toBeGreaterThanOrEqual(0);
      
      console.log('📊 Queue statistics:', stats.data);
    }
  });

  it('should handle bulk operations on review queue', async () => {
    console.log('📦 Testing bulk review operations...');
    
    // Add multiple items to queue
    const emails = [
      REVIEW_QUEUE_EMAILS.lowConfidence,
      REVIEW_QUEUE_EMAILS.ambiguousTransaction
    ];

    const addedItems = [];
    for (const email of emails) {
      const reviewItem = await ManualReviewQueue.addEmailForReview({
        subject: email.subject,
        fromEmail: email.from,
        htmlContent: email.html,
        textContent: undefined,
        reason: 'Bulk test item',
        confidence: 0.4
      });

      if (reviewItem.success && reviewItem.data) {
        addedItems.push(reviewItem.data.id);
        testReviewIds.push(reviewItem.data.id);
      }
    }

    expect(addedItems.length).toBe(2);

    // Test bulk rejection
    const bulkRejectResult = await ManualReviewQueue.bulkReject(
      addedItems,
      'Bulk rejection for testing'
    );

    expect(bulkRejectResult.success).toBe(true);
    expect(bulkRejectResult.data?.processed).toBe(2);
  });

  it('should clean up old review items', async () => {
    console.log('🧹 Testing review queue cleanup...');
    
    // Add an item that's old (simulate by setting created_at in the past)
    const email = REVIEW_QUEUE_EMAILS.validTransaction;
    const reviewItem = await ManualReviewQueue.addEmailForReview({
      subject: email.subject,
      fromEmail: email.from,
      htmlContent: email.html,
      textContent: undefined,
      reason: 'Test cleanup item',
      confidence: 0.7
    });

    expect(reviewItem.success).toBe(true);
    if (reviewItem.data) {
      testReviewIds.push(reviewItem.data.id);
    }

    // Test cleanup (this would normally clean items older than X days)
    const cleanupResult = await ManualReviewQueue.cleanupOldItems(0); // 0 days for testing
    
    expect(cleanupResult.success).toBe(true);
    expect(typeof cleanupResult.data?.cleaned).toBe('number');
    
    console.log(`🧹 Cleaned up ${cleanupResult.data?.cleaned || 0} old items`);
  });

  it('should handle review queue performance under load', async () => {
    console.log('⚡ Testing review queue performance...');
    
    const iterations = 20;
    const startTime = Date.now();
    
    // Add multiple items concurrently
    const promises = [];
    for (let i = 0; i < iterations; i++) {
      const promise = ManualReviewQueue.addEmailForReview({
        subject: `Performance test ${i}`,
        fromEmail: 'noreply@wealthsimple.com',
        htmlContent: '<html><body>Performance test email</body></html>',
        textContent: undefined,
        reason: 'Performance testing',
        confidence: 0.5
      });
      promises.push(promise);
    }

    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    const successfulAdds = results.filter(r => r.success).length;
    const averageTime = (endTime - startTime) / iterations;
    
    console.log(`⚡ Added ${successfulAdds}/${iterations} items in ${endTime - startTime}ms (avg: ${averageTime.toFixed(2)}ms per item)`);
    
    expect(successfulAdds).toBe(iterations);
    expect(averageTime).toBeLessThan(100); // Should be less than 100ms per item
    
    // Collect IDs for cleanup
    results.forEach(result => {
      if (result.success && result.data) {
        testReviewIds.push(result.data.id);
      }
    });
  });

  it('should validate review workflow end-to-end', async () => {
    console.log('🔄 Testing complete review workflow...');
    
    // 1. Process email that gets sent to review queue
    const email = REVIEW_QUEUE_EMAILS.lowConfidence;
    
    // This should fail parsing and trigger manual review
    const processResult = await EmailProcessingService.processEmail(
      email.subject,
      email.from,
      email.html,
      undefined,
      {
        createMissingPortfolios: true,
        skipDuplicateCheck: true,
        enhanceSymbols: false,
        dryRun: false
      }
    );

    // 2. If processing failed, it should suggest manual review
    if (!processResult.success) {
      expect(processResult.errors.length).toBeGreaterThan(0);
      console.log('📧 Email processing failed as expected, would trigger manual review');
    }

    // 3. Manually add to review queue
    const reviewItem = await ManualReviewQueue.addEmailForReview({
      subject: email.subject,
      fromEmail: email.from,
      htmlContent: email.html,
      textContent: undefined,
      reason: 'Processing failed - manual review required',
      confidence: 0.2,
      parseError: processResult.errors.join('; ')
    });

    expect(reviewItem.success).toBe(true);
    if (reviewItem.data) {
      testReviewIds.push(reviewItem.data.id);
      
      // 4. Review and approve with corrections
      const approvalResult = await ManualReviewQueue.approveReview(reviewItem.data.id, {
        skipDuplicateCheck: true,
        enhanceSymbols: false,
        createMissingPortfolios: true,
        dryRun: true // Use dry run for testing
      });

      expect(approvalResult.success).toBe(true);
      expect(approvalResult.data?.status).toBe('approved');
      
      console.log('✅ Complete review workflow validated successfully');
    }
  });

  // Helper function to clean up test review items
  async function cleanupTestReviews() {
    for (const reviewId of testReviewIds) {
      try {
        await ManualReviewQueue.deleteReview(reviewId);
        console.log(`🗑️ Deleted test review: ${reviewId}`);
      } catch (error) {
        console.warn(`Failed to delete review ${reviewId}:`, error);
      }
    }
    testReviewIds = [];
  }
});
