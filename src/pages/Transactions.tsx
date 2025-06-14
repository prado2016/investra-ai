import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePortfolios } from '../contexts/PortfolioContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { TransactionService, AssetService } from '../services/supabaseService';
import { useNotify } from '../hooks/useNotify';
import TransactionForm from '../components/TransactionForm.tsx';
import TransactionList from '../components/TransactionList.tsx';
import TransactionEditModal from '../components/TransactionEditModal.tsx';
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
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithAsset | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  
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
    setEditingTransaction(transactionWithAsset);
    setShowEditModal(true);
  };

  const handleCloseEditModal = () => {
    setEditingTransaction(null);
    setShowEditModal(false);
  };

  const handleSaveEditTransaction = async (updatedData: {
    transaction_type: string;
    quantity: number;
    price: number;
    transaction_date: string;
  }) => {
    if (!editingTransaction) return;

    try {
      setLoading(true);
      
      // Calculate total amount
      const totalAmount = updatedData.quantity * updatedData.price;
      
      const response = await TransactionService.updateTransaction(
        editingTransaction.id,
        {
          transaction_type: updatedData.transaction_type as TransactionType,
          quantity: updatedData.quantity,
          price: updatedData.price,
          total_amount: totalAmount,
          transaction_date: updatedData.transaction_date
        }
      );
      
      if (response.success) {
        notify.success('Transaction updated successfully');
        fetchTransactions(); // Refresh the list
      } else {
        throw new Error(response.error || 'Failed to update transaction');
      }
    } catch (error) {
      console.error('Failed to update transaction:', error);
      notify.error('Failed to update transaction: ' + (error instanceof Error ? error.message : 'Unknown error'));
      throw error; // Re-throw to let modal handle it
    } finally {
      setLoading(false);
    }
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

      // Always create new transaction (no editing through main form anymore)
      const response = await TransactionService.createTransaction(
        activePortfolio.id,
        assetResponse.data.id,
        transactionData.type as TransactionType,
        transactionData.quantity,
        transactionData.price,
        (() => {
          if (!transactionData.date) return new Date().toISOString().split('T')[0];
          
          // Convert Date object to YYYY-MM-DD string, preserving local date
          const date = transactionData.date;
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })()
      );
      
      if (response.success) {
        notify.success('Transaction created successfully');
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
                <h2 className="enhanced-section-title">Add New Transaction</h2>
                <p className="enhanced-section-subtitle">
                  Enter transaction details to add to your portfolio
                </p>
              </div>
            </div>
          </div>
          
          <div className="enhanced-form-wrapper">
            <TransactionForm
              onSave={handleSaveTransaction}
              onCancel={() => {}} // No cancel needed for add-only form
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

      {/* Edit Transaction Modal */}
      {editingTransaction && (
        <TransactionEditModal
          transaction={editingTransaction}
          isOpen={showEditModal}
          onClose={handleCloseEditModal}
          onSave={handleSaveEditTransaction}
        />
      )}
    </div>
  );
};

export default TransactionsPage;
