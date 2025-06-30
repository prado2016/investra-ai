/**
 * Enhanced Email-Puller System Settings Section
 * Shows both UI configuration AND essential environment variables needed
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
  Settings,
  Server,
  Key,
  Copy,
  Eye,
  EyeOff
} from 'lucide-react';

import { Button } from '../../../components/ui/Button';
import { useNotifications } from '../../../hooks/useNotifications';
import { supabase } from '../../../lib/supabase';

const SettingsContainer = styled.div`
  max-width: 1000px;
`;

const TabContainer = styled.div`
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 2rem;
`;

const Tab = styled.button<{ $active: boolean }>`
  padding: 1rem 1.5rem;
  border: none;
  background: ${props => props.$active ? 'white' : 'transparent'};
  color: ${props => props.$active ? '#3b82f6' : '#6b7280'};
  border-bottom: 2px solid ${props => props.$active ? '#3b82f6' : 'transparent'};
  cursor: pointer;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;

  &:hover {
    color: #3b82f6;
    background: #f8fafc;
  }
`;

const Section = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
`;

const SectionTitle = styled.h4`
  font-size: 1.1rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
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
`;

const Switch = styled.input.attrs({ type: 'checkbox' })`
  width: 44px;
  height: 24px;
  appearance: none;
  background: #e5e7eb;
  border-radius: 12px;
  position: relative;
  cursor: pointer;
  transition: background-color 0.2s;

  &:checked {
    background: #3b82f6;
  }

  &::before {
    content: '';
    position: absolute;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    top: 2px;
    left: 2px;
    transition: transform 0.2s;
  }

  &:checked::before {
    transform: translateX(20px);
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

const CodeBlock = styled.pre`
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 0.875rem;
  overflow-x: auto;
  margin: 1rem 0;
  position: relative;
`;

const CopyButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: #374151;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  
  &:hover {
    background: #1f2937;
  }
`;

const EnvVarCard = styled.div`
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
`;

const EnvVarItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0;
  border-bottom: 1px solid #e5e7eb;
  
  &:last-child {
    border-bottom: none;
  }
`;

const EnvVarName = styled.code`
  font-family: monospace;
  background: #e5e7eb;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.875rem;
  font-weight: 500;
`;

const EnvVarValue = styled.span<{ $hidden?: boolean }>`
  font-family: monospace;
  font-size: 0.875rem;
  color: #6b7280;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

interface ConfigFormData {
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

const defaultConfig: ConfigFormData = {
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

const EnhancedEmailPullerSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'config' | 'environment' | 'deployment'>('config');
  const [config, setConfig] = useState<ConfigFormData>(defaultConfig);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [showSensitiveValues, setShowSensitiveValues] = useState(false);
  const { addNotification } = useNotifications();

  // Load configuration from database
  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('config_key, config_value, config_type, description, is_encrypted');

      if (error) throw error;

      const configMap = new Map<string, any>();
      data?.forEach(item => {
        let value: any = item.config_value;
        
        // Convert data types
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

      // Update form data with loaded config
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

      // Update each configuration item
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

      setMessage({ type: 'success', text: 'Configuration saved successfully! Email-puller will use new settings.' });
      setLastUpdated(new Date().toLocaleString());
      addNotification('Email-puller configuration updated', 'success');

    } catch (error) {
      console.error('Error saving system configuration:', error);
      setMessage({ type: 'error', text: 'Failed to save configuration' });
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

  const handleInputChange = (key: keyof ConfigFormData, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addNotification('Copied to clipboard', 'success');
  };

  // Environment variables that email-puller needs
  const environmentVariables = [
    {
      name: 'SUPABASE_URL',
      value: 'https://ecbuwhpipphdssqjwgfm.supabase.co',
      description: 'Supabase project URL (required for database connection)',
      sensitive: false
    },
    {
      name: 'SUPABASE_ANON_KEY',
      value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgxMzY4OTAsImV4cCI6MjA0MzcxMjg5MH0.4iQNsNUNcUIj7xPUEBEMECrNYSu64Ncd86ByUQiYeD4',
      description: 'Supabase anonymous key (required for authentication)',
      sensitive: true
    },
    {
      name: 'NODE_ENV',
      value: 'production',
      description: 'Runtime environment',
      sensitive: false
    }
  ];

  const renderEnvironmentTab = () => (
    <div>
      <Section>
        <SectionTitle>
          <Server size={18} />
          Essential Environment Variables
        </SectionTitle>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          These environment variables are required for the email-puller service to connect to the database and function properly:
        </p>

        <div style={{ display: 'flex', align: 'center', gap: '1rem', marginBottom: '1rem' }}>
          <Button 
            onClick={() => setShowSensitiveValues(!showSensitiveValues)}
            style={{ fontSize: '0.875rem' }}
          >
            {showSensitiveValues ? <EyeOff size={16} /> : <Eye size={16} />}
            {showSensitiveValues ? 'Hide' : 'Show'} Sensitive Values
          </Button>
        </div>

        <EnvVarCard>
          {environmentVariables.map((envVar) => (
            <EnvVarItem key={envVar.name}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <EnvVarName>{envVar.name}</EnvVarName>
                  {envVar.sensitive && (
                    <span style={{ 
                      fontSize: '0.75rem', 
                      background: '#fef3c7', 
                      color: '#92400e', 
                      padding: '0.125rem 0.5rem', 
                      borderRadius: '8px' 
                    }}>
                      Sensitive
                    </span>
                  )}
                </div>
                <EnvVarValue $hidden={envVar.sensitive && !showSensitiveValues}>
                  {envVar.sensitive && !showSensitiveValues 
                    ? '••••••••••••••••••••••••••••••••••••••••••••••••••••••••'
                    : envVar.value
                  }
                </EnvVarValue>
                <p style={{ fontSize: '0.75rem', color: '#9ca3af', margin: '0.25rem 0 0 0' }}>
                  {envVar.description}
                </p>
              </div>
              <Button 
                onClick={() => copyToClipboard(`${envVar.name}=${envVar.value}`)}
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
              >
                <Copy size={12} />
              </Button>
            </EnvVarItem>
          ))}
        </EnvVarCard>

        <Section>
          <SectionTitle>
            <Settings size={18} />
            .env File Template
          </SectionTitle>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
            Create a <code>.env</code> file in your email-puller directory with these contents:
          </p>
          <CodeBlock>
{`# Required Supabase Configuration
SUPABASE_URL=https://ecbuwhpipphdssqjwgfm.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgxMzY4OTAsImV4cCI6MjA0MzcxMjg5MH0.4iQNsNUNcUIj7xPUEBEMECrNYSu64Ncd86ByUQiYeD4

# Runtime Environment
NODE_ENV=production

# Optional: Override default log level
# LOG_LEVEL=info

# Note: All other configuration is now stored in the database
# and can be managed through this UI interface`}
            <CopyButton onClick={() => copyToClipboard(`# Required Supabase Configuration
SUPABASE_URL=https://ecbuwhpipphdssqjwgfm.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnV3aHBpcHBoZHNzcWp3Z2ZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgxMzY4OTAsImV4cCI6MjA0MzcxMjg5MH0.4iQNsNUNcUIj7xPUEBEMECrNYSu64Ncd86ByUQiYeD4

NODE_ENV=production`)}>
              <Copy size={12} />
              Copy
            </CopyButton>
          </CodeBlock>
        </Section>
      </Section>

      <Section>
        <SectionTitle>
          <Database size={18} />
          Gmail Credentials
        </SectionTitle>
        <p style={{ color: '#6b7280', marginBottom: '1rem' }}>
          Gmail credentials (email and app password) are stored in the database in the <code>email_accounts</code> table 
          and can be managed through the Email Management interface. The email-puller service loads these automatically.
        </p>
        <StatusMessage $type="info">
          <CheckCircle size={16} />
          Gmail credentials are encrypted in the database and loaded at runtime
        </StatusMessage>
      </Section>
    </div>
  );

  const renderDeploymentTab = () => (
    <div>
      <Section>
        <SectionTitle>
          <Server size={18} />
          Deployment Status
        </SectionTitle>
        <p style={{ color: '#6b7280', marginBottom: '1.5rem' }}>
          The email-puller service is deployed via GitHub Actions to <code>/opt/investra/email-puller</code> on your server.
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          <h5 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>Service Management Commands:</h5>
          <CodeBlock>
{`# Check service status
pm2 status investra-email-puller

# View logs
pm2 logs investra-email-puller --lines 50

# Restart service
pm2 restart investra-email-puller

# Check if service is pulling from database
pm2 logs investra-email-puller | grep "Configuration loaded"`}
            <CopyButton onClick={() => copyToClipboard(`pm2 status investra-email-puller
pm2 logs investra-email-puller --lines 50
pm2 restart investra-email-puller`)}>
              <Copy size={12} />
              Copy
            </CopyButton>
          </CodeBlock>
        </div>

        <StatusMessage $type="info">
          <CheckCircle size={16} />
          The service automatically loads configuration from the database on startup and configuration changes
        </StatusMessage>
      </Section>
    </div>
  );

  return (
    <SettingsContainer>
      {message && (
        <StatusMessage $type={message.type}>
          {message.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {message.text}
        </StatusMessage>
      )}

      <TabContainer>
        <Tab $active={activeTab === 'config'} onClick={() => setActiveTab('config')}>
          <Settings size={16} />
          Configuration
        </Tab>
        <Tab $active={activeTab === 'environment'} onClick={() => setActiveTab('environment')}>
          <Server size={16} />
          Environment
        </Tab>
        <Tab $active={activeTab === 'deployment'} onClick={() => setActiveTab('deployment')}>
          <Database size={16} />
          Deployment
        </Tab>
      </TabContainer>

      {activeTab === 'environment' && renderEnvironmentTab()}
      {activeTab === 'deployment' && renderDeploymentTab()}

      {activeTab === 'config' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ margin: 0, color: '#374151' }}>Email-Puller Configuration</h3>
              {lastUpdated && (
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                  Last updated: {lastUpdated}
                </p>
              )}
            </div>
            <Button onClick={loadConfig} disabled={loading}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
              Refresh
            </Button>
          </div>

          <Section>
            <SectionTitle>
              <Mail size={18} />
              Email Processing Settings
            </SectionTitle>

            <FormGrid>
              <FormGroup>
                <Label htmlFor="max_emails_per_sync">Max Emails Per Sync</Label>
                <Input
                  id="max_emails_per_sync"
                  type="number"
                  min="1"
                  max="200"
                  value={config.max_emails_per_sync}
                  onChange={(e) => handleInputChange('max_emails_per_sync', parseInt(e.target.value))}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                  Maximum number of emails to process in a single sync operation
                </p>
              </FormGroup>

              <FormGroup>
                <Label htmlFor="processed_folder_name">Processed Folder Name</Label>
                <Input
                  id="processed_folder_name"
                  value={config.processed_folder_name}
                  onChange={(e) => handleInputChange('processed_folder_name', e.target.value)}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                  Gmail folder name for processed emails
                </p>
              </FormGroup>

              <FormGroup>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Label htmlFor="archive_after_sync">Archive After Sync</Label>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                      Move emails to processed folder after syncing
                    </p>
                  </div>
                  <Switch
                    id="archive_after_sync"
                    checked={config.archive_after_sync}
                    onChange={(e) => handleInputChange('archive_after_sync', e.target.checked)}
                  />
                </div>
              </FormGroup>
            </FormGrid>
          </Section>

          <Section>
            <SectionTitle>
              <Clock size={18} />
              Scheduling Settings
            </SectionTitle>

            <FormGrid>
              <FormGroup>
                <Label htmlFor="sync_interval_minutes">Sync Interval (Minutes)</Label>
                <Input
                  id="sync_interval_minutes"
                  type="number"
                  min="5"
                  max="1440"
                  value={config.sync_interval_minutes}
                  onChange={(e) => handleInputChange('sync_interval_minutes', parseInt(e.target.value))}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                  How often to automatically sync emails (5-1440 minutes)
                </p>
              </FormGroup>

              <FormGroup>
                <Label htmlFor="sync_request_poll_interval">Manual Sync Check (Seconds)</Label>
                <Input
                  id="sync_request_poll_interval"
                  type="number"
                  min="5"
                  max="300"
                  value={config.sync_request_poll_interval}
                  onChange={(e) => handleInputChange('sync_request_poll_interval', parseInt(e.target.value))}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                  How often to check for manual sync requests
                </p>
              </FormGroup>

              <FormGroup>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Label htmlFor="enable_scheduler">Enable Automatic Sync</Label>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                      Automatically sync emails at regular intervals
                    </p>
                  </div>
                  <Switch
                    id="enable_scheduler"
                    checked={config.enable_scheduler}
                    onChange={(e) => handleInputChange('enable_scheduler', e.target.checked)}
                  />
                </div>
              </FormGroup>
            </FormGrid>
          </Section>

          <Section>
            <SectionTitle>
              <Database size={18} />
              Monitoring & Cleanup
            </SectionTitle>

            <FormGrid>
              <FormGroup>
                <Label htmlFor="cleanup_old_requests_days">Cleanup Old Requests (Days)</Label>
                <Input
                  id="cleanup_old_requests_days"
                  type="number"
                  min="1"
                  max="90"
                  value={config.cleanup_old_requests_days}
                  onChange={(e) => handleInputChange('cleanup_old_requests_days', parseInt(e.target.value))}
                />
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                  How long to keep old sync requests in database
                </p>
              </FormGroup>

              <FormGroup>
                <Label htmlFor="log_level">Log Level</Label>
                <Select
                  id="log_level"
                  value={config.log_level}
                  onChange={(e) => handleInputChange('log_level', e.target.value as any)}
                >
                  <option value="debug">Debug (Verbose)</option>
                  <option value="info">Info (Normal)</option>
                  <option value="warn">Warning (Less Verbose)</option>
                  <option value="error">Error (Minimal)</option>
                </Select>
                <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                  Level of detail for email-puller logs
                </p>
              </FormGroup>

              <FormGroup>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <Label htmlFor="enable_logging">Enable Detailed Logging</Label>
                    <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.25rem 0 0 0' }}>
                      Log detailed information about email processing
                    </p>
                  </div>
                  <Switch
                    id="enable_logging"
                    checked={config.enable_logging}
                    onChange={(e) => handleInputChange('enable_logging', e.target.checked)}
                  />
                </div>
              </FormGroup>
            </FormGrid>
          </Section>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
              Changes take effect immediately for new operations
            </p>
            <Button onClick={saveConfig} disabled={saving || loading}>
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
        </div>
      )}
    </SettingsContainer>
  );
};

export default EnhancedEmailPullerSettings;