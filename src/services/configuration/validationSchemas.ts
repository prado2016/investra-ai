/**
 * Configuration Validation Schemas
 * Uses Zod for comprehensive configuration validation
 */

import { z } from 'zod'
import type { ValidationSchemaName } from './types'

// Common validation patterns
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/
const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/
const apiKeyRegex = /^[A-Za-z0-9_\-]{20,}$/

// Common field validators with transformations
const email = z.string().trim().regex(emailRegex, 'Invalid email format')
const url = z.string().trim().regex(urlRegex, 'Invalid URL format')
const hostname = z.string().trim().regex(hostnameRegex, 'Invalid hostname format')
const port = z.number().int().min(1).max(65535)
const apiKey = z.string().trim().regex(apiKeyRegex, 'Invalid API key format')
const password = z.string().trim().min(8, 'Password must be at least 8 characters')

/**
 * Email Configuration Schema
 */
const emailFoldersSchema = z.object({
  inbox: z.string().trim().min(1, 'Inbox folder name required'),
  sent: z.string().trim().min(1, 'Sent folder name required'),
  drafts: z.string().trim().min(1, 'Drafts folder name required'),
  trash: z.string().trim().min(1, 'Trash folder name required')
})

const emailSettingsSchema = z.object({
  autoSync: z.boolean(),
  syncInterval: z.number().min(60, 'Sync interval must be at least 60 seconds').max(86400, 'Sync interval cannot exceed 24 hours'),
  maxEmailsPerSync: z.number().min(1).max(1000, 'Max emails per sync cannot exceed 1000'),
  enablePushNotifications: z.boolean(),
  markAsReadOnSync: z.boolean()
})

export const emailConfigurationSchema = z.object({
  host: hostname,
  port: port,
  secure: z.boolean(),
  username: email,
  password: password,
  provider: z.enum(['gmail', 'outlook', 'yahoo', 'imap', 'other']),
  authType: z.enum(['password', 'oauth', 'app_password']),
  folders: emailFoldersSchema,
  settings: emailSettingsSchema
}).refine((data) => {
  // Conditional validation: Gmail should use secure connection
  if (data.provider === 'gmail' && !data.secure) {
    return false
  }
  return true
}, {
  message: 'Gmail requires secure connection',
  path: ['secure']
})

/**
 * AI Services Configuration Schema
 */
const googleAISchema = z.object({
  apiKey: apiKey,
  model: z.string().trim().min(1, 'Model name required'),
  maxTokens: z.number().min(1).max(100000, 'Max tokens cannot exceed 100,000'),
  temperature: z.number().min(0).max(2, 'Temperature must be between 0 and 2'),
  enabled: z.boolean()
})

const openAISchema = z.object({
  apiKey: apiKey,
  model: z.string().trim().min(1, 'Model name required'),
  maxTokens: z.number().min(1).max(100000, 'Max tokens cannot exceed 100,000'),
  temperature: z.number().min(0).max(2, 'Temperature must be between 0 and 2'),
  enabled: z.boolean()
}).optional()

const aiSettingsSchema = z.object({
  defaultProvider: z.enum(['google', 'openai']),
  fallbackEnabled: z.boolean(),
  rateLimitPerMinute: z.number().min(1).max(1000, 'Rate limit cannot exceed 1000 requests per minute')
})

export const aiServicesConfigurationSchema = z.object({
  googleAI: googleAISchema,
  openAI: openAISchema,
  settings: aiSettingsSchema
}).refine((data) => {
  // Conditional validation: If fallback is enabled, both providers should be configured
  if (data.settings.fallbackEnabled && !data.openAI) {
    return false
  }
  return true
}, {
  message: 'Fallback requires OpenAI configuration',
  path: ['openAI']
})

/**
 * Database Configuration Schema
 */
const supabaseSchema = z.object({
  url: url,
  anonKey: z.string().min(20, 'Anonymous key too short'),
  serviceKey: z.string().min(20, 'Service key too short').optional(),
  enabled: z.boolean()
})

const databaseSettingsSchema = z.object({
  connectionPoolSize: z.number().min(1).max(50, 'Connection pool size cannot exceed 50'),
  queryTimeout: z.number().min(1000).max(30000, 'Query timeout must be between 1s and 30s'),
  enableRealtime: z.boolean(),
  enableLogging: z.boolean()
})

export const databaseConfigurationSchema = z.object({
  supabase: supabaseSchema,
  settings: databaseSettingsSchema
})

/**
 * Monitoring Configuration Schema
 */
const loggingSchema = z.object({
  level: z.enum(['debug', 'info', 'warn', 'error']),
  enableConsole: z.boolean(),
  enableRemote: z.boolean(),
  remoteEndpoint: url.optional()
}).refine((data) => {
  // Remote endpoint required if remote logging is enabled
  if (data.enableRemote && !data.remoteEndpoint) {
    return false
  }
  return true
}, {
  message: 'Remote endpoint required when remote logging is enabled',
  path: ['remoteEndpoint']
})

const metricsSchema = z.object({
  enabled: z.boolean(),
  collectInterval: z.number().min(10, 'Collection interval must be at least 10 seconds').max(3600, 'Collection interval cannot exceed 1 hour'),
  endpoint: url.optional()
})

const alertsSchema = z.object({
  enabled: z.boolean(),
  emailNotifications: z.boolean(),
  slackWebhook: url.optional()
})

export const monitoringConfigurationSchema = z.object({
  logging: loggingSchema,
  metrics: metricsSchema,
  alerts: alertsSchema
})

/**
 * Security Configuration Schema
 */
const encryptionSchema = z.object({
  enabled: z.boolean(),
  algorithm: z.enum(['AES-256-GCM', 'AES-256-CBC']),
  keyRotationDays: z.number().min(1).max(365, 'Key rotation cannot exceed 365 days')
})

const authenticationSchema = z.object({
  sessionTimeout: z.number().min(300, 'Session timeout must be at least 5 minutes').max(86400, 'Session timeout cannot exceed 24 hours'),
  requireTwoFactor: z.boolean(),
  allowedDomains: z.array(z.string().min(1, 'Domain cannot be empty'))
})

const rateLimitingSchema = z.object({
  enabled: z.boolean(),
  requestsPerMinute: z.number().min(1).max(10000, 'Requests per minute cannot exceed 10,000'),
  burstLimit: z.number().min(1).max(1000, 'Burst limit cannot exceed 1,000')
})

export const securityConfigurationSchema = z.object({
  encryption: encryptionSchema,
  authentication: authenticationSchema,
  rateLimiting: rateLimitingSchema
})

/**
 * Schema Registry - Maps schema names to their corresponding Zod schemas
 */
const schemaRegistry = new Map<ValidationSchemaName, z.ZodSchema>([
  ['email-configuration', emailConfigurationSchema],
  ['ai-services-configuration', aiServicesConfigurationSchema],
  ['database-configuration', databaseConfigurationSchema],
  ['monitoring-configuration', monitoringConfigurationSchema],
  ['security-configuration', securityConfigurationSchema]
])

/**
 * Get validation schema by name
 * @param schemaName - Name of the schema to retrieve
 * @returns Zod schema or undefined if not found
 */
export function getValidationSchema(schemaName: ValidationSchemaName): z.ZodSchema | undefined {
  return schemaRegistry.get(schemaName)
}

/**
 * Get all available schema names
 * @returns Array of available schema names
 */
export function getAvailableSchemas(): ValidationSchemaName[] {
  return Array.from(schemaRegistry.keys())
}

/**
 * Validate configuration data against a schema
 * @param schemaName - Name of the schema to use for validation
 * @param data - Data to validate
 * @returns Validation result with parsed data or errors
 */
export function validateWithSchema(schemaName: ValidationSchemaName, data: any): {
  success: boolean
  data?: any
  errors?: z.ZodError
} {
  const schema = getValidationSchema(schemaName)
  if (!schema) {
    throw new Error(`Schema not found: ${schemaName}`)
  }

  const result = schema.safeParse(data)
  return {
    success: result.success,
    data: result.success ? result.data : undefined,
    errors: result.success ? undefined : result.error
  }
}

/**
 * Sanitize input data by removing extra fields and applying transformations
 * @param schemaName - Name of the schema to use for sanitization
 * @param data - Raw data to sanitize
 * @returns Sanitized data that conforms to schema structure
 */
export function sanitizeData(schemaName: ValidationSchemaName, data: any): any {
  const schema = getValidationSchema(schemaName)
  if (!schema) {
    throw new Error(`Schema not found: ${schemaName}`)
  }

  try {
    // Parse and return only valid fields
    const parsed = schema.parse(data)
    return parsed
  } catch {
    // If parsing fails, return original data (validation will catch issues)
    return data
  }
}
