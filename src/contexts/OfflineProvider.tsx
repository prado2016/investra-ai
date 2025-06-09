/**
 * Offline Context for Stock Tracker App
 * Manages offline-first data access and sync operations
 * Provides offline status and sync controls throughout the application
 */

import React, { useEffect, useState, useCallback } from 'react';
import { offlineStorageService } from '../services/offlineStorageService';
import type { SyncStatus } from '../services/offlineStorageService';
import { useAuth } from './AuthProvider';
import type { Portfolio } from '../lib/database/types';
import { OfflineContext } from './OfflineContext';
import type { OfflineContextType } from './OfflineContext';

// Provider props
interface OfflineProviderProps {
  children: React.ReactNode;
  enablePeriodicSync?: boolean;
}

/**
 * Offline Provider Component
 */
export const OfflineProvider: React.FC<OfflineProviderProps> = ({ 
  children
}) => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(offlineStorageService.getStatus());

  // Initialize offline storage when user authenticates
  useEffect(() => {
    if (user && !isInitialized) {
      initializeOfflineStorage();
    }
  }, [user, isInitialized]);

  // Subscribe to sync status changes
  useEffect(() => {
    const unsubscribe = offlineStorageService.onStatusChange((status) => {
      setSyncStatus(status);
    });

    return unsubscribe;
  }, []);

  const initializeOfflineStorage = async () => {
    try {
      console.log('🚀 Initializing offline storage...');
      const success = await offlineStorageService.initialize();
      
      if (success) {
        setIsInitialized(true);
        console.log('✅ Offline storage initialized successfully');
      } else {
        console.error('❌ Failed to initialize offline storage');
      }
    } catch (error) {
      console.error('❌ Error initializing offline storage:', error);
    }
  };

  // Offline-first operations
  const createPortfolioOffline = useCallback(async (
    name: string,
    description: string = '',
    currency: string = 'USD'
  ) => {
    if (!isInitialized) {
      return { success: false, error: 'Offline storage not initialized' };
    }

    return await offlineStorageService.createPortfolio(name, description, currency);
  }, [isInitialized]);

  const getPortfoliosOffline = useCallback(async (): Promise<Portfolio[]> => {
    if (!isInitialized) {
      return [];
    }

    return await offlineStorageService.getPortfolios();
  }, [isInitialized]);

  // Sync controls
  const syncNow = useCallback(async (): Promise<boolean> => {
    if (!isInitialized) {
      return false;
    }

    return await offlineStorageService.forceSync();
  }, [isInitialized]);

  const clearOfflineData = useCallback(async (): Promise<boolean> => {
    if (!isInitialized) {
      return false;
    }

    return await offlineStorageService.clearOfflineData();
  }, [isInitialized]);

  const contextValue: OfflineContextType = {
    isOnline: syncStatus.isOnline,
    isSyncing: syncStatus.isSyncing,
    syncStatus,
    createPortfolioOffline,
    getPortfoliosOffline,
    syncNow,
    clearOfflineData,
    isInitialized
  };

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
    </OfflineContext.Provider>
  );
};

export default OfflineProvider;
