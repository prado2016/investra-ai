/**
 * Email Process Queue Component
 * Manual review interface for emails from the IMAP inbox
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
  Search,
  Filter,
  Eye,
  FileText
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useNotifications } from '../../hooks/useNotifications';

const QueueContainer = styled.div`
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
  gap: 0.75rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
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
  font-size: 1.25rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.25rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const StatLabel = styled.div`
  font-size: 0.75rem;
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
`;

const SearchInput = styled.input`
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  min-width: 250px;
  
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
    border-color: ${props => {
      switch (props.$priority) {
        case 'pending': return '#f59e0b';
        case 'processing': return '#3b82f6';
        case 'error': return '#ef4444';
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

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
`;

const StatusBadge = styled.span<{ $status: 'pending' | 'processing' | 'error' }>`
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

// Types
interface EmailItem {
  id: string;
  message_id: string;
  subject: string;
  from_email: string;
  from_name?: string;
  received_at: string;
  status: 'pending' | 'processing' | 'error';
  text_content?: string;
  html_content?: string;
  email_size?: number;
  error_message?: string;
}

interface EmailProcessQueueProps {
  className?: string;
}

const EmailProcessQueue: React.FC<EmailProcessQueueProps> = ({ className }) => {
  const { success, error } = useNotifications();
  
  // State management
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'error'>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Load emails on mount
  useEffect(() => {
    loadEmails();
  }, []);

  const loadEmails = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/imap/inbox');
      if (response.ok) {
        const result = await response.json();
        setEmails(result.data || []);
      } else {
        throw new Error('Failed to load emails');
      }
    } catch (err) {
      console.error('Failed to load emails:', err);
      error('Load Error', 'Failed to load emails from inbox');
      setEmails([]); // Fallback to empty array
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEmails();
    setRefreshing(false);
  };

  const approveEmail = async (emailId: string) => {
    try {
      const response = await fetch('/api/imap/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailId })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Remove email from list (it's been moved to processed)
        setEmails(prev => prev.filter(email => email.id !== emailId));
        
        const message = result.transactionId 
          ? `Transaction created: ${result.transactionId}`
          : 'Email approved and processed';
        success('Email Approved', message);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Approval failed');
      }
    } catch (err) {
      console.error('Failed to approve email:', err);
      error('Approval Error', err instanceof Error ? err.message : 'Failed to approve email');
    }
  };

  const rejectEmail = async (emailId: string) => {
    try {
      const response = await fetch('/api/imap/reject', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailId })
      });

      if (response.ok) {
        // Remove email from list (it's been moved to processed)
        setEmails(prev => prev.filter(email => email.id !== emailId));
        success('Email Rejected', 'Email has been marked as rejected');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Rejection failed');
      }
    } catch (err) {
      console.error('Failed to reject email:', err);
      error('Rejection Error', err instanceof Error ? err.message : 'Failed to reject email');
    }
  };

  const deleteEmail = async (emailId: string) => {
    if (!confirm('Are you sure you want to permanently delete this email?')) {
      return;
    }

    try {
      const response = await fetch(`/api/imap/inbox/${emailId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setEmails(prev => prev.filter(email => email.id !== emailId));
        success('Email Deleted', 'Email has been permanently deleted');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Deletion failed');
      }
    } catch (err) {
      console.error('Failed to delete email:', err);
      error('Delete Error', err instanceof Error ? err.message : 'Failed to delete email');
    }
  };

  // Filter emails based on search and status
  const filteredEmails = emails.filter(email => {
    const matchesSearch = email.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         email.from_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (email.from_name && email.from_name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || email.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const stats = {
    total: emails.length,
    pending: emails.filter(e => e.status === 'pending').length,
    processing: emails.filter(e => e.status === 'processing').length,
    error: emails.filter(e => e.status === 'error').length
  };

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

  return (
    <QueueContainer className={className}>
      <Header>
        <Title>
          <Eye size={24} />
          Email Process Queue
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
          <StatValue>{stats.processing}</StatValue>
          <StatLabel>Processing</StatLabel>
        </StatCard>
        <StatCard>
          <StatValue>{stats.error}</StatValue>
          <StatLabel>Errors</StatLabel>
        </StatCard>
      </StatsRow>

      <ControlsRow>
        <div style={{ position: 'relative' }}>
          <Search size={16} style={{ 
            position: 'absolute', 
            left: '0.75rem', 
            top: '50%', 
            transform: 'translateY(-50%)',
            color: '#6b7280'
          }} />
          <SearchInput
            type="text"
            placeholder="Search emails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
      </ControlsRow>

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
              {emails.length === 0 ? 'No emails in queue' : 'No emails match your filters'}
            </div>
            <div style={{ fontSize: '0.875rem' }}>
              {emails.length === 0 
                ? 'Use "Start Email Pull" to import emails from Gmail'
                : 'Try adjusting your search or filter criteria'
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
                  {email.status === 'error' && <XCircle size={12} />}
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

              {email.status === 'pending' && (
                <ActionButtons>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => approveEmail(email.id)}
                  >
                    <CheckCircle size={14} />
                    Approve & Process
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => rejectEmail(email.id)}
                  >
                    <XCircle size={14} />
                    Reject
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteEmail(email.id)}
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
    </QueueContainer>
  );
};

export default EmailProcessQueue;