/**
 * Email Import Interface Component
 * Simplified interface for managing Gmail IMAP connections and triggering email imports
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { 
  Mail, 
  Play, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Key,
  TestTube,
  ArrowRight
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useNotifications } from '../../hooks/useNotifications';

const ImportContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const HeaderSection = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Title = styled.h2`
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

const ConfigurationCard = styled(Card)`
  padding: 2rem;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border: 1px solid #e2e8f0;

  [data-theme="dark"] & {
    background: linear-gradient(135deg, #374151 0%, #4b5563 100%);
    border-color: #4b5563;
  }
`;

const ConfigSection = styled.div`
  margin-bottom: 2rem;

  &:last-child {
    margin-bottom: 0;
  }
`;

const SectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: #374151;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  [data-theme="dark"] & {
    color: #d1d5db;
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const FormField = styled.div`
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
  
  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    background-color: #f9fafb;
    color: #6b7280;
  }

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
    color: #f3f4f6;

    &:focus {
      border-color: #60a5fa;
      box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
    }

    &:disabled {
      background-color: #1f2937;
      color: #9ca3af;
    }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
`;

const StatusSection = styled.div`
  padding: 1.5rem;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px solid #e5e7eb;

  [data-theme="dark"] & {
    background: #1f2937;
    border-color: #374151;
  }
`;

const StatusGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
`;

const StatusItem = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const StatusLabel = styled.span`
  font-size: 0.875rem;
  color: #6b7280;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const StatusValue = styled.span<{ $status: 'success' | 'error' | 'warning' | 'default' }>`
  font-size: 0.875rem;
  font-weight: 500;
  color: ${props => {
    switch (props.$status) {
      case 'success': return '#059669';
      case 'error': return '#dc2626';
      case 'warning': return '#d97706';
      default: return '#374151';
    }
  }};

  [data-theme="dark"] & {
    color: ${props => {
      switch (props.$status) {
        case 'success': return '#10b981';
        case 'error': return '#ef4444';
        case 'warning': return '#f59e0b';
        default: return '#d1d5db';
      }
    }};
  }
`;

const HelpText = styled.p`
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0.5rem 0 0 0;
  line-height: 1.4;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const HighlightBox = styled.div`
  padding: 1rem;
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  margin-top: 1rem;

  [data-theme="dark"] & {
    background: #451a03;
    border-color: #92400e;
  }
`;

interface EmailImportInterfaceProps {
  className?: string;
}

const EmailImportInterface: React.FC<EmailImportInterfaceProps> = ({ className }) => {
  const { success, error } = useNotifications();
  
  // Form state
  const [gmailEmail, setGmailEmail] = useState('');
  const [appPassword, setAppPassword] = useState('');
  const [configName, setConfigName] = useState('Gmail Import');
  
  // Status state
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [emailCount, setEmailCount] = useState(0);

  // Load existing configuration on mount
  useEffect(() => {
    loadConfiguration();
  }, []);

  const loadConfiguration = async () => {
    try {
      // This would call your IMAP configuration service
      // For now, we'll simulate loading existing config
      const response = await fetch('/api/imap/config');
      if (response.ok) {
        const config = await response.json();
        if (config.data) {
          setGmailEmail(config.data.gmail_email || '');
          setConfigName(config.data.name || 'Gmail Import');
          setConnectionStatus(config.data.sync_status === 'success' ? 'success' : 'error');
          setLastSync(config.data.last_sync_at);
          setEmailCount(config.data.emails_synced || 0);
        }
      }
    } catch (err) {
      // Silently handle - user may not have configuration yet
      console.log('No existing configuration found');
    }
  };

  const testConnection = async () => {
    if (!gmailEmail || !appPassword) {
      error('Missing Credentials', 'Please enter both Gmail email and app password');
      return;
    }

    setIsTestingConnection(true);
    try {
      const response = await fetch('/api/imap/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gmail_email: gmailEmail,
          app_password: appPassword
        })
      });

      if (response.ok) {
        setConnectionStatus('success');
        success('Connection Test', 'Successfully connected to Gmail IMAP');
      } else {
        setConnectionStatus('error');
        const errorData = await response.json();
        error('Connection Failed', errorData.message || 'Failed to connect to Gmail');
      }
    } catch (err) {
      setConnectionStatus('error');
      error('Connection Error', 'Network error while testing connection');
    } finally {
      setIsTestingConnection(false);
    }
  };

  const saveConfiguration = async () => {
    if (!gmailEmail || !appPassword || !configName) {
      error('Missing Information', 'Please fill in all required fields');
      return;
    }

    if (connectionStatus !== 'success') {
      error('Test Required', 'Please test the connection first');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/imap/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: configName,
          gmail_email: gmailEmail,
          app_password: appPassword,
          is_active: true
        })
      });

      if (response.ok) {
        success('Configuration Saved', 'Gmail IMAP configuration saved successfully');
        setAppPassword(''); // Clear password for security
        await loadConfiguration(); // Refresh status
      } else {
        const errorData = await response.json();
        error('Save Failed', errorData.message || 'Failed to save configuration');
      }
    } catch (err) {
      error('Save Error', 'Network error while saving configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const triggerEmailPull = async () => {
    setIsTriggering(true);
    try {
      const response = await fetch('/api/imap/trigger-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        await response.json();
        success('Email Pull Started', `Pulling emails from Gmail... Check back in a few minutes.`);
        
        // Refresh status after a delay
        setTimeout(() => {
          loadConfiguration();
        }, 3000);
      } else {
        const errorData = await response.json();
        error('Pull Failed', errorData.message || 'Failed to trigger email pull');
      }
    } catch (err) {
      error('Pull Error', 'Network error while triggering email pull');
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <ImportContainer className={className}>
      <HeaderSection>
        <Title>
          <Mail size={24} />
          Email Import Setup
        </Title>
        
        <Button
          variant="primary"
          onClick={triggerEmailPull}
          disabled={isTriggering || connectionStatus !== 'success'}
        >
          {isTriggering ? (
            <>
              <RefreshCw size={16} className="animate-spin" />
              Pulling Emails...
            </>
          ) : (
            <>
              <Play size={16} />
              Start Email Pull
            </>
          )}
        </Button>
      </HeaderSection>

      <ConfigurationCard>
        {/* Gmail Configuration Section */}
        <ConfigSection>
          <SectionTitle>
            <Settings size={20} />
            Gmail IMAP Configuration
          </SectionTitle>
          
          <FormGrid>
            <FormField>
              <Label htmlFor="configName">Configuration Name</Label>
              <Input
                id="configName"
                type="text"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="Gmail Import"
              />
            </FormField>
            
            <FormField>
              <Label htmlFor="gmailEmail">Gmail Email Address</Label>
              <Input
                id="gmailEmail"
                type="email"
                value={gmailEmail}
                onChange={(e) => setGmailEmail(e.target.value)}
                placeholder="transactions@investra.com"
              />
            </FormField>
          </FormGrid>

          <FormField style={{ marginTop: '1rem' }}>
            <Label htmlFor="appPassword">Gmail App Password</Label>
            <Input
              id="appPassword"
              type="password"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              placeholder="16-character app password"
            />
            <HelpText>
              Generate this in Google Account → Security → App passwords. 
              Make sure 2-factor authentication is enabled first.
            </HelpText>
          </FormField>

          <ButtonGroup style={{ marginTop: '1.5rem' }}>
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={isTestingConnection || !gmailEmail || !appPassword}
            >
              {isTestingConnection ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <TestTube size={16} />
                  Test Connection
                </>
              )}
            </Button>
            
            <Button
              variant="primary"
              onClick={saveConfiguration}
              disabled={isSaving || connectionStatus !== 'success'}
            >
              {isSaving ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle size={16} />
                  Save Configuration
                </>
              )}
            </Button>
          </ButtonGroup>
        </ConfigSection>

        {/* Status Section */}
        <ConfigSection>
          <SectionTitle>
            Status & Statistics
          </SectionTitle>
          
          <StatusSection>
            <StatusGrid>
              <StatusItem>
                <StatusLabel>Connection:</StatusLabel>
                <StatusValue $status={connectionStatus === 'success' ? 'success' : connectionStatus === 'error' ? 'error' : 'default'}>
                  {connectionStatus === 'success' && <CheckCircle size={16} />}
                  {connectionStatus === 'error' && <AlertCircle size={16} />}
                  {connectionStatus === 'unknown' && <Settings size={16} />}
                  {connectionStatus === 'success' ? 'Connected' : connectionStatus === 'error' ? 'Failed' : 'Not Tested'}
                </StatusValue>
              </StatusItem>
              
              <StatusItem>
                <StatusLabel>Last Sync:</StatusLabel>
                <StatusValue $status="default">
                  {lastSync ? new Date(lastSync).toLocaleString() : 'Never'}
                </StatusValue>
              </StatusItem>
              
              <StatusItem>
                <StatusLabel>Emails Synced:</StatusLabel>
                <StatusValue $status="default">
                  {emailCount.toLocaleString()}
                </StatusValue>
              </StatusItem>
              
              <StatusItem>
                <StatusLabel>Next Action:</StatusLabel>
                <StatusValue $status={connectionStatus === 'success' ? 'success' : 'warning'}>
                  {connectionStatus === 'success' ? 'Ready to Import' : 'Configure First'}
                  <ArrowRight size={16} />
                </StatusValue>
              </StatusItem>
            </StatusGrid>
          </StatusSection>
        </ConfigSection>

        {/* Help Section */}
        <HighlightBox>
          <SectionTitle style={{ marginBottom: '0.5rem' }}>
            <Key size={20} />
            Quick Setup Guide
          </SectionTitle>
          <HelpText style={{ margin: 0 }}>
            <strong>1.</strong> Enable 2-factor authentication in your Google Account<br/>
            <strong>2.</strong> Go to Security → App passwords and generate a new password<br/>
            <strong>3.</strong> Enter your Gmail email and the 16-character app password above<br/>
            <strong>4.</strong> Test the connection, then save your configuration<br/>
            <strong>5.</strong> Use "Start Email Pull" to import recent emails for review
          </HelpText>
        </HighlightBox>
      </ConfigurationCard>
    </ImportContainer>
  );
};

export default EmailImportInterface;