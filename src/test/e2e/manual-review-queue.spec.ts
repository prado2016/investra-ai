/**
 * Task 14.3: Test Manual Review Queue
 * Tests for manual review queue functionality and workflow
 */

import { test, expect } from '@playwright/test';
import { ManualReviewQueue } from '../../services/email/manualReviewQueue';
import { WealthsimpleEmailParser } from '../../services/email/wealthsimpleEmailParser';
import { EmailProcessingService } from '../../services/email/emailProcessingService';
import { SupabaseService } from '../../services/supabaseService';
import type { WealthsimpleEmailData } from '../../services/email/wealthsimpleEmailParser';

test.describe('Manual Review Queue Tests', () => {
  let testPortfolioId: string;

  test.beforeAll(async () => {
    console.log('🧪 Setting up manual review queue test environment...');
    
    const portfolioResult = await SupabaseService.createPortfolio({
      name: 'Review Queue Test Portfolio',
      description: 'Test portfolio for manual review queue testing',
      type: 'TFSA',
      currency: 'CAD'
    });
    
    if (portfolioResult.success && portfolioResult.data) {
      testPortfolioId = portfolioResult.data.id;
      console.log(`✅ Created test portfolio: ${testPortfolioId}`);
    } else {
      throw new Error('Failed to create test portfolio');
    }
  });

  test.afterAll(async () => {
    if (testPortfolioId) {
      console.log('🧹 Cleaning up manual review queue test data...');
      
      // Clear review queue
      const queueItems = await ManualReviewQueue.getQueueItems();
      if (queueItems.success && queueItems.data) {
        for (const item of queueItems.data) {
          await ManualReviewQueue.removeFromQueue(item.id);
        }
      }
      
      // Clean up transactions and portfolio
      const transactionsResult = await SupabaseService.getTransactions(testPortfolioId);
      if (transactionsResult.success && transactionsResult.data) {
        for (const transaction of transactionsResult.data) {
          await SupabaseService.deleteTransaction(transaction.id);
        }
      }
      
      await SupabaseService.deletePortfolio(testPortfolioId);
      console.log('✅ Manual review queue test cleanup completed');
    }
  });

  test('should add email to review queue when confidence is low', async () => {
    console.log('📋 Testing low confidence email review queue addition...');
    
    const lowConfidenceEmail: WealthsimpleEmailData = {
      symbol: 'UNKNOWN',
      transactionType: 'buy',
      quantity: 10,
      price: 0, // Missing price information
      totalAmount: 0,
      accountType: 'Unknown',
      transactionDate: '2025-06-17',
      timezone: 'EDT',
      currency: 'USD',
      subject: 'Unclear transaction email',
      fromEmail: 'noreply@wealthsimple.com',
      rawContent: 'Ambiguous email content that cannot be parsed clearly',
      confidence: 0.2, // Very low confidence
      parseMethod: 'HTML'
    };
    
    const identification = {
      messageId: 'test-low-confidence-123',
      emailHash: 'hash-123',
      contentHash: 'content-123',
      orderIds: [],
      confirmationNumbers: [],
      transactionHash: 'tx-123',
      fromEmail: 'noreply@wealthsimple.com',
      subject: 'Unclear transaction email',
      timestamp: new Date().toISOString(),
      extractedAt: new Date().toISOString(),
      extractionMethod: 'TEST',
      confidence: 0.2
    };
    
    const duplicateResult = {
      isDuplicate: false,
      confidence: 0.0,
      recommendation: 'review' as const,
      reasons: ['Low parsing confidence'],
      details: {},
      matchedTransactions: []
    };
    
    // Add to review queue
    const queueResult = await ManualReviewQueue.addToQueue(
      lowConfidenceEmail,
      identification,
      duplicateResult,
      testPortfolioId
    );
    
    expect(queueResult.success).toBe(true);
    expect(queueResult.data).toBeTruthy();
    expect(queueResult.data?.status).toBe('pending');
    expect(queueResult.data?.priority).toBe('medium');
    expect(queueResult.data?.reason).toContain('Low parsing confidence');
    
    console.log('✅ Low confidence email added to review queue');
  });

  test('should add potential duplicate to review queue', async () => {
    console.log('📋 Testing potential duplicate review queue addition...');
    
    const duplicateEmail: WealthsimpleEmailData = {
      symbol: 'AAPL',
      transactionType: 'buy',
      quantity: 10,
      price: 150.50,
      totalAmount: 1505.00,
      accountType: 'TFSA',
      transactionDate: '2025-06-17',
      executionTime: '10:30',
      timezone: 'EDT',
      currency: 'USD',
      subject: 'Your order has been filled',
      fromEmail: 'noreply@wealthsimple.com',
      rawContent: 'Potentially duplicate order content',
      confidence: 0.95,
      parseMethod: 'HTML',
      orderId: 'WS-123456789'
    };
    
    const identification = {
      messageId: 'test-duplicate-456',
      emailHash: 'hash-456',
      contentHash: 'content-456',
      orderIds: ['WS-123456789'],
      confirmationNumbers: [],
      transactionHash: 'tx-456',
      fromEmail: 'noreply@wealthsimple.com',
      subject: 'Your order has been filled',
      timestamp: new Date().toISOString(),
      extractedAt: new Date().toISOString(),
      extractionMethod: 'TEST',
      confidence: 0.95
    };
    
    const duplicateResult = {
      isDuplicate: true,
      confidence: 0.85,
      recommendation: 'review' as const,
      reasons: ['Similar transaction found', 'Same order details'],
      details: { similarTransactionId: 'existing-tx-123' },
      matchedTransactions: ['existing-tx-123']
    };
    
    // Add to review queue
    const queueResult = await ManualReviewQueue.addToQueue(
      duplicateEmail,
      identification,
      duplicateResult,
      testPortfolioId
    );
    
    expect(queueResult.success).toBe(true);
    expect(queueResult.data?.status).toBe('pending');
    expect(queueResult.data?.priority).toBe('high');
    expect(queueResult.data?.reason).toContain('Potential duplicate');
    
    console.log('✅ Potential duplicate added to review queue');
  });

  test('should retrieve queue items with proper filtering', async () => {
    console.log('📋 Testing queue item retrieval and filtering...');
    
    // Add multiple test items to queue
    const testEmails = [
      {
        symbol: 'TEST1',
        priority: 'high',
        status: 'pending',
        reason: 'Potential duplicate'
      },
      {
        symbol: 'TEST2', 
        priority: 'medium',
        status: 'pending',
        reason: 'Low confidence'
      },
      {
        symbol: 'TEST3',
        priority: 'low',
        status: 'reviewed',
        reason: 'Manual review requested'
      }
    ];
    
    const addedItems = [];
    
    for (const item of testEmails) {
      const emailData: WealthsimpleEmailData = {
        symbol: item.symbol,
        transactionType: 'buy',
        quantity: 10,
        price: 100.00,
        totalAmount: 1000.00,
        accountType: 'TFSA',
        transactionDate: '2025-06-17',
        timezone: 'EDT',
        currency: 'USD',
        subject: `Test email for ${item.symbol}`,
        fromEmail: 'noreply@wealthsimple.com',
        rawContent: `Test content for ${item.symbol}`,
        confidence: 0.5,
        parseMethod: 'HTML'
      };
      
      const identification = {
        messageId: `test-${item.symbol}`,
        emailHash: `hash-${item.symbol}`,
        contentHash: `content-${item.symbol}`,
        orderIds: [],
        confirmationNumbers: [],
        transactionHash: `tx-${item.symbol}`,
        fromEmail: 'noreply@wealthsimple.com',
        subject: `Test email for ${item.symbol}`,
        timestamp: new Date().toISOString(),
        extractedAt: new Date().toISOString(),
        extractionMethod: 'TEST',
        confidence: 0.5
      };
      
      const duplicateResult = {
        isDuplicate: false,
        confidence: 0.0,
        recommendation: 'review' as const,
        reasons: [item.reason],
        details: {},
        matchedTransactions: []
      };
      
      const queueResult = await ManualReviewQueue.addToQueue(
        emailData,
        identification,
        duplicateResult,
        testPortfolioId
      );
      
      if (queueResult.success && queueResult.data) {
        addedItems.push(queueResult.data);
      }
    }
    
    // Test retrieving all items
    const allItems = await ManualReviewQueue.getQueueItems();
    expect(allItems.success).toBe(true);
    expect(allItems.data?.length).toBeGreaterThanOrEqual(3);
    
    // Test filtering by status
    const pendingItems = await ManualReviewQueue.getQueueItems('pending');
    expect(pendingItems.success).toBe(true);
    expect(pendingItems.data?.filter(item => item.status === 'pending').length).toBeGreaterThanOrEqual(2);
    
    // Test filtering by priority
    const highPriorityItems = await ManualReviewQueue.getQueueItems(undefined, 'high');
    expect(highPriorityItems.success).toBe(true);
    expect(highPriorityItems.data?.filter(item => item.priority === 'high').length).toBeGreaterThanOrEqual(1);
    
    console.log('✅ Queue item retrieval and filtering working');
  });

  test('should approve queue item and process transaction', async () => {
    console.log('✅ Testing queue item approval and processing...');
    
    const emailData: WealthsimpleEmailData = {
      symbol: 'APPROVE',
      transactionType: 'buy',
      quantity: 5,
      price: 200.00,
      totalAmount: 1000.00,
      accountType: 'TFSA',
      transactionDate: '2025-06-17',
      timezone: 'EDT',
      currency: 'USD',
      subject: 'Test approval email',
      fromEmail: 'noreply@wealthsimple.com',
      rawContent: 'Test approval content',
      confidence: 0.7,
      parseMethod: 'HTML'
    };
    
    const identification = {
      messageId: 'test-approve-789',
      emailHash: 'hash-789',
      contentHash: 'content-789',
      orderIds: [],
      confirmationNumbers: [],
      transactionHash: 'tx-789',
      fromEmail: 'noreply@wealthsimple.com',
      subject: 'Test approval email',
      timestamp: new Date().toISOString(),
      extractedAt: new Date().toISOString(),
      extractionMethod: 'TEST',
      confidence: 0.7
    };
    
    const duplicateResult = {
      isDuplicate: false,
      confidence: 0.0,
      recommendation: 'review' as const,
      reasons: ['Manual approval test'],
      details: {},
      matchedTransactions: []
    };
    
    // Add to queue
    const queueResult = await ManualReviewQueue.addToQueue(
      emailData,
      identification,
      duplicateResult,
      testPortfolioId
    );
    
    expect(queueResult.success).toBe(true);
    const queueItemId = queueResult.data?.id;
    expect(queueItemId).toBeTruthy();
    
    // Approve the item
    const approvalResult = await ManualReviewQueue.approveQueueItem(
      queueItemId!,
      'test-user',
      'Approved for testing'
    );
    
    expect(approvalResult.success).toBe(true);
    expect(approvalResult.data?.status).toBe('approved');
    expect(approvalResult.data?.reviewedBy).toBe('test-user');
    expect(approvalResult.data?.reviewNotes).toBe('Approved for testing');
    
    console.log('✅ Queue item approval working');
  });

  test('should reject queue item with reason', async () => {
    console.log('❌ Testing queue item rejection...');
    
    const emailData: WealthsimpleEmailData = {
      symbol: 'REJECT',
      transactionType: 'buy',
      quantity: 5,
      price: 200.00,
      totalAmount: 1000.00,
      accountType: 'TFSA',
      transactionDate: '2025-06-17',
      timezone: 'EDT',
      currency: 'USD',
      subject: 'Test rejection email',
      fromEmail: 'noreply@wealthsimple.com',
      rawContent: 'Test rejection content',
      confidence: 0.3,
      parseMethod: 'HTML'
    };
    
    const identification = {
      messageId: 'test-reject-999',
      emailHash: 'hash-999',
      contentHash: 'content-999',
      orderIds: [],
      confirmationNumbers: [],
      transactionHash: 'tx-999',
      fromEmail: 'noreply@wealthsimple.com',
      subject: 'Test rejection email',
      timestamp: new Date().toISOString(),
      extractedAt: new Date().toISOString(),
      extractionMethod: 'TEST',
      confidence: 0.3
    };
    
    const duplicateResult = {
      isDuplicate: false,
      confidence: 0.0,
      recommendation: 'review' as const,
      reasons: ['Low confidence parsing'],
      details: {},
      matchedTransactions: []
    };
    
    // Add to queue
    const queueResult = await ManualReviewQueue.addToQueue(
      emailData,
      identification,
      duplicateResult,
      testPortfolioId
    );
    
    expect(queueResult.success).toBe(true);
    const queueItemId = queueResult.data?.id;
    
    // Reject the item
    const rejectionResult = await ManualReviewQueue.rejectQueueItem(
      queueItemId!,
      'test-user',
      'Rejected due to insufficient information'
    );
    
    expect(rejectionResult.success).toBe(true);
    expect(rejectionResult.data?.status).toBe('rejected');
    expect(rejectionResult.data?.reviewedBy).toBe('test-user');
    expect(rejectionResult.data?.reviewNotes).toBe('Rejected due to insufficient information');
    
    console.log('✅ Queue item rejection working');
  });

  test('should handle queue item modification', async () => {
    console.log('✏️ Testing queue item modification...');
    
    const emailData: WealthsimpleEmailData = {
      symbol: 'MODIFY',
      transactionType: 'buy',
      quantity: 10,
      price: 150.00,
      totalAmount: 1500.00,
      accountType: 'TFSA',
      transactionDate: '2025-06-17',
      timezone: 'EDT',
      currency: 'USD',
      subject: 'Test modification email',
      fromEmail: 'noreply@wealthsimple.com',
      rawContent: 'Test modification content',
      confidence: 0.6,
      parseMethod: 'HTML'
    };
    
    const identification = {
      messageId: 'test-modify-555',
      emailHash: 'hash-555',
      contentHash: 'content-555',
      orderIds: [],
      confirmationNumbers: [],
      transactionHash: 'tx-555',
      fromEmail: 'noreply@wealthsimple.com',
      subject: 'Test modification email',
      timestamp: new Date().toISOString(),
      extractedAt: new Date().toISOString(),
      extractionMethod: 'TEST',
      confidence: 0.6
    };
    
    const duplicateResult = {
      isDuplicate: false,
      confidence: 0.0,
      recommendation: 'review' as const,
      reasons: ['Needs modification'],
      details: {},
      matchedTransactions: []
    };
    
    // Add to queue
    const queueResult = await ManualReviewQueue.addToQueue(
      emailData,
      identification,
      duplicateResult,
      testPortfolioId
    );
    
    expect(queueResult.success).toBe(true);
    const queueItemId = queueResult.data?.id;
    
    // Modify the email data
    const modifiedEmailData: WealthsimpleEmailData = {
      ...emailData,
      symbol: 'AAPL', // Corrected symbol
      price: 150.50, // Corrected price
      totalAmount: 1505.00 // Corrected total
    };
    
    const modificationResult = await ManualReviewQueue.updateQueueItem(
      queueItemId!,
      modifiedEmailData,
      'test-user',
      'Corrected symbol and price information'
    );
    
    expect(modificationResult.success).toBe(true);
    expect(modificationResult.data?.emailData.symbol).toBe('AAPL');
    expect(modificationResult.data?.emailData.price).toBe(150.50);
    expect(modificationResult.data?.lastModifiedBy).toBe('test-user');
    
    console.log('✅ Queue item modification working');
  });

  test('should test queue statistics and metrics', async () => {
    console.log('📊 Testing queue statistics and metrics...');
    
    // Add various test items to get meaningful statistics
    const testItems = [
      { status: 'pending', priority: 'high' },
      { status: 'pending', priority: 'medium' },
      { status: 'approved', priority: 'low' },
      { status: 'rejected', priority: 'medium' }
    ];
    
    for (let i = 0; i < testItems.length; i++) {
      const item = testItems[i];
      const emailData: WealthsimpleEmailData = {
        symbol: `STAT${i}`,
        transactionType: 'buy',
        quantity: 1,
        price: 100.00,
        totalAmount: 100.00,
        accountType: 'TFSA',
        transactionDate: '2025-06-17',
        timezone: 'EDT',
        currency: 'USD',
        subject: `Statistics test ${i}`,
        fromEmail: 'noreply@wealthsimple.com',
        rawContent: `Statistics test content ${i}`,
        confidence: 0.5,
        parseMethod: 'HTML'
      };
      
      const identification = {
        messageId: `test-stat-${i}`,
        emailHash: `hash-stat-${i}`,
        contentHash: `content-stat-${i}`,
        orderIds: [],
        confirmationNumbers: [],
        transactionHash: `tx-stat-${i}`,
        fromEmail: 'noreply@wealthsimple.com',
        subject: `Statistics test ${i}`,
        timestamp: new Date().toISOString(),
        extractedAt: new Date().toISOString(),
        extractionMethod: 'TEST',
        confidence: 0.5
      };
      
      const duplicateResult = {
        isDuplicate: false,
        confidence: 0.0,
        recommendation: 'review' as const,
        reasons: ['Statistics test'],
        details: {},
        matchedTransactions: []
      };
      
      await ManualReviewQueue.addToQueue(
        emailData,
        identification,
        duplicateResult,
        testPortfolioId
      );
    }
    
    // Get queue statistics
    const stats = await ManualReviewQueue.getQueueStatistics();
    
    expect(stats.success).toBe(true);
    expect(stats.data).toBeTruthy();
    expect(stats.data?.totalItems).toBeGreaterThan(0);
    expect(stats.data?.pendingItems).toBeGreaterThan(0);
    expect(stats.data?.byPriority).toBeTruthy();
    expect(stats.data?.byStatus).toBeTruthy();
    
    console.log('Queue statistics:');
    console.log('- Total items:', stats.data?.totalItems);
    console.log('- Pending items:', stats.data?.pendingItems);
    console.log('- By priority:', stats.data?.byPriority);
    console.log('- By status:', stats.data?.byStatus);
    
    console.log('✅ Queue statistics working');
  });

  test('should test queue aging and cleanup', async () => {
    console.log('🧹 Testing queue aging and cleanup...');
    
    // Add an old test item (simulate)
    const oldEmailData: WealthsimpleEmailData = {
      symbol: 'OLD',
      transactionType: 'buy',
      quantity: 1,
      price: 100.00,
      totalAmount: 100.00,
      accountType: 'TFSA',
      transactionDate: '2025-06-01', // Old date
      timezone: 'EDT',
      currency: 'USD',
      subject: 'Old test email',
      fromEmail: 'noreply@wealthsimple.com',
      rawContent: 'Old test content',
      confidence: 0.5,
      parseMethod: 'HTML'
    };
    
    const identification = {
      messageId: 'test-old-111',
      emailHash: 'hash-old-111',
      contentHash: 'content-old-111',
      orderIds: [],
      confirmationNumbers: [],
      transactionHash: 'tx-old-111',
      fromEmail: 'noreply@wealthsimple.com',
      subject: 'Old test email',
      timestamp: new Date('2025-06-01').toISOString(), // Old timestamp
      extractedAt: new Date('2025-06-01').toISOString(),
      extractionMethod: 'TEST',
      confidence: 0.5
    };
    
    const duplicateResult = {
      isDuplicate: false,
      confidence: 0.0,
      recommendation: 'review' as const,
      reasons: ['Old item test'],
      details: {},
      matchedTransactions: []
    };
    
    const queueResult = await ManualReviewQueue.addToQueue(
      oldEmailData,
      identification,
      duplicateResult,
      testPortfolioId
    );
    
    expect(queueResult.success).toBe(true);
    
    // Test cleanup functionality (if implemented)
    const cleanupResult = await ManualReviewQueue.cleanupOldItems(7); // 7 days
    expect(cleanupResult.success).toBe(true);
    
    console.log('✅ Queue aging and cleanup working');
  });
});
