/**
 * Email-Puller Sync Request Monitor
 * Monitors database for manual sync requests and processes them
 */

import { database } from './database.js';
import { logger } from './logger.js';

export interface SyncRequest {
  id: string;
  user_id: string;
  request_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requested_at: string;
  processed_at?: string;
  result?: SyncRequestResult;
}

export interface SyncRequestResult {
  success: boolean;
  message?: string;
  error?: string;
  emailsProcessed?: number;
  timestamp: string;
}

export class SyncRequestMonitor {
  private isRunning = false;
  private pollInterval = 10000; // 10 seconds
  private timeoutId?: NodeJS.Timeout;

  /**
   * Start monitoring for sync requests
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Sync request monitor is already running');
      return;
    }

    this.isRunning = true;
    logger.info('🔄 Starting database sync request monitor...');
    this.pollForRequests();
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    this.isRunning = false;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }
    logger.info('⏹️ Sync request monitor stopped');
  }

  /**
   * Poll for pending sync requests
   */
  private async pollForRequests(): Promise<void> {
    if (!this.isRunning) return;

    try {
      await this.checkForSyncRequests();
    } catch (error) {
      logger.error('Error in sync request polling:', error);
    }

    // Schedule next poll
    this.timeoutId = setTimeout(() => {
      this.pollForRequests();
    }, this.pollInterval);
  }

  /**
   * Check for and process pending sync requests
   */
  private async checkForSyncRequests(): Promise<void> {
    try {
      // Get pending sync requests
      const { data: requests, error } = await database['client']
        .from('sync_requests')
        .select('*')
        .eq('status', 'pending')
        .order('requested_at', { ascending: true })
        .limit(10);

      if (error) {
        logger.error('Error checking sync requests:', error);
        return;
      }

      if (!requests || requests.length === 0) {
        return; // No pending requests
      }

      logger.info(`📧 Found ${requests.length} pending sync requests`);

      // Process each request
      for (const request of requests) {
        await this.processSyncRequest(request);
      }
    } catch (error) {
      logger.error('Error in checkForSyncRequests:', error);
    }
  }

  /**
   * Process a single sync request
   */
  private async processSyncRequest(request: SyncRequest): Promise<void> {
    try {
      logger.info(`🔄 Processing sync request ${request.id} for user ${request.user_id}`);

      // Mark as processing
      await this.updateSyncRequestStatus(request.id, 'processing');

      // Perform the actual sync
      const syncResult = await this.performSync(request);

      if (syncResult.success) {
        // Mark as completed
        await this.updateSyncRequestStatus(request.id, 'completed', {
          success: true,
          message: 'Sync completed successfully',
          emailsProcessed: syncResult.emailsProcessed || 0,
          timestamp: new Date().toISOString()
        });
        
        logger.info(`✅ Completed sync request ${request.id}`);
      } else {
        // Mark as failed
        await this.updateSyncRequestStatus(request.id, 'failed', {
          success: false,
          error: syncResult.error || 'Unknown sync error',
          timestamp: new Date().toISOString()
        });
        
        logger.error(`❌ Failed sync request ${request.id}:`, syncResult.error);
      }

    } catch (error) {
      logger.error(`❌ Error processing sync request ${request.id}:`, error);
      
      // Mark as failed
      await this.updateSyncRequestStatus(request.id, 'failed', {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown processing error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Perform the actual email sync for a specific user
   */
  private async performSync(request: SyncRequest): Promise<{ success: boolean; error?: string; emailsProcessed?: number }> {
    try {
      logger.info(`🔄 Starting email sync for user ${request.user_id}`);
      
      // Get IMAP configurations for this user
      const { data: imapConfigs, error: configError } = await database['client']
        .from('imap_configurations')
        .select('*')
        .eq('user_id', request.user_id)
        .eq('is_active', true);

      if (configError) {
        logger.error('Error fetching IMAP configs:', configError);
        return { success: false, error: 'Failed to fetch IMAP configurations' };
      }

      if (!imapConfigs || imapConfigs.length === 0) {
        logger.warn(`No active IMAP configurations for user ${request.user_id}`);
        return { success: false, error: 'No active IMAP configurations found' };
      }

      logger.info(`Found ${imapConfigs.length} IMAP configurations for user ${request.user_id}`);

      let totalEmailsProcessed = 0;
      let hasErrors = false;
      const errors: string[] = [];

      // Process each IMAP configuration
      for (const config of imapConfigs) {
        try {
          // Import and use the sync logic from your existing email-puller
          const { emailSyncManager } = await import('./sync-manager.js');
          
          const result = await emailSyncManager.syncConfiguration(config);
          totalEmailsProcessed += result.emailsSynced || 0;
          
          logger.info(`✅ Synced ${result.emailsSynced || 0} emails for config ${config.gmail_email}`);
          
        } catch (configError) {
          hasErrors = true;
          const errorMsg = `Failed to sync ${config.gmail_email}: ${configError instanceof Error ? configError.message : 'Unknown error'}`;
          errors.push(errorMsg);
          logger.error(errorMsg);
        }
      }

      if (hasErrors && totalEmailsProcessed === 0) {
        return { 
          success: false, 
          error: `All configurations failed: ${errors.join(', ')}` 
        };
      }

      return {
        success: true,
        emailsProcessed: totalEmailsProcessed
      };
      
    } catch (error) {
      logger.error('Error performing sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown sync error'
      };
    }
  }

  /**
   * Update sync request status in database
   */
  private async updateSyncRequestStatus(
    requestId: string, 
    status: SyncRequest['status'], 
    result?: SyncRequestResult
  ): Promise<void> {
    try {
      const updateData: { status: SyncRequest['status']; processed_at: string; result?: SyncRequestResult } = {
        status,
        processed_at: new Date().toISOString()
      };

      if (result) {
        updateData.result = result;
      }

      const { error } = await database['client']
        .from('sync_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) {
        logger.error(`Failed to update sync request ${requestId}:`, error);
      }
    } catch (error) {
      logger.error(`Error updating sync request ${requestId}:`, error);
    }
  }

  /**
   * Clean up old sync requests (optional maintenance)
   */
  async cleanupOldRequests(olderThanDays: number = 7): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      const { error } = await database['client']
        .from('sync_requests')
        .delete()
        .lt('requested_at', cutoffDate.toISOString());

      if (error) {
        logger.error('Error cleaning up old sync requests:', error);
      } else {
        logger.info(`🧹 Cleaned up sync requests older than ${olderThanDays} days`);
      }
    } catch (error) {
      logger.error('Error in cleanup:', error);
    }
  }
}