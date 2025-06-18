/**
 * Settings Layout Component
 * Provides consistent layout with navigation tabs for settings sections
 */

import React from 'react';
import styled from 'styled-components';
import { AlertCircle, Loader } from 'lucide-react';
import { Card } from '../../../components/ui/Card';

const LayoutContainer = styled.div`
  display: flex;
  gap: 2rem;
  min-height: 600px;

  @media (max-width: 1024px) {
    flex-direction: column;
    gap: 1rem;
  }
`;

const Sidebar = styled.div`
  min-width: 280px;
  max-width: 280px;

  @media (max-width: 1024px) {
    min-width: unset;
    max-width: unset;
  }
`;

const SidebarCard = styled(Card)`
  padding: 0;
  overflow: hidden;
`;

const SectionList = styled.div`
  display: flex;
  flex-direction: column;

  @media (max-width: 1024px) {
    flex-direction: row;
    overflow-x: auto;
    padding: 0.5rem;
    gap: 0.5rem;
  }
`;

const SectionItem = styled.button<{ $active: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  text-align: left;
  border: none;
  background: ${props => props.$active ? '#3b82f6' : 'transparent'};
  color: ${props => props.$active ? 'white' : '#374151'};
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 0;
  min-height: 60px;
  position: relative;

  &:hover {
    background: ${props => props.$active ? '#2563eb' : '#f8fafc'};
  }

  &:not(:last-child) {
    border-bottom: 1px solid #e5e7eb;
  }

  [data-theme="dark"] & {
    color: ${props => props.$active ? 'white' : '#d1d5db'};
    border-bottom-color: #374151;
    
    &:hover {
      background: ${props => props.$active ? '#2563eb' : '#374151'};
    }
  }

  @media (max-width: 1024px) {
    min-width: 200px;
    border-radius: 8px;
    border-bottom: none !important;
  }
`;

const SectionIcon = styled.div<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: ${props => props.$active ? 'white' : '#6b7280'};

  [data-theme="dark"] & {
    color: ${props => props.$active ? 'white' : '#9ca3af'};
  }
`;

const SectionInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const SectionLabel = styled.div<{ $active: boolean }>`
  font-weight: 600;
  font-size: 0.875rem;
  color: ${props => props.$active ? 'white' : '#111827'};
  margin-bottom: 0.25rem;

  [data-theme="dark"] & {
    color: ${props => props.$active ? 'white' : '#f3f4f6'};
  }
`;

const SectionDescription = styled.div<{ $active: boolean }>`
  font-size: 0.75rem;
  color: ${props => props.$active ? 'rgba(255,255,255,0.8)' : '#6b7280'};
  line-height: 1.3;

  [data-theme="dark"] & {
    color: ${props => props.$active ? 'rgba(255,255,255,0.8)' : '#9ca3af'};
  }

  @media (max-width: 1024px) {
    display: none;
  }
`;

const SectionBadge = styled.div<{ $active: boolean }>`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: ${props => props.$active ? 'rgba(255,255,255,0.2)' : '#e5e7eb'};
  color: ${props => props.$active ? 'white' : '#6b7280'};
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.05em;

  [data-theme="dark"] & {
    background: ${props => props.$active ? 'rgba(255,255,255,0.2)' : '#4b5563'};
    color: ${props => props.$active ? 'white' : '#d1d5db'};
  }
`;

const ContentArea = styled.div`
  flex: 1;
  min-width: 0;
`;

const ContentCard = styled(Card)`
  padding: 2rem;
  min-height: 600px;
  position: relative;

  @media (max-width: 768px) {
    padding: 1.5rem;
  }
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
  border-radius: 8px;
  z-index: 10;

  [data-theme="dark"] & {
    background: rgba(17, 24, 39, 0.8);
  }
`;

const LoadingContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  text-align: center;
`;

const LoadingText = styled.div`
  font-size: 0.875rem;
  color: #6b7280;
  font-weight: 500;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 400px;
  text-align: center;
  gap: 1rem;
`;

const ErrorIcon = styled.div`
  color: #ef4444;
  margin-bottom: 0.5rem;
`;

const ErrorTitle = styled.h3`
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const ErrorMessage = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
  max-width: 400px;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

interface SettingSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  description: string;
  badge?: string;
}

interface SettingsLayoutProps {
  sections: SettingSection[];
  activeSection: string;
  onSectionChange: (sectionId: string) => void;
  content: React.ReactNode;
  loading?: boolean;
  error?: string | null;
}

const SettingsLayout: React.FC<SettingsLayoutProps> = ({
  sections,
  activeSection,
  onSectionChange,
  content,
  loading = false,
  error = null
}) => {
  // Render content with loading/error states
  const renderContent = () => {
    if (error) {
      return (
        <ErrorContainer>
          <ErrorIcon>
            <AlertCircle size={48} />
          </ErrorIcon>
          <ErrorTitle>Configuration Error</ErrorTitle>
          <ErrorMessage>
            {error || 'An error occurred while loading the configuration. Please try refreshing the page.'}
          </ErrorMessage>
        </ErrorContainer>
      );
    }

    return content;
  };

  return (
    <LayoutContainer>
      <Sidebar>
        <SidebarCard>
          <SectionList>
            {sections.map((section) => {
              const IconComponent = section.icon;
              const isActive = section.id === activeSection;
              
              return (
                <SectionItem
                  key={section.id}
                  $active={isActive}
                  onClick={() => onSectionChange(section.id)}
                  disabled={loading}
                >
                  <SectionIcon $active={isActive}>
                    <IconComponent size={20} />
                  </SectionIcon>
                  
                  <SectionInfo>
                    <SectionLabel $active={isActive}>
                      {section.label}
                    </SectionLabel>
                    <SectionDescription $active={isActive}>
                      {section.description}
                    </SectionDescription>
                  </SectionInfo>
                  
                  {section.badge && (
                    <SectionBadge $active={isActive}>
                      {section.badge}
                    </SectionBadge>
                  )}
                </SectionItem>
              );
            })}
          </SectionList>
        </SidebarCard>
      </Sidebar>

      <ContentArea>
        <ContentCard>
          {loading && (
            <LoadingOverlay>
              <LoadingContent>
                <Loader size={32} className="animate-spin" />
                <LoadingText>Loading configuration...</LoadingText>
              </LoadingContent>
            </LoadingOverlay>
          )}
          {renderContent()}
        </ContentCard>
      </ContentArea>
    </LayoutContainer>
  );
};

export default SettingsLayout;