/**
 * Connection Testing Service
 * Provides real connection tests for different service types
 * Includes IMAP, Database (Supabase), and AI services testing
 */

/// <reference path="../../types/imapflow.d.ts" />
import ImapFlow from 'imapflow'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { 
  ConnectionTestResult, 
  ConnectionTestOptions,
  EmailConfiguration,
  DatabaseConfiguration,
  AIServicesConfiguration
} from './types'

/**
 * Default connection test options
 */
const DEFAULT_OPTIONS: ConnectionTestOptions = {
  timeoutMs: 30000,
  retries: 1,
  validateSSL: true
}

/**
 * Connection Testing Service
 */
export class ConnectionTestingService {
  /**
   * Test IMAP email connection
   * @param config - Email configuration to test
   * @param options - Connection test options
   * @returns Promise with connection test result
   */
  static async testIMAPConnection(
    config: EmailConfiguration, 
    options: ConnectionTestOptions = DEFAULT_OPTIONS
  ): Promise<ConnectionTestResult> {
    const startTime = Date.now()
    
    try {
      const client = new ImapFlow({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: {
          user: config.username,
          pass: config.password
        },
        logger: false // Disable logging for connection tests
      })

      // Set timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), options.timeoutMs)
      })

      // Test connection
      await Promise.race([
        client.connect(),
        timeoutPromise
      ])

      // Test basic operations
      const mailboxLock = await client.getMailboxLock('INBOX')
      try {
        // Try to list some messages to verify read access
        const messages = client.fetch('1:5', { 
          envelope: true, 
          uid: true, 
          flags: true, 
          bodyStructure: false, 
          source: false 
        })
        const messageArray = []
        for await (const message of messages) {
          messageArray.push(message)
          if (messageArray.length >= 5) break; // Limit to 5 messages
        }
        const messageCount = messageArray.length
        
        await client.logout()
        
        const responseTime = Date.now() - startTime
        return {
          success: true,
          message: `Successfully connected to ${config.host}:${config.port}`,
          details: {
            provider: config.provider,
            secure: config.secure,
            messageCount,
            folders: config.folders
          },
          responseTime,
          timestamp: new Date().toISOString()
        }
      } finally {
        mailboxLock.release()
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      return {
        success: false,
        message: `IMAP connection failed: ${errorMessage}`,
        details: {
          error: errorMessage,
          host: config.host,
          port: config.port,
          secure: config.secure
        },
        responseTime,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Test Supabase database connection
   * @param config - Database configuration to test
   * @param options - Connection test options
   * @returns Promise with connection test result
   */
  static async testDatabaseConnection(
    config: DatabaseConfiguration,
    options: ConnectionTestOptions = DEFAULT_OPTIONS
  ): Promise<ConnectionTestResult> {
    const startTime = Date.now()

    try {
      // Create temporary Supabase client
      const supabase = createClient(config.supabase.url, config.supabase.anonKey, {
        auth: {
          persistSession: false
        }
      })

      // Set timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), options.timeoutMs)
      })

      // Test basic connection with a simple query
      const testPromise = async () => {
        // Test basic connectivity
        const { data, error } = await supabase
          .from('profiles') // Assuming this table exists
          .select('count', { count: 'exact', head: true })

        if (error && !error.message.includes('relation "profiles" does not exist')) {
          throw new Error(`Database query failed: ${error.message}`)
        }

        return { count: data }
      }

      const result = await Promise.race([
        testPromise(),
        timeoutPromise
      ])

      const responseTime = Date.now() - startTime
      return {
        success: true,
        message: `Successfully connected to Supabase database`,
        details: {
          url: config.supabase.url,
          realtimeEnabled: config.settings.enableRealtime,
          queryTimeout: config.settings.queryTimeout,
          result
        },
        responseTime,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      return {
        success: false,
        message: `Database connection failed: ${errorMessage}`,
        details: {
          error: errorMessage,
          url: config.supabase.url,
          timeout: options.timeoutMs
        },
        responseTime,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Test Google AI services connection
   * @param config - AI services configuration to test
   * @param options - Connection test options
   * @returns Promise with connection test result
   */
  static async testAIService(
    config: AIServicesConfiguration,
    options: ConnectionTestOptions = DEFAULT_OPTIONS
  ): Promise<ConnectionTestResult> {
    const startTime = Date.now()

    try {
      if (!config.googleAI.enabled) {
        return {
          success: false,
          message: 'Google AI service is disabled',
          timestamp: new Date().toISOString()
        }
      }

      // Create Google AI client
      const genAI = new GoogleGenerativeAI(config.googleAI.apiKey)
      const model = genAI.getGenerativeModel({ model: config.googleAI.model })

      // Set timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Connection timeout')), options.timeoutMs)
      })

      // Test with a simple prompt
      const testPromise = async () => {
        const result = await model.generateContent({
          contents: [{
            role: 'user',
            parts: [{ text: 'Hello, this is a connection test. Please respond with "OK".' }]
          }],
          generationConfig: {
            maxOutputTokens: 10,
            temperature: 0
          }
        })

        const response = result.response
        const text = response.text()
        
        return { response: text, usage: response.usageMetadata }
      }

      const result = await Promise.race([
        testPromise(),
        timeoutPromise
      ])

      const responseTime = Date.now() - startTime
      return {
        success: true,
        message: `Successfully connected to Google AI (${config.googleAI.model})`,
        details: {
          model: config.googleAI.model,
          provider: 'google',
          maxTokens: config.googleAI.maxTokens,
          temperature: config.googleAI.temperature,
          testResult: result
        },
        responseTime,
        timestamp: new Date().toISOString()
      }
    } catch (error) {
      const responseTime = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      return {
        success: false,
        message: `AI service connection failed: ${errorMessage}`,
        details: {
          error: errorMessage,
          provider: 'google',
          model: config.googleAI.model,
          enabled: config.googleAI.enabled
        },
        responseTime,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Test all connections for a complete configuration
   * @param configs - Object containing all configuration types
   * @param options - Connection test options
   * @returns Promise with test results for all services
   */
  static async testAllConnections(
    configs: {
      email?: EmailConfiguration
      database?: DatabaseConfiguration
      aiServices?: AIServicesConfiguration
    },
    options: ConnectionTestOptions = DEFAULT_OPTIONS
  ): Promise<{
    email?: ConnectionTestResult
    database?: ConnectionTestResult
    aiServices?: ConnectionTestResult
    overall: {
      success: boolean
      totalTests: number
      passed: number
      failed: number
    }
  }> {
    const results: any = {}
    let totalTests = 0
    let passed = 0
    let failed = 0

    // Test email connection
    if (configs.email) {
      totalTests++
      try {
        results.email = await this.testIMAPConnection(configs.email, options)
        if (results.email.success) passed++
        else failed++
      } catch (error) {
        failed++
        results.email = {
          success: false,
          message: `Email test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        }
      }
    }

    // Test database connection
    if (configs.database) {
      totalTests++
      try {
        results.database = await this.testDatabaseConnection(configs.database, options)
        if (results.database.success) passed++
        else failed++
      } catch (error) {
        failed++
        results.database = {
          success: false,
          message: `Database test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        }
      }
    }

    // Test AI services connection
    if (configs.aiServices) {
      totalTests++
      try {
        results.aiServices = await this.testAIService(configs.aiServices, options)
        if (results.aiServices.success) passed++
        else failed++
      } catch (error) {
        failed++
        results.aiServices = {
          success: false,
          message: `AI service test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date().toISOString()
        }
      }
    }

    results.overall = {
      success: failed === 0 && totalTests > 0,
      totalTests,
      passed,
      failed
    }

    return results
  }

  /**
   * Test connection with retry logic
   * @param testFunction - Function that performs the connection test
   * @param retries - Number of retries
   * @param delay - Delay between retries in milliseconds
   * @returns Promise with connection test result
   */
  static async testWithRetry<T>(
    testFunction: () => Promise<T>,
    retries: number = 2,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error | null = null

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await testFunction()
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error')
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    throw lastError
  }
}
