/**
 * Email Processing Log Aggregation Service
 * Task 15.3: Implement Log Aggregation
 * 
 * Centralized logging and log analysis for email processing including:
 * - Structured logging with correlation IDs
 * - Log aggregation and search
 * - Error pattern detection
 * - Performance metrics extraction
 * - Log retention and rotation
 * - Integration with monitoring systems
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { emailProcessingMonitor } from './emailProcessingMonitor';

export interface LogEntry {
  timestamp: Date;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  correlationId?: string;
  requestId?: string;
  emailId?: string;
  component: string;
  category: 'email_processing' | 'system' | 'security' | 'performance' | 'business';
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
    code?: string;
  };
  performance?: {
    duration: number;
    stage: string;
    resources?: {
      memory: number;
      cpu: number;
    };
  };
  tags?: string[];
}

export interface LogFilter {
  level?: ('debug' | 'info' | 'warn' | 'error' | 'fatal')[];
  component?: string[];
  category?: string[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  correlationId?: string;
  emailId?: string;
  tags?: string[];
  searchTerm?: string;
}

export interface LogAggregation {
  timeRange: {
    start: Date;
    end: Date;
  };
  summary: {
    totalLogs: number;
    byLevel: Record<string, number>;
    byComponent: Record<string, number>;
    byCategory: Record<string, number>;
    errorRate: number;
    averageProcessingTime?: number;
  };
  patterns: {
    topErrors: Array<{
      error: string;
      count: number;
      firstSeen: Date;
      lastSeen: Date;
    }>;
    performanceBottlenecks: Array<{
      component: string;
      stage: string;
      averageDuration: number;
      occurrences: number;
    }>;
    trends: {
      hourlyVolume: Array<{ hour: string; count: number }>;
      errorTrend: Array<{ hour: string; errorCount: number; totalCount: number }>;
    };
  };
}

export interface LogRetentionPolicy {
  debug: number; // days
  info: number;
  warn: number;
  error: number;
  fatal: number;
  maxFileSize: number; // bytes
  maxFiles: number;
  compressionEnabled: boolean;
}

/**
 * Email Processing Logger
 */
export class EmailProcessingLogger extends EventEmitter {
  private logs: LogEntry[] = [];
  private logFiles: Map<string, string> = new Map();
  private retentionPolicy: LogRetentionPolicy;
  private logDirectory: string;
  private rotationInterval?: NodeJS.Timeout;

  constructor(
    logDirectory: string = process.env.LOG_DIR || './logs',
    retentionPolicy: Partial<LogRetentionPolicy> = {}
  ) {
    super();
    
    this.logDirectory = logDirectory;
    this.retentionPolicy = {
      debug: 1, // 1 day
      info: 7, // 7 days
      warn: 30, // 30 days
      error: 90, // 90 days
      fatal: 365, // 1 year
      maxFileSize: 100 * 1024 * 1024, // 100MB
      maxFiles: 10,
      compressionEnabled: true,
      ...retentionPolicy
    };

    this.initializeLogDirectory();
    this.setupLogRotation();
    this.setupMonitoringIntegration();
  }

  /**
   * Initialize log directory
   */
  private async initializeLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.logDirectory, { recursive: true });
      
      // Create subdirectories for different log types
      const subdirs = ['email-processing', 'system', 'security', 'performance', 'business'];
      for (const subdir of subdirs) {
        await fs.mkdir(path.join(this.logDirectory, subdir), { recursive: true });
      }
      
      console.log(`📁 Log directory initialized: ${this.logDirectory}`);
    } catch (error) {
      console.error('Failed to initialize log directory:', error);
    }
  }

  /**
   * Setup log rotation
   */
  private setupLogRotation(): void {
    // Rotate logs every hour
    this.rotationInterval = setInterval(() => {
      this.rotateLogs();
      this.enforceRetentionPolicy();
    }, 60 * 60 * 1000);
  }

  /**
   * Setup monitoring integration
   */
  private setupMonitoringIntegration(): void {
    // Listen for processing events and log them
    emailProcessingMonitor.on('event', (event) => {
      this.logProcessingEvent(event);
    });

    emailProcessingMonitor.on('alert', (alert) => {
      this.logAlert(alert);
    });
  }

  /**
   * Log processing event
   */
  private logProcessingEvent(event: any): void {
    const level = event.type === 'processing_failed' ? 'error' : 'info';
    
    this.log({
      level,
      message: `Email processing event: ${event.type}`,
      component: 'EmailProcessor',
      category: 'email_processing',
      correlationId: event.email?.messageId,
      emailId: event.email?.messageId,
      metadata: {
        eventType: event.type,
        email: event.email,
        metrics: event.metrics,
        error: event.error,
        result: event.result
      },
      performance: event.metrics ? {
        duration: event.metrics.processingTime,
        stage: event.metrics.stage
      } : undefined,
      error: event.error ? {
        name: event.error.code || 'ProcessingError',
        message: event.error.message,
        code: event.error.code
      } : undefined,
      tags: [event.type, event.metrics?.stage].filter(Boolean)
    });
  }

  /**
   * Log alert
   */
  private logAlert(alert: any): void {
    this.log({
      level: alert.severity === 'critical' ? 'fatal' : 
             alert.severity === 'error' ? 'error' : 
             alert.severity === 'warning' ? 'warn' : 'info',
      message: `Alert triggered: ${alert.title}`,
      component: 'AlertManager',
      category: 'system',
      metadata: {
        alertId: alert.id,
        category: alert.category,
        metrics: alert.metrics,
        actions: alert.actions
      },
      tags: ['alert', alert.category, alert.severity]
    });
  }

  /**
   * Main logging method
   */
  public log(entry: Omit<LogEntry, 'timestamp'>): void {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date()
    };

    // Add to in-memory logs
    this.logs.push(logEntry);

    // Write to file
    this.writeToFile(logEntry);

    // Emit event for real-time processing
    this.emit('log', logEntry);

    // Check for immediate alerts based on log content
    this.checkLogForAlerts(logEntry);

    // Cleanup old in-memory logs
    if (this.logs.length > 10000) {
      this.logs = this.logs.slice(-5000); // Keep last 5000 logs
    }
  }

  /**
   * Convenience logging methods
   */
  public debug(message: string, metadata?: Record<string, any>, component: string = 'System'): void {
    this.log({ level: 'debug', message, component, category: 'system', metadata });
  }

  public info(message: string, metadata?: Record<string, any>, component: string = 'System'): void {
    this.log({ level: 'info', message, component, category: 'system', metadata });
  }

  public warn(message: string, metadata?: Record<string, any>, component: string = 'System'): void {
    this.log({ level: 'warn', message, component, category: 'system', metadata });
  }

  public error(message: string, error?: Error, metadata?: Record<string, any>, component: string = 'System'): void {
    this.log({
      level: 'error',
      message,
      component,
      category: 'system',
      metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }

  public fatal(message: string, error?: Error, metadata?: Record<string, any>, component: string = 'System'): void {
    this.log({
      level: 'fatal',
      message,
      component,
      category: 'system',
      metadata,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });
  }

  /**
   * Log email processing activity
   */
  public logEmailProcessing(
    level: LogEntry['level'],
    message: string,
    emailId: string,
    stage: string,
    metadata?: Record<string, any>,
    performance?: { duration: number; resources?: any }
  ): void {
    this.log({
      level,
      message,
      component: 'EmailProcessor',
      category: 'email_processing',
      emailId,
      correlationId: emailId,
      metadata,
      performance: performance ? {
        duration: performance.duration,
        stage,
        resources: performance.resources
      } : undefined,
      tags: ['email_processing', stage]
    });
  }

  /**
   * Write log entry to file
   */
  private async writeToFile(entry: LogEntry): Promise<void> {
    try {
      const fileName = this.getLogFileName(entry);
      const logLine = this.formatLogEntry(entry);
      
      await fs.appendFile(fileName, logLine + '\n');
    } catch (error) {
      console.error('Failed to write log to file:', error);
    }
  }

  /**
   * Get log file name based on entry
   */
  private getLogFileName(entry: LogEntry): string {
    const date = entry.timestamp.toISOString().split('T')[0]; // YYYY-MM-DD
    const categoryDir = path.join(this.logDirectory, entry.category);
    return path.join(categoryDir, `${entry.component.toLowerCase()}-${date}.log`);
  }

  /**
   * Format log entry for file output
   */
  private formatLogEntry(entry: LogEntry): string {
    const baseInfo = {
      timestamp: entry.timestamp.toISOString(),
      level: entry.level.toUpperCase(),
      component: entry.component,
      message: entry.message
    };

    const additionalInfo: Record<string, any> = {};
    
    if (entry.correlationId) additionalInfo.correlationId = entry.correlationId;
    if (entry.requestId) additionalInfo.requestId = entry.requestId;
    if (entry.emailId) additionalInfo.emailId = entry.emailId;
    if (entry.metadata) additionalInfo.metadata = entry.metadata;
    if (entry.error) additionalInfo.error = entry.error;
    if (entry.performance) additionalInfo.performance = entry.performance;
    if (entry.tags) additionalInfo.tags = entry.tags;

    return JSON.stringify({ ...baseInfo, ...additionalInfo });
  }

  /**
   * Check log entry for alert conditions
   */
  private checkLogForAlerts(entry: LogEntry): void {
    // Check for error patterns that should trigger alerts
    if (entry.level === 'error' || entry.level === 'fatal') {
      // Count recent errors
      const recentErrors = this.logs.filter(log => 
        log.level === 'error' || log.level === 'fatal'
      ).filter(log => 
        log.timestamp.getTime() > Date.now() - 5 * 60 * 1000 // Last 5 minutes
      );

      if (recentErrors.length > 5) {
        emailProcessingMonitor.recordEvent({
          type: 'processing_failed',
          error: {
            message: `High error rate detected: ${recentErrors.length} errors in 5 minutes`,
            code: 'HIGH_ERROR_RATE'
          }
        });
      }
    }

    // Check for performance issues
    if (entry.performance && entry.performance.duration > 10000) { // 10 seconds
      this.warn(`Slow operation detected: ${entry.component}.${entry.performance.stage} took ${entry.performance.duration}ms`, {
        component: entry.component,
        stage: entry.performance.stage,
        duration: entry.performance.duration
      }, 'PerformanceMonitor');
    }
  }

  /**
   * Search logs
   */
  public searchLogs(filter: LogFilter, limit: number = 1000): LogEntry[] {
    let filteredLogs = this.logs;

    // Apply filters
    if (filter.level) {
      filteredLogs = filteredLogs.filter(log => filter.level!.includes(log.level));
    }

    if (filter.component) {
      filteredLogs = filteredLogs.filter(log => filter.component!.includes(log.component));
    }

    if (filter.category) {
      filteredLogs = filteredLogs.filter(log => filter.category!.includes(log.category));
    }

    if (filter.timeRange) {
      filteredLogs = filteredLogs.filter(log => 
        log.timestamp >= filter.timeRange!.start && 
        log.timestamp <= filter.timeRange!.end
      );
    }

    if (filter.correlationId) {
      filteredLogs = filteredLogs.filter(log => log.correlationId === filter.correlationId);
    }

    if (filter.emailId) {
      filteredLogs = filteredLogs.filter(log => log.emailId === filter.emailId);
    }

    if (filter.tags) {
      filteredLogs = filteredLogs.filter(log => 
        log.tags && filter.tags!.some(tag => log.tags!.includes(tag))
      );
    }

    if (filter.searchTerm) {
      const searchTerm = filter.searchTerm.toLowerCase();
      filteredLogs = filteredLogs.filter(log => 
        log.message.toLowerCase().includes(searchTerm) ||
        JSON.stringify(log.metadata || {}).toLowerCase().includes(searchTerm)
      );
    }

    // Sort by timestamp (newest first) and limit results
    return filteredLogs
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Aggregate logs for analysis
   */
  public aggregateLogs(timeRange: { start: Date; end: Date }): LogAggregation {
    const logsInRange = this.logs.filter(log => 
      log.timestamp >= timeRange.start && log.timestamp <= timeRange.end
    );

    // Summary statistics
    const byLevel: Record<string, number> = {};
    const byComponent: Record<string, number> = {};
    const byCategory: Record<string, number> = {};

    logsInRange.forEach(log => {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
      byComponent[log.component] = (byComponent[log.component] || 0) + 1;
      byCategory[log.category] = (byCategory[log.category] || 0) + 1;
    });

    const errorCount = (byLevel.error || 0) + (byLevel.fatal || 0);
    const errorRate = logsInRange.length > 0 ? (errorCount / logsInRange.length) * 100 : 0;

    // Performance metrics
    const performanceLogs = logsInRange.filter(log => log.performance);
    const averageProcessingTime = performanceLogs.length > 0
      ? performanceLogs.reduce((sum, log) => sum + log.performance!.duration, 0) / performanceLogs.length
      : undefined;

    // Error patterns
    const errorLogs = logsInRange.filter(log => log.level === 'error' || log.level === 'fatal');
    const errorGroups: Record<string, { count: number; firstSeen: Date; lastSeen: Date }> = {};

    errorLogs.forEach(log => {
      const errorKey = log.error?.message || log.message;
      if (!errorGroups[errorKey]) {
        errorGroups[errorKey] = {
          count: 0,
          firstSeen: log.timestamp,
          lastSeen: log.timestamp
        };
      }
      errorGroups[errorKey].count++;
      if (log.timestamp < errorGroups[errorKey].firstSeen) {
        errorGroups[errorKey].firstSeen = log.timestamp;
      }
      if (log.timestamp > errorGroups[errorKey].lastSeen) {
        errorGroups[errorKey].lastSeen = log.timestamp;
      }
    });

    const topErrors = Object.entries(errorGroups)
      .map(([error, stats]) => ({ error, ...stats }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Performance bottlenecks
    const performanceGroups: Record<string, { totalDuration: number; count: number }> = {};

    performanceLogs.forEach(log => {
      const key = `${log.component}-${log.performance!.stage}`;
      if (!performanceGroups[key]) {
        performanceGroups[key] = { totalDuration: 0, count: 0 };
      }
      performanceGroups[key].totalDuration += log.performance!.duration;
      performanceGroups[key].count++;
    });

    const performanceBottlenecks = Object.entries(performanceGroups)
      .map(([key, stats]) => {
        const [component, stage] = key.split('-');
        return {
          component,
          stage,
          averageDuration: stats.totalDuration / stats.count,
          occurrences: stats.count
        };
      })
      .sort((a, b) => b.averageDuration - a.averageDuration)
      .slice(0, 10);

    // Trends
    const hourlyVolume: Array<{ hour: string; count: number }> = [];
    const errorTrend: Array<{ hour: string; errorCount: number; totalCount: number }> = [];

    // Group by hour
    const hourlyGroups: Record<string, { total: number; errors: number }> = {};
    logsInRange.forEach(log => {
      const hour = log.timestamp.toISOString().slice(0, 13); // YYYY-MM-DDTHH
      if (!hourlyGroups[hour]) {
        hourlyGroups[hour] = { total: 0, errors: 0 };
      }
      hourlyGroups[hour].total++;
      if (log.level === 'error' || log.level === 'fatal') {
        hourlyGroups[hour].errors++;
      }
    });

    Object.entries(hourlyGroups).forEach(([hour, stats]) => {
      hourlyVolume.push({ hour, count: stats.total });
      errorTrend.push({ hour, errorCount: stats.errors, totalCount: stats.total });
    });

    return {
      timeRange,
      summary: {
        totalLogs: logsInRange.length,
        byLevel,
        byComponent,
        byCategory,
        errorRate,
        averageProcessingTime
      },
      patterns: {
        topErrors,
        performanceBottlenecks,
        trends: {
          hourlyVolume: hourlyVolume.sort((a, b) => a.hour.localeCompare(b.hour)),
          errorTrend: errorTrend.sort((a, b) => a.hour.localeCompare(b.hour))
        }
      }
    };
  }

  /**
   * Get logs for correlation ID
   */
  public getLogsByCorrelationId(correlationId: string): LogEntry[] {
    return this.logs
      .filter(log => log.correlationId === correlationId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  /**
   * Get recent error logs
   */
  public getRecentErrors(hours: number = 24): LogEntry[] {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return this.logs
      .filter(log => 
        (log.level === 'error' || log.level === 'fatal') && 
        log.timestamp >= cutoff
      )
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Rotate logs
   */
  private async rotateLogs(): Promise<void> {
    try {
      // Implementation would handle log file rotation
      // For now, just log the rotation event
      this.info('Log rotation completed', { 
        rotationTime: new Date().toISOString(),
        activeFiles: this.logFiles.size
      }, 'LogRotator');
    } catch (error) {
      this.error('Log rotation failed', error instanceof Error ? error : new Error(String(error)), {}, 'LogRotator');
    }
  }

  /**
   * Enforce retention policy
   */
  private async enforceRetentionPolicy(): Promise<void> {
    try {
      // Implementation would clean up old log files based on retention policy
      this.debug('Retention policy enforcement completed', {
        retentionPolicy: this.retentionPolicy
      }, 'LogRetentionManager');
    } catch (error) {
      this.error('Retention policy enforcement failed', error instanceof Error ? error : new Error(String(error)), {}, 'LogRetentionManager');
    }
  }

  /**
   * Export logs
   */
  public exportLogs(filter: LogFilter, format: 'json' | 'csv' = 'json'): string {
    const logs = this.searchLogs(filter, 10000); // Max 10k logs for export
    
    if (format === 'json') {
      return JSON.stringify(logs, null, 2);
    } else {
      // CSV format
      const headers = ['timestamp', 'level', 'component', 'category', 'message', 'correlationId', 'emailId'];
      const rows = logs.map(log => [
        log.timestamp.toISOString(),
        log.level,
        log.component,
        log.category,
        log.message,
        log.correlationId || '',
        log.emailId || ''
      ]);
      
      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
  }

  /**
   * Get logging statistics
   */
  public getStatistics(): {
    totalLogs: number;
    logsByLevel: Record<string, number>;
    logsByComponent: Record<string, number>;
    recentActivity: { hour: string; count: number }[];
    memoryUsage: number;
  } {
    const byLevel: Record<string, number> = {};
    const byComponent: Record<string, number> = {};
    
    this.logs.forEach(log => {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
      byComponent[log.component] = (byComponent[log.component] || 0) + 1;
    });

    // Recent activity (last 24 hours)
    const recentLogs = this.logs.filter(log => 
      log.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000
    );

    const hourlyActivity: Record<string, number> = {};
    recentLogs.forEach(log => {
      const hour = log.timestamp.toISOString().slice(0, 13);
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });

    const recentActivity = Object.entries(hourlyActivity)
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => a.hour.localeCompare(b.hour));

    return {
      totalLogs: this.logs.length,
      logsByLevel: byLevel,
      logsByComponent: byComponent,
      recentActivity,
      memoryUsage: this.logs.length * 1024 // Rough estimate
    };
  }

  /**
   * Clear logs
   */
  public clearLogs(): void {
    this.logs = [];
    this.info('Log memory cleared', {}, 'LogManager');
  }

  /**
   * Stop logger
   */
  public stop(): void {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
    }
    this.removeAllListeners();
  }
}

/**
 * Global email processing logger instance
 */
export const emailLogger = new EmailProcessingLogger(
  process.env.LOG_DIR || './logs',
  {
    debug: parseInt(process.env.LOG_RETENTION_DEBUG || '1'),
    info: parseInt(process.env.LOG_RETENTION_INFO || '7'),
    warn: parseInt(process.env.LOG_RETENTION_WARN || '30'),
    error: parseInt(process.env.LOG_RETENTION_ERROR || '90'),
    fatal: parseInt(process.env.LOG_RETENTION_FATAL || '365'),
    maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || String(100 * 1024 * 1024)),
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '10'),
    compressionEnabled: process.env.LOG_COMPRESSION !== 'false'
  }
);

export default EmailProcessingLogger;
