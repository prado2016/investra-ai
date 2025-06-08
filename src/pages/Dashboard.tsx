import React, { useState } from 'react';
import styled from 'styled-components';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { useSupabasePortfolios } from '../hooks/useSupabasePortfolios';
import { usePageTitle } from '../hooks/usePageTitle';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import PortfolioCreationForm from '../components/PortfolioCreationForm';
import {
  TotalDailyPLBox,
  RealizedPLBox,
  UnrealizedPLBox,
  DividendIncomeBox,
  TradingFeesBox,
  TradeVolumeBox,
  NetCashFlowBox
} from '../components/SummaryBoxes';

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
`;

const PageHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Title = styled.h1`
  color: #1e293b;
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
`;

const Subtitle = styled.p`
  color: #64748b;
  margin: 0;
  font-size: 1.125rem;
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const PortfolioSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const PortfolioLabel = styled.label`
  font-weight: 500;
  color: #374151;
  font-size: 0.875rem;
`;

const PortfolioSelect = styled.select`
  padding: 0.5rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  
  &:focus {
    outline: none;
    ring: 2px;
    ring-color: #3b82f6;
    border-color: #3b82f6;
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.875rem;
  font-weight: 500;

  &:hover {
    background: #e5e7eb;
    border-color: #9ca3af;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
`;

const LoadingOverlay = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
`;

const ErrorContainer = styled.div`
  text-align: center;
  padding: 2rem;
  color: #dc2626;
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  margin: 1rem 0;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #6b7280;
  background: #f9fafb;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
`;

const LastUpdated = styled.div`
  font-size: 0.75rem;
  color: #9ca3af;
  text-align: center;
  margin-top: 1rem;
`;

interface DashboardProps {}

const Dashboard: React.FC<DashboardProps> = () => {
  const { portfolios, activePortfolio, setActivePortfolio, loading: portfoliosLoading, error: portfoliosError, refreshPortfolios } = useSupabasePortfolios();
  const { metrics, loading: metricsLoading, error: metricsError, refreshMetrics } = useDashboardMetrics();
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);

  // Set dynamic page title
  usePageTitle('Dashboard', { 
    subtitle: activePortfolio ? `${activePortfolio.name} Portfolio` : 'Portfolio Overview' 
  });

  const handlePortfolioChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const portfolioId = event.target.value;
    const portfolio = portfolios.find(p => p.id === portfolioId);
    if (portfolio) {
      setActivePortfolio(portfolio);
    }
  };

  const handleRefresh = async () => {
    await refreshMetrics();
  };

  const togglePrivacyMode = () => {
    setIsPrivacyMode(!isPrivacyMode);
  };

  const handlePortfolioCreated = async () => {
    await refreshPortfolios();
  };

  const loading = portfoliosLoading || metricsLoading;

  if (portfoliosLoading) {
    return (
      <PageContainer>
        <PageHeader>
          <HeaderLeft>
            <Title>Dashboard</Title>
            <Subtitle>Overview of your portfolio performance</Subtitle>
          </HeaderLeft>
        </PageHeader>
        <LoadingOverlay>
          <div>Loading portfolio data...</div>
        </LoadingOverlay>
      </PageContainer>
    );
  }

  if (portfoliosError) {
    return (
      <PageContainer>
        <PageHeader>
          <HeaderLeft>
            <Title>Dashboard</Title>
            <Subtitle>Overview of your portfolio performance</Subtitle>
          </HeaderLeft>
        </PageHeader>
        <ErrorContainer>
          <h3>Error Loading Portfolio Data</h3>
          <p>{portfoliosError}</p>
        </ErrorContainer>
      </PageContainer>
    );
  }

  if (portfolios.length === 0) {
    return (
      <PageContainer>
        <PageHeader>
          <HeaderLeft>
            <Title>Dashboard</Title>
            <Subtitle>Overview of your portfolio performance</Subtitle>
          </HeaderLeft>
        </PageHeader>
        <EmptyState>
          <h3>No Portfolios Found</h3>
          <p>Create your first portfolio to start tracking your investments and view dashboard metrics.</p>
        </EmptyState>
        <PortfolioCreationForm onSuccess={handlePortfolioCreated} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <HeaderLeft>
          <Title>Dashboard</Title>
          <Subtitle>
            {activePortfolio ? `${activePortfolio.name} - Portfolio Performance` : 'Overview of your portfolio performance'}
          </Subtitle>
        </HeaderLeft>
        
        <HeaderActions>
          {portfolios.length > 1 && (
            <PortfolioSelector>
              <PortfolioLabel htmlFor="portfolio-select">Portfolio:</PortfolioLabel>
              <PortfolioSelect
                id="portfolio-select"
                value={activePortfolio?.id || ''}
                onChange={handlePortfolioChange}
              >
                {portfolios.map(portfolio => (
                  <option key={portfolio.id} value={portfolio.id}>
                    {portfolio.name}
                  </option>
                ))}
              </PortfolioSelect>
            </PortfolioSelector>
          )}
          
          <ActionButton onClick={handleRefresh} disabled={loading}>
            <RefreshCw size={16} />
            Refresh
          </ActionButton>
          
          <ActionButton onClick={togglePrivacyMode}>
            {isPrivacyMode ? <Eye size={16} /> : <EyeOff size={16} />}
            {isPrivacyMode ? 'Show' : 'Hide'} Numbers
          </ActionButton>
        </HeaderActions>
      </PageHeader>

      {metricsError && (
        <ErrorContainer>
          <h3>Error Loading Metrics</h3>
          <p>{metricsError}</p>
        </ErrorContainer>
      )}

      {metricsLoading && !metrics && (
        <LoadingOverlay>
          <div>Loading dashboard metrics...</div>
        </LoadingOverlay>
      )}

      {metrics && (
        <>
          <SummaryGrid>
            <TotalDailyPLBox 
              value={metrics.totalDailyPL} 
              isPrivacyMode={isPrivacyMode}
            />
            
            <RealizedPLBox 
              value={metrics.realizedPL} 
              isPrivacyMode={isPrivacyMode}
              subtitle="This month"
            />
            
            <UnrealizedPLBox 
              value={metrics.unrealizedPL} 
              isPrivacyMode={isPrivacyMode}
              subtitle="Current positions"
            />
            
            <DividendIncomeBox 
              value={metrics.dividendIncome} 
              isPrivacyMode={isPrivacyMode}
              subtitle="This month"
            />
            
            <TradingFeesBox 
              value={metrics.tradingFees} 
              isPrivacyMode={isPrivacyMode}
              subtitle="This month"
            />
            
            <TradeVolumeBox 
              value={metrics.tradeVolume} 
              isPrivacyMode={isPrivacyMode}
              subtitle="Today's activity"
            />
            
            <NetCashFlowBox 
              value={metrics.netCashFlow} 
              isPrivacyMode={isPrivacyMode}
              subtitle="Net flow"
            />
          </SummaryGrid>

          <LastUpdated>
            Last updated: {metrics.lastUpdated.toLocaleTimeString()}
          </LastUpdated>
        </>
      )}
    </PageContainer>
  );
};

export default Dashboard;
