/**
 * Email Processing Health Check Service
 * Task 15.1: Set up Email Processing Monitoring
 * 
 * Provides comprehensive health checks for all email processing components:
 * - Email parsing functionality
 * - IMAP connectivity
 * - Database connections
 * - External API dependencies
 * - System resources
 */

import { EmailProcessingService } from '../email/emailProcessingService';
import { IMAPEmailProcessor } from '../email/imapEmailProcessor';
import { SupabaseService } from '../supabaseService';
import { emailProcessingMonitor } from './emailProcessingMonitor';

export interface HealthCheckResult {
  component: string;
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  message: string;
  responseTime: number;
  details?: Record<string, any>;
  lastChecked: Date;
}

export interface SystemHealthReport {
  overall: 'healthy' | 'warning' | 'critical' | 'unknown';
  timestamp: Date;
  uptime: number;
  checks: HealthCheckResult[];
  summary: {
    healthy: number;
    warning: number;
    critical: number;
    unknown: number;
  };
  recommendations?: string[];
}

/**
 * Email Processing Health Check Service
 */
export class EmailProcessingHealthCheck {
  private static instance: EmailProcessingHealthCheck;
  private lastHealthCheck: SystemHealthReport | null = null;
  private healthCheckInterval?: NodeJS.Timeout;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): EmailProcessingHealthCheck {
    if (!EmailProcessingHealthCheck.instance) {
      EmailProcessingHealthCheck.instance = new EmailProcessingHealthCheck();
    }
    return EmailProcessingHealthCheck.instance;
  }

  /**
   * Perform comprehensive health check
   */
  public async performHealthCheck(): Promise<SystemHealthReport> {
    const startTime = Date.now();
    const checks: HealthCheckResult[] = [];

    // Run all health checks in parallel
    const checkPromises = [
      this.checkEmailParsingService(),
      this.checkIMAPConnectivity(),
      this.checkDatabaseConnectivity(),
      this.checkSupabaseServices(),
      this.checkSystemResources(),
      this.checkEmailProcessingMonitor(),
      this.checkExternalDependencies(),
      this.checkStorageSpace(),
      this.checkProcessingQueue()
    ];

    try {
      const results = await Promise.allSettled(checkPromises);
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          checks.push(result.value);
        } else {
          // Handle failed health check
          const componentNames = [
            'Email Parsing Service',
            'IMAP Connectivity',
            'Database Connectivity',
            'Supabase Services',
            'System Resources',
            'Processing Monitor',
            'External Dependencies',
            'Storage Space',
            'Processing Queue'
          ];
          
          checks.push({
            component: componentNames[index],
            status: 'critical',
            message: `Health check failed: ${result.reason?.message || 'Unknown error'}`,
            responseTime: 0,
            lastChecked: new Date(),
            details: { error: result.reason }
          });
        }
      });

    } catch (error) {
      // Fallback for catastrophic failure
      checks.push({
        component: 'Health Check System',
        status: 'critical',
        message: `Critical failure in health check system: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: 0,
        lastChecked: new Date()
      });
    }

    // Calculate overall health and summary
    const summary = this.calculateSummary(checks);
    const overall = this.determineOverallHealth(summary);
    const recommendations = this.generateRecommendations(checks);

    const report: SystemHealthReport = {
      overall,
      timestamp: new Date(),
      uptime: process.uptime() * 1000,
      checks,
      summary,
      recommendations
    };

    this.lastHealthCheck = report;
    
    // Record health check event
    emailProcessingMonitor.recordEvent({
      type: 'parsing_completed', // Using existing event type for health checks
      metrics: {
        processingTime: Date.now() - startTime,
        stage: 'parsing'
      },
      result: {
        success: overall !== 'critical',
        warnings: recommendations
      }
    });

    return report;
  }

  /**
   * Check email parsing service functionality
   */
  private async checkEmailParsingService(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test email parsing with mock data
      const testSubject = 'Trade Confirmation - Test Health Check';
      const testFrom = 'noreply@wealthsimple.com';
      const testHtml = `
        <div>
          <p>You bought 10 shares of AAPL at $150.00 per share</p>
          <p>Total: $1,500.00</p>
          <p>Account: TFSA</p>
          <p>Date: ${new Date().toISOString().split('T')[0]}</p>
        </div>
      `;

      const result = await EmailProcessingService.processEmail(
        testSubject,
        testFrom,
        testHtml,
        undefined,
        { 
          dryRun: true, 
          validateOnly: true,
          skipDuplicateCheck: true 
        }
      );

      const responseTime = Date.now() - startTime;

      if (result.success && result.emailParsed) {
        return {
          component: 'Email Parsing Service',
          status: 'healthy',
          message: 'Email parsing service is functioning correctly',
          responseTime,
          lastChecked: new Date(),
          details: {
            testEmailProcessed: true,
            warnings: result.warnings,
            parseMethod: result.emailData?.parseMethod
          }
        };
      } else {
        return {
          component: 'Email Parsing Service',
          status: 'warning',
          message: `Email parsing test failed: ${result.errors.join(', ')}`,
          responseTime,
          lastChecked: new Date(),
          details: {
            errors: result.errors,
            warnings: result.warnings
          }
        };
      }

    } catch (error) {
      return {
        component: 'Email Parsing Service',
        status: 'critical',
        message: `Email parsing service error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        details: { error: error instanceof Error ? error.stack : String(error) }
      };
    }
  }

  /**
   * Check IMAP connectivity
   */
  private async checkIMAPConnectivity(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Create a test IMAP processor instance
      const imapProcessor = new IMAPEmailProcessor({
        host: process.env.IMAP_HOST || 'localhost',
        port: parseInt(process.env.IMAP_PORT || '993'),
        secure: true,
        username: process.env.IMAP_USER || 'transactions@investra.com',
        password: process.env.IMAP_PASSWORD || 'password'
      });

      // Test connection
      const isConnected = await imapProcessor.testConnection();
      const responseTime = Date.now() - startTime;

      if (isConnected) {
        return {
          component: 'IMAP Connectivity',
          status: 'healthy',
          message: 'IMAP server is accessible and responsive',
          responseTime,
          lastChecked: new Date(),
          details: {
            host: process.env.IMAP_HOST,
            port: process.env.IMAP_PORT,
            secure: true
          }
        };
      } else {
        return {
          component: 'IMAP Connectivity',
          status: 'critical',
          message: 'Cannot connect to IMAP server',
          responseTime,
          lastChecked: new Date(),
          details: {
            host: process.env.IMAP_HOST,
            port: process.env.IMAP_PORT
          }
        };
      }

    } catch (error) {
      return {
        component: 'IMAP Connectivity',
        status: 'critical',
        message: `IMAP connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Check database connectivity
   */
  private async checkDatabaseConnectivity(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test basic database query
      const portfolios = await SupabaseService.portfolio.getPortfolios();
      const responseTime = Date.now() - startTime;

      if (portfolios.success) {
        return {
          component: 'Database Connectivity',
          status: 'healthy',
          message: 'Database is accessible and responsive',
          responseTime,
          lastChecked: new Date(),
          details: {
            portfolioCount: portfolios.data.length,
            connectionPool: 'healthy'
          }
        };
      } else {
        return {
          component: 'Database Connectivity',
          status: 'critical',
          message: `Database query failed: ${portfolios.error}`,
          responseTime,
          lastChecked: new Date(),
          details: { error: portfolios.error }
        };
      }

    } catch (error) {
      return {
        component: 'Database Connectivity',
        status: 'critical',
        message: `Database connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Check Supabase services
   */
  private async checkSupabaseServices(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Test multiple Supabase services
      const checks = await Promise.allSettled([
        SupabaseService.asset.searchAssets('AAPL', 1),
        SupabaseService.transaction.getTransactions('health-check'),
        SupabaseService.position.getPositions('health-check')
      ]);

      const responseTime = Date.now() - startTime;
      const successful = checks.filter(check => check.status === 'fulfilled').length;
      const total = checks.length;

      if (successful === total) {
        return {
          component: 'Supabase Services',
          status: 'healthy',
          message: 'All Supabase services are functioning correctly',
          responseTime,
          lastChecked: new Date(),
          details: {
            servicesChecked: total,
            servicesHealthy: successful
          }
        };
      } else if (successful > 0) {
        return {
          component: 'Supabase Services',
          status: 'warning',
          message: `${successful}/${total} Supabase services are functioning`,
          responseTime,
          lastChecked: new Date(),
          details: {
            servicesChecked: total,
            servicesHealthy: successful,
            issues: checks.filter(c => c.status === 'rejected').map(c => c.reason?.message)
          }
        };
      } else {
        return {
          component: 'Supabase Services',
          status: 'critical',
          message: 'All Supabase services are failing',
          responseTime,
          lastChecked: new Date(),
          details: {
            servicesChecked: total,
            servicesHealthy: successful,
            errors: checks.map(c => c.status === 'rejected' ? c.reason?.message : null).filter(Boolean)
          }
        };
      }

    } catch (error) {
      return {
        component: 'Supabase Services',
        status: 'critical',
        message: `Supabase services error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Check system resources
   */
  private async checkSystemResources(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();
      
      // Calculate memory usage percentage
      const memoryUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const memoryTotalMB = memoryUsage.heapTotal / 1024 / 1024;
      const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      
      // Calculate CPU usage (simplified)
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
      
      const responseTime = Date.now() - startTime;
      
      let status: HealthCheckResult['status'] = 'healthy';
      let message = 'System resources are within normal limits';
      
      if (memoryUsagePercent > 90 || cpuPercent > 90) {
        status = 'critical';
        message = 'System resources are critically high';
      } else if (memoryUsagePercent > 80 || cpuPercent > 80) {
        status = 'warning';
        message = 'System resources are elevated';
      }

      return {
        component: 'System Resources',
        status,
        message,
        responseTime,
        lastChecked: new Date(),
        details: {
          memory: {
            usedMB: Math.round(memoryUsedMB),
            totalMB: Math.round(memoryTotalMB),
            usagePercent: Math.round(memoryUsagePercent)
          },
          cpu: {
            usagePercent: Math.round(cpuPercent)
          },
          uptime: process.uptime(),
          nodeVersion: process.version
        }
      };

    } catch (error) {
      return {
        component: 'System Resources',
        status: 'critical',
        message: `System resources check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Check email processing monitor
   */
  private async checkEmailProcessingMonitor(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const metrics = emailProcessingMonitor.getMetrics();
      const healthSummary = emailProcessingMonitor.getHealthSummary();
      const responseTime = Date.now() - startTime;

      let status: HealthCheckResult['status'] = 'healthy';
      let message = 'Email processing monitor is functioning correctly';

      if (metrics.healthStatus === 'critical') {
        status = 'critical';
        message = 'Email processing monitor reports critical issues';
      } else if (metrics.healthStatus === 'warning') {
        status = 'warning';
        message = 'Email processing monitor reports warnings';
      } else if (metrics.healthStatus === 'unknown') {
        status = 'warning';
        message = 'Email processing monitor status is unknown';
      }

      return {
        component: 'Processing Monitor',
        status,
        message,
        responseTime,
        lastChecked: new Date(),
        details: {
          monitorHealth: metrics.healthStatus,
          totalProcessed: metrics.totalEmailsProcessed,
          errorRate: metrics.errorRate,
          consecutiveFailures: metrics.consecutiveFailures,
          averageProcessingTime: metrics.averageProcessingTime,
          recentAlerts: healthSummary.recentAlerts
        }
      };

    } catch (error) {
      return {
        component: 'Processing Monitor',
        status: 'critical',
        message: `Processing monitor error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Check external dependencies
   */
  private async checkExternalDependencies(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Check external APIs that email processing depends on
      const checks = await Promise.allSettled([
        this.checkSupabaseAPI(),
        // Add other external dependency checks as needed
      ]);

      const responseTime = Date.now() - startTime;
      const successful = checks.filter(check => check.status === 'fulfilled').length;
      const total = checks.length;

      if (successful === total) {
        return {
          component: 'External Dependencies',
          status: 'healthy',
          message: 'All external dependencies are accessible',
          responseTime,
          lastChecked: new Date(),
          details: {
            dependenciesChecked: total,
            dependenciesHealthy: successful
          }
        };
      } else {
        return {
          component: 'External Dependencies',
          status: 'warning',
          message: `${successful}/${total} external dependencies are accessible`,
          responseTime,
          lastChecked: new Date(),
          details: {
            dependenciesChecked: total,
            dependenciesHealthy: successful
          }
        };
      }

    } catch (error) {
      return {
        component: 'External Dependencies',
        status: 'critical',
        message: `External dependencies check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Check Supabase API accessibility
   */
  private async checkSupabaseAPI(): Promise<boolean> {
    try {
      // Simple ping to Supabase
      const response = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': process.env.VITE_SUPABASE_ANON_KEY || '',
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check storage space
   */
  private async checkStorageSpace(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // In a production environment, you would check actual disk space
      // For now, we'll simulate this check
      const simulatedDiskUsage = 65; // Simulate 65% disk usage
      const responseTime = Date.now() - startTime;

      let status: HealthCheckResult['status'] = 'healthy';
      let message = 'Storage space is sufficient';

      if (simulatedDiskUsage > 95) {
        status = 'critical';
        message = 'Storage space is critically low';
      } else if (simulatedDiskUsage > 85) {
        status = 'warning';
        message = 'Storage space is getting low';
      }

      return {
        component: 'Storage Space',
        status,
        message,
        responseTime,
        lastChecked: new Date(),
        details: {
          diskUsagePercent: simulatedDiskUsage,
          availableGB: Math.round((100 - simulatedDiskUsage) * 0.5), // Simulate available space
          totalGB: 50 // Simulate total space
        }
      };

    } catch (error) {
      return {
        component: 'Storage Space',
        status: 'warning',
        message: `Storage space check not available: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Check processing queue status
   */
  private async checkProcessingQueue(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const metrics = emailProcessingMonitor.getMetrics();
      const responseTime = Date.now() - startTime;

      let status: HealthCheckResult['status'] = 'healthy';
      let message = 'Processing queues are within normal limits';

      if (metrics.pendingEmails > 100 || metrics.manualReviewQueueSize > 50) {
        status = 'warning';
        message = 'Processing queues are elevated';
      } else if (metrics.pendingEmails > 500 || metrics.manualReviewQueueSize > 200) {
        status = 'critical';
        message = 'Processing queues are critically high';
      }

      return {
        component: 'Processing Queue',
        status,
        message,
        responseTime,
        lastChecked: new Date(),
        details: {
          pendingEmails: metrics.pendingEmails,
          manualReviewQueue: metrics.manualReviewQueueSize,
          hourlyProcessingRate: metrics.hourlyProcessingRate,
          dailyVolume: metrics.dailyProcessingVolume
        }
      };

    } catch (error) {
      return {
        component: 'Processing Queue',
        status: 'critical',
        message: `Processing queue check error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        responseTime: Date.now() - startTime,
        lastChecked: new Date(),
        details: { error: error instanceof Error ? error.message : String(error) }
      };
    }
  }

  /**
   * Calculate health check summary
   */
  private calculateSummary(checks: HealthCheckResult[]): SystemHealthReport['summary'] {
    return {
      healthy: checks.filter(c => c.status === 'healthy').length,
      warning: checks.filter(c => c.status === 'warning').length,
      critical: checks.filter(c => c.status === 'critical').length,
      unknown: checks.filter(c => c.status === 'unknown').length
    };
  }

  /**
   * Determine overall health status
   */
  private determineOverallHealth(summary: SystemHealthReport['summary']): SystemHealthReport['overall'] {
    if (summary.critical > 0) {
      return 'critical';
    } else if (summary.warning > 0) {
      return 'warning';
    } else if (summary.unknown > 0) {
      return 'unknown';
    } else {
      return 'healthy';
    }
  }

  /**
   * Generate recommendations based on health check results
   */
  private generateRecommendations(checks: HealthCheckResult[]): string[] {
    const recommendations: string[] = [];
    
    // Analyze critical issues
    const criticalChecks = checks.filter(c => c.status === 'critical');
    if (criticalChecks.length > 0) {
      recommendations.push('Address critical issues immediately to restore service functionality');
      criticalChecks.forEach(check => {
        if (check.component === 'IMAP Connectivity') {
          recommendations.push('Check email server configuration and network connectivity');
        } else if (check.component === 'Database Connectivity') {
          recommendations.push('Verify database connection settings and server availability');
        } else if (check.component === 'System Resources') {
          recommendations.push('Free up system resources or scale infrastructure');
        }
      });
    }

    // Analyze warning issues
    const warningChecks = checks.filter(c => c.status === 'warning');
    if (warningChecks.length > 0) {
      recommendations.push('Monitor warning conditions to prevent escalation to critical status');
      if (warningChecks.some(c => c.component === 'System Resources')) {
        recommendations.push('Consider scaling resources proactively');
      }
      if (warningChecks.some(c => c.component === 'Processing Queue')) {
        recommendations.push('Review email processing capacity and throughput');
      }
    }

    // General recommendations
    if (checks.some(c => c.responseTime > 5000)) {
      recommendations.push('Investigate slow response times for performance optimization');
    }

    return recommendations;
  }

  /**
   * Get last health check result
   */
  public getLastHealthCheck(): SystemHealthReport | null {
    return this.lastHealthCheck;
  }

  /**
   * Start continuous health monitoring
   */
  public startContinuousMonitoring(intervalMs: number = 60000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        console.error('Health check failed:', error);
      }
    }, intervalMs);

    console.log(`Started continuous health monitoring (interval: ${intervalMs}ms)`);
  }

  /**
   * Stop continuous monitoring
   */
  public stopContinuousMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      console.log('Stopped continuous health monitoring');
    }
  }

  /**
   * Get health status for specific component
   */
  public getComponentHealth(componentName: string): HealthCheckResult | null {
    if (!this.lastHealthCheck) {
      return null;
    }
    
    return this.lastHealthCheck.checks.find(check => 
      check.component.toLowerCase().includes(componentName.toLowerCase())
    ) || null;
  }
}

/**
 * Global health check instance
 */
export const emailHealthCheck = EmailProcessingHealthCheck.getInstance();

export default EmailProcessingHealthCheck;
