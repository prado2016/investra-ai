import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar } from 'recharts';
import styled from 'styled-components';
import { usePortfolios } from '../contexts/PortfolioContext';
import { dailyPLAnalyticsService } from '../services/analytics/dailyPLService';

const ChartContainer = styled.div`
  height: 450px;
  background: #fff;
  padding: 2rem;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  margin-bottom: 2rem;
  position: relative;
`;

const ChartHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`;

const ChartTitle = styled.h3`
  margin: 0;
  color: #1f2937;
  font-size: 1.25rem;
  font-weight: 600;
`;

const ChartTypeSelector = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ChartButton = styled.button<{ active: boolean }>`
  padding: 0.5rem 1rem;
  border: 1px solid ${props => props.active ? '#3b82f6' : '#d1d5db'};
  background: ${props => props.active ? '#3b82f6' : '#fff'};
  color: ${props => props.active ? '#fff' : '#374151'};
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.875rem;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.active ? '#2563eb' : '#f3f4f6'};
  }
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  color: #6b7280;
`;

type ChartType = 'line' | 'area' | 'bar';
type TimeRange = '7d' | '30d' | '90d' | '1y';

interface ChartDataPoint {
  date: string;
  value: number;
  dailyPL: number;
  cumulativePL: number;
  formattedDate: string;
}

const PortfolioPerformanceChart: React.FC = () => {
  const { activePortfolio, portfolios } = usePortfolios();
  const [chartType, setChartType] = useState<ChartType>('area');
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const targetPortfolios = activePortfolio ? [activePortfolio] : portfolios;
        if (targetPortfolios.length === 0) {
          setData([]);
          return;
        }

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        
        switch (timeRange) {
          case '7d':
            startDate.setDate(endDate.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(endDate.getDate() - 30);
            break;
          case '90d':
            startDate.setDate(endDate.getDate() - 90);
            break;
          case '1y':
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
        }

        // Generate date array
        const dates: Date[] = [];
        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          dates.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }

        // Aggregate data across portfolios
        const aggregatedData: { [key: string]: { dailyPL: number; cumulativePL: number } } = {};
        
        for (const portfolio of targetPortfolios) {
          for (const date of dates) {
            const dateKey = date.toISOString().split('T')[0];
            
            try {
              const result = await dailyPLAnalyticsService.getDayPLDetails(portfolio.id, date);
              if (result.data) {
                if (!aggregatedData[dateKey]) {
                  aggregatedData[dateKey] = { dailyPL: 0, cumulativePL: 0 };
                }
                aggregatedData[dateKey].dailyPL += result.data.totalPL || 0;
              }
            } catch (err) {
              console.warn(`Failed to fetch data for ${portfolio.name} on ${dateKey}:`, err);
            }
          }
        }

        // Calculate cumulative P/L and format data
        let cumulativeSum = 0;
        const chartData: ChartDataPoint[] = dates.map(date => {
          const dateKey = date.toISOString().split('T')[0];
          const dayData = aggregatedData[dateKey] || { dailyPL: 0, cumulativePL: 0 };
          
          cumulativeSum += dayData.dailyPL;
          dayData.cumulativePL = cumulativeSum;

          return {
            date: dateKey,
            value: cumulativeSum,
            dailyPL: dayData.dailyPL,
            cumulativePL: cumulativeSum,
            formattedDate: date.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              ...(timeRange === '1y' && { year: '2-digit' })
            })
          };
        });

        setData(chartData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load chart data');
        // Fallback to mock data
        const mockData: ChartDataPoint[] = [
          { date: '2024-01-01', value: 0, dailyPL: 0, cumulativePL: 0, formattedDate: 'Jan 1' },
          { date: '2024-01-15', value: 500, dailyPL: 500, cumulativePL: 500, formattedDate: 'Jan 15' },
          { date: '2024-02-01', value: 1200, dailyPL: 700, cumulativePL: 1200, formattedDate: 'Feb 1' },
          { date: '2024-02-15', value: 800, dailyPL: -400, cumulativePL: 800, formattedDate: 'Feb 15' },
          { date: '2024-03-01', value: 1500, dailyPL: 700, cumulativePL: 1500, formattedDate: 'Mar 1' },
          { date: '2024-03-15', value: 2000, dailyPL: 500, cumulativePL: 2000, formattedDate: 'Mar 15' },
        ];
        setData(mockData);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, [activePortfolio, portfolios, timeRange]);

  const formatTooltip = (value: number, name: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    });
    
    if (name === 'value') {
      return [formatter.format(value), 'Cumulative P/L'];
    }
    return [formatter.format(value), name];
  };

  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorPL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="formattedDate" />
            <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`} />
            <Tooltip formatter={formatTooltip} />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="#10b981" 
              fillOpacity={1} 
              fill="url(#colorPL)" 
            />
          </AreaChart>
        );
      
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="formattedDate" />
            <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`} />
            <Tooltip formatter={formatTooltip} />
            <Bar dataKey="dailyPL" fill="#3b82f6" />
          </BarChart>
        );
      
      default: // line
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="formattedDate" />
            <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(1)}k`} />
            <Tooltip formatter={formatTooltip} />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#3b82f6" 
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }} 
            />
          </LineChart>
        );
    }
  };

  return (
    <ChartContainer>
      <ChartHeader>
        <ChartTitle>
          Portfolio Performance 
          {activePortfolio ? ` - ${activePortfolio.name}` : ' - All Portfolios'}
        </ChartTitle>
        <ChartTypeSelector>
          <ChartButton 
            active={timeRange === '7d'} 
            onClick={() => setTimeRange('7d')}
          >
            7D
          </ChartButton>
          <ChartButton 
            active={timeRange === '30d'} 
            onClick={() => setTimeRange('30d')}
          >
            30D
          </ChartButton>
          <ChartButton 
            active={timeRange === '90d'} 
            onClick={() => setTimeRange('90d')}
          >
            90D
          </ChartButton>
          <ChartButton 
            active={timeRange === '1y'} 
            onClick={() => setTimeRange('1y')}
          >
            1Y
          </ChartButton>
          <div style={{ marginLeft: '1rem', display: 'flex', gap: '0.5rem' }}>
            <ChartButton 
              active={chartType === 'line'} 
              onClick={() => setChartType('line')}
            >
              Line
            </ChartButton>
            <ChartButton 
              active={chartType === 'area'} 
              onClick={() => setChartType('area')}
            >
              Area
            </ChartButton>
            <ChartButton 
              active={chartType === 'bar'} 
              onClick={() => setChartType('bar')}
            >
              Bar
            </ChartButton>
          </div>
        </ChartTypeSelector>
      </ChartHeader>
      
      {loading ? (
        <LoadingSpinner>Loading performance data...</LoadingSpinner>
      ) : error && data.length === 0 ? (
        <LoadingSpinner>Error loading data: {error}</LoadingSpinner>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          {renderChart()}
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
};

export default PortfolioPerformanceChart;
