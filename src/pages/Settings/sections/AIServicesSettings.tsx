/**
 * AI Services Settings Section
 * Configuration for Google AI and Gemini services
 */

import React from 'react';
import ConfigurationForm, { ConfigurationField } from '../components/ConfigurationForm';
import { useConfigurationSection } from '../hooks/useConfigurationSection';

const AIServicesSettings: React.FC = () => {
  const {
    values,
    errors,
    loading,
    testResult,
    updateValue,
    saveConfiguration,
    testConfiguration
  } = useConfigurationSection('ai_services');

  const fields: ConfigurationField[] = [
    // Google AI Configuration
    {
      key: 'google_api_key',
      label: 'Google AI API Key',
      description: 'Your Google AI API key for symbol processing and enhancement',
      type: 'password',
      required: true,
      sensitive: true,
      placeholder: 'AIzaSy...',
      group: 'Google AI'
    },
    {
      key: 'google_model',
      label: 'Google AI Model',
      description: 'The Google AI model to use for processing',
      type: 'select',
      defaultValue: 'gemini-pro',
      options: [
        { value: 'gemini-pro', label: 'Gemini Pro' },
        { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' },
        { value: 'text-bison', label: 'Text Bison' },
        { value: 'text-bison-32k', label: 'Text Bison 32K' }
      ],
      group: 'Google AI'
    },
    {
      key: 'max_tokens',
      label: 'Maximum Tokens',
      description: 'Maximum number of tokens per AI request',
      type: 'number',
      defaultValue: 1000,
      validation: { min: 100, max: 8000 },
      group: 'Google AI'
    },
    {
      key: 'temperature',
      label: 'Temperature',
      description: 'AI response creativity (0 = deterministic, 1 = creative)',
      type: 'number',
      defaultValue: 0.3,
      validation: { min: 0, max: 1 },
      group: 'Google AI'
    },
    {
      key: 'timeout',
      label: 'Request Timeout (ms)',
      description: 'Timeout for AI API requests in milliseconds',
      type: 'number',
      defaultValue: 30000,
      validation: { min: 5000, max: 120000 },
      group: 'Google AI'
    },

    // Symbol Processing Configuration
    {
      key: 'symbol_enhancement_enabled',
      label: 'Enable AI symbol enhancement',
      description: 'Use AI to enhance and normalize stock symbols',
      type: 'boolean',
      defaultValue: true,
      group: 'Symbol Processing'
    },
    {
      key: 'confidence_threshold',
      label: 'Confidence Threshold',
      description: 'Minimum confidence level required for AI symbol processing (0-1)',
      type: 'number',
      defaultValue: 0.8,
      validation: { min: 0.1, max: 1.0 },
      group: 'Symbol Processing'
    },
    {
      key: 'fallback_to_manual',
      label: 'Fallback to manual review when confidence is low',
      type: 'boolean',
      defaultValue: true,
      group: 'Symbol Processing'
    },
    {
      key: 'symbol_cache_ttl',
      label: 'Symbol Cache TTL (hours)',
      description: 'How long to cache symbol lookup results',
      type: 'number',
      defaultValue: 24,
      validation: { min: 1, max: 168 },
      group: 'Symbol Processing'
    },

    // Advanced AI Settings
    {
      key: 'enable_context_learning',
      label: 'Enable context learning',
      description: 'Allow AI to learn from previous successful symbol resolutions',
      type: 'boolean',
      defaultValue: true,
      group: 'Advanced Settings'
    },
    {
      key: 'max_context_examples',
      label: 'Maximum Context Examples',
      description: 'Maximum number of previous examples to include in AI context',
      type: 'number',
      defaultValue: 10,
      validation: { min: 0, max: 50 },
      group: 'Advanced Settings'
    },
    {
      key: 'enable_batch_processing',
      label: 'Enable batch processing for multiple symbols',
      type: 'boolean',
      defaultValue: false,
      group: 'Advanced Settings'
    },
    {
      key: 'batch_size',
      label: 'Batch Processing Size',
      description: 'Number of symbols to process in a single AI request',
      type: 'number',
      defaultValue: 5,
      validation: { min: 1, max: 20 },
      group: 'Advanced Settings'
    },

    // Safety and Rate Limiting
    {
      key: 'rate_limit_requests_per_minute',
      label: 'Rate Limit (requests/minute)',
      description: 'Maximum number of AI requests per minute',
      type: 'number',
      defaultValue: 60,
      validation: { min: 1, max: 300 },
      group: 'Rate Limiting'
    },
    {
      key: 'rate_limit_tokens_per_minute',
      label: 'Token Rate Limit (tokens/minute)',
      description: 'Maximum number of tokens to process per minute',
      type: 'number',
      defaultValue: 50000,
      validation: { min: 1000, max: 500000 },
      group: 'Rate Limiting'
    },
    {
      key: 'enable_usage_tracking',
      label: 'Enable usage tracking and analytics',
      type: 'boolean',
      defaultValue: true,
      group: 'Rate Limiting'
    },

    // Error Handling
    {
      key: 'retry_on_failure',
      label: 'Retry on API failures',
      type: 'boolean',
      defaultValue: true,
      group: 'Error Handling'
    },
    {
      key: 'max_retries',
      label: 'Maximum Retry Attempts',
      description: 'Number of times to retry failed AI requests',
      type: 'number',
      defaultValue: 3,
      validation: { min: 0, max: 10 },
      group: 'Error Handling'
    },
    {
      key: 'retry_backoff_multiplier',
      label: 'Retry Backoff Multiplier',
      description: 'Multiplier for exponential backoff between retries',
      type: 'number',
      defaultValue: 2,
      validation: { min: 1, max: 10 },
      group: 'Error Handling'
    },
    {
      key: 'fallback_to_basic_parsing',
      label: 'Fallback to basic parsing when AI fails',
      type: 'boolean',
      defaultValue: true,
      group: 'Error Handling'
    }
  ];

  return (
    <ConfigurationForm
      title="AI Services Configuration"
      description="Configure Google AI and Gemini services for intelligent symbol processing, transaction parsing, and financial data enhancement."
      fields={fields}
      values={values}
      onChange={updateValue}
      onSave={saveConfiguration}
      onTest={testConfiguration}
      loading={loading}
      testResult={testResult}
      errors={errors}
    />
  );
};

export default AIServicesSettings;