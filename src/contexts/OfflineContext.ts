import { createContext } from 'react';
import type { SyncStatus } from '../services/offlineStorageService';
import type { Portfolio } from '../lib/database/types';

// Context interface
export interface OfflineContextType {
  // Offline status
  isOnline: boolean;
  isSyncing: boolean;
  syncStatus: SyncStatus;
  
  // Offline operations
  createPortfolioOffline: (name: string, description?: string, currency?: string) => Promise<{ success: boolean; data?: Portfolio; error?: string }>;
  getPortfoliosOffline: () => Promise<Portfolio[]>;
  
  // Sync controls
  syncNow: () => Promise<boolean>;
  clearOfflineData: () => Promise<boolean>;
  
  // Initialization
  isInitialized: boolean;
}

export const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

// Re-export OfflineProvider for convenience
export { OfflineProvider } from './OfflineProvider';
