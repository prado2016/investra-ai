/**
 * Email Import Management Page - Redesigned
 * Simplified interface with standalone email puller and manual review workflow
 */
import React from 'react';
import styled from 'styled-components';
import { 
  Mail,
  Download,
  Eye,
  Settings
} from 'lucide-react';
import { Card } from '../components/ui/Card';
import { usePageTitle } from '../hooks/usePageTitle';

// Import the new simplified email components
import EmailImportInterface from '../components/email/EmailImportInterface';
import EmailProcessQueue from '../components/email/EmailProcessQueue';

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
  display: flex;
  align-items: center;
  gap: 0.75rem;

  [data-theme="dark"] & {
    color: #f1f5f9;
  }
`;

const PageSubtitle = styled.p`
  font-size: 1.125rem;
  color: #64748b;
  margin: 0;
  line-height: 1.5;

  [data-theme="dark"] & {
    color: #94a3b8;
  }
`;

const SectionGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 3rem;
`;

const Section = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
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

const SectionDescription = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
  line-height: 1.4;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const SectionCard = styled(Card)`
  padding: 0;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  overflow: hidden;

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
  }
`;

const WorkflowCard = styled(Card)`
  padding: 2rem;
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border: 1px solid #0ea5e9;
  border-radius: 12px;
  margin-bottom: 2rem;

  [data-theme="dark"] & {
    background: linear-gradient(135deg, #0c4a6e 0%, #075985 100%);
    border-color: #0ea5e9;
  }
`;

const WorkflowTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #0c4a6e;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  [data-theme="dark"] & {
    color: #7dd3fc;
  }
`;

const WorkflowSteps = styled.ol`
  margin: 0;
  padding: 0 0 0 1.5rem;
  color: #075985;
  
  [data-theme="dark"] & {
    color: #bae6fd;
  }
`;

const WorkflowStep = styled.li`
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
  line-height: 1.4;

  &:last-child {
    margin-bottom: 0;
  }
`;

const EmailManagementPage: React.FC = () => {
  usePageTitle('Email Import Management', { subtitle: 'Simplified Email Processing' });

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          <Mail size={32} />
          Email Import Management
        </PageTitle>
        <PageSubtitle>
          Simplified email processing with Gmail IMAP integration and manual review workflow
        </PageSubtitle>
      </PageHeader>

      {/* Workflow Overview */}
      <WorkflowCard>
        <WorkflowTitle>
          <Settings size={20} />
          How It Works
        </WorkflowTitle>
        <WorkflowSteps>
          <WorkflowStep>
            <strong>Configure Gmail:</strong> Set up your Gmail email and app password in the Import Interface below
          </WorkflowStep>
          <WorkflowStep>
            <strong>Pull Emails:</strong> Click "Start Email Pull" to fetch recent emails from your Gmail inbox
          </WorkflowStep>
          <WorkflowStep>
            <strong>Review Queue:</strong> Manually review each email in the Process Queue and approve/reject for transaction creation
          </WorkflowStep>
          <WorkflowStep>
            <strong>Create Transactions:</strong> Approved emails are automatically converted to transactions in your portfolio
          </WorkflowStep>
        </WorkflowSteps>
      </WorkflowCard>

      <SectionGrid>
        {/* Section 1: Email Import Interface */}
        <Section>
          <SectionHeader>
            <div>
              <SectionTitle>
                <Download size={24} />
                Gmail Import Setup
              </SectionTitle>
              <SectionDescription>
                Configure your Gmail connection and trigger email imports
              </SectionDescription>
            </div>
          </SectionHeader>
          <SectionCard>
            <EmailImportInterface />
          </SectionCard>
        </Section>

        {/* Section 2: Email Process Queue */}
        <Section>
          <SectionHeader>
            <div>
              <SectionTitle>
                <Eye size={24} />
                Email Review Queue
              </SectionTitle>
              <SectionDescription>
                Review and process emails from your Gmail inbox
              </SectionDescription>
            </div>
          </SectionHeader>
          <SectionCard>
            <EmailProcessQueue />
          </SectionCard>
        </Section>
      </SectionGrid>
    </PageContainer>
  );
};

export default EmailManagementPage;