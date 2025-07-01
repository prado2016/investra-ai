import React, { useState, useEffect, useCallback, useRef } from 'react';
import { usePortfolios } from '../contexts/PortfolioContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { TransactionService, FundMovementService, AssetService } from '../services/supabaseService';
import { useNotify } from '../hooks/useNotify';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList.tsx';
import TransactionEditModal from '../components/TransactionEditModal.tsx';
import FundMovementForm from '../components/FundMovementForm.tsx';
import FundMovementList from '../components/FundMovementList.tsx';
import FundMovementEditModal from '../components/FundMovementEditModal.tsx';
import { Plus, TrendingUp, DollarSign, ArrowUpDown, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Download, Filter, Hash } from 'lucide-react';
import { SelectField } from '../components/FormFields';
import { useSupabasePortfolios } from '../hooks/useSupabasePortfolios';
import type { Transaction, TransactionType, FundMovement, FundMovementType, FundMovementStatus, Currency } from '../types/portfolio';
import type { TransactionWithAsset } from '../components/TransactionList';
import type { FundMovementWithMetadata } from '../components/FundMovementList';
import { startOfDay, subDays, startOfYear } from 'date-fns';
import '../styles/transactions-layout.css';

// Enhanced Transactions page with improved styling and contrast
const TransactionsPage: React.FC = () => {
  const { activePortfolio } = usePortfolios();
  const { portfolios, loading: portfoliosLoading } = useSupabasePortfolios();
  
  // Set dynamic page title
  usePageTitle('Transactions', { 
    subtitle: activePortfolio ? `${activePortfolio.name} Portfolio` : 'Portfolio Management' 
  });
  
  const notify = useNotify();
  const [transactions, setTransactions] = useState<TransactionWithAsset[]>([]);
  const [fundMovements, setFundMovements] = useState<FundMovementWithMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<TransactionWithAsset | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingFundMovement, setEditingFundMovement] = useState<FundMovementWithMetadata | null>(null);
  const [showFundMovementEditModal, setShowFundMovementEditModal] = useState(false);
  const [isTransactionFormMinimized, setIsTransactionFormMinimized] = useState(false);
  const [isTransactionFormCollapsed, setIsTransactionFormCollapsed] = useState(false);
  const [filters, setFilters] = useState({
    portfolioId: 'all',
    dateRange: 'all',
    assetType: 'all',
    symbol: '',
    customDateFrom: '',
    customDateTo: ''
  });

  // Update portfolioId in filters when activePortfolio changes
  useEffect(() => {
    setFilters(prevFilters => ({
      ...prevFilters,
      portfolioId: activePortfolio?.id || 'all',
    }));
  }, [activePortfolio?.id]);
  
  // Debounce fetch to prevent excessive API calls
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Filter transactions based on current filters
  const filteredTransactions = transactions.filter(transaction => {
    // Portfolio filter - since we only fetch for active portfolio, only filter if a specific portfolio is selected
    if (filters.portfolioId !== 'all' && filters.portfolioId !== activePortfolio?.id && transaction.portfolio_id !== filters.portfolioId) {
      return false;
    }

    // Asset type filter
    if (filters.assetType !== 'all') {
      const assetType = transaction.asset?.asset_type || 'stock';
      if (assetType !== filters.assetType) {
        return false;
      }
    }

    // Symbol filter
    if (filters.symbol && transaction.asset?.symbol) {
      const searchSymbol = filters.symbol.toLowerCase();
      const transactionSymbol = transaction.asset.symbol.toLowerCase();
      if (!transactionSymbol.includes(searchSymbol)) {
        return false;
      }
    }

    // Date range filter
    const transactionDate = new Date(transaction.transaction_date);
    const now = new Date();
    
    if (filters.dateRange === 'custom') {
      if (filters.customDateFrom) {
        const fromDate = new Date(filters.customDateFrom);
        if (transactionDate < fromDate) return false;
      }
      if (filters.customDateTo) {
        const toDate = new Date(filters.customDateTo);
        if (transactionDate > toDate) return false;
      }
    } else if (filters.dateRange !== 'all') {
      let cutoffDate: Date;
      switch (filters.dateRange) {
        case 'last7days':
          cutoffDate = subDays(now, 7);
          break;
        case 'last30days':
          cutoffDate = subDays(now, 30);
          break;
        case 'last90days':
          cutoffDate = subDays(now, 90);
          break;
        case 'thisYear':
          cutoffDate = startOfYear(now);
          break;
        default:
          return true; // Should not happen with current filter options
      }
      if (transactionDate < startOfDay(cutoffDate)) return false;
    }

    return true;
  });

  // Export functions
  const exportToCSV = () => {
    const headers = [
      'Date',
      'Symbol',
      'Type',
      'Quantity',
      'Price',
      'Fees',
      'Total Amount',
      'Currency',
      'Portfolio',
      'Notes',
      'Strategy Type',
      'Broker Name',
      'External ID',
      'Settlement Date'
    ];
    const csvData = filteredTransactions.map(t => [
      t.transaction_date,
      t.asset?.symbol || '',
      t.transaction_type,
      t.quantity,
      t.price,
      t.fees || 0,
      t.total_amount,
      t.currency,
      portfolios?.find(p => p.id === t.portfolio_id)?.name || '',
      t.notes || '',
      t.strategy_type || '',
      t.broker_name || '',
      t.external_id || '',
      t.settlement_date || '',
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a); // Required for Firefox
    a.click();
    document.body.removeChild(a); // Clean up
    URL.revokeObjectURL(url);
  };

  const exportToTXT = () => {
    const txtContent = filteredTransactions.map(t => {
      const portfolio = portfolios?.find(p => p.id === t.portfolio_id)?.name || 'Unknown';
      return `Date: ${t.transaction_date}
Symbol: ${t.asset?.symbol || 'N/A'}
Type: ${t.transaction_type.toUpperCase()}
Quantity: ${t.quantity}
Price: ${t.price}
Fees: ${t.fees || 0}
Total Amount: ${t.total_amount}
Currency: ${t.currency}
Portfolio: ${portfolio}
Notes: ${t.notes || ''}
Strategy Type: ${t.strategy_type || ''}
Broker Name: ${t.broker_name || ''}
External ID: ${t.external_id || ''}
Settlement Date: ${t.settlement_date || ''}
----------------------------------------`;
    }).join('\n\n');
    
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transactions_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a); // Required for Firefox
    a.click();
    document.body.removeChild(a); // Clean up
    URL.revokeObjectURL(url);
  };

  // Fetch transactions when portfolio changes
  const fetchTransactions = useCallback(async (portfolioId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      // Always fetch all transactions for the specified portfolio, filtering is done client-side
      const response = await TransactionService.getTransactions(portfolioId, 'all');
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
  }, []);

  // Fetch fund movements when portfolio changes
  const fetchFundMovements = useCallback(async (portfolioId: string) => {
    try {
      const response = await FundMovementService.getFundMovements(portfolioId);
      if (response.success) {
        // Transform the data to match our types
        interface RawMovementData {
          id: string;
          portfolio_id: string;
          type: string;
          status: string;
          movement_date: string | Date;
          amount: number;
          currency: string;
          fees?: number;
          notes?: string;
          original_amount?: number;
          original_currency?: string;
          converted_amount?: number;
          converted_currency?: string;
          exchange_rate?: number;
          exchange_fees?: number;
          from_account?: string;
          to_account?: string;
          account?: string;
          created_at: string;
          updated_at: string;
        }
        
        const transformedMovements = (response.data as unknown as RawMovementData[]).map((movement) => ({
          ...movement,
          type: movement.type as FundMovementType,
          status: movement.status as FundMovementStatus,
          currency: movement.currency as Currency,
          originalCurrency: movement.original_currency as Currency | undefined,
          convertedCurrency: movement.converted_currency as Currency | undefined,
          date: (() => {
            // Parse date string properly to avoid timezone shifts
            const dateStr = movement.movement_date;
            if (typeof dateStr === 'string') {
              const [year, month, day] = dateStr.split('-').map(Number);
              return new Date(year, month - 1, day);
            }
            return new Date(dateStr);
          })(),
          portfolioId: movement.portfolio_id,
          originalAmount: movement.original_amount,
          convertedAmount: movement.converted_amount,
          exchangeRate: movement.exchange_rate,
          exchangeFees: movement.exchange_fees,
          fromAccount: movement.from_account,
          toAccount: movement.to_account,
          createdAt: new Date(movement.created_at),
          updatedAt: new Date(movement.updated_at)
        }));
        setFundMovements(transformedMovements);
      } else {
        notify.error('Failed to fetch fund movements: ' + response.error);
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      notify.error('Failed to fetch fund movements: ' + errorMsg);
    }
  }, []);

  useEffect(() => {
    if (activePortfolio?.id) {
      // Clear previous timeout if any
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }

      // Set up a debounced fetch to prevent rate limiting
      fetchTimeoutRef.current = setTimeout(() => {
        if (activePortfolio?.id) {
          fetchTransactions(activePortfolio.id);
          fetchFundMovements(activePortfolio.id);
        }
      }, 1000); // 1000ms debounce time
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [activePortfolio?.id, fetchTransactions, fetchFundMovements]); // Include function dependencies

  const handleEditFundMovement = (fundMovement: FundMovementWithMetadata) => {
    setEditingFundMovement(fundMovement);
    setShowFundMovementEditModal(true);
  };

  const handleCloseFundMovementEditModal = () => {
    setEditingFundMovement(null);
    setShowFundMovementEditModal(false);
  };

  const handleSaveEditFundMovement = async (updatedData: Omit<FundMovement, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    if (!editingFundMovement) return false;

    try {
      setLoading(true);
      
      const response = await FundMovementService.updateFundMovement(
        editingFundMovement.id,
        {
          type: updatedData.type,
          amount: updatedData.amount,
          currency: updatedData.currency,
          status: updatedData.status,
          movement_date: (() => {
            const date = updatedData.date;
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
          })(),
          fees: updatedData.fees,
          notes: updatedData.notes,
          original_amount: updatedData.originalAmount,
          original_currency: updatedData.originalCurrency,
          converted_amount: updatedData.convertedAmount,
          converted_currency: updatedData.convertedCurrency,
          exchange_rate: updatedData.exchangeRate,
          exchange_fees: updatedData.exchangeFees,
          account: updatedData.account,
          from_account: updatedData.fromAccount,
          to_account: updatedData.toAccount
        }
      );
      
      if (response.success) {
        notify.success('Fund movement updated successfully');
        if (activePortfolio?.id) fetchFundMovements(activePortfolio.id); // Refresh the list
        return true;
      } else {
        throw new Error(response.error || 'Failed to update fund movement');
      }
    } catch (error) {
      console.error('Failed to update fund movement:', error);
      notify.error('Failed to update fund movement: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return false;
    } finally {
      setLoading(false);
    }
  };

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
    fees?: number;
    currency?: string;
    notes?: string;
    settlement_date?: string;
    exchange_rate?: number;
    broker_name?: string;
    external_id?: string;
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
          transaction_date: updatedData.transaction_date,
          fees: updatedData.fees,
          currency: updatedData.currency,
          notes: updatedData.notes,
          ...(updatedData.settlement_date && { settlement_date: updatedData.settlement_date }),
          exchange_rate: updatedData.exchange_rate,
          broker_name: updatedData.broker_name,
          external_id: updatedData.external_id
        }
      );
      
      if (response.success) {
        notify.success('Transaction updated successfully');
        if (activePortfolio?.id) fetchTransactions(activePortfolio.id); // Refresh the list
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
        if (activePortfolio?.id) fetchTransactions(activePortfolio.id);
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
          if (activePortfolio?.id) fetchTransactions(activePortfolio.id);
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

  const handleSaveFundMovement = async (fundMovementData: Omit<FundMovement, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    if (!activePortfolio?.id) {
      notify.error('No portfolio selected');
      return false;
    }

    try {
      setLoading(true);
      
      // Additional validation for currency conversions
      if (fundMovementData.type === 'conversion') {
        if (!fundMovementData.originalAmount || fundMovementData.originalAmount <= 0) {
          notify.error('Original amount is required for currency conversions');
          return false;
        }
        if (!fundMovementData.exchangeRate || fundMovementData.exchangeRate <= 0) {
          notify.error('Exchange rate is required for currency conversions');
          return false;
        }
        if (!fundMovementData.convertedAmount || fundMovementData.convertedAmount <= 0) {
          notify.error('Converted amount must be greater than 0');
          return false;
        }
        if (!fundMovementData.account) {
          notify.error('Account is required for currency conversions');
          return false;
        }
      }
      
      const response = await FundMovementService.createFundMovement(
        fundMovementData.portfolioId,
        fundMovementData.type,
        fundMovementData.amount,
        fundMovementData.currency,
        fundMovementData.status,
        (() => {
          if (!fundMovementData.date) return new Date().toISOString().split('T')[0];
          
          const date = fundMovementData.date;
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })(),
        {
          fees: fundMovementData.fees || 0,
          notes: fundMovementData.notes,
          originalAmount: fundMovementData.originalAmount,
          originalCurrency: fundMovementData.originalCurrency,
          convertedAmount: fundMovementData.convertedAmount,
          convertedCurrency: fundMovementData.convertedCurrency,
          exchangeRate: fundMovementData.exchangeRate,
          exchangeFees: fundMovementData.exchangeFees,
          account: fundMovementData.account,
          fromAccount: fundMovementData.fromAccount,
          toAccount: fundMovementData.toAccount
        }
      );
      
      if (response.success) {
        notify.success('Fund movement added successfully');
        if (activePortfolio?.id) fetchFundMovements(activePortfolio.id);
        return true;
      } else {
        console.error('Fund movement creation failed:', response.error);
        notify.error('Failed to save fund movement: ' + response.error);
        return false;
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('Fund movement creation error:', error);
      notify.error('Failed to save fund movement: ' + errorMsg);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFundMovement = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this fund movement?')) {
      try {
        setLoading(true);
        
        const response = await FundMovementService.deleteFundMovement(id);
        
        if (response.success) {
          notify.success('Fund movement deleted successfully');
          if (activePortfolio?.id) fetchFundMovements(activePortfolio.id);
        } else {
          notify.error('Failed to delete fund movement: ' + response.error);
        }
      } catch (error) {
        console.error('Failed to delete fund movement:', error);
        notify.error('Failed to delete fund movement');
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

      {/* Enhanced Content Layout - 2x2 Grid */}
      <div className="enhanced-content-layout">
        {/* Top Row: Add Transaction and Recent Transactions */}
        <div className={`transaction-grid-row ${isTransactionFormCollapsed ? 'form-collapsed' : ''}`}>
          {/* Add Transaction Section */}
          {!isTransactionFormCollapsed && (
            <div className="enhanced-form-section">
              <div className="enhanced-section-header">
                <div className="enhanced-section-header-content">
                  <Plus className="enhanced-section-icon" />
                  <div className="enhanced-section-text">
                    <h2 className="enhanced-section-title">Add Transaction</h2>
                    <p className="enhanced-section-subtitle">
                      Enter transaction details to add to your portfolio
                    </p>
                  </div>
                  <button 
                    onClick={() => setIsTransactionFormMinimized(!isTransactionFormMinimized)}
                    className="collapse-button"
                    title={isTransactionFormMinimized ? 'Expand form' : 'Minimize form'}
                  >
                    {isTransactionFormMinimized ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                  </button>
                  <button 
                    onClick={() => setIsTransactionFormCollapsed(true)}
                    className="collapse-button"
                    title="Collapse to give more space"
                  >
                    <ChevronLeft size={16} />
                  </button>
                </div>
              </div>
              
              {!isTransactionFormMinimized && (
                <TransactionForm onSave={handleSaveTransaction} loading={loading} />
              )}
            </div>
          )}
          
          {/* Collapse/Expand Button when form is collapsed */}
          {isTransactionFormCollapsed && (
            <div className="collapsed-form-toggle">
              <button 
                onClick={() => setIsTransactionFormCollapsed(false)}
                className="expand-form-button"
                title="Show Add Transaction form"
              >
                <ChevronRight size={20} />
                <span>Add Transaction</span>
              </button>
            </div>
          )}

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
                <div className="transaction-stats">
                  <div className="stat-item">
                    <Hash size={16} />
                    <span>{filteredTransactions.length} transactions</span>
                  </div>
                  <div className="export-buttons">
                    <button onClick={exportToCSV} className="export-button" title="Export to CSV">
                      <Download size={16} />
                      CSV
                    </button>
                    <button onClick={exportToTXT} className="export-button" title="Export to TXT">
                      <Download size={16} />
                      TXT
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="enhanced-transactions-wrapper">
              {/* Consolidated Filter System */}
              <div className="comprehensive-filters">
                <div className="filter-header">
                  <Filter size={16} />
                  <span>Filter Transactions</span>
                </div>
                
                <div className="filter-grid">
                  <SelectField
                    id="portfolio-filter"
                    name="portfolio-filter"
                    label="Portfolio"
                    value={filters.portfolioId}
                    onChange={(e) => setFilters({ ...filters, portfolioId: e.target.value })}
                    options={[
                      { value: 'all', label: 'All Portfolios' },
                      ...(portfolios || []).map(p => ({ value: p.id, label: p.name }))
                    ]}
                    disabled={portfoliosLoading}
                  />
                  
                  <SelectField
                    id="date-range-filter"
                    name="date-range-filter"
                    label="Date Range"
                    value={filters.dateRange}
                    onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
                    options={[
                      { value: 'all', label: 'All Time' },
                      { value: 'last7days', label: 'Last 7 Days' },
                      { value: 'last30days', label: 'Last 30 Days' },
                      { value: 'last90days', label: 'Last 90 Days' },
                      { value: 'thisYear', label: 'This Year' },
                      { value: 'custom', label: 'Custom Range' }
                    ]}
                  />
                  
                  <SelectField
                    id="asset-type-filter"
                    name="asset-type-filter"
                    label="Asset Type"
                    value={filters.assetType}
                    onChange={(e) => setFilters({ ...filters, assetType: e.target.value })}
                    options={[
                      { value: 'all', label: 'All Types' },
                      { value: 'stock', label: 'Stocks' },
                      { value: 'option', label: 'Options' },
                      { value: 'crypto', label: 'Crypto' },
                      { value: 'etf', label: 'ETFs' },
                      { value: 'bond', label: 'Bonds' }
                    ]}
                  />
                  
                  <div className="symbol-filter">
                    <label htmlFor="symbol-filter">Symbol</label>
                    <input
                      id="symbol-filter"
                      type="text"
                      placeholder="Search by symbol..."
                      value={filters.symbol}
                      onChange={(e) => setFilters({ ...filters, symbol: e.target.value })}
                      className="symbol-input"
                    />
                  </div>
                </div>
                
                {/* Custom Date Range Inputs */}
                {filters.dateRange === 'custom' && (
                  <div className="custom-date-range">
                    <div className="date-input-group">
                      <label htmlFor="date-from">From</label>
                      <input
                        id="date-from"
                        type="date"
                        value={filters.customDateFrom}
                        onChange={(e) => setFilters({ ...filters, customDateFrom: e.target.value })}
                        className="date-input"
                      />
                    </div>
                    <div className="date-input-group">
                      <label htmlFor="date-to">To</label>
                      <input
                        id="date-to"
                        type="date"
                        value={filters.customDateTo}
                        onChange={(e) => setFilters({ ...filters, customDateTo: e.target.value })}
                        className="date-input"
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <TransactionList
                transactions={filteredTransactions}
                loading={loading}
                error={error}
                onEdit={handleEditTransaction}
                onDelete={handleDeleteTransaction}
              />
            </div>
          </div>
        </div>

        {/* Bottom Row: Add Funds and Recent Funds */}
        <div className="transaction-grid-row">
          {/* Add Fund Movement Section */}
          <FundMovementForm
            onSave={handleSaveFundMovement}
            loading={loading}
          />

          {/* Recent Fund Movements Section */}
          <div className="enhanced-transactions-section">
            <div className="enhanced-section-header">
              <div className="enhanced-section-header-content">
                <ArrowUpDown className="enhanced-section-icon" />
                <div className="enhanced-section-text">
                  <h2 className="enhanced-section-title">Recent Funds</h2>
                  <p className="enhanced-section-subtitle">
                    View and manage your fund transfers, deposits, withdrawals, and conversions
                  </p>
                </div>
              </div>
            </div>
            
            <div className="enhanced-transactions-wrapper">
              <FundMovementList
                fundMovements={fundMovements}
                loading={loading}
                error={error}
                onEdit={handleEditFundMovement}
                onDelete={handleDeleteFundMovement}
              />
            </div>
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

      {/* Edit Fund Movement Modal */}
      {editingFundMovement && (
        <FundMovementEditModal
          fundMovement={editingFundMovement}
          isOpen={showFundMovementEditModal}
          onClose={handleCloseFundMovementEditModal}
          onSave={handleSaveEditFundMovement}
          loading={loading}
        />
      )}
    </div>
  );
};

export default TransactionsPage;
