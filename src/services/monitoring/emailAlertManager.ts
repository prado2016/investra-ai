/**
 * Email Processing Alert System
 * Task 15.2: Configure Failure Alerts
 * 
 * Comprehensive alerting system for email processing failures including:
 * - Real-time failure detection
 * - Multi-channel notifications (email, webhook, SMS)
 * - Alert escalation and routing
 * - Alert suppression and deduplication
 * - Integration with monitoring services
 */

import { EventEmitter } from 'events';
import { emailProcessingMonitor, type MonitoringAlert } from './emailProcessingMonitor';

export interface AlertChannel {
  type: 'email' | 'webhook' | 'slack' | 'discord' | 'sms' | 'pagerduty';
  enabled: boolean;
  config: Record<string, any>;
  conditions?: {
    severity?: ('info' | 'warning' | 'error' | 'critical')[];
    categories?: string[];
    timeRange?: { start: string; end: string }; // e.g., "09:00-17:00"
  };
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: {
    metric: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | '!=';
    threshold: number;
    duration?: number; // How long condition must persist (ms)
  }[];
  severity: 'info' | 'warning' | 'error' | 'critical';
  channels: string[]; // Channel IDs to notify
  cooldown: number; // Minimum time between alerts (ms)
  escalation?: {
    enabled: boolean;
    delay: number; // Time before escalation (ms)
    channels: string[]; // Escalation channels
  };
}

export interface AlertHistory {
  id: string;
  alertId: string;
  timestamp: Date;
  severity: string;
  title: string;
  message: string;
  channels: string[];
  status: 'sent' | 'failed' | 'suppressed' | 'escalated';
  response?: {
    acknowledged: boolean;
    acknowledgedBy?: string;
    acknowledgedAt?: Date;
    resolved: boolean;
    resolvedBy?: string;
    resolvedAt?: Date;
  };
}

export interface AlertConfig {
  enabled: boolean;
  channels: Record<string, AlertChannel>;
  rules: AlertRule[];
  globalSettings: {
    defaultCooldown: number;
    maxAlertsPerHour: number;
    suppressDuplicates: boolean;
    escalationEnabled: boolean;
  };
}

/**
 * Email Processing Alert Manager
 */
export class EmailProcessingAlertManager extends EventEmitter {
  private config: AlertConfig;
  private history: AlertHistory[] = [];
  private activeCooldowns: Map<string, number> = new Map();

  constructor(config: Partial<AlertConfig> = {}) {
    super();
    
    this.config = {
      enabled: true,
      channels: {},
      rules: [],
      globalSettings: {
        defaultCooldown: 300000, // 5 minutes
        maxAlertsPerHour: 20,
        suppressDuplicates: true,
        escalationEnabled: true
      },
      ...config
    };

    this.setupDefaultChannels();
    this.setupDefaultRules();
    this.setupMonitoringIntegration();
  }

  /**
   * Setup default notification channels
   */
  private setupDefaultChannels(): void {
    // Email alerts
    if (process.env.ALERT_EMAIL_RECIPIENTS) {
      this.config.channels.email = {
        type: 'email',
        enabled: true,
        config: {
          recipients: process.env.ALERT_EMAIL_RECIPIENTS.split(','),
          smtpHost: process.env.ALERT_SMTP_HOST || 'localhost',
          smtpPort: parseInt(process.env.ALERT_SMTP_PORT || '587'),
          smtpUser: process.env.ALERT_SMTP_USER,
          smtpPassword: process.env.ALERT_SMTP_PASSWORD,
          fromAddress: process.env.ALERT_FROM_EMAIL || 'alerts@investra.com'
        },
        conditions: {
          severity: ['error', 'critical'],
          timeRange: { start: '08:00', end: '20:00' }
        }
      };
    }

    // Webhook alerts
    if (process.env.ALERT_WEBHOOK_URL) {
      this.config.channels.webhook = {
        type: 'webhook',
        enabled: true,
        config: {
          url: process.env.ALERT_WEBHOOK_URL,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': process.env.ALERT_WEBHOOK_AUTH
          }
        }
      };
    }

    // Slack alerts
    if (process.env.ALERT_SLACK_WEBHOOK) {
      this.config.channels.slack = {
        type: 'slack',
        enabled: true,
        config: {
          webhookUrl: process.env.ALERT_SLACK_WEBHOOK,
          channel: process.env.ALERT_SLACK_CHANNEL || '#alerts',
          username: 'Investra Email Monitor',
          iconEmoji: ':rotating_light:'
        },
        conditions: {
          severity: ['warning', 'error', 'critical']
        }
      };
    }

    // Discord alerts
    if (process.env.ALERT_DISCORD_WEBHOOK) {
      this.config.channels.discord = {
        type: 'discord',
        enabled: true,
        config: {
          webhookUrl: process.env.ALERT_DISCORD_WEBHOOK,
          username: 'Investra Monitor'
        }
      };
    }

    // PagerDuty integration
    if (process.env.ALERT_PAGERDUTY_KEY) {
      this.config.channels.pagerduty = {
        type: 'pagerduty',
        enabled: true,
        config: {
          routingKey: process.env.ALERT_PAGERDUTY_KEY,
          severityMapping: {
            info: 'info',
            warning: 'warning', 
            error: 'error',
            critical: 'critical'
          }
        },
        conditions: {
          severity: ['critical']
        }
      };
    }
  }

  /**
   * Setup default alert rules
   */
  private setupDefaultRules(): void {
    this.config.rules = [
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        description: 'Alert when email processing error rate exceeds threshold',
        enabled: true,
        conditions: [
          {
            metric: 'errorRate',
            operator: '>',
            threshold: 10, // 10%
            duration: 300000 // 5 minutes
          }
        ],
        severity: 'error',
        channels: ['email', 'slack', 'webhook'],
        cooldown: 600000, // 10 minutes
        escalation: {
          enabled: true,
          delay: 1800000, // 30 minutes
          channels: ['pagerduty']
        }
      },
      {
        id: 'consecutive-failures',
        name: 'Multiple Consecutive Failures',
        description: 'Alert when multiple emails fail processing in a row',
        enabled: true,
        conditions: [
          {
            metric: 'consecutiveFailures',
            operator: '>=',
            threshold: 5
          }
        ],
        severity: 'critical',
        channels: ['email', 'slack', 'pagerduty'],
        cooldown: 300000 // 5 minutes
      },
      {
        id: 'slow-processing',
        name: 'Slow Email Processing',
        description: 'Alert when average processing time is too high',
        enabled: true,
        conditions: [
          {
            metric: 'averageProcessingTime',
            operator: '>',
            threshold: 10000, // 10 seconds
            duration: 600000 // 10 minutes
          }
        ],
        severity: 'warning',
        channels: ['slack'],
        cooldown: 900000 // 15 minutes
      },
      {
        id: 'high-memory-usage',
        name: 'High Memory Usage',
        description: 'Alert when memory usage is critically high',
        enabled: true,
        conditions: [
          {
            metric: 'memoryUsage',
            operator: '>',
            threshold: 90, // 90%
            duration: 300000 // 5 minutes
          }
        ],
        severity: 'warning',
        channels: ['email', 'slack'],
        cooldown: 600000 // 10 minutes
      },
      {
        id: 'large-processing-queue',
        name: 'Large Processing Queue',
        description: 'Alert when email processing queue is too large',
        enabled: true,
        conditions: [
          {
            metric: 'pendingEmails',
            operator: '>',
            threshold: 100
          }
        ],
        severity: 'warning',
        channels: ['slack'],
        cooldown: 1800000 // 30 minutes
      },
      {
        id: 'service-unavailable',
        name: 'Email Processing Service Unavailable',
        description: 'Alert when the email processing service is down',
        enabled: true,
        conditions: [
          {
            metric: 'healthStatus',
            operator: '==',
            threshold: 0 // 0 = critical
          }
        ],
        severity: 'critical',
        channels: ['email', 'slack', 'pagerduty'],
        cooldown: 60000 // 1 minute
      }
    ];
  }

  /**
   * Setup integration with monitoring system
   */
  private setupMonitoringIntegration(): void {
    // Listen for alerts from the monitoring system
    emailProcessingMonitor.on('alert', (alert: MonitoringAlert) => {
      this.processAlert(alert);
    });

    // Listen for events that might trigger alerts
    emailProcessingMonitor.on('event', (event) => {
      if (event.type === 'processing_failed') {
        this.checkRules();
      }
    });

    // Periodic rule checking
    setInterval(() => {
      this.checkRules();
      this.cleanupHistory();
    }, 60000); // Check every minute
  }

  /**
   * Process incoming alert
   */
  private async processAlert(alert: MonitoringAlert): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    // Check if alert is in cooldown
    const cooldownKey = `${alert.category}-${alert.severity}`;
    const lastAlert = this.activeCooldowns.get(cooldownKey);
    const now = Date.now();

    if (lastAlert && (now - lastAlert) < this.config.globalSettings.defaultCooldown) {
      console.log(`Alert suppressed due to cooldown: ${alert.title}`);
      this.recordAlertHistory(alert, 'suppressed');
      return;
    }

    // Check rate limiting
    if (this.isRateLimited()) {
      console.log(`Alert suppressed due to rate limiting: ${alert.title}`);
      this.recordAlertHistory(alert, 'suppressed');
      return;
    }

    // Send alert through configured channels
    const channels = this.getChannelsForAlert(alert);
    const sentChannels: string[] = [];

    for (const channelId of channels) {
      const channel = this.config.channels[channelId];
      if (channel && channel.enabled && this.shouldSendToChannel(channel, alert)) {
        try {
          await this.sendAlert(channel, alert);
          sentChannels.push(channelId);
          console.log(`Alert sent via ${channelId}: ${alert.title}`);
        } catch (error) {
          console.error(`Failed to send alert via ${channelId}:`, error);
        }
      }
    }

    // Update cooldown
    this.activeCooldowns.set(cooldownKey, now);

    // Record alert history
    this.recordAlertHistory(alert, sentChannels.length > 0 ? 'sent' : 'failed', sentChannels);

    // Setup escalation if configured
    this.setupEscalation(alert);
  }

  /**
   * Check alert rules against current metrics
   */
  private checkRules(): void {
    const metrics = emailProcessingMonitor.getMetrics();
    
    for (const rule of this.config.rules) {
      if (!rule.enabled) continue;

      const conditionsMet = rule.conditions.every(condition => {
        const value = this.getMetricValue(metrics, condition.metric);
        return this.evaluateCondition(value, condition.operator, condition.threshold);
      });

      if (conditionsMet) {
        const alert: MonitoringAlert = {
          id: `rule_${rule.id}_${Date.now()}`,
          timestamp: new Date(),
          severity: rule.severity,
          title: rule.name,
          message: rule.description,
          category: 'errors', // Default category
          metrics: { ...metrics }
        };

        this.processAlert(alert);
      }
    }
  }

  /**
   * Get metric value by name
   */
  private getMetricValue(metrics: any, metricName: string): number {
    switch (metricName) {
      case 'errorRate':
        return metrics.errorRate;
      case 'consecutiveFailures':
        return metrics.consecutiveFailures;
      case 'averageProcessingTime':
        return metrics.averageProcessingTime;
      case 'memoryUsage':
        return metrics.memoryUsage;
      case 'pendingEmails':
        return metrics.pendingEmails;
      case 'healthStatus':
        // Convert health status to numeric value
        const statusMap = { healthy: 3, warning: 2, critical: 1, unknown: 0 };
        return statusMap[metrics.healthStatus as keyof typeof statusMap] || 0;
      default:
        return 0;
    }
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '>':
        return value > threshold;
      case '<':
        return value < threshold;
      case '>=':
        return value >= threshold;
      case '<=':
        return value <= threshold;
      case '==':
        return value === threshold;
      case '!=':
        return value !== threshold;
      default:
        return false;
    }
  }

  /**
   * Get channels for alert
   */
  private getChannelsForAlert(alert: MonitoringAlert): string[] {
    // Find matching rules
    const matchingRules = this.config.rules.filter(rule => 
      rule.enabled && 
      rule.severity === alert.severity &&
      (rule.name === alert.title || rule.description.includes(alert.title))
    );

    if (matchingRules.length > 0) {
      return matchingRules[0].channels;
    }

    // Default channels based on severity
    const defaultChannels: Record<string, string[]> = {
      info: ['slack'],
      warning: ['slack'],
      error: ['email', 'slack'],
      critical: ['email', 'slack', 'pagerduty']
    };

    return defaultChannels[alert.severity] || ['slack'];
  }

  /**
   * Check if should send to specific channel
   */
  private shouldSendToChannel(channel: AlertChannel, alert: MonitoringAlert): boolean {
    if (!channel.conditions) return true;

    // Check severity conditions
    if (channel.conditions.severity && !channel.conditions.severity.includes(alert.severity)) {
      return false;
    }

    // Check category conditions
    if (channel.conditions.categories && !channel.conditions.categories.includes(alert.category)) {
      return false;
    }

    // Check time range conditions
    if (channel.conditions.timeRange) {
      const now = new Date();
      const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
      const { start, end } = channel.conditions.timeRange;
      
      if (currentTime < start || currentTime > end) {
        return false;
      }
    }

    return true;
  }

  /**
   * Send alert through specific channel
   */
  private async sendAlert(channel: AlertChannel, alert: MonitoringAlert): Promise<void> {
    switch (channel.type) {
      case 'email':
        await this.sendEmailAlert(channel, alert);
        break;
      case 'webhook':
        await this.sendWebhookAlert(channel, alert);
        break;
      case 'slack':
        await this.sendSlackAlert(channel, alert);
        break;
      case 'discord':
        await this.sendDiscordAlert(channel, alert);
        break;
      case 'pagerduty':
        await this.sendPagerDutyAlert(channel, alert);
        break;
      case 'sms':
        await this.sendSMSAlert(channel, alert);
        break;
      default:
        throw new Error(`Unsupported channel type: ${channel.type}`);
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(channel: AlertChannel, alert: MonitoringAlert): Promise<void> {
    // In production, integrate with actual email service (nodemailer, SendGrid, etc.)
    console.log(`📧 EMAIL ALERT [${alert.severity.toUpperCase()}]: ${alert.title}`);
    console.log(`   To: ${channel.config.recipients.join(', ')}`);
    console.log(`   Message: ${alert.message}`);
    console.log(`   Time: ${alert.timestamp.toISOString()}`);

    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(channel: AlertChannel, alert: MonitoringAlert): Promise<void> {
    const payload = {
      alert_id: alert.id,
      timestamp: alert.timestamp.toISOString(),
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      category: alert.category,
      metrics: alert.metrics,
      actions: alert.actions
    };

    try {
      const response = await fetch(channel.config.url, {
        method: channel.config.method || 'POST',
        headers: channel.config.headers || { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Webhook returned ${response.status}: ${response.statusText}`);
      }

      console.log(`🔗 WEBHOOK ALERT sent to ${channel.config.url}`);
    } catch (error) {
      console.error('Webhook alert failed:', error);
      throw error;
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(channel: AlertChannel, alert: MonitoringAlert): Promise<void> {
    const severityEmojis = {
      info: ':information_source:',
      warning: ':warning:',
      error: ':x:',
      critical: ':rotating_light:'
    };

    const payload = {
      username: channel.config.username || 'Investra Monitor',
      icon_emoji: channel.config.iconEmoji || ':rotating_light:',
      channel: channel.config.channel,
      attachments: [{
        color: this.getSeverityColor(alert.severity),
        title: `${severityEmojis[alert.severity]} ${alert.title}`,
        text: alert.message,
        fields: [
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Category',
            value: alert.category,
            short: true
          },
          {
            title: 'Time',
            value: alert.timestamp.toISOString(),
            short: true
          }
        ],
        ts: Math.floor(alert.timestamp.getTime() / 1000)
      }]
    };

    try {
      const response = await fetch(channel.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Slack webhook returned ${response.status}`);
      }

      console.log(`💬 SLACK ALERT sent to ${channel.config.channel}`);
    } catch (error) {
      console.error('Slack alert failed:', error);
      throw error;
    }
  }

  /**
   * Send Discord alert
   */
  private async sendDiscordAlert(channel: AlertChannel, alert: MonitoringAlert): Promise<void> {
    const payload = {
      username: channel.config.username || 'Investra Monitor',
      embeds: [{
        title: alert.title,
        description: alert.message,
        color: parseInt(this.getSeverityColor(alert.severity).slice(1), 16),
        fields: [
          {
            name: 'Severity',
            value: alert.severity.toUpperCase(),
            inline: true
          },
          {
            name: 'Category',
            value: alert.category,
            inline: true
          }
        ],
        timestamp: alert.timestamp.toISOString()
      }]
    };

    try {
      const response = await fetch(channel.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Discord webhook returned ${response.status}`);
      }

      console.log(`💬 DISCORD ALERT sent`);
    } catch (error) {
      console.error('Discord alert failed:', error);
      throw error;
    }
  }

  /**
   * Send PagerDuty alert
   */
  private async sendPagerDutyAlert(channel: AlertChannel, alert: MonitoringAlert): Promise<void> {
    // In production, integrate with PagerDuty Events API
    console.log(`📟 PAGERDUTY ALERT [${alert.severity.toUpperCase()}]: ${alert.title}`);
    console.log(`   Routing Key: ${channel.config.routingKey}`);
    console.log(`   Message: ${alert.message}`);

    // Simulate PagerDuty API call
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Send SMS alert
   */
  private async sendSMSAlert(channel: AlertChannel, alert: MonitoringAlert): Promise<void> {
    // In production, integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`📱 SMS ALERT [${alert.severity.toUpperCase()}]: ${alert.title}`);
    console.log(`   To: ${channel.config.phoneNumbers?.join(', ')}`);
    console.log(`   Message: ${alert.message}`);

    // Simulate SMS sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Get severity color for UI
   */
  private getSeverityColor(severity: string): string {
    const colors = {
      info: '#36a3eb',
      warning: '#ffce56',
      error: '#ff6384',
      critical: '#ff0000'
    };
    return colors[severity as keyof typeof colors] || '#cccccc';
  }

  /**
   * Check if rate limited
   */
  private isRateLimited(): boolean {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // Count alerts in the last hour
    const recentAlerts = this.history.filter(h => 
      h.timestamp.getTime() >= oneHourAgo && h.status === 'sent'
    ).length;

    return recentAlerts >= this.config.globalSettings.maxAlertsPerHour;
  }

  /**
   * Record alert in history
   */
  private recordAlertHistory(
    alert: MonitoringAlert, 
    status: 'sent' | 'failed' | 'suppressed' | 'escalated',
    channels: string[] = []
  ): void {
    const historyEntry: AlertHistory = {
      id: `history_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      alertId: alert.id,
      timestamp: alert.timestamp,
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      channels,
      status
    };

    this.history.push(historyEntry);
    this.emit('alertHistory', historyEntry);
  }

  /**
   * Setup alert escalation
   */
  private setupEscalation(alert: MonitoringAlert): void {
    // Find rules with escalation enabled
    const rulesWithEscalation = this.config.rules.filter(rule => 
      rule.enabled && 
      rule.escalation?.enabled &&
      (rule.name === alert.title || rule.description.includes(alert.title))
    );

    rulesWithEscalation.forEach(rule => {
      if (rule.escalation) {
        setTimeout(async () => {
          // Check if alert is still active and not acknowledged
          const alertHistory = this.history.find(h => h.alertId === alert.id);
          if (alertHistory && !alertHistory.response?.acknowledged && rule.escalation) {
            // Send escalation
            for (const channelId of rule.escalation.channels) {
              const channel = this.config.channels[channelId];
              if (channel && channel.enabled) {
                try {
                  await this.sendAlert(channel, {
                    ...alert,
                    title: `ESCALATED: ${alert.title}`,
                    message: `This alert has been escalated due to no acknowledgment. Original: ${alert.message}`
                  });
                } catch (error) {
                  console.error(`Escalation failed for channel ${channelId}:`, error);
                }
              }
            }
            
            if (rule.escalation) {
              this.recordAlertHistory(alert, 'escalated', rule.escalation.channels);
            }
          }
        }, rule.escalation?.delay || 300000);
      }
    });
  }

  /**
   * Clean up old history entries
   */
  private cleanupHistory(): void {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days
    this.history = this.history.filter(h => h.timestamp >= cutoff);
  }

  /**
   * Get alert history
   */
  public getAlertHistory(limit: number = 100): AlertHistory[] {
    return this.history
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Acknowledge alert
   */
  public acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const historyEntry = this.history.find(h => h.alertId === alertId);
    if (historyEntry) {
      historyEntry.response = {
        acknowledged: true,
        acknowledgedBy,
        acknowledgedAt: new Date(),
        resolved: false
      };
      this.emit('alertAcknowledged', historyEntry);
      return true;
    }
    return false;
  }

  /**
   * Resolve alert
   */
  public resolveAlert(alertId: string, resolvedBy: string): boolean {
    const historyEntry = this.history.find(h => h.alertId === alertId);
    if (historyEntry) {
      if (!historyEntry.response) {
        historyEntry.response = {
          acknowledged: false,
          resolved: true,
          resolvedBy,
          resolvedAt: new Date()
        };
      } else {
        historyEntry.response.resolved = true;
        historyEntry.response.resolvedBy = resolvedBy;
        historyEntry.response.resolvedAt = new Date();
      }
      this.emit('alertResolved', historyEntry);
      return true;
    }
    return false;
  }

  /**
   * Test alert system
   */
  public async testAlerts(): Promise<void> {
    console.log('🧪 Testing alert system...');

    const testAlert: MonitoringAlert = {
      id: `test_${Date.now()}`,
      timestamp: new Date(),
      severity: 'warning',
      title: 'Alert System Test',
      message: 'This is a test alert to verify the alerting system is working correctly.',
      category: 'health'
    };

    await this.processAlert(testAlert);
    console.log('✅ Alert system test completed');
  }

  /**
   * Get configuration
   */
  public getConfig(): AlertConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  /**
   * Stop alert manager
   */
  public stop(): void {
    // Clean up any pending escalations or intervals
    this.removeAllListeners();
  }
}

/**
 * Global alert manager instance
 */
export const emailAlertManager = new EmailProcessingAlertManager();

export default EmailProcessingAlertManager;
