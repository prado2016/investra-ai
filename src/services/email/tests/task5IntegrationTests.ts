/**
 * Task 5 Integration Tests
 * Complete integration test for Email Duplicate Detection System
 */

import { EmailIdentificationService } from '../emailIdentificationService';
import { MultiLevelDuplicateDetection } from '../multiLevelDuplicateDetection';
import { TimeWindowProcessing } from '../timeWindowProcessing';
import { ManualReviewQueue } from '../manualReviewQueue';
import { MOCK_WEALTHSIMPLE_EMAILS } from './mockWealthsimpleEmails';
import type { WealthsimpleEmailData } from '../wealthsimpleEmailParser';

export interface IntegrationTestResult {
  testName: string;
  success: boolean;
  components: {
    identification: boolean;
    duplicateDetection: boolean;
    timeWindow: boolean;
    reviewQueue: boolean;
  };
  performance: {
    totalTime: number;
    componentTimes: {
      identification: number;
      duplicateDetection: number;
      timeWindow: number;
      reviewQueue: number;
    };
  };
  errors: string[];
  warnings: string[];
}

/**
 * Task 5 Integration Test Suite
 */
export class Task5IntegrationTestSuite {
  /**
   * Run complete integration test
   */
  static async runIntegrationTest(): Promise<IntegrationTestResult> {
    console.log('🔗 Running Task 5 Complete Integration Test...\n');

    const startTime = Date.now();
    const componentTimes = {
      identification: 0,
      duplicateDetection: 0,
      timeWindow: 0,
      reviewQueue: 0
    };
    const components = {
      identification: false,
      duplicateDetection: false,
      timeWindow: false,
      reviewQueue: false
    };
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Clear the queue before testing
      ManualReviewQueue.clearQueue();

      // Convert mock email to proper format
      const emailData = this.convertMockToEmailData(MOCK_WEALTHSIMPLE_EMAILS.stockBuy);
      console.log('📧 Processing email:', emailData.symbol, emailData.transactionType, `$${emailData.price}`);

      // Step 1: Email Identification (Task 5.1)
      console.log('\n1️⃣ Testing Email Identification Service...');
      const identificationStart = Date.now();
      
      const identification = EmailIdentificationService.extractIdentification(
        emailData.subject,
        emailData.fromEmail,
        emailData.rawContent
      );
      
      componentTimes.identification = Date.now() - identificationStart;
      
      if (!identification.messageId || !identification.emailHash || identification.orderIds.length === 0) {
        errors.push('Email identification failed to extract required data');
      } else {
        components.identification = true;
        console.log(`✅ Identification completed (${componentTimes.identification}ms)`);
        console.log(`   Message ID: ${identification.messageId}`);
        console.log(`   Email Hash: ${identification.emailHash.substring(0, 16)}...`);
        console.log(`   Order IDs: ${identification.orderIds.join(', ')}`);
      }

      // Step 2: Multi-Level Duplicate Detection (Task 5.2)
      console.log('\n2️⃣ Testing Multi-Level Duplicate Detection...');
      const detectionStart = Date.now();
      
      const duplicateResult = await MultiLevelDuplicateDetection.detectDuplicates(
        emailData,
        'integration-test-portfolio'
      );
      
      componentTimes.duplicateDetection = Date.now() - detectionStart;
      
      if (!duplicateResult || typeof duplicateResult.overallConfidence !== 'number') {
        errors.push('Duplicate detection failed to return valid result');
      } else {
        components.duplicateDetection = true;
        console.log(`✅ Duplicate detection completed (${componentTimes.duplicateDetection}ms)`);
        console.log(`   Recommendation: ${duplicateResult.recommendation.toUpperCase()}`);
        console.log(`   Confidence: ${(duplicateResult.overallConfidence * 100).toFixed(1)}%`);
        console.log(`   Risk Level: ${duplicateResult.riskLevel}`);
        console.log(`   Matches Found: ${duplicateResult.matches.length}`);
      }

      // Step 3: Time Window Processing (Task 5.3)
      console.log('\n3️⃣ Testing Time Window Processing...');
      const timeWindowStart = Date.now();
      
      // Create a second email for time window comparison
      const email2Data = {
        ...emailData,
        transactionDate: '2025-01-15T14:31:00Z', // 1 minute later
        subject: 'Trade Confirmation - AAPL Purchase #2'
      };
      
      const timeWindowAnalysis = TimeWindowProcessing.analyzeTimeWindows(
        emailData,
        email2Data
      );
      
      componentTimes.timeWindow = Date.now() - timeWindowStart;
      
      if (!timeWindowAnalysis || typeof timeWindowAnalysis.timeDifferenceMs !== 'number') {
        errors.push('Time window processing failed to return valid result');
      } else {
        components.timeWindow = true;
        console.log(`✅ Time window analysis completed (${componentTimes.timeWindow}ms)`);
        console.log(`   Time Difference: ${timeWindowAnalysis.timeDifferenceFormatted}`);
        console.log(`   Duplicate Risk: ${timeWindowAnalysis.duplicateRisk}`);
        console.log(`   Market Session: ${timeWindowAnalysis.marketContext.marketSession}`);
        console.log(`   Same Minute: ${timeWindowAnalysis.withinWindows.sameMinute}`);
      }

      // Step 4: Manual Review Queue (Task 5.4)
      console.log('\n4️⃣ Testing Manual Review Queue...');
      const queueStart = Date.now();
      
      // Add item to queue (simulating a case that needs review)
      const queueItem = await ManualReviewQueue.addToQueue(
        emailData,
        identification,
        duplicateResult,
        'integration-test-portfolio',
        timeWindowAnalysis
      );
      
      componentTimes.reviewQueue = Date.now() - queueStart;
      
      if (!queueItem || !queueItem.id) {
        errors.push('Manual review queue failed to add item');
      } else {
        components.reviewQueue = true;
        console.log(`✅ Manual review queue completed (${componentTimes.reviewQueue}ms)`);
        console.log(`   Queue Item ID: ${queueItem.id}`);
        console.log(`   Priority: ${queueItem.priority}`);
        console.log(`   Risk Score: ${queueItem.riskScore.toFixed(2)}`);
        console.log(`   Tags: ${queueItem.tags.slice(0, 3).join(', ')}${queueItem.tags.length > 3 ? '...' : ''}`);

        // Test queue operations
        const queueStats = ManualReviewQueue.getQueueStats();
        console.log(`   Queue Total: ${queueStats.total} items`);
      }

      // Step 5: Complete Workflow Test
      console.log('\n5️⃣ Testing Complete Workflow...');
      
      if (components.identification && components.duplicateDetection && 
          components.timeWindow && components.reviewQueue) {
        
        // Test rapid trading detection
        const emails = [emailData, email2Data];
        const rapidTradingPattern = TimeWindowProcessing.detectRapidTradingPattern(
          emails,
          emailData.symbol,
          60 * 1000 // 1 minute window
        );
        
        console.log(`✅ Rapid trading analysis: ${rapidTradingPattern.isRapidTrading ? 'DETECTED' : 'Not detected'}`);
        
        // Test partial fill analysis
        const partialFillAnalysis = TimeWindowProcessing.analyzePartialFills(
          emails,
          emailData.symbol,
          emailData.quantity * 2 // Target quantity for partial fill detection
        );
        
        console.log(`✅ Partial fill analysis: ${partialFillAnalysis.isPotentialPartialFill ? 'POTENTIAL' : 'Not detected'}`);
        
        console.log('\n🎉 Complete workflow integration test PASSED!');
      } else {
        errors.push('One or more components failed, workflow integration incomplete');
      }

    } catch (error) {
      errors.push(`Integration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const totalTime = Date.now() - startTime;
    const success = errors.length === 0 && Object.values(components).every(c => c);

    // Generate warnings for performance
    if (totalTime > 500) {
      warnings.push('Total integration time exceeds 500ms');
    }
    
    if (componentTimes.duplicateDetection > 100) {
      warnings.push('Duplicate detection time exceeds 100ms');
    }

    // Print summary
    console.log('\n📊 Integration Test Summary');
    console.log('═'.repeat(50));
    console.log(`Status: ${success ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`Total Time: ${totalTime}ms`);
    console.log(`Components: ${Object.values(components).filter(c => c).length}/4 successful`);
    console.log(`Errors: ${errors.length}`);
    console.log(`Warnings: ${warnings.length}`);
    console.log('═'.repeat(50));

    if (errors.length > 0) {
      console.log('\n❌ Errors:');
      errors.forEach(error => console.log(`   • ${error}`));
    }

    if (warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      warnings.forEach(warning => console.log(`   • ${warning}`));
    }

    console.log('\n🔧 Performance Breakdown:');
    console.log(`   Email Identification: ${componentTimes.identification}ms`);
    console.log(`   Duplicate Detection: ${componentTimes.duplicateDetection}ms`);
    console.log(`   Time Window Processing: ${componentTimes.timeWindow}ms`);
    console.log(`   Manual Review Queue: ${componentTimes.reviewQueue}ms`);

    return {
      testName: 'Task 5 Complete Integration Test',
      success,
      components,
      performance: {
        totalTime,
        componentTimes
      },
      errors,
      warnings
    };
  }

  /**
   * Run stress test with multiple emails
   */
  static async runStressTest(): Promise<IntegrationTestResult> {
    console.log('\n💪 Running Task 5 Stress Test...\n');

    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const emailCount = 10;

    try {
      ManualReviewQueue.clearQueue();

      console.log(`Processing ${emailCount} emails concurrently...`);

      // Process multiple emails concurrently
      const promises = [];
      for (let i = 0; i < emailCount; i++) {
        const emailData = this.convertMockToEmailData(MOCK_WEALTHSIMPLE_EMAILS.stockBuy);
        emailData.subject = `Trade Confirmation - Test ${i + 1}`;
        emailData.transactionDate = `2025-01-15T14:${30 + i}:00Z`;
        
        promises.push(this.processEmailCompletely(emailData, `stress-test-portfolio-${i % 3}`));
      }

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;

      const successfulResults = results.filter(r => r.success);
      const averageProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;

      console.log(`✅ Stress test completed: ${successfulResults.length}/${emailCount} emails processed successfully`);
      console.log(`Total time: ${totalTime}ms, Average per email: ${averageProcessingTime.toFixed(2)}ms`);

      const queueStats = ManualReviewQueue.getQueueStats();
      console.log(`Final queue size: ${queueStats.total} items`);

      if (successfulResults.length < emailCount) {
        warnings.push(`Only ${successfulResults.length}/${emailCount} emails processed successfully`);
      }

      if (averageProcessingTime > 50) {
        warnings.push('Average processing time per email exceeds 50ms');
      }

      return {
        testName: 'Task 5 Stress Test',
        success: successfulResults.length === emailCount,
        components: {
          identification: true,
          duplicateDetection: true,
          timeWindow: true,
          reviewQueue: true
        },
        performance: {
          totalTime,
          componentTimes: {
            identification: 0,
            duplicateDetection: 0,
            timeWindow: 0,
            reviewQueue: 0
          }
        },
        errors,
        warnings
      };

    } catch (error) {
      return {
        testName: 'Task 5 Stress Test',
        success: false,
        components: {
          identification: false,
          duplicateDetection: false,
          timeWindow: false,
          reviewQueue: false
        },
        performance: {
          totalTime: Date.now() - startTime,
          componentTimes: {
            identification: 0,
            duplicateDetection: 0,
            timeWindow: 0,
            reviewQueue: 0
          }
        },
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings
      };
    }
  }

  /**
   * Process a single email through all components
   */
  private static async processEmailCompletely(
    emailData: WealthsimpleEmailData,
    portfolioId: string
  ): Promise<{ success: boolean; processingTime: number }> {
    const startTime = Date.now();

    try {
      // Email identification
      const identification = EmailIdentificationService.extractIdentification(
        emailData.subject,
        emailData.fromEmail,
        emailData.rawContent
      );

      // Duplicate detection
      const duplicateResult = await MultiLevelDuplicateDetection.detectDuplicates(
        emailData,
        portfolioId
      );

      // Time window analysis (optional for single email)
      const timeWindowAnalysis = TimeWindowProcessing.analyzeTimeWindows(emailData, emailData);

      // Add to review queue if needed
      if (duplicateResult.recommendation === 'review') {
        await ManualReviewQueue.addToQueue(
          emailData,
          identification,
          duplicateResult,
          portfolioId,
          timeWindowAnalysis
        );
      }

      return {
        success: true,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        processingTime: Date.now() - startTime
      };
    }
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
    const symbol = mockEmail.html.match(/([A-Z]{1,5}(?:\.[A-Z]{2})?)/)?.[1] || 'AAPL';
    const quantity = parseFloat(mockEmail.html.match(/(\d+(?:\.\d+)?)\s*shares?/i)?.[1] || '10');
    const price = parseFloat(mockEmail.html.match(/\$(\d+(?:,\d{3})*(?:\.\d{2}))/)?.[1]?.replace(/,/g, '') || '150.25');
    
    return {
      symbol,
      transactionType: mockEmail.html.toLowerCase().includes('sold') ? 'sell' : 'buy',
      quantity,
      price,
      totalAmount: quantity * price,
      accountType: mockEmail.html.match(/(TFSA|RRSP|Margin|Cash)/i)?.[1] || 'TFSA',
      transactionDate: '2025-01-15T14:30:00Z',
      executionTime: '2:30 PM EST',
      timezone: 'EST',
      currency: 'USD',
      subject: mockEmail.subject,
      fromEmail: mockEmail.from,
      rawContent: mockEmail.html,
      confidence: 0.9,
      parseMethod: 'HTML_REGEX'
    };
  }
}

export default Task5IntegrationTestSuite;