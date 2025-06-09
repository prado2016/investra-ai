/**
 * Configuration management for the Stock Tracker application
 * Handles environment variables and API keys securely
 */

export interface AppConfig {
  yahooFinance: {
    apiKey?: string;
    baseUrl: string;
    timeout: number;
    rateLimitDelay: number;
  };
  cache: {
    defaultDuration: number; // in milliseconds
    historicalDataDuration: number;
  };
  app: {
    environment: 'development' | 'staging' | 'production';
    debug: boolean;
  };
}

/**
 * Validates that required environment variables are present
 */
function validateEnvironment(): void {
  const requiredVars: string[] = [];
  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missingVars.join(', ')}`);
    console.warn('The application will continue but some features may not work properly.');
  }
}

/**
 * Get configuration based on environment
 */
function getConfig(): AppConfig {
  validateEnvironment();

  const environment = (import.meta.env.MODE as AppConfig['app']['environment']) || 'development';
  
  return {
    yahooFinance: {
      apiKey: import.meta.env.VITE_YAHOO_FINANCE_API_KEY,
      baseUrl: 'https://query1.finance.yahoo.com',
      timeout: 10000, // 10 seconds
      rateLimitDelay: environment === 'production' ? 500 : 200, // More conservative in production
    },
    cache: {
      defaultDuration: 60 * 1000, // 1 minute
      historicalDataDuration: 10 * 60 * 1000, // 10 minutes
    },
    app: {
      environment,
      debug: environment === 'development',
    },
  };
}

export const config = getConfig();

/**
 * Utility function to check if API is properly configured
 */
export function isApiConfigured(): boolean {
  // Yahoo Finance API doesn't require an API key for basic functionality
  // but we should have proper configuration
  return !!config.yahooFinance.baseUrl;
}

/**
 * Get sanitized config for logging (removes sensitive information)
 */
export function getSanitizedConfig(): Partial<AppConfig> {
  return {
    yahooFinance: {
      ...config.yahooFinance,
      apiKey: config.yahooFinance.apiKey ? '[REDACTED]' : undefined,
    },
    cache: config.cache,
    app: config.app,
  };
}

/**
 * Log configuration on app startup (development only)
 */
if (config.app.debug) {
  console.log('App Configuration:', getSanitizedConfig());
}
