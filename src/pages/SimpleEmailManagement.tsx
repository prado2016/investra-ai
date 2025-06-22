/**
 * Simple Email Management Page
 * Shows emails from database with email-puller status indicator
 */
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Mail, 
  RefreshCw, 
  Search, 
  Filter,
  CheckCircle,
  AlertCircle,
  Clock,
  User,
  Calendar,
  Trash2,
  Eye,
  FileText,
  X,
  DollarSign
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useNotifications } from '../hooks/useNotifications';
import { useSupabasePortfolios } from '../hooks/useSupabasePortfolios';
import { simpleEmailService, parseEmailForTransaction } from '../services/simpleEmailService';
import type { EmailItem, EmailStats, EmailPullerStatus } from '../services/simpleEmailService';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../contexts/AuthProvider';

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  [data-theme="dark"] & {
    color: #f1f5f9;
  }
`;

const PageSubtitle = styled.p`
  font-size: 1.125rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;

  [data-theme="dark"] & {
    color: #94a3b8;
  }
`;

const StatusCard = styled(Card)<{ $status: 'connected' | 'disconnected' | 'loading' }>`
  padding: 1.5rem;
  margin-bottom: 2rem;
  border-left: 4px solid ${props => {
    switch (props.$status) {
      case 'connected': return '#10b981';
      case 'disconnected': return '#ef4444';
      case 'loading': return '#f59e0b';
      default: return '#6b7280';
    }
  }};
  background: ${props => {
    switch (props.$status) {
      case 'connected': return 'linear-gradient(135deg, #f0fdf9 0%, #ecfdf5 100%)';
      case 'disconnected': return 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)';
      case 'loading': return 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)';
      default: return 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)';
    }
  }};

  [data-theme="dark"] & {
    background: ${props => {
      switch (props.$status) {
        case 'connected': return 'linear-gradient(135deg, #064e3b 0%, #065f46 100%)';
        case 'disconnected': return 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)';
        case 'loading': return 'linear-gradient(135deg, #78350f 0%, #92400e 100%)';
        default: return 'linear-gradient(135deg, #374151 0%, #4b5563 100%)';
      }
    }};
  }
`;

const StatusHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
`;

const StatusInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const StatusIcon = styled.div<{ $status: 'connected' | 'disconnected' | 'loading' }>`
  color: ${props => {
    switch (props.$status) {
      case 'connected': return '#10b981';
      case 'disconnected': return '#ef4444';
      case 'loading': return '#f59e0b';
      default: return '#6b7280';
    }
  }};

  [data-theme="dark"] & {
    color: ${props => {
      switch (props.$status) {
        case 'connected': return '#34d399';
        case 'disconnected': return '#f87171';
        case 'loading': return '#fbbf24';
        default: return '#9ca3af';
      }
    }};
  }
`;

const StatusText = styled.div`
  font-weight: 600;
  color: #111827;

  [data-theme="dark"] & {
    color: #f9fafb;
  }
`;

const StatusDetails = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.5rem;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled(Card)`
  padding: 1.5rem;
  text-align: center;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border: 1px solid #e2e8f0;

  [data-theme="dark"] & {
    background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
    border-color: #4b5563;
  }
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const ControlsRow = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  margin-bottom: 2rem;
`;

const SearchInput = styled.input`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  min-width: 300px;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
    color: #f3f4f6;

    &:focus {
      border-color: #60a5fa;
      box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
    }
  }
`;

const FilterSelect = styled.select`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
    color: #f3f4f6;
  }
`;

const EmailList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const EmailCard = styled(Card)<{ $priority: 'pending' | 'processing' | 'error' }>`
  padding: 1.5rem;
  border-left: 4px solid ${props => {
    switch (props.$priority) {
      case 'pending': return '#f59e0b';
      case 'processing': return '#3b82f6';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  }};
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  [data-theme="dark"] & {
    background: #374151;
  }
`;

const EmailHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
`;

const EmailMeta = styled.div`
  flex: 1;
  min-width: 250px;
`;

const EmailSubject = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 0.5rem 0;
  line-height: 1.3;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const EmailInfo = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.875rem;
  color: #6b7280;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const EmailInfoItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const EmailPreview = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.4;
  margin: 1rem 0;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px solid #e5e7eb;

  [data-theme="dark"] & {
    background: #1f2937;
    border-color: #374151;
    color: #9ca3af;
  }
`;

const StatusBadge = styled.span<{ $status: 'pending' | 'processing' | 'error' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  
  ${props => {
    switch (props.$status) {
      case 'pending':
        return `
          background: #fef3c7;
          color: #92400e;
        `;
      case 'processing':
        return `
          background: #dbeafe;
          color: #1e40af;
        `;
      case 'error':
        return `
          background: #fee2e2;
          color: #991b1b;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #374151;
        `;
    }
  }}

  [data-theme="dark"] & {
    ${props => {
      switch (props.$status) {
        case 'pending':
          return `
            background: #92400e;
            color: #fef3c7;
          `;
        case 'processing':
          return `
            background: #1e40af;
            color: #dbeafe;
          `;
        case 'error':
          return `
            background: #991b1b;
            color: #fee2e2;
          `;
        default:
          return `
            background: #374151;
            color: #d1d5db;
          `;
      }
    }}
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: #6b7280;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const EmptyIcon = styled.div`
  margin: 0 auto 1rem;
  opacity: 0.5;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 1rem;
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);

  [data-theme="dark"] & {
    background: #1f2937;
    color: #f3f4f6;
  }
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1rem;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin: 0;
  line-height: 1.3;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  padding: 0.5rem;
  cursor: pointer;
  border-radius: 6px;
  color: #6b7280;
  
  &:hover {
    background: #f3f4f6;
    color: #374151;
  }

  [data-theme="dark"] & {
    color: #9ca3af;
    
    &:hover {
      background: #374151;
      color: #d1d5db;
    }
  }
`;

const EmailDetail = styled.div`
  margin-bottom: 1.5rem;
`;

const DetailLabel = styled.div`
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  [data-theme="dark"] & {
    color: #d1d5db;
  }
`;

const DetailValue = styled.div`
  color: #111827;
  line-height: 1.5;
  word-break: break-word;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const EmailContent = styled.div`
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1.5rem;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  max-height: 400px;
  overflow-y: auto;

  [data-theme="dark"] & {
    background: #111827;
    border-color: #374151;
    color: #d1d5db;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 1.5rem;
`;

const FormLabel = styled.label`
  display: block;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;

  [data-theme="dark"] & {
    color: #d1d5db;
  }
`;

const FormInput = styled.input`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
    color: #f3f4f6;

    &:focus {
      border-color: #60a5fa;
      box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
    }
  }
`;

const FormSelect = styled.select`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
    color: #f3f4f6;
  }
`;

const FormActions = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  margin-top: 2rem;
`;

const SimpleEmailManagement: React.FC = () => {
  usePageTitle('Email Import', { subtitle: 'Simple Email Database Viewer' });
  
  const { success, error } = useNotifications();
  const { user, loading: authLoading } = useAuth();
  const { portfolios } = useSupabasePortfolios();
  
  // State management
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [stats, setStats] = useState<EmailStats>({ total: 0, pending: 0, processing: 0, error: 0 });
  const [pullerStatus, setPullerStatus] = useState<EmailPullerStatus>({ isConnected: false, emailCount: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'error'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [processingEmail, setProcessingEmail] = useState<EmailItem | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [transactionForm, setTransactionForm] = useState({
    // Trading transaction fields
    portfolioId: '',
    symbol: '',
    assetType: 'stock' as 'stock' | 'option',
    transactionType: 'buy' as 'buy' | 'sell',
    quantity: '',
    price: '',
    totalAmount: '',
    fees: '',
    currency: 'USD',
    date: '',
    // Legacy fields for backward compatibility
    type: 'expense' as 'income' | 'expense',
    amount: '',
    description: '',
    category: ''
  });

  // Load data on mount and when user changes
  useEffect(() => {
    if (!authLoading && user) {
      loadData();
    }
  }, [authLoading, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadEmails(),
        loadStats(),
        loadPullerStatus()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadEmails = async () => {
    const statusFilterValue = statusFilter === 'all' ? undefined : statusFilter;
    const result = await simpleEmailService.getEmails(statusFilterValue, 100);
    
    if (result.error) {
      error('Load Error', result.error);
      setEmails([]);
    } else {
      setEmails(result.data || []);
    }
  };

  const loadStats = async () => {
    const result = await simpleEmailService.getEmailStats();
    
    if (result.error) {
      console.error('Failed to load stats:', result.error);
    } else {
      setStats(result.data || { total: 0, pending: 0, processing: 0, error: 0 });
    }
  };

  const loadPullerStatus = async () => {
    const result = await simpleEmailService.getEmailPullerStatus();
    
    if (result.error) {
      console.error('Failed to load puller status:', result.error);
    } else {
      setPullerStatus(result.data || { isConnected: false, emailCount: 0 });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    success('Refreshed', 'Email data has been refreshed');
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      await loadEmails();
      return;
    }

    const statusFilterValue = statusFilter === 'all' ? undefined : statusFilter;
    const result = await simpleEmailService.searchEmails(searchTerm, statusFilterValue);
    
    if (result.error) {
      error('Search Error', result.error);
    } else {
      setEmails(result.data || []);
    }
  };

  const handleDelete = async (emailId: string) => {
    if (!confirm('Are you sure you want to delete this email?')) {
      return;
    }

    const result = await simpleEmailService.deleteEmail(emailId);
    
    if (result.error) {
      error('Delete Error', result.error);
    } else {
      success('Email Deleted', 'Email has been removed from the inbox');
      setEmails(prev => prev.filter(email => email.id !== emailId));
      await loadStats(); // Refresh stats
    }
  };

  const handleProcessEmail = async () => {
    if (!processingEmail) return;

    // Check if this is a trading transaction - if we have parsed data, treat as trading
    const isTradingTransaction = parsedData;

    if (isTradingTransaction) {
      // Validate trading transaction form
      if (!transactionForm.portfolioId) {
        error('Validation Error', 'Please select a portfolio');
        return;
      }
      if (!transactionForm.symbol) {
        error('Validation Error', 'Please enter a symbol');
        return;
      }
      if (!transactionForm.quantity || parseFloat(transactionForm.quantity) <= 0) {
        error('Validation Error', 'Please enter a valid quantity');
        return;
      }
      if (!transactionForm.price || parseFloat(transactionForm.price) <= 0) {
        error('Validation Error', 'Please enter a valid price');
        return;
      }
      if (!transactionForm.date) {
        error('Validation Error', 'Please select a date');
        return;
      }

      try {
        // Get or create asset
        const assetResult = await simpleEmailService.getOrCreateAsset(
          transactionForm.symbol,
          transactionForm.assetType
        );

        if (assetResult.error || !assetResult.data) {
          error('Asset Error', assetResult.error || 'Failed to create asset');
          return;
        }

        const assetId = assetResult.data.id;
        
        // Calculate values
        const quantity = parseFloat(transactionForm.quantity);
        const price = parseFloat(transactionForm.price);
        const fees = parseFloat(transactionForm.fees) || 0;
        
        // For options, convert contracts to shares (multiply by 100)
        const actualQuantity = transactionForm.assetType === 'option' ? quantity * 100 : quantity;
        
        // Calculate total amount if not provided
        const totalAmount = transactionForm.totalAmount 
          ? parseFloat(transactionForm.totalAmount)
          : quantity * price;

        // Create the trading transaction data
        const tradingTransactionData = {
          portfolio_id: transactionForm.portfolioId,
          asset_id: assetId,
          transaction_type: transactionForm.transactionType,
          quantity: actualQuantity,
          price: price,
          total_amount: totalAmount,
          fees: fees,
          transaction_date: transactionForm.date,
          currency: transactionForm.currency,
          notes: JSON.stringify({
            ...parsedData?.rawData,
            processed_from_email: true,
            original_quantity_display: transactionForm.assetType === 'option' ? `${quantity} contracts` : `${quantity} shares`
          })
        };

        // Use the enhanced processEmail method with trading data
        const result = await simpleEmailService.processTradingEmail(
          processingEmail.id, 
          tradingTransactionData
        );

        if (result.error) {
          error('Process Error', result.error);
        } else {
          success('Trading Email Processed', `${transactionForm.transactionType.toUpperCase()} transaction created for ${transactionForm.symbol} and email archived`);
          setEmails(prev => prev.filter(email => email.id !== processingEmail.id));
          setProcessingEmail(null);
          setParsedData(null);
          // Reset form to default state
          const today = new Date();
          const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
          setTransactionForm({
            portfolioId: portfolios.length > 0 ? portfolios[0].id : '',
            symbol: '',
            assetType: 'stock',
            transactionType: 'buy',
            quantity: '',
            price: '',
            totalAmount: '',
            fees: '0',
            currency: 'USD',
            date: dateStr,
            type: 'expense',
            amount: '',
            description: '',
            category: ''
          });
          await loadStats(); // Refresh stats
        }
      } catch (err) {
        console.error('Error processing trading email:', err);
        error('Process Error', err instanceof Error ? err.message : 'Failed to process trading email');
      }
    } else {
      // Basic transaction validation
      if (!transactionForm.amount || !transactionForm.description) {
        error('Validation Error', 'Please fill in amount and description');
        return;
      }

      const amount = parseFloat(transactionForm.amount);
      if (isNaN(amount) || amount <= 0) {
        error('Validation Error', 'Please enter a valid amount');
        return;
      }

      // Use the legacy processEmail method for basic transactions
      const result = await simpleEmailService.processEmail(processingEmail.id, {
        type: transactionForm.type,
        amount,
        description: transactionForm.description,
        category: transactionForm.category || undefined
      });

      if (result.error) {
        error('Process Error', result.error);
      } else {
        success('Email Processed', `Transaction created and email archived`);
        setEmails(prev => prev.filter(email => email.id !== processingEmail.id));
        setProcessingEmail(null);
        setParsedData(null);
        setTransactionForm({ 
          portfolioId: '',
          symbol: '',
          assetType: 'stock',
          transactionType: 'buy',
          quantity: '',
          price: '',
          totalAmount: '',
          fees: '0',
          currency: 'USD',
          date: '',
          type: 'expense', 
          amount: '', 
          description: '', 
          category: '' 
        });
        await loadStats(); // Refresh stats
      }
    }
  };

  const openProcessModal = async (email: EmailItem) => {
    setProcessingEmail(email);
    
    // Parse email content to extract transaction information
    const extracted = await parseEmailForTransaction(email);
    setParsedData(extracted);
    
    // Get today's date in YYYY-MM-DD format
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    if (extracted) {
      // Check if this is a trading transaction - if we have extracted data, treat as trading
      const isTradingTransaction = true; // Always treat parsed emails as trading transactions
      
      if (isTradingTransaction) {
        // Auto-fill form with trading data
        setTransactionForm({
          // Trading fields
          portfolioId: '', // Will be set after portfolio lookup
          symbol: extracted.symbol || '',
          assetType: extracted.assetType || 'stock',
          transactionType: extracted.transactionType || 'buy',
          quantity: extracted.quantity?.toString() || '',
          price: extracted.price?.toString() || '',
          totalAmount: extracted.totalAmount?.toString() || '',
          fees: extracted.fees?.toString() || '0',
          currency: extracted.currency || 'USD',
          date: extracted.transactionDate || dateStr,
          // Legacy fields for compatibility
          type: extracted.type || (extracted.transactionType === 'buy' ? 'expense' : 'income'),
          amount: extracted.amount?.toString() || extracted.totalAmount?.toString() || '',
          description: extracted.description || `${extracted.transactionType?.toUpperCase()} ${extracted.quantity || ''} ${extracted.assetType === 'option' ? 'contracts' : 'shares'} of ${extracted.symbol || ''}`,
          category: extracted.category || 'Trading'
        });
        
        // If portfolio name was extracted, try to find matching portfolio
        if (extracted.portfolioName && portfolios.length > 0) {
          const matchingPortfolio = portfolios.find(p => 
            p.name.toUpperCase() === extracted.portfolioName?.toUpperCase() ||
            p.name.toUpperCase().includes(extracted.portfolioName?.toUpperCase() || '') ||
            (extracted.portfolioName?.toUpperCase() || '').includes(p.name.toUpperCase())
          );
          
          if (matchingPortfolio) {
            setTransactionForm(prev => ({ ...prev, portfolioId: matchingPortfolio.id }));
          }
        }
      } else {
        // Basic transaction with legacy fields
        setTransactionForm({
          portfolioId: '',
          symbol: '',
          assetType: 'stock',
          transactionType: 'buy',
          quantity: '',
          price: '',
          totalAmount: '',
          fees: '0',
          currency: extracted.currency || 'USD',
          date: dateStr,
          type: extracted.type || 'expense',
          amount: extracted.amount?.toString() || '',
          description: extracted.description || email.subject || 'Email transaction',
          category: extracted.category || 'Email Import'
        });
      }
    } else {
      // Fallback to manual entry
      setTransactionForm({
        portfolioId: portfolios.length > 0 ? portfolios[0].id : '',
        symbol: '',
        assetType: 'stock',
        transactionType: 'buy',
        quantity: '',
        price: '',
        totalAmount: '',
        fees: '0',
        currency: 'USD',
        date: dateStr,
        type: 'expense',
        amount: '',
        description: email.subject || 'Email transaction',
        category: ''
      });
    }
  };

  // Filter emails based on search and status
  const filteredEmails = emails.filter(email => {
    const matchesSearch = !searchTerm || 
      email.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.from_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.from_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const kb = bytes / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)}MB` : `${kb.toFixed(1)}KB`;
  };

  const getEmailPreview = (email: EmailItem) => {
    const content = email.text_content || email.html_content || '';
    return content.substring(0, 200) + (content.length > 200 ? '...' : '');
  };

  const getStatusIcon = () => {
    if (loading) return <RefreshCw size={20} className="animate-spin" />;
    if (pullerStatus.isConnected) return <CheckCircle size={20} />;
    return <AlertCircle size={20} />;
  };

  const getStatusText = () => {
    if (loading) return 'Checking...';
    if (pullerStatus.isConnected) return 'Email Puller Connected';
    return 'Email Puller Disconnected';
  };

  const getStatusType = (): 'connected' | 'disconnected' | 'loading' => {
    if (loading) return 'loading';
    return pullerStatus.isConnected ? 'connected' : 'disconnected';
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <PageContainer>
        <EmptyState>
          <EmptyIcon>
            <RefreshCw size={48} className="animate-spin" />
          </EmptyIcon>
          <div>Loading authentication...</div>
        </EmptyState>
      </PageContainer>
    );
  }

  // Show authentication required message
  if (!user) {
    return (
      <PageContainer>
        <PageHeader>
          <PageTitle>
            <Mail size={32} />
            Email Import
          </PageTitle>
          <PageSubtitle>
            Simple email database viewer with email-puller status
          </PageSubtitle>
        </PageHeader>

        <StatusCard $status="disconnected">
          <StatusHeader>
            <StatusInfo>
              <StatusIcon $status="disconnected">
                <AlertCircle size={20} />
              </StatusIcon>
              <div>
                <StatusText>Authentication Required</StatusText>
                <StatusDetails>
                  Please log in to view email data. The email system requires authentication to access your inbox.
                </StatusDetails>
              </div>
            </StatusInfo>
          </StatusHeader>
        </StatusCard>

        <EmptyState>
          <EmptyIcon>
            <Mail size={48} />
          </EmptyIcon>
          <div style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
            Authentication Required
          </div>
          <div style={{ fontSize: '0.875rem' }}>
            Please log in to access your email inbox and view email-puller status
          </div>
        </EmptyState>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          <Mail size={32} />
          Email Import
        </PageTitle>
        <PageSubtitle>
          Simple email database viewer with email-puller status
        </PageSubtitle>
      </PageHeader>

      {/* Email Puller Status */}
      <StatusCard $status={getStatusType()}>
        <StatusHeader>
          <StatusInfo>
            <StatusIcon $status={getStatusType()}>
              {getStatusIcon()}
            </StatusIcon>
            <div>
              <StatusText>{getStatusText()}</StatusText>
              <StatusDetails>
                {user && (
                  <>User ID: {user.id} • </>
                )}
                {pullerStatus.lastSync && (
                  <>Last sync: {formatDate(pullerStatus.lastSync)} • </>
                )}
                {stats.total} emails in database
                {pullerStatus.error && (
                  <> • Error: {pullerStatus.error}</>
                )}
              </StatusDetails>
            </div>
          </StatusInfo>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            Refresh
          </Button>
        </StatusHeader>
      </StatusCard>

      {/* Statistics */}
      <StatsRow>
        <StatCard>
          <StatValue>{stats.total}</StatValue>
          <StatLabel>Total Emails</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.pending}</StatValue>
          <StatLabel>Pending</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.processing}</StatValue>
          <StatLabel>Processing</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.error}</StatValue>
          <StatLabel>Errors</StatLabel>
        </StatCard>
      </StatsRow>

      {/* Search and Filter Controls */}
      <ControlsRow>
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search size={16} style={{ 
            position: 'absolute', 
            left: '0.75rem', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: '#6b7280'
          }} />
          <SearchInput
            type="text"
            placeholder="Search emails by subject or sender..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Filter size={16} style={{ color: '#6b7280' }} />
          <FilterSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="error">Error</option>
          </FilterSelect>
        </div>

        <Button variant="primary" onClick={handleSearch}>
          <Search size={16} />
          Search
        </Button>
      </ControlsRow>

      {/* Email List */}
      <EmailList>
        {loading ? (
          <EmptyState>
            <EmptyIcon>
              <RefreshCw size={48} className="animate-spin" />
            </EmptyIcon>
            <div>Loading emails...</div>
          </EmptyState>
        ) : filteredEmails.length === 0 ? (
          <EmptyState>
            <EmptyIcon>
              <Mail size={48} />
            </EmptyIcon>
            <div style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>
              {emails.length === 0 ? 'No emails found' : 'No emails match your search'}
            </div>
            <div style={{ fontSize: '0.875rem' }}>
              {emails.length === 0 
                ? 'The email-puller hasn\'t imported any emails yet'
                : 'Try adjusting your search criteria'
              }
            </div>
          </EmptyState>
        ) : (
          filteredEmails.map(email => (
            <EmailCard key={email.id} $priority={email.status}>
              <EmailHeader>
                <EmailMeta>
                  <EmailSubject>{email.subject || 'No Subject'}</EmailSubject>
                  <EmailInfo>
                    <EmailInfoItem>
                      <User size={14} />
                      {email.from_name ? `${email.from_name} <${email.from_email}>` : email.from_email}
                    </EmailInfoItem>
                    <EmailInfoItem>
                      <Calendar size={14} />
                      {formatDate(email.received_at)}
                    </EmailInfoItem>
                    {email.email_size && (
                      <EmailInfoItem>
                        <FileText size={14} />
                        {formatFileSize(email.email_size)}
                      </EmailInfoItem>
                    )}
                  </EmailInfo>
                </EmailMeta>
                
                <StatusBadge $status={email.status}>
                  {email.status === 'pending' && <Clock size={12} />}
                  {email.status === 'processing' && <RefreshCw size={12} />}
                  {email.status === 'error' && <AlertCircle size={12} />}
                  {email.status.charAt(0).toUpperCase() + email.status.slice(1)}
                </StatusBadge>
              </EmailHeader>

              <EmailPreview>
                {getEmailPreview(email) || 'No preview available'}
              </EmailPreview>

              {email.error_message && (
                <EmailPreview style={{ background: '#fee2e2', borderColor: '#ef4444', color: '#991b1b' }}>
                  <strong>Error:</strong> {email.error_message}
                </EmailPreview>
              )}

              <ActionButtons>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => openProcessModal(email)}
                >
                  <DollarSign size={14} />
                  Process Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedEmail(email)}
                >
                  <Eye size={14} />
                  View Details
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(email.id)}
                >
                  <Trash2 size={14} />
                  Delete
                </Button>
              </ActionButtons>
            </EmailCard>
          ))
        )}
      </EmailList>

      {/* Email Detail Modal */}
      {selectedEmail && (
        <ModalOverlay onClick={() => setSelectedEmail(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>{selectedEmail.subject || 'No Subject'}</ModalTitle>
              <CloseButton onClick={() => setSelectedEmail(null)}>
                <X size={20} />
              </CloseButton>
            </ModalHeader>

            <EmailDetail>
              <DetailLabel>From</DetailLabel>
              <DetailValue>
                {selectedEmail.from_name 
                  ? `${selectedEmail.from_name} <${selectedEmail.from_email}>` 
                  : selectedEmail.from_email
                }
              </DetailValue>
            </EmailDetail>

            {selectedEmail.to_email && (
              <EmailDetail>
                <DetailLabel>To</DetailLabel>
                <DetailValue>{selectedEmail.to_email}</DetailValue>
              </EmailDetail>
            )}

            <EmailDetail>
              <DetailLabel>Received</DetailLabel>
              <DetailValue>{formatDate(selectedEmail.received_at)}</DetailValue>
            </EmailDetail>

            <EmailDetail>
              <DetailLabel>Message ID</DetailLabel>
              <DetailValue style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                {selectedEmail.message_id}
              </DetailValue>
            </EmailDetail>

            {selectedEmail.email_size && (
              <EmailDetail>
                <DetailLabel>Size</DetailLabel>
                <DetailValue>{formatFileSize(selectedEmail.email_size)}</DetailValue>
              </EmailDetail>
            )}

            <EmailDetail>
              <DetailLabel>Status</DetailLabel>
              <DetailValue>
                <StatusBadge $status={selectedEmail.status}>
                  {selectedEmail.status === 'pending' && <Clock size={12} />}
                  {selectedEmail.status === 'processing' && <RefreshCw size={12} />}
                  {selectedEmail.status === 'error' && <AlertCircle size={12} />}
                  {selectedEmail.status.charAt(0).toUpperCase() + selectedEmail.status.slice(1)}
                </StatusBadge>
              </DetailValue>
            </EmailDetail>

            {selectedEmail.error_message && (
              <EmailDetail>
                <DetailLabel>Error Message</DetailLabel>
                <DetailValue style={{ color: '#ef4444' }}>
                  {selectedEmail.error_message}
                </DetailValue>
              </EmailDetail>
            )}

            <EmailDetail>
              <DetailLabel>Content</DetailLabel>
              <EmailContent>
                {selectedEmail.text_content || selectedEmail.html_content || 'No content available'}
              </EmailContent>
            </EmailDetail>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* Process Email Modal */}
      {processingEmail && (
        <ModalOverlay onClick={() => setProcessingEmail(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>Process Email as Transaction</ModalTitle>
              <CloseButton onClick={() => setProcessingEmail(null)}>
                <X size={20} />
              </CloseButton>
            </ModalHeader>

            <EmailDetail>
              <DetailLabel>Email Subject</DetailLabel>
              <DetailValue>{processingEmail.subject || 'No Subject'}</DetailValue>
            </EmailDetail>

            <EmailDetail>
              <DetailLabel>From</DetailLabel>
              <DetailValue>
                {processingEmail.from_name 
                  ? `${processingEmail.from_name} <${processingEmail.from_email}>` 
                  : processingEmail.from_email
                }
              </DetailValue>
            </EmailDetail>

            {parsedData ? (
              <>
                {/* Show extracted information */}
                <div style={{ 
                  background: '#f0fdf4', 
                  border: '1px solid #bbf7d0', 
                  borderRadius: '8px', 
                  padding: '1rem', 
                  marginBottom: '1.5rem' 
                }}>
                  <DetailLabel style={{ color: '#166534', marginBottom: '1rem' }}>
                    📊 Automatically Extracted Trading Information
                  </DetailLabel>
                  
                  {/* Trading transaction data */}
                  {parsedData.symbol && (
                    <EmailDetail>
                      <DetailLabel>Symbol</DetailLabel>
                      <DetailValue>{parsedData.symbol}</DetailValue>
                    </EmailDetail>
                  )}
                  
                  {parsedData.assetType && (
                    <EmailDetail>
                      <DetailLabel>Asset Type</DetailLabel>
                      <DetailValue>{parsedData.assetType}</DetailValue>
                    </EmailDetail>
                  )}
                  
                  {parsedData.transactionType && (
                    <EmailDetail>
                      <DetailLabel>Transaction Type</DetailLabel>
                      <DetailValue>{parsedData.transactionType}</DetailValue>
                    </EmailDetail>
                  )}
                  
                  {parsedData.portfolioName && (
                    <EmailDetail>
                      <DetailLabel>Portfolio</DetailLabel>
                      <DetailValue>{parsedData.portfolioName}</DetailValue>
                    </EmailDetail>
                  )}
                  
                  {parsedData.quantity && (
                    <EmailDetail>
                      <DetailLabel>Quantity</DetailLabel>
                      <DetailValue>{parsedData.quantity} {parsedData.assetType === 'option' ? 'contracts' : 'shares'}</DetailValue>
                    </EmailDetail>
                  )}
                  
                  {parsedData.price && (
                    <EmailDetail>
                      <DetailLabel>Price</DetailLabel>
                      <DetailValue>${parsedData.price}</DetailValue>
                    </EmailDetail>
                  )}
                  
                  {parsedData.totalAmount && (
                    <EmailDetail>
                      <DetailLabel>Total Amount</DetailLabel>
                      <DetailValue>${parsedData.totalAmount}</DetailValue>
                    </EmailDetail>
                  )}
                  
                  {parsedData.fees && (
                    <EmailDetail>
                      <DetailLabel>Fees</DetailLabel>
                      <DetailValue>${parsedData.fees}</DetailValue>
                    </EmailDetail>
                  )}
                  
                  {parsedData.currency && (
                    <EmailDetail>
                      <DetailLabel>Currency</DetailLabel>
                      <DetailValue>{parsedData.currency}</DetailValue>
                    </EmailDetail>
                  )}
                  
                  {parsedData.transactionDate && (
                    <EmailDetail>
                      <DetailLabel>Date</DetailLabel>
                      <DetailValue>{parsedData.transactionDate}</DetailValue>
                    </EmailDetail>
                  )}
                </div>

                {/* Editable transaction form with pre-filled data */}
                <DetailLabel style={{ color: '#374151', marginBottom: '1rem' }}>
                  ✏️ Review & Edit Transaction Details
                </DetailLabel>
              </>
            ) : (
              <div style={{ 
                background: '#fef3c7', 
                border: '1px solid #fbbf24', 
                borderRadius: '8px', 
                padding: '1rem', 
                marginBottom: '1.5rem' 
              }}>
                <DetailLabel style={{ color: '#92400e' }}>
                  ⚠️ Could not automatically extract transaction data. Please enter manually.
                </DetailLabel>
              </div>
            )}

            {/* Check if this is a trading transaction - show trading form if we have ANY trading-related data */}
            {parsedData ? (
              /* Trading Transaction Form */
              <>
                <FormGroup>
                  <FormLabel>Portfolio *</FormLabel>
                  <FormSelect
                    value={transactionForm.portfolioId}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, portfolioId: e.target.value }))}
                    style={parsedData && parsedData.portfolioName ? { background: '#f0fdf4' } : {}}
                  >
                    <option value="">Select Portfolio</option>
                    {portfolios.map(portfolio => (
                      <option key={portfolio.id} value={portfolio.id}>
                        {portfolio.name}
                      </option>
                    ))}
                  </FormSelect>
                </FormGroup>

                <FormGroup>
                  <FormLabel>Symbol *</FormLabel>
                  <FormInput
                    type="text"
                    placeholder="e.g., NVDA"
                    value={transactionForm.symbol}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                    style={parsedData && parsedData.symbol ? { background: '#f0fdf4' } : {}}
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel>Asset Type *</FormLabel>
                  <FormSelect
                    value={transactionForm.assetType}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, assetType: e.target.value as 'stock' | 'option' }))}
                    style={parsedData && parsedData.assetType ? { background: '#f0fdf4' } : {}}
                  >
                    <option value="stock">Stock</option>
                    <option value="option">Option</option>
                  </FormSelect>
                </FormGroup>

                <FormGroup>
                  <FormLabel>Transaction Type *</FormLabel>
                  <FormSelect
                    value={transactionForm.transactionType}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, transactionType: e.target.value as 'buy' | 'sell' }))}
                    style={parsedData && parsedData.transactionType ? { background: '#f0fdf4' } : {}}
                  >
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                  </FormSelect>
                </FormGroup>

                <FormGroup>
                  <FormLabel>{transactionForm.assetType === 'option' ? 'Contracts' : 'Quantity'} *</FormLabel>
                  <FormInput
                    type="number"
                    step="0.0001"
                    placeholder={transactionForm.assetType === 'option' ? 'e.g., 10 contracts' : 'e.g., 100 shares'}
                    value={transactionForm.quantity}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, quantity: e.target.value }))}
                    style={parsedData && parsedData.quantity ? { background: '#f0fdf4' } : {}}
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel>Price *</FormLabel>
                  <FormInput
                    type="number"
                    step="0.0001"
                    placeholder="0.00"
                    value={transactionForm.price}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, price: e.target.value }))}
                    style={parsedData && parsedData.price ? { background: '#f0fdf4' } : {}}
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel>Total Amount</FormLabel>
                  <FormInput
                    type="number"
                    step="0.01"
                    placeholder="Auto-calculated"
                    value={transactionForm.totalAmount}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, totalAmount: e.target.value }))}
                    style={parsedData && parsedData.totalAmount ? { background: '#f0fdf4' } : {}}
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel>Fees</FormLabel>
                  <FormInput
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={transactionForm.fees}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, fees: e.target.value }))}
                    style={parsedData && parsedData.fees ? { background: '#f0fdf4' } : {}}
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel>Date *</FormLabel>
                  <FormInput
                    type="date"
                    value={transactionForm.date}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                    style={parsedData && parsedData.transactionDate ? { background: '#f0fdf4' } : {}}
                  />
                </FormGroup>
              </>
            ) : (
              /* Basic Transaction Form */
              <>
                <FormGroup>
                  <FormLabel>Transaction Type</FormLabel>
                  <FormSelect
                    value={transactionForm.type}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, type: e.target.value as 'income' | 'expense' }))}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </FormSelect>
                </FormGroup>

                <FormGroup>
                  <FormLabel>Amount *</FormLabel>
                  <FormInput
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={transactionForm.amount}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                    style={parsedData ? { background: '#f0fdf4' } : {}}
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel>Description *</FormLabel>
                  <FormInput
                    type="text"
                    placeholder="Transaction description"
                    value={transactionForm.description}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
                    style={parsedData ? { background: '#f0fdf4' } : {}}
                  />
                </FormGroup>

                <FormGroup>
                  <FormLabel>Category</FormLabel>
                  <FormSelect
                    value={transactionForm.category}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, category: e.target.value }))}
                    style={parsedData ? { background: '#f0fdf4' } : {}}
                  >
                    <option value="">Select category (optional)</option>
                    <option value="Banking">Banking</option>
                    <option value="Investment">Investment</option>
                    <option value="Trading">Trading</option>
                    <option value="Income">Income</option>
                    <option value="Expense">Expense</option>
                    <option value="Fee">Fee</option>
                    <option value="Other">Other</option>
                  </FormSelect>
                </FormGroup>
              </>
            )}

            <FormActions>
              <Button
                variant="outline"
                onClick={() => setProcessingEmail(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleProcessEmail}
              >
                <DollarSign size={16} />
                Create Transaction & Archive Email
              </Button>
            </FormActions>
          </ModalContent>
        </ModalOverlay>
      )}
    </PageContainer>
  );
};

export default SimpleEmailManagement;