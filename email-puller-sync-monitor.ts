/**
 * Email-Puller Sync Request Monitor
 * Add this to your email-puller project
 */

// CREATE NEW FILE: email-puller/src/sync-request-monitor.ts

import { database } from './database.js';
import { logger } from './logger.js';
import { SyncManager } from './sync-manager.js';

export interface SyncRequest {
  id: string;
  user_id: string;
  request_type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requested_at: string;
  processed_at?: string;
  result?: any;
}

export class SyncRequestMonitor {
  private syncManager: SyncManager;
  private isRunning = false;
  private pollInterval = 10000; // 10 seconds
  private timeoutId?: NodeJS.Timeout;

  constructor(syncManager: SyncManager) {
    this.syncManager = syncManager;
  }

  /**
   * Start monitoring for sync requests
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Sync request monitor is already running');
      return;
    }

    this.isRunning = true;
    logger.info('🔄 Starting sync request monitor...');
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
   * Perform the actual email sync
   */
  private async performSync(request: SyncRequest): Promise<{ success: boolean; error?: string; emailsProcessed?: number }> {
    try {
      logger.info(`🔄 Starting email sync for user ${request.user_id}`);
      
      // Use the existing sync manager to perform sync for specific user
      // Note: You may need to modify your sync manager to support user-specific syncing
      const result = await this.syncManager.syncEmailsForUser(request.user_id);
      
      return {
        success: true,
        emailsProcessed: result?.emailsProcessed || 0
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
    result?: any
  ): Promise<void> {
    try {
      const updateData: any = {
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

// INTEGRATION CODE: Add this to your main email-puller startup file

/*
// In your main email-puller file (e.g., imap-puller.ts):

import { SyncRequestMonitor } from './sync-request-monitor.js';
import { SyncManager } from './sync-manager.js';

// Create sync manager instance
const syncManager = new SyncManager();

// Create and start sync request monitor
const syncMonitor = new SyncRequestMonitor(syncManager);
syncMonitor.start();

// Cleanup old requests daily
setInterval(() => {
  syncMonitor.cleanupOldRequests(7);
}, 24 * 60 * 60 * 1000); // Daily cleanup

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down sync monitor...');
  syncMonitor.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down sync monitor...');
  syncMonitor.stop();
  process.exit(0);
});
*/