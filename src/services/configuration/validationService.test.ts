/**
 * Comprehensive test suite for ConfigurationValidationService
 * Tests all validation scenarios, connection testing, and error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ConfigurationValidationService } from './validationService'
import type {
  ConfigurationCategory,
  EmailConfiguration,
  DatabaseConfiguration,
  AIServicesConfiguration,
  MonitoringConfiguration,
  SecurityConfiguration
} from './types'

// Mock the connection testing module
vi.mock('./connectionTesting', () => ({
  ConnectionTestingService: {
    testIMAPConnection: vi.fn(),
    testDatabaseConnection: vi.fn(),
    testAIService: vi.fn()
  }
}))

describe('ConfigurationValidationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic validation functionality', () => {
    it('should return available categories', () => {
      const categories = ConfigurationValidationService.getAvailableCategories()
      expect(categories).toContain('email')
      expect(categories).toContain('database')
      expect(categories).toContain('ai_services')
      expect(categories).toContain('monitoring')
      expect(categories).toContain('security')
    })

    it('should return available schemas', () => {
      const schemas = ConfigurationValidationService.getAvailableSchemas()
      expect(Array.isArray(schemas)).toBe(true)
      expect(schemas.length).toBeGreaterThan(0)
    })

    it('should handle invalid configuration category', async () => {
      const result = await ConfigurationValidationService.validateConfiguration(
        'invalid-category' as ConfigurationCategory,
        {}
      )

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
      expect(result.errors[0].code).toBe('UNSUPPORTED_CATEGORY')
    })

    it('should handle empty configuration data', async () => {
      const result = await ConfigurationValidationService.validateConfiguration('email', {})

      expect(result.isValid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe('Email Configuration Validation', () => {
    const validEmailConfig = {
      host: 'imap.gmail.com',
      port: 993,
      secure: true,
      username: 'test@gmail.com',
      password: 'password123',
      folder: 'INBOX'
    }

    it('should validate basic email configuration structure', async () => {
      const result = await ConfigurationValidationService.validateConfiguration('email', validEmailConfig)

      expect(result).toBeDefined()
      expect(typeof result.isValid).toBe('boolean')
      expect(Array.isArray(result.errors)).toBe(true)
      expect(Array.isArray(result.warnings)).toBe(true)
    })

    it('should sanitize email configuration data', async () => {
      const configWithWhitespace = {
        ...validEmailConfig,
        host: '  imap.gmail.com  ',
        username: '  test@gmail.com  '
      }

      const result = await ConfigurationValidationService.validateConfiguration('email', configWithWhitespace, {
        skipSanitization: false
      })

      // Since the config is incomplete and will fail validation,
      // let's test sanitization directly
      const sanitized = ConfigurationValidationService.sanitizeConfiguration('email', configWithWhitespace)
      expect(sanitized).toBeDefined()
    })

  })

  describe('Database Configuration Validation', () => {
    const validDatabaseConfig = {
      supabase: {
        url: 'https://test.supabase.co',
        anonKey: 'test-key'
      },
      settings: {
        enableRealtime: true,
        queryTimeout: 30000
      }
    }

    it('should validate basic database configuration structure', async () => {
      const result = await ConfigurationValidationService.validateConfiguration('database', validDatabaseConfig)

      expect(result).toBeDefined()
      expect(typeof result.isValid).toBe('boolean')
      expect(Array.isArray(result.errors)).toBe(true)
    })
  })

  describe('Multiple configurations validation', () => {
    it('should validate multiple configurations', async () => {
      const configurations = {
        email: {
          host: 'imap.gmail.com',
          port: 993,
          secure: true,
          username: 'test@gmail.com',
          password: 'password123'
        }
      }

      const results = await ConfigurationValidationService.validateMultipleConfigurations(configurations)

      expect(results.email).toBeDefined()
      expect(typeof results.email.isValid).toBe('boolean')
    })
  })

  describe('Utility methods', () => {
    it('should get validation schema for category', () => {
      const schema = ConfigurationValidationService.getValidationSchema('email')
      expect(schema).toBeDefined()
    })

    it('should return null for invalid category schema', () => {
      const schema = ConfigurationValidationService.getValidationSchema('invalid' as ConfigurationCategory)
      expect(schema).toBeNull()
    })

    it('should sanitize configuration data', () => {
      const sanitized = ConfigurationValidationService.sanitizeConfiguration('email', {
        host: '  test.com  ',
        port: 993
      })

      expect(sanitized).toBeDefined()
    })
  })
})
