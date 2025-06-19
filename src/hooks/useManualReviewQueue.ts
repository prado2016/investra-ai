/**
 * Manual Review Queue Hook
 * Manages API calls and state for manual review functionality
 * Connects to real enhanced server endpoints for duplicate detection
 */

import { useState, useEffect, useCallback } from 'react';
import { EnhancedEmailApiService } from '../services/enhancedEmailApiService';
// import { SimpleEmailApiService } from '../services/simpleEmailApiService';
import type { ManualReviewItem, ManualReviewStats } from '../services/enhancedEmailApiService';
import { useNotifications } from './useNotifications';

interface UseManualReviewQueueReturn {
  // State
  loading: boolean;
  error: string | null;
  lastRefresh: Date;
  
  // Data
  reviewItems: ManualReviewItem[];
  stats: ManualReviewStats | null;
  
  // Actions
  refreshQueue: () => Promise<void>;
  refreshStats: () => Promise<void>;
  handleReviewAction: (itemId: string, decision: 'approve' | 'reject' | 'escalate', notes?: string) => Promise<boolean>;
}

export const useManualReviewQueue = (
  autoRefresh = true,
  refreshInterval = 30000
): UseManualReviewQueueReturn => {
  const { success, error: notifyError } = useNotifications();
  
  // State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isEnhancedServer, setIsEnhancedServer] = useState<boolean>(false);
  
  // Data
  const [reviewItems, setReviewItems] = useState<ManualReviewItem[]>([]);
  const [stats, setStats] = useState<ManualReviewStats | null>(null);

  // Helper function to handle API errors
  const handleApiError = useCallback((apiError: unknown, operation: string) => {
    const errorMessage = apiError instanceof Error ? apiError.message : `Failed to ${operation}`;
    setError(errorMessage);
    notifyError('Manual Review Error', errorMessage);
    console.error(`Manual review API error (${operation}):`, apiError);
  }, [notifyError]);

  // Detect which server type we're using (enhanced vs simple)
  const detectServerType = useCallback(async () => {
    try {
      // Check if enhanced server URL is already detected by other hooks
      const enhancedServerUrl = (window as any).__ENHANCED_SERVER_URL__;
      if (enhancedServerUrl) {
        setIsEnhancedServer(true);
        console.log('✅ Using enhanced server for manual review queue');
        return;
      }

      // Try enhanced server endpoints
      const response = await fetch('/api/manual-review/stats');
      if (response.ok) {
        setIsEnhancedServer(true);
        console.log('✅ Detected enhanced server with manual review capabilities');
        return;
      }
      
      // Fall back to simple server (no manual review capabilities)
      setIsEnhancedServer(false);
      console.log('📦 Using simple server (manual review not available)');
    } catch (error) {
      setIsEnhancedServer(false);
      console.log('📦 Defaulting to simple server due to detection error:', error);
    }
  }, []);

  // Get the appropriate API service (unused for now but kept for future use)
  // const getApiService = useCallback(() => {
  //   return isEnhancedServer ? EnhancedEmailApiService : SimpleEmailApiService;
  // }, [isEnhancedServer]);

  // Refresh review queue
  const refreshQueue = useCallback(async () => {
    try {
      if (!isEnhancedServer) {
        // Simple server doesn't have manual review capabilities
        setReviewItems([]);
        return;
      }

      console.log('🔄 Fetching manual review queue...');
      const items = await EnhancedEmailApiService.getManualReviewQueue();
      console.log('✅ Manual review queue received:', items);
      setReviewItems(items);
    } catch (apiError) {
      console.error('❌ Failed to fetch manual review queue:', apiError);
      handleApiError(apiError, 'fetch manual review queue');
    }
  }, [isEnhancedServer, handleApiError]);

  // Refresh stats
  const refreshStats = useCallback(async () => {
    try {
      if (!isEnhancedServer) {
        // Simple server doesn't have manual review capabilities
        setStats(null);
        return;
      }

      console.log('🔄 Fetching manual review stats...');
      const statsData = await EnhancedEmailApiService.getManualReviewStats();
      console.log('✅ Manual review stats received:', statsData);
      setStats(statsData);
    } catch (apiError) {
      console.error('❌ Failed to fetch manual review stats:', apiError);
      handleApiError(apiError, 'fetch manual review stats');
    }
  }, [isEnhancedServer, handleApiError]);

  // Handle review actions (approve, reject, escalate)
  const handleReviewAction = useCallback(async (
    itemId: string, 
    decision: 'approve' | 'reject' | 'escalate', 
    notes?: string
  ): Promise<boolean> => {
    if (!isEnhancedServer) {
      notifyError('Not Available', 'Manual review actions are not available on the simple server');
      return false;
    }

    setLoading(true);
    try {
      console.log(`🔄 Processing review action: ${decision} for item ${itemId}`);
      const result = await EnhancedEmailApiService.processReviewAction(itemId, 'review', decision, notes);
      
      if (result.success) {
        success('Review Processed', result.message);
        console.log('✅ Review action processed successfully');
        
        // Refresh queue and stats after action
        await Promise.all([refreshQueue(), refreshStats()]);
        return true;
      } else {
        handleApiError(new Error(result.message), 'process review action');
        return false;
      }
    } catch (apiError) {
      handleApiError(apiError, 'process review action');
      return false;
    } finally {
      setLoading(false);
    }
  }, [isEnhancedServer, success, handleApiError, refreshQueue, refreshStats]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        refreshQueue(),
        refreshStats()
      ]);
      
      setLastRefresh(new Date());
      
      if (autoRefresh && isEnhancedServer) {
        success('Manual Review Updated', 'Manual review data refreshed successfully');
      }
    } catch (apiError) {
      // Individual errors are already handled by the refresh functions
      console.error('Error refreshing manual review data:', apiError);
    } finally {
      setLoading(false);
    }
  }, [refreshQueue, refreshStats, autoRefresh, success, isEnhancedServer]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0 || !isEnhancedServer) return;

    const interval = setInterval(refreshAll, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refreshAll, isEnhancedServer]);

  // Server type detection - must run first
  useEffect(() => {
    detectServerType();
  }, [detectServerType]);

  // Initial data load
  useEffect(() => {
    if (isEnhancedServer) {
      refreshAll();
    }
  }, [isEnhancedServer, refreshAll]);

  return {
    // State
    loading,
    error,
    lastRefresh,
    
    // Data
    reviewItems,
    stats,
    
    // Actions
    refreshQueue,
    refreshStats,
    handleReviewAction,
  };
};

export default useManualReviewQueue;