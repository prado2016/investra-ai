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
`;

const SectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 1rem 0;
`;

const TransactionCard = styled.div`
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  margin-bottom: 0.5rem;
  background: #f9fafb;
`;

const TransactionHeader = styled.div`
  font-weight: 500;
  color: #1e293b;
  margin-bottom: 0.25rem;
`;

const TransactionDetails = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
`;

const Summary: React.FC = () => {
  const { portfolios, activePortfolio, loading: portfoliosLoading, error: portfoliosError, setActivePortfolio: _setActivePortfolio, refreshPortfolios } = usePortfolios();
  const [selectedDayData, setSelectedDayData] = useState<DailyPLData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { orphanTransactions } = useDailyPL(activePortfolio?.id || null);

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
                  <SectionTitle>Transactions</SectionTitle>
                  {selectedDayData.transactions.map(transaction => (
                    <TransactionCard key={transaction.id}>
                      <TransactionHeader>
                        {transaction.asset.symbol} - {transaction.transaction_type.toUpperCase()}
                      </TransactionHeader>
                      <TransactionDetails>
                        Quantity: {transaction.quantity} | Price: ${transaction.price} | Total: ${transaction.total_amount}
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
