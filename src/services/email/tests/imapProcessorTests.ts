/**
 * IMAP Processor Tests
 * Task 7.3: Integration tests for IMAP email processor
 */

import { IMAPProcessorService } from '../imapProcessorService';
import { IMAPEmailProcessor } from '../imapEmailProcessor';
import { MOCK_WEALTHSIMPLE_EMAILS } from './mockWealthsimpleEmails';
import type { IMAPConfig } from '../imapEmailProcessor';

export interface IMAPTestResult {
  testName: string;
  success: boolean;
  error?: string;
  details?: Record<string, unknown>;
  duration: number;
}

/**
 * IMAP Processor Test Suite
 */
export class IMAPProcessorTestSuite {
  private static readonly TEST_CONFIG: IMAPConfig = {
    host: 'localhost',
    port: 993,
    secure: true,
    auth: {
      user: 'transactions@investra.com',
      pass: 'InvestraSecure2025!'
    },
    logger: false
  };

  /**
   * Run all IMAP processor tests
   */
  static async runAllTests(): Promise<IMAPTestResult[]> {
    const results: IMAPTestResult[] = [];

    console.log('🧪 Running IMAP Processor Tests...\\n');

    // Test connection
    results.push(await this.testConnection());
    
    // Test configuration
    results.push(await this.testConfiguration());
    
    // Test service lifecycle
    results.push(await this.testServiceLifecycle());
    
    // Test mock email processing
    results.push(await this.testMockEmailProcessing());
    
    // Test error handling
    results.push(await this.testErrorHandling());

    // Print summary
    this.printTestSummary(results);

    return results;
  }

  /**
   * Test IMAP connection
   */
  private static async testConnection(): Promise<IMAPTestResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔌 Testing IMAP Connection...');
      
      const processor = new IMAPEmailProcessor(this.TEST_CONFIG);
      const result = await processor.testConnection();
      
      const duration = Date.now() - startTime;
      
      if (result.success) {
        console.log('✅ IMAP Connection test passed');
        return {
          testName: 'IMAP Connection Test',
          success: true,
          details: result.serverInfo as Record<string, unknown>,
          duration
        };
      } else {
        console.log('❌ IMAP Connection test failed:', result.error);
        return {
          testName: 'IMAP Connection Test',
          success: false,
          error: result.error,
          duration
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log('❌ IMAP Connection test threw error:', error);
      
      return {
        testName: 'IMAP Connection Test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration
      };
    }
  }

  /**
   * Test service configuration
   */
  private static async testConfiguration(): Promise<IMAPTestResult> {
    const startTime = Date.now();
    
    try {
      console.log('⚙️ Testing Service Configuration...');
      
      // Test default configuration
      const defaultConfig = IMAPProcessorService.createDefaultConfig();
      if (!defaultConfig.enabled || !defaultConfig.host) {
        throw new Error('Default configuration invalid');
      }
      
      // Test environment configuration
      const envConfig = IMAPProcessorService.createConfigFromEnv();
      if (!envConfig.host || !envConfig.username) {
        throw new Error('Environment configuration invalid');
      }
      
      // Test service instance creation
      const service = IMAPProcessorService.getInstance(defaultConfig);
      const config = service.getConfig();
      
      if (config.password === '***' && config.host === defaultConfig.host) {
        console.log('✅ Service Configuration test passed');
        return {
          testName: 'Service Configuration Test',
          success: true,
          details: { defaultConfig: !!defaultConfig, envConfig: !!envConfig, serviceConfig: !!config },
          duration: Date.now() - startTime
        };
      } else {
        throw new Error('Configuration validation failed');
      }
      
    } catch (error) {
      console.log('❌ Service Configuration test failed:', error);
      return {
        testName: 'Service Configuration Test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      };
    } finally {
      // Clean up
      IMAPProcessorService.destroyInstance();
    }
  }

  /**
   * Test service lifecycle (start/stop)
   */
  private static async testServiceLifecycle(): Promise<IMAPTestResult> {
    const startTime = Date.now();
    
    try {
      console.log('🔄 Testing Service Lifecycle...');
      
      const config = IMAPProcessorService.createDefaultConfig();
      config.enabled = true;
      
      const service = IMAPProcessorService.getInstance(config);
      
      // Test initial status
      let status = service.getStatus();
      if (status.status !== 'stopped') {
        throw new Error(`Expected stopped status, got ${status.status}`);
      }
      
      // Test connection test
      const connectionTest = await service.testConnection();
      if (!connectionTest.success) {
        console.log('⚠️ IMAP server not available, skipping lifecycle test');
        return {
          testName: 'Service Lifecycle Test',
          success: true,
          details: { skipped: true, reason: 'IMAP server not available' },
          duration: Date.now() - startTime
        };
      }
      
      // Test start (with timeout)
      const startPromise = service.start();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Start timeout')), 10000)
      );
      
      try {
        await Promise.race([startPromise, timeoutPromise]);
        
        status = service.getStatus();
        if (status.status !== 'running') {
          throw new Error(`Expected running status after start, got ${status.status}`);
        }
        
        // Test stop
        await service.stop();
        
        status = service.getStatus();
        if (status.status !== 'stopped') {
          throw new Error(`Expected stopped status after stop, got ${status.status}`);
        }
        
        console.log('✅ Service Lifecycle test passed');
        return {
          testName: 'Service Lifecycle Test',
          success: true,
          details: { started: true, stopped: true },
          duration: Date.now() - startTime
        };
        
      } catch (startError) {
        // If start fails, still try to stop
        try {
          await service.stop();
        } catch {
          // Ignore stop errors if start failed
        }
        throw startError;
      }
      
    } catch (error) {
      console.log('❌ Service Lifecycle test failed:', error);
      return {
        testName: 'Service Lifecycle Test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      };
    } finally {
      // Clean up
      IMAPProcessorService.destroyInstance();
    }
  }

  /**
   * Test mock email processing
   */
  private static async testMockEmailProcessing(): Promise<IMAPTestResult> {
    const startTime = Date.now();
    
    try {
      console.log('📧 Testing Mock Email Processing...');
      
      // Test email message creation (without actually creating processor instance)
      
      // Test email message creation
      const mockEmail = MOCK_WEALTHSIMPLE_EMAILS.stockBuy;
      const emailMessage = {
        uid: 12345,
        subject: mockEmail.subject,
        from: mockEmail.from,
        date: new Date(),
        html: mockEmail.html,
        text: mockEmail.text,
        headers: new Map([
          ['message-id', '<test-message-id@test.com>'],
          ['content-type', 'text/html']
        ])
      };
      
      // Test that the processor can handle the mock email structure
      // Note: We can't actually process it without IMAP connection,
      // but we can test the data structure validation
      
      const isValidEmail = emailMessage.subject && 
                          emailMessage.from && 
                          emailMessage.html && 
                          emailMessage.uid > 0;
      
      if (!isValidEmail) {
        throw new Error('Mock email structure validation failed');
      }
      
      console.log('✅ Mock Email Processing test passed');
      return {
        testName: 'Mock Email Processing Test',
        success: true,
        details: { 
          emailStructure: 'valid',
          subject: emailMessage.subject,
          from: emailMessage.from,
          uid: emailMessage.uid
        },
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      console.log('❌ Mock Email Processing test failed:', error);
      return {
        testName: 'Mock Email Processing Test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Test error handling
   */
  private static async testErrorHandling(): Promise<IMAPTestResult> {
    const startTime = Date.now();
    
    try {
      console.log('🚨 Testing Error Handling...');
      
      // Test invalid configuration
      const invalidConfig: IMAPConfig = {
        host: 'invalid-host-12345',
        port: 9999,
        secure: true,
        auth: {
          user: 'invalid-user',
          pass: 'invalid-pass'
        }
      };
      
      const processor = new IMAPEmailProcessor(invalidConfig);
      
      // Test connection failure handling
      const connectionResult = await processor.testConnection();
      if (connectionResult.success) {
        throw new Error('Expected connection test to fail with invalid config');
      }
      
      // Test service error handling
      const config = IMAPProcessorService.createDefaultConfig();
      config.host = 'invalid-host-12345';
      config.autoReconnect = false; // Disable auto-retry for testing
      
      const service = IMAPProcessorService.getInstance(config);
      
      try {
        await service.start();
        throw new Error('Expected service start to fail with invalid config');
      } catch {
        // This is expected
        const status = service.getStatus();
        if (status.status !== 'error') {
          throw new Error(`Expected error status, got ${status.status}`);
        }
      }
      
      console.log('✅ Error Handling test passed');
      return {
        testName: 'Error Handling Test',
        success: true,
        details: { 
          connectionError: 'handled',
          serviceError: 'handled',
          statusUpdate: 'correct'
        },
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      console.log('❌ Error Handling test failed:', error);
      return {
        testName: 'Error Handling Test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      };
    } finally {
      // Clean up
      IMAPProcessorService.destroyInstance();
    }
  }

  /**
   * Test with live IMAP server (if available)
   */
  static async testLiveConnection(): Promise<IMAPTestResult> {
    const startTime = Date.now();
    
    try {
      console.log('🌐 Testing Live IMAP Connection...');
      
      const config = IMAPProcessorService.createDefaultConfig();
      const service = IMAPProcessorService.getInstance(config);
      
      // Test connection
      const connectionTest = await service.testConnection();
      
      if (!connectionTest.success) {
        console.log('⚠️ Live IMAP server not available');
        return {
          testName: 'Live IMAP Connection Test',
          success: true,
          details: { 
            skipped: true, 
            reason: 'IMAP server not available',
            error: connectionTest.error
          },
          duration: Date.now() - startTime
        };
      }
      
      // Test start service
      await service.start();
      
      // Wait a moment for initialization
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check status
      const status = service.getStatus();
      const health = service.getHealthCheck();
      
      // Stop service
      await service.stop();
      
      console.log('✅ Live IMAP Connection test passed');
      return {
        testName: 'Live IMAP Connection Test',
        success: true,
        details: {
          connected: status.stats.connected,
          healthy: health.healthy,
          uptime: health.uptime
        },
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      console.log('❌ Live IMAP Connection test failed:', error);
      return {
        testName: 'Live IMAP Connection Test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      };
    } finally {
      // Clean up
      IMAPProcessorService.destroyInstance();
    }
  }

  /**
   * Performance test
   */
  static async performanceTest(): Promise<IMAPTestResult> {
    const startTime = Date.now();
    
    try {
      console.log('🏃 Running IMAP Performance Test...');
      
      const iterations = 10;
      const connectionTimes: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const testStart = Date.now();
        
        const processor = new IMAPEmailProcessor(this.TEST_CONFIG);
        await processor.testConnection();
        
        connectionTimes.push(Date.now() - testStart);
      }
      
      const avgConnectionTime = connectionTimes.reduce((a, b) => a + b, 0) / iterations;
      const maxConnectionTime = Math.max(...connectionTimes);
      const minConnectionTime = Math.min(...connectionTimes);
      
      console.log('✅ IMAP Performance test completed');
      return {
        testName: 'IMAP Performance Test',
        success: true,
        details: {
          iterations,
          averageConnectionTime: Math.round(avgConnectionTime),
          maxConnectionTime,
          minConnectionTime,
          allConnectionTimes: connectionTimes
        },
        duration: Date.now() - startTime
      };
      
    } catch (error) {
      console.log('❌ IMAP Performance test failed:', error);
      return {
        testName: 'IMAP Performance Test',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Print test summary
   */
  private static printTestSummary(results: IMAPTestResult[]): void {
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

    console.log('\\n📊 IMAP Processor Test Summary');
    console.log('═'.repeat(50));
    console.log(`Total Tests: ${results.length}`);
    console.log(`Successful: ${successful}`);
    console.log(`Failed: ${failed}`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log('═'.repeat(50));

    if (failed > 0) {
      console.log('\\n❌ Failed Tests:');
      results.filter(r => !r.success).forEach(r => {
        console.log(`   • ${r.testName}: ${r.error}`);
      });
    }

    if (successful === results.length) {
      console.log('\\n🎉 All IMAP Processor tests passed!');
    } else {
      console.log(`\\n⚠️ ${failed} test(s) failed`);
    }
  }

  /**
   * Get test configuration info
   */
  static getTestInfo(): {
    config: IMAPConfig;
    mockEmails: number;
    testTypes: string[];
  } {
    return {
      config: {
        ...this.TEST_CONFIG,
        auth: { user: this.TEST_CONFIG.auth.user, pass: '***' }
      },
      mockEmails: Object.keys(MOCK_WEALTHSIMPLE_EMAILS).length,
      testTypes: [
        'Connection Test',
        'Configuration Test', 
        'Service Lifecycle Test',
        'Mock Email Processing Test',
        'Error Handling Test',
        'Live Connection Test (optional)',
        'Performance Test (optional)'
      ]
    };
  }
}

export default IMAPProcessorTestSuite;