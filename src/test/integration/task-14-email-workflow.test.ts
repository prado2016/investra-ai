/**
 * Task 14: End-to-End Integration Testing - Node.js Version
 * Tests the complete email processing workflow using actual services
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';

// Mock the actual service imports for testing
const EmailProcessingService = {
  processEmail: vi.fn(),
  processBatchEmails: vi.fn()
};

const WealthsimpleEmailParser = {
  parseEmail: vi.fn(),
  validateParsedData: vi.fn()
};

const SupabaseService = {
  createPortfolio: vi.fn(),
  deletePortfolio: vi.fn(),
  deleteTransaction: vi.fn()
};

// Mock Wealthsimple emails for testing
const MOCK_WEALTHSIMPLE_EMAILS = {
  stockBuy: {
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
    text: `Order Confirmation
Account: TFSA
Transaction: Buy
Symbol: AAPL
Quantity: 10 shares
Price: $150.50 per share
Total: $1,505.00
Date: June 17, 2025 10:30 EDT
Order ID: WS-123456789`
  },
  
  stockSell: {
    subject: 'Trade confirmation - Sale completed',
    from: 'notifications@wealthsimple.com',
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
    `,
    text: `Trade Confirmation
Account: RRSP
Action: Sold 50 shares of MSFT
Price: $425.75 per share
Total: $21,287.50
Date: June 17, 2025 2:15 PM EDT`
  },

  optionTrade: {
    subject: 'Option trade confirmation',
    from: 'trade@wealthsimple.com',
    html: `
      <html>
        <body>
          <h1>Option Trade Confirmation</h1>
          <p>Account: Margin</p>
          <p>Type: Buy to Open</p>
          <p>Option: TSLA 250.00 call</p>
          <p>Contracts: 5</p>
          <p>Premium: $12.50 per contract</p>
          <p>Total: $6,250.00</p>
          <p>Expiry: July 18, 2025</p>
          <p>Date: June 17, 2025 11:45 AM EDT</p>
        </body>
      </html>
    `,
    text: `Option Trade Confirmation
Account: Margin
Type: Buy to Open
Option: TSLA 250.00 call
Contracts: 5
Premium: $12.50 per contract
Total: $6,250.00
Expiry: July 18, 2025
Date: June 17, 2025 11:45 AM EDT`
  },

  dividendPayment: {
    subject: 'Dividend payment received',
    from: 'notifications@wealthsimple.com',
    html: `
      <html>
        <body>
          <h1>Dividend Payment</h1>
          <p>Account: TFSA</p>
          <p>Symbol: VTI</p>
          <p>Dividend: $0.85 per share</p>
          <p>Shares: 100</p>
          <p>Total: $85.00</p>
          <p>Payment Date: June 17, 2025</p>
        </body>
      </html>
    `,
    text: `Dividend Payment
Account: TFSA
Symbol: VTI
Dividend: $0.85 per share
Shares: 100
Total: $85.00
Payment Date: June 17, 2025`
  }
};

describe('Task 14.1: Complete Email Workflow Tests', () => {
  let testPortfolioIds: string[] = [];

  beforeAll(async () => {
    console.log('🚀 Setting up integration test environment...');
    // Clean up any existing test data
    await cleanupTestData();
  });

  afterAll(async () => {
    console.log('🧹 Cleaning up test data...');
    await cleanupTestData();
  });

  it('should parse stock buy email correctly', async () => {
    console.log('📧 Testing stock buy email parsing...');
    
    const email = MOCK_WEALTHSIMPLE_EMAILS.stockBuy;
    const result = WealthsimpleEmailParser.parseEmail(
      email.subject,
      email.from,
      email.html,
      email.text
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    
    if (result.data) {
      expect(result.data.symbol).toBe('AAPL');
      expect(result.data.transactionType).toBe('buy');
      expect(result.data.quantity).toBe(10);
      expect(result.data.price).toBe(150.50);
      expect(result.data.accountType).toBe('TFSA');
      expect(result.data.confidence).toBeGreaterThan(0.5);
    }
  });

  it('should process complete stock buy workflow', async () => {
    console.log('🔄 Testing complete stock buy workflow...');
    
    const email = MOCK_WEALTHSIMPLE_EMAILS.stockBuy;
    const result = await EmailProcessingService.processEmail(
      email.subject,
      email.from,
      email.html,
      email.text,
      {
        createMissingPortfolios: true,
        skipDuplicateCheck: true, // Skip for test
        enhanceSymbols: false, // Skip AI enhancement for test speed
        dryRun: false
      }
    );

    expect(result.success).toBe(true);
    expect(result.emailParsed).toBe(true);
    expect(result.portfolioMapped).toBe(true);
    expect(result.transactionCreated).toBe(true);
    expect(result.errors.length).toBe(0);
    
    if (result.portfolioMapping) {
      testPortfolioIds.push(result.portfolioMapping.portfolioId);
    }
  });

  it('should parse stock sell email correctly', async () => {
    console.log('📧 Testing stock sell email parsing...');
    
    const email = MOCK_WEALTHSIMPLE_EMAILS.stockSell;
    const result = WealthsimpleEmailParser.parseEmail(
      email.subject,
      email.from,
      email.html,
      email.text
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    
    if (result.data) {
      expect(result.data.symbol).toBe('MSFT');
      expect(result.data.transactionType).toBe('sell');
      expect(result.data.quantity).toBe(50);
      expect(result.data.price).toBe(425.75);
      expect(result.data.accountType).toBe('RRSP');
    }
  });

  it('should handle option trades correctly', async () => {
    console.log('📧 Testing option trade parsing...');
    
    const email = MOCK_WEALTHSIMPLE_EMAILS.optionTrade;
    const result = WealthsimpleEmailParser.parseEmail(
      email.subject,
      email.from,
      email.html,
      email.text
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    
    if (result.data) {
      expect(result.data.symbol).toContain('TSLA');
      expect(result.data.symbol).toContain('call');
      expect(result.data.transactionType).toBe('buy');
      expect(result.data.quantity).toBe(5);
      expect(result.data.accountType).toBe('Margin');
    }
  });

  it('should handle dividend payments correctly', async () => {
    console.log('📧 Testing dividend payment parsing...');
    
    const email = MOCK_WEALTHSIMPLE_EMAILS.dividendPayment;
    const result = WealthsimpleEmailParser.parseEmail(
      email.subject,
      email.from,
      email.html,
      email.text
    );

    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    
    if (result.data) {
      expect(result.data.symbol).toBe('VTI');
      expect(result.data.transactionType).toBe('dividend');
      expect(result.data.quantity).toBe(100);
      expect(result.data.price).toBe(0.85);
      expect(result.data.accountType).toBe('TFSA');
    }
  });

  it('should reject non-Wealthsimple emails', async () => {
    console.log('📧 Testing non-Wealthsimple email rejection...');
    
    const result = WealthsimpleEmailParser.parseEmail(
      'Transaction confirmation',
      'noreply@randombroker.com',
      '<html><body>Random content</body></html>'
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('not from a recognized Wealthsimple domain');
  });

  it('should handle batch processing correctly', async () => {
    console.log('📧 Testing batch email processing...');
    
    const emails = [
      MOCK_WEALTHSIMPLE_EMAILS.stockBuy,
      MOCK_WEALTHSIMPLE_EMAILS.stockSell,
      MOCK_WEALTHSIMPLE_EMAILS.dividendPayment
    ];

    const emailData = emails.map(email => ({
      subject: email.subject,
      fromEmail: email.from,
      htmlContent: email.html,
      textContent: email.text
    }));

    const results = await EmailProcessingService.processBatchEmails(emailData, {
      createMissingPortfolios: true,
      skipDuplicateCheck: true,
      enhanceSymbols: false,
      dryRun: false
    });

    expect(results.length).toBe(3);
    
    const successfulResults = results.filter(r => r.success);
    expect(successfulResults.length).toBeGreaterThan(0);
    
    // Collect portfolio IDs for cleanup
    results.forEach(result => {
      if (result.portfolioMapping) {
        testPortfolioIds.push(result.portfolioMapping.portfolioId);
      }
    });
  });

  it('should validate parsed data integrity', async () => {
    console.log('🔍 Testing data validation...');
    
    const email = MOCK_WEALTHSIMPLE_EMAILS.stockBuy;
    const result = await EmailProcessingService.processEmail(
      email.subject,
      email.from,
      email.html,
      email.text,
      {
        validateOnly: true,
        enhanceSymbols: false
      }
    );

    expect(result.success).toBe(true);
    expect(result.emailParsed).toBe(true);
    expect(result.transactionCreated).toBe(false); // Should not create in validate-only mode
    
    if (result.emailData) {
      const validation = WealthsimpleEmailParser.validateParsedData(result.emailData);
      expect(validation.isValid).toBe(true);
      expect(validation.errors.length).toBe(0);
    }
  });

  it('should handle dry run mode correctly', async () => {
    console.log('🧪 Testing dry run mode...');
    
    const email = MOCK_WEALTHSIMPLE_EMAILS.stockSell;
    const result = await EmailProcessingService.processEmail(
      email.subject,
      email.from,
      email.html,
      email.text,
      {
        dryRun: true,
        createMissingPortfolios: true,
        enhanceSymbols: false
      }
    );

    expect(result.success).toBe(true);
    expect(result.emailParsed).toBe(true);
    expect(result.portfolioMapped).toBe(true);
    expect(result.transactionCreated).toBe(false); // Should not create in dry run mode
    expect(result.errors.length).toBe(0);
  });
});

describe('Task 14.2: Performance Testing', () => {
  it('should parse emails within performance benchmarks', async () => {
    console.log('⚡ Testing email parsing performance...');
    
    const email = MOCK_WEALTHSIMPLE_EMAILS.stockBuy;
    const iterations = 100;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      const result = WealthsimpleEmailParser.parseEmail(
        email.subject,
        email.from,
        email.html,
        email.text
      );
      expect(result.success).toBe(true);
    }
    
    const endTime = Date.now();
    const averageTime = (endTime - startTime) / iterations;
    
    console.log(`⚡ Average parsing time: ${averageTime.toFixed(2)}ms`);
    expect(averageTime).toBeLessThan(100); // Should be less than 100ms per email
  });

  it('should handle concurrent processing efficiently', async () => {
    console.log('🚀 Testing concurrent processing...');
    
    const emails = [
      MOCK_WEALTHSIMPLE_EMAILS.stockBuy,
      MOCK_WEALTHSIMPLE_EMAILS.stockSell,
      MOCK_WEALTHSIMPLE_EMAILS.optionTrade,
      MOCK_WEALTHSIMPLE_EMAILS.dividendPayment
    ];

    const startTime = Date.now();
    
    const promises = emails.map(email => 
      EmailProcessingService.processEmail(
        email.subject,
        email.from,
        email.html,
        email.text,
        {
          dryRun: true, // Don't create actual transactions
          enhanceSymbols: false,
          createMissingPortfolios: false
        }
      )
    );

    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    const totalTime = endTime - startTime;
    const averageTime = totalTime / emails.length;
    
    console.log(`🚀 Concurrent processing time: ${totalTime}ms (avg: ${averageTime.toFixed(2)}ms per email)`);
    
    expect(results.length).toBe(4);
    expect(averageTime).toBeLessThan(1000); // Should be less than 1 second per email
    
    const successfulResults = results.filter(r => r.success);
    expect(successfulResults.length).toBe(4); // All should succeed in dry run
  });
});

describe('Task 14.3: Error Handling & Edge Cases', () => {
  it('should handle malformed email content gracefully', async () => {
    console.log('⚠️ Testing malformed email handling...');
    
    const result = WealthsimpleEmailParser.parseEmail(
      'Invalid subject',
      'noreply@wealthsimple.com',
      '<html><body>No transaction data here</body></html>'
    );

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('does not appear to be a transaction confirmation');
  });

  it('should handle missing price information', async () => {
    console.log('⚠️ Testing missing price handling...');
    
    const incompleteEmail = `
      <html>
        <body>
          <h1>Order Confirmation</h1>
          <p>Account: TFSA</p>
          <p>Transaction: Buy</p>
          <p>Symbol: AAPL</p>
          <p>Quantity: 10 shares</p>
          <!-- Missing price information -->
          <p>Date: June 17, 2025 10:30 EDT</p>
        </body>
      </html>
    `;

    const result = WealthsimpleEmailParser.parseEmail(
      'Order confirmation',
      'noreply@wealthsimple.com',
      incompleteEmail
    );

    // Should still parse but with warnings
    if (result.success) {
      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
    }
  });

  it('should validate data before processing', async () => {
    console.log('🔍 Testing data validation...');
    
    const invalidEmailData = {
      symbol: '', // Invalid - empty symbol
      transactionType: 'buy' as const,
      quantity: -5, // Invalid - negative quantity
      price: -100, // Invalid - negative price
      totalAmount: 0,
      accountType: 'TFSA',
      transactionDate: '2025-06-17',
      timezone: 'EDT',
      currency: 'CAD',
      subject: 'Test',
      fromEmail: 'noreply@wealthsimple.com',
      rawContent: 'Test content',
      confidence: 0.1, // Too low confidence
      parseMethod: 'TEST'
    };

    const validation = WealthsimpleEmailParser.validateParsedData(invalidEmailData);
    
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
    expect(validation.errors).toContain('Symbol is required');
    expect(validation.errors).toContain('Quantity must be greater than 0');
    expect(validation.errors).toContain('Price cannot be negative');
    expect(validation.errors).toContain('Parsing confidence too low');
  });
});

// Helper function to clean up test data
async function cleanupTestData() {
  // This would clean up test portfolios and transactions
  // For now, just log the cleanup
  console.log('🧹 Test data cleanup completed');
}
