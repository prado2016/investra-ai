/**
 * IMAP Email Processor Service
 * Task 7.1: Create IMAP connection service with imapflow
 * Connects to email server and processes incoming Wealthsimple emails automatically
 */

import { ImapFlow } from 'imapflow';
import { EmailProcessingService } from './emailProcessingService';
import { MultiLevelDuplicateDetection } from './multiLevelDuplicateDetection';
import { ManualReviewQueue } from './manualReviewQueue';
import type { WealthsimpleEmailData } from './wealthsimpleEmailParser';

export interface IMAPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  logger?: boolean;
}

export interface EmailMessage {
  uid: number;
  subject: string;
  from: string;
  date: Date;
  html?: string;
  text?: string;
  headers: Map<string, string>;
}

export interface ProcessingResult {
  uid: number;
  success: boolean;
  emailData?: WealthsimpleEmailData;
  duplicateAction?: 'accept' | 'reject' | 'review';
  reviewQueueId?: string;
  error?: string;
  processingTime: number;
}

export interface IMAPProcessorStats {
  connected: boolean;
  totalProcessed: number;
  successful: number;
  failed: number;
  duplicates: number;
  reviewRequired: number;
  lastProcessedAt?: string;
  connectionUptime: number;
  averageProcessingTime: number;
}

/**
 * IMAP Email Processor
 * Automatically fetches and processes emails from configured email server
 */
export class IMAPEmailProcessor {
  private client: ImapFlow | null = null;
  private config: IMAPConfig;
  private isConnected = false;
  private isProcessing = false;
  private connectionStartTime = 0;
  private stats: IMAPProcessorStats;
  
  // Processing options
  private readonly pollInterval = 30000; // 30 seconds
  private readonly processedUIDs = new Set<number>();

  constructor(config: IMAPConfig) {
    this.config = config;
    this.stats = {
      connected: false,
      totalProcessed: 0,
      successful: 0,
      failed: 0,
      duplicates: 0,
      reviewRequired: 0,
      connectionUptime: 0,
      averageProcessingTime: 0
    };
  }

  /**
   * Connect to IMAP server
   */
  async connect(): Promise<void> {
    try {
      if (this.isConnected && this.client) {
        console.log('📧 IMAP: Already connected');
        return;
      }

      console.log(`📧 IMAP: Connecting to ${this.config.host}:${this.config.port}...`);

      this.client = new ImapFlow({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
        logger: this.config.logger || false
      });

      // Connect and authenticate
      await this.client.connect();
      
      this.isConnected = true;
      this.connectionStartTime = Date.now();
      this.stats.connected = true;

      console.log('✅ IMAP: Connected successfully');

      // Set up event handlers
      this.setupEventHandlers();

    } catch (error) {
      console.error('❌ IMAP: Connection failed:', error);
      this.isConnected = false;
      this.stats.connected = false;
      throw new Error(`IMAP connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Disconnect from IMAP server
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client && this.isConnected) {
        await this.client.logout();
        this.client = null;
      }
      
      this.isConnected = false;
      this.stats.connected = false;
      
      console.log('📧 IMAP: Disconnected');
    } catch (error) {
      console.error('❌ IMAP: Disconnect error:', error);
    }
  }

  /**
   * Setup event handlers for IMAP client
   */
  private setupEventHandlers(): void {
    if (!this.client) return;

    // Handle connection close
    this.client.on('close', () => {
      console.log('📧 IMAP: Connection closed');
      this.isConnected = false;
      this.stats.connected = false;
    });

    // Handle errors
    this.client.on('error', (error: Error) => {
      console.error('❌ IMAP: Connection error:', error);
      this.isConnected = false;
      this.stats.connected = false;
    });

    // Handle new messages
    this.client.on('exists', async (data: { count: number }) => {
      console.log(`📧 IMAP: ${data.count} messages exist in mailbox`);
      
      // Process new messages if not already processing
      if (!this.isProcessing) {
        await this.processNewEmails();
      }
    });
  }

  /**
   * Process new emails from INBOX
   */
  async processNewEmails(portfolioId = 'default'): Promise<ProcessingResult[]> {
    if (!this.client || !this.isConnected) {
      throw new Error('IMAP client not connected');
    }

    if (this.isProcessing) {
      console.log('📧 IMAP: Already processing emails, skipping...');
      return [];
    }

    this.isProcessing = true;
    const results: ProcessingResult[] = [];

    try {
      console.log('📧 IMAP: Processing new emails...');

      // Select INBOX
      await this.client.mailboxOpen('INBOX');

      // Search for unread emails from Wealthsimple
      const searchQuery = {
        unseen: true,
        from: 'wealthsimple'
      };

      const messages = this.client.fetch(searchQuery, {
        uid: true,
        envelope: true,
        bodyStructure: true,
        source: true
      });

      for await (const message of messages) {
        const startTime = Date.now();
        
        try {
          // Skip if already processed
          if (this.processedUIDs.has(message.uid)) {
            continue;
          }

          console.log(`📧 IMAP: Processing email UID ${message.uid}...`);

          // Extract email data
          const emailMessage = this.extractEmailMessage(message);
          
          // Process the email through existing service
          const result = await this.processEmailMessage(emailMessage, portfolioId);
          
          results.push(result);
          this.updateStats(result, Date.now() - startTime);

          // Mark as processed
          this.processedUIDs.add(message.uid);

          // Mark as read in IMAP
          await this.client.messageFlagsAdd(message.uid, ['\\Seen'], { uid: true });

          console.log(`✅ IMAP: Processed email UID ${message.uid} successfully`);

        } catch (error) {
          console.error(`❌ IMAP: Failed to process email UID ${message.uid}:`, error);
          
          const processingTime = Date.now() - startTime;
          const failedResult: ProcessingResult = {
            uid: message.uid,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            processingTime
          };
          
          results.push(failedResult);
          this.updateStats(failedResult, processingTime);
        }
      }

      console.log(`📧 IMAP: Finished processing ${results.length} emails`);

    } catch (error) {
      console.error('❌ IMAP: Error processing new emails:', error);
      throw error;
    } finally {
      this.isProcessing = false;
    }

    return results;
  }

  /**
   * Extract email message data from IMAP message
   */
  private extractEmailMessage(message: unknown): EmailMessage {
    const msg = message as {
      source?: string | Buffer;
      envelope?: {
        subject?: string;
        from?: Array<{ address?: string }>;
        date?: Date;
      };
      uid?: number;
      flags?: Set<string>;
    };
    // Parse headers
    const headers = new Map<string, string>();
    if (msg.source) {
      const headerText = msg.source.toString().split('\r\n\r\n')[0];
      const headerLines = headerText.split('\r\n');
      
      for (const line of headerLines) {
        const match = line.match(/^([^:]+):\s*(.+)$/);
        if (match) {
          headers.set(match[1].toLowerCase(), match[2]);
        }
      }
    }

    // Extract subject and from
    const subject = msg.envelope?.subject || 'No Subject';
    const from = msg.envelope?.from?.[0]?.address || 'unknown';
    const date = msg.envelope?.date || new Date();

    // Extract body content (simplified - in production would need better MIME parsing)
    let html = '';
    let text = '';
    
    if (msg.source) {
      const bodyPart = msg.source.toString().split('\r\n\r\n').slice(1).join('\r\n\r\n');
      
      // Simple HTML detection
      if (bodyPart.includes('<html>') || bodyPart.includes('<HTML>')) {
        html = bodyPart;
      } else {
        text = bodyPart;
        // Convert to basic HTML
        html = `<html><body><pre>${bodyPart.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre></body></html>`;
      }
    }

    return {
      uid: msg.uid || 0,
      subject,
      from,
      date,
      html,
      text,
      headers
    };
  }

  /**
   * Process individual email message
   */
  private async processEmailMessage(
    emailMessage: EmailMessage,
    portfolioId: string
  ): Promise<ProcessingResult> {
    const startTime = Date.now();

    try {
      // Process email through existing service
      const processingResult = await EmailProcessingService.processEmail(
        emailMessage.subject,
        emailMessage.from,
        emailMessage.html || '',
        emailMessage.text
      );

      if (!processingResult.success || !processingResult.emailData) {
        return {
          uid: emailMessage.uid,
          success: false,
          error: processingResult.errors?.join(', ') || 'Email processing failed',
          processingTime: Date.now() - startTime
        };
      }

      // Run duplicate detection
      const duplicateResult = await MultiLevelDuplicateDetection.detectDuplicates(
        processingResult.emailData,
        portfolioId
      );

      let reviewQueueId: string | undefined;

      // Add to review queue if needed
      if (duplicateResult.recommendation === 'review') {
        const identification = {
          messageId: emailMessage.headers.get('message-id') || `generated-${Date.now()}`,
          emailHash: `hash-${emailMessage.uid}`,
          contentHash: `content-${emailMessage.uid}`,
          orderIds: [],
          confirmationNumbers: [],
          transactionHash: `tx-${emailMessage.uid}`,
          fromEmail: emailMessage.from,
          subject: emailMessage.subject,
          timestamp: emailMessage.date.toISOString(),
          extractedAt: new Date().toISOString(),
          extractionMethod: 'IMAP',
          confidence: 0.9
        };

        const queueItem = await ManualReviewQueue.addToQueue(
          processingResult.emailData,
          identification,
          duplicateResult,
          portfolioId
        );

        reviewQueueId = queueItem.id;
      }

      return {
        uid: emailMessage.uid,
        success: true,
        emailData: processingResult.emailData,
        duplicateAction: duplicateResult.recommendation,
        reviewQueueId,
        processingTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        uid: emailMessage.uid,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Update processing statistics
   */
  private updateStats(result: ProcessingResult, processingTime: number): void {
    this.stats.totalProcessed++;
    
    if (result.success) {
      this.stats.successful++;
      
      if (result.duplicateAction === 'reject') {
        this.stats.duplicates++;
      } else if (result.duplicateAction === 'review') {
        this.stats.reviewRequired++;
      }
    } else {
      this.stats.failed++;
    }

    this.stats.lastProcessedAt = new Date().toISOString();
    this.stats.connectionUptime = this.connectionStartTime > 0 
      ? Date.now() - this.connectionStartTime 
      : 0;

    // Update average processing time
    const totalTime = (this.stats.averageProcessingTime * (this.stats.totalProcessed - 1)) + processingTime;
    this.stats.averageProcessingTime = totalTime / this.stats.totalProcessed;
  }

  /**
   * Start continuous email monitoring
   */
  async startMonitoring(portfolioId = 'default'): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    console.log(`📧 IMAP: Starting email monitoring (polling every ${this.pollInterval}ms)...`);

    // Initial processing
    await this.processNewEmails(portfolioId);

    // Set up polling interval
    const intervalId = setInterval(async () => {
      try {
        if (this.isConnected && !this.isProcessing) {
          await this.processNewEmails(portfolioId);
        }
      } catch (error) {
        console.error('❌ IMAP: Error during monitoring:', error);
        
        // Try to reconnect
        try {
          await this.connect();
        } catch (reconnectError) {
          console.error('❌ IMAP: Reconnection failed:', reconnectError);
        }
      }
    }, this.pollInterval);

    // Store interval ID for cleanup
    (this as any).monitoringIntervalId = intervalId;

    console.log('✅ IMAP: Email monitoring started');
  }

  /**
   * Stop email monitoring
   */
  stopMonitoring(): void {
    if ((this as any).monitoringIntervalId) {
      clearInterval((this as any).monitoringIntervalId);
      (this as any).monitoringIntervalId = null;
    }

    console.log('📧 IMAP: Email monitoring stopped');
  }

  /**
   * Get current processor statistics
   */
  getStats(): IMAPProcessorStats {
    return { ...this.stats };
  }

  /**
   * Test IMAP connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string; serverInfo?: unknown }> {
    try {
      const testClient = new ImapFlow({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
        logger: false
      });

      await testClient.connect();
      
      const serverInfo = {
        capability: testClient.serverInfo,
        connected: true
      };

      await testClient.logout();

      return {
        success: true,
        serverInfo
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get connection status
   */
  isConnectedToServer(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Clear processed UIDs (useful for reprocessing)
   */
  clearProcessedUIDs(): void {
    this.processedUIDs.clear();
    console.log('📧 IMAP: Cleared processed UIDs cache');
  }
}

export default IMAPEmailProcessor;