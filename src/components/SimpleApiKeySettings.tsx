/**
 * Simple API Key Settings Component
 * Temporary localStorage-based implementation for API key storage
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Key, Save, Eye, EyeOff, TestTube, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { InputField, PasswordField, SelectField } from './FormFields';
import { AIServiceManager } from '../services/ai/aiServiceManager';

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

const ApiKeyCard = styled.div`
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
`;

const API_PROVIDERS = [
  { value: 'gemini', label: 'Google Gemini AI' },
  { value: 'openai', label: 'OpenAI GPT' },
  { value: 'openrouter', label: 'OpenRouter' },
  { value: 'yahoo_finance', label: 'Yahoo Finance' },
  { value: 'perplexity', label: 'Perplexity AI' }
];

interface StoredApiKey {
  provider: string;
  keyName: string;
  apiKey: string;
  model?: string;
  createdAt: string;
  isActive: boolean;
  isDefault: boolean;
}

const SimpleApiKeySettings: React.FC = () => {
  const [provider, setProvider] = useState('gemini');
  const [keyName, setKeyName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [storedKeys, setStoredKeys] = useState<StoredApiKey[]>([]);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [saveStatus, setSaveStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [testingKey, setTestingKey] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});

  // Load stored keys on component mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('stock_tracker_api_keys');
      if (stored) {
        const parsed = JSON.parse(stored);
        setStoredKeys(Array.isArray(parsed) ? parsed : []);
      }
    } catch (error) {
      console.error('Error loading stored API keys:', error);
      setStoredKeys([]);
    }
  }, []);

  const handleSaveApiKey = async () => {
    if (!keyName.trim()) {
      setSaveStatus({ success: false, message: 'Please enter a name for this API key' });
      return;
    }

    if (!apiKey.trim()) {
      setSaveStatus({ success: false, message: 'Please enter the API key' });
      return;
    }

    try {
      const newKey: StoredApiKey = {
        provider,
        keyName: keyName.trim(),
        apiKey: apiKey.trim(),
        model: model.trim() || undefined,
        createdAt: new Date().toISOString(),
        isActive: true,
        isDefault: false
      };

      // Check if key with same name already exists
      const existingIndex = storedKeys.findIndex(key => 
        key.keyName === newKey.keyName && key.provider === newKey.provider
      );

      let updatedKeys;
      if (existingIndex >= 0) {
        // Update existing key, preserve isDefault status
        updatedKeys = [...storedKeys];
        updatedKeys[existingIndex] = { ...newKey, isDefault: updatedKeys[existingIndex].isDefault };
        setSaveStatus({ success: true, message: 'API key updated successfully!' });
      } else {
        // Add new key
        updatedKeys = [...storedKeys, newKey];
        setSaveStatus({ success: true, message: 'API key saved successfully!' });
      }

      // Save to localStorage
      localStorage.setItem('stock_tracker_api_keys', JSON.stringify(updatedKeys));
      setStoredKeys(updatedKeys);

      // Reinitialize AI services with new API keys
      try {
        const aiManager = AIServiceManager.getInstance();
        console.log('Reinitializing AI services with updated API keys...');
        
        // Reinitialize services to pick up new API keys from localStorage
        await aiManager.initializeService('gemini');
        if (newKey.provider === 'openai') {
          await aiManager.initializeService('openai');
        }
        
        console.log('✅ AI services reinitialized successfully');
      } catch (error) {
        console.error('❌ Error reinitializing services:', error);
      }

      // Clear form
      setKeyName('');
      setApiKey('');
      setModel('');

      // Clear status after 3 seconds
      setTimeout(() => setSaveStatus(null), 3000);

    } catch (error) {
      console.error('Error saving API key:', error);
      setSaveStatus({ success: false, message: 'Failed to save API key. Please try again.' });
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  const setAsDefault = (targetKey: StoredApiKey) => {
    const updatedKeys = storedKeys.map(key => ({
      ...key,
      isDefault: key.provider === targetKey.provider && key.keyName === targetKey.keyName
    }));
    
    localStorage.setItem('stock_tracker_api_keys', JSON.stringify(updatedKeys));
    setStoredKeys(updatedKeys);
    setSaveStatus({ success: true, message: `Set "${targetKey.keyName}" as default for ${targetKey.provider}` });
    setTimeout(() => setSaveStatus(null), 3000);
  };

  const getModelPlaceholder = (provider: string) => {
    switch (provider) {
      case 'gemini': return 'e.g., gemini-1.5-flash, gemini-1.5-pro';
      case 'openai': return 'e.g., gpt-4o, gpt-3.5-turbo';
      case 'openrouter': return 'e.g., anthropic/claude-3.5-sonnet, meta-llama/llama-3.1-405b';
      case 'perplexity': return 'e.g., llama-3.1-sonar-large-128k-online';
      default: return 'Enter model name (optional)';
    }
  };

  const getKeyFormatHelp = (provider: string) => {
    switch (provider) {
      case 'gemini': return 'Starts with "AI" (e.g., AIzaSy...)';
      case 'openai': return 'Starts with "sk-" (e.g., sk-...)';
      case 'openrouter': return 'Starts with "sk-or-" (e.g., sk-or-...)';
      case 'perplexity': return 'Starts with "pplx-" (e.g., pplx-...)';
      default: return '';
    }
  };

  const handleTestApiKey = async (keyToTest: StoredApiKey) => {
    const keyId = `${keyToTest.provider}_${keyToTest.keyName}`;
    setTestingKey(keyId);

    try {
      console.log(`🧪 Testing ${keyToTest.provider} API key: ${keyToTest.keyName}`);
      
      // Basic format validation first
      if (keyToTest.apiKey.length < 10) {
        throw new Error('API key appears to be too short');
      }

      const formatTests = {
        gemini: (key: string) => key.startsWith('AI') && key.length > 20,
        openai: (key: string) => key.startsWith('sk-') && key.length > 40,
        openrouter: (key: string) => key.startsWith('sk-or-') && key.length > 40,
        yahoo_finance: (key: string) => key.length > 10,
        perplexity: (key: string) => key.startsWith('pplx-') || key.length > 20
      };

      const formatTest = formatTests[keyToTest.provider as keyof typeof formatTests];
      if (formatTest && !formatTest(keyToTest.apiKey)) {
        throw new Error(`API key format doesn't match expected pattern for ${keyToTest.provider}`);
      }

      console.log(`✅ Format validation passed for ${keyToTest.provider}`);

      // Actually test the API connection
      const aiManager = AIServiceManager.getInstance();
      
      // Initialize the service with the test key
      const initialized = await aiManager.initializeService(keyToTest.provider as any, {
        apiKey: keyToTest.apiKey,
        model: keyToTest.provider === 'gemini' ? 'gemini-1.5-flash' : undefined
      });

      if (!initialized) {
        throw new Error('Failed to initialize AI service');
      }

      console.log(`🔌 Service initialized for ${keyToTest.provider}, testing connection...`);

      // Get the service and test connection
      const service = aiManager.getService(keyToTest.provider as any);
      if (!service) {
        throw new Error('Service not available after initialization');
      }

      // Test actual connection
      const testResult = await service.testConnection();
      console.log(`🔍 Connection test result:`, testResult);

      if (testResult.success) {
        const latencyInfo = testResult.latency ? ` (${testResult.latency}ms)` : '';
        setTestResults(prev => ({
          ...prev,
          [keyId]: { 
            success: true, 
            message: `✅ API connection successful!${latencyInfo}` 
          }
        }));
        console.log(`✅ ${keyToTest.provider} API test successful!`);
      } else {
        throw new Error(testResult.error || 'Connection test failed');
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Test failed with unknown error';
      console.error(`❌ ${keyToTest.provider} API test failed:`, message);
      setTestResults(prev => ({
        ...prev,
        [keyId]: { success: false, message: `❌ ${message}` }
      }));
    } finally {
      setTestingKey(null);
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setRevealedKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(keyId)) {
        newSet.delete(keyId);
      } else {
        newSet.add(keyId);
      }
      return newSet;
    });
  };

  const formatApiKey = (key: string, revealed: boolean = false) => {
    if (revealed) return key;
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  };

  const deleteApiKey = (index: number) => {
    if (confirm('Are you sure you want to delete this API key?')) {
      const updatedKeys = storedKeys.filter((_, i) => i !== index);
      localStorage.setItem('stock_tracker_api_keys', JSON.stringify(updatedKeys));
      setStoredKeys(updatedKeys);
    }
  };

  return (
    <SettingsContainer>
      <SectionTitle>
        <Key size={24} />
        API Key Management
      </SectionTitle>

      {/* Add New API Key Form */}
      <ApiKeyCard>
        <h3 style={{ margin: '0 0 1rem 0', color: '#374151' }}>Add New API Key</h3>
        
        <FormGroup>
          <SelectField
            label="Provider"
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            options={API_PROVIDERS}
          />
        </FormGroup>

        <FormGroup>
          <InputField
            label="Key Name"
            value={keyName}
            onChange={setKeyName}
            placeholder="e.g., My Gemini Key"
            helpText="Give this API key a memorable name"
          />
        </FormGroup>

        <FormGroup>
          <PasswordField
            label="API Key"
            value={apiKey}
            onChange={setApiKey}
            placeholder="Enter your API key here"
            helpText={`${getKeyFormatHelp(provider)} - Your API key will be stored securely in your browser`}
          />
        </FormGroup>

        <FormGroup>
          <InputField
            label="Model (Optional)"
            value={model}
            onChange={setModel}
            placeholder={getModelPlaceholder(provider)}
            helpText="Specify which model to use with this API key (leave empty for provider default)"
          />
        </FormGroup>

        {saveStatus && (
          <StatusMessage $success={saveStatus.success}>
            {saveStatus.success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {saveStatus.message}
          </StatusMessage>
        )}

        <ActionButtons>
          <Button $variant="primary" onClick={handleSaveApiKey}>
            <Save size={16} />
            Save API Key
          </Button>
        </ActionButtons>
      </ApiKeyCard>

      {/* Default Keys Summary */}
      {storedKeys.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ margin: '2rem 0 1rem 0', color: '#374151' }}>Current Default Keys</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '1rem' 
          }}>
            {API_PROVIDERS.map(provider => {
              const defaultKey = storedKeys.find(key => key.provider === provider.value && key.isDefault);
              return (
                <div key={provider.value} style={{
                  background: defaultKey ? '#f0fdf4' : '#f9fafb',
                  border: `1px solid ${defaultKey ? '#bbf7d0' : '#e5e7eb'}`,
                  borderRadius: '8px',
                  padding: '1rem'
                }}>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    color: '#374151',
                    marginBottom: '0.5rem'
                  }}>
                    {provider.label}
                  </div>
                  {defaultKey ? (
                    <div>
                      <div style={{ fontSize: '0.875rem', color: '#166534' }}>
                        ✅ {defaultKey.keyName}
                      </div>
                      {defaultKey.model && (
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: '#166534', 
                          fontFamily: 'monospace',
                          marginTop: '0.25rem'
                        }}>
                          {defaultKey.model}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      No default key set
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stored API Keys */}
      {storedKeys.length > 0 && (
        <div>
          <h3 style={{ margin: '2rem 0 1rem 0', color: '#374151' }}>All Stored API Keys</h3>
          {storedKeys.map((key, index) => {
            const keyId = `${key.provider}_${key.keyName}`;
            return (
              <ApiKeyCard key={index}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                      <h4 style={{ margin: 0, color: '#374151' }}>{key.keyName}</h4>
                      {key.isDefault && (
                        <span style={{ 
                          background: '#dcfce7', 
                          color: '#166534', 
                          fontSize: '0.75rem', 
                          padding: '0.125rem 0.5rem', 
                          borderRadius: '12px',
                          fontWeight: '500'
                        }}>
                          Default
                        </span>
                      )}
                    </div>
                    <p style={{ margin: '0', fontSize: '0.875rem', color: '#6b7280' }}>
                      {API_PROVIDERS.find(p => p.value === key.provider)?.label || key.provider}
                      {key.model && (
                        <span style={{ marginLeft: '0.5rem', fontFamily: 'monospace', background: '#f3f4f6', padding: '0.125rem 0.25rem', borderRadius: '4px' }}>
                          {key.model}
                        </span>
                      )}
                    </p>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#9ca3af' }}>
                      Created: {new Date(key.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {!key.isDefault && (
                      <Button 
                        onClick={() => setAsDefault(key)}
                        style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: '#059669' }}
                      >
                        Set Default
                      </Button>
                    )}
                    <Button onClick={() => deleteApiKey(index)} style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', color: '#ef4444' }}>
                      Delete
                    </Button>
                  </div>
                </div>

                <FormGroup>
                  <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                    API Key
                  </label>
                  <KeyPreview>
                    <KeyDisplay>
                      {formatApiKey(key.apiKey, revealedKeys.has(keyId))}
                    </KeyDisplay>
                    <Button onClick={() => toggleKeyVisibility(keyId)}>
                      {revealedKeys.has(keyId) ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </KeyPreview>
                </FormGroup>

                {testResults[keyId] && (
                  <StatusMessage $success={testResults[keyId].success}>
                    {testResults[keyId].success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {testResults[keyId].message}
                  </StatusMessage>
                )}

                <ActionButtons>
                  <Button 
                    $variant="test" 
                    onClick={() => handleTestApiKey(key)}
                    disabled={testingKey === keyId}
                  >
                    {testingKey === keyId ? <Loader className="animate-spin" size={16} /> : <TestTube size={16} />}
                    Test Key
                  </Button>
                </ActionButtons>
              </ApiKeyCard>
            );
          })}
        </div>
      )}

      {storedKeys.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          <Key size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p>No API keys configured yet. Add your first API key above to get started.</p>
        </div>
      )}
    </SettingsContainer>
  );
};

export default SimpleApiKeySettings;
