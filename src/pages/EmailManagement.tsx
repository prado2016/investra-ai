/**
 * Email Management Page
 * Comprehensive interface for managing email import settings, monitoring status, and resolving issues
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { 
  Mail, 
  Server, 
  Activity, 
  AlertTriangle, 
  CheckCircle,
  Play,
  Pause,
  RefreshCw,
  Eye,
  Settings
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { usePageTitle } from '../hooks/usePageTitle';
import { useEmailProcessing } from '../hooks/useEmailProcessing';

// Import the existing email management components
import ImportStatusNotifications from '../components/ImportStatusNotifications';
import ManualReviewQueueManager from '../components/ManualReviewQueueManager';
import FailedImportResolutionInterface from '../components/FailedImportResolutionInterface';
import EmailProcessingStatusDisplay from '../components/EmailProcessingStatusDisplay';
import SimpleEmailServerSettings from '../components/SimpleEmailServerSettings';
import RealTimeEmailStatus from '../components/RealTimeEmailStatus';
import DebugPanel from '../components/DebugPanel';

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

  [data-theme="dark"] & {
    color: #f1f5f9;
  }
`;

const PageSubtitle = styled.p`
  font-size: 1.125rem;
  color: #64748b;
  margin: 0;

  [data-theme="dark"] & {
    color: #94a3b8;
  }
`;

const TabContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid #e2e8f0;
  
  [data-theme="dark"] & {
    border-color: #374151;
  }
`;

const Tab = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem 1.5rem;
  background: ${props => props.$active ? '#3b82f6' : 'transparent'};
  color: ${props => props.$active ? 'white' : '#6b7280'};
  border: none;
  border-radius: 8px 8px 0 0;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: 500;
  
  &:hover {
    background: ${props => props.$active ? '#2563eb' : '#f1f5f9'};
    color: ${props => props.$active ? 'white' : '#374151'};
  }

  [data-theme="dark"] & {
    color: ${props => props.$active ? 'white' : '#9ca3af'};
    
    &:hover {
      background: ${props => props.$active ? '#2563eb' : '#374151'};
      color: ${props => props.$active ? 'white' : '#f3f4f6'};
    }
  }
`;

const TabContent = styled.div`
  min-height: 400px;
`;

const QuickStatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const StatCard = styled(Card)`
  padding: 1.5rem;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border: 1px solid #e2e8f0;
  
  [data-theme="dark"] & {
    background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
    border-color: #4b5563;
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
  font-size: 1.75rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.25rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const StatDescription = styled.div`
  font-size: 0.875rem;
  color: #6b7280;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const ActionBar = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const EmailManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Set page title
  usePageTitle('Email Management', { subtitle: 'Import Settings & Monitoring' });

  // Use real email processing data
  const {
    processingStats,
    imapStatus,
    startService,
    stopService,
    refreshData
  } = useEmailProcessing();

  // Use safe fallbacks for stats
  const safeStats = processingStats || {
    totalProcessed: 0,
    successful: 0,
    failed: 0,
    reviewRequired: 0,
    averageProcessingTime: 0
  };

  const safeImapStatus = imapStatus || {
    status: 'stopped' as const,
    healthy: false,
    uptime: 0
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'status', label: 'Processing Status', icon: Server },
    { id: 'review', label: 'Manual Review', icon: Eye },
    { id: 'failed', label: 'Failed Imports', icon: AlertTriangle },
    { id: 'notifications', label: 'Notifications', icon: Mail },
    { id: 'configuration', label: 'Configuration', icon: Settings },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div>
            <QuickStatsGrid>
              <StatCard>
                <StatHeader>
                  <StatTitle>Total Processed</StatTitle>
                  <StatIcon $color="#3b82f6">
                    <Mail size={16} />
                  </StatIcon>
                </StatHeader>
                <StatValue>{safeStats.totalProcessed.toLocaleString()}</StatValue>
                <StatDescription>Emails processed this month</StatDescription>
              </StatCard>

              <StatCard>
                <StatHeader>
                  <StatTitle>Success Rate</StatTitle>
                  <StatIcon $color="#10b981">
                    <CheckCircle size={16} />
                  </StatIcon>
                </StatHeader>
                <StatValue>
                  {safeStats.totalProcessed > 0 
                    ? ((safeStats.successful / safeStats.totalProcessed) * 100).toFixed(1)
                    : 0}%
                </StatValue>
                <StatDescription>{safeStats.successful} successful imports</StatDescription>
              </StatCard>

              <StatCard>
                <StatHeader>
                  <StatTitle>Failed Imports</StatTitle>
                  <StatIcon $color="#ef4444">
                    <AlertTriangle size={16} />
                  </StatIcon>
                </StatHeader>
                <StatValue>{safeStats.failed}</StatValue>
                <StatDescription>Require manual intervention</StatDescription>
              </StatCard>

              <StatCard>
                <StatHeader>
                  <StatTitle>Manual Review</StatTitle>
                  <StatIcon $color="#f59e0b">
                    <Eye size={16} />
                  </StatIcon>
                </StatHeader>
                <StatValue>{safeStats.reviewRequired}</StatValue>
                <StatDescription>Items pending review</StatDescription>
              </StatCard>
            </QuickStatsGrid>

            <ActionBar>
              <Button variant="primary" onClick={startService}>
                <Play size={16} />
                Start Email Service
              </Button>
              <Button variant="outline" onClick={stopService}>
                <Pause size={16} />
                Stop Service
              </Button>
              <Button variant="outline" onClick={refreshData}>
                <RefreshCw size={16} />
                Refresh Stats
              </Button>
            </ActionBar>

            <Card style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>
                Email Server Configuration
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
                <div>
                  <strong>IMAP Server:</strong> {process.env.REACT_APP_IMAP_HOST || 'localhost'}:{process.env.REACT_APP_IMAP_PORT || '993'} (SSL)<br />
                  <strong>Email Account:</strong> {process.env.REACT_APP_IMAP_USER || 'transactions@investra.com'}<br />
                  <strong>Status:</strong> <span style={{ color: safeImapStatus.healthy ? '#10b981' : '#6b7280' }}>
                    {safeImapStatus.healthy ? 'Connected' : 'Enhanced Server Mode'}
                  </span>
                  {!safeImapStatus.healthy && (
                    <div style={{ 
                      marginTop: '0.5rem', 
                      padding: '0.5rem', 
                      backgroundColor: '#f3f4f6', 
                      borderRadius: '4px',
                      fontSize: '0.875rem',
                      color: '#374151',
                      border: '1px solid #d1d5db'
                    }}>
                      ℹ️ Enhanced production server with real IMAP processing. Service may be stopped - use controls above to start.
                    </div>
                  )}
                </div>
                <div>
                  <strong>Last Check:</strong> {new Date().toLocaleString()}<br />
                  <strong>Processing Mode:</strong> Automatic<br />
                  <strong>Filter:</strong> Wealthsimple emails only
                </div>
              </div>
            </Card>
          </div>
        );

      case 'status':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <RealTimeEmailStatus />
            <EmailProcessingStatusDisplay />
          </div>
        );

      case 'review':
        return <ManualReviewQueueManager />;

      case 'failed':
        return <FailedImportResolutionInterface />;

      case 'notifications':
        return <ImportStatusNotifications />;

      case 'configuration':
        return <SimpleEmailServerSettings />;

      default:
        return <div>Select a tab to view content</div>;
    }
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>Email Import Management</PageTitle>
        <PageSubtitle>
          Monitor and manage automated email processing from Wealthsimple
        </PageSubtitle>
      </PageHeader>

      <TabContainer>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <Tab
              key={tab.id}
              $active={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={16} />
              {tab.label}
            </Tab>
          );
        })}
      </TabContainer>

      <TabContent>
        {renderTabContent()}
      </TabContent>
      
      {/* Debug Panel for Email Processing */}
      <DebugPanel enabled={true} />
    </PageContainer>
  );
};

export default EmailManagementPage;
