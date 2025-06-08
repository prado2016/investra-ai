import { useContext } from 'react';
import { OfflineContext, OfflineContextType } from '../contexts/OfflineContext';

/**
 * Hook to use offline context
 */
export const useOffline = (): OfflineContextType => {
  const context = useContext(OfflineContext);
  if (context === undefined) {
    throw new Error('useOffline must be used within an OfflineProvider');
  }
  return context;
};
