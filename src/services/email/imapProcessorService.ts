/**
 * IMAP Processor Service Manager
 * Task 7.2: Implement email monitoring and fetching
 * Manages IMAP processor lifecycle and provides service-level functionality
 */

import { IMAPEmailProcessor, type IMAPConfig, type ProcessingResult, type IMAPProcessorStats } from './imapEmailProcessor';

// Development-only logging utility
const devLog = (message: string) => {
  if (process.env.NODE_ENV === 'development') {
    console.log(message);
  }
};

export interface IMAPServiceConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  defaultPortfolioId: string;
  pollInterval?: number;
  autoReconnect?: boolean;
  maxRetries?: number;
  logger?: boolean;
}

export interface ServiceStatus {
  status: 'stopped' | 'starting' | 'running' | 'error' | 'reconnecting';
  processor?: IMAPEmailProcessor;
  lastError?: string;
  startedAt?: string;
  stats: IMAPProcessorStats;
}

/**
 * IMAP Processor Service Manager
 * Provides high-level management of IMAP email processing
 */
export class IMAPProcessorService {
  private static instance: IMAPProcessorService | null = null;
  private processor: IMAPEmailProcessor | null = null;
  private config: IMAPServiceConfig;
  private status: ServiceStatus;
  private retryCount = 0;
  private maxRetries = 3;

  private constructor(config: IMAPServiceConfig) {
    this.config = config;
    this.maxRetries = config.maxRetries || 3;
    this.status = {
      status: 'stopped',
      stats: {
        connected: false,
        totalProcessed: 0,
        successful: 0,
        failed: 0,
        duplicates: 0,
        reviewRequired: 0,
        connectionUptime: 0,
        averageProcessingTime: 0
      }
    };
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: IMAPServiceConfig): IMAPProcessorService {
    if (!IMAPProcessorService.instance) {
      if (!config) {
        throw new Error('IMAPProcessorService config required for first initialization');
      }
      IMAPProcessorService.instance = new IMAPProcessorService(config);
    }
    return IMAPProcessorService.instance;
  }

  /**
   * Start the IMAP email processing service
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      devLog('📧 IMAP Service: Disabled in configuration');
      return;
    }

    if (this.status.status === 'running') {
      devLog('📧 IMAP Service: Already running');
      return;
    }

    try {
      this.updateStatus('starting');
      devLog('📧 IMAP Service: Starting...');

      // Create IMAP processor
      const imapConfig: IMAPConfig = {
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.username,
          pass: this.config.password
        },
        logger: this.config.logger || false
      };

      this.processor = new IMAPEmailProcessor(imapConfig);

      // Test connection first
      const connectionTest = await this.processor.testConnection();
      if (!connectionTest.success) {
        throw new Error(`Connection test failed: ${connectionTest.error}`);
      }

      // Connect and start monitoring
      await this.processor.connect();
      await this.processor.startMonitoring(this.config.defaultPortfolioId);

      this.updateStatus('running');
      this.retryCount = 0;
      
      devLog('✅ IMAP Service: Started successfully');

    } catch (error) {
      console.error('❌ IMAP Service: Failed to start:', error);
      this.updateStatus('error', error instanceof Error ? error.message : 'Unknown error');
      
      // Auto-retry if enabled
      if (this.config.autoReconnect && this.retryCount < this.maxRetries) {
        await this.scheduleRetry();
      }
      
      throw error;
    }
  }

  /**
   * Stop the IMAP email processing service
   */
  async stop(): Promise<void> {
    if (this.status.status === 'stopped') {
      devLog('📧 IMAP Service: Already stopped');
      return;
    }

    try {
      devLog('📧 IMAP Service: Stopping...');

      if (this.processor) {
        this.processor.stopMonitoring();
        await this.processor.disconnect();
        this.processor = null;
      }

      this.updateStatus('stopped');
      this.retryCount = 0;

      devLog('✅ IMAP Service: Stopped successfully');

    } catch (error) {
      console.error('❌ IMAP Service: Error during stop:', error);
      this.updateStatus('error', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Restart the service
   */
  async restart(): Promise<void> {
    devLog('📧 IMAP Service: Restarting...');
    await this.stop();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    await this.start();
  }

  /**
   * Process emails manually (on-demand)
   */
  async processEmailsNow(portfolioId?: string): Promise<ProcessingResult[]> {
    if (!this.processor || this.status.status !== 'running') {
      throw new Error('IMAP Service not running');
    }

    devLog('📧 IMAP Service: Processing emails manually...');
    
    try {
      const results = await this.processor.processNewEmails(portfolioId || this.config.defaultPortfolioId);
      devLog(`✅ IMAP Service: Processed ${results.length} emails manually`);
      return results;
    } catch (error) {
      console.error('❌ IMAP Service: Manual processing failed:', error);
      throw error;
    }
  }

  /**
   * Get current service status
   */
  getStatus(): ServiceStatus {
    // Update stats from processor if available
    if (this.processor) {
      this.status.stats = this.processor.getStats();
    }
    
    return { ...this.status };
  }

  /**
   * Get service configuration
   */
  getConfig(): IMAPServiceConfig {
    // Return config without sensitive password
    return {
      ...this.config,
      password: '***'
    };
  }

  /**
   * Update service configuration
   */
  async updateConfig(newConfig: Partial<IMAPServiceConfig>): Promise<void> {
    const wasRunning = this.status.status === 'running';
    
    if (wasRunning) {
      await this.stop();
    }

    this.config = { ...this.config, ...newConfig };

    if (wasRunning && newConfig.enabled !== false) {
      await this.start();
    }

    devLog('✅ IMAP Service: Configuration updated');
  }

  /**
   * Test IMAP connection without starting service
   */
  async testConnection(): Promise<{ success: boolean; error?: string; serverInfo?: unknown }> {
    try {
      const imapConfig: IMAPConfig = {
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: {
          user: this.config.username,
          pass: this.config.password
        },
        logger: false
      };

      const testProcessor = new IMAPEmailProcessor(imapConfig);
      return await testProcessor.testConnection();

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get health check information
   */
  getHealthCheck(): {
    healthy: boolean;
    status: string;
    uptime: number;
    stats: IMAPProcessorStats;
    lastError?: string;
  } {
    const status = this.getStatus();
    
    return {
      healthy: status.status === 'running' && status.stats.connected,
      status: status.status,
      uptime: status.stats.connectionUptime,
      stats: status.stats,
      lastError: status.lastError
    };
  }

  /**
   * Clear processed emails cache (force reprocessing)
   */
  clearProcessedCache(): void {
    if (this.processor) {
      this.processor.clearProcessedUIDs();
      devLog('✅ IMAP Service: Cleared processed emails cache');
    }
  }

  /**
   * Update service status
   */
  private updateStatus(status: ServiceStatus['status'], error?: string): void {
    this.status.status = status;
    
    if (error) {
      this.status.lastError = error;
    }
    
    if (status === 'running') {
      this.status.startedAt = new Date().toISOString();
    }
    
    if (this.processor) {
      this.status.stats = this.processor.getStats();
    }
  }

  /**
   * Schedule automatic retry
   */
  private async scheduleRetry(): Promise<void> {
    this.retryCount++;
    const retryDelay = Math.min(5000 * Math.pow(2, this.retryCount - 1), 300000); // Exponential backoff, max 5 minutes
    
    devLog(`📧 IMAP Service: Scheduling retry ${this.retryCount}/${this.maxRetries} in ${retryDelay}ms...`);
    this.updateStatus('reconnecting');

    setTimeout(async () => {
      try {
        await this.start();
      } catch (error) {
        console.error(`❌ IMAP Service: Retry ${this.retryCount} failed:`, error);
      }
    }, retryDelay);
  }

  /**
   * Create default configuration
   */
  static createDefaultConfig(): IMAPServiceConfig {
    return {
      enabled: true,
      host: 'localhost',
      port: 993,
      secure: true,
      username: 'transactions@investra.com',
      password: 'InvestraSecure2025!',
      defaultPortfolioId: 'default',
      pollInterval: 30000,
      autoReconnect: true,
      maxRetries: 3,
      logger: false
    };
  }

  /**
   * Create configuration from environment variables
   */
  static createConfigFromEnv(): IMAPServiceConfig {
    return {
      enabled: process.env.IMAP_ENABLED !== 'false',
      host: process.env.IMAP_HOST || 'localhost',
      port: parseInt(process.env.IMAP_PORT || '993'),
      secure: process.env.IMAP_SECURE !== 'false',
      username: process.env.IMAP_USERNAME || 'transactions@investra.com',
      password: process.env.IMAP_PASSWORD || 'InvestraSecure2025!',
      defaultPortfolioId: process.env.DEFAULT_PORTFOLIO_ID || 'default',
      pollInterval: parseInt(process.env.IMAP_POLL_INTERVAL || '30000'),
      autoReconnect: process.env.IMAP_AUTO_RECONNECT !== 'false',
      maxRetries: parseInt(process.env.IMAP_MAX_RETRIES || '3'),
      logger: process.env.IMAP_LOGGER === 'true'
    };
  }

  /**
   * Destroy singleton instance (for testing)
   */
  static destroyInstance(): void {
    if (IMAPProcessorService.instance) {
      IMAPProcessorService.instance.stop().catch(console.error);
      IMAPProcessorService.instance = null;
    }
  }
}

export default IMAPProcessorService;