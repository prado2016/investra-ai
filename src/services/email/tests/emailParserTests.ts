/**
 * Test suite for Wealthsimple Email Parser
 */

import { WealthsimpleEmailParser } from '../wealthsimpleEmailParser';
import { PortfolioMappingService } from '../portfolioMappingService';
import { AISymbolIntegrationTests } from './aiIntegrationTests';
import { MOCK_WEALTHSIMPLE_EMAILS, INVALID_EMAILS, EDGE_CASES } from './mockWealthsimpleEmails';

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  data?: unknown;
}

export class EmailParserTestSuite {
  static async runAllTests(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    console.log('🧪 Running Wealthsimple Email Parser Tests...\n');

    // Test valid emails
    results.push(...await this.testValidEmails());
    
    // Test invalid emails
    results.push(...this.testInvalidEmails());
    
    // Test edge cases
    results.push(...await this.testEdgeCases());
    
    // Test portfolio mapping
    results.push(...this.testPortfolioMapping());

    // Test AI integration - removing until implementation is complete
    // results.push(...await this.testAIIntegration());

    // Print summary
    this.printTestSummary(results);

    return results;
  }

  private static async testValidEmails(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    console.log('📧 Testing Valid Wealthsimple Emails:');

    for (const [name, email] of Object.entries(MOCK_WEALTHSIMPLE_EMAILS)) {
      try {
        const result = WealthsimpleEmailParser.parseEmail(
          email.subject,
          email.from,
          email.html,
          email.text
        );

        if (result.success && result.data) {
          const validation = WealthsimpleEmailParser.validateParsedData(result.data);
          
          results.push({
            name: `Valid Email - ${name}`,
            passed: validation.isValid,
            error: validation.errors.join(', ') || undefined,
            data: {
              symbol: result.data.symbol,
              type: result.data.transactionType,
              quantity: result.data.quantity,
              price: result.data.price,
              accountType: result.data.accountType,
              confidence: result.data.confidence
            }
          });

          console.log(`  ✅ ${name}: ${result.data.symbol} ${result.data.transactionType} ${result.data.quantity} @ $${result.data.price} (confidence: ${result.data.confidence.toFixed(2)})`);
        } else {
          results.push({
            name: `Valid Email - ${name}`,
            passed: false,
            error: result.error
          });
          console.log(`  ❌ ${name}: ${result.error}`);
        }
      } catch (error) {
        results.push({
          name: `Valid Email - ${name}`,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log(`  ❌ ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('');
    return results;
  }

  private static testInvalidEmails(): TestResult[] {
    const results: TestResult[] = [];

    console.log('🚫 Testing Invalid Emails:');

    for (const [name, email] of Object.entries(INVALID_EMAILS)) {
      try {
        const result = WealthsimpleEmailParser.parseEmail(
          email.subject,
          email.from,
          email.html,
          email.text
        );

        const shouldFail = true;
        const actuallyFailed = !result.success;

        results.push({
          name: `Invalid Email - ${name}`,
          passed: shouldFail === actuallyFailed,
          error: shouldFail && actuallyFailed ? undefined : `Expected failure but got: ${result.success ? 'success' : 'failure'}`
        });

        if (shouldFail === actuallyFailed) {
          console.log(`  ✅ ${name}: Correctly rejected`);
        } else {
          console.log(`  ❌ ${name}: Should have been rejected but was accepted`);
        }
      } catch {
        results.push({
          name: `Invalid Email - ${name}`,
          passed: true, // Exceptions are expected for invalid emails
          error: undefined
        });
        console.log(`  ✅ ${name}: Correctly threw exception`);
      }
    }

    console.log('');
    return results;
  }

  private static async testEdgeCases(): Promise<TestResult[]> {
    const results: TestResult[] = [];

    console.log('🔍 Testing Edge Cases:');

    for (const [name, email] of Object.entries(EDGE_CASES)) {
      try {
        const result = WealthsimpleEmailParser.parseEmail(
          email.subject,
          email.from,
          email.html,
          email.text
        );

        if (result.success && result.data) {
          const validation = WealthsimpleEmailParser.validateParsedData(result.data);
          
          results.push({
            name: `Edge Case - ${name}`,
            passed: validation.isValid,
            error: validation.errors.join(', ') || undefined,
            data: {
              symbol: result.data.symbol,
              type: result.data.transactionType,
              quantity: result.data.quantity,
              price: result.data.price,
              confidence: result.data.confidence
            }
          });

          console.log(`  ✅ ${name}: ${result.data.symbol} ${result.data.transactionType} ${result.data.quantity} (confidence: ${result.data.confidence.toFixed(2)})`);
        } else {
          results.push({
            name: `Edge Case - ${name}`,
            passed: false,
            error: result.error
          });
          console.log(`  ❌ ${name}: ${result.error}`);
        }
      } catch (error) {
        results.push({
          name: `Edge Case - ${name}`,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log(`  ❌ ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('');
    return results;
  }

  private static testPortfolioMapping(): TestResult[] {
    const results: TestResult[] = [];

    console.log('🏦 Testing Portfolio Mapping:');

    const testCases = [
      { input: 'TFSA', expected: 'TFSA' },
      { input: 'Tax-Free Savings', expected: 'TFSA' },
      { input: 'RRSP Account', expected: 'RRSP' },
      { input: 'Registered Retirement', expected: 'RRSP' },
      { input: 'Margin Account', expected: 'Margin' },
      { input: 'Non-Registered', expected: 'Margin' },
      { input: 'Cash Account', expected: 'Cash' },
      { input: 'Personal', expected: 'Cash' },
      { input: 'RESP', expected: 'RESP' },
      { input: 'Invalid Account', expected: null }
    ];

    for (const testCase of testCases) {
      try {
        const isValid = PortfolioMappingService.isValidAccountType(testCase.input);
        const mapping = PortfolioMappingService.getMappingForAccountType(testCase.input);
        
        const passed = testCase.expected === null ? 
          !isValid : 
          isValid && mapping !== null;

        results.push({
          name: `Portfolio Mapping - ${testCase.input}`,
          passed,
          error: passed ? undefined : `Expected ${testCase.expected}, got ${isValid ? 'valid' : 'invalid'}`,
          data: { input: testCase.input, isValid, mapping: mapping?.defaultName }
        });

        if (passed) {
          console.log(`  ✅ ${testCase.input} -> ${mapping?.defaultName || 'Invalid'}`);
        } else {
          console.log(`  ❌ ${testCase.input}: Mapping failed`);
        }
      } catch (error) {
        results.push({
          name: `Portfolio Mapping - ${testCase.input}`,
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        console.log(`  ❌ ${testCase.input}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    console.log('');
    return results;
  }

  private static printTestSummary(results: TestResult[]): void {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const total = results.length;

    console.log('📊 Test Summary:');
    console.log(`  Total Tests: ${total}`);
    console.log(`  Passed: ${passed} ✅`);
    console.log(`  Failed: ${failed} ❌`);
    console.log(`  Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.filter(r => !r.passed).forEach(r => {
        console.log(`  - ${r.name}: ${r.error}`);
      });
    }

    console.log('');
  }

  /**
   * Test specific email
   */
  static testSingleEmail(
    subject: string,
    fromEmail: string,
    htmlContent: string,
    textContent?: string
  ): void {
    console.log('🧪 Testing Single Email:');
    console.log(`Subject: ${subject}`);
    console.log(`From: ${fromEmail}\n`);

    try {
      const result = WealthsimpleEmailParser.parseEmail(
        subject,
        fromEmail,
        htmlContent,
        textContent
      );

      if (result.success && result.data) {
        console.log('✅ Parsing Successful:');
        console.log(`  Symbol: ${result.data.symbol}`);
        console.log(`  Transaction Type: ${result.data.transactionType}`);
        console.log(`  Quantity: ${result.data.quantity}`);
        console.log(`  Price: $${result.data.price}`);
        console.log(`  Total Amount: $${result.data.totalAmount}`);
        console.log(`  Account Type: ${result.data.accountType}`);
        console.log(`  Transaction Date: ${result.data.transactionDate}`);
        console.log(`  Currency: ${result.data.currency}`);
        console.log(`  Confidence: ${result.data.confidence.toFixed(2)}`);
        console.log(`  Parse Method: ${result.data.parseMethod}`);

        if (result.warnings && result.warnings.length > 0) {
          console.log('\n⚠️ Warnings:');
          result.warnings.forEach(warning => console.log(`  - ${warning}`));
        }

        const validation = WealthsimpleEmailParser.validateParsedData(result.data);
        if (!validation.isValid) {
          console.log('\n❌ Validation Errors:');
          validation.errors.forEach(error => console.log(`  - ${error}`));
        }
      } else {
        console.log('❌ Parsing Failed:');
        console.log(`  Error: ${result.error}`);
        
        if (result.warnings && result.warnings.length > 0) {
          console.log('\n⚠️ Warnings:');
          result.warnings.forEach(warning => console.log(`  - ${warning}`));
        }
      }
    } catch (error) {
      console.log('❌ Exception Occurred:');
      console.log(`  ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log('');
  }

  /**
   * Performance test
   */
  static async performanceTest(iterations: number = 1000): Promise<void> {
    console.log(`🏃 Running Performance Test (${iterations} iterations)...`);

    const testEmail = MOCK_WEALTHSIMPLE_EMAILS.stockBuy;
    const startTime = Date.now();

    for (let i = 0; i < iterations; i++) {
      WealthsimpleEmailParser.parseEmail(
        testEmail.subject,
        testEmail.from,
        testEmail.html,
        testEmail.text
      );
    }

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTime = totalTime / iterations;

    console.log(`⏱️ Performance Results:`);
    console.log(`  Total Time: ${totalTime}ms`);
    console.log(`  Average Time per Parse: ${avgTime.toFixed(2)}ms`);
    console.log(`  Emails per Second: ${(1000 / avgTime).toFixed(0)}`);
    console.log('');
  }
}

// Add AI integration test method
export class ExtendedEmailParserTestSuite extends EmailParserTestSuite {
  static async testAIIntegration(): Promise<TestResult[]> {
    console.log('🤖 Testing AI Symbol Integration:');
    
    try {
      const aiResults = await AISymbolIntegrationTests.runAllTests();
      
      return aiResults.map(result => ({
        name: `AI Integration - ${result.name}`,
        passed: result.passed,
        error: result.error,
        data: {
          emailSymbol: result.emailSymbol,
          aiEnhancedSymbol: result.aiEnhancedSymbol,
          confidence: result.confidence,
          source: result.source,
          assetType: result.assetType
        }
      }));
    } catch (error) {
      return [{
        name: 'AI Integration - Suite',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }];
    }
  }
}

// Export for use in other test files
export default EmailParserTestSuite;
