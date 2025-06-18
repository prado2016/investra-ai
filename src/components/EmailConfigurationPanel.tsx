import React, { useState, useEffect } from 'react';
import { Card, Button } from './ui';
import { EmailConfigurationService } from '../services/emailConfigurationService';
import type { EmailProvider } from '../lib/database/types';

interface EmailConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
}

const STORAGE_KEY = 'investra_email_config';

export const EmailConfigurationPanel: React.FC = () => {
  const [config, setConfig] = useState<EmailConfig>({
    host: process.env.REACT_APP_IMAP_HOST || 'localhost',
    port: parseInt(process.env.REACT_APP_IMAP_PORT || '993'),
    user: process.env.REACT_APP_IMAP_USER || '',
    password: '',
    secure: true
  });

  const [showPassword, setShowPassword] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSavedConfig, setLastSavedConfig] = useState<EmailConfig | null>(null);
  const [hasExistingConfig, setHasExistingConfig] = useState(false);

  // Load saved configuration on component mount
  useEffect(() => {
    const loadConfigurations = async () => {
      try {
        const result = await EmailConfigurationService.getConfigurations();
        if (result.success && result.data && result.data.length > 0) {
          const savedConfig = result.data[0]; // Use first configuration
          const configToLoad = {
            host: savedConfig.imap_host,
            port: savedConfig.imap_port,
            user: savedConfig.email_address,
            password: '', // Never load password from storage
            secure: savedConfig.imap_secure
          };
          setConfig(prev => ({ ...prev, ...configToLoad }));
          setLastSavedConfig(configToLoad);
          setHasExistingConfig(true);
        } else {
          setHasExistingConfig(false);
        }
      } catch (error) {
        console.warn('Failed to load email configurations from database:', error);
        
        // Fallback to localStorage for backward compatibility
        const savedConfig = localStorage.getItem(STORAGE_KEY);
        if (savedConfig) {
          try {
            const parsed = JSON.parse(savedConfig);
            setConfig(prev => ({ ...prev, ...parsed, password: '' })); // Don't persist password
            setLastSavedConfig(parsed);
          } catch (error) {
            console.warn('Failed to load saved email configuration:', error);
          }
        }
      }
    };
    
    loadConfigurations();
  }, []);

  const saveConfiguration = async () => {
    setSaving(true);
    try {
      // Determine provider from host
      let provider: EmailProvider = 'custom';
      if (config.host.includes('gmail')) {
        provider = 'gmail';
      } else if (config.host.includes('outlook')) {
        provider = 'outlook';
      } else if (config.host.includes('yahoo')) {
        provider = 'yahoo';
      }

      // Try to save to database first
      const result = await EmailConfigurationService.createConfiguration({
        name: `${config.user} Configuration`,
        provider,
        imap_host: config.host,
        imap_port: config.port,
        imap_secure: config.secure,
        email_address: config.user,
        password: config.password, // Will be encrypted by service
        auto_import_enabled: true
      });
      
      if (result.success) {
        const configToSave = { ...config, password: '' };
        setLastSavedConfig(configToSave);
        setHasExistingConfig(true); // Now we definitely have a config
        
        // Keep localStorage as backup
        localStorage.setItem(STORAGE_KEY, JSON.stringify(configToSave));
        
        setTestResult({
          success: true,
          message: hasExistingConfig 
            ? 'Configuration updated successfully!' 
            : 'Configuration saved successfully!'
        });
      } else {
        throw new Error(result.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.warn('Database save failed, falling back to localStorage:', error);
      
      // Fallback to localStorage
      try {
        const configToSave = { ...config, password: '' };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(configToSave));
        setLastSavedConfig(configToSave);
        
        setTestResult({
          success: true,
          message: 'Configuration saved locally (database temporarily unavailable)'
        });
      } catch (fallbackError) {
        setTestResult({
          success: false,
          message: 'Failed to save configuration: ' + (error instanceof Error ? error.message : 'Unknown error')
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    
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
          host: config.host,
          port: config.port,
          secure: config.secure,
          username: config.user,
          password: config.password
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      setTestResult(result);
      
      // Auto-save configuration if connection test is successful
      if (result.success) {
        await saveConfiguration();
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
      
      setTestResult({
        success: false,
        message: errorMessage
      });
    } finally {
      setTesting(false);
    }
  };

  const isConfigChanged = () => {
    if (!lastSavedConfig) return true;
    return (
      config.host !== lastSavedConfig.host ||
      config.port !== lastSavedConfig.port ||
      config.user !== lastSavedConfig.user ||
      config.secure !== lastSavedConfig.secure
    );
  };

  const isFormValid = () => {
    return config.host.trim() && config.user.trim() && config.password.trim() && config.port > 0;
  };

  const presetConfigs = {
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
    selfhosted: {
      host: 'localhost',
      port: 993,
      secure: true,
      name: 'Self-Hosted'
    }
  };

  const applyPreset = (preset: keyof typeof presetConfigs) => {
    const presetConfig = presetConfigs[preset];
    setConfig(prev => ({
      ...prev,
      host: presetConfig.host,
      port: presetConfig.port,
      secure: presetConfig.secure
    }));
  };

  return (
    <Card>
      <div style={{ padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', color: '#1f2937', fontSize: '1.125rem', fontWeight: '600' }}>
          📧 Email Server Configuration
        </h3>

        {/* Environment Variables Check */}
        {(!process.env.REACT_APP_IMAP_HOST || !process.env.REACT_APP_IMAP_USER) && (
          <div style={{ 
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: '#fffbeb',
            border: '1px solid #fde047',
            borderRadius: '0.375rem',
            color: '#92400e'
          }}>
            <strong>⚠️ Environment Variables Missing:</strong>
            <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.875rem' }}>
              Consider setting <code>REACT_APP_IMAP_HOST</code> and <code>REACT_APP_IMAP_USER</code> in your <code>.env</code> file for default values.
            </p>
          </div>
        )}

        {/* Quick Setup Presets */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151' }}>
            Quick Setup:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {Object.entries(presetConfigs).map(([key, preset]) => (
              <Button
                key={key}
                variant="secondary"
                size="sm"
                onClick={() => applyPreset(key as keyof typeof presetConfigs)}
              >
                {preset.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Manual Configuration */}
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', color: '#374151' }}>
              IMAP Server Host:
            </label>
            <input
              type="text"
              value={config.host}
              onChange={(e) => setConfig(prev => ({ ...prev, host: e.target.value }))}
              placeholder="imap.gmail.com"
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.375rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', color: '#374151' }}>
                Email Address:
              </label>
              <input
                type="email"
                value={config.user}
                onChange={(e) => setConfig(prev => ({ ...prev, user: e.target.value }))}
                placeholder="your.email@gmail.com"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', color: '#374151' }}>
                Port:
              </label>
              <input
                type="number"
                value={config.port}
                onChange={(e) => setConfig(prev => ({ ...prev, port: parseInt(e.target.value) }))}
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontWeight: '500', color: '#374151' }}>
              Password / App Password:
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={config.password}
                onChange={(e) => setConfig(prev => ({ ...prev, password: e.target.value }))}
                placeholder="Enter your password or app password"
                style={{
                  width: '100%',
                  padding: '0.5rem',
                  paddingRight: '2.5rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.375rem',
                  fontSize: '0.875rem'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.5rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6b7280'
                }}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="secure"
              checked={config.secure}
              onChange={(e) => setConfig(prev => ({ ...prev, secure: e.target.checked }))}
            />
            <label htmlFor="secure" style={{ fontWeight: '500', color: '#374151' }}>
              Use SSL/TLS (Recommended)
            </label>
          </div>
        </div>

        {/* Test Connection and Save */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb' }}>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <Button
              onClick={handleTestConnection}
              disabled={testing || !isFormValid()}
              variant="primary"
            >
              {testing ? '🔄 Testing Connection...' : '🧪 Test Connection'}
            </Button>
            
            <Button
              onClick={saveConfiguration}
              disabled={saving || !isConfigChanged()}
              variant="secondary"
            >
              {saving ? '💾 Saving...' : '💾 Save Configuration'}
            </Button>
          </div>

          {testResult && (
            <div style={{
              padding: '0.75rem',
              borderRadius: '0.375rem',
              backgroundColor: testResult.success ? '#f0fdf4' : '#fef2f2',
              border: `1px solid ${testResult.success ? '#bbf7d0' : '#fecaca'}`,
              color: testResult.success ? '#15803d' : '#dc2626'
            }}>
              <strong>{testResult.success ? '✅ Success:' : '❌ Error:'}</strong> {testResult.message}
            </div>
          )}

          {/* Configuration Status */}
          <div style={{ marginTop: '0.75rem', fontSize: '0.875rem' }}>
            {lastSavedConfig ? (
              <div style={{ color: '#059669' }}>
                <strong>✅ Configuration Status:</strong> Saved configuration available for {lastSavedConfig.user}@{lastSavedConfig.host}
                {isConfigChanged() && <span style={{ color: '#d97706' }}> (unsaved changes)</span>}
              </div>
            ) : (
              <div style={{ color: '#dc2626' }}>
                <strong>⚠️ Configuration Status:</strong> No saved configuration found
              </div>
            )}
          </div>
        </div>

        {/* Setup Instructions */}
        <div style={{ 
          marginTop: '1.5rem', 
          padding: '1rem', 
          backgroundColor: '#f8fafc', 
          borderRadius: '0.375rem',
          fontSize: '0.875rem'
        }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>📚 Email Setup Guide:</h4>
          
          <div style={{ marginBottom: '1rem' }}>
            <strong>Step 1: Create a Dedicated Email Account</strong>
            <ol style={{ margin: '0.25rem 0', paddingLeft: '1.25rem', color: '#6b7280' }}>
              <li>Create a new email account specifically for Investra (e.g., <code>investra.transactions@gmail.com</code>)</li>
              <li>This keeps your personal email separate from transaction imports</li>
            </ol>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <strong>Step 2: Enable App Passwords</strong>
            <ol style={{ margin: '0.25rem 0', paddingLeft: '1.25rem', color: '#6b7280' }}>
              <li>Enable 2-factor authentication on your email account</li>
              <li>Generate an App Password (not your regular password)</li>
              <li><strong>Gmail:</strong> <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8' }}>Generate App Password</a></li>
              <li><strong>Outlook:</strong> <a href="https://account.live.com/proofs/AppPassword" target="_blank" rel="noopener noreferrer" style={{ color: '#1d4ed8' }}>Generate App Password</a></li>
            </ol>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <strong>Step 3: Configure Email Forwarding</strong>
            <ol style={{ margin: '0.25rem 0', paddingLeft: '1.25rem', color: '#6b7280' }}>
              <li>Set up email forwarding from your banks/brokers to your Investra email</li>
              <li>Forward transaction confirmations, statements, and trade notifications</li>
              <li>Test forwarding by sending yourself an email</li>
            </ol>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <strong>Step 4: Test & Save Configuration</strong>
            <ol style={{ margin: '0.25rem 0', paddingLeft: '1.25rem', color: '#6b7280' }}>
              <li>Fill in your email settings above</li>
              <li>Click "Test Connection" to verify IMAP access</li>
              <li>Save your configuration for future use</li>
            </ol>
          </div>
          
          <div style={{ marginTop: '0.75rem', padding: '0.5rem', backgroundColor: '#dbeafe', borderRadius: '0.25rem' }}>
            <strong>💡 Pro Tip:</strong> Use Gmail for the most reliable experience. Yahoo Mail may require additional security settings.
          </div>

          <div style={{ marginTop: '0.5rem', padding: '0.5rem', backgroundColor: '#fef3c7', borderRadius: '0.25rem' }}>
            <strong>🔒 Security Note:</strong> Your password is never saved locally. You'll need to re-enter it each time you restart the application.
          </div>
        </div>
      </div>
    </Card>
  );
};

export default EmailConfigurationPanel;
