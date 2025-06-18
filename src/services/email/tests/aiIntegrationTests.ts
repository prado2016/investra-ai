/**
 * AI Symbol Processing Integration Tests
 * Tests the integration between email parsing and AI symbol processing
 */

import { EnhancedEmailSymbolParser } from '../enhancedEmailSymbolParser';
import { WealthsimpleEmailParser, type WealthsimpleEmailData } from '../wealthsimpleEmailParser';

// Minimal mock data for testing - production builds exclude test files
const MOCK_WEALTHSIMPLE_EMAILS = {
  stockBuy: {
    subject: "Trade Confirmation - AAPL Purchase",
    from: "notifications@wealthsimple.com",
    html: "<p>Bought 100 shares of AAPL at $150.25</p>",
    text: "Bought 100 shares of AAPL at $150.25"
  }
};

export interface AIIntegrationTestResult {
  name: string;
  passed: boolean;
  emailSymbol: string;
  aiEnhancedSymbol?: string;
  confidence: number;
  source: string;
  assetType: string;
  error?: string;
}

export class AISymbolIntegrationTests {
  /**
   * Run all AI integration tests
   */
  static async runAllTests(): Promise<AIIntegrationTestResult[]> {
    const results: AIIntegrationTestResult[] = [];

    console.log('🤖 Running AI Symbol Processing Integration Tests...\n');

    // Test with mock email data
    for (const [name, emailData] of Object.entries(MOCK_WEALTHSIMPLE_EMAILS)) {
      const testResult = await this.testEmailSymbolIntegration(name, emailData);
      results.push(testResult);
    }

    // Test specific AI enhancement scenarios
    results.push(...await this.testSpecificScenarios());

    this.printTestSummary(results);
    return results;
  }

  /**
   * Test AI symbol processing with email data
   */
  private static async testEmailSymbolIntegration(
    testName: string,
    emailData: unknown
  ): Promise<AIIntegrationTestResult> {
    try {
      const email = emailData as { subject: string; from: string; html: string; text: string };
      
      // First parse the email
      const parseResult = WealthsimpleEmailParser.parseEmail(
        email.subject,
        email.from,
        email.html,
        email.text
      );

      if (!parseResult.success || !parseResult.data) {
        return {
          name: testName,
          passed: false,
          emailSymbol: 'PARSE_FAILED',
          confidence: 0,
          source: 'error',
          assetType: 'stock',
          error: `Email parsing failed: ${parseResult.error}`
        };
      }

      // Then process with AI enhancement
      const aiResult = await EnhancedEmailSymbolParser.processEmailSymbol(parseResult.data);
      
      const validation = EnhancedEmailSymbolParser.validateSymbolResult(aiResult);
      
      console.log(`  ${validation.isValid ? '✅' : '❌'} ${testName}: ${parseResult.data.symbol} -> ${aiResult.normalizedSymbol} (${aiResult.source}, confidence: ${aiResult.confidence.toFixed(2)})`);

      return {
        name: testName,
        passed: validation.isValid,
        emailSymbol: parseResult.data.symbol,
        aiEnhancedSymbol: aiResult.normalizedSymbol,
        confidence: aiResult.confidence,
        source: aiResult.source,
        assetType: aiResult.assetType,
        error: validation.isValid ? undefined : validation.errors.join(', ')
      };

    } catch (error) {
      console.log(`  ❌ ${testName}: Exception - ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      return {
        name: testName,
        passed: false,
        emailSymbol: 'EXCEPTION',
        confidence: 0,
        source: 'error',
        assetType: 'stock',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test specific AI enhancement scenarios
   */
  private static async testSpecificScenarios(): Promise<AIIntegrationTestResult[]> {
    const results: AIIntegrationTestResult[] = [];

    console.log('\n🎯 Testing Specific AI Enhancement Scenarios:');

    const scenarios = [
      {
        name: 'Option Symbol Enhancement',
        emailData: {
          symbol: 'NVDA MAY 30 $108 CALL',
          transactionType: 'option_expired' as const,
          quantity: 1,
          price: 0,
          totalAmount: 0,
          accountType: 'Cash',
          transactionDate: '2025-05-30',
          timezone: 'EST',
          currency: 'USD',
          subject: 'Option Expiration',
          fromEmail: 'notifications@wealthsimple.com',
          rawContent: 'Option expired',
          confidence: 0.8,
          parseMethod: 'HTML'
        },
        expectedEnhancement: true
      },
      {
        name: 'Simple Stock Symbol',
        emailData: {
          symbol: 'AAPL',
          transactionType: 'buy' as const,
          quantity: 100,
          price: 150,
          totalAmount: 15000,
          accountType: 'TFSA',
          transactionDate: '2025-01-15',
          timezone: 'EST',
          currency: 'USD',
          subject: 'Trade Confirmation',
          fromEmail: 'notifications@wealthsimple.com',
          rawContent: 'Stock purchase',
          confidence: 0.95,
          parseMethod: 'HTML'
        },
        expectedEnhancement: false
      },
      {
        name: 'Canadian Stock Symbol',
        emailData: {
          symbol: 'CNR.TO',
          transactionType: 'buy' as const,
          quantity: 75,
          price: 165.50,
          totalAmount: 12412.50,
          accountType: 'RRSP',
          transactionDate: '2025-01-15',
          timezone: 'EST',
          currency: 'CAD',
          subject: 'Trade Confirmation',
          fromEmail: 'notifications@wealthsimple.com',
          rawContent: 'Canadian stock purchase',
          confidence: 0.9,
          parseMethod: 'HTML'
        },
        expectedEnhancement: false
      },
      {
        name: 'Low Confidence Symbol',
        emailData: {
          symbol: 'COMPLEX_SYMBOL_123',
          transactionType: 'buy' as const,
          quantity: 10,
          price: 50,
          totalAmount: 500,
          accountType: 'Margin',
          transactionDate: '2025-01-15',
          timezone: 'EST',
          currency: 'USD',
          subject: 'Trade Confirmation',
          fromEmail: 'notifications@wealthsimple.com',
          rawContent: 'Complex symbol purchase',
          confidence: 0.4, // Low confidence triggers AI enhancement
          parseMethod: 'TEXT'
        },
        expectedEnhancement: true
      }
    ];

    for (const scenario of scenarios) {
      try {
        const aiResult = await EnhancedEmailSymbolParser.processEmailSymbol(scenario.emailData);
        const validation = EnhancedEmailSymbolParser.validateSymbolResult(aiResult);
        
        const wasEnhanced = aiResult.source !== 'email-direct';
        const enhancementCorrect = wasEnhanced === scenario.expectedEnhancement;
        
        const passed = validation.isValid && enhancementCorrect;
        
        console.log(`  ${passed ? '✅' : '❌'} ${scenario.name}: ${scenario.emailData.symbol} -> ${aiResult.normalizedSymbol} (${aiResult.source}${enhancementCorrect ? '' : ' - unexpected enhancement'})`);

        results.push({
          name: scenario.name,
          passed,
          emailSymbol: scenario.emailData.symbol,
          aiEnhancedSymbol: aiResult.normalizedSymbol,
          confidence: aiResult.confidence,
          source: aiResult.source,
          assetType: aiResult.assetType,
          error: passed ? undefined : `Enhancement expectation failed or validation errors: ${validation.errors.join(', ')}`
        });

      } catch (error) {
        console.log(`  ❌ ${scenario.name}: Exception - ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        results.push({
          name: scenario.name,
          passed: false,
          emailSymbol: scenario.emailData.symbol,
          confidence: 0,
          source: 'error',
          assetType: 'stock',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Test batch symbol processing
   */
  static async testBatchProcessing(): Promise<void> {
    console.log('\n📦 Testing Batch Symbol Processing...');

    try {
      // Create multiple email data entries
      const emailDataArray = Object.values(MOCK_WEALTHSIMPLE_EMAILS).map(email => {
        const parseResult = WealthsimpleEmailParser.parseEmail(
          email.subject,
          email.from,
          email.html,
          email.text
        );
        return parseResult.data;
      }).filter(Boolean);

      const startTime = Date.now();
      const batchResults = await EnhancedEmailSymbolParser.processBatchSymbols(emailDataArray as WealthsimpleEmailData[]);
      const endTime = Date.now();

      const stats = EnhancedEmailSymbolParser.getProcessingStats(batchResults);
      
      console.log(`✅ Batch processing completed in ${endTime - startTime}ms`);
      console.log(`📊 Processed ${stats.total} symbols:`);
      console.log(`   Direct: ${stats.directSymbols}`);
      console.log(`   AI Enhanced: ${stats.aiEnhanced}`);
      console.log(`   AI Fallback: ${stats.aiFallback}`);
      console.log(`   Average Confidence: ${stats.averageConfidence.toFixed(2)}`);
      console.log(`   Asset Types:`, stats.assetTypeBreakdown);

    } catch (error) {
      console.log(`❌ Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Performance test for AI integration
   */
  static async performanceTest(iterations: number = 100): Promise<void> {
    console.log(`\n🏃 Running AI Integration Performance Test (${iterations} iterations)...`);

    const testEmailData = {
      symbol: 'AAPL',
      transactionType: 'buy' as const,
      quantity: 100,
      price: 150,
      totalAmount: 15000,
      accountType: 'TFSA',
      transactionDate: '2025-01-15',
      timezone: 'EST',
      currency: 'USD',
      subject: 'Trade Confirmation',
      fromEmail: 'notifications@wealthsimple.com',
      rawContent: 'Stock purchase',
      confidence: 0.9,
      parseMethod: 'HTML'
    };

    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      await EnhancedEmailSymbolParser.processEmailSymbol(testEmailData);
    }
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;

    console.log(`⏱️ Performance Results:`);
    console.log(`  Total Time: ${totalTime}ms`);
    console.log(`  Average Time per Process: ${avgTime.toFixed(2)}ms`);
    console.log(`  Symbols per Second: ${(1000 / avgTime).toFixed(0)}`);
  }

  /**
   * Print test summary
   */
  private static printTestSummary(results: AIIntegrationTestResult[]): void {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    console.log('\n📊 AI Integration Test Summary:');
    console.log(`  Total Tests: ${total}`);
    console.log(`  Passed: ${passed} ✅`);
    console.log(`  Failed: ${failed} ❌`);
    console.log(`  Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    // Source breakdown
    const sourceBreakdown = results.reduce((acc, r) => {
      acc[r.source] = (acc[r.source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log(`\n📈 Source Breakdown:`);
    Object.entries(sourceBreakdown).forEach(([source, count]) => {
      console.log(`  ${source}: ${count}`);
    });

    // Average confidence
    const validResults = results.filter(r => r.passed);
    const avgConfidence = validResults.length > 0 
      ? validResults.reduce((sum, r) => sum + r.confidence, 0) / validResults.length
      : 0;
    
    console.log(`\n🎯 Average Confidence: ${avgConfidence.toFixed(2)}`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    }

    console.log('');
  }
}

export default AISymbolIntegrationTests;
