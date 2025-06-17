/**
 * Task 14.2: Validate Duplicate Detection
 * Tests for duplicate detection with real email scenarios
 */

import { test, expect } from '@playwright/test';
import { MultiLevelDuplicateDetection } from '../../services/email/multiLevelDuplicateDetection';
import { WealthsimpleEmailParser } from '../../services/email/wealthsimpleEmailParser';
import { EmailProcessingService } from '../../services/email/emailProcessingService';
import { SupabaseService } from '../../services/supabaseService';
import type { WealthsimpleEmailData } from '../../services/email/wealthsimpleEmailParser';

test.describe('Duplicate Detection Tests', () => {
  let testPortfolioId: string;

  test.beforeAll(async () => {
    console.log('🧪 Setting up duplicate detection test environment...');
    
    const portfolioResult = await SupabaseService.createPortfolio({
      name: 'Duplicate Test Portfolio',
      description: 'Test portfolio for duplicate detection testing',
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
      console.log('🧹 Cleaning up duplicate detection test data...');
      
      const transactionsResult = await SupabaseService.getTransactions(testPortfolioId);
      if (transactionsResult.success && transactionsResult.data) {
        for (const transaction of transactionsResult.data) {
          await SupabaseService.deleteTransaction(transaction.id);
        }
      }
      
      await SupabaseService.deletePortfolio(testPortfolioId);
      console.log('✅ Duplicate detection test cleanup completed');
    }
  });

  test('should detect exact duplicate emails', async () => {
    console.log('🔍 Testing exact duplicate detection...');
    
    const email = {
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
            <p>Order ID: WS-123456789</p>
          </body>
        </html>
      `,
      text: `
        Order Confirmation
        Account: TFSA
        Transaction: Buy
        Symbol: AAPL
        Quantity: 10 shares
        Price: $150.50 per share
        Total: $1,505.00
        Date: June 17, 2025 10:30 EDT
        Order ID: WS-123456789
      `
    };
    
    // Process first email
    const firstResult = await EmailProcessingService.processEmail(
      email.subject,
      email.from,
      email.html,
      email.text,
      { createMissingPortfolios: true, skipDuplicateCheck: false }
    );
    
    expect(firstResult.success).toBe(true);
    expect(firstResult.transactionCreated).toBe(true);
    
    // Process exact same email again
    const secondResult = await EmailProcessingService.processEmail(
      email.subject,
      email.from,
      email.html,
      email.text,
      { createMissingPortfolios: true, skipDuplicateCheck: false }
    );
    
    // Should detect duplicate
    expect(secondResult.warnings?.some(w => w.includes('duplicate'))).toBeTruthy();
    
    console.log('✅ Exact duplicate detection working');
  });

  test('should detect similar transactions with different timestamps', async () => {
    console.log('🔍 Testing similar transaction detection...');
    
    const emailData1: WealthsimpleEmailData = {
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
      rawContent: 'Original email content',
      confidence: 0.95,
      parseMethod: 'HTML',
      orderId: 'WS-123456789'
    };
    
    const emailData2: WealthsimpleEmailData = {
      ...emailData1,
      executionTime: '10:31', // 1 minute later
      orderId: 'WS-123456790', // Different order ID
      rawContent: 'Slightly different email content'
    };
    
    // Test duplicate detection
    const duplicateResult = await MultiLevelDuplicateDetection.detectDuplicates(
      emailData2,
      testPortfolioId
    );
    
    expect(duplicateResult.isDuplicate).toBe(true);
    expect(duplicateResult.confidence).toBeGreaterThan(0.8);
    expect(duplicateResult.recommendation).toBe('review');
    
    console.log('✅ Similar transaction detection working');
  });

  test('should not flag different legitimate transactions as duplicates', async () => {
    console.log('🔍 Testing legitimate different transactions...');
    
    const emailData1: WealthsimpleEmailData = {
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
      rawContent: 'Buy order content',
      confidence: 0.95,
      parseMethod: 'HTML',
      orderId: 'WS-123456789'
    };
    
    const emailData2: WealthsimpleEmailData = {
      symbol: 'TSLA', // Different symbol
      transactionType: 'buy',
      quantity: 5, // Different quantity
      price: 245.75, // Different price
      totalAmount: 1228.75,
      accountType: 'RRSP', // Different account
      transactionDate: '2025-06-17',
      executionTime: '14:15',
      timezone: 'EDT',
      currency: 'USD',
      subject: 'Your order has been filled',
      fromEmail: 'noreply@wealthsimple.com',
      rawContent: 'Different buy order content',
      confidence: 0.95,
      parseMethod: 'HTML',
      orderId: 'WS-987654321'
    };
    
    // Test duplicate detection
    const duplicateResult = await MultiLevelDuplicateDetection.detectDuplicates(
      emailData2,
      testPortfolioId
    );
    
    expect(duplicateResult.isDuplicate).toBe(false);
    expect(duplicateResult.recommendation).toBe('accept');
    
    console.log('✅ Different transactions correctly identified as unique');
  });

  test('should handle buy/sell of same stock on same day', async () => {
    console.log('🔍 Testing buy/sell same stock same day...');
    
    const buyEmail: WealthsimpleEmailData = {
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
      subject: 'Your buy order has been filled',
      fromEmail: 'noreply@wealthsimple.com',
      rawContent: 'Buy order content',
      confidence: 0.95,
      parseMethod: 'HTML',
      orderId: 'WS-BUY-123'
    };
    
    const sellEmail: WealthsimpleEmailData = {
      ...buyEmail,
      transactionType: 'sell',
      executionTime: '14:30',
      subject: 'Your sell order has been filled',
      rawContent: 'Sell order content',
      orderId: 'WS-SELL-123'
    };
    
    // Process buy first
    const buyResult = await MultiLevelDuplicateDetection.detectDuplicates(
      buyEmail,
      testPortfolioId
    );
    
    expect(buyResult.isDuplicate).toBe(false);
    expect(buyResult.recommendation).toBe('accept');
    
    // Process sell (should not be flagged as duplicate due to different transaction type)
    const sellResult = await MultiLevelDuplicateDetection.detectDuplicates(
      sellEmail,
      testPortfolioId
    );
    
    expect(sellResult.isDuplicate).toBe(false);
    expect(sellResult.recommendation).toBe('accept');
    
    console.log('✅ Buy/sell same stock correctly handled as separate transactions');
  });

  test('should detect duplicate with slightly different prices', async () => {
    console.log('🔍 Testing price variation duplicate detection...');
    
    const emailData1: WealthsimpleEmailData = {
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
      rawContent: 'Original order content',
      confidence: 0.95,
      parseMethod: 'HTML',
      orderId: 'WS-123456789'
    };
    
    const emailData2: WealthsimpleEmailData = {
      ...emailData1,
      price: 150.51, // Slightly different price
      totalAmount: 1505.10,
      rawContent: 'Slightly different order content',
      orderId: 'WS-123456790'
    };
    
    // Test duplicate detection
    const duplicateResult = await MultiLevelDuplicateDetection.detectDuplicates(
      emailData2,
      testPortfolioId
    );
    
    expect(duplicateResult.isDuplicate).toBe(true);
    expect(duplicateResult.confidence).toBeGreaterThan(0.7);
    expect(duplicateResult.recommendation).toBe('review');
    expect(duplicateResult.reasons).toContain('Similar price with small variance');
    
    console.log('✅ Price variation duplicate detection working');
  });

  test('should handle option expiration duplicates', async () => {
    console.log('🔍 Testing option expiration duplicates...');
    
    const optionEmail: WealthsimpleEmailData = {
      symbol: 'TSLL 13.00 call',
      transactionType: 'option_expired',
      quantity: 10,
      price: 0.00,
      totalAmount: 0.00,
      accountType: 'Margin',
      transactionDate: '2025-06-17',
      executionTime: '16:00',
      timezone: 'EDT',
      currency: 'USD',
      subject: 'Option expired',
      fromEmail: 'noreply@wealthsimple.com',
      rawContent: 'Option expiration notice',
      confidence: 0.90,
      parseMethod: 'HTML',
      orderId: 'WS-EXP-123'
    };
    
    // Process same option expiration twice
    const firstResult = await MultiLevelDuplicateDetection.detectDuplicates(
      optionEmail,
      testPortfolioId
    );
    
    expect(firstResult.isDuplicate).toBe(false);
    
    const secondResult = await MultiLevelDuplicateDetection.detectDuplicates(
      optionEmail,
      testPortfolioId
    );
    
    expect(secondResult.isDuplicate).toBe(true);
    expect(secondResult.recommendation).toBe('reject');
    
    console.log('✅ Option expiration duplicate detection working');
  });

  test('should handle dividend payment duplicates', async () => {
    console.log('🔍 Testing dividend payment duplicates...');
    
    const dividendEmail: WealthsimpleEmailData = {
      symbol: 'VTI',
      transactionType: 'dividend',
      quantity: 100,
      price: 0.87,
      totalAmount: 87.00,
      accountType: 'TFSA',
      transactionDate: '2025-06-15',
      timezone: 'EDT',
      currency: 'USD',
      subject: 'Dividend payment received',
      fromEmail: 'noreply@wealthsimple.com',
      rawContent: 'Dividend payment notice',
      confidence: 0.95,
      parseMethod: 'HTML'
    };
    
    // Process dividend payment twice
    const firstResult = await MultiLevelDuplicateDetection.detectDuplicates(
      dividendEmail,
      testPortfolioId
    );
    
    expect(firstResult.isDuplicate).toBe(false);
    
    const secondResult = await MultiLevelDuplicateDetection.detectDuplicates(
      dividendEmail,
      testPortfolioId
    );
    
    expect(secondResult.isDuplicate).toBe(true);
    expect(secondResult.confidence).toBeGreaterThan(0.9);
    expect(secondResult.recommendation).toBe('reject');
    
    console.log('✅ Dividend payment duplicate detection working');
  });

  test('should test duplicate detection performance', async () => {
    console.log('⚡ Testing duplicate detection performance...');
    
    const testEmail: WealthsimpleEmailData = {
      symbol: 'PERF',
      transactionType: 'buy',
      quantity: 1,
      price: 100.00,
      totalAmount: 100.00,
      accountType: 'TFSA',
      transactionDate: '2025-06-17',
      timezone: 'EDT',
      currency: 'USD',
      subject: 'Performance test',
      fromEmail: 'noreply@wealthsimple.com',
      rawContent: 'Performance test content',
      confidence: 0.95,
      parseMethod: 'HTML'
    };
    
    const startTime = Date.now();
    
    // Test detection 100 times
    for (let i = 0; i < 100; i++) {
      const emailData = {
        ...testEmail,
        orderId: `WS-PERF-${i}`,
        rawContent: `Performance test content ${i}`
      };
      
      await MultiLevelDuplicateDetection.detectDuplicates(
        emailData,
        testPortfolioId
      );
    }
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    const avgTime = duration / 100;
    
    console.log(`⚡ Average duplicate detection time: ${avgTime.toFixed(2)}ms`);
    expect(avgTime).toBeLessThan(100); // Should be under 100ms per check
    
    console.log('✅ Duplicate detection performance acceptable');
  });

  test('should provide detailed duplicate analysis', async () => {
    console.log('🔍 Testing detailed duplicate analysis...');
    
    const originalEmail: WealthsimpleEmailData = {
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
      rawContent: 'Original order content',
      confidence: 0.95,
      parseMethod: 'HTML',
      orderId: 'WS-123456789'
    };
    
    const duplicateEmail: WealthsimpleEmailData = {
      ...originalEmail,
      rawContent: 'Duplicate order content with different text',
      orderId: 'WS-123456790'
    };
    
    // Test detailed analysis
    const duplicateResult = await MultiLevelDuplicateDetection.detectDuplicates(
      duplicateEmail,
      testPortfolioId
    );
    
    expect(duplicateResult.details).toBeTruthy();
    expect(duplicateResult.reasons).toBeTruthy();
    expect(duplicateResult.matchedTransactions).toBeTruthy();
    expect(duplicateResult.confidence).toBeGreaterThan(0);
    expect(duplicateResult.confidence).toBeLessThanOrEqual(1);
    
    console.log('Duplicate detection details:');
    console.log('- Confidence:', duplicateResult.confidence);
    console.log('- Recommendation:', duplicateResult.recommendation);
    console.log('- Reasons:', duplicateResult.reasons);
    
    console.log('✅ Detailed duplicate analysis working');
  });
});
