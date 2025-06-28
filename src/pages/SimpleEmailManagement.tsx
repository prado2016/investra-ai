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
import { EmailConfigurationPanel } from '../components/EmailConfigurationPanel';
import { useNotifications } from '../hooks/useNotifications';
import { useSupabasePortfolios } from '../hooks/useSupabasePortfolios';
import { simpleEmailService, parseEmailForTransaction, triggerManualSyncViaDatabase } from '../services/simpleEmailService';
import { supabase } from '../lib/supabase';
import type { EmailItem, EmailStats, EmailPullerStatus } from '../services/simpleEmailService';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../contexts/AuthProvider';
import { useAIServices } from '../hooks/useAIServices';

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

const EmailCard = styled(Card)<{ $priority: 'pending' | 'processing' | 'error' | 'processed' }>`
  padding: 1.5rem;
  border-left: 4px solid ${props => {
    switch (props.$priority) {
      case 'pending': return '#f59e0b';
      case 'processing': return '#3b82f6';
      case 'error': return '#ef4444';
      case 'processed': return '#10b981';
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

const StatusBadge = styled.span<{ $status: 'pending' | 'processing' | 'error' | 'processed' }>`
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
      case 'processed':
        return `
          background: #d1fae5;
          color: #065f46;
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
        
        case 'processed':
          return `
            background: #065f46;
            color: #d1fae5;
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

// AI Parsing Animation Components
const ParsingContainer = styled.div`
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 1.5rem;
  text-align: center;

  [data-theme="dark"] & {
    background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
    border-color: #475569;
  }
`;

const ParsingStage = styled.div<{ $active: boolean; $completed: boolean; $error: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  padding: 1rem;
  margin: 0.5rem 0;
  border-radius: 8px;
  transition: all 0.3s ease;
  
  ${props => props.$active && `
    background: #dbeafe;
    border: 2px solid #3b82f6;
    transform: scale(1.02);
    
    [data-theme="dark"] & {
      background: #1e3a8a;
      border-color: #60a5fa;
    }
  `}
  
  ${props => props.$completed && `
    background: #dcfce7;
    border: 2px solid #16a34a;
    
    [data-theme="dark"] & {
      background: #14532d;
      border-color: #22c55e;
    }
  `}
  
  ${props => props.$error && `
    background: #fee2e2;
    border: 2px solid #ef4444;
    
    [data-theme="dark"] & {
      background: #7f1d1d;
      border-color: #f87171;
    }
  `}
`;

const ParsingIcon = styled.div<{ $active: boolean }>`
  font-size: 1.5rem;
  ${props => props.$active && `
    animation: pulse 1.5s infinite;
  `}
  
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
`;

const ParsingText = styled.div`
  font-weight: 600;
  color: #374151;
  
  [data-theme="dark"] & {
    color: #d1d5db;
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
  const { isInitialized: aiInitialized, initializeProvider, availableProviders } = useAIServices();
  
  // State management
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [stats, setStats] = useState<EmailStats>({ total: 0, pending: 0, processing: 0, error: 0 });
  const [pullerStatus, setPullerStatus] = useState<EmailPullerStatus>({ 
    isConnected: false, 
    emailCount: 0,
    configurationActive: false,
    recentActivity: { last24Hours: 0, lastHour: 0, lastWeek: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'error' | 'processed'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [manualSyncing, setManualSyncing] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailItem | null>(null);
  const [processingEmail, setProcessingEmail] = useState<EmailItem | null>(null);
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkCancelled, setBulkCancelled] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkResults, setBulkResults] = useState<{ processed: number; errors: number; }>({ processed: 0, errors: 0 });
  const [parsedData, setParsedData] = useState<any>(null);
  const [parsingStage, setParsingStage] = useState<'idle' | 'analyzing' | 'extracting' | 'validating' | 'complete' | 'error'>('idle');
  const [parsingError, setParsingError] = useState<string | null>(null);
  const [configPanelCollapsed, setConfigPanelCollapsed] = useState(false);
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

  // Initialize AI services if needed
  useEffect(() => {
    const initAI = async () => {
      if (!aiInitialized && availableProviders.length === 0) {
        try {
          console.log('Initializing Gemini AI service for email parsing...');
          await initializeProvider('gemini');
        } catch (error) {
          console.warn('Failed to initialize AI service:', error);
        }
      }
    };
    initAI();
  }, [aiInitialized, availableProviders, initializeProvider]);

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
    console.log('🔄 UI: Loading emails...');
    const statusFilterValue = statusFilter === 'all' ? undefined : statusFilter;
    console.log('🔍 UI: Status filter:', statusFilterValue);
    
    // Only show inbox emails (not processed) to focus on emails that need processing
    const result = await simpleEmailService.getEmails(statusFilterValue, 100, false);
    console.log('📦 UI: getEmails result:', result);
    
    if (result.error) {
      console.error('❌ UI: Error loading emails:', result.error);
      error('Load Error', result.error);
      setEmails([]);
    } else {
      const emailData = result.data || [];
      console.log('✅ UI: Setting emails state:', emailData.length, emailData);
      setEmails(emailData);
    }
  };

  const loadStats = async () => {
    try {
      console.log('📊 Loading real email stats from database...');
      
      // Get authenticated user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('❌ No authenticated user for stats');
        setStats({ total: 0, pending: 0, processing: 0, error: 0 });
        return;
      }

      // Get counts from both tables directly
      const { count: inboxCount } = await supabase
        .from('imap_inbox')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const { count: processedCount } = await supabase
        .from('imap_processed')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Count pending emails (status = 'pending' in inbox)
      const { count: pendingCount } = await supabase
        .from('imap_inbox')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'pending');

      // Count error emails (status = 'error' in inbox)
      const { count: errorCount } = await supabase
        .from('imap_inbox')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'error');

      const realStats = {
        total: (inboxCount || 0) + (processedCount || 0),
        pending: pendingCount || 0,
        processing: 0, // No emails currently processing
        error: errorCount || 0
      };

      console.log('✅ Real email stats loaded:', realStats);
      setStats(realStats);
      
    } catch (error) {
      console.error('❌ Failed to load real stats:', error);
      // Fallback to API stats
      const result = await simpleEmailService.getEmailStats();
      if (result.error) {
        console.error('Failed to load fallback stats:', result.error);
      } else {
        setStats(result.data || { total: 0, pending: 0, processing: 0, error: 0 });
      }
    }
  };

  const loadPullerStatus = async () => {
    const result = await simpleEmailService.getEmailPullerStatus();
    
    if (result.error) {
      console.error('Failed to load puller status:', result.error);
    } else {
      setPullerStatus(result.data || { 
        isConnected: false, 
        emailCount: 0,
        configurationActive: false,
        recentActivity: { last24Hours: 0, lastHour: 0, lastWeek: 0 }
      });
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
    success('Refreshed', 'Email data has been refreshed');
  };

  const handleManualSync = async () => {
    setManualSyncing(true);
    try {
      console.log('🔄 Starting database-driven manual email sync...');
      
      // Use the new database-driven trigger (NO AUTHENTICATION ISSUES!)
      const result = await triggerManualSyncViaDatabase();
      
      if (result.success) {
        success('Manual Sync Triggered', 'Email sync request submitted via database. Check emails in a few moments.');
        console.log('✅ Database sync trigger successful:', result.data);
        
        // Refresh data after sync completes (or timeout)
        setTimeout(async () => {
          console.log('🔄 Refreshing email data after sync...');
          await loadData();
        }, 3000);
        
        // Additional refresh after longer delay in case sync takes time
        setTimeout(async () => {
          console.log('🔄 Second refresh check...');
          await loadData();
        }, 10000);
        
      } else {
        error('Manual Sync Failed', result.error || 'Failed to trigger database sync');
        console.error('❌ Database sync trigger failed:', result.error);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      error('Manual Sync Error', errorMessage);
      console.error('❌ Manual sync error:', err);
    } finally {
      setManualSyncing(false);
    }
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
    setParsedData(null);
    setParsingError(null);
    setParsingStage('analyzing');
    
    try {
      // Stage 1: Analyzing email content
      await new Promise(resolve => setTimeout(resolve, 800));
      setParsingStage('extracting');
      
      // Stage 2: Extracting transaction data
      await new Promise(resolve => setTimeout(resolve, 1000));
      setParsingStage('validating');
      
      // Parse email content to extract transaction information
      const extracted = await parseEmailForTransaction(email);
      
      // Stage 3: Validating extracted data
      await new Promise(resolve => setTimeout(resolve, 600));
      
      if (extracted && extracted.aiParsed) {
        setParsingStage('complete');
        setParsedData(extracted);
      } else {
        setParsingStage('error');
        setParsingError(extracted?.error || 'Unable to extract transaction data from this email');
        setParsedData(extracted);
      }
    } catch (error) {
      setParsingStage('error');
      setParsingError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setParsedData(null);
    }
  };

  // Form filling logic (moved outside of openProcessModal)
  useEffect(() => {
    if (parsedData && parsedData.aiParsed && processingEmail) {
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      // Auto-fill form with trading data
      setTransactionForm({
        // Trading fields
        portfolioId: '', // Will be set after portfolio lookup
        symbol: parsedData.symbol || '',
        assetType: parsedData.assetType || 'stock',
        transactionType: parsedData.transactionType || 'buy',
        quantity: parsedData.quantity?.toString() || '',
        price: parsedData.price?.toString() || '',
        totalAmount: parsedData.totalAmount?.toString() || '',
        fees: parsedData.fees?.toString() || '0',
        currency: parsedData.currency || 'USD',
        date: parsedData.transactionDate || dateStr,
        // Legacy fields for compatibility
        type: parsedData.type || (parsedData.transactionType === 'buy' ? 'expense' : 'income'),
        amount: parsedData.amount?.toString() || parsedData.totalAmount?.toString() || '',
        description: parsedData.description || `${parsedData.transactionType?.toUpperCase()} ${parsedData.quantity || ''} ${parsedData.assetType === 'option' ? 'contracts' : 'shares'} of ${parsedData.symbol || ''}`,
        category: parsedData.category || 'Trading'
      });
      
      // If portfolio name was extracted, try to find matching portfolio
      if (parsedData.portfolioName && portfolios.length > 0) {
        console.log('🤖 AI extracted portfolioName:', parsedData.portfolioName);
        console.log('📋 Available portfolios:', portfolios.map(p => ({ id: p.id, name: p.name })));
        
        // Enhanced matching logic for portfolio names
        const extractedName = parsedData.portfolioName?.toUpperCase() || '';
        
        const matchingPortfolio = portfolios.find(p => {
          const portfolioName = p.name.toUpperCase();
          
          // Direct matches
          if (portfolioName === extractedName) return true;
          if (portfolioName.includes(extractedName)) return true;
          if (extractedName.includes(portfolioName)) return true;
          
          // Common portfolio type mappings
          const mappings = [
            { ai: 'MARGIN', portfolio: ['NON-REGISTERED', 'TRADING', 'MARGIN', 'CASH'] },
            { ai: 'TFSA', portfolio: ['TFSA', 'TAX-FREE'] },
            { ai: 'RRSP', portfolio: ['RRSP', 'RSP'] },
            { ai: 'CASH', portfolio: ['CASH', 'NON-REGISTERED', 'TRADING'] },
            { ai: 'TRADING', portfolio: ['TRADING', 'NON-REGISTERED', 'MARGIN'] }
          ];
          
          // Check if AI extracted name matches any mapping
          for (const mapping of mappings) {
            if (extractedName === mapping.ai) {
              return mapping.portfolio.some(keyword => portfolioName.includes(keyword));
            }
          }
          
          return false;
        });
        
        console.log('🎯 Matching portfolio found:', matchingPortfolio ? { id: matchingPortfolio.id, name: matchingPortfolio.name } : 'None');
        
        if (matchingPortfolio) {
          setTransactionForm(prev => ({ ...prev, portfolioId: matchingPortfolio.id }));
          console.log('✅ Portfolio set to:', matchingPortfolio.name);
        } else {
          console.log('❌ No matching portfolio found for AI-extracted name:', parsedData.portfolioName);
        }
      }
    }
  }, [parsedData, portfolios, processingEmail]);

  // Bulk process all emails one by one
  const handleBulkProcess = async () => {
    if (bulkProcessing) return;
    
    // Get all emails (including processed ones for reprocessing)
    const emailsToProcess = emails.filter(email => email.id); // All emails
    
    if (emailsToProcess.length === 0) {
      error('No Emails to Process', 'No emails found to process');
      return;
    }

    const confirmed = window.confirm(
      `Process ${emailsToProcess.length} emails? This will automatically parse each email and create transactions where possible.`
    );

    if (!confirmed) return;

    setBulkProcessing(true);
    setBulkCancelled(false);
    setBulkProgress({ current: 0, total: emailsToProcess.length });
    setBulkResults({ processed: 0, errors: 0 });

    let processed = 0;
    let errors = 0;

    for (let i = 0; i < emailsToProcess.length; i++) {
      // Check for cancellation at the start of each iteration
      if (bulkCancelled) {
        console.log('🛑 Bulk processing cancelled by user');
        break;
      }

      const email = emailsToProcess[i];
      setBulkProgress({ current: i + 1, total: emailsToProcess.length });

      try {
        console.log(`🔄 Bulk processing email ${i + 1}/${emailsToProcess.length}: ${email.subject}`);
        
        // Parse email content to extract transaction information
        const extracted = await parseEmailForTransaction(email);
        
        if (extracted?.rawData && Object.keys(extracted.rawData).length > 0) {
          // Email contains transaction data - attempt to process it
          console.log('📧 Email contains transaction data, processing...', extracted);
          
          // Use the simple processEmail method for automatic processing
          const result = await simpleEmailService.processEmail(email.id, {
            type: 'expense',
            amount: 0, // Will be updated based on parsed data
            description: email.subject || 'Processed email',
            category: 'Trading',
            date: new Date().toISOString()
          });
          
          if (result.error) {
            console.error(`❌ Failed to process email ${email.id}:`, result.error);
            errors++;
          } else {
            console.log(`✅ Successfully processed email ${email.id}`);
            processed++;
          }
        } else {
          // Email doesn't contain transaction data - mark as processed but no transaction created
          console.log('📧 Email contains no transaction data, marking as reviewed');
          
          const result = await simpleEmailService.processEmail(email.id, {
            type: 'expense',
            amount: 0,
            description: email.subject || 'Reviewed email',
            category: 'Other',
            date: new Date().toISOString()
          });
          if (result.error) {
            errors++;
          } else {
            processed++;
          }
        }
        
        // 60 second delay to prevent Gemini API rate limiting (1 email per minute)
        await new Promise(resolve => setTimeout(resolve, 60000)); // 60 second delay
        
      } catch (error) {
        console.error(`❌ Error processing email ${email.id}:`, error);
        errors++;
      }
      
      setBulkResults({ processed, errors });
    }

    const wasCancelled = bulkCancelled;
    setBulkProcessing(false);
    setBulkCancelled(false);
    
    // Refresh email list to show updated statuses with multiple attempts
    console.log('🔄 Refreshing email list after bulk processing...');
    
    // Immediate refresh
    await loadEmails();
    
    // Additional refresh after short delay to ensure database commits are complete
    setTimeout(async () => {
      console.log('🔄 Second refresh to ensure processed emails are cleared...');
      await loadEmails();
    }, 1000);
    
    // Final refresh after longer delay
    setTimeout(async () => {
      console.log('🔄 Final refresh to confirm email list is updated...');
      await loadEmails();
    }, 3000);
    
    if (wasCancelled) {
      error('Bulk Processing Cancelled', `Processing stopped by user. Processed ${processed} emails, ${errors} failed`);
    } else if (errors === 0) {
      success('Bulk Processing Complete', `Successfully processed ${processed} emails. Processed emails have been cleared from the list.`);
    } else {
      error('Bulk Processing Complete', `Processed ${processed} emails, ${errors} failed`);
    }
  };

  // Cancel bulk processing
  const handleCancelBulkProcessing = () => {
    setBulkCancelled(true);
  };

  // Filter emails based on search and status
  const filteredEmails = emails.filter(email => {
    const matchesSearch = !searchTerm || 
      email.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.from?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });
  
  console.log('🔍 UI: Filtering emails:', {
    totalEmails: emails.length,
    searchTerm,
    filteredCount: filteredEmails.length,
    emailStatuses: emails.reduce((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    emails: emails.map(e => ({ id: e.id, subject: e.subject, from: e.from, status: e.status }))
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
    
    // Extract transaction-relevant information for preview
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    // Look for key trading information patterns
    const relevantInfo = [];
    
    for (const line of lines) {
      // Skip common email headers and footers
      if (line.includes('wealthsimple.com') || 
          line.includes('unsubscribe') || 
          line.includes('privacy') ||
          line.includes('@') ||
          line.includes('http') ||
          line.length < 10) {
        continue;
      }
      
      // Include lines with trading keywords
      if (line.match(/\b(bought|sold|buy|sell|filled|order|shares|stock|symbol|price|total|margin|tfsa|rrsp|portfolio)\b/i) ||
          line.match(/\$[\d,]+\.?\d*/)) {
        relevantInfo.push(line);
      }
      
      // Stop after finding enough relevant lines or hitting character limit
      const preview = relevantInfo.join(' • ');
      if (preview.length > 150 || relevantInfo.length > 3) {
        break;
      }
    }
    
    // Format the preview
    if (relevantInfo.length > 0) {
      const preview = relevantInfo.join(' • ');
      return preview.length > 200 ? preview.substring(0, 197) + '...' : preview;
    }
    
    // Fallback to original truncated content if no trading info found
    return content.substring(0, 200) + (content.length > 200 ? '...' : '');
  };

  const getStatusIcon = () => {
    if (loading) return <RefreshCw size={20} className="animate-spin" />;
    if (pullerStatus.isConnected) return <CheckCircle size={20} />;
    return <AlertCircle size={20} />;
  };

  const getStatusText = () => {
    if (loading) return 'Checking Email Puller Status...';
    
    if (!pullerStatus.configurationActive) {
      return 'Email Puller Not Configured';
    }
    
    switch (pullerStatus.syncStatus) {
      case 'running':
        return 'Email Puller Active';
      case 'idle':
        return 'Email Puller Connected (Idle)';
      case 'error':
        return 'Email Puller Error';
      case 'never_ran':
        return 'Email Puller Not Started';
      default:
        return pullerStatus.isConnected ? 'Email Puller Connected' : 'Email Puller Disconnected';
    }
  };

  const getStatusType = (): 'connected' | 'disconnected' | 'loading' => {
    if (loading) return 'loading';
    
    if (!pullerStatus.configurationActive) {
      return 'disconnected';
    }
    
    switch (pullerStatus.syncStatus) {
      case 'running':
        return 'connected';
      case 'idle':
        return 'connected';
      case 'error':
        return 'disconnected';
      case 'never_ran':
        return 'disconnected';
      default:
        return pullerStatus.isConnected ? 'connected' : 'disconnected';
    }
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
          {/* AI Status Indicator */}
          <div style={{ 
            marginTop: '0.5rem', 
            fontSize: '0.75rem', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            color: aiInitialized ? '#059669' : '#dc2626'
          }}>
            <span style={{ fontSize: '1rem' }}>
              {aiInitialized ? '🤖' : '⚠️'}
            </span>
            AI Parsing: {aiInitialized ? 'Ready' : 'Initializing...'}
            {availableProviders.length > 0 && (
              <span style={{ color: '#6b7280' }}>
                ({availableProviders.join(', ')})
              </span>
            )}
          </div>
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
                Status: {pullerStatus.syncStatus || 'Unknown'}
                {pullerStatus.lastSync && pullerStatus.syncStatus !== 'never_ran' && (
                  <> • Last Sync: {formatDate(pullerStatus.lastSync)} ({pullerStatus.syncStatus})</>
                )}
                {pullerStatus.syncStatus === 'never_ran' && pullerStatus.configurationActive && (
                  <> • Configuration exists but sync has not started</>
                )}
                {pullerStatus.nextScheduledSync && pullerStatus.syncStatus !== 'error' && pullerStatus.syncStatus !== 'never_ran' && (
                  <> • Next sync: {formatDate(pullerStatus.nextScheduledSync)}</>
                )}
                {(pullerStatus.syncStatus === 'never_ran' || !pullerStatus.lastSync) && stats.total > 0 && (
                  <> • Note: {stats.total} emails exist but may be from previous syncs</>
                )}
                {stats.total > 0 && (
                  <> • {stats.total} emails in database</>
                )}
                {pullerStatus.recentActivity && (
                  <> • Activity: {pullerStatus.recentActivity.lastHour}h/{pullerStatus.recentActivity.last24Hours}d/{pullerStatus.recentActivity.lastWeek}w</>
                )}
                {pullerStatus.configuration && (
                  <> • Config: {pullerStatus.configuration.emailAddress} ({pullerStatus.configuration.host}:{pullerStatus.configuration.port})</>
                )}
                {pullerStatus.error && (
                  <> • Error: {pullerStatus.error}</>
                )}
              </StatusDetails>
            </div>
          </StatusInfo>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {/* Manual sync button - always available for debugging */}
            <Button 
              variant="primary" 
              onClick={handleManualSync}
              disabled={manualSyncing}
              style={{ backgroundColor: '#059669', borderColor: '#059669' }}
            >
              <RefreshCw size={16} className={manualSyncing ? 'animate-spin' : ''} />
              Manual Sync
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </div>
        </StatusHeader>
      </StatusCard>

      {/* Email Configuration Panel - Show when there's an error or sync is overdue */}
      {(() => {
        const showPanel = pullerStatus.syncStatus === 'error' || 
          (pullerStatus.lastSync && new Date().getTime() - new Date(pullerStatus.lastSync).getTime() > 30 * 60 * 1000);
        const timeSinceSync = pullerStatus.lastSync ? new Date().getTime() - new Date(pullerStatus.lastSync).getTime() : 0;
        console.log('Email config panel decision:', { 
          showPanel, 
          syncStatus: pullerStatus.syncStatus, 
          lastSync: pullerStatus.lastSync,
          timeSinceSync: timeSinceSync / 1000 / 60, // minutes
          threshold: 30 
        });
        return showPanel;
      })() && (
        <EmailConfigurationPanel onConfigurationUpdated={handleRefresh} />
      )}

      {/* Detailed Configuration Info */}
      {pullerStatus.configuration && (
        <StatusCard $status="connected" style={{ marginBottom: '1rem', background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)' }}>
          <StatusHeader>
            <StatusInfo>
              <StatusIcon $status="connected">
                <CheckCircle size={16} />
              </StatusIcon>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setConfigPanelCollapsed(!configPanelCollapsed)}>
                  <StatusText style={{ fontSize: '0.875rem' }}>Email Configuration Details</StatusText>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    style={{ 
                      minWidth: 'auto', 
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.75rem',
                      background: 'transparent',
                      border: '1px solid #d1d5db'
                    }}
                  >
                    {configPanelCollapsed ? 'Show' : 'Hide'}
                  </Button>
                </div>
                {!configPanelCollapsed && (
                  <StatusDetails style={{ marginTop: '0.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.5rem' }}>
                      <div><strong>Provider:</strong> {pullerStatus.configuration.provider}</div>
                      <div><strong>Email:</strong> {pullerStatus.configuration.emailAddress}</div>
                      <div><strong>Server:</strong> {pullerStatus.configuration.host}:{pullerStatus.configuration.port}</div>
                      <div><strong>Auto Import:</strong> {pullerStatus.configuration.autoImportEnabled ? 'Enabled' : 'Disabled'}</div>
                      {pullerStatus.configuration.lastTested && (
                        <div><strong>Last Sync:</strong> {formatDate(pullerStatus.configuration.lastTested)} ({pullerStatus.configuration.lastSyncStatus})</div>
                      )}
                      {pullerStatus.configuration.syncInterval && (
                        <div><strong>Sync Interval:</strong> {pullerStatus.configuration.syncInterval} minutes</div>
                      )}
                      {pullerStatus.configuration.emailsSynced && (
                        <div><strong>Total Synced:</strong> {pullerStatus.configuration.emailsSynced} emails</div>
                      )}
                      {pullerStatus.configuration.maxEmailsPerSync && (
                        <div><strong>Max Per Sync:</strong> {pullerStatus.configuration.maxEmailsPerSync} emails</div>
                      )}
                    </div>
                  </StatusDetails>
                )}
              </div>
            </StatusInfo>
          </StatusHeader>
        </StatusCard>
      )}

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
        {pullerStatus.recentActivity && (
          <>
            <StatCard>
              <StatValue>{pullerStatus.recentActivity.lastHour}</StatValue>
              <StatLabel>Last Hour</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{pullerStatus.recentActivity.last24Hours}</StatValue>
              <StatLabel>Last 24 Hours</StatLabel>
            </StatCard>
            <StatCard>
              <StatValue>{pullerStatus.recentActivity.lastWeek}</StatValue>
              <StatLabel>Last Week</StatLabel>
            </StatCard>
          </>
        )}
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
            <option value="processed">Processed</option>
          </FilterSelect>
        </div>

        <Button variant="primary" onClick={handleSearch}>
          <Search size={16} />
          Search
        </Button>
      </ControlsRow>

      {/* Bulk Processing Controls */}
      <ControlsRow style={{ justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Button 
            variant="secondary" 
            onClick={handleBulkProcess}
            disabled={bulkProcessing || emails.length === 0}
            style={{ 
              minWidth: '200px',
              background: bulkProcessing ? '#f59e0b' : undefined,
              color: bulkProcessing ? 'white' : undefined
            }}
          >
            {bulkProcessing ? (
              <>
                <RefreshCw size={16} className="animate-spin" />
                Processing {bulkProgress.current}/{bulkProgress.total}
              </>
            ) : (
              <>
                <DollarSign size={16} />
                Process All Emails ({emails.length})
              </>
            )}
          </Button>
          
          {bulkProcessing && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem',
              fontSize: '0.875rem',
              color: '#6b7280'
            }}>
              <div>
                Progress: {bulkProgress.current}/{bulkProgress.total}
              </div>
              <div>
                ✅ {bulkResults.processed} processed
              </div>
              {bulkResults.errors > 0 && (
                <div style={{ color: '#ef4444' }}>
                  ❌ {bulkResults.errors} errors
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleCancelBulkProcessing}
                style={{ 
                  borderColor: '#ef4444', 
                  color: '#ef4444',
                  minWidth: '80px'
                }}
              >
                <X size={14} />
                Cancel
              </Button>
            </div>
          )}
        </div>
        
        {!bulkProcessing && emails.length > 0 && (
          <div style={{ 
            fontSize: '0.875rem', 
            color: '#6b7280',
            fontStyle: 'italic'
          }}>
            This will automatically parse and process all emails (including reprocessing completed ones)
          </div>
        )}
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
        <ModalOverlay onClick={() => { setProcessingEmail(null); setParsingStage('idle'); }}>
          <ModalContent onClick={(e) => e.stopPropagation()} style={{ maxWidth: '1200px', width: '90vw' }}>
            <ModalHeader>
              <ModalTitle>AI Email Transaction Parser</ModalTitle>
              <CloseButton onClick={() => { setProcessingEmail(null); setParsingStage('idle'); }}>
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

            {/* AI Parsing Animation */}
            {parsingStage !== 'idle' && parsingStage !== 'complete' && parsingStage !== 'error' && (
              <ParsingContainer>
                <DetailLabel style={{ textAlign: 'center', fontSize: '1.125rem', fontWeight: '600' }}>🤖 AI Processing Email</DetailLabel>
                
                <ParsingStage 
                  $active={parsingStage === 'analyzing'} 
                  $completed={['extracting', 'validating'].includes(parsingStage)}
                  $error={false}
                >
                  <ParsingIcon $active={parsingStage === 'analyzing'}>🔍</ParsingIcon>
                  <ParsingText>Analyzing email content</ParsingText>
                </ParsingStage>

                <ParsingStage 
                  $active={parsingStage === 'extracting'} 
                  $completed={parsingStage === 'validating'}
                  $error={false}
                >
                  <ParsingIcon $active={parsingStage === 'extracting'}>⚡</ParsingIcon>
                  <ParsingText>Extracting transaction data</ParsingText>
                </ParsingStage>

                <ParsingStage 
                  $active={parsingStage === 'validating'} 
                  $completed={false}
                  $error={false}
                >
                  <ParsingIcon $active={parsingStage === 'validating'}>✅</ParsingIcon>
                  <ParsingText>Validating extracted information</ParsingText>
                </ParsingStage>
              </ParsingContainer>
            )}

            {/* Success State - Side by Side */}
            {parsingStage === 'complete' && parsedData?.aiParsed && (
              <>
                <div style={{ 
                  background: '#dcfce7', 
                  border: '2px solid #16a34a', 
                  borderRadius: '8px', 
                  padding: '1rem', 
                  marginBottom: '1.5rem',
                  textAlign: 'center'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>🎉</span>
                    <DetailLabel style={{ margin: 0, color: '#15803d', fontSize: '1.125rem', fontWeight: '600' }}>
                      Transaction Successfully Extracted!
                    </DetailLabel>
                  </div>
                  {parsedData.confidence && (
                    <div style={{ fontSize: '0.875rem', color: '#15803d', marginTop: '0.5rem' }}>
                      Confidence: {Math.round(parsedData.confidence * 100)}%
                    </div>
                  )}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '2rem',
                  marginTop: '1.5rem'
                }}>
                  {/* Left Panel - AI Extracted Data */}
                  <div style={{
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1.5rem'
                  }}>
                    <DetailLabel style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                      📊 AI Extracted Data
                    </DetailLabel>
                    
                    {parsedData.symbol && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        <span style={{ fontWeight: '500', color: '#6b7280' }}>Symbol</span>
                        <span style={{ fontWeight: '600', color: '#111827' }}>{parsedData.symbol}</span>
                      </div>
                    )}
                    
                    {parsedData.assetType && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        <span style={{ fontWeight: '500', color: '#6b7280' }}>Asset Type</span>
                        <span style={{ fontWeight: '600', color: '#111827' }}>{parsedData.assetType}</span>
                      </div>
                    )}
                    
                    {parsedData.transactionType && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        <span style={{ fontWeight: '500', color: '#6b7280' }}>Transaction Type</span>
                        <span style={{ fontWeight: '600', color: '#111827' }}>{parsedData.transactionType}</span>
                      </div>
                    )}
                    
                    {parsedData.portfolioName && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        <span style={{ fontWeight: '500', color: '#6b7280' }}>Portfolio</span>
                        <span style={{ fontWeight: '600', color: '#111827' }}>{parsedData.portfolioName}</span>
                      </div>
                    )}
                    
                    {parsedData.quantity && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        <span style={{ fontWeight: '500', color: '#6b7280' }}>Quantity</span>
                        <span style={{ fontWeight: '600', color: '#111827' }}>{parsedData.quantity} {parsedData.assetType === 'option' ? 'contracts' : 'shares'}</span>
                      </div>
                    )}
                    
                    {parsedData.price && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        <span style={{ fontWeight: '500', color: '#6b7280' }}>Price</span>
                        <span style={{ fontWeight: '600', color: '#111827' }}>${parsedData.price}</span>
                      </div>
                    )}
                    
                    {parsedData.totalAmount && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        <span style={{ fontWeight: '500', color: '#6b7280' }}>Total Amount</span>
                        <span style={{ fontWeight: '600', color: '#111827' }}>${parsedData.totalAmount}</span>
                      </div>
                    )}
                    
                    {parsedData.fees && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        <span style={{ fontWeight: '500', color: '#6b7280' }}>Fees</span>
                        <span style={{ fontWeight: '600', color: '#111827' }}>${parsedData.fees}</span>
                      </div>
                    )}
                    
                    {parsedData.currency && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: '1px solid #e5e7eb' }}>
                        <span style={{ fontWeight: '500', color: '#6b7280' }}>Currency</span>
                        <span style={{ fontWeight: '600', color: '#111827' }}>{parsedData.currency}</span>
                      </div>
                    )}
                    
                    {parsedData.transactionDate && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0' }}>
                        <span style={{ fontWeight: '500', color: '#6b7280' }}>Date</span>
                        <span style={{ fontWeight: '600', color: '#111827' }}>{parsedData.transactionDate}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Panel - Review & Edit Form */}
                  <div style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '1.5rem'
                  }}>
                    <DetailLabel style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>
                      ✏️ Review & Edit
                    </DetailLabel>
                    
                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        Portfolio *
                      </label>
                      <select
                        value={transactionForm.portfolioId}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, portfolioId: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '0.875rem',
                          background: 'white'
                        }}
                      >
                        <option value="">Select Portfolio</option>
                        {portfolios.map(portfolio => (
                          <option key={portfolio.id} value={portfolio.id}>
                            {portfolio.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                          Symbol *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g., AAPL"
                          value={transactionForm.symbol}
                          onChange={(e) => setTransactionForm(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '0.875rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                          Asset Type *
                        </label>
                        <select
                          value={transactionForm.assetType}
                          onChange={(e) => setTransactionForm(prev => ({ ...prev, assetType: e.target.value as 'stock' | 'option' }))}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            background: 'white'
                          }}
                        >
                          <option value="stock">Stock</option>
                          <option value="option">Option</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                          Transaction Type *
                        </label>
                        <select
                          value={transactionForm.transactionType}
                          onChange={(e) => setTransactionForm(prev => ({ ...prev, transactionType: e.target.value as 'buy' | 'sell' }))}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            background: 'white'
                          }}
                        >
                          <option value="buy">Buy</option>
                          <option value="sell">Sell</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                          Currency
                        </label>
                        <select
                          value={transactionForm.currency}
                          onChange={(e) => setTransactionForm(prev => ({ ...prev, currency: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '0.875rem',
                            background: 'white'
                          }}
                        >
                          <option value="USD">USD</option>
                          <option value="CAD">CAD</option>
                          <option value="EUR">EUR</option>
                          <option value="GBP">GBP</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                          Quantity * {transactionForm.assetType === 'option' && '(contracts)'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder={transactionForm.assetType === 'option' ? '1' : '100'}
                          value={transactionForm.quantity}
                          onChange={(e) => setTransactionForm(prev => ({ ...prev, quantity: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '0.875rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                          Price per {transactionForm.assetType === 'option' ? 'Contract' : 'Share'} *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={transactionForm.price}
                          onChange={(e) => setTransactionForm(prev => ({ ...prev, price: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '0.875rem'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                      <div>
                        <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                          Total Amount
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Auto-calculated"
                          value={transactionForm.totalAmount}
                          onChange={(e) => setTransactionForm(prev => ({ ...prev, totalAmount: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '0.875rem'
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                          Fees
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={transactionForm.fees}
                          onChange={(e) => setTransactionForm(prev => ({ ...prev, fees: e.target.value }))}
                          style={{
                            width: '100%',
                            padding: '0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '0.875rem'
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                      <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                        Date *
                      </label>
                      <input
                        type="date"
                        value={transactionForm.date}
                        onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '0.875rem'
                        }}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Error State */}
            {parsingStage === 'error' && (
              <div style={{ 
                background: '#fee2e2', 
                border: '2px solid #ef4444', 
                borderRadius: '8px', 
                padding: '1.5rem', 
                marginBottom: '1.5rem',
                textAlign: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>❌</span>
                  <DetailLabel style={{ margin: 0, color: '#991b1b', fontSize: '1.125rem', fontWeight: '600' }}>
                    AI Parsing Failed
                  </DetailLabel>
                </div>
                
                {parsingError && (
                  <div style={{ 
                    fontSize: '0.875rem', 
                    color: '#7f1d1d', 
                    background: '#fef2f2', 
                    padding: '0.75rem',
                    borderRadius: '6px',
                    marginBottom: '1rem',
                    fontFamily: 'monospace',
                    textAlign: 'left'
                  }}>
                    <strong>Error:</strong> {parsingError}
                  </div>
                )}
                <div>Manual entry required below.</div>
              </div>
            )}

            {/* Action Buttons */}
            {(parsingStage === 'complete' || parsingStage === 'error') && (
              <FormActions>
                <Button
                  variant="outline"
                  onClick={() => { setProcessingEmail(null); setParsingStage('idle'); }}
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
            )}

          </ModalContent>
        </ModalOverlay>
      )}
    </PageContainer>
  );
};

export default SimpleEmailManagement;
