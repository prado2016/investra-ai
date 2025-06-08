/**
 * Monthly Calendar Component for Daily P/L Visualization
 * Shows a full month calendar with color-coded daily P/L
 */

import React, { useState, useMemo } from 'react';
import styled from 'styled-components';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../utils/formatting';
import { useDailyPL } from '../hooks/useDailyPL';
import type { DailyPLData } from '../services/analytics/dailyPLService';

// Styled Components
const CalendarContainer = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  margin: 1rem 0;
`;

const CalendarHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const MonthNavigation = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const NavButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  background: white;
  color: #374151;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #f3f4f6;
    border-color: #d1d5db;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const MonthTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
  min-width: 200px;
  text-align: center;
`;

const MonthSummary = styled.div`
  display: flex;
  gap: 2rem;
  align-items: center;
`;

const SummaryCard = styled.div<{ variant: 'positive' | 'negative' | 'neutral' }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: ${props => 
    props.variant === 'positive' ? '#dcfce7' :
    props.variant === 'negative' ? '#fee2e2' :
    '#f3f4f6'
  };
  border: 1px solid ${props =>
    props.variant === 'positive' ? '#bbf7d0' :
    props.variant === 'negative' ? '#fecaca' :
    '#e5e7eb'
  };
`;

const SummaryLabel = styled.span`
  font-size: 0.75rem;
  font-weight: 500;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const SummaryValue = styled.span<{ variant: 'positive' | 'negative' | 'neutral' }>`
  font-size: 1rem;
  font-weight: 600;
  color: ${props =>
    props.variant === 'positive' ? '#059669' :
    props.variant === 'negative' ? '#dc2626' :
    '#374151'
  };
  margin-top: 0.25rem;
`;

const CalendarGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  overflow: hidden;
  background: #e5e7eb;
`;

const DayHeader = styled.div`
  background: #f9fafb;
  padding: 0.75rem 0.5rem;
  text-align: center;
  font-weight: 600;
  font-size: 0.875rem;
  color: #374151;
  border-bottom: 1px solid #e5e7eb;
`;

const DayCell = styled.div<{ 
  variant: 'no-transactions' | 'positive' | 'negative' | 'neutral';
  isCurrentMonth: boolean;
  isToday: boolean;
  clickable: boolean;
}>`
  background: ${props => {
    if (!props.isCurrentMonth) return '#f9fafb';
    switch (props.variant) {
      case 'positive': return '#dcfce7';
      case 'negative': return '#fee2e2';
      case 'neutral': return '#f3f4f6';
      default: return 'white';
    }
  }};
  min-height: 80px;
  padding: 0.5rem;
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  transition: all 0.2s;
  position: relative;
  
  ${props => props.isToday && `
    border: 2px solid #3b82f6;
    margin: -1px;
  `}

  &:hover {
    ${props => props.clickable && `
      background: ${
        !props.isCurrentMonth ? '#f3f4f6' :
        props.variant === 'positive' ? '#bbf7d0' :
        props.variant === 'negative' ? '#fecaca' :
        props.variant === 'neutral' ? '#e5e7eb' :
        '#f9fafb'
      };
    `}
  }
`;

const DayNumber = styled.div<{ isCurrentMonth: boolean }>`
  font-weight: 600;
  font-size: 0.875rem;
  color: ${props => props.isCurrentMonth ? '#1f2937' : '#9ca3af'};
  margin-bottom: 0.25rem;
`;

const CashFlowAmount = styled.div<{ variant: 'positive' | 'negative' | 'neutral' }>`
  font-size: 0.75rem;
  font-weight: 500;
  color: ${props =>
    props.variant === 'positive' ? '#059669' :
    props.variant === 'negative' ? '#dc2626' :
    '#6b7280'
  };
  text-align: center;
`;

const TransactionCount = styled.div`
  font-size: 0.625rem;
  color: #9ca3af;
  text-align: center;
  margin-top: 0.125rem;
`;

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
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

// Props interface
interface MonthlyCalendarProps {
  portfolioId: string;
  onDayClick?: (dayData: DailyPLData) => void;
  initialYear?: number;
  initialMonth?: number;
  className?: string;
}

const MonthlyCalendar: React.FC<MonthlyCalendarProps> = ({
  portfolioId,
  onDayClick,
  initialYear,
  initialMonth,
  className
}) => {
  const currentDate = new Date();
  const [selectedYear, setSelectedYear] = useState(initialYear || currentDate.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(initialMonth || currentDate.getMonth());

  const { monthlyData, loading, error, getMonthData } = useDailyPL(
    portfolioId,
    selectedYear,
    selectedMonth
  );

  const navigateMonth = (direction: 'prev' | 'next') => {
    let newMonth = selectedMonth;
    let newYear = selectedYear;

    if (direction === 'prev') {
      newMonth = selectedMonth - 1;
      if (newMonth < 0) {
        newMonth = 11;
        newYear = selectedYear - 1;
      }
    } else {
      newMonth = selectedMonth + 1;
      if (newMonth > 11) {
        newMonth = 0;
        newYear = selectedYear + 1;
      }
    }

    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
    getMonthData(newYear, newMonth);
  };

  const monthTitle = useMemo(() => {
    const date = new Date(selectedYear, selectedMonth, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }, [selectedYear, selectedMonth]);

  const getDayVariant = (netCashFlow: number): 'positive' | 'negative' | 'neutral' => {
    if (Math.abs(netCashFlow) <= 0.01) return 'neutral';
    return netCashFlow > 0 ? 'positive' : 'negative';
  };

  const calendarDays = useMemo(() => {
    const startOfMonth = new Date(selectedYear, selectedMonth, 1);
    const startOfCalendar = new Date(startOfMonth);
    startOfCalendar.setDate(startOfCalendar.getDate() - startOfMonth.getDay());

    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 42; i++) { // 6 weeks × 7 days
      const date = new Date(startOfCalendar);
      date.setDate(startOfCalendar.getDate() + i);
      
      const isCurrentMonth = date.getMonth() === selectedMonth;
      const isToday = date.getTime() === today.getTime();
      const dayData = monthlyData?.dailyData.find(d => d.dayOfMonth === date.getDate() && isCurrentMonth);

      days.push({
        date,
        dayData,
        isCurrentMonth,
        isToday
      });
    }

    return days;
  }, [selectedYear, selectedMonth, monthlyData]);

  const handleDayClick = (dayData: DailyPLData | undefined) => {
    console.log('🔍 CALENDAR_DEBUG: Day clicked:', {
      dayData,
      hasData: !!dayData,
      date: dayData?.date,
      transactionCount: dayData?.transactionCount,
      totalPL: dayData?.totalPL,
      hasTransactions: dayData?.hasTransactions,
      timestamp: new Date().toISOString()
    });
    
    if (dayData && onDayClick) {
      console.log('🔍 CALENDAR_DEBUG: Calling onDayClick with:', {
        date: dayData.date,
        transactionCount: dayData.transactionCount,
        hasTransactions: dayData.hasTransactions
      });
      onDayClick(dayData);
    } else {
      console.log('🔍 CALENDAR_DEBUG: Not calling onDayClick:', {
        hasDayData: !!dayData,
        hasOnDayClick: !!onDayClick
      });
    }
  };

  if (error) {
    return (
      <ErrorContainer>
        <h3>Error Loading Calendar Data</h3>
        <p>{error}</p>
      </ErrorContainer>
    );
  }

  return (
    <CalendarContainer className={className}>
      {loading && (
        <LoadingOverlay>
          <div>Loading calendar data...</div>
        </LoadingOverlay>
      )}
      
      <CalendarHeader>
        <MonthNavigation>
          <NavButton onClick={() => navigateMonth('prev')} disabled={loading}>
            <ChevronLeft size={20} />
          </NavButton>
          <MonthTitle>{monthTitle}</MonthTitle>
          <NavButton onClick={() => navigateMonth('next')} disabled={loading}>
            <ChevronRight size={20} />
          </NavButton>
        </MonthNavigation>

        {monthlyData && (
          <MonthSummary>
            <SummaryCard variant={getDayVariant(monthlyData.totalMonthlyPL)}>
              <SummaryLabel>Total P/L</SummaryLabel>
              <SummaryValue variant={getDayVariant(monthlyData.totalMonthlyPL)}>
                {formatCurrency(monthlyData.totalMonthlyPL)}
              </SummaryValue>
            </SummaryCard>
            
            <SummaryCard variant="neutral">
              <SummaryLabel>Active Days</SummaryLabel>
              <SummaryValue variant="neutral">
                {monthlyData.daysWithTransactions}
              </SummaryValue>
            </SummaryCard>
            
            <SummaryCard variant="positive">
              <SummaryLabel>Profit Days</SummaryLabel>
              <SummaryValue variant="positive">
                {monthlyData.profitableDays}
              </SummaryValue>
            </SummaryCard>
          </MonthSummary>
        )}
      </CalendarHeader>

      <CalendarGrid>
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <DayHeader key={day}>{day}</DayHeader>
        ))}
        
        {calendarDays.map(({ date, dayData, isCurrentMonth, isToday }, index) => (
          <DayCell
            key={index}
            variant={dayData?.colorCategory || 'no-transactions'}
            isCurrentMonth={isCurrentMonth}
            isToday={isToday}
            clickable={!!dayData}
            onClick={() => handleDayClick(dayData)}
          >
            <DayNumber isCurrentMonth={isCurrentMonth}>
              {date.getDate()}
            </DayNumber>
            
            {dayData && (
              <>
                <CashFlowAmount variant={getDayVariant(dayData.netCashFlow)}>
                  {formatCurrency(dayData.netCashFlow)}
                </CashFlowAmount>
                {dayData.transactionCount > 0 && (
                  <TransactionCount>
                    {dayData.transactionCount} trade{dayData.transactionCount !== 1 ? 's' : ''}
                  </TransactionCount>
                )}
              </>
            )}
          </DayCell>
        ))}
      </CalendarGrid>
    </CalendarContainer>
  );
};

export default MonthlyCalendar;
