/**
 * Email sync manager - coordinates IMAP fetching and database storage
 */

import { logger } from './logger.js';
import { database, type ImapConfiguration } from './database.js';
import { ImapClient } from './imap-client.js';
import { config } from './config.js';

export interface SyncResult {
  success: boolean;
  emailsSynced: number;
  error?: string;
  configurationId: string;
  userEmail: string;
}

export interface SyncSummary {
  totalEmailsSynced: number;
  configurationsSynced: number;
  configurationsTotal: number;
  errors: string[];
  startTime: Date;
  endTime: Date;
  duration: number;
}

export class EmailSyncManager {
  
  /**
   * Sync emails for all active IMAP configurations
   */
  async syncAllConfigurations(): Promise<SyncSummary> {
    const startTime = new Date();
    logger.info('Starting email sync for all configurations');

    const summary: SyncSummary = {
      totalEmailsSynced: 0,
      configurationsSynced: 0,
      configurationsTotal: 0,
      errors: [],
      startTime,
      endTime: new Date(),
      duration: 0
    };

    try {
      // Test database connection first
      const dbConnected = await database.testConnection();
      if (!dbConnected) {
        throw new Error('Database connection failed');
      }

      // Get all active configurations
      const configurations = await database.getActiveImapConfigurations();
      summary.configurationsTotal = configurations.length;

      if (configurations.length === 0) {
        logger.info('No active IMAP configurations found');
        return this.finalizeSummary(summary);
      }

      logger.info(`Found ${configurations.length} active IMAP configurations`);

      // Sync each configuration
      for (const config of configurations) {
        try {
          const result = await this.syncConfiguration(config);
          
          if (result.success) {
            summary.totalEmailsSynced += result.emailsSynced;
            summary.configurationsSynced++;
            logger.info(`✅ ${config.gmail_email}: ${result.emailsSynced} emails synced`);
          } else {
            summary.errors.push(`${config.gmail_email}: ${result.error}`);
            logger.error(`❌ ${config.gmail_email}: ${result.error}`);
          }

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          summary.errors.push(`${config.gmail_email}: ${errorMessage}`);
          logger.error(`❌ ${config.gmail_email}: ${errorMessage}`);
        }

        // Small delay between configurations to avoid overwhelming the system
        await this.delay(1000);
      }

      return this.finalizeSummary(summary);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      summary.errors.push(`Global sync error: ${errorMessage}`);
      logger.error('Global sync error:', error);
      return this.finalizeSummary(summary);
    }
  }

  /**
   * Sync emails for a single IMAP configuration
   */
  async syncConfiguration(imapConfig: ImapConfiguration): Promise<SyncResult> {
    const result: SyncResult = {
      success: false,
      emailsSynced: 0,
      configurationId: imapConfig.id,
      userEmail: imapConfig.gmail_email
    };

    let imapClient: ImapClient | null = null;

    try {
      // Update status to syncing
      await database.updateImapConfigStatus(imapConfig.id, 'syncing');

      // Create and connect IMAP client
      imapClient = new ImapClient(imapConfig);
      await imapClient.connect();

      // Fetch recent emails
      logger.debug(`Fetching up to ${imapConfig.max_emails_per_sync} emails for ${imapConfig.gmail_email}`);
      const emails = await imapClient.fetchRecentEmails(imapConfig.max_emails_per_sync);

      if (emails.length === 0) {
        logger.info(`No new emails found for ${imapConfig.gmail_email}`);
        result.success = true;
        await database.updateImapConfigStatus(imapConfig.id, 'success');
        return result;
      }

      // Convert emails to database format
      const emailData = emails.map(email => 
        imapClient!.emailToDbFormat(email, imapConfig.user_id)
      );

      // Insert emails into database
      const insertedCount = await database.insertEmails(emailData);
      result.emailsSynced = insertedCount;

      // Move emails to processed folder if archiving is enabled and emails were inserted
      if (config.archiveAfterSync && insertedCount > 0) {
        try {
          // Get UIDs of emails that were actually inserted (not skipped duplicates)
          // For now, move all fetched emails since we fetched recent ones
          const allUIDs = emails.map(email => email.uid);
          
          if (allUIDs.length > 0) {
            await imapClient.moveEmailsToFolder(allUIDs, config.processedFolderName);
            logger.info(`Moved ${allUIDs.length} emails to ${config.processedFolderName}`);
          }
        } catch (moveError) {
          logger.warn(`Failed to move emails to processed folder: ${moveError instanceof Error ? moveError.message : 'Unknown error'}`);
          // Don't fail the entire sync if moving fails
        }
      }

      // Update configuration status and email count
      await database.updateImapConfigStatus(imapConfig.id, 'success');
      await database.updateEmailsSynced(imapConfig.id, imapConfig.emails_synced + insertedCount);

      result.success = true;
      logger.info(`Successfully synced ${insertedCount} emails for ${imapConfig.gmail_email}`);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.error = errorMessage;
      
      // Update configuration status with error
      await database.updateImapConfigStatus(imapConfig.id, 'error', errorMessage);
      
      logger.error(`Failed to sync ${imapConfig.gmail_email}:`, error);

    } finally {
      // Always disconnect IMAP client
      if (imapClient) {
        await imapClient.disconnect();
      }
    }

    return result;
  }

  /**
   * Test connection for a specific configuration
   */
  async testConfiguration(config: ImapConfiguration): Promise<boolean> {
    let imapClient: ImapClient | null = null;

    try {
      logger.info(`Testing IMAP connection for ${config.gmail_email}`);
      
      imapClient = new ImapClient(config);
      const connected = await imapClient.testConnection();
      
      if (connected) {
        logger.info(`✅ Connection test successful for ${config.gmail_email}`);
        await database.updateImapConfigStatus(config.id, 'success');
        return true;
      } else {
        logger.error(`❌ Connection test failed for ${config.gmail_email}`);
        await database.updateImapConfigStatus(config.id, 'error', 'Connection test failed');
        return false;
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`❌ Connection test failed for ${config.gmail_email}:`, error);
      await database.updateImapConfigStatus(config.id, 'error', errorMessage);
      return false;

    } finally {
      if (imapClient) {
        await imapClient.disconnect();
      }
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<any> {
    try {
      const configurations = await database.getActiveImapConfigurations();
      
      const stats = {
        totalConfigurations: configurations.length,
        activeConfigurations: configurations.filter(c => c.is_active).length,
        recentSyncs: configurations.filter(c => {
          if (!c.last_sync_at) return false;
          const lastSync = new Date(c.last_sync_at);
          const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
          return lastSync > hourAgo;
        }).length,
        totalEmailsSynced: configurations.reduce((sum, c) => sum + c.emails_synced, 0),
        configurationsWithErrors: configurations.filter(c => c.sync_status === 'error').length
      };

      return stats;
    } catch (error) {
      logger.error('Failed to get sync stats:', error);
      throw error;
    }
  }

  /**
   * Finalize sync summary with timing information
   */
  private finalizeSummary(summary: SyncSummary): SyncSummary {
    summary.endTime = new Date();
    summary.duration = summary.endTime.getTime() - summary.startTime.getTime();
    
    logger.info(`Sync completed in ${summary.duration}ms`);
    logger.info(`Total: ${summary.totalEmailsSynced} emails, ${summary.configurationsSynced}/${summary.configurationsTotal} configs`);
    
    if (summary.errors.length > 0) {
      logger.warn(`Errors: ${summary.errors.length}`);
    }

    return summary;
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const emailSyncManager = new EmailSyncManager();