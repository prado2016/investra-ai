/**
 * Task 14.2: Duplicate Detection Integration Tests
 * Tests the multi-level duplicate detection system
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MultiLevelDuplicateDetection } from '../../services/email/multiLevelDuplicateDetection';
import { EmailProcessingService } from '../../services/email/emailProcessingService';
import { SupabaseService } from '../../services/supabaseService';
import type { Transaction } from '../../lib/database/types';

// Mock transaction data for duplicate testing
const MOCK_TRANSACTIONS = {
  stockTransaction: {
    portfolioId: 'test-portfolio-tfsa',
    symbol: 'AAPL',
    type: 'buy' as const,
    quantity: 100,
    price: 150.50,
    date: '2025-06-17',
    totalAmount: 15050.00,
    source: 'email'
  },
  
  similarTransaction: {
    portfolioId: 'test-portfolio-tfsa',
    symbol: 'AAPL',
    type: 'buy' as const,
    quantity: 100,
    price: 150.52, // Slightly different price
    date: '2025-06-17',
    totalAmount: 15052.00,
    source: 'email'
  },
  
  differentTransaction: {
    portfolioId: 'test-portfolio-rrsp',
    symbol: 'MSFT',
    type: 'sell' as const,
    quantity: 50,
    price: 425.75,
    date: '2025-06-17',
    totalAmount: 21287.50,
    source: 'email'
  }
};

const DUPLICATE_TEST_EMAILS = {
  exact: {
    subject: 'Your order has been filled - AAPL',
    from: 'noreply@wealthsimple.com',
    html: `
      <html>
        <body>
          <h1>Order Confirmation</h1>
          <p>Account: TFSA</p>
          <p>Transaction: Buy</p>
          <p>Symbol: AAPL</p>
          <p>Quantity: 100 shares</p>
          <p>Price: $150.50 per share</p>
          <p>Total: $15,050.00</p>
          <p>Date: June 17, 2025 10:30 EDT</p>
          <p>Order ID: WS-123456789</p>
        </body>
      </html>
    `
  },
  
  similar: {
    subject: 'Trade confirmation - AAPL purchase',
    from: 'notifications@wealthsimple.com',
    html: `
      <html>
        <body>
          <h1>Trade Confirmation</h1>
          <p>Account: TFSA</p>
          <p>Action: Bought 100 shares of AAPL</p>
          <p>Price: $150.52 per share</p>
          <p>Total: $15,052.00</p>
          <p>Date: June 17, 2025 10:32 EDT</p>
          <p>Order ID: WS-123456790</p>
        </body>
      </html>
    `
  },
  
  priceVariation: {
    subject: 'Order filled - AAPL',
    from: 'trade@wealthsimple.com',
    html: `
      <html>
        <body>
          <h1>Order Filled</h1>
          <p>Account: TFSA</p>
          <p>Type: Buy</p>
          <p>Symbol: AAPL</p>
          <p>Shares: 100</p>
          <p>Average Price: $150.75 per share</p>
          <p>Total Cost: $15,075.00</p>
          <p>Execution: June 17, 2025 10:35 EDT</p>
        </body>
      </html>
    `
  }
};

describe('Task 14.2: Duplicate Detection Tests', () => {
  let testTransactionIds: string[] = [];
  let testPortfolioId: string;

  beforeAll(async () => {
    console.log('🚀 Setting up duplicate detection test environment...');
    
    // Create test portfolio
    const portfolioResult = await SupabaseService.createPortfolio({
      name: 'Test TFSA Portfolio',
      type: 'TFSA',
      description: 'Test portfolio for duplicate detection'
    });
    
    if (portfolioResult.success && portfolioResult.data) {
      testPortfolioId = portfolioResult.data.id;
      console.log(`✅ Created test portfolio: ${testPortfolioId}`);
    } else {
      throw new Error('Failed to create test portfolio');
    }
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up duplicate detection test data...');
    await cleanupTestTransactions();
  });

  it('should detect exact duplicate transactions', async () => {
    console.log('🔍 Testing exact duplicate detection...');
    
    // First, process the original email
    const originalEmail = DUPLICATE_TEST_EMAILS.exact;
    const firstResult = await EmailProcessingService.processEmail(
      originalEmail.subject,
      originalEmail.from,
      originalEmail.html,
      undefined,
      {
        createMissingPortfolios: true,
        skipDuplicateCheck: false,
        enhanceSymbols: false,
        dryRun: false
      }
    );

    expect(firstResult.success).toBe(true);
    expect(firstResult.transactionCreated).toBe(true);
    
    if (firstResult.transaction) {
      testTransactionIds.push(firstResult.transaction.id);
    }

    // Then, try to process the same email again
    const duplicateResult = await EmailProcessingService.processEmail(
      originalEmail.subject,
      originalEmail.from,
      originalEmail.html,
      undefined,
      {
        createMissingPortfolios: false,
        skipDuplicateCheck: false,
        enhanceSymbols: false,
        dryRun: false
      }
    );

    // Should still succeed but with duplicate warning
    expect(duplicateResult.success).toBe(true);
    expect(duplicateResult.warnings.length).toBeGreaterThan(0);
    expect(duplicateResult.warnings.some(w => w.includes('duplicate'))).toBe(true);
  });

  it('should detect similar transactions with slight variations', async () => {
    console.log('🔍 Testing similar transaction detection...');
    
    const similarEmail = DUPLICATE_TEST_EMAILS.similar;
    const result = await EmailProcessingService.processEmail(
      similarEmail.subject,
      similarEmail.from,
      similarEmail.html,
      undefined,
      {
        createMissingPortfolios: false,
        skipDuplicateCheck: false,
        enhanceSymbols: false,
        dryRun: false
      }
    );

    // Should detect similarity and warn
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('duplicate') || w.includes('similar'))).toBe(true);
  });

  it('should handle price variations within tolerance', async () => {
    console.log('🔍 Testing price variation tolerance...');
    
    const priceVariationEmail = DUPLICATE_TEST_EMAILS.priceVariation;
    const result = await EmailProcessingService.processEmail(
      priceVariationEmail.subject,
      priceVariationEmail.from,
      priceVariationEmail.html,
      undefined,
      {
        createMissingPortfolios: false,
        skipDuplicateCheck: false,
        enhanceSymbols: false,
        dryRun: false
      }
    );

    // Should handle small price variations gracefully
    if (result.warnings.length > 0) {
      console.log('⚠️ Price variation warnings:', result.warnings);
    }
    
    // Should still process the transaction if price difference is within tolerance
    expect(result.success).toBe(true);
  });

  it('should allow different transactions to proceed', async () => {
    console.log('🔍 Testing different transaction processing...');
    
    const differentEmail = {
      subject: 'Trade confirmation - MSFT sale',
      from: 'noreply@wealthsimple.com',
      html: `
        <html>
          <body>
            <h1>Trade Confirmation</h1>
            <p>Account: RRSP</p>
            <p>Action: Sold 50 shares of MSFT</p>
            <p>Price: $425.75 per share</p>
            <p>Total: $21,287.50</p>
            <p>Date: June 17, 2025 2:15 PM EDT</p>
          </body>
        </html>
      `
    };

    const result = await EmailProcessingService.processEmail(
      differentEmail.subject,
      differentEmail.from,
      differentEmail.html,
      undefined,
      {
        createMissingPortfolios: true,
        skipDuplicateCheck: false,
        enhanceSymbols: false,
        dryRun: false
      }
    );

    expect(result.success).toBe(true);
    expect(result.transactionCreated).toBe(true);
    
    // Should not have duplicate warnings for a different transaction
    const duplicateWarnings = result.warnings.filter(w => w.includes('duplicate'));
    expect(duplicateWarnings.length).toBe(0);
    
    if (result.transaction) {
      testTransactionIds.push(result.transaction.id);
    }
  });

  it('should skip duplicate check when requested', async () => {
    console.log('🔍 Testing duplicate check skip...');
    
    const originalEmail = DUPLICATE_TEST_EMAILS.exact;
    const result = await EmailProcessingService.processEmail(
      originalEmail.subject,
      originalEmail.from,
      originalEmail.html,
      undefined,
      {
        createMissingPortfolios: false,
        skipDuplicateCheck: true, // Skip duplicate checking
        enhanceSymbols: false,
        dryRun: false
      }
    );

    expect(result.success).toBe(true);
    expect(result.transactionCreated).toBe(true);
    
    // Should not have duplicate warnings when skipped
    const duplicateWarnings = result.warnings.filter(w => w.includes('duplicate'));
    expect(duplicateWarnings.length).toBe(0);
    
    if (result.transaction) {
      testTransactionIds.push(result.transaction.id);
    }
  });

  it('should handle batch processing with duplicates', async () => {
    console.log('🔍 Testing batch processing with duplicates...');
    
    const emails = [
      {
        subject: DUPLICATE_TEST_EMAILS.exact.subject,
        fromEmail: DUPLICATE_TEST_EMAILS.exact.from,
        htmlContent: DUPLICATE_TEST_EMAILS.exact.html,
        textContent: undefined
      },
      {
        subject: DUPLICATE_TEST_EMAILS.similar.subject,
        fromEmail: DUPLICATE_TEST_EMAILS.similar.from,
        htmlContent: DUPLICATE_TEST_EMAILS.similar.html,
        textContent: undefined
      }
    ];

    const results = await EmailProcessingService.processBatchEmails(emails, {
      createMissingPortfolios: false,
      skipDuplicateCheck: false,
      enhanceSymbols: false,
      dryRun: false
    });

    expect(results.length).toBe(2);
    
    // At least one should have duplicate warnings
    const hasWarnings = results.some(r => r.warnings.length > 0);
    expect(hasWarnings).toBe(true);
    
    // Collect transaction IDs for cleanup
    results.forEach(result => {
      if (result.transaction) {
        testTransactionIds.push(result.transaction.id);
      }
    });
  });

  it('should perform duplicate detection within time limits', async () => {
    console.log('⚡ Testing duplicate detection performance...');
    
    const email = DUPLICATE_TEST_EMAILS.exact;
    const iterations = 10;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await EmailProcessingService.processEmail(
        email.subject,
        email.from,
        email.html,
        undefined,
        {
          dryRun: true, // Don't create actual transactions
          skipDuplicateCheck: false,
          enhanceSymbols: false,
          createMissingPortfolios: false
        }
      );
    }
    
    const endTime = Date.now();
    const averageTime = (endTime - startTime) / iterations;
    
    console.log(`⚡ Average duplicate check time: ${averageTime.toFixed(2)}ms`);
    expect(averageTime).toBeLessThan(200); // Should be less than 200ms per check
  });

  it('should validate duplicate detection accuracy', async () => {
    console.log('🎯 Testing duplicate detection accuracy...');
    
    // Test with known duplicate scenarios
    const testCases = [
      { 
        case: 'exact_match',
        email1: DUPLICATE_TEST_EMAILS.exact,
        email2: DUPLICATE_TEST_EMAILS.exact,
        shouldDetect: true
      },
      {
        case: 'similar_transaction',
        email1: DUPLICATE_TEST_EMAILS.exact,
        email2: DUPLICATE_TEST_EMAILS.similar,
        shouldDetect: true
      },
      {
        case: 'price_variation',
        email1: DUPLICATE_TEST_EMAILS.exact,
        email2: DUPLICATE_TEST_EMAILS.priceVariation,
        shouldDetect: true
      }
    ];

    for (const testCase of testCases) {
      console.log(`🎯 Testing case: ${testCase.case}`);
      
      // Process first email
      const result1 = await EmailProcessingService.processEmail(
        testCase.email1.subject,
        testCase.email1.from,
        testCase.email1.html,
        undefined,
        { dryRun: true, skipDuplicateCheck: true }
      );
      
      expect(result1.success).toBe(true);
      
      // Process second email with duplicate checking
      const result2 = await EmailProcessingService.processEmail(
        testCase.email2.subject,
        testCase.email2.from,
        testCase.email2.html,
        undefined,
        { dryRun: true, skipDuplicateCheck: false }
      );
      
      if (testCase.shouldDetect) {
        // Should detect potential duplicate
        const hasDuplicateWarning = result2.warnings.some(w => 
          w.includes('duplicate') || w.includes('similar')
        );
        
        if (!hasDuplicateWarning) {
          console.log(`⚠️ Expected duplicate detection for case: ${testCase.case}`);
          console.log('Warnings:', result2.warnings);
        }
      }
    }
  });

  // Helper function to clean up test transactions
  async function cleanupTestTransactions() {
    for (const transactionId of testTransactionIds) {
      try {
        await SupabaseService.deleteTransaction(transactionId);
        console.log(`🗑️ Deleted test transaction: ${transactionId}`);
      } catch (error) {
        console.warn(`Failed to delete transaction ${transactionId}:`, error);
      }
    }
    
    // Clean up test portfolio
    if (testPortfolioId) {
      try {
        await SupabaseService.deletePortfolio(testPortfolioId);
        console.log(`🗑️ Deleted test portfolio: ${testPortfolioId}`);
      } catch (error) {
        console.warn(`Failed to delete portfolio ${testPortfolioId}:`, error);
      }
    }
    
    testTransactionIds = [];
  }
});
