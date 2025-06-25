/**
 * Scheduler for running email sync at regular intervals
 */

import cron from 'node-cron';
import { logger } from './logger.js';
import { config } from './config.js';
import { EmailSyncManager } from './sync-manager.js';

export class EmailScheduler {
  private syncManager: EmailSyncManager;
  private scheduledTask: any = null;
  private isRunning = false;

  constructor() {
    this.syncManager = new EmailSyncManager();
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (!config.enableScheduler) {
      logger.info('Scheduler disabled by configuration');
      return;
    }

    if (this.scheduledTask) {
      logger.warn('Scheduler already running');
      return;
    }

    // Convert interval minutes to cron expression
    // For simplicity, we'll use a fixed interval approach
    const cronExpression = this.generateCronExpression(config.syncIntervalMinutes);

    logger.info(`Starting email sync scheduler with interval: ${config.syncIntervalMinutes} minutes`);
    logger.info(`Cron expression: ${cronExpression}`);

    this.scheduledTask = cron.schedule(cronExpression, async () => {
      logger.info('🕐 Scheduled sync triggered by cron');
      await this.runSync();
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    logger.info('Email scheduler started successfully');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (this.scheduledTask) {
      this.scheduledTask.stop();
      this.scheduledTask = null;
      logger.info('Email scheduler stopped');
    }
  }

  /**
   * Run a single sync operation
   */
  async runSync(): Promise<void> {
    logger.info('📧 Email sync requested');
    
    if (this.isRunning) {
      logger.warn('⚠️ Sync already in progress, skipping this run');
      return;
    }

    try {
      this.isRunning = true;
      logger.info('🚀 Starting scheduled email sync');
      
      const result = await this.syncManager.syncAllConfigurations();
      
      logger.info(`Scheduled sync completed: ${result.totalEmailsSynced} emails synced, ${result.configurationsSynced} configurations processed`);
      
      if (result.errors.length > 0) {
        logger.warn(`Sync completed with ${result.errors.length} errors:`);
        result.errors.forEach(error => logger.warn(`- ${error}`));
      }

    } catch (error) {
      logger.error('Scheduled sync failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Run sync once immediately (for manual triggers)
   */
  async runOnce(): Promise<void> {
    logger.info('Running email sync once (manual trigger)');
    await this.runSync();
  }

  /**
   * Generate cron expression from interval minutes
   */
  private generateCronExpression(intervalMinutes: number): string {
    if (intervalMinutes >= 60) {
      // For intervals >= 60 minutes, run at hour intervals
      const hours = Math.floor(intervalMinutes / 60);
      return `0 */${hours} * * *`;
    } else if (intervalMinutes >= 30) {
      // For 30+ minute intervals - run every N minutes
      return `0 */${intervalMinutes} * * *`;
    } else if (intervalMinutes >= 15) {
      // For 15+ minute intervals - run every N minutes
      return `0 */${intervalMinutes} * * *`;
    } else if (intervalMinutes >= 5) {
      // For 5+ minute intervals - run every N minutes
      return `0 */${intervalMinutes} * * *`;
    } else {
      // Minimum 5 minute interval for safety
      return `0 */5 * * *`;
    }
  }

  /**
   * Get scheduler status
   */
  getStatus(): { isScheduled: boolean; isRunning: boolean; nextRun?: Date } {
    return {
      isScheduled: !!this.scheduledTask,
      isRunning: this.isRunning,
      nextRun: this.scheduledTask ? new Date(Date.now() + config.syncIntervalMinutes * 60 * 1000) : undefined
    };
  }
}

// Export singleton instance
export const emailScheduler = new EmailScheduler();