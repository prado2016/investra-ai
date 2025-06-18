/**
 * Production Readiness Validation
 * Validates required environment variables and configuration for production deployment
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface EnvironmentConfig {
  // Required for basic app functionality
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  
  // Required for email functionality
  IMAP_HOST?: string;
  IMAP_PORT?: string;
  IMAP_USERNAME?: string;
  IMAP_PASSWORD?: string;
  
  // API configuration
  VITE_API_BASE_URL?: string;
  
  // Optional but recommended
  CORS_ORIGINS?: string;
  NODE_ENV?: string;
}

/**
 * Validate production readiness
 */
export function validateProductionReadiness(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  const env: EnvironmentConfig = {
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    IMAP_HOST: import.meta.env.IMAP_HOST,
    IMAP_PORT: import.meta.env.IMAP_PORT,
    IMAP_USERNAME: import.meta.env.IMAP_USERNAME,
    IMAP_PASSWORD: import.meta.env.IMAP_PASSWORD,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    CORS_ORIGINS: import.meta.env.CORS_ORIGINS,
    NODE_ENV: import.meta.env.NODE_ENV,
  };
  
  // Critical environment variables
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ] as const;
  
  for (const key of required) {
    if (!env[key]) {
      errors.push(`Missing required environment variable: ${key}`);
    }
  }
  
  // Email configuration validation
  const emailRequired = [
    'IMAP_HOST',
    'IMAP_USERNAME', 
    'IMAP_PASSWORD'
  ] as const;
  
  const missingEmailVars = emailRequired.filter(key => !env[key]);
  if (missingEmailVars.length > 0) {
    warnings.push(`Email functionality disabled. Missing: ${missingEmailVars.join(', ')}`);
  }
  
  // Validate environment values
  if (env.VITE_SUPABASE_URL && !env.VITE_SUPABASE_URL.startsWith('https://')) {
    errors.push('VITE_SUPABASE_URL must be a valid HTTPS URL');
  }
  
  if (env.IMAP_PORT && (isNaN(Number(env.IMAP_PORT)) || Number(env.IMAP_PORT) < 1 || Number(env.IMAP_PORT) > 65535)) {
    errors.push('IMAP_PORT must be a valid port number (1-65535)');
  }
  
  // Production environment checks
  if (env.NODE_ENV === 'production') {
    if (!env.VITE_API_BASE_URL) {
      warnings.push('VITE_API_BASE_URL not set, will fallback to current domain');
    }
    
    if (!env.CORS_ORIGINS) {
      warnings.push('CORS_ORIGINS not set, only default origins will be allowed');
    }
  }
  
  // Security checks
  if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_URL.includes('localhost')) {
    warnings.push('Supabase URL appears to be localhost - ensure this is correct for production');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate API connectivity
 */
export async function validateAPIConnectivity(): Promise<ValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Test Supabase connectivity
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'HEAD',
          headers: {
            'apikey': supabaseKey,
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          errors.push(`Supabase API not accessible: ${response.status} ${response.statusText}`);
        }
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          errors.push('Supabase API timeout - check network connectivity');
        } else {
          errors.push(`Supabase API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    // Test API server connectivity (if configured)
    const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
    if (apiBaseUrl && apiBaseUrl !== window.location.origin) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${apiBaseUrl}/health`, {
          method: 'GET',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          warnings.push(`API server health check failed: ${response.status}`);
        }
      } catch (error) {
        warnings.push(`API server not accessible: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
  } catch (error) {
    errors.push(`Connectivity validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Run complete production validation
 */
export async function runProductionValidation(): Promise<ValidationResult> {
  const configValidation = validateProductionReadiness();
  const connectivityValidation = await validateAPIConnectivity();
  
  return {
    isValid: configValidation.isValid && connectivityValidation.isValid,
    errors: [...configValidation.errors, ...connectivityValidation.errors],
    warnings: [...configValidation.warnings, ...connectivityValidation.warnings]
  };
}

/**
 * Log validation results to console
 */
export function logValidationResults(result: ValidationResult): void {
  if (result.isValid) {
    console.log('✅ Production validation passed');
  } else {
    console.error('❌ Production validation failed');
  }
  
  if (result.errors.length > 0) {
    console.error('Errors:');
    result.errors.forEach((error, i) => {
      console.error(`  ${i + 1}. ${error}`);
    });
  }
  
  if (result.warnings.length > 0) {
    console.warn('Warnings:');
    result.warnings.forEach((warning, i) => {
      console.warn(`  ${i + 1}. ${warning}`);
    });
  }
}