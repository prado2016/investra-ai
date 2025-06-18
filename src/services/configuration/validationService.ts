/**
 * Configuration Validation Service
 * Provides comprehensive validation for all configuration types
 * with connection testing and detailed error reporting
 */

import type { 
  ValidationResult, 
  ValidationError, 
  ValidationWarning,
  ValidationSchemaName,
  ConnectionTestResult,
  EmailConfiguration,
  DatabaseConfiguration,
  AIServicesConfiguration,
  ConfigurationCategory
} from './types'
import { 
  getValidationSchema, 
  validateWithSchema, 
  sanitizeData,
  getAvailableSchemas 
} from './validationSchemas'
import { ConnectionTestingService } from './connectionTesting'
import type { z } from 'zod'

/**
 * Configuration Validation Service
 */
export class ConfigurationValidationService {
  private static readonly DEFAULT_TIMEOUT = 30000
  private static readonly MAX_TIMEOUT = 60000

  /**
   * Validate configuration data against its schema
   * @param category - Configuration category
   * @param data - Configuration data to validate
   * @param options - Validation options
   * @returns Promise with validation result
   */
  static async validateConfiguration(
    category: ConfigurationCategory,
    data: any,
    options: {
      testConnections?: boolean
      timeout?: number
      skipSanitization?: boolean
    } = {}
  ): Promise<ValidationResult> {
    const {
      testConnections = false,
      timeout = this.DEFAULT_TIMEOUT,
      skipSanitization = false
    } = options

    const errors: ValidationError[] = []
    const warnings: ValidationWarning[] = []
    let sanitizedData = data

    try {
      // Get appropriate schema for category
      const schemaName = this.getSchemaNameForCategory(category)
      if (!schemaName) {
        errors.push({
          field: 'category',
          message: `Unsupported configuration category: ${category}`,
          code: 'UNSUPPORTED_CATEGORY',
          severity: 'critical'
        })
        return {
          isValid: false,
          errors,
          warnings
        }
      }

      // Sanitize data if requested
      if (!skipSanitization) {
        try {
          sanitizedData = this.sanitizeConfiguration(category, data)
        } catch (error) {
          warnings.push({
            field: 'sanitization',
            message: `Data sanitization warning: ${error instanceof Error ? error.message : 'Unknown error'}`,
            code: 'SANITIZATION_WARNING',
            suggestion: 'Review input data format'
          })
        }
      }

      // Validate against schema
      const schemaValidation = validateWithSchema(schemaName, sanitizedData)
      if (!schemaValidation.success && schemaValidation.errors) {
        const zodErrors = this.convertZodErrors(schemaValidation.errors)
        errors.push(...zodErrors)
      }

      // Perform connection tests if requested and validation passed
      if (testConnections && errors.length === 0) {
        const connectionResults = await this.performConnectionTests(
          category,
          sanitizedData,
          Math.min(timeout, this.MAX_TIMEOUT)
        )

        // Add connection test results as errors or warnings
        for (const [testType, result] of Object.entries(connectionResults)) {
          if (!result.success) {
            errors.push({
              field: `connection_${testType}`,
              message: result.message,
              code: 'CONNECTION_FAILED',
              severity: 'error'
            })
          } else if (result.responseTime && result.responseTime > 10000) {
            warnings.push({
              field: `connection_${testType}`,
              message: `Slow connection detected (${result.responseTime}ms)`,
              code: 'SLOW_CONNECTION',
              suggestion: 'Consider optimizing network settings or choosing a closer server'
            })
          }
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        sanitizedData: skipSanitization ? undefined : sanitizedData
      }
    } catch (error) {
      errors.push({
        field: 'validation',
        message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'VALIDATION_ERROR',
        severity: 'critical'
      })

      return {
        isValid: false,
        errors,
        warnings
      }
    }
  }

  /**
   * Sanitize configuration data
   * @param category - Configuration category
   * @param data - Raw configuration data
   * @returns Sanitized configuration data
   */
  static sanitizeConfiguration(category: ConfigurationCategory, data: any): any {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid configuration data provided')
    }

    const schemaName = this.getSchemaNameForCategory(category)
    if (!schemaName) {
      throw new Error(`Unsupported configuration category: ${category}`)
    }

    try {
      return sanitizeData(schemaName, data)
    } catch (error) {
      console.warn('Sanitization failed, returning original data:', error)
      return data
    }
  }

  /**
   * Get validation schema for a category
   * @param category - Configuration category
   * @returns Validation schema or null if not found
   */
  static getValidationSchema(category: ConfigurationCategory): z.ZodSchema | null {
    const schemaName = this.getSchemaNameForCategory(category)
    if (!schemaName) return null

    return getValidationSchema(schemaName) || null
  }

  /**
   * Test IMAP connection with timeout handling
   * @param config - Email configuration
   * @param timeout - Timeout in milliseconds
   * @returns Promise with connection test result
   */
  static async testIMAPConnection(
    config: EmailConfiguration, 
    timeout: number = this.DEFAULT_TIMEOUT
  ): Promise<ConnectionTestResult> {
    try {
      return await ConnectionTestingService.testIMAPConnection(config, { timeoutMs: timeout })
    } catch (error) {
      return {
        success: false,
        message: `IMAP connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Test database connection with timeout handling
   * @param config - Database configuration
   * @param timeout - Timeout in milliseconds
   * @returns Promise with connection test result
   */
  static async testDatabaseConnection(
    config: DatabaseConfiguration,
    timeout: number = this.DEFAULT_TIMEOUT
  ): Promise<ConnectionTestResult> {
    try {
      return await ConnectionTestingService.testDatabaseConnection(config, { timeoutMs: timeout })
    } catch (error) {
      return {
        success: false,
        message: `Database connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Test AI service connection with timeout handling
   * @param config - AI services configuration
   * @param timeout - Timeout in milliseconds
   * @returns Promise with connection test result
   */
  static async testAIService(
    config: AIServicesConfiguration,
    timeout: number = this.DEFAULT_TIMEOUT
  ): Promise<ConnectionTestResult> {
    try {
      return await ConnectionTestingService.testAIService(config, { timeoutMs: timeout })
    } catch (error) {
      return {
        success: false,
        message: `AI service connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      }
    }
  }

  /**
   * Private helper methods
   */

  /**
   * Map configuration category to schema name
   * @param category - Configuration category
   * @returns Schema name or null
   */
  private static getSchemaNameForCategory(category: ConfigurationCategory): ValidationSchemaName | null {
    const mapping: Record<ConfigurationCategory, ValidationSchemaName> = {
      'email': 'email-configuration',
      'ai_services': 'ai-services-configuration',
      'database': 'database-configuration',
      'monitoring': 'monitoring-configuration',
      'security': 'security-configuration',
      'notifications': 'monitoring-configuration', // Use monitoring schema for notifications
      'integrations': 'ai-services-configuration' // Use AI services schema for integrations
    }

    return mapping[category] || null
  }

  /**
   * Convert Zod validation errors to our error format
   * @param zodError - Zod validation error
   * @returns Array of validation errors
   */
  private static convertZodErrors(zodError: z.ZodError): ValidationError[] {
    return zodError.errors.map(error => ({
      field: error.path.join('.') || 'root',
      message: this.getHumanReadableErrorMessage(error),
      code: error.code.toUpperCase(),
      severity: this.getErrorSeverity(error.code)
    }))
  }

  /**
   * Get human-readable error message from Zod error
   * @param error - Zod error object
   * @returns Human-readable error message
   */
  private static getHumanReadableErrorMessage(error: z.ZodIssue): string {
    switch (error.code) {
      case 'invalid_type':
        return `Expected ${error.expected}, but received ${error.received}`
      case 'invalid_string':
        if (error.validation === 'email') {
          return 'Please enter a valid email address'
        }
        if (error.validation === 'url') {
          return 'Please enter a valid URL'
        }
        return `Invalid ${error.validation || 'string'} format`
      case 'too_small':
        if (error.type === 'string') {
          return `Must be at least ${error.minimum} characters long`
        }
        return `Value must be at least ${error.minimum}`
      case 'too_big':
        if (error.type === 'string') {
          return `Must be no more than ${error.maximum} characters long`
        }
        return `Value must be no more than ${error.maximum}`
      case 'invalid_enum_value':
        return `Invalid value. Expected: ${error.options?.join(', ')}`
      case 'custom':
        return error.message || 'Custom validation failed'
      default:
        return error.message || 'Validation failed'
    }
  }

  /**
   * Determine error severity based on Zod error code
   * @param code - Zod error code
   * @returns Error severity
   */
  private static getErrorSeverity(code: string): 'error' | 'critical' {
    const criticalCodes = ['invalid_type', 'unrecognized_keys']
    return criticalCodes.includes(code) ? 'critical' : 'error'
  }

  /**
   * Perform connection tests based on configuration category
   * @param category - Configuration category
   * @param data - Configuration data
   * @param timeout - Timeout in milliseconds
   * @returns Promise with connection test results
   */
  private static async performConnectionTests(
    category: ConfigurationCategory,
    data: any,
    timeout: number
  ): Promise<Record<string, ConnectionTestResult>> {
    const results: Record<string, ConnectionTestResult> = {}

    try {
      switch (category) {
        case 'email':
          results.imap = await this.testIMAPConnection(data as EmailConfiguration, timeout)
          break

        case 'database':
          results.database = await this.testDatabaseConnection(data as DatabaseConfiguration, timeout)
          break

        case 'ai_services':
        case 'integrations':
          results.aiService = await this.testAIService(data as AIServicesConfiguration, timeout)
          break

        default:
          // No connection tests for other categories
          break
      }
    } catch (error) {
      console.error('Connection test error:', error)
      results.error = {
        success: false,
        message: `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date().toISOString()
      }
    }

    return results
  }

  /**
   * Get available configuration categories
   * @returns Array of supported configuration categories
   */
  static getAvailableCategories(): ConfigurationCategory[] {
    return ['email', 'ai_services', 'database', 'monitoring', 'security', 'notifications', 'integrations']
  }

  /**
   * Get available validation schemas
   * @returns Array of available schema names
   */
  static getAvailableSchemas(): ValidationSchemaName[] {
    return getAvailableSchemas()
  }

  /**
   * Validate multiple configurations at once
   * @param configurations - Object containing multiple configurations
   * @param options - Validation options
   * @returns Promise with validation results for all configurations
   */
  static async validateMultipleConfigurations(
    configurations: Record<ConfigurationCategory, any>,
    options: {
      testConnections?: boolean
      timeout?: number
      skipSanitization?: boolean
    } = {}
  ): Promise<Record<ConfigurationCategory, ValidationResult>> {
    const results: Record<string, ValidationResult> = {}

    // Process configurations in parallel
    const validationPromises = Object.entries(configurations).map(async ([category, data]) => {
      try {
        const result = await this.validateConfiguration(
          category as ConfigurationCategory,
          data,
          options
        )
        return [category, result] as const
      } catch (error) {
        return [category, {
          isValid: false,
          errors: [{
            field: 'validation',
            message: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            code: 'VALIDATION_ERROR',
            severity: 'critical' as const
          }],
          warnings: []
        }] as const
      }
    })

    const validationResults = await Promise.all(validationPromises)
    
    for (const [category, result] of validationResults) {
      results[category] = result
    }

    return results as Record<ConfigurationCategory, ValidationResult>
  }
}
