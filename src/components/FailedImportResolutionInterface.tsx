/**
 * Failed Import Resolution Interface Component
 * Task 9.2: Build failed import resolution interface
 * Interface for managing and resolving failed email imports with detailed error analysis
 */

import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  AlertTriangle,
  RefreshCw,
  Eye,
  Edit3,
  Trash2,
  CheckCircle,
  X,
  Search,
  Download,
  Clock,
  AlertCircle,
  Play,
  RotateCcw,
  FileText,
  Bug
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { useNotifications } from '../hooks/useNotifications';
import { formatDate } from '../utils/formatting';

interface FailedImport {
  id: string;
  emailSubject: string;
  fromEmail: string;
  portfolioId: string;
  failedAt: string;
  retryCount: number;
  maxRetries: number;
  errorType: 'parsing' | 'duplicate_check' | 'symbol_processing' | 'transaction_creation' | 'network' | 'validation';
  errorCode: string;
  errorMessage: string;
  errorDetails: {
    stage: string;
    rawError: string;
    stackTrace?: string;
    context?: Record<string, unknown>;
  };
  originalEmail: {
    subject: string;
    from: string;
    htmlContent: string;
    textContent?: string;
    receivedAt: string;
  };
  partialData?: {
    parsedSymbol?: string;
    parsedAmount?: number;
    parsedDate?: string;
    identifiedAsset?: {
      symbol: string;
      name: string;
      type: string;
    };
  };
  resolutionAttempts: Array<{
    id: string;
    attemptedAt: string;
    method: 'retry' | 'manual_fix' | 'skip' | 'override';
    result: 'success' | 'failed' | 'pending';
    notes?: string;
    modifiedBy?: string;
  }>;
  tags: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  status: 'new' | 'investigating' | 'in_progress' | 'resolved' | 'skipped';
}

interface ResolutionAction {
  type: 'retry' | 'manual_fix' | 'skip' | 'delete' | 'override';
  data?: Record<string, unknown>;
  notes?: string;
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

const FailedImportsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const FailedImportCard = styled(Card)<{ $priority: string }>`
  padding: 1.5rem;
  border-left: 4px solid ${props => {
    switch (props.$priority) {
      case 'critical': return '#dc2626';
      case 'high': return '#f59e0b';
      case 'medium': return '#3b82f6';
      case 'low': return '#6b7280';
      default: return '#d1d5db';
    }
  }};
  transition: all 0.2s ease;

  &:hover {
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06);
  }
`;

const ImportHeader = styled.div`
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

const ImportInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ImportTitle = styled.h3`
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

const ImportMeta = styled.div`
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
      case 'new':
        return `
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        `;
      case 'investigating':
        return `
          background: #dbeafe;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        `;
      case 'in_progress':
        return `
          background: #e0e7ff;
          color: #5b21b6;
          border: 1px solid #c7d2fe;
        `;
      case 'resolved':
        return `
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        `;
      case 'skipped':
        return `
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        `;
      default:
        return `
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        `;
    }
  }}

  [data-theme="dark"] & {
    ${props => {
      switch (props.$status) {
        case 'new':
          return `
            background: #78350f;
            color: #fde68a;
            border-color: #92400e;
          `;
        case 'investigating':
          return `
            background: #1e3a8a;
            color: #bfdbfe;
            border-color: #1e40af;
          `;
        case 'in_progress':
          return `
            background: #4c1d95;
            color: #c7d2fe;
            border-color: #5b21b6;
          `;
        case 'resolved':
          return `
            background: #064e3b;
            color: #a7f3d0;
            border-color: #065f46;
          `;
        case 'skipped':
          return `
            background: #374151;
            color: #9ca3af;
            border-color: #4b5563;
          `;
        default:
          return `
            background: #7f1d1d;
            color: #fecaca;
            border-color: #991b1b;
          `;
      }
    }}
  }
`;

const ErrorDetails = styled.div`
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;

  [data-theme="dark"] & {
    background: #7f1d1d;
    border-color: #991b1b;
  }
`;

const ErrorTitle = styled.div`
  font-weight: 600;
  color: #dc2626;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  [data-theme="dark"] & {
    color: #fecaca;
  }
`;

const ErrorMessage = styled.div`
  color: #991b1b;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;

  [data-theme="dark"] & {
    color: #fca5a5;
  }
`;

const ErrorCode = styled.code`
  background: #fee2e2;
  color: #7f1d1d;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;

  [data-theme="dark"] & {
    background: #991b1b;
    color: #fecaca;
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 1rem;
`;

const RetryInfo = styled.div`
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

interface FailedImportResolutionInterfaceProps {
  failedImports?: FailedImport[];
  loading?: boolean;
  onResolveImport?: (importId: string, action: ResolutionAction) => Promise<void>;
  onViewDetails?: (importItem: FailedImport) => void;
  className?: string;
}

const FailedImportResolutionInterface: React.FC<FailedImportResolutionInterfaceProps> = ({
  failedImports = [],
  loading = false,
  onResolveImport = async () => {},
  onViewDetails = () => {},
  className
}) => {
  const { success, error } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterErrorType, setFilterErrorType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [selectedImport, setSelectedImport] = useState<FailedImport | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Mock data for demonstration
  const mockFailedImports: FailedImport[] = [
    {
      id: 'failed-1',
      emailSubject: 'Trade Confirmation - INVALID_SYMBOL Purchase',
      fromEmail: 'notifications@wealthsimple.com',
      portfolioId: 'portfolio-1',
      failedAt: new Date(Date.now() - 3600000).toISOString(),
      retryCount: 2,
      maxRetries: 3,
      errorType: 'symbol_processing',
      errorCode: 'SYMBOL_NOT_FOUND',
      errorMessage: 'Unable to identify symbol "INVALID_SYMBOL" in Yahoo Finance or alternative data sources',
      errorDetails: {
        stage: 'Symbol Processing',
        rawError: 'SymbolLookupError: Symbol INVALID_SYMBOL not found in any data provider',
        context: {
          originalSymbol: 'INVALID_SYMBOL',
          searchAttempts: 3,
          dataSources: ['yahoo', 'polygon', 'alphavantage']
        }
      },
      originalEmail: {
        subject: 'Trade Confirmation - INVALID_SYMBOL Purchase',
        from: 'notifications@wealthsimple.com',
        htmlContent: '<html>...</html>',
        receivedAt: new Date(Date.now() - 3700000).toISOString()
      },
      partialData: {
        parsedSymbol: 'INVALID_SYMBOL',
        parsedAmount: 1500.00,
        parsedDate: '2025-01-15'
      },
      resolutionAttempts: [
        {
          id: 'attempt-1',
          attemptedAt: new Date(Date.now() - 1800000).toISOString(),
          method: 'retry',
          result: 'failed',
          notes: 'Automatic retry failed with same error'
        }
      ],
      tags: ['symbol-lookup', 'manual-review-needed'],
      priority: 'high',
      status: 'investigating'
    },
    {
      id: 'failed-2',
      emailSubject: 'Trade Confirmation - Network Error',
      fromEmail: 'notifications@wealthsimple.com',
      portfolioId: 'portfolio-1',
      failedAt: new Date(Date.now() - 7200000).toISOString(),
      retryCount: 1,
      maxRetries: 5,
      errorType: 'network',
      errorCode: 'NETWORK_TIMEOUT',
      errorMessage: 'Network timeout while fetching symbol data from external API',
      errorDetails: {
        stage: 'Symbol Processing',
        rawError: 'RequestTimeoutError: Request timed out after 30 seconds',
        context: {
          url: 'https://query1.finance.yahoo.com/v8/finance/chart/AAPL',
          timeout: 30000,
          retryCount: 3
        }
      },
      originalEmail: {
        subject: 'Trade Confirmation - AAPL Purchase',
        from: 'notifications@wealthsimple.com',
        htmlContent: '<html>...</html>',
        receivedAt: new Date(Date.now() - 7300000).toISOString()
      },
      partialData: {
        parsedSymbol: 'AAPL',
        parsedAmount: 2500.00,
        parsedDate: '2025-01-15'
      },
      resolutionAttempts: [],
      tags: ['network-issue', 'auto-retry'],
      priority: 'medium',
      status: 'new'
    }
  ];

  const imports = failedImports.length > 0 ? failedImports : mockFailedImports;

  const filteredImports = useMemo(() => {
    return imports.filter(importItem => {
      const matchesSearch = !searchTerm || 
        importItem.emailSubject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        importItem.errorMessage.toLowerCase().includes(searchTerm.toLowerCase()) ||
        importItem.errorCode.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesErrorType = filterErrorType === 'all' || importItem.errorType === filterErrorType;
      const matchesStatus = filterStatus === 'all' || importItem.status === filterStatus;
      const matchesPriority = filterPriority === 'all' || importItem.priority === filterPriority;

      return matchesSearch && matchesErrorType && matchesStatus && matchesPriority;
    });
  }, [imports, searchTerm, filterErrorType, filterStatus, filterPriority]);

  const handleResolveAction = async (importId: string, action: ResolutionAction) => {
    setActionLoading(importId);
    try {
      await onResolveImport(importId, action);
      success('Action Completed', `Import ${action.type} action completed successfully`);
    } catch (err) {
      error('Action Failed', `Failed to ${action.type} import: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setActionLoading(null);
    }
  };

  const getErrorTypeIcon = (errorType: string) => {
    switch (errorType) {
      case 'parsing': return <FileText size={16} />;
      case 'symbol_processing': return <Search size={16} />;
      case 'network': return <AlertTriangle size={16} />;
      case 'validation': return <AlertCircle size={16} />;
      default: return <Bug size={16} />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'resolved': return <CheckCircle size={14} />;
      case 'in_progress': return <RefreshCw size={14} />;
      case 'investigating': return <Eye size={14} />;
      case 'skipped': return <X size={14} />;
      default: return <Clock size={14} />;
    }
  };

  const viewDetails = (importItem: FailedImport) => {
    setSelectedImport(importItem);
    setShowDetailsModal(true);
    onViewDetails(importItem);
  };

  return (
    <>
      <Container className={className}>
        <Header>
          <Title>
            <AlertTriangle size={24} />
            Failed Imports ({filteredImports.length})
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

        <FilterBar>
          <FilterGroup>
            <FilterLabel>Search</FilterLabel>
            <SearchInput
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by subject, error..."
            />
          </FilterGroup>

          <FilterGroup>
            <FilterLabel>Error Type</FilterLabel>
            <Select
              value={filterErrorType}
              onChange={(e) => setFilterErrorType(e.target.value)}
            >
              <option value="all">All Types</option>
              <option value="parsing">Parsing</option>
              <option value="symbol_processing">Symbol Processing</option>
              <option value="network">Network</option>
              <option value="validation">Validation</option>
              <option value="duplicate_check">Duplicate Check</option>
            </Select>
          </FilterGroup>

          <FilterGroup>
            <FilterLabel>Status</FilterLabel>
            <Select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="new">New</option>
              <option value="investigating">Investigating</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="skipped">Skipped</option>
            </Select>
          </FilterGroup>

          <FilterGroup>
            <FilterLabel>Priority</FilterLabel>
            <Select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </Select>
          </FilterGroup>
        </FilterBar>

        <FailedImportsList>
          {filteredImports.length === 0 ? (
            <EmptyState>
              {imports.length === 0 
                ? "No failed imports found. All emails are processing successfully!" 
                : "No imports match your current filters."}
            </EmptyState>
          ) : (
            filteredImports.map((importItem) => (
              <FailedImportCard key={importItem.id} $priority={importItem.priority}>
                <ImportHeader>
                  <ImportInfo>
                    <ImportTitle>{importItem.emailSubject}</ImportTitle>
                    <ImportMeta>
                      <span>From: {importItem.fromEmail}</span>
                      <span>•</span>
                      <span>Failed: {formatDate(importItem.failedAt)}</span>
                      <span>•</span>
                      <span>Portfolio: {importItem.portfolioId}</span>
                    </ImportMeta>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <StatusBadge $status={importItem.status}>
                        {getStatusIcon(importItem.status)}
                        {importItem.status.replace('_', ' ').toUpperCase()}
                      </StatusBadge>
                      <TagsList>
                        {importItem.tags.map((tag, index) => (
                          <Tag key={index}>{tag}</Tag>
                        ))}
                      </TagsList>
                    </div>
                  </ImportInfo>
                </ImportHeader>

                <ErrorDetails>
                  <ErrorTitle>
                    {getErrorTypeIcon(importItem.errorType)}
                    {importItem.errorType.replace('_', ' ').toUpperCase()} ERROR
                    <ErrorCode>{importItem.errorCode}</ErrorCode>
                  </ErrorTitle>
                  <ErrorMessage>{importItem.errorMessage}</ErrorMessage>
                  
                  {importItem.partialData && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                      <strong>Partial Data:</strong> 
                      {importItem.partialData.parsedSymbol && ` Symbol: ${importItem.partialData.parsedSymbol}`}
                      {importItem.partialData.parsedAmount && ` Amount: $${importItem.partialData.parsedAmount}`}
                      {importItem.partialData.parsedDate && ` Date: ${importItem.partialData.parsedDate}`}
                    </div>
                  )}
                </ErrorDetails>

                <RetryInfo>
                  <RotateCcw size={14} />
                  Retry {importItem.retryCount}/{importItem.maxRetries}
                  {importItem.resolutionAttempts.length > 0 && (
                    <span>• {importItem.resolutionAttempts.length} resolution attempts</span>
                  )}
                </RetryInfo>

                <ActionButtons>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewDetails(importItem)}
                  >
                    <Eye size={14} />
                    View Details
                  </Button>
                  
                  {importItem.retryCount < importItem.maxRetries && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleResolveAction(importItem.id, { type: 'retry' })}
                      disabled={actionLoading === importItem.id}
                    >
                      <Play size={14} />
                      Retry
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolveAction(importItem.id, { type: 'manual_fix' })}
                    disabled={actionLoading === importItem.id}
                  >
                    <Edit3 size={14} />
                    Manual Fix
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolveAction(importItem.id, { type: 'skip' })}
                    disabled={actionLoading === importItem.id}
                  >
                    <X size={14} />
                    Skip
                  </Button>
                  
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleResolveAction(importItem.id, { type: 'delete' })}
                    disabled={actionLoading === importItem.id}
                  >
                    <Trash2 size={14} />
                    Delete
                  </Button>
                </ActionButtons>
              </FailedImportCard>
            ))
          )}
        </FailedImportsList>
      </Container>

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Failed Import Details"
        size="lg"
      >
        {selectedImport && (
          <ModalContent>
            <div>
              <h3>Email Information</h3>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Subject:</strong> {selectedImport.originalEmail.subject}<br />
                <strong>From:</strong> {selectedImport.originalEmail.from}<br />
                <strong>Received:</strong> {formatDate(selectedImport.originalEmail.receivedAt)}
              </div>
            </div>

            <div>
              <h3>Error Details</h3>
              <ErrorDetails>
                <ErrorTitle>
                  {getErrorTypeIcon(selectedImport.errorType)}
                  {selectedImport.errorType.replace('_', ' ').toUpperCase()}
                  <ErrorCode>{selectedImport.errorCode}</ErrorCode>
                </ErrorTitle>
                <ErrorMessage>{selectedImport.errorMessage}</ErrorMessage>
              </ErrorDetails>
              
              <div>
                <strong>Raw Error:</strong>
                <CodeBlock>{selectedImport.errorDetails.rawError}</CodeBlock>
              </div>
              
              {selectedImport.errorDetails.context && (
                <div>
                  <strong>Context:</strong>
                  <CodeBlock>{JSON.stringify(selectedImport.errorDetails.context, null, 2)}</CodeBlock>
                </div>
              )}
            </div>

            {selectedImport.resolutionAttempts.length > 0 && (
              <div>
                <h3>Resolution Attempts</h3>
                {selectedImport.resolutionAttempts.map((attempt) => (
                  <div key={attempt.id} style={{ marginBottom: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px' }}>
                    <div><strong>Method:</strong> {attempt.method}</div>
                    <div><strong>Result:</strong> {attempt.result}</div>
                    <div><strong>Attempted:</strong> {formatDate(attempt.attemptedAt)}</div>
                    {attempt.notes && <div><strong>Notes:</strong> {attempt.notes}</div>}
                  </div>
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
                  if (selectedImport) {
                    handleResolveAction(selectedImport.id, { type: 'manual_fix' });
                  }
                }}
              >
                <Edit3 size={16} />
                Fix Manually
              </Button>
            </div>
          </ModalContent>
        )}
      </Modal>
    </>
  );
};

export default FailedImportResolutionInterface;