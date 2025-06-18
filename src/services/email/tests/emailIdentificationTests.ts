/**
 * Email Identification Service Tests
 * Task 5.1: Test Message-ID, email hash, and order ID extraction
 */

import { EmailIdentificationService, type EmailIdentification, type DuplicateDetectionData } from '../emailIdentificationService';

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
  etfPurchase: {
    subject: "Trade Confirmation - VTI Purchase",
    from: "notifications@wealthsimple.com",
    html: "<p>Bought 100 shares of VTI at $240.25</p>",
    text: "Bought 100 shares of VTI at $240.25"
  },
  canadianStock: {
    subject: "Trade Confirmation - CNR.TO Purchase",
    from: "notifications@wealthsimple.com",
    html: "<p>Bought 25 shares of CNR.TO at C$165.50</p>",
    text: "Bought 25 shares of CNR.TO at C$165.50"
  }
};

const INVALID_EMAILS = {
  nonWealthsimple: {
    subject: "Test",
    from: "test@example.com",
    html: "<p>Test</p>",
    text: "Test"
  },
  nonTransaction: {
    subject: "Newsletter Update",
    from: "notifications@wealthsimple.com",
    html: "<p>Weekly market update</p>",
    text: "Weekly market update"
  }
};

const EDGE_CASES = {
  fractionalShares: {
    subject: "Trade Confirmation",
    from: "notifications@wealthsimple.com",
    html: "<p>Bought 0.75 shares</p>",
    text: "Bought 0.75 shares"
  },
  highValue: {
    subject: "Trade Confirmation - High Value",
    from: "notifications@wealthsimple.com",
    html: "<p>Bought 1000 shares of AAPL at $150.25</p>",
    text: "Bought 1000 shares of AAPL at $150.25"
  },
  foreignCurrency: {
    subject: "Trade Confirmation - EUR Transaction",
    from: "notifications@wealthsimple.com",
    html: "<p>Bought 50 shares of ASML at €850.50</p>",
    text: "Bought 50 shares of ASML at €850.50"
  }
};

export interface IdentificationTestResult {
  testName: string;
  success: boolean;
  identification?: EmailIdentification;
  duplicateData?: DuplicateDetectionData;
  errors: string[];
  warnings: string[];
  performance: {
    extractionTime: number;
  };
}

/**
 * Email Identification Test Suite
 */
export class EmailIdentificationTestSuite {
  /**
   * Run all identification tests
   */
  static runAllTests(): IdentificationTestResult[] {
    const results: IdentificationTestResult[] = [];

    console.log('🧪 Running Email Identification Tests...\n');

    // Test basic extraction functionality
    results.push(...this.testBasicExtraction());
    
    // Test order ID extraction
    results.push(...this.testOrderIdExtraction());
    
    // Test duplicate detection
    results.push(...this.testDuplicateDetection());
    
    // Test validation
    results.push(...this.testValidation());
    
    // Test edge cases
    results.push(...this.testEdgeCases());

    // Print summary
    this.printTestSummary(results);

    return results;
  }

  /**
   * Test basic identification extraction
   */
  private static testBasicExtraction(): IdentificationTestResult[] {
    const results: IdentificationTestResult[] = [];

    // Test with stock buy email
    const stockBuyEmail = MOCK_WEALTHSIMPLE_EMAILS.stockBuy;
    const startTime = Date.now();
    
    try {
      const identification = EmailIdentificationService.extractIdentification(
        stockBuyEmail.subject,
        stockBuyEmail.from,
        stockBuyEmail.html,
        stockBuyEmail.text
      );

      const extractionTime = Date.now() - startTime;
      const validation = EmailIdentificationService.validateIdentification(identification);

      results.push({
        testName: 'Basic Extraction - Stock Buy',
        success: true,
        identification,
        errors: validation.errors,
        warnings: validation.warnings,
        performance: { extractionTime }
      });

      console.log(`✅ Basic Extraction - Stock Buy`);
      console.log(`   Email Hash: ${identification.emailHash}`);
      console.log(`   Transaction Hash: ${identification.transactionHash}`);
      console.log(`   Order IDs: ${identification.orderIds.join(', ') || 'None'}`);
      console.log(`   Extraction Time: ${extractionTime}ms\n`);

    } catch (error) {
      results.push({
        testName: 'Basic Extraction - Stock Buy',
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        performance: { extractionTime: Date.now() - startTime }
      });

      console.log(`❌ Basic Extraction - Stock Buy: ${error}\n`);
    }

    return results;
  }

  /**
   * Test order ID extraction from different email formats
   */
  private static testOrderIdExtraction(): IdentificationTestResult[] {
    const results: IdentificationTestResult[] = [];

    const testCases = [
      {
        name: 'Stock Buy with Order ID',
        email: MOCK_WEALTHSIMPLE_EMAILS.stockBuy,
        expectedOrderIds: ['WS123456789']
      },
      {
        name: 'ETF Purchase',
        email: MOCK_WEALTHSIMPLE_EMAILS.etfPurchase,
        expectedOrderIds: []
      },
      {
        name: 'Canadian Stock',
        email: MOCK_WEALTHSIMPLE_EMAILS.canadianStock,
        expectedOrderIds: []
      }
    ];

    for (const testCase of testCases) {
      const startTime = Date.now();
      
      try {
        const identification = EmailIdentificationService.extractIdentification(
          testCase.email.subject,
          testCase.email.from,
          testCase.email.html,
          testCase.email.text
        );

        const extractionTime = Date.now() - startTime;
        
        // Check if expected order IDs were found
        const foundExpectedIds = testCase.expectedOrderIds.every(expectedId =>
          identification.orderIds.includes(expectedId)
        );

        results.push({
          testName: `Order ID Extraction - ${testCase.name}`,
          success: foundExpectedIds,
          identification,
          errors: foundExpectedIds ? [] : [`Expected order IDs ${testCase.expectedOrderIds.join(', ')} not found`],
          warnings: [],
          performance: { extractionTime }
        });

        console.log(`${foundExpectedIds ? '✅' : '⚠️'} Order ID Extraction - ${testCase.name}`);
        console.log(`   Found Order IDs: ${identification.orderIds.join(', ') || 'None'}`);
        console.log(`   Expected: ${testCase.expectedOrderIds.join(', ') || 'None'}\n`);

      } catch (error) {
        results.push({
          testName: `Order ID Extraction - ${testCase.name}`,
          success: false,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          warnings: [],
          performance: { extractionTime: Date.now() - startTime }
        });

        console.log(`❌ Order ID Extraction - ${testCase.name}: ${error}\n`);
      }
    }

    return results;
  }

  /**
   * Test duplicate detection functionality
   */
  private static testDuplicateDetection(): IdentificationTestResult[] {
    const results: IdentificationTestResult[] = [];

    const email1 = MOCK_WEALTHSIMPLE_EMAILS.stockBuy;
    const email2 = MOCK_WEALTHSIMPLE_EMAILS.stockBuy; // Same email
    const email3 = MOCK_WEALTHSIMPLE_EMAILS.stockSell; // Different email

    try {
      const identification1 = EmailIdentificationService.extractIdentification(
        email1.subject,
        email1.from,
        email1.html,
        email1.text
      );

      const identification2 = EmailIdentificationService.extractIdentification(
        email2.subject,
        email2.from,
        email2.html,
        email2.text
      );

      const identification3 = EmailIdentificationService.extractIdentification(
        email3.subject,
        email3.from,
        email3.html,
        email3.text
      );

      // Test identical emails (should be duplicates)
      const duplicateComparison = EmailIdentificationService.compareIdentifications(
        identification1,
        identification2
      );

      // Test different emails (should not be duplicates)
      const differentComparison = EmailIdentificationService.compareIdentifications(
        identification1,
        identification3
      );

      const duplicateTestSuccess = duplicateComparison.isDuplicate && duplicateComparison.confidence >= 0.7;
      const differentTestSuccess = !differentComparison.isDuplicate;

      results.push({
        testName: 'Duplicate Detection - Identical Emails',
        success: duplicateTestSuccess,
        errors: duplicateTestSuccess ? [] : ['Identical emails not detected as duplicates'],
        warnings: [],
        performance: { extractionTime: 0 }
      });

      results.push({
        testName: 'Duplicate Detection - Different Emails',
        success: differentTestSuccess,
        errors: differentTestSuccess ? [] : ['Different emails incorrectly detected as duplicates'],
        warnings: [],
        performance: { extractionTime: 0 }
      });

      console.log(`${duplicateTestSuccess ? '✅' : '❌'} Duplicate Detection - Identical Emails`);
      console.log(`   Is Duplicate: ${duplicateComparison.isDuplicate}`);
      console.log(`   Confidence: ${duplicateComparison.confidence.toFixed(2)}`);
      console.log(`   Matched Fields: ${duplicateComparison.matchedFields.join(', ')}\n`);

      console.log(`${differentTestSuccess ? '✅' : '❌'} Duplicate Detection - Different Emails`);
      console.log(`   Is Duplicate: ${differentComparison.isDuplicate}`);
      console.log(`   Confidence: ${differentComparison.confidence.toFixed(2)}`);
      console.log(`   Matched Fields: ${differentComparison.matchedFields.join(', ')}\n`);

    } catch (error) {
      results.push({
        testName: 'Duplicate Detection - Error',
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        performance: { extractionTime: 0 }
      });

      console.log(`❌ Duplicate Detection failed: ${error}\n`);
    }

    return results;
  }

  /**
   * Test validation functionality
   */
  private static testValidation(): IdentificationTestResult[] {
    const results: IdentificationTestResult[] = [];

    // Test valid identification
    const validEmail = MOCK_WEALTHSIMPLE_EMAILS.stockBuy;
    
    try {
      const identification = EmailIdentificationService.extractIdentification(
        validEmail.subject,
        validEmail.from,
        validEmail.html,
        validEmail.text
      );

      const validation = EmailIdentificationService.validateIdentification(identification);

      results.push({
        testName: 'Validation - Valid Identification',
        success: validation.isValid,
        identification,
        errors: validation.errors,
        warnings: validation.warnings,
        performance: { extractionTime: 0 }
      });

      console.log(`${validation.isValid ? '✅' : '❌'} Validation - Valid Identification`);
      console.log(`   Errors: ${validation.errors.length}`);
      console.log(`   Warnings: ${validation.warnings.length}\n`);

    } catch (error) {
      results.push({
        testName: 'Validation - Error',
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        performance: { extractionTime: 0 }
      });

      console.log(`❌ Validation failed: ${error}\n`);
    }

    return results;
  }

  /**
   * Test edge cases
   */
  private static testEdgeCases(): IdentificationTestResult[] {
    const results: IdentificationTestResult[] = [];

    const edgeCases = [
      {
        name: 'Fractional Shares',
        email: EDGE_CASES.fractionalShares
      },
      {
        name: 'High Value Transaction',
        email: EDGE_CASES.highValue
      },
      {
        name: 'Foreign Currency',
        email: EDGE_CASES.foreignCurrency
      }
    ];

    for (const edgeCase of edgeCases) {
      const startTime = Date.now();
      
      try {
        const identification = EmailIdentificationService.extractIdentification(
          edgeCase.email.subject,
          edgeCase.email.from,
          edgeCase.email.html,
          edgeCase.email.text
        );

        const extractionTime = Date.now() - startTime;
        const validation = EmailIdentificationService.validateIdentification(identification);

        results.push({
          testName: `Edge Case - ${edgeCase.name}`,
          success: validation.isValid,
          identification,
          errors: validation.errors,
          warnings: validation.warnings,
          performance: { extractionTime }
        });

        console.log(`${validation.isValid ? '✅' : '⚠️'} Edge Case - ${edgeCase.name}`);
        console.log(`   Hash Generated: ${identification.emailHash ? 'Yes' : 'No'}`);
        console.log(`   Transaction Hash: ${identification.transactionHash ? 'Yes' : 'No'}`);
        console.log(`   Order IDs Found: ${identification.orderIds.length}`);
        console.log(`   Extraction Time: ${extractionTime}ms\n`);

      } catch (error) {
        results.push({
          testName: `Edge Case - ${edgeCase.name}`,
          success: false,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          warnings: [],
          performance: { extractionTime: Date.now() - startTime }
        });

        console.log(`❌ Edge Case - ${edgeCase.name}: ${error}\n`);
      }
    }

    return results;
  }

  /**
   * Test with invalid emails
   */
  static testInvalidEmails(): IdentificationTestResult[] {
    const results: IdentificationTestResult[] = [];

    console.log('🧪 Testing Invalid Emails...\n');

    const invalidEmails = [
      {
        name: 'Non-Wealthsimple Email',
        email: INVALID_EMAILS.nonWealthsimple
      },
      {
        name: 'Non-Transaction Email',
        email: INVALID_EMAILS.nonTransaction
      }
    ];

    for (const invalidEmail of invalidEmails) {
      const startTime = Date.now();
      
      try {
        const identification = EmailIdentificationService.extractIdentification(
          invalidEmail.email.subject,
          invalidEmail.email.from,
          invalidEmail.email.html,
          invalidEmail.email.text
        );

        const extractionTime = Date.now() - startTime;

        // For invalid emails, we should still be able to extract identification
        // but validation may show warnings
        const validation = EmailIdentificationService.validateIdentification(identification);

        results.push({
          testName: `Invalid Email - ${invalidEmail.name}`,
          success: true, // Success means extraction didn't crash
          identification,
          errors: validation.errors,
          warnings: validation.warnings,
          performance: { extractionTime }
        });

        console.log(`✅ Invalid Email - ${invalidEmail.name}`);
        console.log(`   Extraction completed without error`);
        console.log(`   Warnings: ${validation.warnings.length}\n`);

      } catch (error) {
        results.push({
          testName: `Invalid Email - ${invalidEmail.name}`,
          success: false,
          errors: [error instanceof Error ? error.message : 'Unknown error'],
          warnings: [],
          performance: { extractionTime: Date.now() - startTime }
        });

        console.log(`❌ Invalid Email - ${invalidEmail.name}: ${error}\n`);
      }
    }

    return results;
  }

  /**
   * Performance test
   */
  static performanceTest(): IdentificationTestResult {
    console.log('🏃 Running Performance Test...\n');

    const testEmail = MOCK_WEALTHSIMPLE_EMAILS.stockBuy;
    const iterations = 100;
    const startTime = Date.now();

    try {
      for (let i = 0; i < iterations; i++) {
        EmailIdentificationService.extractIdentification(
          testEmail.subject,
          testEmail.from,
          testEmail.html,
          testEmail.text
        );
      }

      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / iterations;

      console.log(`✅ Performance Test Completed`);
      console.log(`   Iterations: ${iterations}`);
      console.log(`   Total Time: ${totalTime}ms`);
      console.log(`   Average Time: ${averageTime.toFixed(2)}ms per extraction\n`);

      return {
        testName: 'Performance Test',
        success: true,
        errors: [],
        warnings: averageTime > 50 ? ['Average extraction time exceeds 50ms'] : [],
        performance: { extractionTime: averageTime }
      };

    } catch (error) {
      return {
        testName: 'Performance Test',
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        performance: { extractionTime: 0 }
      };
    }
  }

  /**
   * Print test summary
   */
  private static printTestSummary(results: IdentificationTestResult[]): void {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    const averageTime = results.reduce((sum, r) => sum + r.performance.extractionTime, 0) / results.length;

    console.log('📊 Email Identification Test Summary');
    console.log('═'.repeat(50));
    console.log(`Total Tests: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Total Warnings: ${totalWarnings}`);
    console.log(`Average Extraction Time: ${averageTime.toFixed(2)}ms`);
    console.log('═'.repeat(50));

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
  }

  /**
   * Create test duplicate detection data
   */
  static createTestDuplicateData(): DuplicateDetectionData {
    const testEmail = MOCK_WEALTHSIMPLE_EMAILS.stockBuy;
    
    const identification = EmailIdentificationService.extractIdentification(
      testEmail.subject,
      testEmail.from,
      testEmail.html,
      testEmail.text
    );

    return EmailIdentificationService.createDuplicateDetectionData(
      identification,
      {
        symbol: 'AAPL',
        transactionType: 'buy',
        quantity: 100,
        price: 150.25,
        transactionDate: '2025-01-15'
      }
    );
  }
}

export default EmailIdentificationTestSuite;