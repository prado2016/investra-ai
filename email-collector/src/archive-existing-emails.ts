#!/usr/bin/env node

/**
 * One-time script to archive existing emails in Gmail that are already in the database
 * This solves the problem where emails appear in both Gmail INBOX and the database
 */

import { database } from './database.js';
import { ImapClient } from './imap-client.js';
import { logger } from './logger.js';

class ExistingEmailArchiver {
  /**
   * Archive all emails that exist in database but are still in Gmail INBOX
   */
  async archiveExistingEmails(): Promise<void> {
    try {
      logger.info('🚀 Starting archive of existing emails...');

      // Get all active IMAP configurations
      const configurations = await database.getActiveImapConfigurations();
      
      if (configurations.length === 0) {
        logger.warn('⚠️  No active IMAP configurations found');
        return;
      }

      logger.info(`📧 Found ${configurations.length} active email configurations`);

      // Process each configuration
      for (const config of configurations) {
        await this.archiveEmailsForConfig(config);
      }

      logger.info('✅ Archive process completed successfully');

    } catch (error) {
      logger.error('❌ Archive process failed:', error);
      throw error;
    }
  }

  /**
   * Archive emails for a specific configuration
   */
  private async archiveEmailsForConfig(config: any): Promise<void> {
    let imapClient: ImapClient | null = null;

    try {
      logger.info(`📧 Processing configuration: ${config.gmail_email}`);

      // Get emails from database that are NOT archived
      const emailsToArchive = await database.getEmailsAboveUID(config.user_id, 0, 1000);
      
      if (emailsToArchive.length === 0) {
        logger.info(`✅ No emails to archive for ${config.gmail_email}`);
        return;
      }

      logger.info(`📦 Found ${emailsToArchive.length} emails to archive for ${config.gmail_email}`);

      // Connect to Gmail
      imapClient = new ImapClient(config);
      await imapClient.connect();

      // Get UIDs of emails to archive
      const uidsToArchive = emailsToArchive
        .filter(email => email.uid && !email.archived_in_gmail)
        .map(email => email.uid!);

      if (uidsToArchive.length === 0) {
        logger.info(`✅ No emails with UIDs to archive for ${config.gmail_email}`);
        return;
      }

      // Move emails to archive folder in Gmail
      const archiveFolder = config.archive_folder || 'Investra/Processed';
      logger.info(`📁 Moving ${uidsToArchive.length} emails to ${archiveFolder}`);
      
      await imapClient.moveEmailsToFolder(uidsToArchive, archiveFolder);
      
      // Mark emails as archived in database
      const messageIds = emailsToArchive
        .filter(email => email.uid && !email.archived_in_gmail)
        .map(email => email.message_id);

      const archivedCount = await database.markEmailsAsArchived(messageIds, config.user_id, archiveFolder);
      
      logger.info(`✅ Successfully archived ${archivedCount} emails for ${config.gmail_email}`);

      // Update last processed UID to highest UID
      if (uidsToArchive.length > 0) {
        const highestUID = Math.max(...uidsToArchive);
        await database.updateLastProcessedUID(config.id, highestUID);
        logger.info(`📍 Updated last processed UID to ${highestUID} for ${config.gmail_email}`);
      }

    } catch (error) {
      logger.error(`❌ Failed to archive emails for ${config.gmail_email}:`, error);
      throw error;
    } finally {
      if (imapClient) {
        await imapClient.disconnect();
      }
    }
  }
}

// Run the archiver if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const archiver = new ExistingEmailArchiver();
  
  archiver.archiveExistingEmails()
    .then(() => {
      logger.info('🎉 Archive process completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('💥 Archive process failed:', error);
      process.exit(1);
    });
}