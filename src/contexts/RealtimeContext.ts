import { createContext } from 'react';
import type { SubscriptionStatus, RealtimeEvent } from '../services/realtimeService';
import type { Portfolio, Position, Transaction, Asset } from '../lib/database/types';

// Context interface
export interface RealtimeContextType {
  // Connection status
  isConnected: boolean;
  status: SubscriptionStatus;
  
  // Manual controls
  connect: () => Promise<boolean>;
  disconnect: () => Promise<void>;
  reconnect: () => Promise<boolean>;
  
  // Event subscription helpers
  subscribeToPortfolios: (callback: (event: RealtimeEvent<Portfolio>) => void) => () => void;
  subscribeToPositions: (callback: (event: RealtimeEvent<Position>) => void) => () => void;
  subscribeToTransactions: (callback: (event: RealtimeEvent<Transaction>) => void) => () => void;
  subscribeToAssets: (callback: (event: RealtimeEvent<Asset>) => void) => () => void;
  
  // Latest events for debugging
  lastEvent: RealtimeEvent | null;
}

export const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

// Re-export RealtimeProvider for convenience
export { RealtimeProvider } from './RealtimeProvider';
