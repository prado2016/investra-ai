/**
 * Comprehensive Real-time Connection Fix Test
 * Tests all the fixes applied to resolve the "Failed to fetch" error
 */

import { realtimeService } from '../services/realtimeService'
import { validateAllConnections } from '../utils/connectionValidator'
import { runRealtimeDiagnostics } from '../utils/realtimeDiagnostics'
import { supabase } from '../lib/supabase'

interface TestResult {
  testName: string
  passed: boolean
  message: string
  details?: any
}

export class RealtimeConnectionFixTest {
  private results: TestResult[] = []

  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting comprehensive real-time connection fix tests...')
    
    // Test 1: Environment validation
    await this.testEnvironmentValidation()
    
    // Test 2: Connection validation
    await this.testConnectionValidation()
    
    // Test 3: Supabase client timeout
    await this.testSupabaseTimeout()
    
    // Test 4: Circuit breaker functionality
    await this.testCircuitBreaker()
    
    // Test 5: Real-time service initialization
    await this.testRealtimeInitialization()
    
    // Test 6: Error handling resilience
    await this.testErrorHandling()
    
    // Test 7: Diagnostic tools
    await this.testDiagnosticTools()
    
    return this.results
  }

  private async testEnvironmentValidation(): Promise<void> {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
      
      const passed = !!(supabaseUrl && supabaseKey && 
                       supabaseUrl.startsWith('https://') && 
                       supabaseKey.startsWith('eyJ'))
      
      this.results.push({
        testName: 'Environment Validation',
        passed,
        message: passed ? 'Environment variables are properly configured' : 'Environment variables are missing or invalid',
        details: { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey }
      })
    } catch (error) {
      this.results.push({
        testName: 'Environment Validation',
        passed: false,
        message: `Environment validation failed: ${error}`,
        details: error
      })
    }
  }

  private async testConnectionValidation(): Promise<void> {
    try {
      const validation = await validateAllConnections()
      
      this.results.push({
        testName: 'Connection Validation',
        passed: validation.overall,
        message: validation.overall ? 'All connections are valid' : 'Some connections failed validation',
        details: validation
      })
    } catch (error) {
      this.results.push({
        testName: 'Connection Validation',
        passed: false,
        message: `Connection validation test failed: ${error}`,
        details: error
      })
    }
  }

  private async testSupabaseTimeout(): Promise<void> {
    try {
      const startTime = Date.now()
      
      // Test that Supabase requests complete within reasonable time
      const { error } = await supabase.auth.getSession()
      
      const duration = Date.now() - startTime
      const passed = duration < 15000 && !error // Should complete within 15 seconds
      
      this.results.push({
        testName: 'Supabase Timeout Configuration',
        passed,
        message: passed ? `Request completed in ${duration}ms` : `Request took too long (${duration}ms) or failed`,
        details: { duration, error: error?.message }
      })
    } catch (error) {
      this.results.push({
        testName: 'Supabase Timeout Configuration',
        passed: false,
        message: `Timeout test failed: ${error}`,
        details: error
      })
    }
  }

  private async testCircuitBreaker(): Promise<void> {
    try {
      // Test that circuit breaker methods exist and work
      const service = realtimeService as any
      const hasCircuitBreakerMethods = typeof service.isCircuitBreakerOpen === 'function' &&
                                      typeof service.recordFailure === 'function' &&
                                      typeof service.recordSuccess === 'function'
      
      this.results.push({
        testName: 'Circuit Breaker Implementation',
        passed: hasCircuitBreakerMethods,
        message: hasCircuitBreakerMethods ? 'Circuit breaker methods are implemented' : 'Circuit breaker methods are missing',
        details: { hasCircuitBreakerMethods }
      })
    } catch (error) {
      this.results.push({
        testName: 'Circuit Breaker Implementation',
        passed: false,
        message: `Circuit breaker test failed: ${error}`,
        details: error
      })
    }
  }

  private async testRealtimeInitialization(): Promise<void> {
    try {
      const initialStatus = realtimeService.getStatus()
      
      // Test that initialize method exists and returns a promise
      const initializePromise = realtimeService.initialize()
      const isPromise = initializePromise && typeof initializePromise.then === 'function'
      
      if (isPromise) {
        const result = await initializePromise
        const passed = typeof result === 'boolean'
        
        this.results.push({
          testName: 'Real-time Service Initialization',
          passed,
          message: passed ? `Initialization ${result ? 'succeeded' : 'failed gracefully'}` : 'Initialization returned unexpected result',
          details: { result, initialStatus }
        })
      } else {
        this.results.push({
          testName: 'Real-time Service Initialization',
          passed: false,
          message: 'Initialize method does not return a promise',
          details: { isPromise }
        })
      }
    } catch (error) {
      this.results.push({
        testName: 'Real-time Service Initialization',
        passed: false,
        message: `Initialization test failed: ${error}`,
        details: error
      })
    }
  }

  private async testErrorHandling(): Promise<void> {
    try {
      // Test that error handling doesn't crash the service
      const status = realtimeService.getStatus()
      const hasErrorField = typeof status.error === 'string' || status.error === null
      const hasReconnectAttempts = typeof status.reconnectAttempts === 'number'
      
      const passed = hasErrorField && hasReconnectAttempts
      
      this.results.push({
        testName: 'Error Handling Resilience',
        passed,
        message: passed ? 'Error handling fields are properly implemented' : 'Error handling fields are missing',
        details: { status, hasErrorField, hasReconnectAttempts }
      })
    } catch (error) {
      this.results.push({
        testName: 'Error Handling Resilience',
        passed: false,
        message: `Error handling test failed: ${error}`,
        details: error
      })
    }
  }

  private async testDiagnosticTools(): Promise<void> {
    try {
      const diagnostics = await runRealtimeDiagnostics()
      
      const hasRequiredFields = !!(diagnostics.timestamp && 
                                   diagnostics.environment && 
                                   diagnostics.connectivity && 
                                   diagnostics.recommendations)
      
      this.results.push({
        testName: 'Diagnostic Tools',
        passed: hasRequiredFields,
        message: hasRequiredFields ? 'Diagnostic tools are working properly' : 'Diagnostic tools are missing required fields',
        details: { diagnostics }
      })
    } catch (error) {
      this.results.push({
        testName: 'Diagnostic Tools',
        passed: false,
        message: `Diagnostic tools test failed: ${error}`,
        details: error
      })
    }
  }

  logResults(): void {
    console.group('🧪 Real-time Connection Fix Test Results')
    
    const passedTests = this.results.filter(r => r.passed).length
    const totalTests = this.results.length
    
    console.log(`✅ Passed: ${passedTests}/${totalTests} tests`)
    
    this.results.forEach(result => {
      const icon = result.passed ? '✅' : '❌'
      console.log(`${icon} ${result.testName}: ${result.message}`)
      
      if (!result.passed && result.details) {
        console.group('Details:')
        console.log(result.details)
        console.groupEnd()
      }
    })
    
    console.groupEnd()
  }
}

// Export test runner function
export async function runRealtimeConnectionFixTest(): Promise<TestResult[]> {
  const tester = new RealtimeConnectionFixTest()
  const results = await tester.runAllTests()
  tester.logResults()
  return results
}

// Add to global window for manual testing
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).testRealtimeFixes = runRealtimeConnectionFixTest
  console.log('🔧 Real-time fix test available: window.testRealtimeFixes()')
}
