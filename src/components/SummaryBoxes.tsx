/**
 * Dashboard Summary Components
 * Reusable components for displaying financial metrics on the dashboard
 */

import React from 'react';
import styled from 'styled-components';
import { 
  TrendingUp, 
  DollarSign, 
  Activity, 
  Target, 
  ArrowUpDown, 
  CreditCard 
} from 'lucide-react';
import { formatCurrency } from '../utils/formatting';

// Styled Components
const SummaryCard = styled.div`
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
`;

const CardIcon = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: ${props => props.$color};
  color: white;
`;

const CardTitle = styled.h3`
  font-size: 1rem;
  font-weight: 600;
  color: #374151;
  margin: 0;
`;

const CardValue = styled.div<{ $positive?: boolean; $negative?: boolean; $hidden?: boolean }>`
  font-size: 2rem;
  font-weight: 700;
  color: ${props => 
    props.$hidden ? '#9ca3af' :
    props.$positive ? '#16a34a' : 
    props.$negative ? '#dc2626' : 
    '#1e293b'
  };
  margin-bottom: 0.5rem;
  font-family: 'SF Mono', 'Monaco', 'Consolas', monospace;
`;

const CardSubtitle = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const TrendIndicator = styled.span<{ $positive?: boolean }>`
  color: ${props => props.$positive ? '#16a34a' : '#dc2626'};
  font-weight: 500;
`;

// Component Props
interface SummaryBoxProps {
  title: string;
  value: number;
  subtitle?: string;
  trend?: number; // Percentage change
  icon: React.ReactNode;
  iconColor: string;
  isPrivacyMode?: boolean;
  currency?: string;
  format?: 'currency' | 'number' | 'percentage';
}

// Main Summary Box Component
export const SummaryBox: React.FC<SummaryBoxProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon,
  iconColor,
  isPrivacyMode = false,
  currency = 'USD',
  format = 'currency'
}) => {
  const formatValue = (val: number) => {
    if (isPrivacyMode) return '••••••';
    
    switch (format) {
      case 'currency':
        return formatCurrency(val, currency);
      case 'percentage':
        return `${val.toFixed(2)}%`;
      case 'number':
        return val.toLocaleString();
      default:
        return formatCurrency(val, currency);
    }
  };

  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <SummaryCard>
      <CardHeader>
        <CardIcon $color={iconColor}>
          {icon}
        </CardIcon>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      
      <CardValue 
        $positive={isPositive && !isPrivacyMode} 
        $negative={isNegative && !isPrivacyMode}
        $hidden={isPrivacyMode}
      >
        {formatValue(value)}
      </CardValue>
      
      {(subtitle || trend !== undefined) && (
        <CardSubtitle>
          {subtitle}
          {trend !== undefined && !isPrivacyMode && (
            <TrendIndicator $positive={trend > 0}>
              {trend > 0 ? '+' : ''}{trend.toFixed(2)}%
            </TrendIndicator>
          )}
        </CardSubtitle>
      )}
    </SummaryCard>
  );
};

// Specific Summary Box Components for the 7 required metrics

export const TotalDailyPLBox: React.FC<{ 
  value: number; 
  isPrivacyMode?: boolean; 
  trend?: number;
}> = ({ value, isPrivacyMode, trend }) => (
  <SummaryBox
    title="Total Daily P&L"
    value={value}
    subtitle="Today's performance"
    trend={trend}
    icon={<TrendingUp size={20} />}
    iconColor={value >= 0 ? '#16a34a' : '#dc2626'}
    isPrivacyMode={isPrivacyMode}
  />
);

export const RealizedPLBox: React.FC<{ 
  value: number; 
  isPrivacyMode?: boolean;
  subtitle?: string;
}> = ({ value, isPrivacyMode, subtitle }) => (
  <SummaryBox
    title="Realized P&L"
    value={value}
    subtitle={subtitle || "From closed positions"}
    icon={<Target size={20} />}
    iconColor="#3b82f6"
    isPrivacyMode={isPrivacyMode}
  />
);

export const UnrealizedPLBox: React.FC<{ 
  value: number; 
  isPrivacyMode?: boolean;
  subtitle?: string;
}> = ({ value, isPrivacyMode, subtitle }) => (
  <SummaryBox
    title="Unrealized P&L"
    value={value}
    subtitle={subtitle || "From open positions"}
    icon={<Activity size={20} />}
    iconColor="#8b5cf6"
    isPrivacyMode={isPrivacyMode}
  />
);

export const DividendIncomeBox: React.FC<{ 
  value: number; 
  isPrivacyMode?: boolean;
  subtitle?: string;
}> = ({ value, isPrivacyMode, subtitle }) => (
  <SummaryBox
    title="Dividend Income"
    value={value}
    subtitle={subtitle || "Dividend payments received"}
    icon={<DollarSign size={20} />}
    iconColor="#10b981"
    isPrivacyMode={isPrivacyMode}
  />
);

export const TradingFeesBox: React.FC<{ 
  value: number; 
  isPrivacyMode?: boolean;
  subtitle?: string;
}> = ({ value, isPrivacyMode, subtitle }) => (
  <SummaryBox
    title="Trading Fees"
    value={value}
    subtitle={subtitle || "Total transaction costs"}
    icon={<CreditCard size={20} />}
    iconColor="#ef4444"
    isPrivacyMode={isPrivacyMode}
  />
);

export const TradeVolumeBox: React.FC<{ 
  value: number; 
  isPrivacyMode?: boolean;
  subtitle?: string;
}> = ({ value, isPrivacyMode, subtitle }) => (
  <SummaryBox
    title="Trade Volume"
    value={value}
    subtitle={subtitle || "Total trading activity"}
    icon={<ArrowUpDown size={20} />}
    iconColor="#f59e0b"
    isPrivacyMode={isPrivacyMode}
  />
);

export const NetCashFlowBox: React.FC<{ 
  value: number; 
  isPrivacyMode?: boolean;
  subtitle?: string;
}> = ({ value, isPrivacyMode, subtitle }) => (
  <SummaryBox
    title="Net Cash Flow"
    value={value}
    subtitle={subtitle || "Cash in/out from trading"}
    icon={<TrendingUp size={20} />}
    iconColor="#06b6d4"
    isPrivacyMode={isPrivacyMode}
  />
);

export default SummaryBox;
