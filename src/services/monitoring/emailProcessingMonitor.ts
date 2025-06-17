/**
 * Email Processing Monitoring Service
 * Task 15.1: Set up Email Processing Monitoring
 * 
 * Comprehensive monitoring for the email import workflow including:
 * - Email processing pipeline metrics
 * - Performance tracking
 * - Error rate monitoring
 * - Health status checks
 * - Real-time alerts
 */

import { EventEmitter } from 'events';

export interface EmailProcessingMetrics {
  // Processing Statistics
  totalEmailsProcessed: number;
  successfulProcesses: number;
  failedProcesses: number;
  averageProcessingTime: number;
  
  // Performance Metrics
  emailParseTime: number;
  symbolProcessingTime: number;
  portfolioMappingTime: number;
  transactionCreationTime: number;
  duplicateDetectionTime: number;
  
  // Health Indicators
  healthStatus: 'healthy' | 'warning' | 'critical' | 'unknown';
  lastProcessedAt: Date | null;
  consecutiveFailures: number;
  errorRate: number;
  
  // Resource Usage
  memoryUsage: number;
  cpuUsage: number;
  
  // Queue Metrics
  pendingEmails: number;
  manualReviewQueueSize: number;
  
  // Period Statistics
  hourlyProcessingRate: number;
  dailyProcessingVolume: number;
}

export interface ProcessingEvent {
  id: string;
  timestamp: Date;
  type: 'email_received' | 'parsing_started' | 'parsing_completed' | 'processing_failed' | 'transaction_created' | 'duplicate_detected';
  email?: {
    subject: string;
    fromEmail: string;
    messageId?: string;
  };
  metrics?: {
    processingTime: number;
    confidence?: number;
    stage: 'parsing' | 'symbol_processing' | 'portfolio_mapping' | 'transaction_creation' | 'duplicate_check';
  };
  error?: {
    message: string;
    code: string;
    stack?: string;
  };
  result?: {
    success: boolean;
    transactionId?: string;
    warnings?: string[];
  };
}

export interface MonitoringAlert {
  id: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  category: 'performance' | 'errors' | 'health' | 'capacity' | 'security';
  metrics?: Partial<EmailProcessingMetrics>;
  actions?: string[];
}

export interface MonitoringConfig {
  enabled: boolean;
  metricsInterval: number; // How often to collect metrics (ms)
  alertThresholds: {
    errorRate: number; // Percentage threshold for error rate alerts
    processingTime: number; // Max acceptable processing time (ms)
    consecutiveFailures: number; // Max consecutive failures before alert
    memoryUsage: number; // Memory usage percentage threshold
    cpuUsage: number; // CPU usage percentage threshold
    queueSize: number; // Max queue size before alert
  };
  retention: {
    events: number; // Days to retain processing events
    metrics: number; // Days to retain metrics
    alerts: number; // Days to retain alerts
  };
  notifications: {
    webhook?: string;
    email?: string[];
    slack?: string;
  };
}

/**
 * Email Processing Monitor
 * Tracks all aspects of email processing workflow
 */
export class EmailProcessingMonitor extends EventEmitter {
  private metrics: EmailProcessingMetrics;
  private events: ProcessingEvent[] = [];
  private alerts: MonitoringAlert[] = [];
  private config: MonitoringConfig;
  private metricsInterval?: NodeJS.Timeout;
  private startTime: Date;

  constructor(config: Partial<MonitoringConfig> = {}) {
    super();
    
    this.startTime = new Date();
    this.config = {
      enabled: true,
      metricsInterval: 30000, // 30 seconds
      alertThresholds: {
        errorRate: 10, // 10%
        processingTime: 5000, // 5 seconds
        consecutiveFailures: 5,
        memoryUsage: 80, // 80%
        cpuUsage: 80, // 80%
        queueSize: 100
      },
      retention: {
        events: 7, // 7 days
        metrics: 30, // 30 days
        alerts: 90 // 90 days
      },
      notifications: {},
      ...config
    };

    this.metrics = this.initializeMetrics();
    
    if (this.config.enabled) {
      this.startMetricsCollection();
    }
  }

  /**
   * Initialize metrics with default values
   */
  private initializeMetrics(): EmailProcessingMetrics {
    return {
      totalEmailsProcessed: 0,
      successfulProcesses: 0,
      failedProcesses: 0,
      averageProcessingTime: 0,
      emailParseTime: 0,
      symbolProcessingTime: 0,
      portfolioMappingTime: 0,
      transactionCreationTime: 0,
      duplicateDetectionTime: 0,
      healthStatus: 'unknown',
      lastProcessedAt: null,
      consecutiveFailures: 0,
      errorRate: 0,
      memoryUsage: 0,
      cpuUsage: 0,
      pendingEmails: 0,
      manualReviewQueueSize: 0,
      hourlyProcessingRate: 0,
      dailyProcessingVolume: 0
    };
  }

  /**
   * Start metrics collection interval
   */
  private startMetricsCollection(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.metricsInterval = setInterval(() => {
      this.collectSystemMetrics();
      this.calculateDerivedMetrics();
      this.checkAlertConditions();
      this.cleanupOldData();
    }, this.config.metricsInterval);
  }

  /**
   * Record email processing event
   */
  public recordEvent(event: Omit<ProcessingEvent, 'id' | 'timestamp'>): void {
    const processingEvent: ProcessingEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      ...event
    };

    this.events.push(processingEvent);
    this.updateMetricsFromEvent(processingEvent);
    this.emit('event', processingEvent);

    // Trigger immediate alert check for critical events
    if (processingEvent.type === 'processing_failed') {
      this.checkAlertConditions();
    }
  }

  /**
   * Update metrics based on processing event
   */
  private updateMetricsFromEvent(event: ProcessingEvent): void {
    switch (event.type) {
      case 'email_received':
        // No direct metric update for received emails
        break;
        
      case 'parsing_completed':
        this.metrics.totalEmailsProcessed++;
        this.metrics.successfulProcesses++;
        this.metrics.lastProcessedAt = event.timestamp;
        this.metrics.consecutiveFailures = 0;
        
        if (event.metrics?.processingTime) {
          this.updateAverageProcessingTime(event.metrics.processingTime);
        }
        break;
        
      case 'processing_failed':
        this.metrics.totalEmailsProcessed++;
        this.metrics.failedProcesses++;
        this.metrics.consecutiveFailures++;
        break;
        
      case 'transaction_created':
        // Transaction successfully created
        break;
        
      case 'duplicate_detected':
        // Duplicate email detected
        break;
    }

    // Update error rate
    if (this.metrics.totalEmailsProcessed > 0) {
      this.metrics.errorRate = (this.metrics.failedProcesses / this.metrics.totalEmailsProcessed) * 100;
    }

    // Update health status
    this.updateHealthStatus();
  }

  /**
   * Update average processing time
   */
  private updateAverageProcessingTime(newTime: number): void {
    const currentAvg = this.metrics.averageProcessingTime;
    const totalProcessed = this.metrics.successfulProcesses;
    
    if (totalProcessed === 1) {
      this.metrics.averageProcessingTime = newTime;
    } else {
      // Calculate rolling average
      this.metrics.averageProcessingTime = ((currentAvg * (totalProcessed - 1)) + newTime) / totalProcessed;
    }
  }

  /**
   * Update health status based on current metrics
   */
  private updateHealthStatus(): void {
    const { consecutiveFailures, errorRate, lastProcessedAt } = this.metrics;
    const { alertThresholds } = this.config;

    // Check if system is inactive for too long
    const now = new Date();
    const hoursSinceLastProcess = lastProcessedAt 
      ? (now.getTime() - lastProcessedAt.getTime()) / (1000 * 60 * 60)
      : 0;

    if (consecutiveFailures >= alertThresholds.consecutiveFailures) {
      this.metrics.healthStatus = 'critical';
    } else if (errorRate > alertThresholds.errorRate || hoursSinceLastProcess > 2) {
      this.metrics.healthStatus = 'warning';
    } else if (lastProcessedAt && hoursSinceLastProcess < 1) {
      this.metrics.healthStatus = 'healthy';
    } else {
      this.metrics.healthStatus = 'unknown';
    }
  }

  /**
   * Collect system metrics (memory, CPU, etc.)
   */
  private collectSystemMetrics(): void {
    // Memory usage
    const memoryUsage = process.memoryUsage();
    this.metrics.memoryUsage = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;

    // CPU usage (simplified - in production you'd use more sophisticated monitoring)
    const cpuUsage = process.cpuUsage();
    this.metrics.cpuUsage = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds

    // Calculate processing rates
    this.calculateProcessingRates();
  }

  /**
   * Calculate processing rates
   */
  private calculateProcessingRates(): void {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Hourly rate
    const hourlyEvents = this.events.filter(event => 
      event.type === 'parsing_completed' && event.timestamp >= oneHourAgo
    );
    this.metrics.hourlyProcessingRate = hourlyEvents.length;

    // Daily volume
    const dailyEvents = this.events.filter(event => 
      event.type === 'parsing_completed' && event.timestamp >= oneDayAgo
    );
    this.metrics.dailyProcessingVolume = dailyEvents.length;
  }

  /**
   * Calculate derived metrics
   */
  private calculateDerivedMetrics(): void {
    // Stage-specific timing metrics
    const recentEvents = this.events.filter(event => 
      event.timestamp >= new Date(Date.now() - 60 * 60 * 1000) // Last hour
    );

    // Calculate average times for each stage
    const stageMetrics = {
      parsing: 0,
      symbol_processing: 0,
      portfolio_mapping: 0,
      transaction_creation: 0,
      duplicate_check: 0
    };

    Object.keys(stageMetrics).forEach(stage => {
      const stageEvents = recentEvents.filter(event => 
        event.metrics?.stage === stage && event.metrics?.processingTime
      );
      
      if (stageEvents.length > 0) {
        const totalTime = stageEvents.reduce((sum, event) => 
          sum + (event.metrics?.processingTime || 0), 0
        );
        stageMetrics[stage as keyof typeof stageMetrics] = totalTime / stageEvents.length;
      }
    });

    this.metrics.emailParseTime = stageMetrics.parsing;
    this.metrics.symbolProcessingTime = stageMetrics.symbol_processing;
    this.metrics.portfolioMappingTime = stageMetrics.portfolio_mapping;
    this.metrics.transactionCreationTime = stageMetrics.transaction_creation;
    this.metrics.duplicateDetectionTime = stageMetrics.duplicate_check;
  }

  /**
   * Check alert conditions and create alerts if necessary
   */
  private checkAlertConditions(): void {
    const { alertThresholds } = this.config;
    const alerts: MonitoringAlert[] = [];

    // Error rate alert
    if (this.metrics.errorRate > alertThresholds.errorRate && this.metrics.totalEmailsProcessed > 10) {
      alerts.push(this.createAlert('error', 'High Error Rate', 
        `Email processing error rate is ${this.metrics.errorRate.toFixed(1)}% (threshold: ${alertThresholds.errorRate}%)`,
        'errors'
      ));
    }

    // Processing time alert
    if (this.metrics.averageProcessingTime > alertThresholds.processingTime) {
      alerts.push(this.createAlert('warning', 'Slow Processing', 
        `Average processing time is ${this.metrics.averageProcessingTime.toFixed(0)}ms (threshold: ${alertThresholds.processingTime}ms)`,
        'performance'
      ));
    }

    // Consecutive failures alert
    if (this.metrics.consecutiveFailures >= alertThresholds.consecutiveFailures) {
      alerts.push(this.createAlert('critical', 'Multiple Consecutive Failures', 
        `${this.metrics.consecutiveFailures} consecutive processing failures detected`,
        'errors'
      ));
    }

    // Memory usage alert
    if (this.metrics.memoryUsage > alertThresholds.memoryUsage) {
      alerts.push(this.createAlert('warning', 'High Memory Usage', 
        `Memory usage is ${this.metrics.memoryUsage.toFixed(1)}% (threshold: ${alertThresholds.memoryUsage}%)`,
        'capacity'
      ));
    }

    // Queue size alert
    if (this.metrics.pendingEmails > alertThresholds.queueSize) {
      alerts.push(this.createAlert('warning', 'Large Email Queue', 
        `${this.metrics.pendingEmails} emails pending processing (threshold: ${alertThresholds.queueSize})`,
        'capacity'
      ));
    }

    // Process alerts
    alerts.forEach(alert => this.processAlert(alert));
  }

  /**
   * Create a monitoring alert
   */
  private createAlert(
    severity: MonitoringAlert['severity'],
    title: string,
    message: string,
    category: MonitoringAlert['category']
  ): MonitoringAlert {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      severity,
      title,
      message,
      category,
      metrics: { ...this.metrics },
      actions: this.getRecommendedActions(category)
    };
  }

  /**
   * Get recommended actions for alert category
   */
  private getRecommendedActions(category: string): string[] {
    const actions: Record<string, string[]> = {
      errors: [
        'Check email parsing logs for specific error details',
        'Verify email server connectivity',
        'Review recent email formats for parsing issues'
      ],
      performance: [
        'Monitor system resources (CPU, memory)',
        'Check database query performance',
        'Consider scaling processing capacity'
      ],
      capacity: [
        'Review email processing rate vs incoming volume',
        'Consider increasing processing instances',
        'Check for processing bottlenecks'
      ],
      health: [
        'Restart email processing service',
        'Check system health endpoints',
        'Verify all dependencies are operational'
      ]
    };

    return actions[category] || ['Investigate issue manually'];
  }

  /**
   * Process and emit alert
   */
  private processAlert(alert: MonitoringAlert): void {
    // Avoid duplicate alerts
    const recentSimilarAlert = this.alerts.find(existing => 
      existing.title === alert.title && 
      existing.timestamp >= new Date(Date.now() - 30 * 60 * 1000) // Last 30 minutes
    );

    if (recentSimilarAlert) {
      return; // Skip duplicate alert
    }

    this.alerts.push(alert);
    this.emit('alert', alert);

    // Send notifications
    this.sendNotification(alert);
  }

  /**
   * Send alert notification
   */
  private async sendNotification(alert: MonitoringAlert): Promise<void> {
    // This would integrate with actual notification services
    console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.title}`);
    console.log(`   ${alert.message}`);
    console.log(`   Category: ${alert.category}`);
    console.log(`   Actions: ${alert.actions?.join(', ')}`);

    // In production, integrate with:
    // - Webhook notifications
    // - Email alerts
    // - Slack/Discord notifications
    // - SMS alerts for critical issues
    // - PagerDuty integration
  }

  /**
   * Clean up old data based on retention policy
   */
  private cleanupOldData(): void {
    const now = new Date();
    
    // Clean up events
    const eventCutoff = new Date(now.getTime() - this.config.retention.events * 24 * 60 * 60 * 1000);
    this.events = this.events.filter(event => event.timestamp >= eventCutoff);

    // Clean up alerts
    const alertCutoff = new Date(now.getTime() - this.config.retention.alerts * 24 * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => alert.timestamp >= alertCutoff);
  }

  /**
   * Get current metrics
   */
  public getMetrics(): EmailProcessingMetrics {
    return { ...this.metrics };
  }

  /**
   * Get recent events
   */
  public getEvents(limit: number = 100): ProcessingEvent[] {
    return this.events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get recent alerts
   */
  public getAlerts(limit: number = 50): MonitoringAlert[] {
    return this.alerts
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get health status summary
   */
  public getHealthSummary(): {
    status: string;
    uptime: number;
    metrics: EmailProcessingMetrics;
    recentAlerts: number;
    systemInfo: {
      nodeVersion: string;
      platform: string;
      arch: string;
    };
  } {
    const uptime = Date.now() - this.startTime.getTime();
    const recentAlerts = this.alerts.filter(alert => 
      alert.timestamp >= new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;

    return {
      status: this.metrics.healthStatus,
      uptime,
      metrics: this.getMetrics(),
      recentAlerts,
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };
  }

  /**
   * Update queue sizes
   */
  public updateQueueSizes(pendingEmails: number, manualReviewQueueSize: number): void {
    this.metrics.pendingEmails = pendingEmails;
    this.metrics.manualReviewQueueSize = manualReviewQueueSize;
  }

  /**
   * Force metrics calculation
   */
  public refreshMetrics(): void {
    this.collectSystemMetrics();
    this.calculateDerivedMetrics();
    this.updateHealthStatus();
  }

  /**
   * Stop monitoring
   */
  public stop(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
      this.metricsInterval = undefined;
    }
  }

  /**
   * Export monitoring data for analysis
   */
  public exportData(): {
    metrics: EmailProcessingMetrics;
    events: ProcessingEvent[];
    alerts: MonitoringAlert[];
    config: MonitoringConfig;
  } {
    return {
      metrics: this.getMetrics(),
      events: this.getEvents(1000),
      alerts: this.getAlerts(100),
      config: this.config
    };
  }
}

/**
 * Global email processing monitor instance
 */
export const emailProcessingMonitor = new EmailProcessingMonitor({
  enabled: process.env.NODE_ENV !== 'test',
  metricsInterval: parseInt(process.env.MONITORING_INTERVAL || '30000'),
  alertThresholds: {
    errorRate: parseInt(process.env.ALERT_ERROR_RATE_THRESHOLD || '10'),
    processingTime: parseInt(process.env.ALERT_PROCESSING_TIME_THRESHOLD || '5000'),
    consecutiveFailures: parseInt(process.env.ALERT_CONSECUTIVE_FAILURES_THRESHOLD || '5'),
    memoryUsage: parseInt(process.env.ALERT_MEMORY_THRESHOLD || '80'),
    cpuUsage: parseInt(process.env.ALERT_CPU_THRESHOLD || '80'),
    queueSize: parseInt(process.env.ALERT_QUEUE_SIZE_THRESHOLD || '100')
  },
  notifications: {
    webhook: process.env.MONITORING_WEBHOOK_URL,
    email: process.env.MONITORING_EMAIL_ALERTS?.split(','),
    slack: process.env.MONITORING_SLACK_WEBHOOK
  }
});

export default EmailProcessingMonitor;
