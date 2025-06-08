import React from 'react';
import styled from 'styled-components';
import { useNotify } from '../hooks/useNotify';

const Container = styled.div`
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
`;

const Title = styled.h2`
  color: #1f2937;
  margin-bottom: 1.5rem;
`;

const Section = styled.div`
  margin-bottom: 2rem;
`;

const SectionTitle = styled.h3`
  color: #374151;
  margin-bottom: 1rem;
  font-size: 1.125rem;
`;

const ButtonGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const Button = styled.button<{ variant?: 'success' | 'error' | 'warning' | 'info' }>`
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  
  ${({ variant }) => {
    switch (variant) {
      case 'success':
        return `
          background: #22c55e;
          color: white;
          &:hover { background: #16a34a; }
        `;
      case 'error':
        return `
          background: #ef4444;
          color: white;
          &:hover { background: #dc2626; }
        `;
      case 'warning':
        return `
          background: #f59e0b;
          color: white;
          &:hover { background: #d97706; }
        `;
      case 'info':
      default:
        return `
          background: #3b82f6;
          color: white;
          &:hover { background: #2563eb; }
        `;
    }
  }}
`;

const Description = styled.p`
  color: #6b7280;
  font-size: 0.875rem;
  margin-bottom: 1rem;
`;

export const NotificationDemo: React.FC = () => {
  const notify = useNotify();

  const handleBasicSuccess = () => {
    notify.success('Success!', 'This is a basic success notification');
  };

  const handleBasicError = () => {
    notify.error('Error occurred', 'This is a basic error notification');
  };

  const handleBasicWarning = () => {
    notify.warning('Warning', 'This is a basic warning notification');
  };

  const handleBasicInfo = () => {
    notify.info('Information', 'This is a basic info notification');
  };

  const handleApiSuccess = () => {
    notify.apiSuccess('Data saved successfully');
  };

  const handleApiError = () => {
    const mockError = new Error('Network connection failed');
    notify.apiError(mockError);
  };

  const handleFormSaved = () => {
    notify.formSaved('User Profile');
  };

  const handleFormError = () => {
    notify.formError('Please fill in all required fields');
  };

  const handleNetworkError = () => {
    notify.networkError();
  };

  const handleFeatureNotAvailable = () => {
    notify.featureNotAvailable('Advanced Analytics');
  };

  const handleConfirmAction = () => {
    notify.confirmAction(
      'Are you sure you want to delete this item?',
      'Delete',
      () => {
        notify.success('Deleted', 'Item has been deleted');
      }
    );
  };

  const handlePersistent = () => {
    notify.warning(
      'Persistent Notification',
      'This notification will stay until dismissed',
      { duration: 0 }
    );
  };

  const handleWithAction = () => {
    notify.info(
      'Update Available',
      'A new version of the app is available',
      {
        action: {
          label: 'Update Now',
          onClick: () => notify.success('Updated', 'App has been updated')
        }
      }
    );
  };

  const handleCustomDuration = () => {
    notify.success(
      'Quick Message',
      'This will disappear in 2 seconds',
      { duration: 2000 }
    );
  };

  return (
    <Container>
      <Title>Notification System Demo</Title>
      
      <Section>
        <SectionTitle>Basic Notifications</SectionTitle>
        <Description>
          Basic notification types with default styling and duration.
        </Description>
        <ButtonGrid>
          <Button variant="success" onClick={handleBasicSuccess}>
            Success Notification
          </Button>
          <Button variant="error" onClick={handleBasicError}>
            Error Notification
          </Button>
          <Button variant="warning" onClick={handleBasicWarning}>
            Warning Notification
          </Button>
          <Button variant="info" onClick={handleBasicInfo}>
            Info Notification
          </Button>
        </ButtonGrid>
      </Section>

      <Section>
        <SectionTitle>Contextual Notifications</SectionTitle>
        <Description>
          Pre-configured notifications for common use cases.
        </Description>
        <ButtonGrid>
          <Button variant="success" onClick={handleApiSuccess}>
            API Success
          </Button>
          <Button variant="error" onClick={handleApiError}>
            API Error
          </Button>
          <Button variant="success" onClick={handleFormSaved}>
            Form Saved
          </Button>
          <Button variant="error" onClick={handleFormError}>
            Form Error
          </Button>
          <Button variant="error" onClick={handleNetworkError}>
            Network Error
          </Button>
          <Button variant="info" onClick={handleFeatureNotAvailable}>
            Feature Not Available
          </Button>
        </ButtonGrid>
      </Section>

      <Section>
        <SectionTitle>Advanced Features</SectionTitle>
        <Description>
          Notifications with special behaviors and interactions.
        </Description>
        <ButtonGrid>
          <Button variant="warning" onClick={handleConfirmAction}>
            Confirm Action
          </Button>
          <Button variant="warning" onClick={handlePersistent}>
            Persistent Notification
          </Button>
          <Button variant="info" onClick={handleWithAction}>
            Notification with Action
          </Button>
          <Button variant="success" onClick={handleCustomDuration}>
            Custom Duration (2s)
          </Button>
        </ButtonGrid>
      </Section>
    </Container>
  );
};

export default NotificationDemo;
