/**
 * Connection Validation Utilities
 * Helps diagnose and validate network connectivity issues
 */

import { supabase } from '../lib/supabase'

export interface ConnectionValidationResult {
  isValid: boolean
  error?: string
  latency?: number
  timestamp: string
}

/**
 * Test Supabase connectivity
 */
export async function validateSupabaseConnection(): Promise<ConnectionValidationResult> {
  const startTime = Date.now()
  
  try {
    // Simple health check - try to get the current session
    const { error } = await supabase.auth.getSession()
    
    const latency = Date.now() - startTime
    
    if (error) {
      return {
        isValid: false,
        error: `Supabase auth error: ${error.message}`,
        latency,
        timestamp: new Date().toISOString()
      }
    }
    
    return {
      isValid: true,
      latency,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    const latency = Date.now() - startTime
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Unknown connection error',
      latency,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Test general network connectivity
 */
export async function validateNetworkConnection(): Promise<ConnectionValidationResult> {
  const startTime = Date.now()
  
  try {
    // Try to fetch a small resource
    await fetch('/favicon.ico', {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-cache'
    })
    
    const latency = Date.now() - startTime
    
    return {
      isValid: true,
      latency,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    const latency = Date.now() - startTime
    return {
      isValid: false,
      error: error instanceof Error ? error.message : 'Network connection failed',
      latency,
      timestamp: new Date().toISOString()
    }
  }
}

/**
 * Comprehensive connection validation
 */
export async function validateAllConnections(): Promise<{
  network: ConnectionValidationResult
  supabase: ConnectionValidationResult
  overall: boolean
}> {
  const [network, supabase] = await Promise.all([
    validateNetworkConnection(),
    validateSupabaseConnection()
  ])
  
  return {
    network,
    supabase,
    overall: network.isValid && supabase.isValid
  }
}
