#!/usr/bin/env node

/**
 * Database-driven Email Puller - New version with database configuration
 * This version only requires Supabase connection and gets everything else from database
 */

import * as Sentry from '@sentry/node';
import { DatabaseConfig } from './database-config.js';
import { logger } from './logger.js';
import { database } from './database.js';
import { emailSyncManager } from './sync-manager.js';
import { SyncRequestMonitor } from './sync-request-monitor.js';

// Minimal environment variables - only Supabase connection required
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

class DatabaseDrivenEmailPuller {
  private isShuttingDown = false;
  private syncMonitor?: SyncRequestMonitor;
  private dbConfig?: DatabaseConfig;
  private schedulerInterval?: NodeJS.Timeout;
  private statusInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;

  /**
   * Initialize and start the email puller with database configuration
   */
  async start(): Promise<void> {
    try {
      // Validate minimal requirements
      if (!SUPABASE_URL || !SUPABASE_KEY) {
        logger.error('❌ Missing required Supabase connection variables:');
        logger.error('- SUPABASE_URL or VITE_SUPABASE_URL');
        logger.error('- SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY');
        process.exit(1);
      }

      // Initialize Sentry if available
      if (process.env.SENTRY_DSN) {
        Sentry.init({
          dsn: process.env.SENTRY_DSN,
          environment: process.env.NODE_ENV || 'production',
          tracesSampleRate: 0.1,
          serverName: 'investra-email-puller-db',
          beforeSend(event) {
            event.tags = { ...event.tags, service: 'email-puller-db' };
            return event;
          },
        });
        logger.info('✅ Sentry initialized');
      }

      logger.info('🚀 Starting Database-Driven Investra Email Puller');
      logger.info(`Node.js: ${process.version}`);

      // Initialize database configuration
      this.dbConfig = new DatabaseConfig(SUPABASE_URL, SUPABASE_KEY);
      
      // Test database connection
      const connected = await this.dbConfig.testConnection();
      if (!connected) {
        logger.error('❌ Database connection failed');
        process.exit(1);
      }
      logger.info('✅ Database connection verified');

      // Load configuration from database
      const config = await this.dbConfig.loadConfig();
      logger.info('✅ Configuration loaded from database');

      // Test main database connection too
      const dbConnected = await database.testConnection();
      if (!dbConnected) {
        logger.error('❌ Main database connection failed');
        process.exit(1);
      }

      // Set up graceful shutdown
      this.setupShutdownHandlers();

      // Check if this is a one-time run
      const runOnce = process.env.RUN_ONCE === 'true';
      if (runOnce) {
        await this.runOnce();
      } else {
        await this.startContinuousOperation(config);
      }

    } catch (error) {
      logger.error('❌ Failed to start email puller:', error);
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(error);
        await Sentry.flush(2000);
      }
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
        summary.errors.forEach(error => logger.warn(`  - ${error}`));
      }

      logger.info('✅ Email sync completed');
      process.exit(summary.errors.length > 0 ? 1 : 0);

    } catch (error) {
      logger.error('❌ Email sync failed:', error);
      process.exit(1);
    }
  }

  /**
   * Start continuous operation with scheduler and monitoring
   */
  private async startContinuousOperation(config: SystemConfig): Promise<void> {
    try {
      logger.info('📅 Starting continuous email operation');
      logger.info(`  - Sync interval: ${config.syncIntervalMinutes} minutes`);
      logger.info(`  - Max emails per sync: ${config.maxEmailsPerSync}`);
      logger.info(`  - Scheduler enabled: ${config.enableScheduler}`);

      // Start database sync request monitor
      this.syncMonitor = new SyncRequestMonitor();
      this.syncMonitor.start();
      logger.info('✅ Database sync request monitor started');

      // Start scheduler if enabled
      if (config.enableScheduler) {
        this.schedulerInterval = setInterval(async () => {
          try {
            logger.info('🔄 Running scheduled email sync');
            await emailSyncManager.syncAllConfigurations();
          } catch (error) {
            logger.error('❌ Scheduled sync error:', error);
          }
        }, config.syncIntervalMinutes * 60 * 1000);
        
        logger.info(`✅ Scheduler started (${config.syncIntervalMinutes} minute intervals)`);
      }

      // Setup cleanup of old sync requests
      this.cleanupInterval = setInterval(async () => {
        try {
          if (this.syncMonitor) {
            await this.syncMonitor.cleanupOldRequests(config.cleanupOldRequestsDays);
          }
        } catch (error) {
          logger.error('❌ Cleanup error:', error);
        }
      }, 24 * 60 * 60 * 1000);

      // Run initial sync
      logger.info('🔄 Running initial email sync');
      try {
        await emailSyncManager.syncAllConfigurations();
        logger.info('✅ Initial sync completed');
      } catch (error) {
        logger.error('❌ Initial sync failed:', error);
      }

      // Start status logging
      this.startStatusLogger();

      logger.info('✅ Email puller is running with database configuration');
      logger.info('Press Ctrl+C to stop');

      // Keep process alive
      await this.keepAlive();

    } catch (error) {
      logger.error('❌ Failed to start continuous operation:', error);
      process.exit(1);
    }
  }

  /**
   * Start periodic status logging
   */
  private startStatusLogger(): void {
    this.statusInterval = setInterval(async () => {
      try {
        const syncStats = await emailSyncManager.getSyncStats();
        const configSnapshot = this.dbConfig?.getConfig();

        logger.info('📊 Status Update:');
        logger.info(`  - Active configurations: ${syncStats.activeConfigurations}`);
        logger.info(`  - Total emails synced: ${syncStats.totalEmailsSynced}`);
        logger.info(`  - Configurations with errors: ${syncStats.configurationsWithErrors}`);
        logger.info(`  - Sync interval: ${configSnapshot?.syncIntervalMinutes} minutes`);

      } catch (error) {
        logger.warn('Failed to get status update:', error);
      }
    }, 10 * 60 * 1000); // Every 10 minutes
  }

  /**
   * Setup graceful shutdown handlers
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
        // Clear intervals
        if (this.schedulerInterval) clearInterval(this.schedulerInterval);
        if (this.statusInterval) clearInterval(this.statusInterval);
        if (this.cleanupInterval) clearInterval(this.cleanupInterval);
        logger.info('✅ Scheduler stopped');

        // Stop sync monitor
        if (this.syncMonitor) {
          this.syncMonitor.stop();
          logger.info('✅ Sync monitor stopped');
        }

        // Wait for ongoing operations
        await new Promise(resolve => setTimeout(resolve, 2000));

        logger.info('✅ Database-driven email puller stopped');
        process.exit(0);

      } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGHUP', () => shutdown('SIGHUP'));

    process.on('uncaughtException', (error) => {
      logger.error('💥 Uncaught exception:', error);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason) => {
      logger.error('💥 Unhandled promise rejection:', reason);
      process.exit(1);
    });
  }

  /**
   * Keep process alive
   */
  private async keepAlive(): Promise<void> {
    while (!this.isShuttingDown) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Export for testing
export { DatabaseDrivenEmailPuller };

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const puller = new DatabaseDrivenEmailPuller();
  puller.start().catch(async (error) => {
    console.error('Fatal error:', error);
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(error);
      await Sentry.flush(2000);
    }
    process.exit(1);
  });
}