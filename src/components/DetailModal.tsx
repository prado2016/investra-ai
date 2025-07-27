import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { X, TrendingUp, TrendingDown, Calendar, DollarSign } from 'lucide-react';
import { usePortfolios } from '../contexts/PortfolioContext';
import { dailyPLAnalyticsService } from '../services/analytics/dailyPLService';
import { totalReturnAnalyticsService } from '../services/analytics/totalReturnService';
import { SupabaseService } from '../services/supabaseService';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled.div`
  background: white;
  border-radius: 12px;
  padding: 2rem;
  width: 90%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  position: relative;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const ModalTitle = styled.h2`
  font-size: 1.5rem;
  color: #1e293b;
  margin: 0;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  color: #64748b;
  &:hover {
    color: #334155;
  }
`;

const ModalBody = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const MetricSummary = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
`;

const SummaryCard = styled.div`
  background: #f8fafc;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
`;

const SummaryLabel = styled.div`
  font-size: 0.875rem;
  color: #64748b;
  margin-bottom: 0.25rem;
`;

const SummaryValue = styled.div<{ positive?: boolean; negative?: boolean }>`
  font-size: 1.25rem;
  font-weight: 600;
  color: ${props => 
    props.positive ? '#059669' : 
    props.negative ? '#dc2626' : '#1f2937'
  };
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DetailSection = styled.div`
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
`;

const SectionHeader = styled.div`
  background: #f9fafb;
  padding: 1rem;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  color: #374151;
`;

const SectionContent = styled.div`
  padding: 1rem;
`;

const DataTable = styled.table`
  width: 100%;
  border-collapse: collapse;
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 0.75rem;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  font-weight: 600;
  color: #374151;
`;

const TableCell = styled.td`
  padding: 0.75rem;
  border-bottom: 1px solid #f1f5f9;
  color: #64748b;
`;

const LoadingContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
  color: #64748b;
`;

const ErrorContainer = styled.div`
  padding: 1rem;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #dc2626;
`;

interface DetailModalProps {
  metric: string;
  onClose: () => void;
}

interface MetricData {
  currentValue: number;
  previousValue: number;
  change: number;
  changePercent: number;
  breakdown: Array<{
    label: string;
    value: number;
    date?: string;
    portfolio?: string;
  }>;
  timeSeriesData: Array<{
    date: string;
    value: number;
  }>;
}

const DetailModal: React.FC<DetailModalProps> = ({ metric, onClose }) => {
  const { activePortfolio, portfolios } = usePortfolios();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<MetricData | null>(null);

  const getModalTitle = (metricKey: string) => {
    switch (metricKey) {
      case 'totalDailyPL': return 'Total Daily Profit & Loss Details';
      case 'totalReturn': return 'Total Return Details';
      case 'realizedPL': return 'Realized Profit & Loss Details';
      case 'unrealizedPL': return 'Unrealized Profit & Loss Details';
      case 'dividendIncome': return 'Dividend Income Details';
      case 'tradingFees': return 'Trading Fees Details';
      case 'tradeVolume': return 'Trade Volume Details';
      case 'netCashFlow': return 'Net Cash Flow Details';
      case 'netDeposits': return 'Net Deposits Details';
      case 'timeWeightedReturnRate': return 'Time-Weighted Return Rate Details';
      default: return 'Metric Details';
    }
  };

  useEffect(() => {
    const fetchMetricDetails = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const targetPortfolios = activePortfolio ? [activePortfolio] : portfolios;
        if (targetPortfolios.length === 0) {
          setError('No portfolios available');
          return;
        }

        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const lastWeek = new Date(today);
        lastWeek.setDate(lastWeek.getDate() - 7);

        let metricData: MetricData = {
          currentValue: 0,
          previousValue: 0,
          change: 0,
          changePercent: 0,
          breakdown: [],
          timeSeriesData: []
        };

        switch (metric) {
          case 'totalDailyPL': {
            // Fetch today's and yesterday's P/L for comparison
            let todayPL = 0;
            let yesterdayPL = 0;
            const breakdown: Array<{ label: string; value: number; portfolio?: string }> = [];
            
            for (const portfolio of targetPortfolios) {
              const todayResult = await dailyPLAnalyticsService.getDayPLDetails(portfolio.id, today);
              const yesterdayResult = await dailyPLAnalyticsService.getDayPLDetails(portfolio.id, yesterday);
              
              const todayValue = todayResult.data?.totalPL || 0;
              const yesterdayValue = yesterdayResult.data?.totalPL || 0;
              
              todayPL += todayValue;
              yesterdayPL += yesterdayValue;
              
              if (targetPortfolios.length > 1) {
                breakdown.push({
                  label: portfolio.name,
                  value: todayValue,
                  portfolio: portfolio.name
                });
              }
              
              // Add transaction breakdown for today
              if (todayResult.data?.transactions) {
                todayResult.data.transactions.forEach(tx => {
                  breakdown.push({
                    label: `${(tx as any).symbol || 'Unknown'} - ${tx.transaction_type}`,
                    value: (tx as any).profit_loss || 0,
                    portfolio: portfolio.name
                  });
                });
              }
            }
            
            metricData = {
              currentValue: todayPL,
              previousValue: yesterdayPL,
              change: todayPL - yesterdayPL,
              changePercent: yesterdayPL !== 0 ? ((todayPL - yesterdayPL) / Math.abs(yesterdayPL)) * 100 : 0,
              breakdown,
              timeSeriesData: [] // Would fetch time series data here
            };
            break;
          }

          case 'realizedPL': {
            // Fetch monthly realized P/L data
            let monthlyRealizedPL = 0;
            const prevMonthRealizedPL = 0;
            const realizedBreakdown: Array<{ label: string; value: number; portfolio?: string }> = [];
            
            for (const portfolio of targetPortfolios) {
              const monthResult = await dailyPLAnalyticsService.getCurrentMonthPL(portfolio.id);
              const realizedValue = monthResult.data?.totalRealizedPL || 0;
              
              monthlyRealizedPL += realizedValue;
              
              if (targetPortfolios.length > 1) {
                realizedBreakdown.push({
                  label: portfolio.name,
                  value: realizedValue,
                  portfolio: portfolio.name
                });
              }
            }
            
            metricData = {
              currentValue: monthlyRealizedPL,
              previousValue: prevMonthRealizedPL,
              change: monthlyRealizedPL - prevMonthRealizedPL,
              changePercent: 0,
              breakdown: realizedBreakdown,
              timeSeriesData: []
            };
            break;
          }

          case 'unrealizedPL': {
            // Fetch current positions and calculate unrealized P/L
            let unrealizedPL = 0;
            const positionsBreakdown: Array<{ label: string; value: number; portfolio?: string }> = [];
            
            for (const portfolio of targetPortfolios) {
              const positionsResult = await SupabaseService.position.getPositions(portfolio.id);
              
              if (positionsResult.success && positionsResult.data) {
                positionsResult.data.forEach(position => {
                  // Placeholder calculation - in reality you'd use current market price
                  const estimatedValue = position.quantity * position.average_cost_basis;
                  const costBasis = position.total_cost_basis;
                  const positionPL = estimatedValue - costBasis;
                  
                  unrealizedPL += positionPL;
                  
                  positionsBreakdown.push({
                    label: (position as any).symbol || 'Unknown',
                    value: positionPL,
                    portfolio: portfolio.name
                  });
                });
              }
            }
            
            metricData = {
              currentValue: unrealizedPL,
              previousValue: 0,
              change: 0,
              changePercent: 0,
              breakdown: positionsBreakdown,
              timeSeriesData: []
            };
            break;
          }

          case 'totalReturn': {
            // Fetch total return data
            let totalReturn = 0;
            let totalReturnPercent = 0;
            const returnBreakdown: Array<{ label: string; value: number; portfolio?: string }> = [];
            
            for (const portfolio of targetPortfolios) {
              const returnResult = await totalReturnAnalyticsService.calculateTotalReturn(
                portfolio.id,
                { includeDividends: true, includeFees: true }
              );
              
              if (returnResult.data) {
                totalReturn += returnResult.data.totalReturn || 0;
                totalReturnPercent += returnResult.data.totalReturnPercent || 0;
                
                if (targetPortfolios.length > 1) {
                  returnBreakdown.push({
                    label: portfolio.name,
                    value: returnResult.data.totalReturn || 0,
                    portfolio: portfolio.name
                  });
                }
              }
            }
            
            if (targetPortfolios.length > 1) {
              totalReturnPercent = totalReturnPercent / targetPortfolios.length;
            }
            
            metricData = {
              currentValue: totalReturn,
              previousValue: 0,
              change: 0,
              changePercent: totalReturnPercent,
              breakdown: returnBreakdown,
              timeSeriesData: []
            };
            break;
          }

          default:
            // For other metrics, show placeholder data
            metricData = {
              currentValue: 0,
              previousValue: 0,
              change: 0,
              changePercent: 0,
              breakdown: [
                { label: 'Data not available', value: 0 }
              ],
              timeSeriesData: []
            };
        }

        setData(metricData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load metric details');
      } finally {
        setLoading(false);
      }
    };

    fetchMetricDetails();
  }, [metric, activePortfolio, portfolios]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  return (
    <ModalOverlay onClick={onClose}>
      <ModalContent onClick={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>{getModalTitle(metric)}</ModalTitle>
          <CloseButton onClick={onClose}>
            <X size={24} />
          </CloseButton>
        </ModalHeader>
        
        <ModalBody>
          {loading ? (
            <LoadingContainer>Loading metric details...</LoadingContainer>
          ) : error ? (
            <ErrorContainer>Error: {error}</ErrorContainer>
          ) : data ? (
            <>
              <MetricSummary>
                <SummaryCard>
                  <SummaryLabel>Current Value</SummaryLabel>
                  <SummaryValue positive={data.currentValue > 0} negative={data.currentValue < 0}>
                    <DollarSign size={20} />
                    {formatCurrency(data.currentValue)}
                  </SummaryValue>
                </SummaryCard>
                
                {data.change !== 0 && (
                  <SummaryCard>
                    <SummaryLabel>Change (from previous)</SummaryLabel>
                    <SummaryValue positive={data.change > 0} negative={data.change < 0}>
                      {data.change > 0 ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                      {formatCurrency(data.change)}
                    </SummaryValue>
                  </SummaryCard>
                )}
                
                {data.changePercent !== 0 && (
                  <SummaryCard>
                    <SummaryLabel>Percentage Change</SummaryLabel>
                    <SummaryValue positive={data.changePercent > 0} negative={data.changePercent < 0}>
                      {formatPercent(data.changePercent)}
                    </SummaryValue>
                  </SummaryCard>
                )}
                
                <SummaryCard>
                  <SummaryLabel>Last Updated</SummaryLabel>
                  <SummaryValue>
                    <Calendar size={20} />
                    {new Date().toLocaleString()}
                  </SummaryValue>
                </SummaryCard>
              </MetricSummary>

              {data.breakdown && data.breakdown.length > 0 && (
                <DetailSection>
                  <SectionHeader>Breakdown</SectionHeader>
                  <SectionContent>
                    <DataTable>
                      <thead>
                        <tr>
                          <TableHeader>Item</TableHeader>
                          {portfolios.length > 1 && <TableHeader>Portfolio</TableHeader>}
                          <TableHeader>Value</TableHeader>
                        </tr>
                      </thead>
                      <tbody>
                        {data.breakdown.map((item, index) => (
                          <tr key={index}>
                            <TableCell>{item.label}</TableCell>
                            {portfolios.length > 1 && <TableCell>{item.portfolio || '-'}</TableCell>}
                            <TableCell 
                              style={{ 
                                color: item.value > 0 ? '#059669' : item.value < 0 ? '#dc2626' : '#64748b',
                                fontWeight: '600'
                              }}
                            >
                              {formatCurrency(item.value)}
                            </TableCell>
                          </tr>
                        ))}
                      </tbody>
                    </DataTable>
                  </SectionContent>
                </DetailSection>
              )}
            </>
          ) : null}
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
};

export default DetailModal;
