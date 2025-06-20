/**
 * Settings Page - Main Configuration Management Interface
 * Task 8: Build comprehensive settings UI for system configuration
 * 
 * This page provides a tabbed interface for managing all system configurations:
 * - Email Integration (IMAP, processing settings)
 * - AI Services (Google AI, Gemini configuration)
 * - Database (Supabase connection settings)
 * - Monitoring (Health checks, alerts, logging)
 * - Security (Encryption, authentication)
 * - Server (API settings, environment variables)
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Mail,
  Brain,
  Database,
  Activity,
  Shield,
  Server,
  Settings as SettingsIcon,
  Save,
  TestTube,
  Download,
  Upload,
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { usePageTitle } from '../../hooks/usePageTitle';
import { useNotifications } from '../../hooks/useNotifications';

// Import setting sections
import SettingsLayout from './components/SettingsLayout';
import EmailIntegrationSettings from './sections/EmailIntegrationSettings';
import AIServicesSettings from './sections/AIServicesSettings';
import DatabaseSettings from './sections/DatabaseSettings';
import MonitoringSettings from './sections/MonitoringSettings';
import SecuritySettings from './sections/SecuritySettings';
import ServerSettings from './sections/ServerSettings';

// Import hooks
import { useConfigurationManagement } from './hooks/useConfigurationManagement';

const PageContainer = styled.div`
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;

  @media (max-width: 768px) {
    padding: 1rem;
  }
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

  @media (max-width: 768px) {
    font-size: 1.5rem;
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

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  gap: 1rem;
  flex-wrap: wrap;

  @media (max-width: 768px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const ActionGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;

  @media (max-width: 768px) {
    justify-content: center;
  }
`;

const StatusIndicator = styled.div<{ $type: 'success' | 'warning' | 'error' | 'info' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  
  ${props => {
    switch (props.$type) {
      case 'success':
        return `
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
        `;
      case 'warning':
        return `
          background: #fef3c7;
          color: #92400e;
          border: 1px solid #fde68a;
        `;
      case 'error':
        return `
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fecaca;
        `;
      case 'info':
        return `
          background: #dbeafe;
          color: #1e40af;
          border: 1px solid #bfdbfe;
        `;
      default:
        return `
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
        `;
    }
  }}

  [data-theme="dark"] & {
    ${props => {
      switch (props.$type) {
        case 'success':
          return `
            background: #064e3b;
            color: #a7f3d0;
            border-color: #065f46;
          `;
        case 'warning':
          return `
            background: #78350f;
            color: #fde68a;
            border-color: #92400e;
          `;
        case 'error':
          return `
            background: #7f1d1d;
            color: #fecaca;
            border-color: #991b1b;
          `;
        case 'info':
          return `
            background: #1e3a8a;
            color: #bfdbfe;
            border-color: #1e40af;
          `;
        default:
          return `
            background: #374151;
            color: #9ca3af;
            border-color: #4b5563;
          `;
      }
    }}
  }
`;

// Define available setting sections
interface SettingSection {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  component: React.ComponentType;
  description: string;
  badge?: string;
}

const settingSections: SettingSection[] = [
  {
    id: 'email',
    label: 'Email Integration',
    icon: Mail,
    component: EmailIntegrationSettings,
    description: 'Configure IMAP settings and email processing rules',
    badge: 'Core'
  },
  {
    id: 'ai',
    label: 'AI Services',
    icon: Brain,
    component: AIServicesSettings,
    description: 'Manage Google AI and Gemini API configurations',
    badge: 'AI'
  },
  {
    id: 'database',
    label: 'Database',
    icon: Database,
    component: DatabaseSettings,
    description: 'Configure Supabase connection and database settings'
  },
  {
    id: 'monitoring',
    label: 'Monitoring',
    icon: Activity,
    component: MonitoringSettings,
    description: 'Set up health checks, alerts, and logging'
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
    component: SecuritySettings,
    description: 'Configure encryption, authentication, and access control'
  },
  {
    id: 'server',
    label: 'Server',
    icon: Server,
    component: ServerSettings,
    description: 'Manage API settings and server configuration'
  }
];

const SettingsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('email');
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  
  // Set page title
  usePageTitle('Settings', { subtitle: 'System Configuration' });

  // Configuration management
  const {
    loading,
    error,
    configurations,
    testConfiguration,
    exportConfigurations,
    importConfigurations,
    refreshConfigurations,
    hasUnsavedChanges,
    saveAllChanges
  } = useConfigurationManagement();

  // Notifications
  const { success, error: notifyError, info } = useNotifications();

  // Handle unsaved changes
  useEffect(() => {
    setUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges]);

  // Handle section change with unsaved changes warning
  const handleSectionChange = (sectionId: string) => {
    if (unsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to switch sections? Unsaved changes will be lost.'
      );
      if (!confirmed) return;
    }
    setActiveSection(sectionId);
  };

  // Handle save all configurations
  const handleSaveAll = async () => {
    try {
      await saveAllChanges();
      success('Settings Saved', 'All configuration changes have been saved successfully');
      setUnsavedChanges(false);
    } catch (err) {
      notifyError('Save Failed', 'Failed to save configuration changes');
      console.error('Failed to save configurations:', err);
    }
  };

  // Handle test all configurations
  const handleTestAll = async () => {
    try {
      info('Testing Configurations', 'Testing all configuration connections...');
      const results = await Promise.all(
        Object.keys(configurations).map(category => 
          testConfiguration(category, configurations[category])
        )
      );
      
      const successful = results.filter(r => r.success).length;
      const total = results.length;
      
      if (successful === total) {
        success('All Tests Passed', `Successfully tested ${total} configurations`);
      } else {
        notifyError('Some Tests Failed', `${successful}/${total} configurations passed testing`);
      }
    } catch (err) {
      notifyError('Test Failed', 'Failed to test configurations');
      console.error('Failed to test configurations:', err);
    }
  };

  // Handle export configurations
  const handleExport = async () => {
    try {
      const exportData = await exportConfigurations();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `investra-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      success('Export Complete', 'Configuration exported successfully');
    } catch (err) {
      notifyError('Export Failed', 'Failed to export configurations');
      console.error('Failed to export configurations:', err);
    }
  };

  // Handle import configurations
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      await importConfigurations(importData);
      success('Import Complete', 'Configuration imported successfully');
      await refreshConfigurations();
    } catch (err) {
      notifyError('Import Failed', 'Failed to import configurations');
      console.error('Failed to import configurations:', err);
    }
    
    // Reset file input
    event.target.value = '';
  };

  // Get status indicator based on configuration state
  const getStatusIndicator = () => {
    if (loading) {
      return (
        <StatusIndicator $type="info">
          <RefreshCw size={16} className="animate-spin" />
          Loading configurations...
        </StatusIndicator>
      );
    }

    if (error) {
      return (
        <StatusIndicator $type="error">
          <AlertCircle size={16} />
          Error loading configurations
        </StatusIndicator>
      );
    }

    if (unsavedChanges) {
      return (
        <StatusIndicator $type="warning">
          <AlertCircle size={16} />
          You have unsaved changes
        </StatusIndicator>
      );
    }

    return (
      <StatusIndicator $type="success">
        <CheckCircle size={16} />
        All configurations saved
      </StatusIndicator>
    );
  };

  // Render active section component
  const renderActiveSection = () => {
    const section = settingSections.find(s => s.id === activeSection);
    if (!section) return null;

    const SectionComponent = section.component;
    return <SectionComponent />;
  };

  return (
    <PageContainer>
      <PageHeader>
        <PageTitle>
          <SettingsIcon size={32} />
          System Configuration
        </PageTitle>
        <PageSubtitle>
          Manage all system settings and integrations from this central location
        </PageSubtitle>
      </PageHeader>

      <ActionBar>
        <ActionGroup>
          {getStatusIndicator()}
        </ActionGroup>
        
        <ActionGroup>
          <Button
            variant="outline"
            size="sm"
            onClick={refreshConfigurations}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Refresh
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestAll}
            disabled={loading}
          >
            <TestTube size={16} />
            Test All
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            disabled={loading}
          >
            <Download size={16} />
            Export
          </Button>
          
          <label>
            <Button
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <Upload size={16} />
              Import
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>
          
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveAll}
            disabled={loading || !unsavedChanges}
          >
            <Save size={16} />
            Save All
          </Button>
        </ActionGroup>
      </ActionBar>

      <SettingsLayout
        sections={settingSections}
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        content={renderActiveSection()}
        loading={loading}
        error={error}
      />
    </PageContainer>
  );
};

export default SettingsPage;