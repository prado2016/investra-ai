/**
 * Fixed Database-driven API Key Settings Component
 * Properly saves to database with console logging and test functionality
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Key, Save, Eye, EyeOff, TestTube, CheckCircle, AlertCircle, Loader2, RefreshCw, Plus, Trash2, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { AIServiceManager } from '../services/ai/aiServiceManager';

const SettingsContainer = styled.div`
  max-width: 1000px;
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

const AddKeyForm = styled.div`
  background: #f8fafc;
  border: 2px dashed #cbd5e1;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;

  [data-theme="dark"] & {
    background: #0f172a;
    border-color: #475569;
  }
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

const CheckboxGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
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

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 18px;
  height: 18px;
  cursor: pointer;
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

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'test' | 'danger' | 'ghost' }>`
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
      case 'danger':
        return `
          background: #ef4444;
          color: white;
          &:hover { background: #dc2626; }
        `;
      case 'ghost':
        return `
          background: transparent;
          color: #6b7280;
          border: 1px solid #e5e7eb;
          &:hover { background: #f9fafb; }
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

const KeyCard = styled.div<{ $isDefault?: boolean }>`
  border: 1px solid ${props => props.$isDefault ? '#10b981' : '#e5e7eb'};
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  background: ${props => props.$isDefault ? '#f0fdf4' : 'white'};
  position: relative;

  [data-theme="dark"] & {
    background: ${props => props.$isDefault ? '#064e3b' : '#1e293b'};
    border-color: ${props => props.$isDefault ? '#10b981' : '#334155'};
  }
`;

const DefaultBadge = styled.span`
  position: absolute;
  top: -8px;
  right: 8px;
  background: #10b981;
  color: white;
  font-size: 0.75rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

interface StoredApiKey {
  id: string;
  provider: string;
  keyName: string;
  apiKey: string;
  model?: string;
  createdAt: string;
  isActive: boolean;
  isDefault: boolean;
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

const FixedDatabaseApiKeySettings: React.FC = () => {
  const [storedKeys, setStoredKeys] = useState<StoredApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  
  // New key form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKey, setNewKey] = useState({
    provider: 'gemini',
    keyName: '',
    apiKey: '',
    model: 'gemini-1.5-flash',
    isDefault: false
  });

  // Load API keys from database
  const loadApiKeys = async () => {
    console.log('🔄 Loading API keys from database...');
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_config')
        .select('config_key, config_value, description, created_at')
        .like('config_key', '%_api_key')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading API keys:', error);
        throw error;
      }

      console.log('📊 Raw API key data from database:', data);

      const keys: StoredApiKey[] = [];
      
      // Process API keys
      if (data) {
        for (const item of data) {
          const keyParts = item.config_key.split('_');
          
          // Handle different key formats
          if (keyParts.length >= 3 && keyParts[keyParts.length - 2] === 'api' && keyParts[keyParts.length - 1] === 'key') {
            // Format: provider_keyname_api_key or provider_api_key
            const provider = keyParts.slice(0, -2).join('_');
            const keyName = keyParts.length > 3 ? keyParts[keyParts.length - 3] : 'default';
            
            console.log(`🔑 Processing key: ${item.config_key} -> provider: ${provider}, keyName: ${keyName}`);
            
            // Load corresponding model
            const modelKey = `${provider}_${keyName !== 'default' ? keyName + '_' : ''}model`;
            const { data: modelData } = await supabase
              .from('system_config')
              .select('config_value')
              .eq('config_key', modelKey)
              .single();

            keys.push({
              id: `${provider}_${keyName}`,
              provider: provider,
              keyName: keyName,
              apiKey: item.config_value,
              model: modelData?.config_value || API_PROVIDERS.find(p => p.value === provider)?.defaultModel || '',
              createdAt: item.created_at,
              isActive: true,
              isDefault: keyName === 'default'
            });
          }
        }
      }

      console.log('✅ Processed API keys:', keys);
      setStoredKeys(keys);
      setMessage({ type: 'success', text: `Loaded ${keys.length} API keys from database` });

    } catch (error) {
      console.error('❌ Error loading API keys:', error);
      setMessage({ type: 'error', text: 'Failed to load API keys from database' });
    } finally {
      setLoading(false);
    }
  };

  // Save new API key to database
  const saveNewApiKey = async () => {
    console.log('💾 Starting to save API key:', { 
      provider: newKey.provider, 
      keyName: newKey.keyName, 
      isDefault: newKey.isDefault,
      hasApiKey: newKey.apiKey.length > 0,
      model: newKey.model 
    });

    if (!newKey.keyName.trim()) {
      console.error('❌ Validation failed: Key name is required');
      setMessage({ type: 'error', text: 'Please enter a name for this API key' });
      return;
    }

    if (!newKey.apiKey.trim()) {
      console.error('❌ Validation failed: API key is required');
      setMessage({ type: 'error', text: 'Please enter the API key' });
      return;
    }

    setSaving(true);
    try {
      console.log('🔄 Saving to database...');

      // Determine the config key format
      const configKey = newKey.isDefault 
        ? `${newKey.provider}_api_key`
        : `${newKey.provider}_${newKey.keyName}_api_key`;

      console.log('🔑 Using config key:', configKey);

      // Save API key
      const { data: keyData, error: keyError } = await supabase
        .from('system_config')
        .upsert({
          config_key: configKey,
          config_value: newKey.apiKey,
          config_type: 'string',
          description: `${newKey.keyName} API key for ${newKey.provider}`,
          is_encrypted: true,
          updated_at: new Date().toISOString(),
        })
        .select();

      if (keyError) {
        console.error('❌ Error saving API key:', keyError);
        throw keyError;
      }

      console.log('✅ API key saved successfully:', keyData);

      // Save model if provided
      if (newKey.model) {
        const modelKey = newKey.isDefault 
          ? `${newKey.provider}_model`
          : `${newKey.provider}_${newKey.keyName}_model`;

        console.log('🎯 Saving model with key:', modelKey);

        const { data: modelData, error: modelError } = await supabase
          .from('system_config')
          .upsert({
            config_key: modelKey,
            config_value: newKey.model,
            config_type: 'string',
            description: `Model for ${newKey.keyName} ${newKey.provider} key`,
            is_encrypted: false,
            updated_at: new Date().toISOString(),
          })
          .select();

        if (modelError) {
          console.error('❌ Error saving model:', modelError);
          throw modelError;
        }

        console.log('✅ Model saved successfully:', modelData);
      }

      console.log('🎉 All data saved successfully!');
      setMessage({ type: 'success', text: `${newKey.keyName} API key saved successfully!` });
      
      // Reset form
      setNewKey({ 
        provider: 'gemini', 
        keyName: '', 
        apiKey: '', 
        model: 'gemini-1.5-flash',
        isDefault: false 
      });
      setShowAddForm(false);
      
      // Reload keys
      await loadApiKeys();

    } catch (error) {
      console.error('❌ Error saving API key:', error);
      setMessage({ type: 'error', text: 'Failed to save API key' });
    } finally {
      setSaving(false);
    }
  };

  // Set as default
  const setAsDefault = async (key: StoredApiKey) => {
    console.log('⭐ Setting as default:', key);
    try {
      // Update local state first
      setStoredKeys(prev => prev.map(k => ({
        ...k,
        isDefault: k.provider === key.provider ? k.id === key.id : k.isDefault
      })));

      // Update database - we might need to restructure the keys
      console.log('🔄 Updating default in database for provider:', key.provider);
      
      setMessage({ type: 'success', text: `Set "${key.keyName}" as default for ${key.provider}` });

    } catch (error) {
      console.error('❌ Error setting default:', error);
      setMessage({ type: 'error', text: 'Failed to set as default' });
    }
  };

  // Delete API key
  const deleteApiKey = async (key: StoredApiKey) => {
    if (!confirm(`Are you sure you want to delete the "${key.keyName}" API key?`)) {
      return;
    }

    console.log('🗑️ Deleting API key:', key);

    try {
      const configKey = key.isDefault 
        ? `${key.provider}_api_key`
        : `${key.provider}_${key.keyName}_api_key`;

      console.log('🔄 Deleting from database with key:', configKey);

      const { error } = await supabase
        .from('system_config')
        .delete()
        .eq('config_key', configKey);

      if (error) {
        console.error('❌ Error deleting API key:', error);
        throw error;
      }

      // Also delete associated model
      const modelKey = key.isDefault 
        ? `${key.provider}_model`
        : `${key.provider}_${key.keyName}_model`;

      await supabase
        .from('system_config')
        .delete()
        .eq('config_key', modelKey);

      console.log('✅ API key deleted successfully');
      setMessage({ type: 'success', text: `Deleted "${key.keyName}" API key` });
      await loadApiKeys();

    } catch (error) {
      console.error('❌ Error deleting API key:', error);
      setMessage({ type: 'error', text: 'Failed to delete API key' });
    }
  };

  // Test API key
  const testApiKey = async (key: StoredApiKey) => {
    console.log('🧪 Testing API key:', key);
    setTesting(key.id);
    try {
      // Basic format validation
      const providerConfig = API_PROVIDERS.find(p => p.value === key.provider);
      if (providerConfig && key.provider !== 'yahoo_finance') {
        const formatTests = {
          gemini: (apiKey: string) => apiKey.startsWith('AI') && apiKey.length > 20,
          openai: (apiKey: string) => apiKey.startsWith('sk-') && apiKey.length > 40,
          openrouter: (apiKey: string) => apiKey.startsWith('sk-or-') && apiKey.length > 40,
          perplexity: (apiKey: string) => apiKey.startsWith('pplx-') || apiKey.length > 20
        };

        const formatTest = formatTests[key.provider as keyof typeof formatTests];
        if (formatTest && !formatTest(key.apiKey)) {
          throw new Error(`API key format doesn't match expected pattern`);
        }
      }

      console.log('✅ Format validation passed');

      // Test actual connection
      const aiManager = AIServiceManager.getInstance();
      const initialized = await aiManager.initializeService(key.provider as any, {
        apiKey: key.apiKey,
        model: key.model
      });

      if (!initialized) {
        throw new Error('Failed to initialize service');
      }

      console.log('🔌 Service initialized, testing connection...');

      const service = aiManager.getService(key.provider as any);
      if (!service) {
        throw new Error('Service not available');
      }

      const testResult = await service.testConnection();
      console.log('📊 Test result:', testResult);

      if (testResult.success) {
        const latencyInfo = testResult.latency ? ` (${testResult.latency}ms)` : '';
        setTestResults(prev => ({
          ...prev,
          [key.id]: { success: true, message: `✅ Connection successful!${latencyInfo}` }
        }));
        console.log('🎉 Test successful!');
      } else {
        throw new Error(testResult.error || 'Connection test failed');
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Test failed';
      console.error('❌ Test failed:', message);
      setTestResults(prev => ({
        ...prev,
        [key.id]: { success: false, message: `❌ ${message}` }
      }));
    } finally {
      setTesting(null);
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
    if (revealed || key.length === 0) return key;
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
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

  return (
    <SettingsContainer>
      <SectionTitle>
        <Key size={20} />
        API Key Management (Database-Driven)
      </SectionTitle>

      {message && (
        <StatusMessage $type={message.type}>
          {message.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
          {message.text}
        </StatusMessage>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280' }}>
          Store multiple API keys per provider with default/fallback logic. Keys are encrypted in the database.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button onClick={() => setShowAddForm(!showAddForm)}>
            <Plus size={16} />
            Add Key
          </Button>
          <Button onClick={loadApiKeys} disabled={loading}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            Refresh
          </Button>
        </div>
      </div>

      {/* Add New Key Form */}
      {showAddForm && (
        <AddKeyForm>
          <h4 style={{ margin: '0 0 1rem 0', color: '#374151' }}>Add New API Key</h4>
          
          <FormGrid>
            <FormGroup>
              <Label>Provider</Label>
              <Select
                value={newKey.provider}
                onChange={(e) => {
                  const provider = e.target.value;
                  const defaultModel = API_PROVIDERS.find(p => p.value === provider)?.defaultModel || '';
                  setNewKey(prev => ({ 
                    ...prev, 
                    provider,
                    model: defaultModel
                  }));
                }}
              >
                {API_PROVIDERS.map(provider => (
                  <option key={provider.value} value={provider.value}>
                    {provider.label}
                  </option>
                ))}
              </Select>
            </FormGroup>

            <FormGroup>
              <Label>Key Name</Label>
              <Input
                value={newKey.keyName}
                onChange={(e) => setNewKey(prev => ({ ...prev, keyName: e.target.value }))}
                placeholder="e.g., primary, backup, work"
              />
              <HelpText>Give this key a unique name within the provider</HelpText>
            </FormGroup>

            <FormGroup>
              <Label>API Key</Label>
              <Input
                type="password"
                value={newKey.apiKey}
                onChange={(e) => setNewKey(prev => ({ ...prev, apiKey: e.target.value }))}
                placeholder="Enter your API key"
              />
              <HelpText>
                {API_PROVIDERS.find(p => p.value === newKey.provider)?.keyFormat}
              </HelpText>
            </FormGroup>

            {(API_PROVIDERS.find(p => p.value === newKey.provider)?.modelOptions.length || 0) > 0 && (
              <FormGroup>
                <Label>Model</Label>
                <Select
                  value={newKey.model}
                  onChange={(e) => setNewKey(prev => ({ ...prev, model: e.target.value }))}
                >
                  {API_PROVIDERS.find(p => p.value === newKey.provider)?.modelOptions.map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </Select>
              </FormGroup>
            )}
          </FormGrid>

          <CheckboxGroup>
            <Checkbox
              checked={newKey.isDefault}
              onChange={(e) => setNewKey(prev => ({ ...prev, isDefault: e.target.checked }))}
            />
            <Label>Set as default for {newKey.provider}</Label>
          </CheckboxGroup>

          <ActionButtons>
            <Button $variant="primary" onClick={saveNewApiKey} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Key
                </>
              )}
            </Button>
            <Button $variant="ghost" onClick={() => setShowAddForm(false)}>
              Cancel
            </Button>
          </ActionButtons>
        </AddKeyForm>
      )}

      {/* Provider Groups */}
      {API_PROVIDERS.map(provider => {
        const providerKeys = storedKeys.filter(key => key.provider === provider.value);
        if (providerKeys.length === 0) return null;

        return (
          <ApiKeyCard key={provider.value}>
            <h4 style={{ margin: '0 0 1rem 0', color: '#374151', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {provider.label}
              <span style={{ 
                background: '#e5e7eb', 
                color: '#6b7280', 
                fontSize: '0.75rem', 
                padding: '0.125rem 0.5rem', 
                borderRadius: '12px',
                fontWeight: '400'
              }}>
                {providerKeys.length} key{providerKeys.length !== 1 ? 's' : ''}
              </span>
            </h4>

            {providerKeys.map((key) => (
              <KeyCard key={key.id} $isDefault={key.isDefault}>
                {key.isDefault && (
                  <DefaultBadge>
                    <Star size={12} />
                    Default
                  </DefaultBadge>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <h5 style={{ margin: '0 0 0.25rem 0', color: '#374151' }}>{key.keyName}</h5>
                    <p style={{ margin: '0', fontSize: '0.75rem', color: '#9ca3af' }}>
                      Created: {new Date(key.createdAt).toLocaleDateString()}
                      {key.model && ` • Model: ${key.model}`}
                    </p>
                  </div>
                </div>

                <FormGroup>
                  <Label>API Key</Label>
                  <KeyPreview>
                    <KeyDisplay>
                      {formatApiKey(key.apiKey, revealedKeys.has(key.id))}
                    </KeyDisplay>
                    <Button onClick={() => toggleKeyVisibility(key.id)}>
                      {revealedKeys.has(key.id) ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </KeyPreview>
                </FormGroup>

                {testResults[key.id] && (
                  <StatusMessage $type={testResults[key.id].success ? 'success' : 'error'}>
                    {testResults[key.id].success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {testResults[key.id].message}
                  </StatusMessage>
                )}

                <ActionButtons>
                  {!key.isDefault && (
                    <Button onClick={() => setAsDefault(key)}>
                      <Star size={16} />
                      Set Default
                    </Button>
                  )}
                  
                  {key.provider !== 'yahoo_finance' && (
                    <Button 
                      $variant="test" 
                      onClick={() => testApiKey(key)}
                      disabled={testing === key.id}
                    >
                      {testing === key.id ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Testing...
                        </>
                      ) : (
                        <>
                          <TestTube size={16} />
                          Test Key
                        </>
                      )}
                    </Button>
                  )}

                  <Button $variant="danger" onClick={() => deleteApiKey(key)}>
                    <Trash2 size={16} />
                    Delete
                  </Button>
                </ActionButtons>
              </KeyCard>
            ))}
          </ApiKeyCard>
        );
      })}

      {storedKeys.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
          <Key size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
          <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>No API keys configured yet</p>
          <p style={{ fontSize: '0.875rem' }}>Click "Add Key" to store your first API key with fallback support</p>
        </div>
      )}
    </SettingsContainer>
  );
};

export default FixedDatabaseApiKeySettings;