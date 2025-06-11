/**
 * React Hook for Monitoring Supabase Connection Health
 * Provides real-time health status and performance metrics
 */

import { useState, useEffect, useCallback } from 'react';
import { enhancedSupabase } from '../lib/enhancedSupabase';
import { performanceMonitor } from '../utils/performanceMonitor';
import type { PerformanceSummary } from '../utils/performanceMonitor';

interface ConnectionHealth {
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  lastUpdate: number;
  metrics: PerformanceSummary;
  supabaseHealth: {
    isHealthy: boolean;
    consecutiveFailures: number;
    averageConnectionTime: number;
    circuitBreakerOpen: boolean;
  };
}

export const useConnectionHealth = (refreshIntervalMs: number = 30000) => {
  const [health, setHealth] = useState<ConnectionHealth>({
    status: 'unknown',
    lastUpdate: 0,
    metrics: {
      totalOperations: 0,
      successRate: 0,
      averageDuration: 0,
      maxDuration: 0,
      minDuration: 0,
      errorCount: 0,
      recentErrors: []
    },
    supabaseHealth: {
      isHealthy: true,
      consecutiveFailures: 0,
      averageConnectionTime: 0,
      circuitBreakerOpen: false
    }
  });

  const updateHealth = useCallback(() => {
    // Get Supabase client health
    const supabaseHealth = enhancedSupabase.getHealthStatus();
    
    // Get performance metrics for Supabase operations
    const metrics = performanceMonitor.getOverallSummary(5 * 60 * 1000); // Last 5 minutes
    
    // Determine overall health status
    let status: 'healthy' | 'warning' | 'critical' | 'unknown' = 'healthy';
    
    if (supabaseHealth.circuitBreakerOpen || !supabaseHealth.isHealthy) {
      status = 'critical';
    } else if (metrics.successRate < 0.8 || metrics.averageDuration > 3000) {
      status = 'warning';
    } else if (metrics.totalOperations === 0) {
      status = 'unknown';
    }

    setHealth({
      status,
      lastUpdate: Date.now(),
      metrics,
      supabaseHealth
    });
  }, []);

  // Update health on mount and at intervals
  useEffect(() => {
    updateHealth();
    const interval = setInterval(updateHealth, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [updateHealth, refreshIntervalMs]);

  // Manual refresh function
  const refresh = useCallback(() => {
    updateHealth();
  }, [updateHealth]);

  return {
    health,
    refresh,
    isHealthy: health.status === 'healthy',
    hasWarnings: health.status === 'warning',
    isCritical: health.status === 'critical'
  };
};
