/**
 * Manual Review Queue Manager Component
 * Task 9.3: Implement manual review queue management
 * Interface for managing emails flagged by duplicate detection system for human review
 */

import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Flag,
  Search,
  Download,
  RefreshCw,
  DollarSign,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  FileText,
  Timer
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { useNotifications } from '../hooks/useNotifications';
import { formatDate } from '../utils/formatting';

interface ReviewItem {
  id: string;
  emailSubject: string;
  fromEmail: string;
  portfolioId: string;
  receivedAt: string;
  flaggedAt: string;
  flagReason: 'potential_duplicate' | 'symbol_ambiguous' | 'amount_mismatch' | 'manual_flagged' | 'ai_confidence_low';
  flagDetails: {
    confidence: number;
    triggerType: 'time_proximity' | 'amount_similarity' | 'symbol_match' | 'manual_review' | 'ai_uncertainty';
    relatedItems?: string[];
    aiNotes?: string;
    context?: Record<string, unknown>;
  };
  originalEmail: {
    subject: string;
    from: string;
    htmlContent: string;
    textContent?: string;
    receivedAt: string;
    messageId: string;
  };
  extractedData: {
    symbol?: string;
    amount?: number;
    transactionType?: 'buy' | 'sell' | 'dividend' | 'split';
    quantity?: number;
    price?: number;
    date?: string;
    account?: string;
  };
  duplicateCandidates: Array<{
    id: string;
    transactionId?: string;
    similarity: number;
    reason: string;
    data: Record<string, unknown>;
  }>;
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'needs_info' | 'escalated';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo?: string;
  reviewerNotes?: string;
  resolution?: {
    action: 'approve' | 'reject' | 'merge' | 'create_new' | 'skip';
    reason: string;
    resolvedBy: string;
    resolvedAt: string;
    finalTransactionId?: string;
  };
  tags: string[];
  estimatedReviewTime: number; // in minutes
  slaDeadline: string;
}

interface ReviewAction {
  type: 'approve' | 'reject' | 'merge' | 'create_new' | 'skip' | 'escalate' | 'request_info';
  notes?: string;
  mergeWithTransactionId?: string;
  escalationReason?: string;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const Title = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
`;

const StatsBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  padding: 1.25rem;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    padding: 1rem;
  }
`;

const StatItem = styled.div`
  text-align: center;
`;

const StatValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-top: 0.25rem;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const FilterBar = styled.div`
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1.25rem;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
  }

  @media (max-width: 768px) {
    padding: 1rem;
    gap: 0.75rem;
  }
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 150px;
  flex: 1;

  @media (max-width: 768px) {
    min-width: 100%;
  }
`;

const FilterLabel = styled.label`
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  color: #111827;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgb(59 130 246 / 0.1);
  }

  [data-theme="dark"] & {
    background: #4b5563;
    border-color: #6b7280;
    color: #f3f4f6;
  }
`;

const SearchInput = styled(Input)`
  min-width: 200px;
  flex: 1;
`;

const ReviewQueue = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const ReviewCard = styled(Card)<{ $priority: string; $slaStatus: string }>`
  padding: 1.5rem;
  border-left: 4px solid ${props => {
    switch (props.$priority) {
      case 'urgent': return '#dc2626';
      case 'high': return '#f59e0b';
      case 'normal': return '#3b82f6';
      case 'low': return '#6b7280';
      default: return '#d1d5db';
    }
  }};
  transition: all 0.2s ease;
  ${props => props.$slaStatus === 'overdue' && `
    background: linear-gradient(135deg, #fef2f2 0%, #ffffff 100%);
    box-shadow: 0 0 0 1px #fecaca;
    
    [data-theme="dark"] & {
      background: linear-gradient(135deg, #7f1d1d 0%, #374151 100%);
      box-shadow: 0 0 0 1px #991b1b;
    }
  `}

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px -5px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05);
  }
`;

const ReviewHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 0.5rem;
  }
`;

const ReviewInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ReviewTitle = styled.h3`
  margin: 0 0 0.25rem 0;
  font-weight: 600;
  color: #111827;
  font-size: 1rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const ReviewMeta = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.5rem;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const StatusBadge = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 500;
  
  ${props => {
    switch (props.$status) {
      case 'pending':
        return `
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        `;
      case 'under_review':
        return `
          background: #dbeafe;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        `;
      case 'needs_info':
        return `
          background: #e0e7ff;
          color: #5b21b6;
          border: 1px solid #c7d2fe;
        `;
      case 'approved':
        return `
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        `;
      case 'rejected':
        return `
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        `;
      case 'escalated':
        return `
          background: #fdf2f8;
          color: #be185d;
          border: 1px solid #f9a8d4;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        `;
    }
  }}

  [data-theme="dark"] & {
    ${props => {
      switch (props.$status) {
        case 'pending':
          return `
            background: #78350f;
            color: #fde68a;
            border-color: #92400e;
          `;
        case 'under_review':
          return `
            background: #1e3a8a;
            color: #bfdbfe;
            border-color: #1e40af;
          `;
        case 'needs_info':
          return `
            background: #4c1d95;
            color: #c7d2fe;
            border-color: #5b21b6;
          `;
        case 'approved':
          return `
            background: #064e3b;
            color: #a7f3d0;
            border-color: #065f46;
          `;
        case 'rejected':
          return `
            background: #7f1d1d;
            color: #fecaca;
            border-color: #991b1b;
          `;
        case 'escalated':
          return `
            background: #831843;
            color: #f9a8d4;
            border-color: #be185d;
          `;
        default:
          return `
            background: #374151;
            color: #9ca3af;
            border-color: #4b5563;
          `;
      }
    }}
  }
`;

const FlagDetails = styled.div`
  background: #fef9e7;
  border: 1px solid #fed7aa;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;

  [data-theme="dark"] & {
    background: #78350f;
    border-color: #92400e;
  }
`;

const FlagTitle = styled.div`
  font-weight: 600;
  color: #d97706;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  [data-theme="dark"] & {
    color: #fde68a;
  }
`;

const ExtractedData = styled.div`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
  }
`;

const DataGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  font-size: 0.875rem;
`;

const DataItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const DataLabel = styled.span`
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const DataValue = styled.span`
  font-weight: 600;
  color: #111827;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const DuplicateCandidates = styled.div`
  margin: 1rem 0;
`;

const DuplicateCard = styled.div`
  background: #f1f5f9;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 0.75rem;
  margin-bottom: 0.5rem;

  [data-theme="dark"] & {
    background: #334155;
    border-color: #475569;
  }
`;

const SimilarityScore = styled.span<{ $score: number }>`
  font-weight: 600;
  color: ${props => {
    if (props.$score >= 0.9) return '#dc2626';
    if (props.$score >= 0.7) return '#f59e0b';
    return '#059669';
  }};
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 1rem;
`;

const TimeInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
  margin-top: 0.5rem;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const SLAIndicator = styled.span<{ $status: string }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
  color: ${props => {
    switch (props.$status) {
      case 'overdue': return '#dc2626';
      case 'urgent': return '#f59e0b';
      case 'normal': return '#059669';
      default: return '#6b7280';
    }
  }};

  [data-theme="dark"] & {
    color: ${props => {
      switch (props.$status) {
        case 'overdue': return '#f87171';
        case 'urgent': return '#fbbf24';
        case 'normal': return '#10b981';
        default: return '#9ca3af';
      }
    }};
  }
`;

const TagsList = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.5rem;
`;

const Tag = styled.span`
  display: inline-block;
  padding: 0.125rem 0.5rem;
  background: #f3f4f6;
  color: #374151;
  border-radius: 4px;
  font-size: 0.75rem;

  [data-theme="dark"] & {
    background: #4b5563;
    color: #d1d5db;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 70vh;
  overflow-y: auto;
`;

const CodeBlock = styled.pre`
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  padding: 1rem;
  font-size: 0.875rem;
  overflow-x: auto;
  white-space: pre-wrap;
  color: #1a202c;

  [data-theme="dark"] & {
    background: #2d3748;
    border-color: #4a5568;
    color: #f7fafc;
  }
`;

interface ManualReviewQueueManagerProps {
  reviewItems?: ReviewItem[];
  loading?: boolean;
  onReviewAction?: (itemId: string, action: ReviewAction) => Promise<void>;
  onViewDetails?: (item: ReviewItem) => void;
  className?: string;
}

const ManualReviewQueueManager: React.FC<ManualReviewQueueManagerProps> = ({
  reviewItems = [],
  loading = false,
  onReviewAction = async () => {},
  onViewDetails = () => {},
  className
}) => {
  const { success, error } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterReason, setFilterReason] = useState<string>('all');
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Mock data for demonstration
  const mockReviewItems: ReviewItem[] = [
    {
      id: 'review-1',
      emailSubject: 'Trade Confirmation - AAPL Purchase',
      fromEmail: 'notifications@wealthsimple.com',
      portfolioId: 'portfolio-1',
      receivedAt: new Date(Date.now() - 300000).toISOString(),
      flaggedAt: new Date(Date.now() - 120000).toISOString(),
      flagReason: 'potential_duplicate',
      flagDetails: {
        confidence: 0.85,
        triggerType: 'time_proximity',
        relatedItems: ['trans-456'],
        aiNotes: 'Found similar transaction within 30 seconds with same symbol and close amount',
        context: {
          timeGap: 25,
          amountDifference: 2.50,
          priceVariation: 0.01
        }
      },
      originalEmail: {
        subject: 'Trade Confirmation - AAPL Purchase',
        from: 'notifications@wealthsimple.com',
        htmlContent: '<html>...</html>',
        receivedAt: new Date(Date.now() - 300000).toISOString(),
        messageId: '<msg-123@wealthsimple.com>'
      },
      extractedData: {
        symbol: 'AAPL',
        amount: 2500.00,
        transactionType: 'buy',
        quantity: 15,
        price: 166.67,
        date: '2025-01-15',
        account: 'RRSP'
      },
      duplicateCandidates: [
        {
          id: 'dup-1',
          transactionId: 'trans-456',
          similarity: 0.95,
          reason: 'Same symbol, similar amount, close timestamp',
          data: {
            symbol: 'AAPL',
            amount: 2497.50,
            timestamp: new Date(Date.now() - 325000).toISOString()
          }
        }
      ],
      status: 'pending',
      priority: 'high',
      tags: ['duplicate-check', 'time-sensitive'],
      estimatedReviewTime: 5,
      slaDeadline: new Date(Date.now() + 1800000).toISOString() // 30 min from now
    },
    {
      id: 'review-2',
      emailSubject: 'Trade Confirmation - UNKNOWN_SYMBOL Purchase',
      fromEmail: 'notifications@wealthsimple.com',
      portfolioId: 'portfolio-1',
      receivedAt: new Date(Date.now() - 7200000).toISOString(),
      flaggedAt: new Date(Date.now() - 6900000).toISOString(),
      flagReason: 'symbol_ambiguous',
      flagDetails: {
        confidence: 0.45,
        triggerType: 'ai_uncertainty',
        aiNotes: 'Could not identify symbol with high confidence. Multiple possible matches found.',
        context: {
          possibleSymbols: ['UNKNOWN', 'UNK', 'UNKWN'],
          maxConfidence: 0.45
        }
      },
      originalEmail: {
        subject: 'Trade Confirmation - UNKNOWN_SYMBOL Purchase',
        from: 'notifications@wealthsimple.com',
        htmlContent: '<html>...</html>',
        receivedAt: new Date(Date.now() - 7200000).toISOString(),
        messageId: '<msg-124@wealthsimple.com>'
      },
      extractedData: {
        symbol: 'UNKNOWN_SYMBOL',
        amount: 1000.00,
        transactionType: 'buy',
        date: '2025-01-15',
        account: 'TFSA'
      },
      duplicateCandidates: [],
      status: 'under_review',
      priority: 'normal',
      assignedTo: 'reviewer@investra.com',
      tags: ['symbol-lookup', 'ai-review'],
      estimatedReviewTime: 10,
      slaDeadline: new Date(Date.now() - 3600000).toISOString() // 1 hour overdue
    }
  ];

  const items = reviewItems.length > 0 ? reviewItems : mockReviewItems;

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !searchTerm || 
        item.emailSubject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.extractedData.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.flagReason.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || item.priority === filterPriority;
      const matchesReason = filterReason === 'all' || item.flagReason === filterReason;

      return matchesSearch && matchesStatus && matchesPriority && matchesReason;
    });
  }, [items, searchTerm, filterStatus, filterPriority, filterReason]);

  const stats = useMemo(() => {
    const pending = items.filter(i => i.status === 'pending').length;
    const underReview = items.filter(i => i.status === 'under_review').length;
    const overdue = items.filter(i => new Date(i.slaDeadline) < new Date()).length;
    const avgReviewTime = items.reduce((acc, i) => acc + i.estimatedReviewTime, 0) / items.length || 0;

    return { pending, underReview, overdue, avgReviewTime };
  }, [items]);

  const handleReviewAction = async (itemId: string, action: ReviewAction) => {
    setActionLoading(itemId);
    try {
      await onReviewAction(itemId, action);
      success('Action Completed', `Review ${action.type} action completed successfully`);
    } catch (err) {
      error('Action Failed', `Failed to ${action.type} review: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getFlagIcon = (reason: string) => {
    switch (reason) {
      case 'potential_duplicate': return <AlertTriangle size={16} />;
      case 'symbol_ambiguous': return <Search size={16} />;
      case 'amount_mismatch': return <DollarSign size={16} />;
      case 'ai_confidence_low': return <AlertCircle size={16} />;
      default: return <Flag size={16} />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle size={14} />;
      case 'rejected': return <X size={14} />;
      case 'under_review': return <Eye size={14} />;
      case 'needs_info': return <MessageSquare size={14} />;
      case 'escalated': return <TrendingUp size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const getSLAStatus = (deadline: string): string => {
    const now = new Date();
    const slaTime = new Date(deadline);
    const diffMs = slaTime.getTime() - now.getTime();
    
    if (diffMs < 0) return 'overdue';
    if (diffMs < 900000) return 'urgent'; // 15 minutes
    return 'normal';
  };

  const formatTimeRemaining = (deadline: string): string => {
    const now = new Date();
    const slaTime = new Date(deadline);
    const diffMs = slaTime.getTime() - now.getTime();
    
    if (diffMs < 0) {
      const overdue = Math.abs(diffMs);
      const hours = Math.floor(overdue / (1000 * 60 * 60));
      const minutes = Math.floor((overdue % (1000 * 60 * 60)) / (1000 * 60));
      return `${hours > 0 ? `${hours}h ` : ''}${minutes}m overdue`;
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours > 0 ? `${hours}h ` : ''}${minutes}m remaining`;
  };

  const viewDetails = (item: ReviewItem) => {
    setSelectedItem(item);
    setShowDetailsModal(true);
    onViewDetails(item);
  };

  return (
    <>
      <Container className={className}>
        <Header>
          <Title>
            <Users size={24} />
            Manual Review Queue ({filteredItems.length})
          </Title>
          <HeaderActions>
            <Button
              variant="outline"
              onClick={() => {}}
              disabled={loading}
            >
              <Download size={16} />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={() => {}}
              disabled={loading}
            >
              <RefreshCw size={16} />
              Refresh
            </Button>
          </HeaderActions>
        </Header>

        <StatsBar>
          <StatItem>
            <StatValue>{stats.pending}</StatValue>
            <StatLabel>Pending Review</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{stats.underReview}</StatValue>
            <StatLabel>Under Review</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{stats.overdue}</StatValue>
            <StatLabel>Overdue</StatLabel>
          </StatItem>
          <StatItem>
            <StatValue>{stats.avgReviewTime.toFixed(1)}m</StatValue>
            <StatLabel>Avg Review Time</StatLabel>
          </StatItem>
        </StatsBar>

        <FilterBar>
          <FilterGroup>
            <FilterLabel>Search</FilterLabel>
            <SearchInput
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by subject, symbol..."
            />
          </FilterGroup>

          <FilterGroup>
            <FilterLabel>Status</FilterLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="under_review">Under Review</option>
              <option value="needs_info">Needs Info</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="escalated">Escalated</option>
            </Select>
          </FilterGroup>

          <FilterGroup>
            <FilterLabel>Priority</FilterLabel>
            <Select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </Select>
          </FilterGroup>

          <FilterGroup>
            <FilterLabel>Flag Reason</FilterLabel>
            <Select
              value={filterReason}
              onChange={(e) => setFilterReason(e.target.value)}
            >
              <option value="all">All Reasons</option>
              <option value="potential_duplicate">Potential Duplicate</option>
              <option value="symbol_ambiguous">Symbol Ambiguous</option>
              <option value="amount_mismatch">Amount Mismatch</option>
              <option value="ai_confidence_low">AI Confidence Low</option>
              <option value="manual_flagged">Manual Flagged</option>
            </Select>
          </FilterGroup>
        </FilterBar>

        <ReviewQueue>
          {filteredItems.length === 0 ? (
            <EmptyState>
              {items.length === 0 
                ? "No items in review queue. All emails are processing automatically!" 
                : "No items match your current filters."}
            </EmptyState>
          ) : (
            filteredItems.map((item) => {
              const slaStatus = getSLAStatus(item.slaDeadline);
              return (
                <ReviewCard key={item.id} $priority={item.priority} $slaStatus={slaStatus}>
                  <ReviewHeader>
                    <ReviewInfo>
                      <ReviewTitle>{item.emailSubject}</ReviewTitle>
                      <ReviewMeta>
                        <span>From: {item.fromEmail}</span>
                        <span>•</span>
                        <span>Flagged: {formatDate(item.flaggedAt)}</span>
                        <span>•</span>
                        <span>Portfolio: {item.portfolioId}</span>
                        {item.assignedTo && (
                          <>
                            <span>•</span>
                            <span>Assigned: {item.assignedTo}</span>
                          </>
                        )}
                      </ReviewMeta>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <StatusBadge $status={item.status}>
                          {getStatusIcon(item.status)}
                          {item.status.replace('_', ' ').toUpperCase()}
                        </StatusBadge>
                        <SLAIndicator $status={slaStatus}>
                          <Timer size={12} />
                          {formatTimeRemaining(item.slaDeadline)}
                        </SLAIndicator>
                      </div>
                    </ReviewInfo>
                  </ReviewHeader>

                  <FlagDetails>
                    <FlagTitle>
                      {getFlagIcon(item.flagReason)}
                      {item.flagReason.replace('_', ' ').toUpperCase()}
                      <span style={{ marginLeft: 'auto', fontSize: '0.75rem' }}>
                        Confidence: {(item.flagDetails.confidence * 100).toFixed(1)}%
                      </span>
                    </FlagTitle>
                    {item.flagDetails.aiNotes && (
                      <div style={{ fontSize: '0.875rem', color: '#92400e' }}>
                        {item.flagDetails.aiNotes}
                      </div>
                    )}
                  </FlagDetails>

                  <ExtractedData>
                    <div style={{ fontWeight: '600', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FileText size={16} />
                      Extracted Transaction Data
                    </div>
                    <DataGrid>
                      {item.extractedData.symbol && (
                        <DataItem>
                          <DataLabel>Symbol</DataLabel>
                          <DataValue>{item.extractedData.symbol}</DataValue>
                        </DataItem>
                      )}
                      {item.extractedData.amount && (
                        <DataItem>
                          <DataLabel>Amount</DataLabel>
                          <DataValue>${item.extractedData.amount.toFixed(2)}</DataValue>
                        </DataItem>
                      )}
                      {item.extractedData.quantity && (
                        <DataItem>
                          <DataLabel>Quantity</DataLabel>
                          <DataValue>{item.extractedData.quantity}</DataValue>
                        </DataItem>
                      )}
                      {item.extractedData.price && (
                        <DataItem>
                          <DataLabel>Price</DataLabel>
                          <DataValue>${item.extractedData.price.toFixed(2)}</DataValue>
                        </DataItem>
                      )}
                      {item.extractedData.transactionType && (
                        <DataItem>
                          <DataLabel>Type</DataLabel>
                          <DataValue>{item.extractedData.transactionType.toUpperCase()}</DataValue>
                        </DataItem>
                      )}
                      {item.extractedData.account && (
                        <DataItem>
                          <DataLabel>Account</DataLabel>
                          <DataValue>{item.extractedData.account}</DataValue>
                        </DataItem>
                      )}
                    </DataGrid>
                  </ExtractedData>

                  {item.duplicateCandidates.length > 0 && (
                    <DuplicateCandidates>
                      <div style={{ fontWeight: '600', marginBottom: '0.5rem', color: '#dc2626' }}>
                        Potential Duplicates ({item.duplicateCandidates.length})
                      </div>
                      {item.duplicateCandidates.map((candidate, index) => (
                        <DuplicateCard key={index}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                            <span style={{ fontWeight: '500' }}>Transaction {candidate.transactionId || candidate.id}</span>
                            <SimilarityScore $score={candidate.similarity}>
                              {(candidate.similarity * 100).toFixed(1)}% match
                            </SimilarityScore>
                          </div>
                          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>{candidate.reason}</div>
                        </DuplicateCard>
                      ))}
                    </DuplicateCandidates>
                  )}

                  <TimeInfo>
                    <Clock size={14} />
                    Est. review time: {item.estimatedReviewTime} minutes
                    <span>•</span>
                    <span>Flagged: {formatDate(item.flaggedAt)}</span>
                  </TimeInfo>

                  {item.tags.length > 0 && (
                    <TagsList>
                      {item.tags.map((tag, index) => (
                        <Tag key={index}>{tag}</Tag>
                      ))}
                    </TagsList>
                  )}

                  <ActionButtons>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewDetails(item)}
                    >
                      <Eye size={14} />
                      View Details
                    </Button>
                    
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleReviewAction(item.id, { type: 'approve', notes: 'Approved for processing' })}
                      disabled={actionLoading === item.id}
                    >
                      <ThumbsUp size={14} />
                      Approve
                    </Button>
                    
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleReviewAction(item.id, { type: 'reject', notes: 'Rejected - duplicate/invalid' })}
                      disabled={actionLoading === item.id}
                    >
                      <ThumbsDown size={14} />
                      Reject
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReviewAction(item.id, { type: 'request_info', notes: 'Additional information needed' })}
                      disabled={actionLoading === item.id}
                    >
                      <MessageSquare size={14} />
                      Need Info
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReviewAction(item.id, { type: 'escalate', escalationReason: 'Complex case requiring senior review' })}
                      disabled={actionLoading === item.id}
                    >
                      <TrendingUp size={14} />
                      Escalate
                    </Button>
                  </ActionButtons>
                </ReviewCard>
              );
            })
          )}
        </ReviewQueue>
      </Container>

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Review Item Details"
        size="lg"
      >
        {selectedItem && (
          <ModalContent>
            <div>
              <h3>Email Information</h3>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Subject:</strong> {selectedItem.originalEmail.subject}<br />
                <strong>From:</strong> {selectedItem.originalEmail.from}<br />
                <strong>Message ID:</strong> {selectedItem.originalEmail.messageId}<br />
                <strong>Received:</strong> {formatDate(selectedItem.originalEmail.receivedAt)}
              </div>
            </div>

            <div>
              <h3>Flag Details</h3>
              <FlagDetails>
                <FlagTitle>
                  {getFlagIcon(selectedItem.flagReason)}
                  {selectedItem.flagReason.replace('_', ' ').toUpperCase()}
                </FlagTitle>
                <div><strong>Confidence:</strong> {(selectedItem.flagDetails.confidence * 100).toFixed(1)}%</div>
                <div><strong>Trigger:</strong> {selectedItem.flagDetails.triggerType.replace('_', ' ')}</div>
                {selectedItem.flagDetails.aiNotes && (
                  <div><strong>AI Notes:</strong> {selectedItem.flagDetails.aiNotes}</div>
                )}
              </FlagDetails>
              
              {selectedItem.flagDetails.context && (
                <div>
                  <strong>Context:</strong>
                  <CodeBlock>{JSON.stringify(selectedItem.flagDetails.context, null, 2)}</CodeBlock>
                </div>
              )}
            </div>

            <div>
              <h3>Extracted Data</h3>
              <ExtractedData>
                <DataGrid>
                  {Object.entries(selectedItem.extractedData).map(([key, value]) => (
                    <DataItem key={key}>
                      <DataLabel>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</DataLabel>
                      <DataValue>{typeof value === 'number' && (key.includes('amount') || key.includes('price')) ? `$${value.toFixed(2)}` : String(value)}</DataValue>
                    </DataItem>
                  ))}
                </DataGrid>
              </ExtractedData>
            </div>

            {selectedItem.duplicateCandidates.length > 0 && (
              <div>
                <h3>Duplicate Candidates</h3>
                {selectedItem.duplicateCandidates.map((candidate, index) => (
                  <DuplicateCard key={index}>
                    <div><strong>Transaction:</strong> {candidate.transactionId || candidate.id}</div>
                    <div><strong>Similarity:</strong> <SimilarityScore $score={candidate.similarity}>{(candidate.similarity * 100).toFixed(1)}%</SimilarityScore></div>
                    <div><strong>Reason:</strong> {candidate.reason}</div>
                    <div><strong>Data:</strong></div>
                    <CodeBlock>{JSON.stringify(candidate.data, null, 2)}</CodeBlock>
                  </DuplicateCard>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Button
                variant="outline"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowDetailsModal(false);
                  if (selectedItem) {
                    handleReviewAction(selectedItem.id, { type: 'approve' });
                  }
                }}
              >
                <CheckCircle size={16} />
                Approve
              </Button>
            </div>
          </ModalContent>
        )}
      </Modal>
    </>
  );
};

export default ManualReviewQueueManager;