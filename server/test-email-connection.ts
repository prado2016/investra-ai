/**
 * Email Server Connection Test
 * Task 11.2: Test Email Server Connection
 * Tests IMAP connection to the email server before full deployment
 */

import { IMAPProcessorService } from '../src/services/email/imapProcessorService';
import { IMAPEmailProcessor } from '../src/services/email/imapEmailProcessor';
import dotenv from 'dotenv';

dotenv.config();

// Test configuration
const TEST_CONFIGS = [
  {
    name: 'Production Email Server',
    host: process.env.IMAP_HOST || 'localhost',
    port: parseInt(process.env.IMAP_PORT || '993'),
    secure: process.env.IMAP_SECURE !== 'false',
    username: process.env.IMAP_USERNAME || 'transactions@investra.com',
    password: process.env.IMAP_PASSWORD || 'InvestraSecure2025!'
  },
  {
    name: 'Alternative Configuration (STARTTLS)',
    host: process.env.IMAP_HOST || 'localhost',
    port: 143,
    secure: false,
    username: process.env.IMAP_USERNAME || 'transactions@investra.com',
    password: process.env.IMAP_PASSWORD || 'InvestraSecure2025!'
  },
  {
    name: 'Local Development Server',
    host: '127.0.0.1',
    port: 993,
    secure: true,
    username: 'transactions@investra.com',
    password: 'InvestraSecure2025!'
  }
];

interface ConnectionTestResult {
  configName: string;
  success: boolean;
  error?: string;
  serverInfo?: any;
  connectionTime?: number;
  capabilities?: string[];
}

class EmailConnectionTester {
  
  /**
   * Test a single IMAP configuration
   */
  async testConfiguration(config: typeof TEST_CONFIGS[0]): Promise<ConnectionTestResult> {
    const startTime = Date.now();
    
    console.log(`\n🔌 Testing configuration: ${config.name}`);
    console.log(`   Host: ${config.host}:${config.port} (${config.secure ? 'SSL/TLS' : 'Plain/STARTTLS'})`);
    console.log(`   User: ${config.username}`);
    
    try {
      const imapConfig = {
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.username,
          pass: config.password
        },
        logger: false
      };
      
      const processor = new IMAPEmailProcessor(imapConfig);
      const result = await processor.testConnection();
      const connectionTime = Date.now() - startTime;
      
      if (result.success) {
        console.log(`   ✅ Connection successful (${connectionTime}ms)`);
        if (result.serverInfo) {
          console.log(`   📋 Server info available`);
        }
      } else {
        console.log(`   ❌ Connection failed: ${result.error}`);
      }
      
      return {
        configName: config.name,
        success: result.success,
        error: result.error,
        serverInfo: result.serverInfo,
        connectionTime,
        capabilities: (result.serverInfo as any)?.capabilities || []
      };
      
    } catch (error) {
      const connectionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.log(`   ❌ Connection failed: ${errorMessage} (${connectionTime}ms)`);
      
      return {
        configName: config.name,
        success: false,
        error: errorMessage,
        connectionTime
      };
    }
  }
  
  /**
   * Test IMAP service initialization
   */
  async testIMAPService(): Promise<void> {
    console.log('\n🔧 Testing IMAP Service Initialization...');
    
    try {
      const config = IMAPProcessorService.createConfigFromEnv();
      console.log(`   Config: ${config.host}:${config.port} (enabled: ${config.enabled})`);
      
      const service = IMAPProcessorService.getInstance(config);
      
      // Test connection without starting service
      const connectionTest = await service.testConnection();
      
      if (connectionTest.success) {
        console.log('   ✅ IMAP Service connection test successful');
        
        // Test service health check
        const healthCheck = service.getHealthCheck();
        console.log(`   📊 Health check: ${healthCheck.healthy ? 'Healthy' : 'Unhealthy'} (${healthCheck.status})`);
        
      } else {
        console.log(`   ❌ IMAP Service connection test failed: ${connectionTest.error}`);
      }
      
      // Clean up
      IMAPProcessorService.destroyInstance();
      
    } catch (error) {
      console.error('   ❌ IMAP Service test failed:', error);
    }
  }
  
  /**
   * Test basic network connectivity
   */
  async testNetworkConnectivity(): Promise<void> {
    console.log('\n🌐 Testing network connectivity...');
    
    const hosts = [
      'localhost',
      '127.0.0.1',
      '10.0.0.83',
      '10.0.0.89'
    ];
    
    for (const host of hosts) {
      try {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);
        
        const { stdout, stderr } = await execAsync(`ping -c 1 -W 1000 ${host}`);
        
        if (!stderr) {
          const match = stdout.match(/time=(\d+\.?\d*)/);
          const time = match ? match[1] : 'unknown';
          console.log(`   ✅ ${host} reachable (${time}ms)`);
        } else {
          console.log(`   ❌ ${host} unreachable`);
        }
        
      } catch (error) {
        console.log(`   ❌ ${host} unreachable (network error)`);
      }
    }
  }
  
  /**
   * Test DNS resolution
   */
  async testDNSResolution(): Promise<void> {
    console.log('\n🔍 Testing DNS resolution...');
    
    const domains = [
      'localhost',
      'mail.investra.com',
      'investra.com'
    ];
    
    for (const domain of domains) {
      try {
        const { lookup } = await import('dns');
        const { promisify } = await import('util');
        const lookupAsync = promisify(lookup);
        
        const result = await lookupAsync(domain);
        console.log(`   ✅ ${domain} resolves to ${result.address} (${result.family})`);
        
      } catch (error) {
        console.log(`   ❌ ${domain} DNS resolution failed`);
      }
    }
  }
  
  /**
   * Run all connection tests
   */
  async runAllTests(): Promise<ConnectionTestResult[]> {
    console.log('🧪 Email Server Connection Test Suite');
    console.log('=====================================');
    console.log(`Date: ${new Date().toISOString()}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Test network connectivity first
    await this.testNetworkConnectivity();
    
    // Test DNS resolution
    await this.testDNSResolution();
    
    // Test IMAP configurations
    console.log('\n📧 Testing IMAP Configurations...');
    const results: ConnectionTestResult[] = [];
    
    for (const config of TEST_CONFIGS) {
      const result = await this.testConfiguration(config);
      results.push(result);
      
      // Add delay between tests to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Test IMAP service
    await this.testIMAPService();
    
    // Summary
    console.log('\n📊 Test Results Summary');
    console.log('=======================');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Successful connections: ${successful.length}/${results.length}`);
    
    if (successful.length > 0) {
      console.log('\n✅ Working configurations:');
      successful.forEach(result => {
        console.log(`   • ${result.configName} (${result.connectionTime}ms)`);
      });
    }
    
    if (failed.length > 0) {
      console.log('\n❌ Failed configurations:');
      failed.forEach(result => {
        console.log(`   • ${result.configName}: ${result.error}`);
      });
    }
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (successful.length === 0) {
      console.log('   ⚠️ No IMAP connections succeeded');
      console.log('   🔧 Check that the email server is running');
      console.log('   🔧 Verify network connectivity');
      console.log('   🔧 Check firewall settings');
      console.log('   🔧 Verify credentials');
    } else {
      const fastest = successful.reduce((prev, current) => 
        (current.connectionTime || 0) < (prev.connectionTime || 0) ? current : prev
      );
      console.log(`   🚀 Fastest connection: ${fastest.configName} (${fastest.connectionTime}ms)`);
      console.log('   ✅ Email server is accessible');
      console.log('   🎯 Ready for production deployment');
    }
    
    return results;
  }
}

// Run tests if called directly
async function main() {
  const tester = new EmailConnectionTester();
  
  try {
    const results = await tester.runAllTests();
    
    // Exit with appropriate code
    const hasSuccessfulConnection = results.some(r => r.success);
    process.exit(hasSuccessfulConnection ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Export for use in other modules
export { EmailConnectionTester, ConnectionTestResult };

// Run if called directly
if (require.main === module) {
  main();
}