/**
 * Import History Analytics Component
 * Task 9.4: Add import history and analytics
 * Comprehensive dashboard for email import history tracking and performance analytics
 */

import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  Zap,
  Target,
  Filter,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  PieChart,
  Activity,
  Award,
  AlertCircle,
  Database
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Modal } from './ui/Modal';
import { useNotifications } from '../hooks/useNotifications';
import { formatDate } from '../utils/formatting';

interface ImportRecord {
  id: string;
  emailSubject: string;
  fromEmail: string;
  portfolioId: string;
  processedAt: string;
  status: 'success' | 'failed' | 'duplicate' | 'manual_review' | 'skipped';
  processingTime: number; // in milliseconds
  emailSize: number; // in bytes
  extractedData: {
    symbol?: string;
    amount?: number;
    transactionType?: 'buy' | 'sell' | 'dividend' | 'split';
    quantity?: number;
    price?: number;
  };
  aiConfidence: number;
  duplicateCheckResult?: {
    found: boolean;
    similarity: number;
    checkedAgainst: number;
  };
  errors?: string[];
  transactionId?: string;
  reviewedBy?: string;
  reviewTime?: number;
  tags: string[];
}

interface AnalyticsData {
  totalImports: number;
  successRate: number;
  avgProcessingTime: number;
  duplicateRate: number;
  manualReviewRate: number;
  topPortfolios: Array<{ id: string; count: number }>;
  topSymbols: Array<{ symbol: string; count: number }>;
  errorBreakdown: Array<{ type: string; count: number }>;
  dailyStats: Array<{
    date: string;
    imports: number;
    successful: number;
    failed: number;
    avgTime: number;
  }>;
  performanceMetrics: {
    slaCompliance: number;
    aiAccuracy: number;
    processingEfficiency: number;
    userSatisfaction: number;
  };
}

interface TimeRange {
  label: string;
  value: string;
  days: number;
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
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
  font-size: 1.75rem;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.75rem;

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

const TimeRangeSelector = styled.div`
  display: flex;
  gap: 0.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.25rem;

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
  }
`;

const TimeRangeButton = styled.button<{ $active: boolean }>`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${props => props.$active ? `
    background: #3b82f6;
    color: white;
  ` : `
    background: transparent;
    color: #6b7280;
    
    &:hover {
      background: #f3f4f6;
      color: #374151;
    }
  `}

  [data-theme="dark"] & {
    ${props => props.$active ? `
      background: #3b82f6;
      color: white;
    ` : `
      color: #9ca3af;
      
      &:hover {
        background: #4b5563;
        color: #f3f4f6;
      }
    `}
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const MetricCard = styled(Card)`
  padding: 1.5rem;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05);
  }
`;

const MetricHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const MetricTitle = styled.h3`
  margin: 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const MetricIcon = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: ${props => props.$color};
  border-radius: 10px;
  color: white;
`;

const MetricValue = styled.div`
  font-size: 2.5rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const MetricChange = styled.div<{ $trend: 'up' | 'down' | 'neutral' }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => {
    switch (props.$trend) {
      case 'up': return '#059669';
      case 'down': return '#dc2626';
      default: return '#6b7280';
    }
  }};

  [data-theme="dark"] & {
    color: ${props => {
      switch (props.$trend) {
        case 'up': return '#10b981';
        case 'down': return '#f87171';
        default: return '#9ca3af';
      }
    }};
  }
`;

const ChartsSection = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;

  @media (max-width: 1024px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled(Card)`
  padding: 1.5rem;
`;

const ChartTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const ChartPlaceholder = styled.div`
  height: 300px;
  background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748b;
  font-size: 0.875rem;
  border: 2px dashed #cbd5e1;

  [data-theme="dark"] & {
    background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
    border-color: #6b7280;
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

const ImportsList = styled.div`
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
  }
`;

const ImportsHeader = styled.div`
  padding: 1.25rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;

  [data-theme="dark"] & {
    border-color: #4b5563;
  }
`;

const ImportsTable = styled.div`
  overflow-x: auto;
`;

const TableHeader = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 100px;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: #f8fafc;
  font-size: 0.75rem;
  font-weight: 600;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  [data-theme="dark"] & {
    background: #4b5563;
    color: #d1d5db;
  }

  @media (max-width: 768px) {
    grid-template-columns: 2fr 1fr 1fr 80px;
    gap: 0.5rem;
    
    & > div:nth-child(4),
    & > div:nth-child(5) {
      display: none;
    }
  }
`;

const TableRow = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 1fr 100px;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f1f5f9;
  transition: background-color 0.2s ease;
  
  &:hover {
    background: #f8fafc;
  }

  &:last-child {
    border-bottom: none;
  }

  [data-theme="dark"] & {
    border-color: #4b5563;
    
    &:hover {
      background: #4b5563;
    }
  }

  @media (max-width: 768px) {
    grid-template-columns: 2fr 1fr 1fr 80px;
    gap: 0.5rem;
    
    & > div:nth-child(4),
    & > div:nth-child(5) {
      display: none;
    }
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
      case 'success':
        return `
          background: #d1fae5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        `;
      case 'failed':
        return `
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        `;
      case 'duplicate':
        return `
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        `;
      case 'manual_review':
        return `
          background: #e0e7ff;
          color: #5b21b6;
          border: 1px solid #c7d2fe;
        `;
      case 'skipped':
        return `
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #6b7280;
          border: 1px solid #d1d5db;
        `;
    }
  }}

  [data-theme="dark"] & {
    ${props => {
      switch (props.$status) {
        case 'success':
          return `
            background: #064e3b;
            color: #a7f3d0;
            border-color: #065f46;
          `;
        case 'failed':
          return `
            background: #7f1d1d;
            color: #fecaca;
            border-color: #991b1b;
          `;
        case 'duplicate':
          return `
            background: #78350f;
            color: #fde68a;
            border-color: #92400e;
          `;
        case 'manual_review':
          return `
            background: #4c1d95;
            color: #c7d2fe;
            border-color: #5b21b6;
          `;
        case 'skipped':
          return `
            background: #374151;
            color: #9ca3af;
            border-color: #4b5563;
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

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const TopListsSection = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const TopListCard = styled(Card)`
  padding: 1.5rem;
`;

const TopListItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f1f5f9;

  &:last-child {
    border-bottom: none;
  }

  [data-theme="dark"] & {
    border-color: #4b5563;
  }
`;

const TopListLabel = styled.span`
  font-weight: 500;
  color: #111827;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const TopListValue = styled.span`
  font-weight: 600;
  color: #3b82f6;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;

  [data-theme="dark"] & {
    color: #60a5fa;
  }
`;

const ModalContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-height: 70vh;
  overflow-y: auto;
`;

interface ImportHistoryAnalyticsProps {
  importRecords?: ImportRecord[];
  analytics?: AnalyticsData;
  loading?: boolean;
  onRefresh?: () => Promise<void>;
  onExport?: (timeRange: string) => Promise<void>;
  className?: string;
}

const ImportHistoryAnalytics: React.FC<ImportHistoryAnalyticsProps> = ({
  importRecords = [],
  analytics,
  loading = false,
  onRefresh = async () => {},
  onExport = async () => {},
  className
}) => {
  const { success, error } = useNotifications();
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPortfolio, setFilterPortfolio] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<ImportRecord | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const timeRanges: TimeRange[] = [
    { label: '24h', value: '1d', days: 1 },
    { label: '7d', value: '7d', days: 7 },
    { label: '30d', value: '30d', days: 30 },
    { label: '90d', value: '90d', days: 90 },
    { label: '1y', value: '1y', days: 365 },
    { label: 'All', value: 'all', days: 0 }
  ];

  // Mock data for demonstration
  const mockAnalytics: AnalyticsData = {
    totalImports: 1847,
    successRate: 94.2,
    avgProcessingTime: 2150, // ms
    duplicateRate: 3.8,
    manualReviewRate: 2.1,
    topPortfolios: [
      { id: 'TFSA Portfolio', count: 847 },
      { id: 'RRSP Portfolio', count: 634 },
      { id: 'Margin Account', count: 287 },
      { id: 'RESP Portfolio', count: 79 }
    ],
    topSymbols: [
      { symbol: 'AAPL', count: 156 },
      { symbol: 'TSLA', count: 134 },
      { symbol: 'MSFT', count: 128 },
      { symbol: 'GOOGL', count: 97 },
      { symbol: 'AMZN', count: 89 }
    ],
    errorBreakdown: [
      { type: 'Symbol Not Found', count: 34 },
      { type: 'Network Timeout', count: 18 },
      { type: 'Parse Error', count: 12 },
      { type: 'Validation Failed', count: 8 }
    ],
    dailyStats: [
      { date: '2025-01-15', imports: 89, successful: 84, failed: 5, avgTime: 2100 },
      { date: '2025-01-14', imports: 76, successful: 72, failed: 4, avgTime: 2250 },
      { date: '2025-01-13', imports: 93, successful: 88, failed: 5, avgTime: 2050 },
      { date: '2025-01-12', imports: 67, successful: 63, failed: 4, avgTime: 2300 },
      { date: '2025-01-11', imports: 81, successful: 77, failed: 4, avgTime: 2150 }
    ],
    performanceMetrics: {
      slaCompliance: 98.5,
      aiAccuracy: 96.7,
      processingEfficiency: 94.8,
      userSatisfaction: 4.6
    }
  };

  const mockImportRecords: ImportRecord[] = [
    {
      id: 'import-1',
      emailSubject: 'Trade Confirmation - AAPL Purchase',
      fromEmail: 'notifications@wealthsimple.com',
      portfolioId: 'TFSA Portfolio',
      processedAt: new Date(Date.now() - 300000).toISOString(),
      status: 'success',
      processingTime: 2150,
      emailSize: 15672,
      extractedData: {
        symbol: 'AAPL',
        amount: 2500.00,
        transactionType: 'buy',
        quantity: 15,
        price: 166.67
      },
      aiConfidence: 0.97,
      duplicateCheckResult: {
        found: false,
        similarity: 0.12,
        checkedAgainst: 45
      },
      transactionId: 'trans-789',
      tags: ['auto-processed', 'high-confidence']
    },
    {
      id: 'import-2',
      emailSubject: 'Trade Confirmation - UNKNOWN_SYM Sale',
      fromEmail: 'notifications@wealthsimple.com',
      portfolioId: 'RRSP Portfolio',
      processedAt: new Date(Date.now() - 7200000).toISOString(),
      status: 'failed',
      processingTime: 5500,
      emailSize: 12456,
      extractedData: {
        symbol: 'UNKNOWN_SYM',
        amount: 1000.00,
        transactionType: 'sell'
      },
      aiConfidence: 0.23,
      errors: ['Symbol not found in any data provider', 'AI confidence below threshold'],
      tags: ['symbol-lookup-failed', 'needs-review']
    }
  ];

  const currentAnalytics = analytics || mockAnalytics;
  const records = importRecords.length > 0 ? importRecords : mockImportRecords;

  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      const matchesSearch = !searchTerm || 
        record.emailSubject.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.extractedData.symbol?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = filterStatus === 'all' || record.status === filterStatus;
      const matchesPortfolio = filterPortfolio === 'all' || record.portfolioId === filterPortfolio;

      return matchesSearch && matchesStatus && matchesPortfolio;
    });
  }, [records, searchTerm, filterStatus, filterPortfolio]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle size={14} />;
      case 'failed': return <AlertTriangle size={14} />;
      case 'duplicate': return <AlertCircle size={14} />;
      case 'manual_review': return <Users size={14} />;
      case 'skipped': return <Clock size={14} />;
      default: return <FileText size={14} />;
    }
  };

  const formatProcessingTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const viewDetails = (record: ImportRecord) => {
    setSelectedRecord(record);
    setShowDetailsModal(true);
  };

  const handleExport = async () => {
    try {
      await onExport(selectedTimeRange);
      success('Export Started', 'Your export will be ready for download shortly');
    } catch {
      error('Export Failed', 'Failed to start export process');
    }
  };

  return (
    <>
      <Container className={className}>
        <Header>
          <Title>
            <BarChart3 size={28} />
            Import History & Analytics
          </Title>
          <HeaderActions>
            <TimeRangeSelector>
              {timeRanges.map((range) => (
                <TimeRangeButton
                  key={range.value}
                  $active={selectedTimeRange === range.value}
                  onClick={() => setSelectedTimeRange(range.value)}
                >
                  {range.label}
                </TimeRangeButton>
              ))}
            </TimeRangeSelector>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={loading}
            >
              <Download size={16} />
              Export
            </Button>
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={loading}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </Button>
          </HeaderActions>
        </Header>

        <MetricsGrid>
          <MetricCard>
            <MetricHeader>
              <MetricTitle>Total Imports</MetricTitle>
              <MetricIcon $color="#3b82f6">
                <Database size={20} />
              </MetricIcon>
            </MetricHeader>
            <MetricValue>{currentAnalytics.totalImports.toLocaleString()}</MetricValue>
            <MetricChange $trend="up">
              <TrendingUp size={14} />
              +12% this week
            </MetricChange>
          </MetricCard>

          <MetricCard>
            <MetricHeader>
              <MetricTitle>Success Rate</MetricTitle>
              <MetricIcon $color="#10b981">
                <Target size={20} />
              </MetricIcon>
            </MetricHeader>
            <MetricValue>{currentAnalytics.successRate.toFixed(1)}%</MetricValue>
            <MetricChange $trend="up">
              <TrendingUp size={14} />
              +2.3% improvement
            </MetricChange>
          </MetricCard>

          <MetricCard>
            <MetricHeader>
              <MetricTitle>Avg Processing Time</MetricTitle>
              <MetricIcon $color="#8b5cf6">
                <Zap size={20} />
              </MetricIcon>
            </MetricHeader>
            <MetricValue>{formatProcessingTime(currentAnalytics.avgProcessingTime)}</MetricValue>
            <MetricChange $trend="down">
              <TrendingDown size={14} />
              -300ms faster
            </MetricChange>
          </MetricCard>

          <MetricCard>
            <MetricHeader>
              <MetricTitle>Manual Review Rate</MetricTitle>
              <MetricIcon $color="#f59e0b">
                <Users size={20} />
              </MetricIcon>
            </MetricHeader>
            <MetricValue>{currentAnalytics.manualReviewRate.toFixed(1)}%</MetricValue>
            <MetricChange $trend="down">
              <TrendingDown size={14} />
              -0.8% reduction
            </MetricChange>
          </MetricCard>
        </MetricsGrid>

        <ChartsSection>
          <ChartCard>
            <ChartTitle>
              <Activity size={20} />
              Daily Import Trends
            </ChartTitle>
            <ChartPlaceholder>
              📊 Daily import volume and success rate chart would be rendered here
              <br />
              (Integration with charting library like Chart.js or Recharts)
            </ChartPlaceholder>
          </ChartCard>

          <ChartCard>
            <ChartTitle>
              <PieChart size={20} />
              Status Distribution
            </ChartTitle>
            <ChartPlaceholder>
              🥧 Import status breakdown pie chart would be rendered here
            </ChartPlaceholder>
          </ChartCard>
        </ChartsSection>

        <TopListsSection>
          <TopListCard>
            <ChartTitle>
              <Award size={20} />
              Top Portfolios
            </ChartTitle>
            {currentAnalytics.topPortfolios.map((portfolio, index) => (
              <TopListItem key={portfolio.id}>
                <TopListLabel>#{index + 1} {portfolio.id}</TopListLabel>
                <TopListValue>{portfolio.count}</TopListValue>
              </TopListItem>
            ))}
          </TopListCard>

          <TopListCard>
            <ChartTitle>
              <TrendingUp size={20} />
              Top Symbols
            </ChartTitle>
            {currentAnalytics.topSymbols.map((symbol) => (
              <TopListItem key={symbol.symbol}>
                <TopListLabel>#{currentAnalytics.topSymbols.indexOf(symbol) + 1} {symbol.symbol}</TopListLabel>
                <TopListValue>{symbol.count}</TopListValue>
              </TopListItem>
            ))}
          </TopListCard>

          <TopListCard>
            <ChartTitle>
              <AlertTriangle size={20} />
              Error Breakdown
            </ChartTitle>
            {currentAnalytics.errorBreakdown.map((error) => (
              <TopListItem key={error.type}>
                <TopListLabel>{error.type}</TopListLabel>
                <TopListValue>{error.count}</TopListValue>
              </TopListItem>
            ))}
          </TopListCard>
        </TopListsSection>

        <ImportsList>
          <ImportsHeader>
            <ChartTitle>
              <FileText size={20} />
              Recent Import History ({filteredRecords.length})
            </ChartTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            >
              <Filter size={14} />
              Filters
              {showAdvancedFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </Button>
          </ImportsHeader>

          {showAdvancedFilters && (
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
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                  <option value="duplicate">Duplicate</option>
                  <option value="manual_review">Manual Review</option>
                  <option value="skipped">Skipped</option>
                </Select>
              </FilterGroup>

              <FilterGroup>
                <FilterLabel>Portfolio</FilterLabel>
                <Select
                  value={filterPortfolio}
                  onChange={(e) => setFilterPortfolio(e.target.value)}
                >
                  <option value="all">All Portfolios</option>
                  {currentAnalytics.topPortfolios.map((portfolio) => (
                    <option key={portfolio.id} value={portfolio.id}>
                      {portfolio.id}
                    </option>
                  ))}
                </Select>
              </FilterGroup>
            </FilterBar>
          )}

          <ImportsTable>
            <TableHeader>
              <div>Email Subject</div>
              <div>Status</div>
              <div>Processing Time</div>
              <div>AI Confidence</div>
              <div>Portfolio</div>
              <div>Actions</div>
            </TableHeader>

            {filteredRecords.length === 0 ? (
              <EmptyState>
                {records.length === 0 
                  ? "No import records found for the selected time range." 
                  : "No records match your current filters."}
              </EmptyState>
            ) : (
              filteredRecords.slice(0, 50).map((record) => (
                <TableRow key={record.id}>
                  <div>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>
                      {record.emailSubject}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {formatDate(record.processedAt)} • {formatFileSize(record.emailSize)}
                    </div>
                  </div>
                  <div>
                    <StatusBadge $status={record.status}>
                      {getStatusIcon(record.status)}
                      {record.status.replace('_', ' ').toUpperCase()}
                    </StatusBadge>
                  </div>
                  <div>{formatProcessingTime(record.processingTime)}</div>
                  <div>{(record.aiConfidence * 100).toFixed(1)}%</div>
                  <div>{record.portfolioId}</div>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewDetails(record)}
                    >
                      <Eye size={12} />
                    </Button>
                  </div>
                </TableRow>
              ))
            )}
          </ImportsTable>
        </ImportsList>
      </Container>

      {/* Details Modal */}
      <Modal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        title="Import Record Details"
        size="lg"
      >
        {selectedRecord && (
          <ModalContent>
            <div>
              <h3>Email Information</h3>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Subject:</strong> {selectedRecord.emailSubject}<br />
                <strong>From:</strong> {selectedRecord.fromEmail}<br />
                <strong>Processed:</strong> {formatDate(selectedRecord.processedAt)}<br />
                <strong>Processing Time:</strong> {formatProcessingTime(selectedRecord.processingTime)}<br />
                <strong>Email Size:</strong> {formatFileSize(selectedRecord.emailSize)}
              </div>
            </div>

            <div>
              <h3>Extracted Data</h3>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
                  {Object.entries(selectedRecord.extractedData).map(([key, value]) => (
                    <div key={key}>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                      </div>
                      <div style={{ fontWeight: '600' }}>
                        {typeof value === 'number' && (key.includes('amount') || key.includes('price')) 
                          ? `$${value.toFixed(2)}` 
                          : String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <h3>Processing Results</h3>
              <div style={{ marginBottom: '1rem' }}>
                <strong>Status:</strong> 
                <StatusBadge $status={selectedRecord.status} style={{ marginLeft: '0.5rem' }}>
                  {getStatusIcon(selectedRecord.status)}
                  {selectedRecord.status.replace('_', ' ').toUpperCase()}
                </StatusBadge><br />
                <strong>AI Confidence:</strong> {(selectedRecord.aiConfidence * 100).toFixed(1)}%<br />
                {selectedRecord.transactionId && (
                  <>
                    <strong>Transaction ID:</strong> {selectedRecord.transactionId}<br />
                  </>
                )}
                {selectedRecord.duplicateCheckResult && (
                  <>
                    <strong>Duplicate Check:</strong> {selectedRecord.duplicateCheckResult.found ? 'Found' : 'Not Found'} 
                    (checked against {selectedRecord.duplicateCheckResult.checkedAgainst} records)<br />
                  </>
                )}
              </div>
            </div>

            {selectedRecord.errors && selectedRecord.errors.length > 0 && (
              <div>
                <h3>Errors</h3>
                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem' }}>
                  {selectedRecord.errors.map((error, index) => (
                    <div key={index} style={{ color: '#dc2626', marginBottom: '0.5rem' }}>
                      • {error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <Button
                variant="outline"
                onClick={() => setShowDetailsModal(false)}
              >
                Close
              </Button>
            </div>
          </ModalContent>
        )}
      </Modal>
    </>
  );
};

export default ImportHistoryAnalytics;