import { useState, useEffect, useCallback } from 'react';
import { TransactionService, AssetService } from '../services/supabaseService';
import { useNotify } from './useNotify';
import type { Transaction, Asset, TransactionType } from '../lib/database/types';

export interface TransactionWithAsset extends Transaction {
  asset: Asset;
}

export const useSupabaseTransactions = (portfolioId?: string) => {
  const [transactions, setTransactions] = useState<TransactionWithAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const notify = useNotify();

  // Fetch transactions for a portfolio
  const fetchTransactions = useCallback(async (pId?: string) => {
    if (!pId && !portfolioId) return;
    
    const targetPortfolioId = pId || portfolioId;
    if (!targetPortfolioId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await TransactionService.getTransactions(targetPortfolioId);
      
      if (response.success) {
        setTransactions(response.data);
      } else {
        setError(response.error);
        notify.error('Failed to fetch transactions: ' + response.error);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMsg);
      notify.error('Failed to fetch transactions: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  }, [portfolioId, notify]);

  // Create transaction
  const createTransaction = useCallback(async (transactionData: {
    assetSymbol: string;
    assetType: string;
    transactionType: string;
    quantity: number;
    price: number;
    transactionDate: string;
    fees?: number;
    notes?: string;
  }) => {
    if (!portfolioId) {
      notify.error('No portfolio selected');
      return false;
    }

    setLoading(true);
    try {
      // First, ensure the asset exists
      const assetResponse = await AssetService.getOrCreateAsset(transactionData.assetSymbol);

      if (!assetResponse.success || !assetResponse.data) {
        notify.error('Failed to create asset: ' + assetResponse.error);
        return false;
      }

      // Create the transaction
      const response = await TransactionService.createTransaction(
        portfolioId,
        assetResponse.data.id,
        transactionData.transactionType as TransactionType,
        transactionData.quantity,
        transactionData.price,
        transactionData.transactionDate
      );

      if (response.success) {
        notify.success('Transaction created successfully');
        // Refresh transactions
        fetchTransactions();
        return true;
      } else {
        notify.error('Failed to create transaction: ' + response.error);
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      notify.error('Failed to create transaction: ' + errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [portfolioId, notify, fetchTransactions]);

  // Delete transaction
  const deleteTransaction = useCallback(async (transactionId: string) => {
    setLoading(true);
    try {
      const response = await TransactionService.deleteTransaction(transactionId);
      
      if (response.success) {
        notify.success('Transaction deleted successfully');
        // Refresh transactions
        fetchTransactions();
        return true;
      } else {
        notify.error('Failed to delete transaction: ' + response.error);
        return false;
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      notify.error('Failed to delete transaction: ' + errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  }, [notify, fetchTransactions]);

  // Load transactions on mount or when portfolioId changes
  useEffect(() => {
    if (portfolioId) {
      fetchTransactions(portfolioId);
    }
  }, [portfolioId]); // Remove fetchTransactions from dependencies

  return {
    transactions,
    loading,
    error,
    createTransaction,
    deleteTransaction,
    refreshTransactions: fetchTransactions
  };
};
