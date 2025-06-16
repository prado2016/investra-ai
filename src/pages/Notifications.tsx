/**
 * Notifications & Alerts Page
 * Comprehensive interface for managing all notifications and alert settings
 */
import React, { useState } from 'react';
import styled from 'styled-components';
import { 
  Bell, 
  Settings, 
  Mail, 
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { usePageTitle } from '../hooks/usePageTitle';
import { useNotifications } from '../hooks/useNotifications';

// Import notification components
import ManualReviewNotifications from '../components/ManualReviewNotifications';
import NotificationPreferences from '../components/NotificationPreferences';
import ImportStatusNotifications from '../components/ImportStatusNotifications';

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

const NotificationSummary = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
`;

const SummaryCard = styled(Card)`
  padding: 1.25rem;
  text-align: center;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
`;

const SummaryIcon = styled.div<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  background: ${props => props.$color};
  border-radius: 12px;
  color: white;
  margin-bottom: 1rem;
`;

const SummaryValue = styled.div`
  font-size: 1.5rem;
  font-weight: 700;
  color: #111827;
  margin-bottom: 0.25rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const SummaryLabel = styled.div`
  font-size: 0.875rem;
  color: #6b7280;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const QuickActions = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
`;

const NotificationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('all');
  const { success } = useNotifications();
  
  // Set page title
  usePageTitle('Notifications & Alerts', { subtitle: 'Manage Notifications' });

  // Mock notification summary data
  const notificationSummary = {
    unread: 8,
    importAlerts: 3,
    reviewRequired: 5,
    systemAlerts: 2
  };

  const handleMarkAllRead = () => {
    success('Notifications', 'All notifications marked as read');
  };

  const handleTestNotifications = () => {
    success('Test Notification', 'Notification system is working correctly');
  };

  const tabs = [
    { id: 'all', label: 'All Notifications', icon: Bell },
    { id: 'import', label: 'Import Status', icon: Mail },
    { id: 'review', label: 'Manual Review', icon: AlertTriangle },
    { id: 'preferences', label: 'Preferences', icon: Settings },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'all':
        return (
          <div>
            <NotificationSummary>
              <SummaryCard>
                <SummaryIcon $color="#3b82f6">
                  <Bell size={24} />
                </SummaryIcon>
                <SummaryValue>{notificationSummary.unread}</SummaryValue>
                <SummaryLabel>Unread Notifications</SummaryLabel>
              </SummaryCard>

              <SummaryCard>
                <SummaryIcon $color="#10b981">
                  <Mail size={24} />
                </SummaryIcon>
                <SummaryValue>{notificationSummary.importAlerts}</SummaryValue>
                <SummaryLabel>Import Alerts</SummaryLabel>
              </SummaryCard>

              <SummaryCard>
                <SummaryIcon $color="#f59e0b">
                  <AlertTriangle size={24} />
                </SummaryIcon>
                <SummaryValue>{notificationSummary.reviewRequired}</SummaryValue>
                <SummaryLabel>Review Required</SummaryLabel>
              </SummaryCard>

              <SummaryCard>
                <SummaryIcon $color="#ef4444">
                  <Info size={24} />
                </SummaryIcon>
                <SummaryValue>{notificationSummary.systemAlerts}</SummaryValue>
                <SummaryLabel>System Alerts</SummaryLabel>
              </SummaryCard>
            </NotificationSummary>

            <QuickActions>
              <Button variant="primary" onClick={handleMarkAllRead}>
                <CheckCircle size={16} />
                Mark All as Read
              </Button>
              <Button variant="outline" onClick={handleTestNotifications}>
                <Bell size={16} />
                Test Notifications
              </Button>
            </QuickActions>

            <Card style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>
                Recent Notifications
              </h3>
              <div style={{ color: 'var(--text-secondary)' }}>
                All notification types will be displayed here. Use the tabs above to filter by category.
              </div>
            </Card>
          </div>
        );

      case 'import':
        return <ImportStatusNotifications />;

      case 'review':
        return <ManualReviewNotifications />;

      case 'preferences':
        return <NotificationPreferences />;

      default:
        return <div>Select a tab to view notifications</div>;
    }
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>Notifications & Alerts</PageTitle>
        <PageSubtitle>
          Stay informed about email imports, reviews, and system status
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
    </PageContainer>
  );
};

export default NotificationsPage;
