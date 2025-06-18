/**
 * Email Processing Hook
 * Manages API calls and state for email processing
 * Updated to work with simple production server endpoints
 */

import { useState, useEffect, useCallback } from 'react';
import { SimpleEmailApiService } from '../services/simpleEmailApiService';
import type {
  EmailProcessingStats,
  IMAPServiceStatus,
  ProcessingQueueItem,
  HealthCheckResponse
} from '../services/simpleEmailApiService';
import { useNotifications } from './useNotifications';

interface UseEmailProcessingReturn {
  // State
  loading: boolean;
  error: string | null;
  lastRefresh: Date;
  
  // Data
  processingStats: EmailProcessingStats | null;
  imapStatus: IMAPServiceStatus | null;
  processingQueue: ProcessingQueueItem[];
  healthCheck: HealthCheckResponse | null;
  
  // Actions
  refreshData: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshIMAPStatus: () => Promise<void>;
  refreshQueue: () => Promise<void>;
  
  // IMAP Controls
  startService: () => Promise<void>;
  stopService: () => Promise<void>;
  restartService: () => Promise<void>;
  processNow: () => Promise<void>;
}

export const useEmailProcessing = (
  autoRefresh = true,
  refreshInterval = 30000
): UseEmailProcessingReturn => {
  const { success, error: notifyError } = useNotifications();
  
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Data
  const [processingStats, setProcessingStats] = useState<EmailProcessingStats | null>(null);
  const [imapStatus, setImapStatus] = useState<IMAPServiceStatus | null>(null);
  const [processingQueue, setProcessingQueue] = useState<ProcessingQueueItem[]>([]);
  const [healthCheck, setHealthCheck] = useState<HealthCheckResponse | null>(null);

  // Helper function to handle API errors
  const handleApiError = useCallback((apiError: unknown, operation: string) => {
    const errorMessage = apiError instanceof Error ? apiError.message : `Failed to ${operation}`;
    setError(errorMessage);
    notifyError('API Error', errorMessage);
    console.error(`Email processing API error (${operation}):`, apiError);
  }, [notifyError]);

  // Refresh individual data sources
  const refreshStats = useCallback(async () => {
    try {
      console.log('🔄 Fetching processing stats...');
      const stats = await SimpleEmailApiService.getProcessingStats();
      console.log('✅ Processing stats received:', stats);
      setProcessingStats(stats);
    } catch (apiError) {
      console.error('❌ Failed to fetch processing stats:', apiError);
      handleApiError(apiError, 'fetch processing stats');
    }
  }, [handleApiError]);

  const refreshIMAPStatus = useCallback(async () => {
    try {
      console.log('🔄 Fetching IMAP status...');
      const status = await SimpleEmailApiService.getIMAPStatus();
      console.log('✅ IMAP status received:', status);
      setImapStatus(status);
    } catch (apiError) {
      console.error('❌ Failed to fetch IMAP status:', apiError);
      handleApiError(apiError, 'fetch IMAP status');
    }
  }, [handleApiError]);

  const refreshQueue = useCallback(async () => {
    try {
      console.log('🔄 Fetching processing queue...');
      const queue = await SimpleEmailApiService.getProcessingQueue();
      console.log('✅ Processing queue received:', queue);
      setProcessingQueue(queue);
    } catch (apiError) {
      console.error('❌ Failed to fetch processing queue:', apiError);
      handleApiError(apiError, 'fetch processing queue');
    }
  }, [handleApiError]);

  const refreshHealthCheck = useCallback(async () => {
    try {
      console.log('🔄 Fetching health check...');
      const health = await SimpleEmailApiService.getHealthCheck();
      console.log('✅ Health check received:', health);
      setHealthCheck(health);
    } catch (apiError) {
      console.error('❌ Failed to fetch health check:', apiError);
      handleApiError(apiError, 'fetch health check');
    }
  }, [handleApiError]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        refreshStats(),
        refreshIMAPStatus(),
        refreshQueue(),
        refreshHealthCheck()
      ]);
      
      setLastRefresh(new Date());
      
      if (autoRefresh) {
        success('Data Updated', 'Email processing data refreshed successfully');
      }
    } catch (apiError) {
      // Individual errors are already handled by the refresh functions
      console.error('Error refreshing email processing data:', apiError);
    } finally {
      setLoading(false);
    }
  }, [refreshStats, refreshIMAPStatus, refreshQueue, refreshHealthCheck, autoRefresh, success]);

  // IMAP Service Controls
  const startService = useCallback(async () => {
    setLoading(true);
    try {
      const status = await SimpleEmailApiService.startIMAPService();
      setImapStatus(status);
      success('Service Started', 'IMAP email service started successfully');
      // Refresh stats after starting
      await refreshStats();
    } catch (apiError) {
      handleApiError(apiError, 'start IMAP service');
    } finally {
      setLoading(false);
    }
  }, [success, handleApiError, refreshStats]);

  const stopService = useCallback(async () => {
    setLoading(true);
    try {
      const status = await SimpleEmailApiService.stopIMAPService();
      setImapStatus(status);
      success('Service Stopped', 'IMAP email service stopped successfully');
      // Refresh stats after stopping
      await refreshStats();
    } catch (apiError) {
      handleApiError(apiError, 'stop IMAP service');
    } finally {
      setLoading(false);
    }
  }, [success, handleApiError, refreshStats]);

  const restartService = useCallback(async () => {
    setLoading(true);
    try {
      const status = await SimpleEmailApiService.restartIMAPService();
      setImapStatus(status);
      success('Service Restarted', 'IMAP email service restarted successfully');
      // Refresh all data after restart
      await refreshData();
    } catch (apiError) {
      handleApiError(apiError, 'restart IMAP service');
    } finally {
      setLoading(false);
    }
  }, [success, handleApiError, refreshData]);

  const processNow = useCallback(async () => {
    setLoading(true);
    try {
      await SimpleEmailApiService.processEmailsNow();
      success('Processing Started', 'Manual email processing initiated');
      // Refresh queue and stats after processing
      await Promise.all([refreshQueue(), refreshStats()]);
    } catch (apiError) {
      handleApiError(apiError, 'process emails manually');
    } finally {
      setLoading(false);
    }
  }, [success, handleApiError, refreshQueue, refreshStats]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(refreshData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshData]);

  // Initial data load
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  return {
    // State
    loading,
    error,
    lastRefresh,
    
    // Data
    processingStats,
    imapStatus,
    processingQueue,
    healthCheck,
    
    // Actions
    refreshData,
    refreshStats,
    refreshIMAPStatus,
    refreshQueue,
    
    // IMAP Controls
    startService,
    stopService,
    restartService,
    processNow,
  };
};

export default useEmailProcessing;
