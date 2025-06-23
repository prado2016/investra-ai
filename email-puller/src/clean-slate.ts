/**
 * Clean Slate Script
 * Move all existing emails from Gmail INBOX to processed folder
 */

import { logger } from './logger.js';
import { database } from './database.js';
import { ImapClient } from './imap-client.js';
import { config } from './config.js';

const PROCESSED_FOLDER = 'Investra/Processed';

async function cleanSlate() {
  logger.info('🧹 Starting clean slate operation');
  logger.info(`Moving all INBOX emails to ${PROCESSED_FOLDER}`);

  try {
    // Test database connection
    const dbConnected = await database.testConnection();
    if (!dbConnected) {
      throw new Error('Database connection failed');
    }

    // Get all active IMAP configurations
    const configurations = await database.getActiveImapConfigurations();
    
    if (configurations.length === 0) {
      logger.info('No active IMAP configurations found');
      return;
    }

    logger.info(`Found ${configurations.length} IMAP configurations`);

    let totalMoved = 0;

    // Process each configuration
    for (const imapConfig of configurations) {
      logger.info(`\n📧 Processing ${imapConfig.gmail_email}`);
      
      let imapClient: ImapClient | null = null;
      
      try {
        // Create and connect IMAP client
        imapClient = new ImapClient(imapConfig);
        await imapClient.connect();

        // Move all inbox emails to processed folder in Gmail
        const movedCount = await imapClient.moveAllInboxEmails(PROCESSED_FOLDER);
        totalMoved += movedCount;

        logger.info(`✅ ${imapConfig.gmail_email}: ${movedCount} emails moved in Gmail`);

        // Archive all existing emails in database
        if (movedCount > 0) {
          try {
            // Get all emails for this user from imap_inbox
            const { data: inboxEmails, error } = await (database as any).client
              .from('imap_inbox')
              .select('message_id')
              .eq('user_id', imapConfig.user_id);

            if (error) {
              logger.warn(`Failed to get inbox emails for database archiving: ${error.message}`);
            } else if (inboxEmails && inboxEmails.length > 0) {
              const messageIds = inboxEmails.map((email: any) => email.message_id);
              const removedCount = await database.removeProcessedEmails(messageIds, imapConfig.user_id);
              logger.info(`✅ ${imapConfig.gmail_email}: ${removedCount} emails removed from database inbox`);
            }
          } catch (dbError) {
            logger.warn(`Failed to archive emails in database: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
          }
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error(`❌ ${imapConfig.gmail_email}: ${errorMessage}`);
        
      } finally {
        // Always disconnect
        if (imapClient) {
          await imapClient.disconnect();
        }
      }

      // Small delay between accounts
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    logger.info(`\n🎉 Clean slate completed!`);
    logger.info(`📊 Total emails moved: ${totalMoved}`);
    logger.info(`📂 Destination: ${PROCESSED_FOLDER}`);
    logger.info(`\nAll Gmail INBOXes are now clean and ready for fresh email syncing.`);

  } catch (error) {
    logger.error('❌ Clean slate operation failed:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  cleanSlate().then(() => {
    logger.info('Clean slate script completed');
    process.exit(0);
  }).catch((error) => {
    logger.error('Clean slate script failed:', error);
    process.exit(1);
  });
}

export { cleanSlate };