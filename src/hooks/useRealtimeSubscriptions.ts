import { useEffect } from 'react';
import { useRealtime } from './useRealtime';
import type { RealtimeEvent } from '../services/realtimeService';
import type { Portfolio, Position, Transaction, Asset } from '../lib/database/types';

/**
 * Hook for portfolio real-time updates
 */
export const useRealtimePortfolios = (
  callback: (event: RealtimeEvent<Portfolio>) => void
): void => {
  const { subscribeToPortfolios } = useRealtime();

  useEffect(() => {
    const unsubscribe = subscribeToPortfolios(callback);
    return unsubscribe;
  }, [subscribeToPortfolios, callback]);
};

/**
 * Hook for position real-time updates
 */
export const useRealtimePositions = (
  callback: (event: RealtimeEvent<Position>) => void
): void => {
  const { subscribeToPositions } = useRealtime();

  useEffect(() => {
    const unsubscribe = subscribeToPositions(callback);
    return unsubscribe;
  }, [subscribeToPositions, callback]);
};

/**
 * Hook for transaction real-time updates
 */
export const useRealtimeTransactions = (
  callback: (event: RealtimeEvent<Transaction>) => void
): void => {
  const { subscribeToTransactions } = useRealtime();

  useEffect(() => {
    const unsubscribe = subscribeToTransactions(callback);
    return unsubscribe;
  }, [subscribeToTransactions, callback]);
};

/**
 * Hook for asset real-time updates
 */
export const useRealtimeAssets = (
  callback: (event: RealtimeEvent<Asset>) => void
): void => {
  const { subscribeToAssets } = useRealtime();

  useEffect(() => {
    const unsubscribe = subscribeToAssets(callback);
    return unsubscribe;
  }, [subscribeToAssets, callback]);
};
