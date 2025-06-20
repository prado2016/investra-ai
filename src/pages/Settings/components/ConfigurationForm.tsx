/**
 * Configuration Form Component
 * Reusable form component for configuration management with validation and testing
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import {
  Save,
  TestTube,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Loader,
  Copy,
  Check,
  Info
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

const FormContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2rem;
`;

const FormSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SectionHeader = styled.div`
  margin-bottom: 1rem;
`;

const SectionTitle = styled.h3`
  margin: 0 0 0.5rem 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;

  [data-theme="dark"] & {
    color: #f3f4f6;
  }
`;

const SectionDescription = styled.p`
  margin: 0;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const FieldContainer = styled.div<{ $fullWidth?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  ${props => props.$fullWidth && 'grid-column: 1 / -1;'}
`;

const FieldLabel = styled.label<{ $required?: boolean }>`
  font-size: 0.875rem;
  font-weight: 500;
  color: #374151;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  [data-theme="dark"] & {
    color: #d1d5db;
  }

  ${props => props.$required && `
    &::after {
      content: '*';
      color: #ef4444;
    }
  `}
`;

const FieldDescription = styled.div`
  font-size: 0.75rem;
  color: #6b7280;
  line-height: 1.4;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

const InputContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
`;

const Input = styled.input<{ $hasError?: boolean; $hasIcon?: boolean }>`
  width: 100%;
  padding: 0.75rem;
  padding-right: ${props => props.$hasIcon ? '2.5rem' : '0.75rem'};
  border: 1px solid ${props => props.$hasError ? '#ef4444' : '#d1d5db'};
  border-radius: 6px;
  font-size: 0.875rem;
  background: #ffffff;
  color: #111827;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;

  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? '#ef4444' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.$hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }

  &:disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
  }

  [data-theme="dark"] & {
    background: #374151;
    color: #f3f4f6;
    border-color: ${props => props.$hasError ? '#ef4444' : '#4b5563'};

    &:disabled {
      background: #2d3748;
      color: #9ca3af;
    }
  }
`;

const TextArea = styled.textarea<{ $hasError?: boolean }>`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${props => props.$hasError ? '#ef4444' : '#d1d5db'};
  border-radius: 6px;
  font-size: 0.875rem;
  background: #ffffff;
  color: #111827;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  resize: vertical;
  min-height: 100px;
  font-family: inherit;

  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? '#ef4444' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.$hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }

  &:disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
  }

  [data-theme="dark"] & {
    background: #374151;
    color: #f3f4f6;
    border-color: ${props => props.$hasError ? '#ef4444' : '#4b5563'};

    &:disabled {
      background: #2d3748;
      color: #9ca3af;
    }
  }
`;

const Select = styled.select<{ $hasError?: boolean }>`
  width: 100%;
  padding: 0.75rem;
  border: 1px solid ${props => props.$hasError ? '#ef4444' : '#d1d5db'};
  border-radius: 6px;
  font-size: 0.875rem;
  background: #ffffff;
  color: #111827;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: ${props => props.$hasError ? '#ef4444' : '#3b82f6'};
    box-shadow: 0 0 0 3px ${props => props.$hasError ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'};
  }

  &:disabled {
    background: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
  }

  [data-theme="dark"] & {
    background: #374151;
    color: #f3f4f6;
    border-color: ${props => props.$hasError ? '#ef4444' : '#4b5563'};

    &:disabled {
      background: #2d3748;
      color: #9ca3af;
    }
  }
`;

const Checkbox = styled.input.attrs({ type: 'checkbox' })`
  width: 1rem;
  height: 1rem;
  accent-color: #3b82f6;
  cursor: pointer;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const CheckboxContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const CheckboxLabel = styled.label`
  font-size: 0.875rem;
  color: #374151;
  cursor: pointer;
  line-height: 1.4;

  [data-theme="dark"] & {
    color: #d1d5db;
  }
`;

const InputIcon = styled.button`
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #6b7280;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s ease;

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

const ValidationMessage = styled.div<{ $type: 'error' | 'success' | 'warning' }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  
  ${props => {
    switch (props.$type) {
      case 'error':
        return 'color: #ef4444;';
      case 'success':
        return 'color: #10b981;';
      case 'warning':
        return 'color: #f59e0b;';
      default:
        return 'color: #6b7280;';
    }
  }}
`;

const ActionBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 2rem;
  border-top: 1px solid #e5e7eb;
  margin-top: 2rem;
  gap: 1rem;
  flex-wrap: wrap;

  [data-theme="dark"] & {
    border-top-color: #374151;
  }

  @media (max-width: 640px) {
    flex-direction: column;
    align-items: stretch;
  }
`;

const ActionGroup = styled.div`
  display: flex;
  gap: 0.75rem;
  align-items: center;

  @media (max-width: 640px) {
    justify-content: center;
  }
`;

const TestResultCard = styled(Card)<{ $type: 'success' | 'error' | 'warning' }>`
  padding: 1rem;
  margin-top: 1rem;
  border-left: 4px solid;
  border-left-color: ${props => {
    switch (props.$type) {
      case 'success': return '#10b981';
      case 'error': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#6b7280';
    }
  }};
`;

const TestResultHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
`;

const TestResultTitle = styled.div<{ $type: 'success' | 'error' | 'warning' }>`
  font-weight: 600;
  font-size: 0.875rem;
  color: ${props => {
    switch (props.$type) {
      case 'success': return '#065f46';
      case 'error': return '#991b1b';
      case 'warning': return '#92400e';
      default: return '#374151';
    }
  }};

  [data-theme="dark"] & {
    color: ${props => {
      switch (props.$type) {
        case 'success': return '#a7f3d0';
        case 'error': return '#fecaca';
        case 'warning': return '#fde68a';
        default: return '#d1d5db';
      }
    }};
  }
`;

const TestResultMessage = styled.div`
  font-size: 0.875rem;
  color: #6b7280;

  [data-theme="dark"] & {
    color: #9ca3af;
  }
`;

// Configuration field definition
export interface ConfigurationField {
  key: string;
  label: string;
  description?: string;
  type: 'string' | 'number' | 'boolean' | 'password' | 'email' | 'url' | 'textarea' | 'select';
  required?: boolean;
  placeholder?: string;
  defaultValue?: any;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
  sensitive?: boolean;
  fullWidth?: boolean;
  group?: string;
}

// Configuration form props
interface ConfigurationFormProps {
  title: string;
  description?: string;
  fields: ConfigurationField[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onSave: () => Promise<void>;
  onTest?: () => Promise<{ success: boolean; message: string; details?: any }>;
  loading?: boolean;
  testResult?: { success: boolean; message: string; details?: any } | null;
  errors?: Record<string, string>;
}

const ConfigurationForm: React.FC<ConfigurationFormProps> = ({
  title,
  description,
  fields,
  values,
  onChange,
  onSave,
  onTest,
  loading = false,
  testResult = null,
  errors = {}
}) => {
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Toggle password visibility
  const togglePasswordVisibility = (fieldKey: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [fieldKey]: !prev[fieldKey]
    }));
  };

  // Copy value to clipboard
  const copyToClipboard = async (value: string, fieldKey: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(fieldKey);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  // Handle test configuration
  const handleTest = async () => {
    if (!onTest) return;
    
    setTesting(true);
    try {
      await onTest();
    } catch (err) {
      console.error('Test failed:', err);
    } finally {
      setTesting(false);
    }
  };

  // Handle save configuration
  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // Group fields by group property
  const groupedFields = fields.reduce((groups, field) => {
    const group = field.group || 'default';
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(field);
    return groups;
  }, {} as Record<string, ConfigurationField[]>);

  // Render field based on type
  const renderField = (field: ConfigurationField) => {
    const value = values[field.key] ?? field.defaultValue ?? '';
    const hasError = !!errors[field.key];
    const isPassword = field.type === 'password';
    const showPassword = showPasswords[field.key];

    const commonProps = {
      id: field.key,
      disabled: loading || saving,
      placeholder: field.placeholder
    };

    switch (field.type) {
      case 'textarea':
        return (
          <TextArea
            {...commonProps}
            value={value}
            onChange={(e) => onChange(field.key, e.target.value)}
            $hasError={hasError}
          />
        );

      case 'select':
        return (
          <Select
            {...commonProps}
            value={value}
            onChange={(e) => onChange(field.key, e.target.value)}
            $hasError={hasError}
          >
            {!field.required && <option value="">Select an option</option>}
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        );

      case 'boolean':
        return (
          <CheckboxContainer>
            <Checkbox
              {...commonProps}
              checked={!!value}
              onChange={(e) => onChange(field.key, e.target.checked)}
            />
            <CheckboxLabel htmlFor={field.key}>
              {field.label}
            </CheckboxLabel>
          </CheckboxContainer>
        );

      case 'number':
        return (
          <Input
            {...commonProps}
            type="number"
            value={value}
            onChange={(e) => onChange(field.key, parseFloat(e.target.value) || 0)}
            min={field.validation?.min}
            max={field.validation?.max}
            $hasError={hasError}
          />
        );

      default:
        return (
          <InputContainer>
            <Input
              {...commonProps}
              type={isPassword && !showPassword ? 'password' : field.type === 'email' ? 'email' : 'text'}
              value={value}
              onChange={(e) => onChange(field.key, e.target.value)}
              $hasError={hasError}
              $hasIcon={isPassword || field.sensitive}
            />
            {isPassword && (
              <InputIcon
                type="button"
                onClick={() => togglePasswordVisibility(field.key)}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </InputIcon>
            )}
            {field.sensitive && !isPassword && value && (
              <InputIcon
                type="button"
                onClick={() => copyToClipboard(value, field.key)}
                title="Copy to clipboard"
              >
                {copied === field.key ? <Check size={16} /> : <Copy size={16} />}
              </InputIcon>
            )}
          </InputContainer>
        );
    }
  };

  return (
    <FormContainer>
      <FormSection>
        <SectionHeader>
          <SectionTitle>{title}</SectionTitle>
          {description && (
            <SectionDescription>{description}</SectionDescription>
          )}
        </SectionHeader>

        {Object.entries(groupedFields).map(([groupName, groupFields]) => (
          <div key={groupName}>
            {groupName !== 'default' && (
              <SectionHeader>
                <SectionTitle style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
                  {groupName}
                </SectionTitle>
              </SectionHeader>
            )}
            
            <FieldGrid>
              {groupFields.map(field => (
                <FieldContainer key={field.key} $fullWidth={field.fullWidth}>
                  {field.type !== 'boolean' && (
                    <FieldLabel $required={field.required}>
                      {field.label}
                      {field.sensitive && (
                        <Info size={14} />
                      )}
                    </FieldLabel>
                  )}
                  
                  {renderField(field)}
                  
                  {field.description && field.type !== 'boolean' && (
                    <FieldDescription>{field.description}</FieldDescription>
                  )}
                  
                  {errors[field.key] && (
                    <ValidationMessage $type="error">
                      <AlertCircle size={14} />
                      {errors[field.key]}
                    </ValidationMessage>
                  )}
                </FieldContainer>
              ))}
            </FieldGrid>
          </div>
        ))}
      </FormSection>

      {testResult && (
        <TestResultCard $type={testResult.success ? 'success' : 'error'}>
          <TestResultHeader>
            {testResult.success ? (
              <CheckCircle size={16} />
            ) : (
              <AlertCircle size={16} />
            )}
            <TestResultTitle $type={testResult.success ? 'success' : 'error'}>
              {testResult.success ? 'Connection Successful' : 'Connection Failed'}
            </TestResultTitle>
          </TestResultHeader>
          <TestResultMessage>{testResult.message}</TestResultMessage>
          {testResult.details && (
            <pre style={{ 
              fontSize: '0.75rem', 
              marginTop: '0.5rem', 
              padding: '0.5rem',
              background: 'rgba(0,0,0,0.05)',
              borderRadius: '4px',
              overflow: 'auto'
            }}>
              {JSON.stringify(testResult.details, null, 2)}
            </pre>
          )}
        </TestResultCard>
      )}

      <ActionBar>
        <ActionGroup>
          {onTest && (
            <Button
              variant="outline"
              onClick={handleTest}
              disabled={loading || saving || testing}
            >
              {testing ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <TestTube size={16} />
              )}
              Test Connection
            </Button>
          )}
        </ActionGroup>

        <ActionGroup>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={loading || testing || saving}
          >
            {saving ? (
              <Loader size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            Save Configuration
          </Button>
        </ActionGroup>
      </ActionBar>
    </FormContainer>
  );
};

export default ConfigurationForm;