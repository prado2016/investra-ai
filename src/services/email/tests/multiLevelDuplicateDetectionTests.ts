/**
 * Multi-Level Duplicate Detection Tests
 * Task 5.2: Test 3-level duplicate detection with confidence scoring
 */

import { MultiLevelDuplicateDetection, type DuplicateDetectionResult, type StoredEmailRecord } from '../multiLevelDuplicateDetection';
import { EmailIdentificationService } from '../emailIdentificationService';
import { MOCK_WEALTHSIMPLE_EMAILS, EDGE_CASES } from './mockWealthsimpleEmails';
import type { WealthsimpleEmailData } from '../wealthsimpleEmailParser';

export interface DetectionTestResult {
  testName: string;
  success: boolean;
  result?: DuplicateDetectionResult;
  expectedOutcome: 'accept' | 'reject' | 'review';
  actualOutcome?: 'accept' | 'reject' | 'review';
  errors: string[];
  warnings: string[];
  performance: {
    detectionTime: number;
  };
}

/**
 * Multi-Level Duplicate Detection Test Suite
 */
export class MultiLevelDuplicateDetectionTestSuite {
  /**
   * Run all detection tests
   */
  static async runAllTests(): Promise<DetectionTestResult[]> {
    const results: DetectionTestResult[] = [];

    console.log('🧪 Running Multi-Level Duplicate Detection Tests...\n');

    // Test Level 1: Email Identity Detection
    results.push(...await this.testLevel1Detection());
    
    // Test Level 2: Order Identity Detection  
    results.push(...await this.testLevel2Detection());
    
    // Test Level 3: Transaction Fingerprint Detection
    results.push(...await this.testLevel3Detection());
    
    // Test Overall Algorithm
    results.push(...await this.testOverallAlgorithm());
    
    // Test Edge Cases
    results.push(...await this.testEdgeCases());

    // Print summary
    this.printTestSummary(results);

    return results;
  }

  /**
   * Test Level 1: Email Identity Detection
   */
  private static async testLevel1Detection(): Promise<DetectionTestResult[]> {
    const results: DetectionTestResult[] = [];
    
    console.log('📧 Testing Level 1: Email Identity Detection...');

    // Test Case 1: Identical emails (should be rejected)
    const identicalEmailTest = await this.runDetectionTest(
      'Level 1 - Identical Emails',
      MOCK_WEALTHSIMPLE_EMAILS.stockBuy,
      'reject',
      [this.createMockStoredRecord(MOCK_WEALTHSIMPLE_EMAILS.stockBuy, 'portfolio-1')]
    );
    results.push(identicalEmailTest);

    // Test Case 2: Different emails (should be accepted)
    const differentEmailTest = await this.runDetectionTest(
      'Level 1 - Different Emails',
      MOCK_WEALTHSIMPLE_EMAILS.stockBuy,
      'accept',
      [this.createMockStoredRecord(MOCK_WEALTHSIMPLE_EMAILS.stockSell, 'portfolio-1')]
    );
    results.push(differentEmailTest);

    return results;
  }

  /**
   * Test Level 2: Order Identity Detection
   */
  private static async testLevel2Detection(): Promise<DetectionTestResult[]> {
    const results: DetectionTestResult[] = [];
    
    console.log('🔢 Testing Level 2: Order Identity Detection...');

    // Create modified email with same order ID but different content
    const emailWithSameOrderId = {
      ...MOCK_WEALTHSIMPLE_EMAILS.stockBuy,
      html: MOCK_WEALTHSIMPLE_EMAILS.stockBuy.html.replace('$150.25', '$155.00'), // Different price
      subject: 'Trade Confirmation - AAPL Purchase (Updated)'
    };

    const sameOrderIdTest = await this.runDetectionTest(
      'Level 2 - Same Order ID',
      emailWithSameOrderId,
      'review', // Should be flagged for review
      [this.createMockStoredRecord(MOCK_WEALTHSIMPLE_EMAILS.stockBuy, 'portfolio-1')]
    );
    results.push(sameOrderIdTest);

    return results;
  }

  /**
   * Test Level 3: Transaction Fingerprint Detection
   */
  private static async testLevel3Detection(): Promise<DetectionTestResult[]> {
    const results: DetectionTestResult[] = [];
    
    console.log('🔍 Testing Level 3: Transaction Fingerprint Detection...');

    // Create similar transaction (same symbol, quantity, price, similar time)
    const similarTransactionEmail = {
      ...MOCK_WEALTHSIMPLE_EMAILS.stockBuy,
      subject: 'Trade Confirmation - AAPL Purchase #2',
      html: MOCK_WEALTHSIMPLE_EMAILS.stockBuy.html.replace('WS123456789', 'WS987654321'), // Different order ID
      text: MOCK_WEALTHSIMPLE_EMAILS.stockBuy.text.replace('WS123456789', 'WS987654321')
    };

    const similarTransactionTest = await this.runDetectionTest(
      'Level 3 - Similar Transaction',
      similarTransactionEmail,
      'review', // Should be flagged for review due to similarity
      [this.createMockStoredRecord(MOCK_WEALTHSIMPLE_EMAILS.stockBuy, 'portfolio-1')]
    );
    results.push(similarTransactionTest);

    return results;
  }

  /**
   * Test overall algorithm with various scenarios
   */
  private static async testOverallAlgorithm(): Promise<DetectionTestResult[]> {
    const results: DetectionTestResult[] = [];
    
    console.log('🎯 Testing Overall Algorithm...');

    // Test Case 1: No existing records (should accept)
    const noRecordsTest = await this.runDetectionTest(
      'Overall - No Existing Records',
      MOCK_WEALTHSIMPLE_EMAILS.stockBuy,
      'accept',
      []
    );
    results.push(noRecordsTest);

    // Test Case 2: Multiple different records (should accept)
    const multipleDifferentTest = await this.runDetectionTest(
      'Overall - Multiple Different Records',
      MOCK_WEALTHSIMPLE_EMAILS.stockBuy,
      'accept',
      [
        this.createMockStoredRecord(MOCK_WEALTHSIMPLE_EMAILS.stockSell, 'portfolio-1'),
        this.createMockStoredRecord(MOCK_WEALTHSIMPLE_EMAILS.canadianStock, 'portfolio-1'),
        this.createMockStoredRecord(MOCK_WEALTHSIMPLE_EMAILS.etfPurchase, 'portfolio-1')
      ]
    );
    results.push(multipleDifferentTest);

    return results;
  }

  /**
   * Test edge cases
   */
  private static async testEdgeCases(): Promise<DetectionTestResult[]> {
    const results: DetectionTestResult[] = [];
    
    console.log('⚡ Testing Edge Cases...');

    // Test fractional shares
    const fractionalTest = await this.runDetectionTest(
      'Edge Case - Fractional Shares',
      this.convertMockToEmailData(EDGE_CASES.fractionalShares),
      'accept',
      []
    );
    results.push(fractionalTest);

    // Test high value transaction
    const highValueTest = await this.runDetectionTest(
      'Edge Case - High Value Transaction',
      this.convertMockToEmailData(EDGE_CASES.highValue),
      'accept',
      []
    );
    results.push(highValueTest);

    return results;
  }

  /**
   * Run a single detection test
   */
  private static async runDetectionTest(
    testName: string,
    emailData: WealthsimpleEmailData,
    expectedOutcome: 'accept' | 'reject' | 'review',
    storedRecords: StoredEmailRecord[] = []
  ): Promise<DetectionTestResult> {
    const startTime = Date.now();
    
    try {
      // Mock the getStoredEmailRecords method by temporarily replacing it
      const originalMethod = (MultiLevelDuplicateDetection as any).getStoredEmailRecords;
      (MultiLevelDuplicateDetection as any).getStoredEmailRecords = async () => storedRecords;

      const result = await MultiLevelDuplicateDetection.detectDuplicates(
        emailData,
        'test-portfolio-id'
      );

      // Restore original method
      (MultiLevelDuplicateDetection as any).getStoredEmailRecords = originalMethod;

      const detectionTime = Date.now() - startTime;
      const validation = MultiLevelDuplicateDetection.validateDetectionResult(result);

      const success = result.recommendation === expectedOutcome;

      console.log(`${success ? '✅' : '❌'} ${testName}`);
      console.log(`   Expected: ${expectedOutcome.toUpperCase()}, Got: ${result.recommendation.toUpperCase()}`);
      console.log(`   Confidence: ${(result.overallConfidence * 100).toFixed(1)}%`);
      console.log(`   Risk Level: ${result.riskLevel}`);
      console.log(`   Matches: ${result.matches.length}`);
      console.log(`   Detection Time: ${detectionTime}ms`);
      if (result.matches.length > 0) {
        console.log(`   Match Details: ${result.matches.map(m => `L${m.level.level}(${(m.confidence * 100).toFixed(1)}%)`).join(', ')}`);
      }
      console.log(`   Summary: ${result.summary}\n`);

      return {
        testName,
        success,
        result,
        expectedOutcome,
        actualOutcome: result.recommendation,
        errors: validation.errors,
        warnings: validation.warnings,
        performance: { detectionTime }
      };

    } catch (error) {
      const detectionTime = Date.now() - startTime;
      
      console.log(`❌ ${testName}: ${error}\n`);

      return {
        testName,
        success: false,
        expectedOutcome,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        performance: { detectionTime }
      };
    }
  }

  /**
   * Create mock stored email record
   */
  private static createMockStoredRecord(
    mockEmail: { subject: string; from: string; html: string; text: string },
    portfolioId: string
  ): StoredEmailRecord {
    const emailData = this.convertMockToEmailData(mockEmail);
    const identification = EmailIdentificationService.extractIdentification(
      emailData.subject,
      emailData.fromEmail,
      emailData.rawContent
    );

    return {
      id: `record-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      identification,
      emailData,
      portfolioId,
      createdAt: new Date().toISOString()
    };
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
    // Basic parsing to extract data for testing
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
   * Performance test
   */
  static async performanceTest(): Promise<DetectionTestResult> {
    console.log('🏃 Running Performance Test...\n');

    const testEmail = this.convertMockToEmailData(MOCK_WEALTHSIMPLE_EMAILS.stockBuy);
    const iterations = 50;
    const startTime = Date.now();

    try {
      const results: DuplicateDetectionResult[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const result = await MultiLevelDuplicateDetection.detectDuplicates(
          testEmail,
          'test-portfolio-id'
        );
        results.push(result);
      }

      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / iterations;
      const averageProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / iterations;

      console.log(`✅ Performance Test Completed`);
      console.log(`   Iterations: ${iterations}`);
      console.log(`   Total Time: ${totalTime}ms`);
      console.log(`   Average Time: ${averageTime.toFixed(2)}ms per detection`);
      console.log(`   Average Processing Time: ${averageProcessingTime.toFixed(2)}ms per detection\n`);

      return {
        testName: 'Performance Test',
        success: true,
        expectedOutcome: 'accept',
        actualOutcome: 'accept',
        errors: [],
        warnings: averageTime > 100 ? ['Average detection time exceeds 100ms'] : [],
        performance: { detectionTime: averageTime }
      };

    } catch (error) {
      return {
        testName: 'Performance Test',
        success: false,
        expectedOutcome: 'accept',
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: [],
        performance: { detectionTime: 0 }
      };
    }
  }

  /**
   * Test confidence scoring accuracy
   */
  static async testConfidenceScoring(): Promise<DetectionTestResult[]> {
    const results: DetectionTestResult[] = [];
    
    console.log('📊 Testing Confidence Scoring...\n');

    // Test high confidence scenario (identical email)
    const highConfidenceTest = await this.runDetectionTest(
      'Confidence - High (Identical Email)',
      this.convertMockToEmailData(MOCK_WEALTHSIMPLE_EMAILS.stockBuy),
      'reject',
      [this.createMockStoredRecord(MOCK_WEALTHSIMPLE_EMAILS.stockBuy, 'portfolio-1')]
    );
    results.push(highConfidenceTest);

    // Test medium confidence scenario (similar transaction)
    const mediumConfidenceTest = await this.runDetectionTest(
      'Confidence - Medium (Similar Transaction)',
      this.convertMockToEmailData({
        ...MOCK_WEALTHSIMPLE_EMAILS.stockBuy,
        html: MOCK_WEALTHSIMPLE_EMAILS.stockBuy.html.replace('WS123456789', 'WS999888777')
      }),
      'review',
      [this.createMockStoredRecord(MOCK_WEALTHSIMPLE_EMAILS.stockBuy, 'portfolio-1')]
    );
    results.push(mediumConfidenceTest);

    // Test low confidence scenario (different transaction)
    const lowConfidenceTest = await this.runDetectionTest(
      'Confidence - Low (Different Transaction)',
      this.convertMockToEmailData(MOCK_WEALTHSIMPLE_EMAILS.stockBuy),
      'accept',
      [this.createMockStoredRecord(MOCK_WEALTHSIMPLE_EMAILS.stockSell, 'portfolio-1')]
    );
    results.push(lowConfidenceTest);

    return results;
  }

  /**
   * Print test summary
   */
  private static printTestSummary(results: DetectionTestResult[]): void {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    const averageTime = results.reduce((sum, r) => sum + r.performance.detectionTime, 0) / results.length;

    console.log('📊 Multi-Level Duplicate Detection Test Summary');
    console.log('═'.repeat(60));
    console.log(`Total Tests: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Total Warnings: ${totalWarnings}`);
    console.log(`Average Detection Time: ${averageTime.toFixed(2)}ms`);
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

    // Success rate breakdown
    const acceptTests = results.filter(r => r.expectedOutcome === 'accept');
    const rejectTests = results.filter(r => r.expectedOutcome === 'reject');
    const reviewTests = results.filter(r => r.expectedOutcome === 'review');

    console.log('\n📈 Accuracy by Category:');
    if (acceptTests.length > 0) {
      const acceptAccuracy = acceptTests.filter(r => r.success).length / acceptTests.length * 100;
      console.log(`   Accept: ${acceptAccuracy.toFixed(1)}% (${acceptTests.filter(r => r.success).length}/${acceptTests.length})`);
    }
    if (rejectTests.length > 0) {
      const rejectAccuracy = rejectTests.filter(r => r.success).length / rejectTests.length * 100;
      console.log(`   Reject: ${rejectAccuracy.toFixed(1)}% (${rejectTests.filter(r => r.success).length}/${rejectTests.length})`);
    }
    if (reviewTests.length > 0) {
      const reviewAccuracy = reviewTests.filter(r => r.success).length / reviewTests.length * 100;
      console.log(`   Review: ${reviewAccuracy.toFixed(1)}% (${reviewTests.filter(r => r.success).length}/${reviewTests.length})`);
    }
  }
}

export default MultiLevelDuplicateDetectionTestSuite;