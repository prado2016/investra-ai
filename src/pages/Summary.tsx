import React, { useState } from 'react';
import styled from 'styled-components';
import MonthlyCalendar from '../components/MonthlyCalendar';
import PortfolioCreationForm from '../components/PortfolioCreationForm';
import { usePortfolios } from '../contexts/PortfolioContext';
import { usePageTitle } from '../hooks/usePageTitle';
import { useDailyPL } from '../hooks/useDailyPL';
import OrphanTransactionsPanel from '../components/OrphanTransactionsPanel';
import PortfolioSelectorComponent from '../components/PortfolioSelector';
import type { DailyPLData } from '../services/analytics/dailyPLService';

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
`;

const PageSubtitle = styled.p`
  font-size: 1.125rem;
  color: #64748b;
  margin: 0;
`;


const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 3rem;
  color: #6b7280;
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

const DayDetailsModal = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: ${props => props.$isOpen ? 'flex' : 'none'};
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #e5e7eb;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  
  &:hover {
    color: #374151;
  }
`;

const MetricRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f3f4f6;
  
  &:last-child {
    border-bottom: none;
  }
`;

const MetricLabel = styled.span`
  font-weight: 500;
  color: #374151;
`;

const MetricValue = styled.span<{ $positive?: boolean; $negative?: boolean }>`
  font-weight: 600;
  color: ${props => 
    props.$positive ? '#16a34a' : 
    props.$negative ? '#dc2626' : 
    '#1e293b'
  };
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
`;

const TransactionsSection = styled.div`
  margin-top: 1.5rem;
  
  @media (max-width: 768px) {
    margin-top: 1rem;
  }
`;

const SectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 1rem 0;
`;

const TransactionCard = styled.div`
  padding: 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #d1d5db;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }
  
  &:last-child {
    margin-bottom: 0;
  }
  
  @media (max-width: 768px) {
    padding: 0.75rem;
    margin-bottom: 0.5rem;
  }
`;

const TransactionHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.5rem;
  font-size: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }
`;

const TransactionDetails = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  font-size: 0.875rem;
  color: #6b7280;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 0.25rem;
  }
`;

const TransactionMetric = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
`;

const TransactionMetricLabel = styled.span`
  font-size: 0.75rem;
  color: #9ca3af;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const TransactionMetricValue = styled.span<{ $positive?: boolean; $negative?: boolean }>`
  font-weight: 600;
  font-size: 0.875rem;
  color: ${props => 
    props.$positive ? '#059669' : 
    props.$negative ? '#dc2626' : 
    '#374151'
  };
`;

const PortfolioBadge = styled.span`
  background: #f3f4f6;
  color: #4b5563;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 500;
  border: 1px solid #e5e7eb;
  
  @media (max-width: 768px) {
    align-self: flex-start;
  }
`;

const TransactionType = styled.span<{ $type: string }>`
  background: ${props => {
    switch (props.$type.toLowerCase()) {
      case 'buy': return '#dcfce7';
      case 'sell': return '#fee2e2';
      case 'dividend': return '#fef3c7';
      default: return '#f3f4f6';
    }
  }};
  color: ${props => {
    switch (props.$type.toLowerCase()) {
      case 'buy': return '#166534';
      case 'sell': return '#991b1b';
      case 'dividend': return '#92400e';
      default: return '#374151';
    }
  }};
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const Summary: React.FC = () => {
  const { portfolios, activePortfolio, loading: portfoliosLoading, error: portfoliosError, setActivePortfolio: _setActivePortfolio, refreshPortfolios } = usePortfolios();
  const [selectedDayData, setSelectedDayData] = useState<DailyPLData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { orphanTransactions } = useDailyPL(activePortfolio?.id || null);

  // Helper function to get portfolio name by ID
  const getPortfolioName = (portfolioId: string): string => {
    const portfolio = portfolios.find(p => p.id === portfolioId);
    return portfolio ? portfolio.name : 'Unknown Portfolio';
  };

  // Set page title
  usePageTitle('Summary', { subtitle: 'Portfolio Performance' });

  const handleDayClick = (dayData: DailyPLData) => {
    console.log('🔍 SUMMARY_DEBUG: Day click received in Summary page:', {
      receivedData: dayData,
      date: dayData.date,
      transactionCount: dayData.transactionCount,
      totalPL: dayData.totalPL,
      hasTransactions: dayData.hasTransactions,
      transactions: dayData.transactions?.length || 0,
      colorCategory: dayData.colorCategory,
      timestamp: new Date().toISOString()
    });
    
    setSelectedDayData(dayData);
    setIsModalOpen(true);
    
    console.log('🔍 SUMMARY_DEBUG: Modal state set:', {
      modalOpen: true,
      selectedDataSet: !!dayData,
      timestamp: new Date().toISOString()
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDayData(null);
  };


  const handlePortfolioCreated = async () => {
    await refreshPortfolios();
  };

  const formatValue = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  if (portfoliosLoading) {
    return (
      <PageContainer>
        <PageHeader>
          <PageTitle>Portfolio Summary</PageTitle>
          <PageSubtitle>
            Monthly calendar view of your daily performance and portfolio insights
          </PageSubtitle>
        </PageHeader>
        <LoadingContainer>
          <div>Loading portfolio data...</div>
        </LoadingContainer>
      </PageContainer>
    );
  }

  if (portfoliosError) {
    return (
      <PageContainer>
        <PageHeader>
          <PageTitle>Portfolio Summary</PageTitle>
          <PageSubtitle>
            Monthly calendar view of your daily performance and portfolio insights
          </PageSubtitle>
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
          <PageTitle>Portfolio Summary</PageTitle>
          <PageSubtitle>
            Monthly calendar view of your daily performance and portfolio insights
          </PageSubtitle>
        </PageHeader>
        <ErrorContainer>
          <h3>No Portfolios Found</h3>
          <p>Create your first portfolio to start viewing your monthly performance summary.</p>
        </ErrorContainer>
        <PortfolioCreationForm onSuccess={handlePortfolioCreated} />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>Portfolio Summary</PageTitle>
        <PageSubtitle>
          Monthly calendar view of your daily performance and portfolio insights
        </PageSubtitle>
      </PageHeader>

      {portfolios.length > 1 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <PortfolioSelectorComponent />
        </div>
      )}
      
      <MonthlyCalendar
        portfolioId={activePortfolio?.id || null}
        onDayClick={handleDayClick}
      />
      {orphanTransactions.length > 0 && (
        <OrphanTransactionsPanel transactions={orphanTransactions} />
      )}

      <DayDetailsModal $isOpen={isModalOpen}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>
              {selectedDayData ? `Daily Details - ${selectedDayData.date}` : 'Daily Details'}
            </ModalTitle>
            <CloseButton onClick={handleCloseModal}>×</CloseButton>
          </ModalHeader>
          
          {selectedDayData && (
            <div>
              <MetricRow>
                <MetricLabel>Total P/L:</MetricLabel>
                <MetricValue 
                  $positive={selectedDayData.totalPL > 0}
                  $negative={selectedDayData.totalPL < 0}
                >
                  {formatValue(selectedDayData.totalPL)}
                </MetricValue>
              </MetricRow>
              
              <MetricRow>
                <MetricLabel>Realized P/L:</MetricLabel>
                <MetricValue 
                  $positive={selectedDayData.realizedPL > 0}
                  $negative={selectedDayData.realizedPL < 0}
                >
                  {formatValue(selectedDayData.realizedPL)}
                </MetricValue>
              </MetricRow>
              
              <MetricRow>
                <MetricLabel>Unrealized P/L:</MetricLabel>
                <MetricValue 
                  $positive={selectedDayData.unrealizedPL > 0}
                  $negative={selectedDayData.unrealizedPL < 0}
                >
                  {formatValue(selectedDayData.unrealizedPL)}
                </MetricValue>
              </MetricRow>
              
              <MetricRow>
                <MetricLabel>Dividend Income:</MetricLabel>
                <MetricValue $positive={selectedDayData.dividendIncome > 0}>
                  {formatValue(selectedDayData.dividendIncome)}
                </MetricValue>
              </MetricRow>
              
              <MetricRow>
                <MetricLabel>Total Fees:</MetricLabel>
                <MetricValue $negative={selectedDayData.totalFees > 0}>
                  {formatValue(selectedDayData.totalFees)}
                </MetricValue>
              </MetricRow>
              
              <MetricRow>
                <MetricLabel>Trade Volume:</MetricLabel>
                <MetricValue>
                  {formatValue(selectedDayData.tradeVolume)}
                </MetricValue>
              </MetricRow>
              
              <MetricRow>
                <MetricLabel>Transactions:</MetricLabel>
                <MetricValue>
                  {selectedDayData.transactionCount}
                </MetricValue>
              </MetricRow>
              
              <MetricRow>
                <MetricLabel>Total P/L:</MetricLabel>
                <MetricValue 
                  $positive={selectedDayData.totalPL > 0}
                  $negative={selectedDayData.totalPL < 0}
                >
                  {formatValue(selectedDayData.totalPL)}
                </MetricValue>
              </MetricRow>
              
              {selectedDayData.transactions && selectedDayData.transactions.length > 0 && (
                <TransactionsSection>
                  <SectionTitle>Transactions ({selectedDayData.transactions.length})</SectionTitle>
                  {selectedDayData.transactions.map(transaction => (
                    <TransactionCard key={transaction.id}>
                      <TransactionHeader>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <span style={{ fontWeight: '700', fontSize: '1.1rem' }}>
                            {transaction.asset.symbol}
                          </span>
                          <TransactionType $type={transaction.transaction_type}>
                            {transaction.transaction_type}
                          </TransactionType>
                        </div>
                        <PortfolioBadge>
                          {getPortfolioName(transaction.portfolio_id)}
                        </PortfolioBadge>
                      </TransactionHeader>
                      
                      <TransactionDetails>
                        <TransactionMetric>
                          <TransactionMetricLabel>Quantity</TransactionMetricLabel>
                          <TransactionMetricValue>{transaction.quantity.toLocaleString()}</TransactionMetricValue>
                        </TransactionMetric>
                        
                        <TransactionMetric>
                          <TransactionMetricLabel>Price</TransactionMetricLabel>
                          <TransactionMetricValue>${transaction.price.toFixed(2)}</TransactionMetricValue>
                        </TransactionMetric>
                        
                        <TransactionMetric>
                          <TransactionMetricLabel>Total Amount</TransactionMetricLabel>
                          <TransactionMetricValue 
                            $positive={transaction.transaction_type === 'sell' && transaction.total_amount > 0}
                            $negative={transaction.transaction_type === 'buy' || transaction.total_amount < 0}
                          >
                            ${Math.abs(transaction.total_amount).toFixed(2)}
                          </TransactionMetricValue>
                        </TransactionMetric>
                        
                        {transaction.fees && transaction.fees > 0 && (
                          <TransactionMetric>
                            <TransactionMetricLabel>Fees</TransactionMetricLabel>
                            <TransactionMetricValue $negative={true}>
                              ${transaction.fees.toFixed(2)}
                            </TransactionMetricValue>
                          </TransactionMetric>
                        )}
                        
                        {transaction.asset.name && transaction.asset.name !== transaction.asset.symbol && (
                          <TransactionMetric style={{ gridColumn: 'span 2' }}>
                            <TransactionMetricLabel>Asset Name</TransactionMetricLabel>
                            <TransactionMetricValue style={{ fontSize: '0.8rem' }}>
                              {transaction.asset.name}
                            </TransactionMetricValue>
                          </TransactionMetric>
                        )}
                        
                        {transaction.notes && (
                          <TransactionMetric style={{ gridColumn: 'span 2' }}>
                            <TransactionMetricLabel>Notes</TransactionMetricLabel>
                            <TransactionMetricValue style={{ fontSize: '0.8rem' }}>
                              {transaction.notes}
                            </TransactionMetricValue>
                          </TransactionMetric>
                        )}
                      </TransactionDetails>
                    </TransactionCard>
                  ))}
                </TransactionsSection>
              )}
            </div>
          )}
        </ModalContent>
      </DayDetailsModal>
    </PageContainer>
  );
};

export default Summary;
