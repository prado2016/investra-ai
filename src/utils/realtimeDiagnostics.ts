/**
 * Real-time Connection Diagnostic Tool
 * Helps debug and diagnose real-time connection issues
 */

import { realtimeService } from '../services/realtimeService'
import { validateAllConnections } from './connectionValidator'
import { validateSupabaseEnv } from './envValidator'

export interface DiagnosticReport {
  timestamp: string
  environment: {
    userAgent: string
    online: boolean
    connection: string
  }
  envValidation: ReturnType<typeof validateSupabaseEnv>
  connectivity: Awaited<ReturnType<typeof validateAllConnections>>
  realtimeStatus: {
    isConnected: boolean
    status: any
    errorHistory: string[]
  }
  recommendations: string[]
}

/**
 * Run comprehensive real-time diagnostics
 */
export async function runRealtimeDiagnostics(): Promise<DiagnosticReport> {
  const timestamp = new Date().toISOString()
  
  // Environment info
  const environment = {
    userAgent: navigator.userAgent,
    online: navigator.onLine,
    connection: (navigator as any).connection?.effectiveType || 'unknown'
  }
  
  // Validation checks
  const envValidation = validateSupabaseEnv()
  const connectivity = await validateAllConnections()
  
  // Real-time service status
  const realtimeStatus = {
    isConnected: realtimeService.isServiceConnected(),
    status: realtimeService.getStatus(),
    errorHistory: [] // Could be expanded to track error history
  }
  
  // Generate recommendations
  const recommendations: string[] = []
  
  if (!environment.online) {
    recommendations.push('Device is offline - check internet connection')
  }
  
  if (!envValidation.isValid) {
    recommendations.push('Environment variables are invalid - check .env configuration')
  }
  
  if (!connectivity.network.isValid) {
    recommendations.push('Network connectivity issues detected')
  }
  
  if (!connectivity.supabase.isValid) {
    recommendations.push('Supabase connectivity issues detected')
  }
  
  if (!realtimeStatus.isConnected && connectivity.overall) {
    recommendations.push('Real-time service is disconnected despite good connectivity - try manual reconnection')
  }
  
  if (realtimeStatus.status.reconnectAttempts > 5) {
    recommendations.push('Too many reconnection attempts - circuit breaker may be engaged')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('All systems appear healthy')
  }
  
  return {
    timestamp,
    environment,
    envValidation,
    connectivity,
    realtimeStatus,
    recommendations
  }
}

/**
 * Log diagnostic report to console
 */
export function logDiagnosticReport(report: DiagnosticReport): void {
  console.group('🔍 Real-time Connection Diagnostics')
  console.log('Timestamp:', report.timestamp)
  
  console.group('🌐 Environment')
  console.log('Online:', report.environment.online)
  console.log('Connection:', report.environment.connection)
  console.log('User Agent:', report.environment.userAgent.substring(0, 100) + '...')
  console.groupEnd()
  
  console.group('⚙️ Environment Validation')
  console.log('Valid:', report.envValidation.isValid)
  if (report.envValidation.missingVars.length > 0) {
    console.log('Missing vars:', report.envValidation.missingVars)
  }
  if (report.envValidation.invalidVars.length > 0) {
    console.log('Invalid vars:', report.envValidation.invalidVars)
  }
  console.groupEnd()
  
  console.group('🔗 Connectivity')
  console.log('Network valid:', report.connectivity.network.isValid)
  console.log('Supabase valid:', report.connectivity.supabase.isValid)
  console.log('Overall valid:', report.connectivity.overall)
  console.groupEnd()
  
  console.group('📡 Real-time Status')
  console.log('Connected:', report.realtimeStatus.isConnected)
  console.log('Reconnect attempts:', report.realtimeStatus.status.reconnectAttempts)
  console.log('Last error:', report.realtimeStatus.status.error)
  console.groupEnd()
  
  console.group('💡 Recommendations')
  report.recommendations.forEach(rec => console.log('•', rec))
  console.groupEnd()
  
  console.groupEnd()
}

/**
 * Add global diagnostic function for debugging
 */
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).debugRealtime = async () => {
    const report = await runRealtimeDiagnostics()
    logDiagnosticReport(report)
    return report
  }
  
  console.log('🔧 Debug helper available: window.debugRealtime()')
}
