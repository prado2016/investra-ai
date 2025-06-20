/**
 * Environment Variable Validation
 * Ensures all required environment variables are properly configured
 */

interface EnvValidationResult {
  isValid: boolean
  missingVars: string[]
  invalidVars: string[]
  warnings: string[]
}

/**
 * Validate Supabase environment variables
 */
export function validateSupabaseEnv(): EnvValidationResult {
  const result: EnvValidationResult = {
    isValid: true,
    missingVars: [],
    invalidVars: [],
    warnings: []
  }

  // Check for required Supabase variables
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (!supabaseUrl) {
    result.missingVars.push('VITE_SUPABASE_URL')
    result.isValid = false
  } else if (!supabaseUrl.startsWith('https://')) {
    result.invalidVars.push('VITE_SUPABASE_URL (must start with https://)')
    result.isValid = false
  }

  if (!supabaseKey) {
    result.missingVars.push('VITE_SUPABASE_ANON_KEY')
    result.isValid = false
  } else if (!supabaseKey.startsWith('eyJ')) {
    result.invalidVars.push('VITE_SUPABASE_ANON_KEY (invalid JWT format)')
    result.isValid = false
  }

  // Check optional variables
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
  if (apiBaseUrl && !apiBaseUrl.startsWith('http')) {
    result.warnings.push('VITE_API_BASE_URL should start with http:// or https://')
  }

  return result
}

/**
 * Log environment validation results
 */
export function logEnvValidation(): void {
  const validation = validateSupabaseEnv()
  
  if (validation.isValid) {
    console.log('✅ Environment variables validated successfully')
  } else {
    console.group('❌ Environment validation failed')
    
    if (validation.missingVars.length > 0) {
      console.error('Missing variables:', validation.missingVars)
    }
    
    if (validation.invalidVars.length > 0) {
      console.error('Invalid variables:', validation.invalidVars)
    }
    
    console.groupEnd()
  }

  if (validation.warnings.length > 0) {
    console.group('⚠️ Environment warnings')
    validation.warnings.forEach(warning => console.warn(warning))
    console.groupEnd()
  }
}

// Auto-validate in development
if (import.meta.env.DEV) {
  logEnvValidation()
}
