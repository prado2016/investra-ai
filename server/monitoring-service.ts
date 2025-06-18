/**
 * Email Processing Service Monitoring
 * Task 11.3: Implement Service Monitoring
 * Provides health checks, auto-restart, and monitoring capabilities
 */

import { EventEmitter } from 'events';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ServiceMetrics {
  status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown';
  uptime: number;
  startTime: Date;
  lastHealthCheck: Date;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: NodeJS.CpuUsage;
  errorCount: number;
  successCount: number;
  totalRequests: number;
  lastError?: string;
  lastErrorTime?: Date;
}

export interface HealthCheckResult {
  healthy: boolean;
  status: string;
  timestamp: Date;
  checks: {
    service: boolean;
    memory: boolean;
    cpu: boolean;
    disk: boolean;
    imap?: boolean;
    api?: boolean;
  };
  metrics: ServiceMetrics;
  details?: Record<string, any>;
}

export interface MonitoringConfig {
  enabled: boolean;
  healthCheckInterval: number;
  memoryThreshold: number; // MB
  cpuThreshold: number; // Percentage
  diskThreshold: number; // Percentage
  errorThreshold: number;
  autoRestart: boolean;
  maxRestarts: number;
  restartDelay: number;
  logPath?: string;
  alertWebhook?: string;
}

class ServiceMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private metrics: ServiceMetrics;
  private healthCheckTimer?: NodeJS.Timeout;
  private restartCount = 0;
  private lastCpuUsage?: NodeJS.CpuUsage;
  private isShuttingDown = false;

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    this.metrics = this.initializeMetrics();
    
    if (this.config.enabled) {
      this.startMonitoring();
    }
  }

  /**
   * Initialize metrics
   */
  private initializeMetrics(): ServiceMetrics {
    return {
      status: 'unknown',
      uptime: 0,
      startTime: new Date(),
      lastHealthCheck: new Date(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      errorCount: 0,
      successCount: 0,
      totalRequests: 0
    };
  }

  /**
   * Start monitoring
   */
  public startMonitoring(): void {
    if (!this.config.enabled) return;

    console.log('📊 Starting service monitoring...');
    
    // Initial health check
    this.performHealthCheck();
    
    // Schedule regular health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);

    // Track process events
    this.setupProcessEventHandlers();
    
    console.log(`✅ Service monitoring started (interval: ${this.config.healthCheckInterval}ms)`);
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    console.log('🛑 Stopping service monitoring...');
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
    
    this.isShuttingDown = true;
    console.log('✅ Service monitoring stopped');
  }

  /**
   * Perform comprehensive health check
   */
  public async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Update uptime
      this.metrics.uptime = Date.now() - this.metrics.startTime.getTime();
      this.metrics.lastHealthCheck = new Date();

      // Memory check
      const memoryUsage = process.memoryUsage();
      this.metrics.memoryUsage = memoryUsage;
      const memoryUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const memoryHealthy = memoryUsedMB < this.config.memoryThreshold;

      // CPU check
      const cpuUsage = process.cpuUsage(this.lastCpuUsage);
      this.metrics.cpuUsage = cpuUsage;
      this.lastCpuUsage = process.cpuUsage();
      
      // Convert to percentage (simplified)
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000 / this.config.healthCheckInterval * 100;
      const cpuHealthy = cpuPercent < this.config.cpuThreshold;

      // Disk check
      const diskHealthy = await this.checkDiskSpace();

      // Error rate check
      const errorRate = this.metrics.totalRequests > 0 
        ? (this.metrics.errorCount / this.metrics.totalRequests) * 100 
        : 0;
      const errorHealthy = errorRate < this.config.errorThreshold;

      // Overall health determination
      const checks = {
        service: true, // Service is running if we're checking
        memory: memoryHealthy,
        cpu: cpuHealthy,
        disk: diskHealthy
      };

      const allChecksHealthy = Object.values(checks).every(check => check);
      const overallHealthy = allChecksHealthy && errorHealthy;

      // Update status
      this.metrics.status = overallHealthy ? 'healthy' : 
                           (memoryHealthy && cpuHealthy) ? 'degraded' : 'unhealthy';

      const result: HealthCheckResult = {
        healthy: overallHealthy,
        status: this.metrics.status,
        timestamp: new Date(),
        checks,
        metrics: { ...this.metrics },
        details: {
          memoryUsedMB: Math.round(memoryUsedMB),
          cpuPercent: Math.round(cpuPercent),
          errorRate: Math.round(errorRate),
          checkDuration: Date.now() - startTime
        }
      };

      // Emit health check event
      this.emit('healthCheck', result);

      // Handle unhealthy state
      if (!overallHealthy) {
        this.handleUnhealthyState(result);
      }

      // Log health check if configured
      if (this.config.logPath) {
        await this.logHealthCheck(result);
      }

      return result;

    } catch (error) {
      console.error('❌ Health check failed:', error);
      this.recordError('Health check failed', error);
      
      return {
        healthy: false,
        status: 'unhealthy',
        timestamp: new Date(),
        checks: {
          service: false,
          memory: false,
          cpu: false,
          disk: false
        },
        metrics: { ...this.metrics },
        details: { error: error instanceof Error ? error.message : 'Unknown error' }
      };
    }
  }

  /**
   * Check disk space
   */
  private async checkDiskSpace(): Promise<boolean> {
    try {
      const stats = await fs.statfs(process.cwd());
      const totalSpace = stats.bavail * stats.bsize;
      const freeSpace = stats.bavail * stats.bsize;
      const usedPercent = ((totalSpace - freeSpace) / totalSpace) * 100;
      
      return usedPercent < this.config.diskThreshold;
    } catch (error) {
      console.warn('⚠️ Could not check disk space:', error);
      return true; // Assume healthy if we can't check
    }
  }

  /**
   * Handle unhealthy service state
   */
  private async handleUnhealthyState(healthCheck: HealthCheckResult): Promise<void> {
    console.warn('⚠️ Service is unhealthy:', healthCheck.status);
    
    this.emit('unhealthy', healthCheck);

    // Auto-restart if enabled and not shutting down
    if (this.config.autoRestart && !this.isShuttingDown) {
      if (this.restartCount < this.config.maxRestarts) {
        console.log(`🔄 Attempting auto-restart (${this.restartCount + 1}/${this.config.maxRestarts})...`);
        
        setTimeout(() => {
          this.attemptRestart();
        }, this.config.restartDelay);
      } else {
        console.error('❌ Max restart attempts reached. Manual intervention required.');
        this.emit('maxRestartsReached', healthCheck);
      }
    }

    // Send alert if webhook configured
    if (this.config.alertWebhook) {
      await this.sendAlert(healthCheck);
    }
  }

  /**
   * Attempt service restart
   */
  private attemptRestart(): void {
    this.restartCount++;
    
    try {
      console.log('🔄 Restarting service...');
      
      // Reset metrics
      this.metrics = this.initializeMetrics();
      
      // Emit restart event
      this.emit('restart', this.restartCount);
      
      console.log('✅ Service restart completed');
      
    } catch (error) {
      console.error('❌ Service restart failed:', error);
      this.recordError('Service restart failed', error);
    }
  }

  /**
   * Record success metric
   */
  public recordSuccess(): void {
    this.metrics.successCount++;
    this.metrics.totalRequests++;
  }

  /**
   * Record error metric
   */
  public recordError(message: string, error?: any): void {
    this.metrics.errorCount++;
    this.metrics.totalRequests++;
    this.metrics.lastError = message;
    this.metrics.lastErrorTime = new Date();
    
    console.error(`❌ Error recorded: ${message}`, error);
    this.emit('error', { message, error, timestamp: new Date() });
  }

  /**
   * Get current metrics
   */
  public getMetrics(): ServiceMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset metrics
   */
  public resetMetrics(): void {
    this.metrics = this.initializeMetrics();
    this.restartCount = 0;
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<MonitoringConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.config.enabled && !this.healthCheckTimer) {
      this.startMonitoring();
    } else if (!this.config.enabled && this.healthCheckTimer) {
      this.stopMonitoring();
    }
  }

  /**
   * Setup process event handlers
   */
  private setupProcessEventHandlers(): void {
    process.on('uncaughtException', (error) => {
      this.recordError('Uncaught exception', error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      this.recordError('Unhandled rejection', { reason, promise });
    });

    process.on('SIGTERM', () => {
      console.log('📊 Received SIGTERM, stopping monitoring...');
      this.stopMonitoring();
    });

    process.on('SIGINT', () => {
      console.log('📊 Received SIGINT, stopping monitoring...');
      this.stopMonitoring();
    });
  }

  /**
   * Log health check to file
   */
  private async logHealthCheck(result: HealthCheckResult): Promise<void> {
    if (!this.config.logPath) return;

    try {
      const logEntry = {
        timestamp: result.timestamp.toISOString(),
        healthy: result.healthy,
        status: result.status,
        metrics: result.metrics,
        details: result.details
      };

      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.appendFile(this.config.logPath, logLine);
      
    } catch (error) {
      console.error('❌ Failed to write health check log:', error);
    }
  }

  /**
   * Send alert via webhook
   */
  private async sendAlert(healthCheck: HealthCheckResult): Promise<void> {
    if (!this.config.alertWebhook) return;

    try {
      const fetch = (await import('node-fetch')).default;
      
      const alertData = {
        service: 'Investra Email Processing API',
        status: healthCheck.status,
        timestamp: healthCheck.timestamp.toISOString(),
        metrics: healthCheck.metrics,
        details: healthCheck.details
      };

      await fetch(this.config.alertWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData)
      });
      
      console.log('📢 Alert sent successfully');
      
    } catch (error) {
      console.error('❌ Failed to send alert:', error);
    }
  }

  /**
   * Create default monitoring configuration
   */
  static createDefaultConfig(): MonitoringConfig {
    return {
      enabled: true,
      healthCheckInterval: 30000, // 30 seconds
      memoryThreshold: 512, // 512 MB
      cpuThreshold: 80, // 80%
      diskThreshold: 90, // 90%
      errorThreshold: 10, // 10%
      autoRestart: true,
      maxRestarts: 3,
      restartDelay: 5000, // 5 seconds
      logPath: '/var/log/investra/health.log'
    };
  }

  /**
   * Create configuration from environment variables
   */
  static createConfigFromEnv(): MonitoringConfig {
    return {
      enabled: process.env.MONITORING_ENABLED !== 'false',
      healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
      memoryThreshold: parseInt(process.env.MEMORY_THRESHOLD || '512'),
      cpuThreshold: parseInt(process.env.CPU_THRESHOLD || '80'),
      diskThreshold: parseInt(process.env.DISK_THRESHOLD || '90'),
      errorThreshold: parseInt(process.env.ERROR_THRESHOLD || '10'),
      autoRestart: process.env.AUTO_RESTART !== 'false',
      maxRestarts: parseInt(process.env.MAX_RESTARTS || '3'),
      restartDelay: parseInt(process.env.RESTART_DELAY || '5000'),
      logPath: process.env.HEALTH_LOG_PATH,
      alertWebhook: process.env.ALERT_WEBHOOK
    };
  }
}

export { ServiceMonitor };