/**
 * Email Import Management Page
 * Unified interface for email review stats, manual review, error notifications, and configuration
 */
import React from 'react';
import styled from 'styled-components';
import { 
  BarChart3,
  Eye,
  AlertTriangle,
  Settings
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { usePageTitle } from '../hooks/usePageTitle';

// Import the consolidated email management components
import EmailReviewStats from '../components/EmailReviewStats';
import ManualEmailReview from '../components/ManualEmailReview';
import ImportStatusNotifications from '../components/ImportStatusNotifications';
import SimpleEmailConfiguration from '../components/SimpleEmailConfiguration';

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

const SectionGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const SectionCard = styled(Card)`
  padding: 1.5rem;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
  }
`;


const EmailManagementPage: React.FC = () => {
  // Set page title
  usePageTitle('Email Import Management', { subtitle: 'Unified Email Review & Configuration' });

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>Email Import Management</PageTitle>
        <PageSubtitle>
          Unified interface for email review statistics, manual processing, error notifications, and configuration
        </PageSubtitle>
      </PageHeader>

      <SectionGrid>
        {/* Section 1: Email Review Statistics */}
        <Section>
          <SectionHeader>
            <SectionTitle>
              <BarChart3 size={24} />
              Email Review Statistics
            </SectionTitle>
          </SectionHeader>
          <SectionCard>
            <EmailReviewStats />
          </SectionCard>
        </Section>

        {/* Section 2: Manual Email Review */}
        <Section>
          <SectionHeader>
            <SectionTitle>
              <Eye size={24} />
              Manual Email Review
            </SectionTitle>
          </SectionHeader>
          <SectionCard>
            <ManualEmailReview />
          </SectionCard>
        </Section>

        {/* Section 3: Error Notifications */}
        <Section>
          <SectionHeader>
            <SectionTitle>
              <AlertTriangle size={24} />
              Error Notifications & Alerts
            </SectionTitle>
          </SectionHeader>
          <SectionCard>
            <ImportStatusNotifications />
          </SectionCard>
        </Section>

        {/* Section 4: Email Configuration */}
        <Section>
          <SectionHeader>
            <SectionTitle>
              <Settings size={24} />
              Email Configuration
            </SectionTitle>
          </SectionHeader>
          <SectionCard>
            <SimpleEmailConfiguration />
          </SectionCard>
        </Section>
      </SectionGrid>
    </PageContainer>
  );
};

export default EmailManagementPage;
