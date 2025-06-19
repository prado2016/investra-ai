/**
 * Email Processing Hook
 * Manages API calls and state for email processing
 * Updated to work with simple production server endpoints
 */

import { useState, useEffect, useCallback } from 'react';
import { SimpleEmailApiService } from '../services/simpleEmailApiService';
import { EnhancedEmailApiService } from '../services/enhancedEmailApiService';
import type {
  EmailProcessingStats,
  IMAPServiceStatus,
  ProcessingQueueItem,
  HealthCheckResponse
} from '../services/simpleEmailApiService';
import type { HealthCheckResponse as EnhancedHealthCheckResponse } from '../services/enhancedEmailApiService';
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
  const [isEnhancedServer, setIsEnhancedServer] = useState<boolean>(false);
  
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

  // Detect which server type we're using
  const detectServerType = useCallback(async () => {
    try {
      // In production, try enhanced server on port 3001 first
      const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
      
      if (isProduction) {
        // Try enhanced server on port 3001
        const enhancedServerUrl = `${window.location.protocol}//${window.location.hostname}:3001`;
        console.log('🔍 Checking for enhanced server at:', enhancedServerUrl);
        
        try {
          const response = await fetch(`${enhancedServerUrl}/health`);
          if (response.ok) {
            const data = await response.json();
            if (data.status === 'healthy' && data.version) {
              setIsEnhancedServer(true);
              console.log('✅ Detected enhanced production server with real IMAP capabilities');
              // Store the enhanced server URL for API calls
              (window as any).__ENHANCED_SERVER_URL__ = enhancedServerUrl;
              return;
            }
          }
        } catch (enhancedError) {
          console.log('⚠️ Enhanced server not available on port 3001:', enhancedError);
        }
      }
      
      // Try local enhanced server endpoints (development mode)
      // In development, check port 3001 directly
      try {
        console.log('🔍 Checking localhost:3001 for enhanced server...');
        const enhancedResponse = await fetch('http://localhost:3001/health');
        if (enhancedResponse.ok) {
          const enhancedData = await enhancedResponse.json();
          console.log('🔍 Enhanced server response:', enhancedData);
          
          // Enhanced server returns detailed endpoint information
          if (enhancedData.data?.endpoints?.imap || enhancedData.data?.services?.emailProcessing) {
            setIsEnhancedServer(true);
            console.log('✅ Detected enhanced development server with real IMAP capabilities');
            // Store the enhanced server URL for API calls
            (window as any).__ENHANCED_SERVER_URL__ = 'http://localhost:3001';
            return;
          } else {
            console.log('⚠️ Enhanced server health response missing required fields');
          }
        } else {
          console.log('⚠️ Enhanced server health check failed with status:', enhancedResponse.status);
        }
      } catch (localEnhancedError) {
        console.log('⚠️ Enhanced server not available on localhost:3001:', localEnhancedError);
      }
      
      // Also try the main dev server health endpoint as fallback
      const response = await fetch('/health');
      if (response.ok) {
        const data = await response.json();
        
        // Enhanced server returns detailed endpoint information
        if (data.data?.endpoints?.imap || data.data?.services?.emailProcessing) {
          setIsEnhancedServer(true);
          console.log('✅ Detected enhanced development server with real IMAP capabilities');
          return;
        }
      }
      
      // Try IMAP status endpoint as fallback
      const imapResponse = await fetch('/api/imap/status');
      if (imapResponse.ok) {
        const imapData = await imapResponse.json();
        // Enhanced server returns structured IMAP status
        if (imapData.data && typeof imapData.data === 'object') {
          setIsEnhancedServer(true);
          console.log('✅ Detected enhanced server via IMAP endpoint');
          return;
        }
      }
      
      // Fall back to simple server
      setIsEnhancedServer(false);
      console.log('📦 Using simple production server (mock data mode)');
    } catch (error) {
      setIsEnhancedServer(false);
      console.log('📦 Defaulting to simple production server due to detection error:', error);
    }
  }, []);

  // Get the appropriate API service
  const getApiService = useCallback(() => {
    console.log(`🔧 API Service Selection: Enhanced=${isEnhancedServer}, Using=${isEnhancedServer ? 'EnhancedEmailApiService' : 'SimpleEmailApiService'}`);
    return isEnhancedServer ? EnhancedEmailApiService : SimpleEmailApiService;
  }, [isEnhancedServer]);

  // Refresh individual data sources
  const refreshStats = useCallback(async () => {
    try {
      console.log('🔄 Fetching processing stats...');
      const ApiService = getApiService();
      const stats = await ApiService.getProcessingStats();
      console.log('✅ Processing stats received:', stats);
      setProcessingStats(stats);
    } catch (apiError) {
      console.error('❌ Failed to fetch processing stats:', apiError);
      handleApiError(apiError, 'fetch processing stats');
    }
  }, [handleApiError, getApiService]);

  const refreshIMAPStatus = useCallback(async () => {
    try {
      console.log('🔄 Fetching IMAP status...');
      const ApiService = getApiService();
      const status = await ApiService.getIMAPStatus();
      console.log('✅ IMAP status received:', status);
      setImapStatus(status);
    } catch (apiError) {
      console.error('❌ Failed to fetch IMAP status:', apiError);
      handleApiError(apiError, 'fetch IMAP status');
    }
  }, [handleApiError, getApiService]);

  const refreshQueue = useCallback(async () => {
    try {
      console.log('🔄 Fetching processing queue...');
      const ApiService = getApiService();
      const queue = await ApiService.getProcessingQueue();
      console.log('✅ Processing queue received:', queue);
      setProcessingQueue(queue);
    } catch (apiError) {
      console.error('❌ Failed to fetch processing queue:', apiError);
      handleApiError(apiError, 'fetch processing queue');
    }
  }, [handleApiError, getApiService]);

  const refreshHealthCheck = useCallback(async () => {
    try {
      console.log('🔄 Fetching health check...');
      const ApiService = getApiService();
      const health = await ApiService.getHealthCheck();
      console.log('✅ Health check received:', health);
      setHealthCheck(health);
    } catch (apiError) {
      console.error('❌ Failed to fetch health check:', apiError);
      handleApiError(apiError, 'fetch health check');
    }
  }, [handleApiError, getApiService]);

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
      const ApiService = getApiService();
      const status = await ApiService.startIMAPService();
      setImapStatus(status);
      success('Service Started', 'IMAP email service started successfully');
      // Refresh stats after starting
      await refreshStats();
    } catch (apiError) {
      handleApiError(apiError, 'start IMAP service');
    } finally {
      setLoading(false);
    }
  }, [success, handleApiError, refreshStats, getApiService]);

  const stopService = useCallback(async () => {
    setLoading(true);
    try {
      const ApiService = getApiService();
      const status = await ApiService.stopIMAPService();
      setImapStatus(status);
      success('Service Stopped', 'IMAP email service stopped successfully');
      // Refresh stats after stopping
      await refreshStats();
    } catch (apiError) {
      handleApiError(apiError, 'stop IMAP service');
    } finally {
      setLoading(false);
    }
  }, [success, handleApiError, refreshStats, getApiService]);

  const restartService = useCallback(async () => {
    setLoading(true);
    try {
      const ApiService = getApiService();
      const status = await ApiService.restartIMAPService();
      setImapStatus(status);
      success('Service Restarted', 'IMAP email service restarted successfully');
      // Refresh all data after restart
      await refreshData();
    } catch (apiError) {
      handleApiError(apiError, 'restart IMAP service');
    } finally {
      setLoading(false);
    }
  }, [success, handleApiError, refreshData, getApiService]);

  const processNow = useCallback(async () => {
    setLoading(true);
    try {
      const ApiService = getApiService();
      await ApiService.processEmailsNow();
      success('Processing Started', 'Manual email processing initiated');
      // Refresh queue and stats after processing
      await Promise.all([refreshQueue(), refreshStats()]);
    } catch (apiError) {
      handleApiError(apiError, 'process emails manually');
    } finally {
      setLoading(false);
    }
  }, [success, handleApiError, refreshQueue, refreshStats, getApiService]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(refreshData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshData]);

  // Server type detection - must run first
  useEffect(() => {
    detectServerType();
  }, [detectServerType]);

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
