/**
 * Performance Monitoring Utility
 * Tracks connection times, error rates, and provides alerts for performance issues
 */

interface PerformanceMetric {
  timestamp: number;
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
}

interface PerformanceSummary {
  totalOperations: number;
  successRate: number;
  averageDuration: number;
  maxDuration: number;
  minDuration: number;
  errorCount: number;
  recentErrors: string[];
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 operations
  private alertThresholds = {
    slowOperationMs: 5000,
    highErrorRate: 0.1, // 10%
    consecutiveErrors: 3
  };

  /**
   * Record a performance metric
   */
  recordMetric(operation: string, duration: number, success: boolean, error?: string): void {
    const metric: PerformanceMetric = {
      timestamp: Date.now(),
      operation,
      duration,
      success,
      error
    };

    this.metrics.push(metric);

    // Keep only recent metrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Check for performance alerts
    this.checkAlerts(metric);
  }

  /**
   * Start timing an operation
   */
  startTiming(operation: string): () => void {
    const startTime = performance.now();
    
    return (success: boolean = true, error?: string) => {
      const duration = performance.now() - startTime;
      this.recordMetric(operation, duration, success, error);
    };
  }

  /**
   * Get performance summary for a specific operation
   */
  getOperationSummary(operation: string, timeRangeMs?: number): PerformanceSummary {
    const cutoffTime = timeRangeMs ? Date.now() - timeRangeMs : 0;
    const relevantMetrics = this.metrics.filter(m => 
      m.operation === operation && m.timestamp > cutoffTime
    );

    if (relevantMetrics.length === 0) {
      return {
        totalOperations: 0,
        successRate: 0,
        averageDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        errorCount: 0,
        recentErrors: []
      };
    }

    const successfulOperations = relevantMetrics.filter(m => m.success);
    const durations = relevantMetrics.map(m => m.duration);
    const errors = relevantMetrics
      .filter(m => !m.success && m.error)
      .map(m => m.error!)
      .slice(-5); // Last 5 errors

    return {
      totalOperations: relevantMetrics.length,
      successRate: successfulOperations.length / relevantMetrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      errorCount: relevantMetrics.length - successfulOperations.length,
      recentErrors: errors
    };
  }

  /**
   * Get overall performance summary
   */
  getOverallSummary(timeRangeMs?: number): PerformanceSummary {
    const cutoffTime = timeRangeMs ? Date.now() - timeRangeMs : 0;
    const relevantMetrics = this.metrics.filter(m => m.timestamp > cutoffTime);

    if (relevantMetrics.length === 0) {
      return {
        totalOperations: 0,
        successRate: 0,
        averageDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        errorCount: 0,
        recentErrors: []
      };
    }

    const successfulOperations = relevantMetrics.filter(m => m.success);
    const durations = relevantMetrics.map(m => m.duration);
    const errors = relevantMetrics
      .filter(m => !m.success && m.error)
      .map(m => m.error!)
      .slice(-10); // Last 10 errors

    return {
      totalOperations: relevantMetrics.length,
      successRate: successfulOperations.length / relevantMetrics.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      errorCount: relevantMetrics.length - successfulOperations.length,
      recentErrors: errors
    };
  }

  /**
   * Check for performance alerts
   */
  private checkAlerts(metric: PerformanceMetric): void {
    // Slow operation alert
    if (metric.duration > this.alertThresholds.slowOperationMs) {
      console.warn(`🐌 Slow operation detected: ${metric.operation} took ${metric.duration.toFixed(2)}ms`);
    }

    // Consecutive errors alert
    const recentMetrics = this.metrics.slice(-this.alertThresholds.consecutiveErrors);
    if (recentMetrics.length === this.alertThresholds.consecutiveErrors && 
        recentMetrics.every(m => !m.success)) {
      console.error(`🚨 ${this.alertThresholds.consecutiveErrors} consecutive errors detected for ${metric.operation}`);
    }

    // High error rate alert (check last 20 operations)
    const recentOperations = this.metrics.slice(-20);
    if (recentOperations.length >= 10) {
      const errorRate = recentOperations.filter(m => !m.success).length / recentOperations.length;
      if (errorRate > this.alertThresholds.highErrorRate) {
        console.warn(`⚠️ High error rate detected: ${(errorRate * 100).toFixed(1)}% in recent operations`);
      }
    }
  }

  /**
   * Get operation health status
   */
  getHealthStatus(operation: string): 'healthy' | 'warning' | 'critical' {
    const summary = this.getOperationSummary(operation, 5 * 60 * 1000); // Last 5 minutes
    
    if (summary.totalOperations === 0) {
      return 'healthy'; // No recent activity
    }

    if (summary.successRate < 0.5 || summary.averageDuration > this.alertThresholds.slowOperationMs) {
      return 'critical';
    }

    if (summary.successRate < 0.8 || summary.averageDuration > this.alertThresholds.slowOperationMs * 0.5) {
      return 'warning';
    }

    return 'healthy';
  }

  /**
   * Export metrics for analysis
   */
  exportMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Update alert thresholds
   */
  updateThresholds(thresholds: Partial<typeof this.alertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
  }
}

// Create global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Export types and class
export { PerformanceMonitor };
export type { PerformanceMetric, PerformanceSummary };
