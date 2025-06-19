/**
 * Simple Email Server Settings Component
 * Streamlined email server configuration modeled after SimpleApiKeySettings
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Mail, Save, Eye, EyeOff, TestTube, CheckCircle, AlertCircle, Loader, Trash2 } from 'lucide-react';
import { InputField, PasswordField, SelectField } from './FormFields';
import { EmailConfigurationService } from '../services/emailConfigurationService';
import type { EmailProvider } from '../lib/database/types';

const SettingsContainer = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const EmailServerCard = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  background: white;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
`;

const FormGroup = styled.div`
  margin-bottom: 1rem;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
  flex-wrap: wrap;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'test' | 'danger' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  
  ${({ $variant = 'secondary' }) => {
    switch ($variant) {
      case 'primary':
        return `
          background: #3b82f6;
          color: white;
          &:hover { background: #2563eb; }
          &:disabled { background: #94a3b8; cursor: not-allowed; }
        `;
      case 'test':
        return `
          background: #059669;
          color: white;
          &:hover { background: #047857; }
          &:disabled { background: #94a3b8; cursor: not-allowed; }
        `;
      case 'danger':
        return `
          background: #dc2626;
          color: white;
          &:hover { background: #b91c1c; }
        `;
      default:
        return `
          background: #f3f4f6;
          color: #374151;
          border: 1px solid #d1d5db;
          &:hover { background: #e5e7eb; }
        `;
    }
  }}
`;

const StatusMessage = styled.div<{ $success: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 8px;
  margin-top: 1rem;
  background: ${({ $success }) => $success ? '#dcfce7' : '#fee2e2'};
  color: ${({ $success }) => $success ? '#166534' : '#991b1b'};
  font-size: 0.875rem;
`;

const ServerPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
`;

const ServerDisplay = styled.code`
  flex: 1;
  padding: 0.5rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: monospace;
  color: #374151;
`;

const QuickSetupButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
`;

const PresetButton = styled.button<{ $active?: boolean }>`
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: ${({ $active }) => $active ? '#3b82f6' : '#ffffff'};
  color: ${({ $active }) => $active ? '#ffffff' : '#374151'};
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${({ $active }) => $active ? '#2563eb' : '#f3f4f6'};
  }
`;

const EMAIL_PROVIDERS = [
  { value: 'gmail', label: 'Gmail' },
  { value: 'outlook', label: 'Outlook/Hotmail' },
  { value: 'yahoo', label: 'Yahoo Mail' },
  { value: 'custom', label: 'Custom Server' }
];

const PROVIDER_PRESETS = {
  gmail: {
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    name: 'Gmail'
  },
  outlook: {
    host: 'outlook.office365.com',
    port: 993,
    secure: true,
    name: 'Outlook/Hotmail'
  },
  yahoo: {
    host: 'imap.mail.yahoo.com',
    port: 993,
    secure: true,
    name: 'Yahoo Mail'
  },
  custom: {
    host: '',
    port: 993,
    secure: true,
    name: 'Custom Server'
  }
};

interface StoredEmailServer {
  id: string;
  name: string;
  provider: EmailProvider;
  host: string;
  port: number;
  secure: boolean;
  email: string;
  createdAt: string;
  isActive: boolean;
}

const SimpleEmailServerSettings: React.FC = () => {
  const [provider, setProvider] = useState<EmailProvider>('gmail');
  const [serverName, setServerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [host, setHost] = useState('imap.gmail.com');
  const [port, setPort] = useState(993);
  const [secure, setSecure] = useState(true);
  
  const [storedServers, setStoredServers] = useState<StoredEmailServer[]>([]);
  const [revealedPasswords, setRevealedPasswords] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [testingServer, setTestingServer] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Load stored servers on component mount
  useEffect(() => {
    loadStoredServers();
  }, []);

  const loadStoredServers = async () => {
    try {
      const result = await EmailConfigurationService.getConfigurations();
      if (result.success && result.data) {
        const servers: StoredEmailServer[] = result.data.map(config => ({
          id: config.id,
          name: config.name,
          provider: config.provider,
          host: config.imap_host,
          port: config.imap_port,
          secure: config.imap_secure,
          email: config.email_address,
          createdAt: config.created_at,
          isActive: config.is_active
        }));
        setStoredServers(servers);
      }
    } catch (error) {
      console.error('Error loading stored email servers:', error);
      setStoredServers([]);
    }
  };

  const applyPreset = (presetProvider: EmailProvider) => {
    const preset = PROVIDER_PRESETS[presetProvider];
    setProvider(presetProvider);
    setHost(preset.host);
    setPort(preset.port);
    setSecure(preset.secure);
  };

  const handleSaveEmailServer = async () => {
    if (!serverName.trim()) {
      setSaveStatus({ success: false, message: 'Please enter a name for this email server configuration' });
      return;
    }

    if (!email.trim()) {
      setSaveStatus({ success: false, message: 'Please enter your email address' });
      return;
    }

    if (!password.trim()) {
      setSaveStatus({ success: false, message: 'Please enter your password or app password' });
      return;
    }

    if (!host.trim()) {
      setSaveStatus({ success: false, message: 'Please enter the IMAP server host' });
      return;
    }

    try {
      const result = await EmailConfigurationService.createConfiguration({
        name: serverName.trim(),
        provider,
        imap_host: host.trim(),
        imap_port: port,
        imap_secure: secure,
        email_address: email.trim(),
        password: password.trim(),
        auto_import_enabled: true
      });

      if (result.success) {
        setSaveStatus({ success: true, message: 'Email server configuration saved successfully!' });
        
        // Clear form
        setServerName('');
        setEmail('');
        setPassword('');
        
        // Reload stored servers
        await loadStoredServers();
        
        // Clear status after 3 seconds
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        throw new Error(result.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('Error saving email server:', error);
      setSaveStatus({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Failed to save email server configuration. Please try again.' 
      });
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const handleTestEmailServer = async (server: StoredEmailServer) => {
    const serverId = server.id;
    setTestingServer(serverId);

    try {
      // Use the EmailConfigurationService's built-in test method
      const result = await EmailConfigurationService.testConnection(serverId);

      setTestResults(prev => ({
        ...prev,
        [serverId]: {
          success: result.success,
          message: result.success
            ? 'Connection test successful! Server configuration is valid.'
            : result.error || 'Connection test failed'
        }
      }));

    } catch (error) {
      let errorMessage = 'Connection test failed';

      if (error instanceof Error) {
        errorMessage = error.message;
      }

      setTestResults(prev => ({
        ...prev,
        [serverId]: { success: false, message: errorMessage }
      }));
    } finally {
      setTestingServer(null);
    }
  };

  const handleTestCurrentConfiguration = async () => {
    if (!email.trim() || !password.trim() || !host.trim()) {
      setSaveStatus({ success: false, message: 'Please fill in all required fields before testing' });
      return;
    }

    setTestingServer('current');
    setSaveStatus(null);

    try {
      // Use environment variable for API base URL, fallback to current domain
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || window.location.origin;

      // Add timeout to the request
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch(`${apiBaseUrl}/api/email/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          host: host.trim(),
          port: port,
          secure: secure,
          username: email.trim(),
          password: password.trim()
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      setSaveStatus({
        success: result.success,
        message: result.success
          ? 'Connection test successful! You can now save this configuration.'
          : result.message || 'Connection test failed'
      });

      // Auto-save if test is successful
      if (result.success && serverName.trim()) {
        setTimeout(async () => {
          await handleSaveEmailServer();
        }, 1000);
      }

    } catch (error) {
      let errorMessage = 'Connection test failed';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Connection test timed out (30 seconds). Please check your server configuration.';
        } else {
          errorMessage = error.message;
        }
      }

      setSaveStatus({ success: false, message: errorMessage });
    } finally {
      setTestingServer(null);
    }
  };

  const deleteEmailServer = async (serverId: string) => {
    if (confirm('Are you sure you want to delete this email server configuration?')) {
      try {
        const result = await EmailConfigurationService.deleteConfiguration(serverId);
        if (result.success) {
          await loadStoredServers();
        } else {
          console.error('Failed to delete email server:', result.error);
        }
      } catch (error) {
        console.error('Error deleting email server:', error);
      }
    }
  };

  const formatServerInfo = (server: StoredEmailServer) => {
    return `${server.host}:${server.port} ${server.secure ? '(SSL)' : '(No SSL)'}`;
  };

  return (
    <SettingsContainer>
      <SectionTitle>
        <Mail size={24} />
        Email Server Configuration
      </SectionTitle>

      {/* Add New Email Server Form */}
      <EmailServerCard>
        <h3 style={{ margin: '0 0 1rem 0', color: '#374151' }}>Add New Email Server</h3>

        <FormGroup>
          <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151', marginBottom: '0.5rem', display: 'block' }}>
            Quick Setup
          </label>
          <QuickSetupButtons>
            {EMAIL_PROVIDERS.map((providerOption) => (
              <PresetButton
                key={providerOption.value}
                $active={provider === providerOption.value}
                onClick={() => applyPreset(providerOption.value as EmailProvider)}
              >
                {providerOption.label}
              </PresetButton>
            ))}
          </QuickSetupButtons>
        </FormGroup>

        <FormGroup>
          <InputField
            label="Configuration Name"
            value={serverName}
            onChange={setServerName}
            placeholder="e.g., My Gmail Account"
            helpText="Give this email server configuration a memorable name"
          />
        </FormGroup>

        <FormGroup>
          <InputField
            label="Email Address"
            value={email}
            onChange={setEmail}
            placeholder="your.email@gmail.com"
            helpText="The email address you want to connect to"
          />
        </FormGroup>

        <FormGroup>
          <PasswordField
            label="Password / App Password"
            value={password}
            onChange={setPassword}
            placeholder="Enter your password or app password"
            helpText="Use an App Password for Gmail/Outlook (recommended for security)"
          />
        </FormGroup>

        {provider === 'custom' && (
          <>
            <FormGroup>
              <InputField
                label="IMAP Server Host"
                value={host}
                onChange={setHost}
                placeholder="imap.example.com"
                helpText="The IMAP server hostname"
              />
            </FormGroup>

            <FormGroup>
              <InputField
                label="Port"
                value={port.toString()}
                onChange={(value) => setPort(parseInt(value) || 993)}
                placeholder="993"
                helpText="IMAP server port (usually 993 for SSL, 143 for non-SSL)"
              />
            </FormGroup>

            <FormGroup>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="secure"
                  checked={secure}
                  onChange={(e) => setSecure(e.target.checked)}
                />
                <label htmlFor="secure" style={{ fontWeight: '500', color: '#374151' }}>
                  Use SSL/TLS (Recommended)
                </label>
              </div>
            </FormGroup>
          </>
        )}

        {saveStatus && (
          <StatusMessage $success={saveStatus.success}>
            {saveStatus.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {saveStatus.message}
          </StatusMessage>
        )}

        <ActionButtons>
          <Button
            $variant="test"
            onClick={handleTestCurrentConfiguration}
            disabled={testingServer === 'current' || !email.trim() || !password.trim() || !host.trim()}
          >
            {testingServer === 'current' ? <Loader className="animate-spin" size={16} /> : <TestTube size={16} />}
            Test Connection
          </Button>
          <Button $variant="primary" onClick={handleSaveEmailServer}>
            <Save size={16} />
            Save Email Server
          </Button>
        </ActionButtons>
      </EmailServerCard>

      {/* Stored Email Servers */}
      {storedServers.length > 0 && (
        <div>
          <h3 style={{ margin: '2rem 0 1rem 0', color: '#374151' }}>Configured Email Servers</h3>
          {storedServers.map((server) => (
            <EmailServerCard key={server.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h4 style={{ margin: 0, color: '#374151' }}>{server.name}</h4>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                    {EMAIL_PROVIDERS.find(p => p.value === server.provider)?.label || server.provider}
                  </p>
                </div>
                <Button $variant="danger" onClick={() => deleteEmailServer(server.id)}>
                  <Trash2 size={16} />
                  Delete
                </Button>
              </div>

              <FormGroup>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Email Address
                </label>
                <ServerPreview>
                  <ServerDisplay>{server.email}</ServerDisplay>
                </ServerPreview>
              </FormGroup>

              <FormGroup>
                <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                  Server Configuration
                </label>
                <ServerPreview>
                  <ServerDisplay>{formatServerInfo(server)}</ServerDisplay>
                </ServerPreview>
              </FormGroup>

              {testResults[server.id] && (
                <StatusMessage $success={testResults[server.id].success}>
                  {testResults[server.id].success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {testResults[server.id].message}
                </StatusMessage>
              )}

              <ActionButtons>
                <Button
                  $variant="test"
                  onClick={() => handleTestEmailServer(server)}
                  disabled={testingServer === server.id}
                >
                  {testingServer === server.id ? <Loader className="animate-spin" size={16} /> : <TestTube size={16} />}
                  Test Configuration
                </Button>
              </ActionButtons>

              <div style={{
                marginTop: '0.75rem',
                padding: '0.5rem',
                backgroundColor: '#f8fafc',
                borderRadius: '0.25rem',
                fontSize: '0.75rem',
                color: '#64748b'
              }}>
                <strong>Note:</strong> Testing validates server configuration format and reachability.
                Full authentication testing requires re-entering your password.
              </div>
            </EmailServerCard>
          ))}
        </div>
      )}

      {storedServers.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          <Mail size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>No email servers configured yet. Add your first email server above to get started.</p>
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#f8fafc',
            borderRadius: '0.375rem',
            fontSize: '0.875rem',
            textAlign: 'left'
          }}>
            <strong>💡 Quick Setup Tips:</strong>
            <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem' }}>
              <li>For Gmail: Enable 2FA and create an App Password</li>
              <li>For Outlook: Use your Microsoft account password or App Password</li>
              <li>For Yahoo: Enable "Less secure app access" or use App Password</li>
            </ul>
          </div>
        </div>
      )}
    </SettingsContainer>
  );
};

export default SimpleEmailServerSettings;
