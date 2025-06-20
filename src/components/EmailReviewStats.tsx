/**
 * Email Review Stats Component
 * Displays key statistics for the email review workflow
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Mail, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { manualEmailReviewService } from '../services/manualEmailReviewService';
import { useNotifications } from '../hooks/useNotifications';

const StatsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const StatCard = styled(Card)`
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border: 1px solid #e2e8f0;
  text-align: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
  }

  [data-theme="dark"] & {
    background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
    border-color: #4b5563;
  }
`;

const StatIcon = styled.div<{ $color: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: ${props => props.$color};
  border-radius: 12px;
  color: white;
  margin: 0 auto 1rem;
`;

const StatValue = styled.div`
  font-size: 2rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.5rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const StatLabel = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const StatsTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin: 0;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const LastUpdated = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 1rem;
  text-align: center;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

interface EmailReviewStats {
  total: number;
  pending: number;
  processed: number;
  rejected: number;
}

const EmailReviewStats: React.FC = () => {
  const { error } = useNotifications();
  const [stats, setStats] = useState<EmailReviewStats>({
    total: 0,
    pending: 0,
    processed: 0,
    rejected: 0
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const result = await manualEmailReviewService.getEmailStats();
      
      if (result.success && result.data) {
        setStats(result.data);
        setLastUpdated(new Date().toLocaleString());
      } else {
        throw new Error(result.error || 'Failed to load stats');
      }
    } catch (err) {
      console.error('Failed to load email stats:', err);
      error('Stats Error', err instanceof Error ? err.message : 'Failed to load statistics');
      
      // Set fallback stats to prevent undefined errors
      setStats({
        total: 0,
        pending: 0,
        processed: 0,
        rejected: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    await loadStats();
  };

  const calculateSuccessRate = () => {
    if (!stats || stats.total === 0) return 0;
    return Math.round((stats.processed / stats.total) * 100);
  };

  return (
    <StatsContainer>
      <HeaderRow>
        <StatsTitle>Email Review Statistics</StatsTitle>
        <Button 
          variant="outline" 
          size="sm"
          onClick={refreshStats}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </Button>
      </HeaderRow>

      <StatsGrid>
        <StatCard>
          <StatIcon $color="#3b82f6">
            <Mail size={24} />
          </StatIcon>
          <StatValue>{(stats?.total || 0).toLocaleString()}</StatValue>
          <StatLabel>Total Emails</StatLabel>
        </StatCard>

        <StatCard>
          <StatIcon $color="#f59e0b">
            <Clock size={24} />
          </StatIcon>
          <StatValue>{(stats?.pending || 0).toLocaleString()}</StatValue>
          <StatLabel>Pending Review</StatLabel>
        </StatCard>

        <StatCard>
          <StatIcon $color="#10b981">
            <CheckCircle size={24} />
          </StatIcon>
          <StatValue>{(stats?.processed || 0).toLocaleString()}</StatValue>
          <StatLabel>Processed</StatLabel>
        </StatCard>

        <StatCard>
          <StatIcon $color="#ef4444">
            <XCircle size={24} />
          </StatIcon>
          <StatValue>{(stats?.rejected || 0).toLocaleString()}</StatValue>
          <StatLabel>Rejected</StatLabel>
        </StatCard>

        <StatCard>
          <StatIcon $color="#8b5cf6">
            <TrendingUp size={24} />
          </StatIcon>
          <StatValue>{calculateSuccessRate()}%</StatValue>
          <StatLabel>Success Rate</StatLabel>
        </StatCard>

        <StatCard>
          <StatIcon $color={(stats?.pending || 0) > 10 ? "#ef4444" : "#10b981"}>
            <AlertTriangle size={24} />
          </StatIcon>
          <StatValue>{(stats?.pending || 0) > 10 ? 'High' : 'Normal'}</StatValue>
          <StatLabel>Queue Status</StatLabel>
        </StatCard>
      </StatsGrid>

      {lastUpdated && (
        <LastUpdated>
          Last updated: {lastUpdated}
        </LastUpdated>
      )}
    </StatsContainer>
  );
};

export default EmailReviewStats;