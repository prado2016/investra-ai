import { useContext } from 'react';
import { RealtimeContext, type RealtimeContextType } from '../contexts/RealtimeContext';

/**
 * Hook to use real-time context
 */
export const useRealtime = (): RealtimeContextType => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtime must be used within a RealtimeProvider');
  }
  return context;
};
