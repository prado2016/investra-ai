/**
 * Portfolio Dashboard Component
 * Task 8.4: Update dashboard for multi-portfolio navigation
 * Main dashboard component with multi-portfolio support and navigation
 */

import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Briefcase,
  Settings,
  Plus,
  Mail,
  AlertCircle,
  CheckCircle,
  Clock,
  PieChart,
  Activity,
  Target,
  Zap,
  Shield,
  TrendingUp as OptionsIcon
} from 'lucide-react';
import { usePortfolios } from '../contexts/PortfolioContext';
import PortfolioSelector from './PortfolioSelector';
import PortfolioManagementModal from './PortfolioManagementModal';
import PortfolioTransactionList from './PortfolioTransactionList';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { formatCurrency, formatDate } from '../utils/formatting';
import type { PortfolioTransactionWithAsset } from './PortfolioTransactionList';

const DashboardContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 1rem;
    gap: 1.5rem;
  }
`;

const DashboardHeader = styled.div`
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

const HeaderLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const HeaderTitle = styled.h1`
  margin: 0;
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }

  @media (max-width: 768px) {
    font-size: 1.5rem;
  }
`;

const HeaderSubtitle = styled.p`
  margin: 0;
  color: #6b7280;
  font-size: 1rem;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    justify-content: space-between;
    width: 100%;
  }
`;

const PortfolioSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const PortfolioInfo = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
  border-radius: 16px;
  color: white;

  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }
`;

const PortfolioDetails = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const PortfolioName = styled.h2`
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: white;
`;

const PortfolioMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);

  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const PortfolioActions = styled.div`
  display: flex;
  gap: 0.75rem;

  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const ActionButton = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  backdrop-filter: blur(8px);

  &:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled(Card)`
  padding: 1.5rem;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05);
  }
`;

const StatHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const StatTitle = styled.h3`
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

const StatIcon = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: ${props => props.$color};
  border-radius: 8px;
  color: white;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const StatChange = styled.div<{ $positive?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => props.$positive ? '#059669' : '#dc2626'};

  [data-theme="dark"] & {
    color: ${props => props.$positive ? '#10b981' : '#f87171'};
  }
`;

const QuickActionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const QuickActionCard = styled(Card)`
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 2px solid transparent;

  &:hover {
    border-color: #3b82f6;
    transform: translateY(-2px);
    box-shadow: 0 10px 25px -5px rgb(59 130 246 / 0.1), 0 4px 6px -2px rgb(59 130 246 / 0.05);
  }
`;

const QuickActionIcon = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: ${props => props.$color};
  border-radius: 12px;
  color: white;
  margin-bottom: 1rem;
`;

const QuickActionTitle = styled.h4`
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  font-weight: 600;
  color: #111827;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const QuickActionDescription = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const RecentSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SectionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const SectionTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const EmailStatusIndicator = styled.div<{ $status: 'success' | 'warning' | 'error' | 'info' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  
  ${props => {
    switch (props.$status) {
      case 'success':
        return `
          background: #f0fdf4;
          color: #166534;
          border: 1px solid #bbf7d0;
        `;
      case 'warning':
        return `
          background: #fffbeb;
          color: #d97706;
          border: 1px solid #fed7aa;
        `;
      case 'error':
        return `
          background: #fef2f2;
          color: #dc2626;
          border: 1px solid #fecaca;
        `;
      case 'info':
        return `
          background: #eff6ff;
          color: #2563eb;
          border: 1px solid #bfdbfe;
        `;
    }
  }}

  [data-theme="dark"] & {
    ${props => {
      switch (props.$status) {
        case 'success':
          return `
            background: #064e3b;
            color: #86efac;
            border-color: #166534;
          `;
        case 'warning':
          return `
            background: #78350f;
            color: #fbbf24;
            border-color: #d97706;
          `;
        case 'error':
          return `
            background: #7f1d1d;
            color: #fca5a5;
            border-color: #dc2626;
          `;
        case 'info':
          return `
            background: #1e3a8a;
            color: #93c5fd;
            border-color: #2563eb;
          `;
      }
    }}
  }
`;

interface PortfolioDashboardProps {
  transactions?: PortfolioTransactionWithAsset[];
  loading?: boolean;
  error?: string | null;
  onEditTransaction?: (transaction: PortfolioTransactionWithAsset) => void;
  onDeleteTransaction?: (id: string) => void;
  className?: string;
}

const PortfolioDashboard: React.FC<PortfolioDashboardProps> = ({
  transactions = [],
  loading = false,
  error = null,
  onEditTransaction = () => {},
  onDeleteTransaction = () => {},
  className
}) => {
  const { activePortfolio } = usePortfolios();
  const [showManagementModal, setShowManagementModal] = useState(false);

  // Calculate portfolio statistics
  const portfolioStats = useMemo(() => {
    const activeTransactions = transactions.filter(
      t => t.portfolio_id === activePortfolio?.id
    );

    const stats = {
      totalValue: 0,
      totalTransactions: activeTransactions.length,
      totalBuys: 0,
      totalSells: 0,
      totalDividends: 0,
      recentTransactions: activeTransactions
        .sort((a, b) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime())
        .slice(0, 5),
      // Option strategy statistics
      optionStrategies: {
        coveredCalls: 0,
        totalPremiumCollected: 0,
        activeStrategies: 0,
        strategyCounts: {} as Record<string, number>
      }
    };

    activeTransactions.forEach(transaction => {
      stats.totalValue += Math.abs(transaction.total_amount);
      
      switch (transaction.transaction_type) {
        case 'buy':
          stats.totalBuys += transaction.total_amount;
          break;
        case 'sell':
          stats.totalSells += transaction.total_amount;
          break;
        case 'dividend':
          stats.totalDividends += transaction.total_amount;
          break;
      }

      // Track option strategy statistics
      if (transaction.strategy_type) {
        stats.optionStrategies.activeStrategies++;
        
        // Count each strategy type
        if (!stats.optionStrategies.strategyCounts[transaction.strategy_type]) {
          stats.optionStrategies.strategyCounts[transaction.strategy_type] = 0;
        }
        stats.optionStrategies.strategyCounts[transaction.strategy_type]++;
        
        // Track covered calls specifically
        if (transaction.strategy_type === 'covered_call') {
          stats.optionStrategies.coveredCalls++;
          // For covered calls (selling), we collect premium
          if (transaction.transaction_type === 'sell') {
            stats.optionStrategies.totalPremiumCollected += transaction.total_amount;
          }
        }
      }
    });

    return stats;
  }, [transactions, activePortfolio?.id]);

  // Mock email processing stats (would come from IMAP service in real implementation)
  const emailStats = {
    processed: 42,
    pending: 3,
    failed: 1,
    lastProcessed: new Date().toISOString()
  };

  const getEmailStatusInfo = () => {
    if (emailStats.failed > 0) {
      return { status: 'error' as const, message: `${emailStats.failed} emails failed processing` };
    }
    if (emailStats.pending > 0) {
      return { status: 'warning' as const, message: `${emailStats.pending} emails pending` };
    }
    return { status: 'success' as const, message: 'All emails processed successfully' };
  };

  const emailStatus = getEmailStatusInfo();

  const quickActions = [
    {
      title: 'Add Transaction',
      description: 'Manually add a new transaction',
      icon: Plus,
      color: '#3b82f6',
      onClick: () => {}
    },
    {
      title: 'Import Emails',
      description: 'Process new email confirmations',
      icon: Mail,
      color: '#059669',
      onClick: () => {}
    },
    {
      title: 'Manage Portfolios',
      description: 'Create and edit portfolios',
      icon: Settings,
      color: '#7c3aed',
      onClick: () => setShowManagementModal(true)
    },
    {
      title: 'View Analytics',
      description: 'Detailed portfolio analysis',
      icon: PieChart,
      color: '#f59e0b',
      onClick: () => {}
    }
  ];

  return (
    <>
      <DashboardContainer className={className}>
        <DashboardHeader>
          <HeaderLeft>
            <HeaderTitle>
              <Briefcase size={32} />
              Portfolio Dashboard
            </HeaderTitle>
            <HeaderSubtitle>
              Manage your investments across multiple portfolios
            </HeaderSubtitle>
          </HeaderLeft>
          <HeaderRight>
            <PortfolioSelector
              showCreateButton={true}
              showManageButton={true}
            />
            <Button
              variant="outline"
              onClick={() => setShowManagementModal(true)}
            >
              <Settings size={16} />
              Manage
            </Button>
          </HeaderRight>
        </DashboardHeader>

        {activePortfolio && (
          <PortfolioSection>
            <PortfolioInfo>
              <PortfolioDetails>
                <PortfolioName>{activePortfolio.name}</PortfolioName>
                <PortfolioMeta>
                  <span>{activePortfolio.currency}</span>
                  <span>•</span>
                  <span>Created {formatDate(activePortfolio.created_at)}</span>
                  {activePortfolio.is_default && (
                    <>
                      <span>•</span>
                      <span>Default Portfolio</span>
                    </>
                  )}
                </PortfolioMeta>
              </PortfolioDetails>
              <PortfolioActions>
                <ActionButton onClick={() => {}}>
                  <Activity size={16} />
                  Analytics
                </ActionButton>
                <ActionButton onClick={() => setShowManagementModal(true)}>
                  <Settings size={16} />
                  Settings
                </ActionButton>
              </PortfolioActions>
            </PortfolioInfo>

            <StatsGrid>
              <StatCard>
                <StatHeader>
                  <StatTitle>Total Value</StatTitle>
                  <StatIcon $color="#3b82f6">
                    <DollarSign size={16} />
                  </StatIcon>
                </StatHeader>
                <StatValue>{formatCurrency(portfolioStats.totalValue)}</StatValue>
                <StatChange $positive={true}>
                  <TrendingUp size={14} />
                  +2.4% this month
                </StatChange>
              </StatCard>

              <StatCard>
                <StatHeader>
                  <StatTitle>Transactions</StatTitle>
                  <StatIcon $color="#059669">
                    <BarChart3 size={16} />
                  </StatIcon>
                </StatHeader>
                <StatValue>{portfolioStats.totalTransactions}</StatValue>
                <StatChange $positive={true}>
                  <TrendingUp size={14} />
                  +5 this week
                </StatChange>
              </StatCard>

              <StatCard>
                <StatHeader>
                  <StatTitle>Total Buys</StatTitle>
                  <StatIcon $color="#7c3aed">
                    <Target size={16} />
                  </StatIcon>
                </StatHeader>
                <StatValue>{formatCurrency(portfolioStats.totalBuys)}</StatValue>
                <StatChange $positive={false}>
                  <TrendingDown size={14} />
                  -1.2% this month
                </StatChange>
              </StatCard>

              <StatCard>
                <StatHeader>
                  <StatTitle>Email Processing</StatTitle>
                  <StatIcon $color="#f59e0b">
                    <Zap size={16} />
                  </StatIcon>
                </StatHeader>
                <StatValue>{emailStats.processed}</StatValue>
                <EmailStatusIndicator $status={emailStatus.status}>
                  {emailStatus.status === 'success' && <CheckCircle size={14} />}
                  {emailStatus.status === 'warning' && <Clock size={14} />}
                  {emailStatus.status === 'error' && <AlertCircle size={14} />}
                  {emailStatus.message}
                </EmailStatusIndicator>
              </StatCard>

              {/* Option Strategy Statistics */}
              {portfolioStats.optionStrategies.activeStrategies > 0 && (
                <>
                  <StatCard>
                    <StatHeader>
                      <StatTitle>Covered Calls</StatTitle>
                      <StatIcon $color="#8b5cf6">
                        <Shield size={16} />
                      </StatIcon>
                    </StatHeader>
                    <StatValue>{portfolioStats.optionStrategies.coveredCalls}</StatValue>
                    <StatChange $positive={portfolioStats.optionStrategies.coveredCalls > 0}>
                      <OptionsIcon size={14} />
                      {portfolioStats.optionStrategies.coveredCalls > 0 ? 'Active positions' : 'No positions'}
                    </StatChange>
                  </StatCard>

                  <StatCard>
                    <StatHeader>
                      <StatTitle>Premium Collected</StatTitle>
                      <StatIcon $color="#10b981">
                        <DollarSign size={16} />
                      </StatIcon>
                    </StatHeader>
                    <StatValue>{formatCurrency(portfolioStats.optionStrategies.totalPremiumCollected)}</StatValue>
                    <StatChange $positive={portfolioStats.optionStrategies.totalPremiumCollected > 0}>
                      <TrendingUp size={14} />
                      From covered calls
                    </StatChange>
                  </StatCard>

                  <StatCard>
                    <StatHeader>
                      <StatTitle>Option Strategies</StatTitle>
                      <StatIcon $color="#f59e0b">
                        <Target size={16} />
                      </StatIcon>
                    </StatHeader>
                    <StatValue>{portfolioStats.optionStrategies.activeStrategies}</StatValue>
                    <StatChange $positive={true}>
                      <Activity size={14} />
                      {Object.keys(portfolioStats.optionStrategies.strategyCounts).length} strategy types
                    </StatChange>
                  </StatCard>
                </>
              )}
            </StatsGrid>
          </PortfolioSection>
        )}

        <RecentSection>
          <SectionHeader>
            <SectionTitle>
              <Activity size={20} />
              Quick Actions
            </SectionTitle>
          </SectionHeader>
          <QuickActionsGrid>
            {quickActions.map((action, index) => (
              <QuickActionCard key={index} onClick={action.onClick}>
                <QuickActionIcon $color={action.color}>
                  <action.icon size={24} />
                </QuickActionIcon>
                <QuickActionTitle>{action.title}</QuickActionTitle>
                <QuickActionDescription>{action.description}</QuickActionDescription>
              </QuickActionCard>
            ))}
          </QuickActionsGrid>
        </RecentSection>

        <RecentSection>
          <PortfolioTransactionList
            transactions={transactions}
            loading={loading}
            error={error}
            onEdit={onEditTransaction}
            onDelete={onDeleteTransaction}
            showPortfolioFilter={true}
            showSummaryStats={false}
            title="Recent Transactions"
          />
        </RecentSection>
      </DashboardContainer>

      <PortfolioManagementModal
        isOpen={showManagementModal}
        onClose={() => setShowManagementModal(false)}
      />
    </>
  );
};

export default PortfolioDashboard;