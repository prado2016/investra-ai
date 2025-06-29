import React, { useState } from 'react';
import styled from 'styled-components';
import { Eye, EyeOff, RefreshCw } from 'lucide-react';
import { usePortfolios } from '../contexts/PortfolioContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { useDashboardMetrics } from '../hooks/useDashboardMetrics';
import PortfolioCreationForm from '../components/PortfolioCreationForm';
import PortfolioPerformanceChart from '../components/PortfolioPerformanceChart';
import CustomSelect from '../components/CustomSelect';
import {
  TotalDailyPLBox,
  RealizedPLBox,
  UnrealizedPLBox,
  DividendIncomeBox,
  TradingFeesBox,
  TradeVolumeBox,
  NetCashFlowBox,
  TotalReturnBox,
  NetDepositsBox,
  TimeWeightedReturnRateBox
} from '../components/SummaryBoxes';


const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1600px;
  margin: 0 auto;
`;

const DashboardLayout = styled.div`
  display: grid;
  grid-template-columns: 3fr 1fr;
  gap: 2rem;

  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
  }
`;

const MainContent = styled.div`
  display: flex;
  flex-direction: column;
`;

const Sidebar = styled.aside`
  background: #f9fafb;
  padding: 1.5rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
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

// const PortfolioSelect = styled.select`
//   padding: 0.5rem 1rem;
//   border: 1px solid #d1d5db;
//   border-radius: 6px;
//   background: white;
//   color: #374151;
//   font-size: 0.875rem;
//   cursor: pointer;
//   
//   &:focus {
//     outline: none;
//     ring: 2px;
//     ring-color: #3b82f6;
//     border-color: #3b82f6;
//   }
// `;

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

import { SkeletonSummaryGrid } from '../components/SkeletonLoading';

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

import Tooltip from '../components/Tooltip';
import DetailModal from '../components/DetailModal';

const LastUpdated = styled.div`
  font-size: 0.75rem;
  color: #9ca3af;
  text-align: center;
  margin-top: 1rem;
`;

const Dashboard: React.FC = () => {
  const { portfolios, activePortfolio, setActivePortfolio, loading: portfoliosLoading, error: portfoliosError, refreshPortfolios } = usePortfolios();
  const { metrics, loading: metricsLoading, error: metricsError, refreshMetrics } = useDashboardMetrics();
  const [isPrivacyMode, setIsPrivacyMode] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Set dynamic page title
  usePageTitle('Dashboard', { 
    subtitle: activePortfolio ? `${activePortfolio.name} Portfolio` : 'Portfolio Overview' 
  });

  const handlePortfolioChange = (portfolioId: string) => {
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
        <SkeletonSummaryGrid count={8} />
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
              <CustomSelect
                options={portfolios.map(p => ({ value: p.id, label: p.name }))}
                value={activePortfolio?.id || ''}
                onChange={handlePortfolioChange}
              />
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
        <DashboardLayout>
          <MainContent>
            <SkeletonSummaryGrid count={8} />
          </MainContent>
          <Sidebar>
            <SkeletonSummaryGrid count={1} />
          </Sidebar>
        </DashboardLayout>
      )}

      {metrics && (
        <>
          <DashboardLayout>
            <MainContent>
              <PortfolioPerformanceChart />
              <SummaryGrid>
                <TotalDailyPLBox 
                  value={metrics.totalDailyPL} 
                  isPrivacyMode={isPrivacyMode}
                  onClick={() => {
                    setSelectedMetric('totalDailyPL');
                    setIsModalOpen(true);
                  }}
                />
                
                <TotalReturnBox 
                  value={metrics.totalReturn} 
                  isPrivacyMode={isPrivacyMode}
                  subtitle="All-time performance"
                  percentValue={metrics.totalReturnPercent}
                  onClick={() => {
                    setSelectedMetric('totalReturn');
                    setIsModalOpen(true);
                  }}
                />
                
                <RealizedPLBox 
                  value={metrics.realizedPL} 
                  isPrivacyMode={isPrivacyMode}
                  subtitle="This month"
                  onClick={() => {
                    setSelectedMetric('realizedPL');
                    setIsModalOpen(true);
                  }}
                />
                
                <UnrealizedPLBox 
                  value={metrics.unrealizedPL} 
                  isPrivacyMode={isPrivacyMode}
                  subtitle="Current positions"
                  onClick={() => {
                    setSelectedMetric('unrealizedPL');
                    setIsModalOpen(true);
                  }}
                />
                
                <DividendIncomeBox 
                  value={metrics.dividendIncome} 
                  isPrivacyMode={isPrivacyMode}
                  subtitle="This month"
                  onClick={() => {
                    setSelectedMetric('dividendIncome');
                    setIsModalOpen(true);
                  }}
                />
                
                <TradingFeesBox 
                  value={metrics.tradingFees} 
                  isPrivacyMode={isPrivacyMode}
                  subtitle="This month"
                  onClick={() => {
                    setSelectedMetric('tradingFees');
                    setIsModalOpen(true);
                  }}
                />
                
                <TradeVolumeBox 
                  value={metrics.tradeVolume} 
                  isPrivacyMode={isPrivacyMode}
                  subtitle="Today's activity"
                  onClick={() => {
                    setSelectedMetric('tradeVolume');
                    setIsModalOpen(true);
                  }}
                />
                
                <NetCashFlowBox 
                  value={metrics.netCashFlow} 
                  isPrivacyMode={isPrivacyMode}
                  subtitle="Net flow"
                  onClick={() => {
                    setSelectedMetric('netCashFlow');
                    setIsModalOpen(true);
                  }}
                />

                <NetDepositsBox
                  value={metrics.netDeposits}
                  isPrivacyMode={isPrivacyMode}
                  onClick={() => {
                    setSelectedMetric('netDeposits');
                    setIsModalOpen(true);
                  }}
                />

                <TimeWeightedReturnRateBox
                  value={metrics.timeWeightedReturnRate}
                  isPrivacyMode={isPrivacyMode}
                  onClick={() => {
                    setSelectedMetric('timeWeightedReturnRate');
                    setIsModalOpen(true);
                  }}
                />
              </SummaryGrid>

              <LastUpdated>
                <Tooltip text={`Data as of ${metrics.lastUpdated.toLocaleString()}`}>
                  Last updated: {metrics.lastUpdated.toLocaleTimeString()}
                </Tooltip>
              </LastUpdated>
            </MainContent>
            <Sidebar>
              <h4>Portfolio Allocation</h4>
              {/* Donut chart will go here */}
            </Sidebar>
          </DashboardLayout>
          {isModalOpen && selectedMetric && (
            <DetailModal
              metric={selectedMetric}
              onClose={() => setIsModalOpen(false)}
            />
          )}
        </>
      )}
    </PageContainer>
  );
};

export default Dashboard;
