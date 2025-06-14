import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePortfolios } from '../contexts/PortfolioContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { TransactionService, AssetService } from '../services/supabaseService';
import { useNotify } from '../hooks/useNotify';
import TransactionForm from '../components/TransactionForm.tsx';
import TransactionList from '../components/TransactionList.tsx';
import { Plus, TrendingUp, DollarSign } from 'lucide-react';
import type { Transaction, TransactionType, Currency } from '../types/portfolio';
import type { TransactionWithAsset } from '../components/TransactionList';
import '../styles/transactions-layout.css';

// Enhanced Transactions page with improved styling and contrast
const TransactionsPage: React.FC = () => {
  const { activePortfolio, loading: portfoliosLoading } = usePortfolios();
  
  // Set dynamic page title
  usePageTitle('Transactions', { 
    subtitle: activePortfolio ? `${activePortfolio.name} Portfolio` : 'Portfolio Management' 
  });
  
  const notify = useNotify();
  const [transactions, setTransactions] = useState<TransactionWithAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  
  // Debounce fetch to prevent excessive API calls
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch transactions when portfolio changes
  const fetchTransactions = useCallback(async () => {
    if (!activePortfolio?.id) {
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await TransactionService.getTransactions(activePortfolio.id);
      if (response.success) {
        setTransactions(response.data);
      } else {
        setError(response.error);
        notify.error('Failed to fetch transactions: ' + response.error);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      notify.error('Failed to fetch transactions: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  }, [activePortfolio?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // notify is intentionally excluded as it should be stable

  useEffect(() => {
    if (activePortfolio?.id) {
      // Clear previous timeout if any
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      // Set up a debounced fetch to prevent rate limiting
      fetchTimeoutRef.current = setTimeout(() => {
        fetchTransactions();
      }, 300); // 300ms debounce time
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [activePortfolio?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  // fetchTransactions is intentionally excluded to prevent dependency cycles

  const handleEditTransaction = (transactionWithAsset: TransactionWithAsset) => {
    // Convert database transaction to portfolio transaction format for the form
    const portfolioTransaction: Transaction = {
      id: transactionWithAsset.id,
      portfolioId: transactionWithAsset.portfolio_id,
      assetId: transactionWithAsset.asset_id,
      assetSymbol: transactionWithAsset.asset?.symbol || '',
      assetType: transactionWithAsset.asset?.asset_type || 'stock',
      type: transactionWithAsset.transaction_type as TransactionType,
      quantity: transactionWithAsset.quantity,
      price: transactionWithAsset.price,
      totalAmount: transactionWithAsset.total_amount,
      fees: transactionWithAsset.fees || 0,
      currency: transactionWithAsset.currency as Currency,
      date: new Date(transactionWithAsset.transaction_date),
      notes: transactionWithAsset.notes || undefined,
      createdAt: new Date(transactionWithAsset.created_at),
      updatedAt: new Date(transactionWithAsset.updated_at)
    };
    
    setEditingTransaction(portfolioTransaction);
  };

  const handleCloseForm = () => {
    setEditingTransaction(null);
  };

  const handleSaveTransaction = async (transactionData: Omit<Transaction, 'id' | 'assetId' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    if (!activePortfolio?.id) {
      notify.error('No portfolio selected');
      return false;
    }

    try {
      setLoading(true);
      
      // First, ensure the asset exists
      const assetResponse = await AssetService.getOrCreateAsset(transactionData.assetSymbol);
      
      if (!assetResponse.success || !assetResponse.data) {
        notify.error('Failed to create asset: ' + assetResponse.error);
        return false;
      }

      let response;
      
      if (editingTransaction) {
        // Update existing transaction
        console.log('Updating transaction:', editingTransaction.id, 'with asset:', assetResponse.data.id);
        
        // Check if asset changed - this might require position reconciliation
        const assetChanged = editingTransaction.assetSymbol !== transactionData.assetSymbol;
        if (assetChanged) {
          console.log('Asset changed from', editingTransaction.assetSymbol, 'to', transactionData.assetSymbol);
        }
        
        response = await TransactionService.updateTransaction(
          editingTransaction.id,
          {
            asset_id: assetResponse.data.id, // Fix: Update asset_id to new asset
            transaction_type: transactionData.type as TransactionType,
            quantity: transactionData.quantity,
            price: transactionData.price,
            total_amount: transactionData.totalAmount,
            fees: transactionData.fees || 0,
            currency: transactionData.currency, // Fix: Update currency field
            transaction_date: (() => {
              if (!transactionData.date) return new Date().toISOString().split('T')[0];
              
              // Ensure date stays in local timezone - no UTC conversion
              const date = transactionData.date;
              const year = date.getFullYear();
              const month = String(date.getMonth() + 1).padStart(2, '0');
              const day = String(date.getDate()).padStart(2, '0');
              return `${year}-${month}-${day}`;
            })(),
            notes: transactionData.notes || undefined
          }
        );
        
        if (response.success) {
          notify.success('Transaction updated successfully');
          console.log('Transaction updated successfully:', response.data);
          
          // If asset changed, we might need to reconcile positions
          if (assetChanged) {
            console.log('Asset changed - position reconciliation may be needed');
            // Note: Position reconciliation will happen automatically on next position fetch
          }
        } else {
          console.error('Failed to update transaction:', response.error);
        }
      } else {
        // Create new transaction
        response = await TransactionService.createTransaction(
          activePortfolio.id,
          assetResponse.data.id,
          transactionData.type as TransactionType,
          transactionData.quantity,
          transactionData.price,
          (() => {
            if (!transactionData.date) return new Date().toISOString();
            
            // For create transaction, we need full ISO string but preserve local date
            const date = transactionData.date;
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}T12:00:00.000Z`; // Use noon UTC to avoid timezone issues
          })()
        );
        
        if (response.success) {
          notify.success('Transaction created successfully');
        }
      }

      if (response.success) {
        handleCloseForm();
        // Refresh transactions
        fetchTransactions();
        return true;
      } else {
        notify.error('Failed to save transaction: ' + response.error);
        return false;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      notify.error('Failed to save transaction: ' + errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      try {
        setLoading(true);
        
        // Call the TransactionService to delete the transaction
        const response = await TransactionService.deleteTransaction(id);
        
        if (response.success) {
          notify.success('Transaction deleted successfully');
          // Refresh transactions
          fetchTransactions();
        } else {
          notify.error('Failed to delete transaction: ' + response.error);
        }
      } catch (error) {
        console.error('Failed to delete transaction:', error);
        notify.error('Failed to delete transaction');
      } finally {
        setLoading(false);
      }
    }
  };

  if (portfoliosLoading) {
    return (
      <div className="enhanced-page-container">
        <div className="enhanced-page-header">
          <div className="enhanced-header-content">
            <div className="enhanced-header-main">
              <TrendingUp className="enhanced-header-icon" />
              <h1 className="enhanced-page-title">Transaction Management</h1>
            </div>
          </div>
        </div>
        <div className="enhanced-loading-state">
          <div className="loading-spinner-large"></div>
          <p>Loading portfolios...</p>
        </div>
      </div>
    );
  }

  if (!activePortfolio) {
    return (
      <div className="enhanced-page-container">
        <div className="enhanced-page-header">
          <div className="enhanced-header-content">
            <div className="enhanced-header-main">
              <TrendingUp className="enhanced-header-icon" />
              <h1 className="enhanced-page-title">Transaction Management</h1>
            </div>
          </div>
        </div>
        <div className="enhanced-error-state">
          <div className="error-icon-wrapper">
            <DollarSign className="error-icon" />
          </div>
          <h3 className="error-title">No Portfolio Available</h3>
          <p className="error-description">
            Please create a portfolio first before adding transactions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="enhanced-page-container">
      {/* Enhanced Page Header */}
      <div className="enhanced-page-header">
        <div className="enhanced-header-content">
          <div className="enhanced-header-main">
            <TrendingUp className="enhanced-header-icon" />
            <div className="enhanced-header-text">
              <h1 className="enhanced-page-title">Transaction Management</h1>
              <p className="enhanced-page-subtitle">
                Manage your portfolio transactions for {activePortfolio.name}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Content Layout */}
      <div className="enhanced-content-layout">
        {/* Add Transaction Section */}
        <div className="enhanced-form-section">
          <div className="enhanced-section-header">
            <div className="enhanced-section-header-content">
              <Plus className="enhanced-section-icon" />
              <div className="enhanced-section-text">
                <h2 className="enhanced-section-title">
                  {editingTransaction ? 'Edit Transaction' : 'Add New Transaction'}
                </h2>
                <p className="enhanced-section-subtitle">
                  {editingTransaction 
                    ? 'Update transaction details and save changes'
                    : 'Enter transaction details to add to your portfolio'
                  }
                </p>
              </div>
            </div>
          </div>
          
          <div className="enhanced-form-wrapper">
            <TransactionForm
              initialData={editingTransaction}
              onSave={handleSaveTransaction}
              onCancel={handleCloseForm}
            />
          </div>
        </div>

        {/* Recent Transactions Section */}
        <div className="enhanced-transactions-section">
          <div className="enhanced-section-header">
            <div className="enhanced-section-header-content">
              <DollarSign className="enhanced-section-icon" />
              <div className="enhanced-section-text">
                <h2 className="enhanced-section-title">Recent Transactions</h2>
                <p className="enhanced-section-subtitle">
                  View and manage your transaction history
                </p>
              </div>
            </div>
          </div>
          
          <div className="enhanced-transactions-wrapper">
            <TransactionList
              transactions={transactions}
              loading={loading}
              error={error}
              onEdit={handleEditTransaction}
              onDelete={handleDeleteTransaction}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionsPage;
