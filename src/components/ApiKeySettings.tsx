/**
 * API Key Settings Interface - Task 13
 * Complete interface for managing API keys with encryption and database integration
 */

import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { Key, Plus, Trash2, Save, Eye, EyeOff, TestTube, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { InputField, PasswordField, SelectField } from './FormFields';
import { useNotify } from '../hooks/useNotify';
import ApiKeyService from '../services/apiKeyService';
import { ApiKeyValidator, ApiTester } from '../utils/apiKeyUtils';
import type { ApiProvider, ApiKey } from '../lib/database/enhanced-types';

// Styled Components
const SettingsContainer = styled.div`
  max-width: 800px;
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
  
  svg {
    color: #6366f1;
  }
`;

const ApiKeyCard = styled.div`
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  background: white;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  
  &:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const CardTitle = styled.h3`
  font-weight: 600;
  color: #374151;
  margin: 0;
  font-size: 1.1rem;
`;

const StatusBadge = styled.span<{ $active: boolean }>`
  padding: 0.25rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 500;
  background: ${({ $active }) => $active ? '#dcfce7' : '#fee2e2'};
  color: ${({ $active }) => $active ? '#166534' : '#991b1b'};
  display: flex;
  align-items: center;
  gap: 0.25rem;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
  
  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
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

const Button = styled.button<{ $variant?: 'primary' | 'secondary' | 'danger' | 'test' }>`
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
      case 'danger':
        return `
          background: #ef4444;
          color: white;
          &:hover { background: #dc2626; }
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

const AddNewCard = styled.div`
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
  background: #f9fafb;
  margin-bottom: 1.5rem;
  transition: all 0.2s ease;
  cursor: pointer;
  
  &:hover {
    border-color: #6366f1;
    background: #f0f9ff;
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
`;

const TestResult = styled.div<{ $success: boolean }>`
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

// API Provider options
const API_PROVIDERS: { value: ApiProvider; label: string; description: string }[] = [
  { 
    value: 'gemini', 
    label: 'Google Gemini AI', 
    description: 'For AI-powered symbol lookup and analysis' 
  },
  { 
    value: 'yahoo_finance', 
    label: 'Yahoo Finance', 
    description: 'Real-time stock quotes and market data' 
  },
  { 
    value: 'openai', 
    label: 'OpenAI GPT', 
    description: 'Advanced AI analysis and insights' 
  },
  { 
    value: 'perplexity', 
    label: 'Perplexity AI', 
    description: 'AI-powered research and market insights' 
  }
];

// Available features for each provider
const PROVIDER_FEATURES: Record<ApiProvider, string[]> = {
  gemini: ['symbol_lookup', 'market_analysis', 'sentiment_analysis'],
  yahoo_finance: ['real_time_quotes', 'historical_data', 'market_news'],
  openai: ['analysis', 'insights', 'recommendations'],
  perplexity: ['research', 'market_insights', 'trend_analysis']
};

interface ApiKeyFormData {
  provider: ApiProvider;
  keyName: string;
  apiKey: string;
  allowedFeatures: string[];
  rateLimitPerHour: number;
  rateLimitPerDay: number;
}

const ApiKeySettings: React.FC = () => {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [testingKeyId, setTestingKeyId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  
  const { notify } = useNotify();
  
  // Form state
  const [formData, setFormData] = useState<ApiKeyFormData>({
    provider: 'gemini',
    keyName: '',
    apiKey: '',
    allowedFeatures: ['symbol_lookup'],
    rateLimitPerHour: 100,
    rateLimitPerDay: 1000
  });

  // Load API keys on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const keys = await ApiKeyService.getApiKeys();
        setApiKeys(keys);
      } catch (error) {
        notify({ title: 'Error', message: 'Failed to load API keys', type: 'error' });
        console.error('Error loading API keys:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [notify]);

  const loadApiKeys = async () => {
    try {
      setIsLoading(true);
      const keys = await ApiKeyService.getApiKeys();
      setApiKeys(keys);
    } catch (error) {
      notify({ title: 'Error', message: 'Failed to load API keys', type: 'error' });
      console.error('Error loading API keys:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddApiKey = async () => {
    try {
      if (!formData.keyName.trim()) {
        notify({ title: 'Validation Error', message: 'Please enter a name for this API key', type: 'error' });
        return;
      }
      
      if (!formData.apiKey.trim()) {
        notify({ title: 'Validation Error', message: 'Please enter the API key', type: 'error' });
        return;
      }

      // Validate API key format
      const validation = ApiKeyValidator.validateKeyFormat(formData.provider, formData.apiKey);
      if (!validation.valid) {
        notify({ title: 'Validation Error', message: validation.message, type: 'error' });
        return;
      }

      await ApiKeyService.createApiKey({
        provider: formData.provider,
        keyName: formData.keyName,
        apiKey: formData.apiKey,
        allowedFeatures: formData.allowedFeatures,
        rateLimitPerHour: formData.rateLimitPerHour,
        rateLimitPerDay: formData.rateLimitPerDay
      });

      notify({ title: 'Success', message: 'API key added successfully', type: 'success' });
      setShowAddForm(false);
      resetForm();
      loadApiKeys();
    } catch (error) {
      notify({ title: 'Error', message: error instanceof Error ? error.message : 'Failed to add API key', type: 'error' });
      console.error('Error adding API key:', error);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    try {
      await ApiKeyService.deleteApiKey(keyId);
      notify({ title: 'Success', message: 'API key deleted successfully', type: 'success' });
      loadApiKeys();
    } catch (error) {
      notify({ title: 'Error', message: error instanceof Error ? error.message : 'Failed to delete API key', type: 'error' });
      console.error('Error deleting API key:', error);
    }
  };

  const handleToggleStatus = async (keyId: string, currentStatus: boolean) => {
    try {
      await ApiKeyService.updateApiKey(keyId, { isActive: !currentStatus });
      notify({ title: 'Success', message: `API key ${!currentStatus ? 'activated' : 'deactivated'}`, type: 'success' });
      loadApiKeys();
    } catch (error) {
      notify({ title: 'Error', message: error instanceof Error ? error.message : 'Failed to update API key status', type: 'error' });
      console.error('Error updating API key status:', error);
    }
  };

  const handleTestApiKey = async (keyId: string, provider: ApiProvider) => {
    setTestingKeyId(keyId);
    
    try {
      // Get the decrypted API key
      const decryptedKey = await ApiKeyService.getDecryptedApiKey(keyId);
      
      // Test the API key
      const result = await ApiTester.testApiKey(provider, decryptedKey);
      
      // Record the usage
      await ApiKeyService.recordUsage(
        keyId,
        'test_connection',
        'GET',
        result.success ? 200 : 400,
        result.responseTime,
        'api_test',
        result.success ? undefined : result.message
      );
      
      setTestResults(prev => ({ ...prev, [keyId]: result }));
      
      if (result.success) {
        notify({ title: 'Success', message: `API key test successful (${result.responseTime}ms)`, type: 'success' });
      } else {
        notify({ title: 'Error', message: `API key test failed: ${result.message}`, type: 'error' });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during testing.';
      setTestResults(prev => ({ 
        ...prev, 
        [keyId]: { success: false, message: `Test failed: ${errorMessage}` }
      }));
      notify({ title: 'Error', message: `API test failed: ${errorMessage}`, type: 'error' });
    } finally {
      setTestingKeyId(null);
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

  const resetForm = () => {
    setFormData({
      provider: 'gemini',
      keyName: '',
      apiKey: '',
      allowedFeatures: ['symbol_lookup'],
      rateLimitPerHour: 100,
      rateLimitPerDay: 1000
    });
  };

  const formatApiKey = (key: string, revealed: boolean = false) => {
    if (revealed) return key;
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);
  };

  if (isLoading) {
    return (
      <SettingsContainer>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <Loader className="animate-spin" size={24} />
          <p style={{ marginTop: '1rem', color: '#6b7280' }}>Loading API keys...</p>
        </div>
      </SettingsContainer>
    );
  }

  return (
    <SettingsContainer>
      <SectionTitle>
        <Key size={24} />
        API Key Management
      </SectionTitle>

      {/* Add New API Key Section */}
      {!showAddForm && (
        <AddNewCard onClick={() => setShowAddForm(true)}>
          <Plus size={32} style={{ color: '#6366f1', marginBottom: '1rem' }} />
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#374151' }}>Add New API Key</h3>
          <p style={{ margin: 0, color: '#6b7280' }}>
            Connect external services for enhanced features
          </p>
        </AddNewCard>
      )}

      {/* Add API Key Form */}
      {showAddForm && (
        <ApiKeyCard>
          <CardHeader>
            <CardTitle>Add New API Key</CardTitle>
            <Button onClick={() => { setShowAddForm(false); resetForm(); }}>
              Cancel
            </Button>
          </CardHeader>

          <FormRow>
            <FormGroup>
              <SelectField
                label="Provider"
                value={formData.provider}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  provider: e.target.value as ApiProvider,
                  allowedFeatures: PROVIDER_FEATURES[e.target.value as ApiProvider] || []
                })}
                options={API_PROVIDERS.map(p => ({ value: p.value, label: p.label }))}
              />
              <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.25rem' }}>
                {API_PROVIDERS.find(p => p.value === formData.provider)?.description}
              </p>
            </FormGroup>

            <FormGroup>
              <InputField
                label="Key Name"
                value={formData.keyName}
                onChange={(value) => setFormData({ ...formData, keyName: value })}
                placeholder="e.g., My Gemini Key"
              />
            </FormGroup>
          </FormRow>

          <FormGroup>
            <PasswordField
              label="API Key"
              value={formData.apiKey}
              onChange={(value) => setFormData({ ...formData, apiKey: value })}
              placeholder="Enter your API key here"
            />
          </FormGroup>

          <FormRow>
            <FormGroup>
              <InputField
                label="Rate Limit (per hour)"
                type="number"
                value={formData.rateLimitPerHour.toString()}
                onChange={(value) => setFormData({ 
                  ...formData, 
                  rateLimitPerHour: parseInt(value) || 100 
                })}
                min="1"
                max="10000"
              />
            </FormGroup>

            <FormGroup>
              <InputField
                label="Rate Limit (per day)"
                type="number"
                value={formData.rateLimitPerDay.toString()}
                onChange={(value) => setFormData({ 
                  ...formData, 
                  rateLimitPerDay: parseInt(value) || 1000 
                })}
                min="1"
                max="100000"
              />
            </FormGroup>
          </FormRow>

          <ActionButtons>
            <Button $variant="primary" onClick={handleAddApiKey}>
              <Save size={16} />
              Save API Key
            </Button>
          </ActionButtons>
        </ApiKeyCard>
      )}

      {/* Existing API Keys */}
      {apiKeys.length === 0 && !showAddForm ? (
        <EmptyState>
          <Key size={48} style={{ color: '#d1d5db', marginBottom: '1rem' }} />
          <h3 style={{ color: '#374151', marginBottom: '0.5rem' }}>No API Keys Configured</h3>
          <p>Add your first API key to unlock enhanced features like AI-powered symbol lookup.</p>
        </EmptyState>
      ) : (
        apiKeys.map((key) => (
          <ApiKeyCard key={key.id}>
            <CardHeader>
              <div>
                <CardTitle>{key.key_name}</CardTitle>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                  {API_PROVIDERS.find(p => p.value === key.provider)?.label || key.provider}
                </p>
              </div>
              <StatusBadge $active={key.is_active}>
                {key.is_active ? <CheckCircle size={12} /> : <AlertCircle size={12} />}
                {key.is_active ? 'Active' : 'Inactive'}
              </StatusBadge>
            </CardHeader>

            <FormGroup>
              <label style={{ fontSize: '0.875rem', fontWeight: '500', color: '#374151' }}>
                API Key
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                <code style={{ 
                  flex: 1, 
                  padding: '0.5rem', 
                  background: '#f3f4f6', 
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '0.875rem',
                  fontFamily: 'monospace'
                }}>
                  {formatApiKey(key.encrypted_key, revealedKeys.has(key.id))}
                </code>
                <Button onClick={() => toggleKeyVisibility(key.id)}>
                  {revealedKeys.has(key.id) ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </div>
            </FormGroup>

            {key.last_used && (
              <p style={{ fontSize: '0.75rem', color: '#6b7280', margin: '0.5rem 0' }}>
                Last used: {new Date(key.last_used).toLocaleDateString()} • 
                Used {key.usage_count} times
              </p>
            )}

            {testResults[key.id] && (
              <TestResult $success={testResults[key.id].success}>
                {testResults[key.id].success ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                {testResults[key.id].message}
              </TestResult>
            )}

            <ActionButtons>
              <Button 
                $variant="test" 
                onClick={() => handleTestApiKey(key.id, key.provider)}
                disabled={testingKeyId === key.id}
              >
                {testingKeyId === key.id ? <Loader className="animate-spin" size={16} /> : <TestTube size={16} />}
                Test Connection
              </Button>
              
              <Button onClick={() => handleToggleStatus(key.id, key.is_active)}>
                {key.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              
              <Button $variant="danger" onClick={() => handleDeleteApiKey(key.id)}>
                <Trash2 size={16} />
                Delete
              </Button>
            </ActionButtons>
          </ApiKeyCard>
        ))
      )}
    </SettingsContainer>
  );
};

export default ApiKeySettings;
