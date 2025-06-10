/**
 * Supabase Data Management Hook
 * Provides data management functions for Supabase integration
 */

import { useState, useCallback } from 'react';
import { TransactionService } from '../services/supabaseService';
import { useNotify } from './useNotify';

export function useSupabaseDataManagement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notify = useNotify();

  const clearAllData = useCallback(async () => {
    if (!window.confirm('Are you sure you want to clear all data from your Supabase database? This action cannot be undone.')) {
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await TransactionService.clearAllUserData();
      
      if (response.success) {
        notify.success('All data cleared successfully');
        return true;
      } else {
        throw new Error(response.error || 'Failed to clear data');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clear data';
      setError(errorMessage);
      notify.error(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [notify]);

  return {
    loading,
    error,
    clearAllData
  };
}

export default useSupabaseDataManagement;
