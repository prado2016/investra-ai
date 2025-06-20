/**
 * Simple Email Configuration Component
 * Streamlined email server setup similar to Google API key registration
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Mail, Save, TestTube, CheckCircle, AlertCircle, Loader, Eye, EyeOff } from 'lucide-react';
import { EmailConfigurationService } from '../services/emailConfigurationService';
import { useNotifications } from '../hooks/useNotifications';
import type { EmailConfiguration, EmailProvider } from '../lib/database/types';

const ConfigContainer = styled.div`
  max-width: 500px;
  margin: 0 auto;
  padding: 2rem;
`;

const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const Description = styled.p`
  color: #6b7280;
  margin-bottom: 2rem;
  line-height: 1.5;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
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
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  &:disabled {
    background-color: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
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
      color: #6b7280;
    }
  }
`;

const PasswordWrapper = styled.div`
  position: relative;
`;

const PasswordToggle = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;

  &:hover {
    color: #374151;
  }

  [data-theme="dark"] & {
    color: #9ca3af;

    &:hover {
      color: #d1d5db;
    }
  }
`;

const Select = styled.select`
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.875rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;

  &:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
    color: #f3f4f6;

    &:focus {
      border-color: #60a5fa;
      box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.1);
    }
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;

  ${props => props.$variant === 'primary' ? `
    background: #3b82f6;
    color: white;

    &:hover:not(:disabled) {
      background: #2563eb;
    }

    &:disabled {
      background: #9ca3af;
      cursor: not-allowed;
    }
  ` : `
    background: #f3f4f6;
    color: #374151;
    border: 1px solid #d1d5db;

    &:hover:not(:disabled) {
      background: #e5e7eb;
    }

    &:disabled {
      background: #f9fafb;
      color: #9ca3af;
      cursor: not-allowed;
    }

    [data-theme="dark"] & {
      background: #374151;
      color: #d1d5db;
      border-color: #4b5563;

      &:hover:not(:disabled) {
        background: #4b5563;
      }

      &:disabled {
        background: #1f2937;
        color: #6b7280;
      }
    }
  `}
`;

const StatusMessage = styled.div<{ $type: 'success' | 'error' | 'info' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;
  margin-top: 1rem;

  ${props => {
    switch (props.$type) {
      case 'success':
        return `
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
        `;
      case 'error':
        return `
          background: #fef2f2;
          color: #991b1b;
          border: 1px solid #fecaca;
        `;
      case 'info':
        return `
          background: #eff6ff;
          color: #1e40af;
          border: 1px solid #bfdbfe;
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
      }
    }}
  }
`;

const ConfigurationCard = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  margin-top: 2rem;
  background: white;

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
  }
`;

const CardTitle = styled.h3`
  margin: 0 0 1rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const ConfigStatus = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: 8px;
  margin-bottom: 1rem;

  [data-theme="dark"] & {
    background: #1f2937;
  }
`;

const StatusText = styled.span<{ $isActive: boolean }>`
  color: ${props => props.$isActive ? '#059669' : '#6b7280'};
  font-weight: 500;

  [data-theme="dark"] & {
    color: ${props => props.$isActive ? '#10b981' : '#9ca3af'};
  }
`;

const EmailProviderPresets: Record<EmailProvider, {
  name: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
}> = {
  gmail: {
    name: 'Gmail',
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    imap_secure: true
  },
  outlook: {
    name: 'Outlook/Hotmail',
    imap_host: 'outlook.office365.com',
    imap_port: 993,
    imap_secure: true
  },
  yahoo: {
    name: 'Yahoo Mail',
    imap_host: 'imap.mail.yahoo.com',
    imap_port: 993,
    imap_secure: true
  },
  custom: {
    name: 'Custom IMAP Server',
    imap_host: '',
    imap_port: 993,
    imap_secure: true
  }
};

interface SimpleEmailConfigurationProps {
  className?: string;
}

const SimpleEmailConfiguration: React.FC<SimpleEmailConfigurationProps> = ({ className }) => {
  const { success, error } = useNotifications();
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email_address: '',
    password: '',
    provider: 'gmail' as EmailProvider
  });
  
  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  // Configuration state
  const [existingConfig, setExistingConfig] = useState<EmailConfiguration | null>(null);
  const [loadingConfigs, setLoadingConfigs] = useState(true);

  // Load existing configurations
  useEffect(() => {
    loadExistingConfigurations();
  }, []);

  const loadExistingConfigurations = async () => {
    try {
      setLoadingConfigs(true);
      const result = await EmailConfigurationService.getConfigurations();
      
      if (result.success && result.data && result.data.length > 0) {
        // Use the first active configuration
        const activeConfig = result.data.find(config => config.is_active) || result.data[0];
        setExistingConfig(activeConfig);
        
        // Pre-fill form with existing data
        setFormData({
          name: activeConfig.name,
          email_address: activeConfig.email_address,
          password: '', // Never pre-fill password
          provider: activeConfig.provider
        });
      }
    } catch (err) {
      console.error('Failed to load existing configurations:', err);
    } finally {
      setLoadingConfigs(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear status message when user starts typing
    if (statusMessage) {
      setStatusMessage(null);
    }
  };

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const provider = e.target.value as EmailProvider;
    setFormData(prev => ({ ...prev, provider }));
  };

  const handleTestConnection = async () => {
    if (!formData.email_address || !formData.password) {
      setStatusMessage({
        type: 'error',
        message: 'Please enter your email address and password before testing'
      });
      return;
    }

    setIsTestingConnection(true);
    setStatusMessage(null);

    try {
      const preset = EmailProviderPresets[formData.provider];
      
      // Create a temporary configuration for testing
      const testConfig = {
        name: formData.name || 'Test Configuration',
        provider: formData.provider,
        imap_host: preset.imap_host,
        imap_port: preset.imap_port,
        imap_secure: preset.imap_secure,
        email_address: formData.email_address,
        password: formData.password
      };

      // First save/update the configuration
      let configResult;
      if (existingConfig) {
        configResult = await EmailConfigurationService.updateConfiguration(existingConfig.id, testConfig);
      } else {
        configResult = await EmailConfigurationService.createConfiguration(testConfig);
      }

      if (!configResult.success || !configResult.data) {
        throw new Error(configResult.error || 'Failed to save configuration');
      }

      // Then test the connection
      const testResult = await EmailConfigurationService.testConnection(configResult.data.id);
      
      if (testResult.success && testResult.data?.success) {
        setStatusMessage({
          type: 'success',
          message: 'Connection successful! Your email configuration is working properly.'
        });
        setExistingConfig(configResult.data);
        success('Email Configuration', 'Connection test passed successfully');
      } else {
        throw new Error(testResult.data?.error || testResult.error || 'Connection test failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection test failed';
      setStatusMessage({
        type: 'error',
        message: `Connection failed: ${errorMessage}`
      });
      error('Connection Test', errorMessage);
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email_address || !formData.password) {
      setStatusMessage({
        type: 'error',
        message: 'Please fill in all required fields'
      });
      return;
    }

    setIsLoading(true);
    setStatusMessage(null);

    try {
      const preset = EmailProviderPresets[formData.provider];
      
      const configData = {
        name: formData.name || `${formData.provider} - ${formData.email_address}`,
        provider: formData.provider,
        imap_host: preset.imap_host,
        imap_port: preset.imap_port,
        imap_secure: preset.imap_secure,
        email_address: formData.email_address,
        password: formData.password,
        auto_import_enabled: true,
        auto_insert_enabled: false // Start with manual processing
      };

      let result;
      if (existingConfig) {
        result = await EmailConfigurationService.updateConfiguration(existingConfig.id, configData);
      } else {
        result = await EmailConfigurationService.createConfiguration(configData);
      }

      if (result.success && result.data) {
        setExistingConfig(result.data);
        setStatusMessage({
          type: 'success',
          message: 'Email configuration saved successfully!'
        });
        success('Email Configuration', 'Configuration saved successfully');
        
        // Clear password field after successful save
        setFormData(prev => ({ ...prev, password: '' }));
      } else {
        throw new Error(result.error || 'Failed to save configuration');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save configuration';
      setStatusMessage({
        type: 'error',
        message: errorMessage
      });
      error('Save Error', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingConfigs) {
    return (
      <ConfigContainer className={className}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Loader size={24} className="animate-spin" />
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading email configuration...</p>
        </div>
      </ConfigContainer>
    );
  }

  return (
    <ConfigContainer className={className}>
      <Title>
        <Mail size={24} />
        Email Server Configuration
      </Title>
      <Description>
        Connect your email account to automatically import transaction data from Wealthsimple emails.
        This works similar to adding a Google API key - just enter your credentials and test the connection.
      </Description>

      {existingConfig && (
        <ConfigurationCard>
          <CardTitle>Current Configuration</CardTitle>
          <ConfigStatus>
            <div>
              <StatusText $isActive={existingConfig.is_active}>
                {existingConfig.is_active ? 'Active' : 'Inactive'}
              </StatusText>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                {existingConfig.email_address} ({existingConfig.provider})
              </div>
            </div>
            {existingConfig.is_active && <CheckCircle size={20} style={{ color: '#059669' }} />}
          </ConfigStatus>
        </ConfigurationCard>
      )}

      <Form onSubmit={handleSave}>
        <FormGroup>
          <Label htmlFor="provider">Email Provider</Label>
          <Select
            id="provider"
            name="provider"
            value={formData.provider}
            onChange={handleProviderChange}
            disabled={isLoading || isTestingConnection}
          >
            <option value="gmail">Gmail</option>
            <option value="outlook">Outlook/Hotmail</option>
            <option value="yahoo">Yahoo Mail</option>
          </Select>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="email_address">Email Address *</Label>
          <Input
            id="email_address"
            name="email_address"
            type="email"
            value={formData.email_address}
            onChange={handleInputChange}
            placeholder="your.email@gmail.com"
            disabled={isLoading || isTestingConnection}
            required
          />
        </FormGroup>

        <FormGroup>
          <Label htmlFor="password">App Password *</Label>
          <PasswordWrapper>
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Enter your app password"
              disabled={isLoading || isTestingConnection}
              required
              style={{ paddingRight: '2.5rem' }}
            />
            <PasswordToggle
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading || isTestingConnection}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </PasswordToggle>
          </PasswordWrapper>
        </FormGroup>

        <FormGroup>
          <Label htmlFor="name">Configuration Name (Optional)</Label>
          <Input
            id="name"
            name="name"
            type="text"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="My Email Configuration"
            disabled={isLoading || isTestingConnection}
          />
        </FormGroup>

        <ButtonGroup>
          <Button
            type="button"
            $variant="secondary"
            onClick={handleTestConnection}
            disabled={isLoading || isTestingConnection || !formData.email_address || !formData.password}
          >
            {isTestingConnection ? (
              <>
                <Loader size={16} className="animate-spin" />
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
            type="submit"
            $variant="primary"
            disabled={isLoading || isTestingConnection || !formData.email_address || !formData.password}
          >
            {isLoading ? (
              <>
                <Loader size={16} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} />
                Save Configuration
              </>
            )}
          </Button>
        </ButtonGroup>

        {statusMessage && (
          <StatusMessage $type={statusMessage.type}>
            {statusMessage.type === 'success' && <CheckCircle size={16} />}
            {statusMessage.type === 'error' && <AlertCircle size={16} />}
            {statusMessage.type === 'info' && <AlertCircle size={16} />}
            {statusMessage.message}
          </StatusMessage>
        )}
      </Form>

      {formData.provider === 'gmail' && (
        <StatusMessage $type="info">
          <AlertCircle size={16} />
          For Gmail, you'll need to use an App Password instead of your regular password. 
          Go to Google Account settings → Security → App Passwords to generate one.
        </StatusMessage>
      )}
    </ConfigContainer>
  );
};

export default SimpleEmailConfiguration;