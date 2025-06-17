/**
 * Email Processing Dashboard Service
 * Task 15.4: Create Processing Dashboards
 * 
 * Web dashboard for monitoring email processing metrics including:
 * - Real-time processing metrics
 * - Performance charts and graphs
 * - Error tracking and analysis
 * - System health indicators
 * - Alert management interface
 * - Historical data visualization
 */

import { EventEmitter } from 'events';
import { emailProcessingMonitor, type EmailProcessingMetrics } from './emailProcessingMonitor';
import { emailAlertManager, type AlertHistory } from './emailAlertManager';
import { emailLogger, type LogEntry, type LogAggregation } from './emailLogger';
import { emailHealthCheck, type SystemHealthReport } from './emailHealthCheck';

export interface DashboardMetrics {
  overview: {
    status: 'healthy' | 'warning' | 'critical' | 'unknown';
    uptime: number;
    lastUpdate: Date;
    processingRate: number;
    errorRate: number;
    queueSize: number;
  };
  processing: EmailProcessingMetrics;
  health: SystemHealthReport | null;
  alerts: {
    active: AlertHistory[];
    recent: AlertHistory[];
    summary: {
      critical: number;
      error: number;
      warning: number;
      info: number;
    };
  };
  performance: {
    charts: {
      processingTimeChart: Array<{ time: string; value: number }>;
      errorRateChart: Array<{ time: string; value: number }>;
      throughputChart: Array<{ time: string; value: number }>;
      queueSizeChart: Array<{ time: string; value: number }>;
    };
    trends: {
      hourly: Array<{ hour: string; processed: number; errors: number }>;
      daily: Array<{ date: string; processed: number; errors: number }>;
    };
  };
  logs: {
    recent: LogEntry[];
    summary: LogAggregation | null;
  };
}

export interface DashboardConfig {
  refreshInterval: number;
  metricsHistory: number; // How many data points to keep
  chartTimeRange: number; // Time range for charts in minutes
  alertDisplayLimit: number;
  logDisplayLimit: number;
}

/**
 * Email Processing Dashboard
 */
export class EmailProcessingDashboard extends EventEmitter {
  private config: DashboardConfig;
  private metricsHistory: Array<{
    timestamp: Date;
    metrics: EmailProcessingMetrics;
  }> = [];
  private refreshInterval?: NodeJS.Timeout;
  private isActive = false;

  constructor(config: Partial<DashboardConfig> = {}) {
    super();
    
    this.config = {
      refreshInterval: 5000, // 5 seconds
      metricsHistory: 720, // 12 hours worth of 1-minute intervals
      chartTimeRange: 60, // 1 hour
      alertDisplayLimit: 50,
      logDisplayLimit: 100,
      ...config
    };
  }

  /**
   * Start dashboard monitoring
   */
  public start(): void {
    if (this.isActive) {
      return;
    }

    this.isActive = true;
    this.collectMetrics();
    
    this.refreshInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.refreshInterval);

    console.log('📊 Email processing dashboard started');
  }

  /**
   * Stop dashboard monitoring
   */
  public stop(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = undefined;
    }
    
    this.isActive = false;
    console.log('📊 Email processing dashboard stopped');
  }

  /**
   * Collect current metrics
   */
  private collectMetrics(): void {
    const metrics = emailProcessingMonitor.getMetrics();
    
    this.metricsHistory.push({
      timestamp: new Date(),
      metrics: { ...metrics }
    });

    // Keep only recent history
    if (this.metricsHistory.length > this.config.metricsHistory) {
      this.metricsHistory = this.metricsHistory.slice(-this.config.metricsHistory);
    }

    // Emit update event
    this.emit('metricsUpdate', metrics);
  }

  /**
   * Get current dashboard data
   */
  public async getDashboardData(): Promise<DashboardMetrics> {
    const currentMetrics = emailProcessingMonitor.getMetrics();
    const healthReport = await emailHealthCheck.performHealthCheck();
    const alertHistory = emailAlertManager.getAlertHistory(this.config.alertDisplayLimit);
    const recentLogs = emailLogger.searchLogs({
      timeRange: {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
        end: new Date()
      }
    }, this.config.logDisplayLimit);

    // Get log aggregation for the last 24 hours
    const logAggregation = emailLogger.aggregateLogs({
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date()
    });

    // Calculate overview metrics
    const overview = {
      status: healthReport.overall,
      uptime: process.uptime() * 1000,
      lastUpdate: new Date(),
      processingRate: currentMetrics.hourlyProcessingRate,
      errorRate: currentMetrics.errorRate,
      queueSize: currentMetrics.pendingEmails + currentMetrics.manualReviewQueueSize
    };

    // Process alerts
    const activeAlerts = alertHistory.filter(alert => 
      !alert.response?.resolved && 
      alert.timestamp.getTime() > Date.now() - 24 * 60 * 60 * 1000
    );
    
    const recentAlerts = alertHistory.slice(0, 20);
    
    const alertSummary = {
      critical: alertHistory.filter(a => a.severity === 'critical').length,
      error: alertHistory.filter(a => a.severity === 'error').length,
      warning: alertHistory.filter(a => a.severity === 'warning').length,
      info: alertHistory.filter(a => a.severity === 'info').length
    };

    // Generate chart data
    const charts = this.generateChartData();
    const trends = this.generateTrendData();

    return {
      overview,
      processing: currentMetrics,
      health: healthReport,
      alerts: {
        active: activeAlerts,
        recent: recentAlerts,
        summary: alertSummary
      },
      performance: {
        charts,
        trends
      },
      logs: {
        recent: recentLogs,
        summary: logAggregation
      }
    };
  }

  /**
   * Generate chart data from metrics history
   */
  private generateChartData(): DashboardMetrics['performance']['charts'] {
    const cutoffTime = new Date(Date.now() - this.config.chartTimeRange * 60 * 1000);
    const recentMetrics = this.metricsHistory.filter(entry => entry.timestamp >= cutoffTime);

    const processingTimeChart = recentMetrics.map(entry => ({
      time: entry.timestamp.toISOString(),
      value: entry.metrics.averageProcessingTime
    }));

    const errorRateChart = recentMetrics.map(entry => ({
      time: entry.timestamp.toISOString(),
      value: entry.metrics.errorRate
    }));

    const throughputChart = recentMetrics.map(entry => ({
      time: entry.timestamp.toISOString(),
      value: entry.metrics.hourlyProcessingRate
    }));

    const queueSizeChart = recentMetrics.map(entry => ({
      time: entry.timestamp.toISOString(),
      value: entry.metrics.pendingEmails + entry.metrics.manualReviewQueueSize
    }));

    return {
      processingTimeChart,
      errorRateChart,
      throughputChart,
      queueSizeChart
    };
  }

  /**
   * Generate trend data
   */
  private generateTrendData(): DashboardMetrics['performance']['trends'] {
    // Group metrics by hour for the last 24 hours
    const hourlyData: Record<string, { processed: number; errors: number }> = {};
    const now = new Date();
    
    // Initialize last 24 hours
    for (let i = 23; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourKey = hour.toISOString().slice(0, 13); // YYYY-MM-DDTHH
      hourlyData[hourKey] = { processed: 0, errors: 0 };
    }

    // Aggregate data from metrics history
    this.metricsHistory.forEach(entry => {
      const hourKey = entry.timestamp.toISOString().slice(0, 13);
      if (hourlyData[hourKey]) {
        hourlyData[hourKey].processed += entry.metrics.hourlyProcessingRate;
        hourlyData[hourKey].errors += entry.metrics.failedProcesses;
      }
    });

    const hourly = Object.entries(hourlyData).map(([hour, data]) => ({
      hour,
      processed: data.processed,
      errors: data.errors
    }));

    // Group by day for the last 7 days
    const dailyData: Record<string, { processed: number; errors: number }> = {};
    
    for (let i = 6; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dayKey = day.toISOString().slice(0, 10); // YYYY-MM-DD
      dailyData[dayKey] = { processed: 0, errors: 0 };
    }

    // Aggregate daily data
    this.metricsHistory.forEach(entry => {
      const dayKey = entry.timestamp.toISOString().slice(0, 10);
      if (dailyData[dayKey]) {
        dailyData[dayKey].processed += entry.metrics.dailyProcessingVolume;
        dailyData[dayKey].errors += entry.metrics.failedProcesses;
      }
    });

    const daily = Object.entries(dailyData).map(([date, data]) => ({
      date,
      processed: data.processed,
      errors: data.errors
    }));

    return { hourly, daily };
  }

  /**
   * Get real-time metrics for WebSocket streaming
   */
  public getRealtimeMetrics(): {
    timestamp: Date;
    metrics: EmailProcessingMetrics;
    health: string;
    alerts: number;
  } {
    const metrics = emailProcessingMonitor.getMetrics();
    const alertCount = emailAlertManager.getAlertHistory(100)
      .filter(alert => 
        !alert.response?.resolved &&
        alert.timestamp.getTime() > Date.now() - 60 * 60 * 1000 // Last hour
      ).length;

    return {
      timestamp: new Date(),
      metrics,
      health: metrics.healthStatus,
      alerts: alertCount
    };
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary(): {
    averageProcessingTime: number;
    p95ProcessingTime: number;
    errorRate: number;
    throughput: number;
    reliability: number;
  } {
    if (this.metricsHistory.length === 0) {
      return {
        averageProcessingTime: 0,
        p95ProcessingTime: 0,
        errorRate: 0,
        throughput: 0,
        reliability: 0
      };
    }

    const recentMetrics = this.metricsHistory.slice(-60); // Last hour
    
    const processingTimes = recentMetrics.map(m => m.metrics.averageProcessingTime);
    const averageProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;
    
    const sortedTimes = processingTimes.sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p95ProcessingTime = sortedTimes[p95Index] || 0;

    const totalProcessed = recentMetrics.reduce((sum, m) => sum + m.metrics.totalEmailsProcessed, 0);
    const totalFailed = recentMetrics.reduce((sum, m) => sum + m.metrics.failedProcesses, 0);
    const errorRate = totalProcessed > 0 ? (totalFailed / totalProcessed) * 100 : 0;

    const throughput = recentMetrics.reduce((sum, m) => sum + m.metrics.hourlyProcessingRate, 0) / recentMetrics.length;
    const reliability = Math.max(0, 100 - errorRate);

    return {
      averageProcessingTime,
      p95ProcessingTime,
      errorRate,
      throughput,
      reliability
    };
  }

  /**
   * Get system resource usage
   */
  public getResourceUsage(): {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      percentage: number;
    };
    disk: {
      percentage: number;
    };
  } {
    const memoryUsage = process.memoryUsage();
    const metrics = emailProcessingMonitor.getMetrics();

    return {
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: metrics.memoryUsage
      },
      cpu: {
        percentage: metrics.cpuUsage
      },
      disk: {
        percentage: 65 // Simulated - in production, get from system
      }
    };
  }

  /**
   * Get recent activity feed
   */
  public getActivityFeed(limit: number = 20): Array<{
    timestamp: Date;
    type: 'processing' | 'alert' | 'error' | 'system';
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    details?: any;
  }> {
    const activities: Array<{
      timestamp: Date;
      type: 'processing' | 'alert' | 'error' | 'system';
      severity: 'info' | 'warning' | 'error' | 'critical';
      message: string;
      details?: any;
    }> = [];

    // Get recent alerts
    const recentAlerts = emailAlertManager.getAlertHistory(10);
    recentAlerts.forEach(alert => {
      activities.push({
        timestamp: alert.timestamp,
        type: 'alert',
        severity: alert.severity as any,
        message: alert.title,
        details: { alertId: alert.id, channels: alert.channels }
      });
    });

    // Get recent errors from logs
    const recentErrors = emailLogger.getRecentErrors(24);
    recentErrors.slice(0, 10).forEach(log => {
      activities.push({
        timestamp: log.timestamp,
        type: 'error',
        severity: log.level as any,
        message: log.message,
        details: { component: log.component, category: log.category }
      });
    });

    // Get processing events from monitoring
    const processingEvents = emailProcessingMonitor.getEvents(10);
    processingEvents.forEach(event => {
      activities.push({
        timestamp: event.timestamp,
        type: 'processing',
        severity: event.type === 'processing_failed' ? 'error' : 'info',
        message: `Email ${event.type.replace('_', ' ')}: ${event.email?.subject || 'Unknown'}`,
        details: { eventType: event.type, processingTime: event.metrics?.processingTime }
      });
    });

    // Sort by timestamp and limit
    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Generate dashboard HTML
   */
  public generateDashboardHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Investra Email Processing Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .dashboard {
            max-width: 1400px;
            margin: 0 auto;
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .metric-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .metric-value {
            font-size: 2em;
            font-weight: bold;
            margin-bottom: 10px;
        }
        .metric-label {
            color: #666;
            font-size: 0.9em;
        }
        .status-healthy { color: #28a745; }
        .status-warning { color: #ffc107; }
        .status-critical { color: #dc3545; }
        .charts-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }
        .chart-container {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            height: 300px;
        }
        .alerts-section, .logs-section {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            margin-bottom: 20px;
        }
        .alert-item, .log-item {
            padding: 10px;
            border-left: 4px solid #ddd;
            margin-bottom: 10px;
            background: #f9f9f9;
        }
        .alert-critical { border-left-color: #dc3545; }
        .alert-error { border-left-color: #fd7e14; }
        .alert-warning { border-left-color: #ffc107; }
        .alert-info { border-left-color: #17a2b8; }
        .timestamp {
            font-size: 0.8em;
            color: #666;
        }
        .refresh-button {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
        }
        .health-indicators {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-top: 10px;
        }
        .health-indicator {
            padding: 5px 10px;
            border-radius: 20px;
            font-size: 0.8em;
            background: #e9ecef;
        }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>📧 Email Processing Dashboard</h1>
            <p>Real-time monitoring of email import system</p>
            <button class="refresh-button" onclick="location.reload()">🔄 Refresh</button>
            <div class="health-indicators" id="healthIndicators">
                <!-- Health indicators will be populated by JavaScript -->
            </div>
        </div>

        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-value status-healthy" id="systemStatus">Healthy</div>
                <div class="metric-label">System Status</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="processingRate">0</div>
                <div class="metric-label">Processing Rate (emails/hour)</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="errorRate">0%</div>
                <div class="metric-label">Error Rate</div>
            </div>
            <div class="metric-card">
                <div class="metric-value" id="queueSize">0</div>
                <div class="metric-label">Queue Size</div>
            </div>
        </div>

        <div class="charts-section">
            <div class="chart-container">
                <h3>Processing Time</h3>
                <canvas id="processingTimeChart"></canvas>
            </div>
            <div class="chart-container">
                <h3>Throughput</h3>
                <canvas id="throughputChart"></canvas>
            </div>
        </div>

        <div class="alerts-section">
            <h3>🚨 Recent Alerts</h3>
            <div id="alertsList">
                <!-- Alerts will be populated by JavaScript -->
            </div>
        </div>

        <div class="logs-section">
            <h3>📋 Recent Activity</h3>
            <div id="activityFeed">
                <!-- Activity feed will be populated by JavaScript -->
            </div>
        </div>
    </div>

    <script>
        // Dashboard JavaScript would go here
        // In production, this would connect to WebSocket for real-time updates
        // and use the dashboard API endpoints to fetch data
        
        async function loadDashboardData() {
            try {
                // In production, fetch from /api/dashboard endpoint
                console.log('Loading dashboard data...');
            } catch (error) {
                console.error('Failed to load dashboard data:', error);
            }
        }

        // Auto-refresh every 30 seconds
        setInterval(loadDashboardData, 30000);
        loadDashboardData();
    </script>
</body>
</html>
    `;
  }

  /**
   * Get dashboard configuration
   */
  public getConfig(): DashboardConfig {
    return { ...this.config };
  }

  /**
   * Update dashboard configuration
   */
  public updateConfig(newConfig: Partial<DashboardConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart with new configuration if active
    if (this.isActive) {
      this.stop();
      this.start();
    }
  }

  /**
   * Export dashboard data
   */
  public async exportDashboardData(format: 'json' | 'csv' = 'json'): Promise<string> {
    const data = await this.getDashboardData();
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      // CSV format - simplified version
      const rows = [
        ['Timestamp', 'Status', 'Processing Rate', 'Error Rate', 'Queue Size'],
        [
          new Date().toISOString(),
          data.overview.status,
          data.overview.processingRate.toString(),
          data.overview.errorRate.toString(),
          data.overview.queueSize.toString()
        ]
      ];
      
      return rows.map(row => row.join(',')).join('\n');
    }
  }
}

/**
 * Global dashboard instance
 */
export const emailDashboard = new EmailProcessingDashboard({
  refreshInterval: parseInt(process.env.DASHBOARD_REFRESH_INTERVAL || '5000'),
  metricsHistory: parseInt(process.env.DASHBOARD_METRICS_HISTORY || '720'),
  chartTimeRange: parseInt(process.env.DASHBOARD_CHART_TIME_RANGE || '60'),
  alertDisplayLimit: parseInt(process.env.DASHBOARD_ALERT_LIMIT || '50'),
  logDisplayLimit: parseInt(process.env.DASHBOARD_LOG_LIMIT || '100')
});

export default EmailProcessingDashboard;
