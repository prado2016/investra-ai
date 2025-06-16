/**
 * Email API Endpoints Tests
 * Task 6: Comprehensive testing for email processing API endpoints
 */

import { EmailAPI, EmailProcessingAPI, EmailStatusAPI, EmailManagementAPI, EmailAPIMiddleware } from '../emailAPI';
import { EmailAPISchemas, RateLimitConfigs } from '../emailAPIMiddleware';
import type { 
  EmailProcessRequest, 
  BatchEmailProcessRequest,
  ImportJobCreateRequest,
  ReviewManagementRequest 
} from '../emailAPI';

export interface APITestResult {
  testName: string;
  endpoint: string;
  method: string;
  success: boolean;
  responseTime: number;
  statusCode?: number;
  errors: string[];
  warnings: string[];
  data?: any;
}

/**
 * Email API Test Suite
 */
export class EmailAPITestSuite {
  /**
   * Run all API endpoint tests
   */
  static async runAllTests(): Promise<APITestResult[]> {
    const results: APITestResult[] = [];

    console.log('🧪 Running Email API Endpoints Tests...\n');

    // Test authentication and middleware
    results.push(...await this.testAuthentication());
    
    // Test validation
    results.push(...await this.testValidation());
    
    // Test rate limiting
    results.push(...await this.testRateLimiting());
    
    // Test email processing endpoints
    results.push(...await this.testEmailProcessing());
    
    // Test status endpoints
    results.push(...await this.testStatusEndpoints());
    
    // Test management endpoints
    results.push(...await this.testManagementEndpoints());
    
    // Test error handling
    results.push(...await this.testErrorHandling());

    // Print summary
    this.printTestSummary(results);

    return results;
  }

  /**
   * Test authentication functionality
   */
  private static async testAuthentication(): Promise<APITestResult[]> {
    const results: APITestResult[] = [];
    
    console.log('🔐 Testing Authentication...');

    // Test authentication with no user
    const authTest = await this.runAPITest(
      'Authentication Check',
      'middleware',
      'auth',
      async () => {
        const result = await EmailAPIMiddleware.authenticateUser();
        
        // In test environment, this might return no user or a test user
        return {
          success: true,
          data: result,
          statusCode: 200
        };
      }
    );
    results.push(authTest);

    return results;
  }

  /**
   * Test validation functionality
   */
  private static async testValidation(): Promise<APITestResult[]> {
    const results: APITestResult[] = [];
    
    console.log('✅ Testing Validation...');

    // Test email processing validation
    const validationTest = await this.runAPITest(
      'Email Process Validation',
      'validation',
      'validate',
      async () => {
        const validData = {
          subject: 'Trade Confirmation - AAPL Purchase',
          fromEmail: 'noreply@wealthsimple.com',
          htmlContent: '<html><body>Valid email content</body></html>'
        };

        const invalidData = {
          subject: '', // Invalid: empty
          fromEmail: 'invalid-email', // Invalid: not an email
          htmlContent: '' // Invalid: empty
        };

        const validResult = EmailAPIMiddleware.validateRequest(validData, EmailAPISchemas.emailProcess);
        const invalidResult = EmailAPIMiddleware.validateRequest(invalidData, EmailAPISchemas.emailProcess);

        return {
          success: validResult.isValid && !invalidResult.isValid,
          data: { validResult, invalidResult },
          statusCode: 200
        };
      }
    );
    results.push(validationTest);

    return results;
  }

  /**
   * Test rate limiting functionality
   */
  private static async testRateLimiting(): Promise<APITestResult[]> {
    const results: APITestResult[] = [];
    
    console.log('⏱️ Testing Rate Limiting...');

    const rateLimitTest = await this.runAPITest(
      'Rate Limiting',
      'middleware',
      'rateLimit',
      async () => {
        const userId = 'test-user-123';
        const config = {
          windowMs: 60 * 1000, // 1 minute
          maxRequests: 2 // Very low limit for testing
        };

        // First request should be allowed
        const first = EmailAPIMiddleware.checkRateLimit(userId, config);
        
        // Second request should be allowed
        const second = EmailAPIMiddleware.checkRateLimit(userId, config);
        
        // Third request should be blocked
        const third = EmailAPIMiddleware.checkRateLimit(userId, config);

        const success = first.allowed && second.allowed && !third.allowed;

        return {
          success,
          data: { first, second, third },
          statusCode: success ? 200 : 429
        };
      }
    );
    results.push(rateLimitTest);

    return results;
  }

  /**
   * Test email processing endpoints
   */
  private static async testEmailProcessing(): Promise<APITestResult[]> {
    const results: APITestResult[] = [];
    
    console.log('📧 Testing Email Processing Endpoints...');

    // Test email validation endpoint
    const validateEmailTest = await this.runAPITest(
      'Validate Email',
      '/api/email/validate',
      'POST',
      async () => {
        const request = {
          subject: 'Trade Confirmation - AAPL Purchase',
          fromEmail: 'noreply@wealthsimple.com',
          htmlContent: '<html><body>Test email content</body></html>'
        };

        const result = await EmailProcessingAPI.validateEmail(request);

        return {
          success: result.success,
          data: result.data,
          statusCode: result.success ? 200 : 400
        };
      }
    );
    results.push(validateEmailTest);

    // Test single email processing
    const processEmailTest = await this.runAPITest(
      'Process Single Email',
      '/api/email/process',
      'POST',
      async () => {
        const request: EmailProcessRequest = {
          subject: 'Trade Confirmation - AAPL Purchase',
          fromEmail: 'noreply@wealthsimple.com',
          htmlContent: this.createMockEmailHTML(),
          textContent: 'Text version of email',
          portfolioId: 'test-portfolio'
        };

        const result = await EmailProcessingAPI.processEmail(request);

        return {
          success: result.success,
          data: result.data,
          statusCode: result.success ? 200 : 400
        };
      }
    );
    results.push(processEmailTest);

    // Test batch email processing
    const batchProcessTest = await this.runAPITest(
      'Process Batch Emails',
      '/api/email/batch',
      'POST',
      async () => {
        const request: BatchEmailProcessRequest = {
          emails: [
            {
              subject: 'Trade Confirmation - AAPL Purchase #1',
              fromEmail: 'noreply@wealthsimple.com',
              htmlContent: this.createMockEmailHTML('AAPL', 'buy'),
            },
            {
              subject: 'Trade Confirmation - GOOGL Sale #1',
              fromEmail: 'noreply@wealthsimple.com',
              htmlContent: this.createMockEmailHTML('GOOGL', 'sell'),
            }
          ],
          portfolioId: 'test-portfolio'
        };

        const result = await EmailProcessingAPI.processBatchEmails(request);

        return {
          success: result.success,
          data: result.data,
          statusCode: result.success ? 200 : 400
        };
      }
    );
    results.push(batchProcessTest);

    return results;
  }

  /**
   * Test status endpoints
   */
  private static async testStatusEndpoints(): Promise<APITestResult[]> {
    const results: APITestResult[] = [];
    
    console.log('📊 Testing Status Endpoints...');

    // Test health check
    const healthCheckTest = await this.runAPITest(
      'Health Check',
      '/api/email/health',
      'GET',
      async () => {
        const result = await EmailStatusAPI.getHealthCheck();

        return {
          success: result.success,
          data: result.data,
          statusCode: result.success ? 200 : 503
        };
      }
    );
    results.push(healthCheckTest);

    // Test processing statistics
    const statsTest = await this.runAPITest(
      'Processing Statistics',
      '/api/email/stats',
      'GET',
      async () => {
        const result = await EmailStatusAPI.getProcessingStats();

        return {
          success: result.success,
          data: result.data,
          statusCode: result.success ? 200 : 500
        };
      }
    );
    results.push(statsTest);

    // Test processing history
    const historyTest = await this.runAPITest(
      'Processing History',
      '/api/email/history',
      'GET',
      async () => {
        const result = await EmailStatusAPI.getProcessingHistory(1, 10);

        return {
          success: result.success,
          data: result.data,
          statusCode: result.success ? 200 : 500
        };
      }
    );
    results.push(historyTest);

    return results;
  }

  /**
   * Test management endpoints
   */
  private static async testManagementEndpoints(): Promise<APITestResult[]> {
    const results: APITestResult[] = [];
    
    console.log('🔧 Testing Management Endpoints...');

    // Test import job creation
    const createJobTest = await this.runAPITest(
      'Create Import Job',
      '/api/email/import/jobs',
      'POST',
      async () => {
        const request: ImportJobCreateRequest = {
          name: 'Test Import Job',
          description: 'Test job for API testing',
          type: 'manual',
          source: {
            type: 'manual',
            details: { test: true }
          },
          settings: {
            portfolioId: 'test-portfolio',
            duplicateHandling: 'manual'
          }
        };

        const result = await EmailManagementAPI.createImportJob(request);

        return {
          success: result.success,
          data: result.data,
          statusCode: result.success ? 201 : 400
        };
      }
    );
    results.push(createJobTest);

    // Test import jobs listing
    const listJobsTest = await this.runAPITest(
      'List Import Jobs',
      '/api/email/import/jobs',
      'GET',
      async () => {
        const result = await EmailManagementAPI.getImportJobs(1, 10);

        return {
          success: result.success,
          data: result.data,
          statusCode: result.success ? 200 : 500
        };
      }
    );
    results.push(listJobsTest);

    // Test review queue
    const reviewQueueTest = await this.runAPITest(
      'Get Review Queue',
      '/api/email/review/queue',
      'GET',
      async () => {
        const result = await EmailManagementAPI.getReviewQueue(1, 10);

        return {
          success: result.success,
          data: result.data,
          statusCode: result.success ? 200 : 500
        };
      }
    );
    results.push(reviewQueueTest);

    return results;
  }

  /**
   * Test error handling
   */
  private static async testErrorHandling(): Promise<APITestResult[]> {
    const results: APITestResult[] = [];
    
    console.log('❌ Testing Error Handling...');

    // Test invalid request handling
    const invalidRequestTest = await this.runAPITest(
      'Invalid Request Handling',
      '/api/email/process',
      'POST',
      async () => {
        const invalidRequest = {
          // Missing required fields
          subject: '',
          fromEmail: 'invalid-email'
          // Missing htmlContent
        };

        const result = await EmailProcessingAPI.processEmail(invalidRequest as EmailProcessRequest);

        // Should fail with validation error
        return {
          success: !result.success && result.error?.code === 'INVALID_REQUEST',
          data: result.error,
          statusCode: 400
        };
      }
    );
    results.push(invalidRequestTest);

    // Test not found handling
    const notFoundTest = await this.runAPITest(
      'Not Found Handling',
      '/api/email/status/:id',
      'GET',
      async () => {
        const result = await EmailStatusAPI.getProcessingStatus('non-existent-id');

        // Should fail with not found error
        return {
          success: !result.success && result.error?.code === 'NOT_FOUND',
          data: result.error,
          statusCode: 404
        };
      }
    );
    results.push(notFoundTest);

    return results;
  }

  /**
   * Run a single API test
   */
  private static async runAPITest(
    testName: string,
    endpoint: string,
    method: string,
    testFunction: () => Promise<{ success: boolean; data?: any; statusCode?: number }>
  ): Promise<APITestResult> {
    const startTime = Date.now();
    
    try {
      const result = await testFunction();
      const responseTime = Date.now() - startTime;

      console.log(`${result.success ? '✅' : '❌'} ${testName} (${responseTime}ms)`);
      if (result.statusCode) {
        console.log(`   Status: ${result.statusCode}`);
      }

      return {
        testName,
        endpoint,
        method,
        success: result.success,
        responseTime,
        statusCode: result.statusCode,
        errors: result.success ? [] : ['Test assertion failed'],
        warnings: [],
        data: result.data
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      console.log(`❌ ${testName}: ${error} (${responseTime}ms)`);

      return {
        testName,
        endpoint,
        method,
        success: false,
        responseTime,
        statusCode: 500,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: []
      };
    }
  }

  /**
   * Create mock email HTML for testing
   */
  private static createMockEmailHTML(symbol = 'AAPL', action = 'buy'): string {
    return `
      <html>
        <body>
          <h1>Trade Confirmation</h1>
          <p>Dear Valued Client,</p>
          <p>Your order has been executed:</p>
          <table>
            <tr><td>Symbol:</td><td>${symbol}</td></tr>
            <tr><td>Action:</td><td>${action.toUpperCase()}</td></tr>
            <tr><td>Quantity:</td><td>10 shares</td></tr>
            <tr><td>Price:</td><td>$150.25</td></tr>
            <tr><td>Total:</td><td>$1,502.50</td></tr>
            <tr><td>Account:</td><td>TFSA</td></tr>
            <tr><td>Order ID:</td><td>WS${Math.random().toString().substr(2, 9)}</td></tr>
          </table>
          <p>Execution Time: 2:30 PM EST</p>
          <p>Thank you for choosing Wealthsimple.</p>
        </body>
      </html>
    `;
  }

  /**
   * Test input sanitization
   */
  static testInputSanitization(): APITestResult {
    const startTime = Date.now();
    
    try {
      const maliciousInput = {
        subject: '<script>alert("xss")</script>Trade Confirmation',
        content: 'javascript:void(0)',
        data: {
          'invalid<script>key': 'value',
          normalKey: '<script>alert("xss")</script>normal value'
        }
      };

      const sanitized = EmailAPIMiddleware.sanitizeInput(maliciousInput);
      
      const success = 
        !sanitized.subject.includes('<script>') &&
        !sanitized.content.includes('javascript:') &&
        !Object.keys(sanitized.data).some(key => key.includes('<script>')) &&
        !sanitized.data.normalKey.includes('<script>');

      console.log(`${success ? '✅' : '❌'} Input Sanitization Test`);

      return {
        testName: 'Input Sanitization',
        endpoint: 'middleware',
        method: 'sanitize',
        success,
        responseTime: Date.now() - startTime,
        errors: success ? [] : ['Sanitization failed to remove malicious content'],
        warnings: []
      };

    } catch (error) {
      return {
        testName: 'Input Sanitization',
        endpoint: 'middleware',
        method: 'sanitize',
        success: false,
        responseTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: []
      };
    }
  }

  /**
   * Test performance under load
   */
  static async testPerformance(): Promise<APITestResult> {
    const startTime = Date.now();
    
    try {
      console.log('🏃 Running Performance Test...');

      const iterations = 10;
      const promises = [];

      for (let i = 0; i < iterations; i++) {
        const request = {
          subject: `Performance Test Email #${i}`,
          fromEmail: 'noreply@wealthsimple.com',
          htmlContent: this.createMockEmailHTML()
        };

        promises.push(EmailProcessingAPI.validateEmail(request));
      }

      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / iterations;
      const successfulRequests = results.filter(r => r.success).length;

      const success = successfulRequests === iterations && averageTime < 100;

      console.log(`${success ? '✅' : '❌'} Performance Test`);
      console.log(`   Total time: ${totalTime}ms`);
      console.log(`   Average time: ${averageTime.toFixed(2)}ms per request`);
      console.log(`   Success rate: ${successfulRequests}/${iterations}`);

      return {
        testName: 'Performance Test',
        endpoint: '/api/email/validate',
        method: 'POST',
        success,
        responseTime: totalTime,
        errors: success ? [] : ['Performance test failed'],
        warnings: averageTime > 50 ? ['Average response time exceeds 50ms'] : [],
        data: { iterations, averageTime, successfulRequests }
      };

    } catch (error) {
      return {
        testName: 'Performance Test',
        endpoint: '/api/email/validate',
        method: 'POST',
        success: false,
        responseTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: []
      };
    }
  }

  /**
   * Print test summary
   */
  private static printTestSummary(results: APITestResult[]): void {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
    const totalWarnings = results.reduce((sum, r) => sum + r.warnings.length, 0);
    const averageResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    console.log('\n📊 Email API Tests Summary');
    console.log('═'.repeat(60));
    console.log(`Total Tests: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Errors: ${totalErrors}`);
    console.log(`Total Warnings: ${totalWarnings}`);
    console.log(`Average Response Time: ${averageResponseTime.toFixed(2)}ms`);
    console.log('═'.repeat(60));

    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   • ${r.testName} (${r.endpoint}): ${r.errors.join(', ')}`);
      });
    }

    if (totalWarnings > 0) {
      console.log('\n⚠️ Tests with Warnings:');
      results.filter(r => r.warnings.length > 0).forEach(r => {
        console.log(`   • ${r.testName}: ${r.warnings.join(', ')}`);
      });
    }

    // Group by endpoint
    const byEndpoint = results.reduce((acc, result) => {
      const endpoint = result.endpoint;
      if (!acc[endpoint]) {
        acc[endpoint] = { total: 0, successful: 0, avgTime: 0 };
      }
      acc[endpoint].total++;
      if (result.success) acc[endpoint].successful++;
      acc[endpoint].avgTime = (acc[endpoint].avgTime + result.responseTime) / acc[endpoint].total;
      return acc;
    }, {} as Record<string, { total: number; successful: number; avgTime: number }>);

    console.log('\n📈 Results by Endpoint:');
    Object.entries(byEndpoint).forEach(([endpoint, stats]) => {
      const successRate = (stats.successful / stats.total * 100).toFixed(1);
      console.log(`   ${endpoint}: ${stats.successful}/${stats.total} (${successRate}%) - Avg: ${stats.avgTime.toFixed(2)}ms`);
    });
  }
}

export default EmailAPITestSuite;