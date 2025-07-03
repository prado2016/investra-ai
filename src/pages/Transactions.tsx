import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { usePortfolios } from '../contexts/PortfolioContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { TransactionService, FundMovementService, AssetService } from '../services/supabaseService';
import { useNotify } from '../hooks/useNotify';
import TransactionForm from '../components/TransactionForm';
import TransactionList from '../components/TransactionList.tsx';
import TransactionEditModal from '../components/TransactionEditModal.tsx';
import { Plus, TrendingUp, DollarSign, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Download, Filter, Hash } from 'lucide-react';
import { SelectField } from '../components/FormFields';
import { useSupabasePortfolios } from '../hooks/useSupabasePortfolios';
import PortfolioSelector from '../components/PortfolioSelector';
import type { Transaction, TransactionType, FundMovement, FundMovementType, FundMovementStatus } from '../types/portfolio';
import type { UnifiedEntry, UnifiedTransactionEntry, UnifiedFundMovementEntry, UnifiedEntryType } from '../types/unifiedEntry';
import { startOfDay, subDays, startOfYear } from 'date-fns';
import '../styles/transactions-layout.css';

// Enhanced Transactions page with improved styling and contrast
const TransactionsPage: React.FC = () => {
  const { activePortfolio } = usePortfolios();
  const { portfolios: rawPortfolios, loading: portfoliosLoading } = useSupabasePortfolios();
  
  // Memoize portfolios to prevent unnecessary re-renders
  const portfolios = useMemo(() => rawPortfolios, [rawPortfolios]);
  
  // Create stable portfolio IDs array for dependency comparisons
  const portfolioIds = useMemo(() => portfolios.map(p => p.id).sort(), [portfolios]);
  
  // Set dynamic page title
  usePageTitle('Transactions', { 
    subtitle: activePortfolio ? `${activePortfolio.name} Portfolio` : 'Portfolio Management' 
  });
  
  const notify = useNotify();
  const [unifiedEntries, setUnifiedEntries] = useState<UnifiedEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<UnifiedTransactionEntry | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isTransactionFormMinimized, setIsTransactionFormMinimized] = useState(false);
  const [isTransactionFormCollapsed, setIsTransactionFormCollapsed] = useState(false);
  const [filters, setFilters] = useState({
    portfolioId: 'all',
    dateRange: 'all',
    entryType: 'all', // 'all', 'transaction', 'fund_movement'
    transactionType: 'all', // For transactions
    fundMovementType: 'all', // For fund movements
    assetType: 'all', // For transactions
    symbol: '', // For transactions
    account: '', // For fund movements
    customDateFrom: '',
    customDateTo: '',
  });

  // Keep portfolio filter as 'all' by default to show all transactions
  // Removed automatic filtering by active portfolio since all transactions are in TFSA
  

  // Filter unified entries based on current filters

  const filteredEntries = useMemo(() => {
    const result = unifiedEntries.filter(entry => {
      // Portfolio filter
      const portfolioFilterToUse = filters.portfolioId;
      if (portfolioFilterToUse !== 'all' && entry.portfolioId !== portfolioFilterToUse) {
        return false;
      }

      // Entry type filter (transaction or fund_movement)
      if (filters.entryType !== 'all' && entry.type !== filters.entryType) {
        return false;
      }

      // Transaction-specific filters
      if (entry.type === 'transaction') {
        // Transaction Type filter
        if (filters.transactionType !== 'all' && entry.transactionType !== filters.transactionType) {
          return false;
        }
        // Asset type filter
        if (filters.assetType !== 'all' && entry.assetType !== filters.assetType) {
          return false;
        }
        // Symbol filter
        if (filters.symbol && !entry.assetSymbol.toLowerCase().includes(filters.symbol.toLowerCase())) {
          return false;
        }
      }

      // Fund Movement-specific filters
      if (entry.type === 'fund_movement') {
        // Fund Movement Type filter
        if (filters.fundMovementType !== 'all' && entry.fundMovementType !== filters.fundMovementType) {
          return false;
        }
        // Account filter
        if (filters.account && !(entry.account?.toLowerCase().includes(filters.account.toLowerCase()) ||
                                   entry.fromAccount?.toLowerCase().includes(filters.account.toLowerCase()) ||
                                   entry.toAccount?.toLowerCase().includes(filters.account.toLowerCase()))) {
          return false;
        }
      }

      // Date range filter
      const entryDate = entry.date;
      const now = new Date();
      
      if (filters.dateRange === 'custom') {
        if (filters.customDateFrom) {
          const fromDate = new Date(filters.customDateFrom);
          if (entryDate < fromDate) return false;
        }
        if (filters.customDateTo) {
          const toDate = new Date(filters.customDateTo);
          if (entryDate > toDate) return false;
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
        if (entryDate < startOfDay(cutoffDate)) return false;
      }

      return true;
    });
    
    console.log('🔍 Filtering results:', {
      totalEntries: unifiedEntries.length,
      filteredEntries: result.length,
      filters: filters,
      activePortfolio: activePortfolio?.name || 'All Portfolios'
    });
    
    return result;
  }, [unifiedEntries, filters, activePortfolio]);

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
    const csvData = filteredEntries
      .filter(entry => entry.type === 'transaction')
      .map(entry => {
        const t = entry as UnifiedTransactionEntry;
        return [
          t.date.toISOString().split('T')[0],
          t.assetSymbol || '',
          t.transactionType,
          t.quantity,
          t.price,
          t.fees || 0,
          t.amount,
          t.currency,
          portfolios?.find(p => p.id === t.portfolioId)?.name || '',
          t.notes || '',
          t.strategyType || '',
          t.brokerName || '',
          t.externalId || '',
          t.settlementDate || '',
        ];
      });
    
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
    const txtContent = filteredEntries
      .filter(entry => entry.type === 'transaction')
      .map(entry => {
        const t = entry as UnifiedTransactionEntry;
        const portfolio = portfolios?.find(p => p.id === t.portfolioId)?.name || 'Unknown';
        return `Date: ${t.date.toISOString().split('T')[0]}
Symbol: ${t.assetSymbol || 'N/A'}
Type: ${t.transactionType.toUpperCase()}
Quantity: ${t.quantity}
Price: ${t.price}
Fees: ${t.fees || 0}
Total Amount: ${t.amount}
Currency: ${t.currency}
Portfolio: ${portfolio}
Notes: ${t.notes || ''}
Strategy Type: ${t.strategyType || ''}
Broker Name: ${t.brokerName || ''}
External ID: ${t.externalId || ''}
Settlement Date: ${t.settlementDate || ''}
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

  // Fetch all entries (transactions and fund movements)
  const fetchUnifiedEntries = useCallback(async (portfolioId: string) => {
    setLoading(true);
    setError(null);

    try {
      const [transactionsResponse, fundMovementsResponse] = await Promise.all([
        TransactionService.getTransactions(portfolioId, 'all'),
        FundMovementService.getFundMovements(portfolioId),
      ]);

      const allEntries: UnifiedEntry[] = [];

      if (transactionsResponse.success && transactionsResponse.data) {
        console.log('🔍 Transactions.tsx: Raw transaction data from service:', {
          totalTransactions: transactionsResponse.data.length,
          sampleTransaction: transactionsResponse.data[0] ? {
            id: transactionsResponse.data[0].id,
            portfolio_id: transactionsResponse.data[0].portfolio_id,
            symbol: transactionsResponse.data[0].asset?.symbol,
            transaction_type: transactionsResponse.data[0].transaction_type
          } : null
        });

        const transformedTransactions: UnifiedTransactionEntry[] = transactionsResponse.data.map(
          (t: any) => ({
            id: t.id,
            portfolioId: t.portfolio_id,
            date: new Date(t.transaction_date),
            amount: t.total_amount || 0,
            currency: t.currency || 'USD',
            notes: t.notes || '',
            createdAt: new Date(t.created_at),
            updatedAt: new Date(t.updated_at),
            type: 'transaction',
            transactionType: t.transaction_type,
            assetId: t.asset_id,
            assetSymbol: t.asset?.symbol || '',
            assetType: t.asset?.asset_type || 'stock',
            quantity: t.quantity,
            price: t.price,
            fees: t.fees,
            strategyType: t.strategy_type,
            brokerName: t.broker_name,
            externalId: t.external_id,
            settlementDate: t.settlement_date,
            asset: t.asset,
          })
        );
        
        console.log('🔍 Transactions.tsx: Transformed transaction data:', {
          totalTransformed: transformedTransactions.length,
          sampleTransformed: transformedTransactions[0] ? {
            id: transformedTransactions[0].id,
            portfolioId: transformedTransactions[0].portfolioId,
            symbol: transformedTransactions[0].assetSymbol,
            transactionType: transformedTransactions[0].transactionType
          } : null
        });
        
        allEntries.push(...transformedTransactions);
      } else if (transactionsResponse.error) {
        setError(transactionsResponse.error);
        notify.error('Failed to fetch transactions: ' + transactionsResponse.error);
      }

      if (fundMovementsResponse.success && fundMovementsResponse.data) {
        const transformedFundMovements: UnifiedFundMovementEntry[] = (
          fundMovementsResponse.data as any[]
        ).map((movement) => ({
          id: movement.id,
          portfolioId: movement.portfolio_id,
          date: new Date(movement.movement_date),
          amount: movement.amount,
          currency: movement.currency,
          notes: movement.notes || '',
          createdAt: new Date(movement.created_at),
          updatedAt: new Date(movement.updated_at),
          type: 'fund_movement',
          fundMovementType: movement.type,
          status: movement.status,
          originalAmount: movement.original_amount,
          originalCurrency: movement.original_currency,
          convertedAmount: movement.converted_amount,
          convertedCurrency: movement.converted_currency,
          exchangeRate: movement.exchange_rate,
          exchangeFees: movement.exchange_fees,
          account: movement.account,
          fromAccount: movement.from_account,
          toAccount: movement.to_account,
        }));
        allEntries.push(...transformedFundMovements);
      } else if (fundMovementsResponse.error) {
        setError(fundMovementsResponse.error);
        notify.error('Failed to fetch fund movements: ' + fundMovementsResponse.error);
      }

      // Sort all entries by date, newest first
      allEntries.sort((a, b) => b.date.getTime() - a.date.getTime());
      setUnifiedEntries(allEntries);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      notify.error('Failed to fetch entries: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  // Fetch unified entries from all portfolios for "All Portfolios" view
  const fetchUnifiedEntriesFromAllPortfolios = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('🔍 Transactions.tsx: Fetching from all portfolios:', portfolios.length);
      const allEntries: UnifiedEntry[] = [];

      // Fetch data from each portfolio
      for (const portfolio of portfolios) {
        try {
          const [transactionsResponse, fundMovementsResponse] = await Promise.all([
            TransactionService.getTransactions(portfolio.id, 'all'),
            FundMovementService.getFundMovements(portfolio.id),
          ]);

          // Process transactions
          if (transactionsResponse.success && transactionsResponse.data) {
            const transformedTransactions = transactionsResponse.data.map(
              (t: any) => ({
                id: t.id,
                portfolioId: t.portfolio_id,
                date: new Date(t.transaction_date),
                amount: t.total_amount || 0,
                currency: t.currency || 'USD',
                notes: t.notes || '',
                createdAt: new Date(t.created_at),
                updatedAt: new Date(t.updated_at),
                type: 'transaction' as const,
                transactionType: t.transaction_type,
                assetId: t.asset_id,
                assetSymbol: t.asset?.symbol || '',
                assetType: t.asset?.asset_type || 'stock',
                quantity: t.quantity,
                price: t.price,
                fees: t.fees,
                strategyType: t.strategy_type,
                brokerName: t.broker_name,
                externalId: t.external_id,
                settlementDate: t.settlement_date,
                asset: t.asset,
                // Add portfolio name as additional property (will be ignored by TypeScript)
                portfolioName: portfolio.name,
              } as UnifiedTransactionEntry & { portfolioName: string })
            );
            allEntries.push(...(transformedTransactions as UnifiedEntry[]));
          }

          // Process fund movements
          if (fundMovementsResponse.success && fundMovementsResponse.data) {
            const transformedFundMovements = (
              fundMovementsResponse.data as any[]
            ).map((movement) => ({
              id: movement.id,
              portfolioId: movement.portfolio_id,
              date: new Date(movement.movement_date),
              amount: movement.amount,
              currency: movement.currency,
              notes: movement.notes || '',
              createdAt: new Date(movement.created_at),
              updatedAt: new Date(movement.updated_at),
              type: 'fund_movement' as const,
              fundMovementType: movement.type,
              status: movement.status,
              originalAmount: movement.original_amount,
              originalCurrency: movement.original_currency,
              convertedAmount: movement.converted_amount,
              convertedCurrency: movement.converted_currency,
              exchangeRate: movement.exchange_rate,
              exchangeFees: movement.exchange_fees,
              account: movement.account,
              fromAccount: movement.from_account,
              toAccount: movement.to_account,
              // Add portfolio name as additional property
              portfolioName: portfolio.name,
            } as UnifiedFundMovementEntry & { portfolioName: string }));
            allEntries.push(...(transformedFundMovements as UnifiedEntry[]));
          }
        } catch (portfolioError) {
          console.error(`Error fetching data for portfolio ${portfolio.name}:`, portfolioError);
          // Continue with other portfolios
        }
      }

      console.log('🔍 Transactions.tsx: Combined entries from all portfolios:', {
        totalEntries: allEntries.length,
        portfolioCount: portfolios.length
      });

      // Sort all entries by date, newest first
      allEntries.sort((a, b) => b.date.getTime() - a.date.getTime());
      setUnifiedEntries(allEntries);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMsg);
      notify.error('Failed to fetch entries from all portfolios: ' + errorMsg);
    } finally {
      setLoading(false);
    }
  }, [portfolios, notify]);

  // Update filters when portfolio selection changes
  useEffect(() => {
    console.log('🔄 Portfolio selection changed:', { 
      activePortfolioId: activePortfolio?.id, 
      isAllPortfolios: activePortfolio === null
    });
    
    // Update portfolio filter based on active portfolio
    if (activePortfolio === null) {
      // "All Portfolios" selected - show all transactions regardless of portfolio
      console.log('📊 Setting filter to show all portfolios');
      setFilters(prev => ({ ...prev, portfolioId: 'all' }));
    } else {
      // Specific portfolio selected - filter to that portfolio only
      console.log('📊 Setting filter to specific portfolio:', activePortfolio.name);
      setFilters(prev => ({ ...prev, portfolioId: activePortfolio.id }));
    }
  }, [activePortfolio?.id]);

  // Fetch data when portfolios change - simplified approach
  useEffect(() => {
    if (portfolios.length > 0) {
      console.log('📊 Fetching data from all portfolios, filtering handled client-side');
      // Always fetch from all portfolios - "All Portfolios" is just absence of filter
      fetchUnifiedEntriesFromAllPortfolios();
    }
  }, [portfolioIds]); // Removed fetchUnifiedEntriesFromAllPortfolios from deps to prevent loop

  const handleEditEntry = (entry: UnifiedEntry) => {
    if (entry.type === 'transaction') {
      setEditingTransaction(entry as UnifiedTransactionEntry);
      setShowEditModal(true);
    } else {
      // Fund movement editing not implemented in unified view
      notify.info('Fund movement editing will be available in a future update');
    }
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
        if (activePortfolio?.id) fetchUnifiedEntries(activePortfolio.id); // Refresh the list
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
        if (activePortfolio?.id) fetchUnifiedEntries(activePortfolio.id);
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

  const handleSaveUnifiedEntry = async (data: any): Promise<boolean> => {
    if (data.entryType === 'asset_transaction') {
      // Handle asset transaction
      const transactionData: Omit<Transaction, 'id' | 'assetId' | 'createdAt' | 'updatedAt'> = {
        portfolioId: data.portfolioId,
        assetSymbol: data.assetSymbol,
        type: data.type as TransactionType,
        date: (() => {
          const [year, month, day] = data.date.split('-').map(Number);
          return new Date(year, month - 1, day);
        })(),
        quantity: parseFloat(data.quantity) || 0,
        price: parseFloat(data.price) || 0,
        notes: data.notes?.trim() || undefined,
        currency: data.currency,
        assetType: data.assetType,
        totalAmount: parseFloat(data.quantity) * parseFloat(data.price),
        strategyType: data.strategyType || undefined,
      };
      return await handleSaveTransaction(transactionData);
    } else {
      // Handle fund movement
      const fundMovementData: Omit<FundMovement, 'id' | 'createdAt' | 'updatedAt'> = {
        portfolioId: data.portfolioId,
        type: data.type as FundMovementType,
        status: data.status as FundMovementStatus,
        date: (() => {
          const [year, month, day] = data.date.split('-').map(Number);
          return new Date(year, month - 1, day);
        })(),
        amount: parseFloat(data.amount) || 0,
        currency: data.currency,
        fees: 0,
        notes: data.notes?.trim() || undefined,
        account: data.account || undefined,
        fromAccount: data.fromAccount || undefined,
        toAccount: data.toAccount || undefined,
      };
      return await handleSaveFundMovement(fundMovementData);
    }
  };

  const handleSaveFundMovement = async (fundMovementData: Omit<FundMovement, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    if (!activePortfolio?.id) {
      notify.error('No portfolio selected');
      return false;
    }

    try {
      setLoading(true);

      const response = await FundMovementService.createFundMovement(
        fundMovementData.portfolioId,
        fundMovementData.type,
        fundMovementData.amount,
        fundMovementData.currency,
        fundMovementData.status,
        (() => {
          const date = fundMovementData.date;
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })(),
        {
          fees: fundMovementData.fees || 0,
          notes: fundMovementData.notes,
          account: fundMovementData.account,
          fromAccount: fundMovementData.fromAccount,
          toAccount: fundMovementData.toAccount
        }
      );

      if (response.success) {
        notify.success('Fund movement added successfully');
        if (activePortfolio?.id) fetchUnifiedEntries(activePortfolio.id);
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

  const handleDeleteEntry = async (id: string, type: UnifiedEntryType) => {
    if (window.confirm(`Are you sure you want to delete this ${type}?`)) {
      try {
        setLoading(true);

        let response;
        if (type === 'transaction') {
          response = await TransactionService.deleteTransaction(id);
        } else {
          response = await FundMovementService.deleteFundMovement(id);
        }

        if (response.success) {
          notify.success(`${type} deleted successfully`);
          if (activePortfolio?.id) fetchUnifiedEntries(activePortfolio.id);
        } else {
          notify.error(`Failed to delete ${type}: ` + response.error);
        }
      } catch (error) {
        console.error(`Failed to delete ${type}:`, error);
        notify.error(`Failed to delete ${type}`);
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
          {portfolios.length > 1 && (
            <div className="enhanced-header-actions">
              <PortfolioSelector compact={true} />
            </div>
          )}
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
                <TransactionForm onSave={handleSaveUnifiedEntry} loading={loading} />
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
                    <span>{filteredEntries.length} entries</span>
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
                entries={filteredEntries}
                loading={loading}
                error={error}
                onEdit={handleEditEntry}
                onDelete={handleDeleteEntry}
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

    </div>
  );
};

export default TransactionsPage;
