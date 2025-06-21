#!/usr/bin/env node

/**
 * Main entry point for the Investra Email Puller
 * Standalone application for pulling emails from Gmail via IMAP
 */

import { config, validateConfig } from './config.js';
import { logger } from './logger.js';
import { database } from './database.js';
import { emailScheduler } from './scheduler.js';
import { emailSyncManager } from './sync-manager.js';

class EmailPuller {
  private isShuttingDown = false;

  /**
   * Initialize and start the email puller
   */
  async start(): Promise<void> {
    try {
      logger.info('🚀 Starting Investra Email Puller');
      logger.info(`Version: 1.0.0`);
      logger.info(`Node.js: ${process.version}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

      // Validate configuration
      const configErrors = validateConfig();
      if (configErrors.length > 0) {
        logger.error('Configuration validation failed:');
        configErrors.forEach(error => logger.error(`  - ${error}`));
        process.exit(1);
      }

      logger.info('✅ Configuration validation passed');

      // Test database connection
      const dbConnected = await database.testConnection();
      if (!dbConnected) {
        logger.error('❌ Database connection failed');
        process.exit(1);
      }

      logger.info('✅ Database connection verified');

      // Set up graceful shutdown handlers
      this.setupShutdownHandlers();

      // Decide whether to run once or start scheduler
      if (config.runOnce) {
        await this.runOnce();
      } else {
        await this.startScheduler();
      }

    } catch (error) {
      logger.error('Failed to start email puller:', error);
      process.exit(1);
    }
  }

  /**
   * Run email sync once and exit
   */
  private async runOnce(): Promise<void> {
    try {
      logger.info('🔄 Running email sync once');
      
      const summary = await emailSyncManager.syncAllConfigurations();
      
      logger.info('📊 Sync Summary:');
      logger.info(`  - Total emails synced: ${summary.totalEmailsSynced}`);
      logger.info(`  - Configurations processed: ${summary.configurationsSynced}/${summary.configurationsTotal}`);
      logger.info(`  - Duration: ${summary.duration}ms`);
      logger.info(`  - Errors: ${summary.errors.length}`);

      if (summary.errors.length > 0) {
        logger.warn('❌ Errors encountered:');
        summary.errors.forEach(error => logger.warn(`  - ${error}`));
      }

      logger.info('✅ Email sync completed');
      
      // Exit with appropriate code
      process.exit(summary.errors.length > 0 ? 1 : 0);

    } catch (error) {
      logger.error('❌ Email sync failed:', error);
      process.exit(1);
    }
  }

  /**
   * Start the scheduler for continuous operation
   */
  private async startScheduler(): Promise<void> {
    try {
      logger.info('📅 Starting email scheduler');
      logger.info(`  - Sync interval: ${config.syncIntervalMinutes} minutes`);
      logger.info(`  - Max emails per sync: ${config.maxEmailsPerSync}`);

      // Start the scheduler
      emailScheduler.start();

      // Run initial sync
      logger.info('🔄 Running initial email sync');
      await emailScheduler.runOnce();

      // Keep the process running
      logger.info('✅ Email puller is running');
      logger.info('Press Ctrl+C to stop');

      // Display status periodically
      this.startStatusLogger();

      // Keep process alive
      await this.keepAlive();

    } catch (error) {
      logger.error('❌ Failed to start scheduler:', error);
      process.exit(1);
    }
  }

  /**
   * Set up graceful shutdown handlers
   */
  private setupShutdownHandlers(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        logger.warn('Force shutdown');
        process.exit(1);
      }

      this.isShuttingDown = true;
      logger.info(`\n📤 Received ${signal}, shutting down gracefully...`);

      try {
        // Stop scheduler
        emailScheduler.stop();
        logger.info('✅ Scheduler stopped');

        // Wait a moment for any ongoing operations
        await new Promise(resolve => setTimeout(resolve, 2000));

        logger.info('✅ Email puller stopped');
        process.exit(0);

      } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error('💥 Uncaught exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('💥 Unhandled promise rejection:', reason);
      process.exit(1);
    });
  }

  /**
   * Start periodic status logging
   */
  private startStatusLogger(): void {
    const logInterval = 10 * 60 * 1000; // 10 minutes

    setInterval(async () => {
      try {
        const schedulerStatus = emailScheduler.getStatus();
        const syncStats = await emailSyncManager.getSyncStats();

        logger.info('📊 Status Update:');
        logger.info(`  - Scheduler: ${schedulerStatus.isScheduled ? 'Running' : 'Stopped'}`);
        logger.info(`  - Currently syncing: ${schedulerStatus.isRunning ? 'Yes' : 'No'}`);
        logger.info(`  - Active configurations: ${syncStats.activeConfigurations}`);
        logger.info(`  - Total emails synced: ${syncStats.totalEmailsSynced}`);
        logger.info(`  - Configurations with errors: ${syncStats.configurationsWithErrors}`);

      } catch (error) {
        logger.warn('Failed to get status update:', error);
      }
    }, logInterval);
  }

  /**
   * Keep the process alive
   */
  private async keepAlive(): Promise<void> {
    while (!this.isShuttingDown) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Export for testing
export { EmailPuller };

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const puller = new EmailPuller();
  puller.start().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}