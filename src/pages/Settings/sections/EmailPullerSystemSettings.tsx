/**
 * Email-Puller System Settings Section
 * Configuration for database-driven email-puller system settings
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import {
  Mail,
  Clock,
  Database,
  AlertCircle,
  CheckCircle,
  Loader2,
  RefreshCw,
  Save,
  Settings
} from 'lucide-react';

import { Button } from '../../../components/ui/Button';
import { useNotifications } from '../../../hooks/useNotifications';
import { supabase } from '../../../lib/supabase';

// Styled components
const SectionContainer = styled.div`
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;

  [data-theme="dark"] & {
    background: #1e293b;
    border-color: #334155;
  }
`;

const SectionHeader = styled.div`
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;

  [data-theme="dark"] & {
    border-color: #334155;
  }
`;

const SectionTitle = styled.h2`
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0 0 0.5rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  [data-theme="dark"] & {
    color: #f1f5f9;
  }
`;

const SectionDescription = styled.p`
  color: #64748b;
  margin: 0;
  font-size: 0.875rem;

  [data-theme="dark"] & {
    color: #94a3b8;
  }
`;

const SectionContent = styled.div`
  padding: 1.5rem;
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  margin-bottom: 1.5rem;

  [data-theme="dark"] & {
    border-color: #334155;
  }
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  background: none;
  color: ${props => props.$active ? '#3b82f6' : '#64748b'};
  border-bottom: 2px solid ${props => props.$active ? '#3b82f6' : 'transparent'};
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &:hover {
    color: #3b82f6;
  }

  [data-theme="dark"] & {
    color: ${props => props.$active ? '#60a5fa' : '#94a3b8'};
    border-bottom-color: ${props => props.$active ? '#60a5fa' : 'transparent'};

    &:hover {
      color: #60a5fa;
    }
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;

  [data-theme="dark"] & {
    color: #d1d5db;
  }
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;

    &:focus {
      border-color: #60a5fa;
      box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
    }
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  transition: border-color 0.2s;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;

    &:focus {
      border-color: #60a5fa;
      box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
    }
  }
`;

const CheckboxContainer = styled.label`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  font-size: 0.875rem;
  color: #374151;

  [data-theme="dark"] & {
    color: #d1d5db;
  }
`;

const Checkbox = styled.input`
  width: 1rem;
  height: 1rem;
  accent-color: #3b82f6;
`;

const HelpText = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
  margin-top: 1.5rem;

  [data-theme="dark"] & {
    border-color: #334155;
  }
`;

const StatusMessage = styled.div<{ $type: 'success' | 'error' | 'info' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  margin-bottom: 1rem;

  ${props => {
    switch (props.$type) {
      case 'success':
        return `
          background: #dcfce7;
          color: #166534;
          border: 1px solid #bbf7d0;
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
        return '';
    }
  }}
`;

interface SystemConfig {
  // Email Settings
  sync_interval_minutes: number;
  max_emails_per_sync: number;
  enable_scheduler: boolean;
  archive_after_sync: boolean;
  processed_folder_name: string;
  
  // Logging Settings
  enable_logging: boolean;
  log_level: 'debug' | 'info' | 'warn' | 'error';
  
  // Monitoring Settings
  sync_request_poll_interval: number;
  cleanup_old_requests_days: number;
  
  // IMAP Settings
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
}

const defaultConfig: SystemConfig = {
  sync_interval_minutes: 30,
  max_emails_per_sync: 50,
  enable_scheduler: true,
  archive_after_sync: true,
  processed_folder_name: 'Investra/Processed',
  enable_logging: true,
  log_level: 'info',
  sync_request_poll_interval: 10,
  cleanup_old_requests_days: 7,
  imap_host: 'imap.gmail.com',
  imap_port: 993,
  imap_secure: true,
};

const EmailPullerSystemSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('email');
  const [config, setConfig] = useState<SystemConfig>(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const { success, error: notifyError } = useNotifications();

  // Load configuration from database
  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('config_key, config_value, config_type');

      if (error) throw error;

      const configMap = new Map<string, any>();
      data?.forEach(item => {
        let value: any = item.config_value;
        
        switch (item.config_type) {
          case 'number':
            value = parseFloat(value);
            break;
          case 'boolean':
            value = value.toLowerCase() === 'true';
            break;
          case 'json':
            try {
              value = JSON.parse(value);
            } catch {
              console.warn(`Invalid JSON in config ${item.config_key}`);
            }
            break;
        }
        
        configMap.set(item.config_key, value);
      });

      setConfig({
        sync_interval_minutes: configMap.get('sync_interval_minutes') || defaultConfig.sync_interval_minutes,
        max_emails_per_sync: configMap.get('max_emails_per_sync') || defaultConfig.max_emails_per_sync,
        enable_scheduler: configMap.get('enable_scheduler') ?? defaultConfig.enable_scheduler,
        archive_after_sync: configMap.get('archive_after_sync') ?? defaultConfig.archive_after_sync,
        processed_folder_name: configMap.get('processed_folder_name') || defaultConfig.processed_folder_name,
        enable_logging: configMap.get('enable_logging') ?? defaultConfig.enable_logging,
        log_level: configMap.get('log_level') || defaultConfig.log_level,
        sync_request_poll_interval: configMap.get('sync_request_poll_interval') || defaultConfig.sync_request_poll_interval,
        cleanup_old_requests_days: configMap.get('cleanup_old_requests_days') || defaultConfig.cleanup_old_requests_days,
        imap_host: configMap.get('imap_host') || defaultConfig.imap_host,
        imap_port: configMap.get('imap_port') || defaultConfig.imap_port,
        imap_secure: configMap.get('imap_secure') ?? defaultConfig.imap_secure,
      });

      setLastUpdated(new Date().toLocaleString());
      setMessage({ type: 'success', text: 'Configuration loaded successfully' });

    } catch (error) {
      console.error('Error loading system configuration:', error);
      setMessage({ type: 'error', text: 'Failed to load configuration' });
    } finally {
      setLoading(false);
    }
  };

  // Save configuration to database
  const saveConfig = async () => {
    setSaving(true);
    try {
      const configUpdates = [
        { key: 'sync_interval_minutes', value: config.sync_interval_minutes, type: 'number' },
        { key: 'max_emails_per_sync', value: config.max_emails_per_sync, type: 'number' },
        { key: 'enable_scheduler', value: config.enable_scheduler, type: 'boolean' },
        { key: 'archive_after_sync', value: config.archive_after_sync, type: 'boolean' },
        { key: 'processed_folder_name', value: config.processed_folder_name, type: 'string' },
        { key: 'enable_logging', value: config.enable_logging, type: 'boolean' },
        { key: 'log_level', value: config.log_level, type: 'string' },
        { key: 'sync_request_poll_interval', value: config.sync_request_poll_interval, type: 'number' },
        { key: 'cleanup_old_requests_days', value: config.cleanup_old_requests_days, type: 'number' },
        { key: 'imap_host', value: config.imap_host, type: 'string' },
        { key: 'imap_port', value: config.imap_port, type: 'number' },
        { key: 'imap_secure', value: config.imap_secure, type: 'boolean' },
      ];

      for (const update of configUpdates) {
        const { error } = await supabase
          .from('system_config')
          .upsert({
            config_key: update.key,
            config_value: update.value.toString(),
            config_type: update.type,
            updated_at: new Date().toISOString(),
          });

        if (error) throw error;
      }

      setMessage({ type: 'success', text: 'Configuration saved! Email-puller will use new settings immediately.' });
      setLastUpdated(new Date().toLocaleString());
      success('Settings Saved', 'Email-puller system configuration updated successfully');

    } catch (error) {
      console.error('Error saving system configuration:', error);
      setMessage({ type: 'error', text: 'Failed to save configuration' });
      notifyError('Save Failed', 'Failed to save email-puller configuration');
    } finally {
      setSaving(false);
    }
  };

  // Load config on component mount
  useEffect(() => {
    loadConfig();
  }, []);

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleInputChange = (key: keyof SystemConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const renderEmailSettings = () => (
    <FormGrid>
      <FormGroup>
        <Label>Max Emails Per Sync</Label>
        <Input
          type="number"
          min="1"
          max="200"
          value={config.max_emails_per_sync}
          onChange={(e) => handleInputChange('max_emails_per_sync', parseInt(e.target.value))}
        />
        <HelpText>Maximum number of emails to process in a single sync operation</HelpText>
      </FormGroup>

      <FormGroup>
        <Label>Processed Folder Name</Label>
        <Input
          type="text"
          value={config.processed_folder_name}
          onChange={(e) => handleInputChange('processed_folder_name', e.target.value)}
        />
        <HelpText>Gmail folder name for processed emails</HelpText>
      </FormGroup>

      <FormGroup>
        <CheckboxContainer>
          <Checkbox
            type="checkbox"
            checked={config.archive_after_sync}
            onChange={(e) => handleInputChange('archive_after_sync', e.target.checked)}
          />
          Archive After Sync
        </CheckboxContainer>
        <HelpText>Move emails to processed table after syncing</HelpText>
      </FormGroup>

      <FormGroup>
        <Label>IMAP Host</Label>
        <Input
          type="text"
          value={config.imap_host}
          onChange={(e) => handleInputChange('imap_host', e.target.value)}
        />
      </FormGroup>

      <FormGroup>
        <Label>IMAP Port</Label>
        <Input
          type="number"
          min="1"
          max="65535"
          value={config.imap_port}
          onChange={(e) => handleInputChange('imap_port', parseInt(e.target.value))}
        />
      </FormGroup>

      <FormGroup>
        <CheckboxContainer>
          <Checkbox
            type="checkbox"
            checked={config.imap_secure}
            onChange={(e) => handleInputChange('imap_secure', e.target.checked)}
          />
          Use Secure Connection (SSL/TLS)
        </CheckboxContainer>
      </FormGroup>
    </FormGrid>
  );

  const renderSchedulingSettings = () => (
    <FormGrid>
      <FormGroup>
        <Label>Sync Interval (Minutes)</Label>
        <Input
          type="number"
          min="5"
          max="1440"
          value={config.sync_interval_minutes}
          onChange={(e) => handleInputChange('sync_interval_minutes', parseInt(e.target.value))}
        />
        <HelpText>How often to automatically sync emails (5-1440 minutes)</HelpText>
      </FormGroup>

      <FormGroup>
        <Label>Manual Sync Check (Seconds)</Label>
        <Input
          type="number"
          min="5"
          max="300"
          value={config.sync_request_poll_interval}
          onChange={(e) => handleInputChange('sync_request_poll_interval', parseInt(e.target.value))}
        />
        <HelpText>How often to check for manual sync requests</HelpText>
      </FormGroup>

      <FormGroup>
        <CheckboxContainer>
          <Checkbox
            type="checkbox"
            checked={config.enable_scheduler}
            onChange={(e) => handleInputChange('enable_scheduler', e.target.checked)}
          />
          Enable Automatic Sync
        </CheckboxContainer>
        <HelpText>Automatically sync emails at regular intervals</HelpText>
      </FormGroup>
    </FormGrid>
  );

  const renderMonitoringSettings = () => (
    <FormGrid>
      <FormGroup>
        <Label>Cleanup Old Requests (Days)</Label>
        <Input
          type="number"
          min="1"
          max="90"
          value={config.cleanup_old_requests_days}
          onChange={(e) => handleInputChange('cleanup_old_requests_days', parseInt(e.target.value))}
        />
        <HelpText>How long to keep old sync requests in database</HelpText>
      </FormGroup>

      <FormGroup>
        <Label>Log Level</Label>
        <Select
          value={config.log_level}
          onChange={(e) => handleInputChange('log_level', e.target.value)}
        >
          <option value="debug">Debug (Verbose)</option>
          <option value="info">Info (Normal)</option>
          <option value="warn">Warning (Less Verbose)</option>
          <option value="error">Error (Minimal)</option>
        </Select>
        <HelpText>Level of detail for email-puller logs</HelpText>
      </FormGroup>

      <FormGroup>
        <CheckboxContainer>
          <Checkbox
            type="checkbox"
            checked={config.enable_logging}
            onChange={(e) => handleInputChange('enable_logging', e.target.checked)}
          />
          Enable Detailed Logging
        </CheckboxContainer>
        <HelpText>Log detailed information about email processing</HelpText>
      </FormGroup>
    </FormGrid>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'email':
        return renderEmailSettings();
      case 'scheduling':
        return renderSchedulingSettings();
      case 'monitoring':
        return renderMonitoringSettings();
      default:
        return renderEmailSettings();
    }
  };

  return (
    <SectionContainer>
      <SectionHeader>
        <SectionTitle>
          <Settings size={20} />
          Email-Puller System Configuration
        </SectionTitle>
        <SectionDescription>
          Configure database-driven settings for the email-puller service. Changes take effect immediately.
        </SectionDescription>
      </SectionHeader>

      <SectionContent>
        {message && (
          <StatusMessage $type={message.type}>
            {message.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
            {message.text}
          </StatusMessage>
        )}

        <TabContainer>
          <Tab $active={activeTab === 'email'} onClick={() => setActiveTab('email')}>
            <Mail size={16} />
            Email Settings
          </Tab>
          <Tab $active={activeTab === 'scheduling'} onClick={() => setActiveTab('scheduling')}>
            <Clock size={16} />
            Scheduling
          </Tab>
          <Tab $active={activeTab === 'monitoring'} onClick={() => setActiveTab('monitoring')}>
            <Database size={16} />
            Monitoring
          </Tab>
        </TabContainer>

        {renderTabContent()}

        <ActionBar>
          <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
            {lastUpdated && `Last updated: ${lastUpdated}`}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={loadConfig}
              disabled={loading || saving}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={saveConfig}
              disabled={loading || saving}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </ActionBar>
      </SectionContent>
    </SectionContainer>
  );
};

export default EmailPullerSystemSettings;