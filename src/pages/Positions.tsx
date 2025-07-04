import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar, 
  Eye, 
  EyeOff,
  ArrowLeft,
  RefreshCw,
  BarChart3,
  PieChart
} from 'lucide-react';
import { usePageTitle } from '../hooks/usePageTitle';
import { usePortfolios } from '../contexts/PortfolioContext';
import { positionAnalyticsService, type PositionAnalytics, type PositionFilter } from '../services/positionAnalyticsService';
import { formatCurrency, formatPercentage } from '../utils/formatting';
import PortfolioSelector from '../components/PortfolioSelector';

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
  
  @media (max-width: 768px) {
    padding: 1rem;
  }
`;

const PageHeader = styled.div`
  margin-bottom: 2rem;
`;

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 2rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const TitleSection = styled.div`
  flex: 1;
`;

const ActionSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const PageTitle = styled.h1`
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const PageSubtitle = styled.p`
  font-size: 1.125rem;
  color: var(--text-secondary);
  margin: 0 0 0.5rem 0;
`;

const DateFilter = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: 8px;
  font-size: 0.875rem;
  color: var(--text-secondary);
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--bg-tertiary);
    border-color: var(--border-secondary);
  }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: var(--color-primary-600);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--color-primary-700);
  }
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
`;

const StatCard = styled.div`
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--border-secondary);
    box-shadow: var(--shadow-md);
  }
`;

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const StatIcon = styled.div<{ $variant: 'primary' | 'success' | 'danger' | 'warning' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 8px;
  background: ${props => {
    switch (props.$variant) {
      case 'success': return 'rgba(34, 197, 94, 0.1)';
      case 'danger': return 'rgba(239, 68, 68, 0.1)';
      case 'warning': return 'rgba(245, 158, 11, 0.1)';
      default: return 'rgba(59, 130, 246, 0.1)';
    }
  }};
  color: ${props => {
    switch (props.$variant) {
      case 'success': return '#059669';
      case 'danger': return '#dc2626';
      case 'warning': return '#d97706';
      default: return '#2563eb';
    }
  }};
`;

const StatLabel = styled.h3`
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const StatValue = styled.div<{ $positive?: boolean; $negative?: boolean }>`
  font-size: 1.875rem;
  font-weight: 700;
  color: ${props => 
    props.$positive ? '#059669' : 
    props.$negative ? '#dc2626' : 
    'var(--text-primary)'
  };
  margin: 0;
`;

const StatChange = styled.div<{ $positive?: boolean; $negative?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => 
    props.$positive ? '#059669' : 
    props.$negative ? '#dc2626' : 
    'var(--text-secondary)'
  };
  margin-top: 0.5rem;
`;

const FiltersContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const FilterLabel = styled.label`
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const FilterSelect = styled.select`
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.875rem;
  min-width: 120px;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary-500);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: ${props => props.$active ? 'var(--color-primary-600)' : 'var(--bg-secondary)'};
  color: ${props => props.$active ? 'white' : 'var(--text-primary)'};
  border: 1px solid ${props => props.$active ? 'var(--color-primary-600)' : 'var(--border-primary)'};
  border-radius: 6px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.$active ? 'var(--color-primary-700)' : 'var(--bg-tertiary)'};
  }
`;

const PositionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const PositionCard = styled.div`
  background: var(--bg-card);
  border: 1px solid var(--border-primary);
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    border-color: var(--border-secondary);
    box-shadow: var(--shadow-lg);
    transform: translateY(-2px);
  }
`;

const PositionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const AssetInfo = styled.div`
  flex: 1;
`;

const AssetSymbol = styled.h3`
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 0.25rem 0;
`;

const AssetName = styled.p`
  font-size: 0.875rem;
  color: var(--text-secondary);
  margin: 0 0 0.25rem 0;
`;

const PortfolioBadge = styled.span`
  background: var(--bg-tertiary);
  color: var(--text-secondary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid var(--border-primary);
`;

const PositionMetrics = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
`;

const MetricGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
`;

const MetricLabel = styled.span`
  font-size: 0.75rem;
  color: var(--text-secondary);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const MetricValue = styled.span<{ $positive?: boolean; $negative?: boolean }>`
  font-size: 0.875rem;
  font-weight: 600;
  color: ${props => 
    props.$positive ? '#059669' : 
    props.$negative ? '#dc2626' : 
    'var(--text-primary)'
  };
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 4rem 2rem;
  color: var(--text-secondary);
`;

const ErrorState = styled.div`
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  padding: 1rem 1.5rem;
  border-radius: 8px;
  margin-bottom: 2rem;
  border: 1px solid rgba(239, 68, 68, 0.2);
`;

const PositionsPage: React.FC = () => {
  const { date } = useParams<{ date: string }>();
  const navigate = useNavigate();
  const { portfolios, activePortfolio } = usePortfolios();
  
  // State
  const [positions, setPositions] = useState<PositionAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<PositionFilter>({
    date: date || undefined,
    portfolioId: undefined,
    assetType: 'all',
    showClosed: false
  });

  // Set page title
  usePageTitle('Portfolio Positions', { 
    subtitle: date ? `Holdings as of ${new Date(date).toLocaleDateString()}` : 'Current Holdings' 
  });

  // Load positions
  const loadPositions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const portfolioIds = activePortfolio ? [activePortfolio.id] : portfolios.map(p => p.id);
      const result = await positionAnalyticsService.getPositionAnalytics(portfolioIds, filters);
      
      if (result.error) {
        setError(result.error);
      } else {
        setPositions(result.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load positions');
    } finally {
      setLoading(false);
    }
  };

  // Load positions when filters change
  useEffect(() => {
    if (portfolios.length > 0) {
      loadPositions();
    }
  }, [portfolios, activePortfolio, filters]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const totalValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
    const totalCost = positions.reduce((sum, p) => sum + p.totalCostBasis, 0);
    const totalUnrealizedPL = positions.reduce((sum, p) => sum + p.unrealizedPL, 0);
    const totalRealizedPL = positions.reduce((sum, p) => sum + p.realizedPL, 0);
    const totalPL = totalUnrealizedPL + totalRealizedPL;
    const openPositions = positions.filter(p => p.isOpen).length;
    
    return {
      totalValue,
      totalCost,
      totalUnrealizedPL,
      totalRealizedPL,
      totalPL,
      totalPLPercent: totalCost > 0 ? (totalPL / totalCost) * 100 : 0,
      openPositions,
      totalPositions: positions.length
    };
  }, [positions]);

  // Handle filter changes
  const handleFilterChange = (key: keyof PositionFilter, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Handle position click
  const handlePositionClick = (position: PositionAnalytics) => {
    // Could navigate to detailed position view
    console.log('Position clicked:', position);
  };

  // Handle back to summary
  const handleBackToSummary = () => {
    navigate('/summary');
  };

  return (
    <PageContainer>
      <PageHeader>
        <HeaderContainer>
          <TitleSection>
            <PageTitle>
              <BarChart3 size={28} />
              Portfolio Positions
            </PageTitle>
            <PageSubtitle>
              {date 
                ? `Portfolio holdings as of ${new Date(date).toLocaleDateString()}`
                : `Current portfolio holdings and performance`
              }
            </PageSubtitle>
            {date && (
              <DateFilter>
                <Calendar size={16} />
                Filtered by: {new Date(date).toLocaleDateString()}
              </DateFilter>
            )}
          </TitleSection>
          
          <ActionSection>
            {date && (
              <BackButton onClick={handleBackToSummary}>
                <ArrowLeft size={16} />
                Back to Summary
              </BackButton>
            )}
            
            <RefreshButton onClick={loadPositions} disabled={loading}>
              <RefreshCw size={16} />
              Refresh
            </RefreshButton>
            
            {portfolios.length > 1 && (
              <PortfolioSelector compact={true} />
            )}
          </ActionSection>
        </HeaderContainer>
      </PageHeader>

      {error && (
        <ErrorState>
          <strong>Error loading positions:</strong> {error}
        </ErrorState>
      )}

      {/* Summary Stats */}
      <StatsGrid>
        <StatCard>
          <StatHeader>
            <StatIcon $variant="primary">
              <DollarSign size={20} />
            </StatIcon>
            <StatLabel>Total Market Value</StatLabel>
          </StatHeader>
          <StatValue>
            {formatCurrency(stats.totalValue)}
          </StatValue>
        </StatCard>

        <StatCard>
          <StatHeader>
            <StatIcon $variant={stats.totalUnrealizedPL >= 0 ? 'success' : 'danger'}>
              {stats.totalUnrealizedPL >= 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
            </StatIcon>
            <StatLabel>Unrealized P/L</StatLabel>
          </StatHeader>
          <StatValue $positive={stats.totalUnrealizedPL >= 0} $negative={stats.totalUnrealizedPL < 0}>
            {formatCurrency(stats.totalUnrealizedPL)}
          </StatValue>
          <StatChange $positive={stats.totalUnrealizedPL >= 0} $negative={stats.totalUnrealizedPL < 0}>
            {stats.totalUnrealizedPL >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {formatPercentage((stats.totalUnrealizedPL / (stats.totalCost || 1)) * 100)}
          </StatChange>
        </StatCard>

        <StatCard>
          <StatHeader>
            <StatIcon $variant={stats.totalRealizedPL >= 0 ? 'success' : 'danger'}>
              <PieChart size={20} />
            </StatIcon>
            <StatLabel>Realized P/L</StatLabel>
          </StatHeader>
          <StatValue $positive={stats.totalRealizedPL >= 0} $negative={stats.totalRealizedPL < 0}>
            {formatCurrency(stats.totalRealizedPL)}
          </StatValue>
        </StatCard>

        <StatCard>
          <StatHeader>
            <StatIcon $variant="warning">
              <BarChart3 size={20} />
            </StatIcon>
            <StatLabel>Open Positions</StatLabel>
          </StatHeader>
          <StatValue>
            {stats.openPositions}
          </StatValue>
          <StatChange>
            {stats.totalPositions} total positions
          </StatChange>
        </StatCard>
      </StatsGrid>

      {/* Filters */}
      <FiltersContainer>
        <FilterGroup>
          <FilterLabel>Asset Type</FilterLabel>
          <FilterSelect
            value={filters.assetType || 'all'}
            onChange={(e) => handleFilterChange('assetType', e.target.value)}
          >
            <option value="all">All Types</option>
            <option value="stock">Stocks</option>
            <option value="option">Options</option>
            <option value="etf">ETFs</option>
            <option value="crypto">Crypto</option>
          </FilterSelect>
        </FilterGroup>

        <ToggleButton
          $active={filters.showClosed || false}
          onClick={() => handleFilterChange('showClosed', !filters.showClosed)}
        >
          {filters.showClosed ? <Eye size={16} /> : <EyeOff size={16} />}
          {filters.showClosed ? 'Hide Closed' : 'Show Closed'}
        </ToggleButton>
      </FiltersContainer>

      {/* Positions Grid */}
      {loading ? (
        <LoadingState>
          <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite' }} />
          Loading positions...
        </LoadingState>
      ) : positions.length === 0 ? (
        <EmptyState>
          <BarChart3 size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          <h3>No positions found</h3>
          <p>
            {date 
              ? `No holdings found for ${new Date(date).toLocaleDateString()}`
              : 'No current holdings in your portfolio'
            }
          </p>
        </EmptyState>
      ) : (
        <PositionsGrid>
          {positions.map((position) => (
            <PositionCard key={position.id} onClick={() => handlePositionClick(position)}>
              <PositionHeader>
                <AssetInfo>
                  <AssetSymbol>{position.assetSymbol}</AssetSymbol>
                  <AssetName>{position.assetName}</AssetName>
                </AssetInfo>
                <PortfolioBadge>{position.portfolioName}</PortfolioBadge>
              </PositionHeader>
              
              <PositionMetrics>
                <MetricGroup>
                  <MetricLabel>Quantity</MetricLabel>
                  <MetricValue>{position.totalQuantity.toLocaleString()}</MetricValue>
                </MetricGroup>
                
                <MetricGroup>
                  <MetricLabel>Market Value</MetricLabel>
                  <MetricValue>{formatCurrency(position.marketValue)}</MetricValue>
                </MetricGroup>
                
                <MetricGroup>
                  <MetricLabel>Avg Cost</MetricLabel>
                  <MetricValue>{formatCurrency(position.averageCostBasis)}</MetricValue>
                </MetricGroup>
                
                <MetricGroup>
                  <MetricLabel>Current Price</MetricLabel>
                  <MetricValue>{formatCurrency(position.currentPrice)}</MetricValue>
                </MetricGroup>
                
                <MetricGroup>
                  <MetricLabel>Unrealized P/L</MetricLabel>
                  <MetricValue 
                    $positive={position.unrealizedPL >= 0} 
                    $negative={position.unrealizedPL < 0}
                  >
                    {formatCurrency(position.unrealizedPL)}
                  </MetricValue>
                </MetricGroup>
                
                <MetricGroup>
                  <MetricLabel>P/L %</MetricLabel>
                  <MetricValue 
                    $positive={position.unrealizedPLPercent >= 0} 
                    $negative={position.unrealizedPLPercent < 0}
                  >
                    {formatPercentage(position.unrealizedPLPercent)}
                  </MetricValue>
                </MetricGroup>
              </PositionMetrics>
            </PositionCard>
          ))}
        </PositionsGrid>
      )}
    </PageContainer>
  );
};

export default PositionsPage;
