/**
 * AI Services Configuration
 * Task 18: Gemini AI Service Layer Integration
 */

import type { AIProvider, AIServiceConfig } from '../types/ai';

// Default configurations for each AI provider
export const AI_SERVICE_DEFAULTS: Record<AIProvider, Partial<AIServiceConfig>> = {
  gemini: {
    model: 'gemini-1.5-flash',
    maxTokens: 8192,
    temperature: 0.1,
    timeout: 30000,
    rateLimitPerHour: 100,
    rateLimitPerDay: 1000,
    enableCaching: true,
    cacheExpiryMinutes: 60
  },
  openai: {
    model: 'gpt-4-turbo-preview',
    maxTokens: 4096,
    temperature: 0.1,
    timeout: 30000,
    rateLimitPerHour: 50,
    rateLimitPerDay: 500,
    enableCaching: true,
    cacheExpiryMinutes: 60
  },
  perplexity: {
    model: 'llama-3.1-sonar-small-128k-online',
    maxTokens: 4096,
    temperature: 0.1,
    timeout: 30000,
    rateLimitPerHour: 20,
    rateLimitPerDay: 200,
    enableCaching: true,
    cacheExpiryMinutes: 60
  }
};

// Model options for each provider
export const AI_MODELS: Record<AIProvider, string[]> = {
  gemini: [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-pro'
  ],
  openai: [
    'gpt-4-turbo-preview',
    'gpt-4',
    'gpt-3.5-turbo',
    'gpt-3.5-turbo-16k'
  ],
  perplexity: [
    'llama-3.1-sonar-small-128k-online',
    'llama-3.1-sonar-large-128k-online',
    'llama-3.1-sonar-huge-128k-online'
  ]
};

// Provider capabilities
export const AI_CAPABILITIES: Record<AIProvider, {
  symbolLookup: boolean;
  financialAnalysis: boolean;
  realTimeData: boolean;
  multiLanguage: boolean;
  imageAnalysis: boolean;
}> = {
  gemini: {
    symbolLookup: true,
    financialAnalysis: true,
    realTimeData: false,
    multiLanguage: true,
    imageAnalysis: true
  },
  openai: {
    symbolLookup: true,
    financialAnalysis: true,
    realTimeData: false,
    multiLanguage: true,
    imageAnalysis: true
  },
  perplexity: {
    symbolLookup: true,
    financialAnalysis: true,
    realTimeData: true,
    multiLanguage: true,
    imageAnalysis: false
  }
};

// Cost estimates (per 1K tokens)
export const AI_COSTS: Record<AIProvider, { input: number; output: number; currency: string }> = {
  gemini: {
    input: 0.00015,  // $0.00015 per 1K input tokens
    output: 0.0006,  // $0.0006 per 1K output tokens
    currency: 'USD'
  },
  openai: {
    input: 0.01,     // $0.01 per 1K input tokens (GPT-4)
    output: 0.03,    // $0.03 per 1K output tokens (GPT-4)
    currency: 'USD'
  },
  perplexity: {
    input: 0.002,    // $0.002 per 1K input tokens
    output: 0.006,   // $0.006 per 1K output tokens
    currency: 'USD'
  }
};

// Feature priorities by use case
export const FEATURE_PRIORITIES: Record<string, AIProvider[]> = {
  symbolLookup: ['gemini', 'perplexity', 'openai'],
  financialAnalysis: ['gemini', 'openai', 'perplexity'],
  quickQueries: ['gemini', 'openai', 'perplexity'],
  detailedAnalysis: ['openai', 'gemini', 'perplexity'],
  realTimeData: ['perplexity', 'gemini', 'openai']
};

// Validation rules
export const VALIDATION_RULES = {
  maxQueryLength: 1000,
  maxResultsLimit: 20,
  minConfidenceThreshold: 0.1,
  maxRetries: 3,
  timeoutMs: 30000
};

// Cache settings
export const CACHE_SETTINGS = {
  symbolLookup: {
    defaultTTL: 3600000, // 1 hour
    maxEntries: 1000
  },
  financialAnalysis: {
    defaultTTL: 1800000, // 30 minutes
    maxEntries: 500
  },
  testConnection: {
    defaultTTL: 300000, // 5 minutes
    maxEntries: 10
  }
};

// Error messages
export const ERROR_MESSAGES = {
  NO_API_KEY: 'API key not configured for provider',
  RATE_LIMIT_EXCEEDED: 'Rate limit exceeded. Please try again later',
  INVALID_REQUEST: 'Invalid request parameters',
  SERVICE_UNAVAILABLE: 'AI service is currently unavailable',
  PARSING_ERROR: 'Failed to parse AI response',
  NETWORK_ERROR: 'Network error occurred',
  TIMEOUT_ERROR: 'Request timed out',
  QUOTA_EXCEEDED: 'API quota exceeded',
  INVALID_MODEL: 'Invalid model specified for provider'
};

// Utility functions
export function getDefaultConfig(provider: AIProvider): Partial<AIServiceConfig> {
  return AI_SERVICE_DEFAULTS[provider] || {};
}

export function getAvailableModels(provider: AIProvider): string[] {
  return AI_MODELS[provider] || [];
}

export function getProviderCapabilities(provider: AIProvider) {
  return AI_CAPABILITIES[provider] || {};
}

export function estimateCost(provider: AIProvider, inputTokens: number, outputTokens: number): number {
  const costs = AI_COSTS[provider];
  if (!costs) return 0;
  
  return (inputTokens / 1000) * costs.input + (outputTokens / 1000) * costs.output;
}

export function getBestProvider(feature: string): AIProvider | null {
  const priorities = FEATURE_PRIORITIES[feature];
  return priorities && priorities.length > 0 ? priorities[0] : null;
}

interface ValidationRequest {
  query?: string;
  maxResults?: number;
  [key: string]: unknown;
}

export function validateRequest(request: ValidationRequest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (request.query && request.query.length > VALIDATION_RULES.maxQueryLength) {
    errors.push(`Query exceeds maximum length of ${VALIDATION_RULES.maxQueryLength} characters`);
  }
  
  if (request.maxResults && request.maxResults > VALIDATION_RULES.maxResultsLimit) {
    errors.push(`Max results exceeds limit of ${VALIDATION_RULES.maxResultsLimit}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
