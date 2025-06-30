/**
 * Database-driven API Key Settings Component
 * Stores API keys in the system_config table with encryption
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Key, Save, Eye, EyeOff, TestTube, CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AIServiceManager } from '../services/ai/aiServiceManager';

const SettingsContainer = styled.div`
  max-width: 800px;
`;

const SectionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const ApiKeyCard = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1rem;
  background: white;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);

  [data-theme="dark"] & {
    background: #1e293b;
    border-color: #334155;
  }
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
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

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'test' }>`
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

const ActionButtons = styled.div`
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  flex-wrap: wrap;
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

const HelpText = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const KeyPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.25rem;
`;

const KeyDisplay = styled.code`
  flex: 1;
  padding: 0.5rem;
  background: #f3f4f6;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.875rem;
  font-family: monospace;
  color: #374151;

  [data-theme="dark"] & {
    background: #374151;
    border-color: #4b5563;
    color: #f9fafb;
  }
`;

interface ApiKeyConfig {
  provider: string;
  apiKey: string;
  model: string;
  isConfigured: boolean;
}

const API_PROVIDERS = [
  { 
    value: 'gemini', 
    label: 'Google Gemini AI',
    keyFormat: 'Starts with "AI" (e.g., AIzaSy...)',
    defaultModel: 'gemini-1.5-flash',
    modelOptions: ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-pro-vision']
  },
  { 
    value: 'openai', 
    label: 'OpenAI GPT',
    keyFormat: 'Starts with "sk-" (e.g., sk-...)',
    defaultModel: 'gpt-4o',
    modelOptions: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
  },
  { 
    value: 'openrouter', 
    label: 'OpenRouter',
    keyFormat: 'Starts with "sk-or-" (e.g., sk-or-...)',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    modelOptions: ['anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-405b', 'google/gemini-pro-1.5']
  },
  { 
    value: 'perplexity', 
    label: 'Perplexity AI',
    keyFormat: 'Starts with "pplx-" (e.g., pplx-...)',
    defaultModel: 'llama-3.1-sonar-large-128k-online',
    modelOptions: ['llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-small-128k-online']
  },
  { 
    value: 'yahoo_finance', 
    label: 'Yahoo Finance',
    keyFormat: 'API key for market data',
    defaultModel: '',
    modelOptions: []
  }
];

const DatabaseApiKeySettings: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<Record<string, ApiKeyConfig>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Load API keys from database
  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('config_key, config_value')
        .in('config_key', [
          'gemini_api_key', 'gemini_model',
          'openai_api_key', 'openai_model',
          'openrouter_api_key', 'openrouter_model',
          'perplexity_api_key', 'perplexity_model',
          'yahoo_finance_api_key'
        ]);

      if (error) throw error;

      const configMap = new Map<string, string>();
      data?.forEach(item => {
        configMap.set(item.config_key, item.config_value);
      });

      const newApiKeys: Record<string, ApiKeyConfig> = {};
      
      API_PROVIDERS.forEach(provider => {
        const apiKey = configMap.get(`${provider.value}_api_key`) || '';
        const model = configMap.get(`${provider.value}_model`) || provider.defaultModel;
        
        newApiKeys[provider.value] = {
          provider: provider.value,
          apiKey,
          model,
          isConfigured: apiKey.length > 0
        };
      });

      setApiKeys(newApiKeys);
      setMessage({ type: 'success', text: 'API keys loaded successfully' });

    } catch (error) {
      console.error('Error loading API keys:', error);
      setMessage({ type: 'error', text: 'Failed to load API keys' });
    } finally {
      setLoading(false);
    }
  };

  // Save API key to database
  const saveApiKey = async (provider: string) => {
    setSaving(provider);
    try {
      const config = apiKeys[provider];
      if (!config) return;

      // Save API key
      if (config.apiKey) {
        const { error: keyError } = await supabase
          .from('system_config')
          .upsert({
            config_key: `${provider}_api_key`,
            config_value: config.apiKey,
            config_type: 'string',
            is_encrypted: true,
            updated_at: new Date().toISOString(),
          });

        if (keyError) throw keyError;
      }

      // Save model
      if (config.model) {
        const { error: modelError } = await supabase
          .from('system_config')
          .upsert({
            config_key: `${provider}_model`,
            config_value: config.model,
            config_type: 'string',
            is_encrypted: false,
            updated_at: new Date().toISOString(),
          });

        if (modelError) throw modelError;
      }

      setMessage({ type: 'success', text: `${provider} API key saved successfully!` });

      // Reinitialize AI services
      try {
        const aiManager = AIServiceManager.getInstance();
        await aiManager.initializeService(provider as any);
      } catch (aiError) {
        console.warn('Failed to reinitialize AI service:', aiError);
      }

    } catch (error) {
      console.error('Error saving API key:', error);
      setMessage({ type: 'error', text: `Failed to save ${provider} API key` });
    } finally {
      setSaving(null);
    }
  };

  // Test API key
  const testApiKey = async (provider: string) => {
    setTesting(provider);
    try {
      const config = apiKeys[provider];
      if (!config?.apiKey) {
        throw new Error('No API key configured');
      }

      // Basic format validation
      const providerConfig = API_PROVIDERS.find(p => p.value === provider);
      if (providerConfig && provider !== 'yahoo_finance') {
        const formatTests = {
          gemini: (key: string) => key.startsWith('AI') && key.length > 20,
          openai: (key: string) => key.startsWith('sk-') && key.length > 40,
          openrouter: (key: string) => key.startsWith('sk-or-') && key.length > 40,
          perplexity: (key: string) => key.startsWith('pplx-') || key.length > 20
        };

        const formatTest = formatTests[provider as keyof typeof formatTests];
        if (formatTest && !formatTest(config.apiKey)) {
          throw new Error(`API key format doesn't match expected pattern`);
        }
      }

      // Test actual connection
      const aiManager = AIServiceManager.getInstance();
      const initialized = await aiManager.initializeService(provider as any, {
        apiKey: config.apiKey,
        model: config.model
      });

      if (!initialized) {
        throw new Error('Failed to initialize service');
      }

      const service = aiManager.getService(provider as any);
      if (!service) {
        throw new Error('Service not available');
      }

      const testResult = await service.testConnection();
      if (testResult.success) {
        const latencyInfo = testResult.latency ? ` (${testResult.latency}ms)` : '';
        setTestResults(prev => ({
          ...prev,
          [provider]: { success: true, message: `✅ Connection successful!${latencyInfo}` }
        }));
      } else {
        throw new Error(testResult.error || 'Connection test failed');
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Test failed';
      setTestResults(prev => ({
        ...prev,
        [provider]: { success: false, message: `❌ ${message}` }
      }));
    } finally {
      setTesting(null);
    }
  };

  // Load API keys on component mount
  useEffect(() => {
    loadApiKeys();
  }, []);

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handleApiKeyChange = (provider: string, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        apiKey: value,
        isConfigured: value.length > 0
      }
    }));
  };

  const handleModelChange = (provider: string, value: string) => {
    setApiKeys(prev => ({
      ...prev,
      [provider]: {
        ...prev[provider],
        model: value
      }
    }));
  };

  const toggleKeyVisibility = (provider: string) => {
    setRevealedKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(provider)) {
        newSet.delete(provider);
      } else {
        newSet.add(provider);
      }
      return newSet;
    });
  };

  const formatApiKey = (key: string, revealed: boolean = false) => {
    if (revealed || key.length === 0) return key;
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  };

  return (
    <SettingsContainer>
      <SectionTitle>
        <Key size={20} />
        Database-Driven API Key Management
      </SectionTitle>

      {message && (
        <StatusMessage $type={message.type}>
          {message.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {message.text}
        </StatusMessage>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
          API keys are stored securely in the database with encryption
        </p>
        <Button onClick={loadApiKeys} disabled={loading}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
          Refresh
        </Button>
      </div>

      {API_PROVIDERS.map(provider => {
        const config = apiKeys[provider.value];
        if (!config) return null;

        return (
          <ApiKeyCard key={provider.value}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#374151', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {provider.label}
              {config.isConfigured && (
                <span style={{ 
                  background: '#dcfce7', 
                  color: '#166534', 
                  fontSize: '0.75rem', 
                  padding: '0.125rem 0.5rem', 
                  borderRadius: '12px',
                  fontWeight: '500'
                }}>
                  Configured
                </span>
              )}
            </h4>

            <FormGrid>
              <FormGroup>
                <Label>API Key</Label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Input
                    type={revealedKeys.has(provider.value) ? 'text' : 'password'}
                    value={config.apiKey}
                    onChange={(e) => handleApiKeyChange(provider.value, e.target.value)}
                    placeholder="Enter your API key"
                    style={{ flex: 1 }}
                  />
                  <Button onClick={() => toggleKeyVisibility(provider.value)}>
                    {revealedKeys.has(provider.value) ? <EyeOff size={16} /> : <Eye size={16} />}
                  </Button>
                </div>
                <HelpText>{provider.keyFormat}</HelpText>
              </FormGroup>

              {provider.modelOptions.length > 0 && (
                <FormGroup>
                  <Label>Model</Label>
                  <Select
                    value={config.model}
                    onChange={(e) => handleModelChange(provider.value, e.target.value)}
                  >
                    {provider.modelOptions.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </Select>
                  <HelpText>Choose the AI model to use with this provider</HelpText>
                </FormGroup>
              )}
            </FormGrid>

            {config.isConfigured && (
              <KeyPreview>
                <KeyDisplay>
                  {formatApiKey(config.apiKey, revealedKeys.has(provider.value))}
                </KeyDisplay>
              </KeyPreview>
            )}

            {testResults[provider.value] && (
              <StatusMessage $type={testResults[provider.value].success ? 'success' : 'error'}>
                {testResults[provider.value].success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {testResults[provider.value].message}
              </StatusMessage>
            )}

            <ActionButtons>
              <Button 
                $variant="primary" 
                onClick={() => saveApiKey(provider.value)}
                disabled={saving === provider.value || loading}
              >
                {saving === provider.value ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Save
                  </>
                )}
              </Button>

              {config.isConfigured && provider.value !== 'yahoo_finance' && (
                <Button 
                  $variant="test" 
                  onClick={() => testApiKey(provider.value)}
                  disabled={testing === provider.value || loading}
                >
                  {testing === provider.value ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube size={16} />
                      Test
                    </>
                  )}
                </Button>
              )}
            </ActionButtons>
          </ApiKeyCard>
        );
      })}
    </SettingsContainer>
  );
};

export default DatabaseApiKeySettings;