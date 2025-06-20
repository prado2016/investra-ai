/**
 * Manual Email Review Component
 * Replace automation with manual email processing workflow
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Mail, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  RefreshCw,
  Clock,
  User,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { useNotifications } from '../hooks/useNotifications';
import { useEmailProcessing } from '../hooks/useEmailProcessing';
import { manualEmailReviewService, type EmailReviewItem } from '../services/manualEmailReviewService';

const ReviewContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const StatCard = styled(Card)`
  padding: 1rem;
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
  margin-bottom: 0.25rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #6b7280;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const ControlsRow = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const SearchInput = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  min-width: 200px;
  
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
  padding: 0.5rem 0.75rem;
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

const EmailCard = styled(Card)<{ $status: 'pending' | 'processed' | 'rejected' }>`
  padding: 1.5rem;
  border-left: 4px solid ${props => {
    switch (props.$status) {
      case 'pending': return '#f59e0b';
      case 'processed': return '#10b981';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  }};
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  [data-theme="dark"] & {
    background: #374151;
    border-color: ${props => {
      switch (props.$status) {
        case 'pending': return '#f59e0b';
        case 'processed': return '#10b981';
        case 'rejected': return '#ef4444';
        default: return '#6b7280';
      }
    }};
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

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const StatusBadge = styled.span<{ $status: 'pending' | 'processed' | 'rejected' }>`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
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
      case 'processed':
        return `
          background: #d1fae5;
          color: #065f46;
        `;
      case 'rejected':
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
        case 'processed':
          return `
            background: #065f46;
            color: #d1fae5;
          `;
        case 'rejected':
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
  padding: 3rem;
  color: #6b7280;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

// Use the EmailReviewItem type from the service
type EmailItem = EmailReviewItem;

const ManualEmailReview: React.FC = () => {
  const { success, error } = useNotifications();
  
  // State management
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processed' | 'rejected'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Load real email data from enhanced server
  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const result = await manualEmailReviewService.getEmailsForReview();
      
      if (result.success && result.data) {
        setEmails(result.data);
      } else {
        throw new Error(result.error || 'Failed to load emails');
      }
    } catch (err) {
      console.error('Failed to load emails:', err);
      error('Load Error', err instanceof Error ? err.message : 'Failed to load emails');
      
      // Fallback to empty array instead of mock data
      setEmails([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEmails();
    setRefreshing(false);
  };

  const handleProcessEmail = async (emailId: string) => {
    try {
      const result = await manualEmailReviewService.processEmail(emailId);
      
      if (result.success) {
        // Update the email status locally
        setEmails(prev => prev.map(email => 
          email.id === emailId 
            ? { ...email, status: 'processed' }
            : email
        ));
        
        const message = result.transactionId 
          ? `Transaction ${result.transactionId} created successfully`
          : 'Transaction data has been imported successfully';
        success('Email Processed', message);
      } else {
        throw new Error(result.error || 'Processing failed');
      }
    } catch (err) {
      console.error('Failed to process email:', err);
      error('Processing Error', err instanceof Error ? err.message : 'Failed to process email');
    }
  };

  const handleRejectEmail = async (emailId: string) => {
    try {
      const result = await manualEmailReviewService.rejectEmail(emailId);
      
      if (result.success) {
        setEmails(prev => prev.map(email => 
          email.id === emailId 
            ? { ...email, status: 'rejected' }
            : email
        ));
        success('Email Rejected', 'Email has been marked as rejected');
      } else {
        throw new Error(result.error || 'Rejection failed');
      }
    } catch (err) {
      console.error('Failed to reject email:', err);
      error('Reject Error', err instanceof Error ? err.message : 'Failed to reject email');
    }
  };

  const handleDeleteEmail = async (emailId: string) => {
    try {
      const result = await manualEmailReviewService.deleteEmail(emailId);
      
      if (result.success) {
        setEmails(prev => prev.filter(email => email.id !== emailId));
        success('Email Deleted', 'Email has been permanently deleted');
      } else {
        throw new Error(result.error || 'Deletion failed');
      }
    } catch (err) {
      console.error('Failed to delete email:', err);
      error('Delete Error', err instanceof Error ? err.message : 'Failed to delete email');
    }
  };

  // Filter emails based on search and status
  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.from.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || email.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: emails.length,
    pending: emails.filter(e => e.status === 'pending').length,
    processed: emails.filter(e => e.status === 'processed').length,
    rejected: emails.filter(e => e.status === 'rejected').length
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ReviewContainer>
      <Header>
        <Title>
          <Mail size={24} />
          Manual Email Review
        </Title>
        <Button 
          variant="outline" 
          onClick={handleRefresh}
          disabled={refreshing}
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </Header>

      <StatsRow>
        <StatCard>
          <StatValue>{stats.total}</StatValue>
          <StatLabel>Total Emails</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.pending}</StatValue>
          <StatLabel>Pending Review</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.processed}</StatValue>
          <StatLabel>Processed</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.rejected}</StatValue>
          <StatLabel>Rejected</StatLabel>
        </StatCard>
      </StatsRow>

      <ControlsRow>
        <SearchInput
          type="text"
          placeholder="Search emails..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <FilterSelect
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="processed">Processed</option>
          <option value="rejected">Rejected</option>
        </FilterSelect>
      </ControlsRow>

      <EmailList>
        {loading ? (
          <EmptyState>
            <RefreshCw size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
            Loading emails...
          </EmptyState>
        ) : filteredEmails.length === 0 ? (
          <EmptyState>
            <Mail size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
            <div>No emails found</div>
            {searchTerm && <div style={{ marginTop: '0.5rem' }}>Try adjusting your search or filter</div>}
          </EmptyState>
        ) : (
          filteredEmails.map(email => (
            <EmailCard key={email.id} $status={email.status}>
              <EmailHeader>
                <EmailMeta>
                  <EmailSubject>{email.subject}</EmailSubject>
                  <EmailInfo>
                    <EmailInfoItem>
                      <User size={14} />
                      {email.from}
                    </EmailInfoItem>
                    <EmailInfoItem>
                      <Calendar size={14} />
                      {formatDate(email.received_at)}
                    </EmailInfoItem>
                    {email.estimated_transactions > 0 && (
                      <EmailInfoItem>
                        <ArrowRight size={14} />
                        {email.estimated_transactions} transaction{email.estimated_transactions !== 1 ? 's' : ''}
                      </EmailInfoItem>
                    )}
                  </EmailInfo>
                </EmailMeta>
                <StatusBadge $status={email.status}>
                  {email.status === 'pending' && <Clock size={12} />}
                  {email.status === 'processed' && <CheckCircle size={12} />}
                  {email.status === 'rejected' && <XCircle size={12} />}
                  {email.status.charAt(0).toUpperCase() + email.status.slice(1)}
                </StatusBadge>
              </EmailHeader>

              <div style={{ marginBottom: '1rem', color: '#6b7280', fontSize: '0.875rem' }}>
                {email.preview}
              </div>

              {email.status === 'pending' && (
                <ActionButtons>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleProcessEmail(email.id)}
                  >
                    <CheckCircle size={14} />
                    Process Now
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRejectEmail(email.id)}
                  >
                    <XCircle size={14} />
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteEmail(email.id)}
                  >
                    <Trash2 size={14} />
                    Delete
                  </Button>
                </ActionButtons>
              )}
            </EmailCard>
          ))
        )}
      </EmailList>
    </ReviewContainer>
  );
};

export default ManualEmailReview;