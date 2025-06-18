/**
 * Manual Review Queue Tests
 * Task 5.4: Test queue system for ambiguous duplicate cases
 */

import { ManualReviewQueue, type ReviewQueueItem, type ReviewAction } from '../manualReviewQueue';
import { EmailIdentificationService } from '../emailIdentificationService';
import { MultiLevelDuplicateDetection } from '../multiLevelDuplicateDetection';
import type { WealthsimpleEmailData } from '../wealthsimpleEmailParser';

// Minimal mock data for testing - production builds exclude test files
const MOCK_WEALTHSIMPLE_EMAILS = {
  stockBuy: {
    subject: "Trade Confirmation - AAPL Purchase",
    from: "notifications@wealthsimple.com",
    html: "<p>Bought 100 shares of AAPL at $150.25</p>",
    text: "Bought 100 shares of AAPL at $150.25"
  },
  stockSell: {
    subject: "Trade Confirmation - AAPL Sale",
    from: "notifications@wealthsimple.com", 
    html: "<p>Sold 50 shares of AAPL at $155.50</p>",
    text: "Sold 50 shares of AAPL at $155.50"
  },
  canadianStock: {
    subject: "Trade Confirmation - CNR.TO Purchase",
    from: "notifications@wealthsimple.com",
    html: "<p>Bought 25 shares of CNR.TO at C$165.50</p>",
    text: "Bought 25 shares of CNR.TO at C$165.50"
  },
  etfPurchase: {
    subject: "Trade Confirmation - VTI Purchase", 
    from: "notifications@wealthsimple.com",
    html: "<p>Bought 100 shares of VTI at $240.25</p>",
    text: "Bought 100 shares of VTI at $240.25"
  }
};

export interface QueueTestResult {
  testName: string;
  success: boolean;
  queueItem?: ReviewQueueItem;
  queueStats?: Record<string, unknown>;
  errors: string[];
  warnings: string[];
  performance: {
    executionTime: number;
  };
}

/**
 * Manual Review Queue Test Suite
 */
export class ManualReviewQueueTestSuite {
  /**
   * Run all queue tests
   */
  static async runAllTests(): Promise<QueueTestResult[]> {
    const results: QueueTestResult[] = [];

    console.log('🏢 Running Manual Review Queue Tests...\n');

    // Clear queue before testing
    ManualReviewQueue.clearQueue();

    // Test basic queue operations
    results.push(...await this.testQueueOperations());
    
    // Test queue filtering and sorting
    results.push(...await this.testQueueFiltering());
    
    // Test review workflow
    results.push(...await this.testReviewWorkflow());
    
    // Test queue statistics
    results.push(...await this.testQueueStatistics());
    
    // Test queue management features
    results.push(...await this.testQueueManagement());
    
    // Test performance under load
    results.push(await this.testQueuePerformance());

    // Print summary
    this.printTestSummary(results);

    return results;
  }

  /**
   * Test basic queue operations
   */
  private static async testQueueOperations(): Promise<QueueTestResult[]> {
    const results: QueueTestResult[] = [];
    
    console.log('📝 Testing Basic Queue Operations...');

    // Test adding item to queue
    const addItemTest = await this.runQueueTest(
      'Queue Operations - Add Item',
      async () => {
        const emailData = this.convertMockToEmailData(MOCK_WEALTHSIMPLE_EMAILS.stockBuy);
        const identification = EmailIdentificationService.extractIdentification(
          emailData.subject,
          emailData.fromEmail,
          emailData.rawContent
        );
        
        const duplicateResult = await MultiLevelDuplicateDetection.detectDuplicates(
          emailData,
          'test-portfolio'
        );

        const queueItem = await ManualReviewQueue.addToQueue(
          emailData,
          identification,
          duplicateResult,
          'test-portfolio'
        );

        if (!queueItem || !queueItem.id) {
          throw new Error('Failed to add item to queue');
        }

        return { queueItem };
      }
    );
    results.push(addItemTest);

    // Test retrieving queue item
    const getItemTest = await this.runQueueTest(
      'Queue Operations - Get Item',
      async () => {
        const items = ManualReviewQueue.getQueueItems();
        if (items.length === 0) {
          throw new Error('No items in queue');
        }

        const item = ManualReviewQueue.getQueueItem(items[0].id);
        if (!item) {
          throw new Error('Failed to retrieve queue item');
        }

        return { queueItem: item };
      }
    );
    results.push(getItemTest);

    return results;
  }

  /**
   * Test queue filtering and sorting
   */
  private static async testQueueFiltering(): Promise<QueueTestResult[]> {
    const results: QueueTestResult[] = [];
    
    console.log('🔍 Testing Queue Filtering and Sorting...');

    // Add multiple items with different properties
    await this.addMultipleTestItems();

    // Test status filtering
    const statusFilterTest = await this.runQueueTest(
      'Filtering - Status Filter',
      async () => {
        const pendingItems = ManualReviewQueue.getQueueItems({ status: 'pending' });
        const allItems = ManualReviewQueue.getQueueItems();
        
        if (pendingItems.length !== allItems.filter(item => item.status === 'pending').length) {
          throw new Error('Status filtering not working correctly');
        }

        return { queueStats: { pendingCount: pendingItems.length, totalCount: allItems.length } };
      }
    );
    results.push(statusFilterTest);

    // Test priority filtering
    const priorityFilterTest = await this.runQueueTest(
      'Filtering - Priority Filter',
      async () => {
        const highPriorityItems = ManualReviewQueue.getQueueItems({ priority: 'high' });
        
        if (highPriorityItems.some(item => item.priority !== 'high')) {
          throw new Error('Priority filtering not working correctly');
        }

        return { queueStats: { highPriorityCount: highPriorityItems.length } };
      }
    );
    results.push(priorityFilterTest);

    // Test sorting
    const sortingTest = await this.runQueueTest(
      'Filtering - Sorting by Priority',
      async () => {
        const sortedItems = ManualReviewQueue.getQueueItems(undefined, 'priority', 'desc', 10);
        
        // Check if items are sorted by priority (urgent > high > medium > low)
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        for (let i = 1; i < sortedItems.length; i++) {
          const currentPriority = priorityOrder[sortedItems[i].priority];
          const previousPriority = priorityOrder[sortedItems[i - 1].priority];
          
          if (currentPriority > previousPriority) {
            throw new Error('Items not sorted correctly by priority');
          }
        }

        return { queueStats: { sortedItemsCount: sortedItems.length } };
      }
    );
    results.push(sortingTest);

    return results;
  }

  /**
   * Test review workflow
   */
  private static async testReviewWorkflow(): Promise<QueueTestResult[]> {
    const results: QueueTestResult[] = [];
    
    console.log('⚡ Testing Review Workflow...');

    // Test claiming item for review
    const claimTest = await this.runQueueTest(
      'Workflow - Claim Item',
      async () => {
        const items = ManualReviewQueue.getQueueItems({ status: 'pending' }, undefined, 'desc', 1);
        if (items.length === 0) {
          throw new Error('No pending items to claim');
        }

        const success = await ManualReviewQueue.claimForReview(items[0].id, 'test-reviewer');
        if (!success) {
          throw new Error('Failed to claim item for review');
        }

        const updatedItem = ManualReviewQueue.getQueueItem(items[0].id);
        if (!updatedItem || updatedItem.status !== 'in-review') {
          throw new Error('Item status not updated correctly');
        }

        return { queueItem: updatedItem };
      }
    );
    results.push(claimTest);

    // Test processing review action
    const processActionTest = await this.runQueueTest(
      'Workflow - Process Review Action',
      async () => {
        const inReviewItems = ManualReviewQueue.getQueueItems({ status: 'in-review' }, undefined, 'desc', 1);
        if (inReviewItems.length === 0) {
          throw new Error('No items in review to process');
        }

        const action: ReviewAction = {
          action: 'approve',
          reason: 'Test approval',
          notes: 'This is a test approval',
          reviewerId: 'test-reviewer'
        };

        const result = await ManualReviewQueue.processReviewAction(inReviewItems[0].id, action);
        if (!result.success || !result.item) {
          throw new Error('Failed to process review action');
        }

        if (result.item.status !== 'approved' || result.item.reviewDecision !== 'accept') {
          throw new Error('Review action not processed correctly');
        }

        return { queueItem: result.item };
      }
    );
    results.push(processActionTest);

    // Test escalation
    const escalationTest = await this.runQueueTest(
      'Workflow - Escalation',
      async () => {
        const pendingItems = ManualReviewQueue.getQueueItems({ status: 'pending' }, undefined, 'desc', 1);
        if (pendingItems.length === 0) {
          throw new Error('No pending items to escalate');
        }

        const escalationAction: ReviewAction = {
          action: 'escalate',
          reason: 'Test escalation',
          reviewerId: 'test-reviewer'
        };

        const result = await ManualReviewQueue.processReviewAction(pendingItems[0].id, escalationAction);
        if (!result.success || !result.item) {
          throw new Error('Failed to escalate item');
        }

        if (result.item.escalationLevel !== 1 || result.item.status !== 'pending') {
          throw new Error('Escalation not processed correctly');
        }

        return { queueItem: result.item };
      }
    );
    results.push(escalationTest);

    return results;
  }

  /**
   * Test queue statistics
   */
  private static async testQueueStatistics(): Promise<QueueTestResult[]> {
    const results: QueueTestResult[] = [];
    
    console.log('📊 Testing Queue Statistics...');

    const statsTest = await this.runQueueTest(
      'Statistics - Queue Stats',
      async () => {
        const stats = ManualReviewQueue.getQueueStats();
        
        if (typeof stats.total !== 'number' || stats.total < 0) {
          throw new Error('Invalid total count in queue stats');
        }

        if (!stats.byStatus || typeof stats.byStatus.pending !== 'number') {
          throw new Error('Invalid status breakdown in queue stats');
        }

        if (!stats.byPriority || typeof stats.byPriority.high !== 'number') {
          throw new Error('Invalid priority breakdown in queue stats');
        }

        if (typeof stats.queueHealthScore !== 'number' || stats.queueHealthScore < 0 || stats.queueHealthScore > 100) {
          throw new Error('Invalid queue health score');
        }

        return { queueStats: stats };
      }
    );
    results.push(statsTest);

    return results;
  }

  /**
   * Test queue management features
   */
  private static async testQueueManagement(): Promise<QueueTestResult[]> {
    const results: QueueTestResult[] = [];
    
    console.log('🔧 Testing Queue Management...');

    // Test removing item from queue
    const removeTest = await this.runQueueTest(
      'Management - Remove Item',
      async () => {
        const items = ManualReviewQueue.getQueueItems(undefined, undefined, 'asc', 1);
        if (items.length === 0) {
          throw new Error('No items to remove');
        }

        const success = await ManualReviewQueue.removeFromQueue(items[0].id, 'Test removal');
        if (!success) {
          throw new Error('Failed to remove item from queue');
        }

        const removedItem = ManualReviewQueue.getQueueItem(items[0].id);
        if (removedItem) {
          throw new Error('Item still exists after removal');
        }

        return { queueStats: { removedItemId: items[0].id } };
      }
    );
    results.push(removeTest);

    // Test expired items processing
    const expiredItemsTest = await this.runQueueTest(
      'Management - Process Expired Items',
      async () => {
        const processedCount = await ManualReviewQueue.processExpiredItems();
        
        // Since we don't have expired items in our test, this should return 0
        if (typeof processedCount !== 'number' || processedCount < 0) {
          throw new Error('Invalid expired items count');
        }

        return { queueStats: { expiredItemsProcessed: processedCount } };
      }
    );
    results.push(expiredItemsTest);

    return results;
  }

  /**
   * Test queue performance under load
   */
  private static async testQueuePerformance(): Promise<QueueTestResult> {
    console.log('🏃 Testing Queue Performance...');

    const startTime = Date.now();
    const operationsCount = 20;

    try {
      // Add multiple items quickly
      const addPromises = [];
      for (let i = 0; i < operationsCount; i++) {
        const promise = this.addSingleTestItem(`test-portfolio-${i}`);
        addPromises.push(promise);
      }
      await Promise.all(addPromises);

      // Get all items
      const items = ManualReviewQueue.getQueueItems();
      
      // Process some actions quickly
      const actionPromises = [];
      for (let i = 0; i < Math.min(5, items.length); i++) {
        const action: ReviewAction = {
          action: 'approve',
          reason: 'Performance test',
          reviewerId: 'performance-tester'
        };
        actionPromises.push(ManualReviewQueue.processReviewAction(items[i].id, action));
      }
      await Promise.all(actionPromises);

      const endTime = Date.now();
      const executionTime = endTime - startTime;

      console.log(`✅ Performance Test Completed`);
      console.log(`   Operations: ${operationsCount} additions + 5 actions`);
      console.log(`   Total Time: ${executionTime}ms`);
      console.log(`   Average Time per Operation: ${(executionTime / (operationsCount + 5)).toFixed(2)}ms\n`);

      return {
        testName: 'Performance Test',
        success: true,
        errors: [],
        warnings: executionTime > 1000 ? ['Performance test took longer than 1 second'] : [],
        performance: { executionTime }
      };

    } catch (error) {
      return {
        testName: 'Performance Test',
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        performance: { executionTime: Date.now() - startTime }
      };
    }
  }

  /**
   * Run a single queue test
   */
  private static async runQueueTest(
    testName: string,
    testFunction: () => Promise<Record<string, unknown>>
  ): Promise<QueueTestResult> {
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const executionTime = Date.now() - startTime;

      console.log(`✅ ${testName} (${executionTime}ms)`);

      return {
        testName,
        success: true,
        queueItem: result.queueItem as ReviewQueueItem,
        queueStats: result.queueStats as Record<string, unknown>,
        errors: [],
        warnings: [],
        performance: { executionTime }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      console.log(`❌ ${testName}: ${error}`);

      return {
        testName,
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        performance: { executionTime }
      };
    }
  }

  /**
   * Add multiple test items with different properties
   */
  private static async addMultipleTestItems(): Promise<void> {
    const testEmails = [
      MOCK_WEALTHSIMPLE_EMAILS.stockBuy,
      MOCK_WEALTHSIMPLE_EMAILS.stockSell,
      MOCK_WEALTHSIMPLE_EMAILS.canadianStock,
      MOCK_WEALTHSIMPLE_EMAILS.etfPurchase
    ];

    for (let i = 0; i < testEmails.length; i++) {
      await this.addSingleTestItem(`test-portfolio-${i}`, testEmails[i]);
    }
  }

  /**
   * Add a single test item to the queue
   */
  private static async addSingleTestItem(
    portfolioId: string, 
    mockEmail = MOCK_WEALTHSIMPLE_EMAILS.stockBuy
  ): Promise<ReviewQueueItem> {
    const emailData = this.convertMockToEmailData(mockEmail);
    const identification = EmailIdentificationService.extractIdentification(
      emailData.subject,
      emailData.fromEmail,
      emailData.rawContent
    );
    
    const duplicateResult = await MultiLevelDuplicateDetection.detectDuplicates(
      emailData,
      portfolioId
    );

    return await ManualReviewQueue.addToQueue(
      emailData,
      identification,
      duplicateResult,
      portfolioId
    );
  }

  /**
   * Convert mock email to WealthsimpleEmailData format
   */
  private static convertMockToEmailData(mockEmail: { 
    subject: string; 
    from: string; 
    html: string; 
    text: string 
  }): WealthsimpleEmailData {
    const symbol = mockEmail.html.match(/([A-Z]{1,5}(?:\.[A-Z]{2})?)/)?.[1] || 'TEST';
    const quantity = parseFloat(mockEmail.html.match(/(\d+(?:\.\d+)?)\s*shares?/i)?.[1] || '1');
    const price = parseFloat(mockEmail.html.match(/\$(\d+(?:,\d{3})*(?:\.\d{2}))/)?.[1]?.replace(/,/g, '') || '100');
    
    return {
      symbol,
      transactionType: mockEmail.html.toLowerCase().includes('sold') ? 'sell' : 'buy',
      quantity,
      price,
      totalAmount: quantity * price,
      accountType: mockEmail.html.match(/(TFSA|RRSP|Margin|Cash)/i)?.[1] || 'TFSA',
      transactionDate: '2025-01-15',
      timezone: 'EST',
      currency: 'USD',
      subject: mockEmail.subject,
      fromEmail: mockEmail.from,
      rawContent: mockEmail.html,
      confidence: 0.9,
      parseMethod: 'TEST'
    };
  }

  /**
   * Print test summary
   */
  private static printTestSummary(results: QueueTestResult[]): void {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    const averageTime = results.reduce((sum, r) => sum + r.performance.executionTime, 0) / results.length;

    console.log('📊 Manual Review Queue Test Summary');
    console.log('═'.repeat(60));
    console.log(`Total Tests: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Total Warnings: ${totalWarnings}`);
    console.log(`Average Execution Time: ${averageTime.toFixed(2)}ms`);
    console.log('═'.repeat(60));

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   • ${r.testName}: ${r.errors.join(', ')}`);
      });
    }

    if (totalWarnings > 0) {
      console.log('\n⚠️ Tests with Warnings:');
      results.filter(r => r.warnings.length > 0).forEach(r => {
        console.log(`   • ${r.testName}: ${r.warnings.join(', ')}`);
      });
    }

    // Get final queue stats
    const finalStats = ManualReviewQueue.getQueueStats();
    console.log('\n📈 Final Queue State:');
    console.log(`   Total Items: ${finalStats.total}`);
    console.log(`   Pending: ${finalStats.byStatus.pending}`);
    console.log(`   In Review: ${finalStats.byStatus['in-review']}`);
    console.log(`   Approved: ${finalStats.byStatus.approved}`);
    console.log(`   Rejected: ${finalStats.byStatus.rejected}`);
    console.log(`   Queue Health Score: ${finalStats.queueHealthScore}`);
  }
}

export default ManualReviewQueueTestSuite;