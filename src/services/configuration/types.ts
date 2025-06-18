/**
 * Configuration Service Types
 * Defines all interfaces and types for configuration validation and management
 */

// Validation Types
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
  warnings: ValidationWarning[]
  sanitizedData?: any
}

export interface ValidationError {
  field: string
  message: string
  code: string
  severity: 'error' | 'critical'
}

export interface ValidationWarning {
  field: string
  message: string
  code: string
  suggestion?: string
}

// Connection Testing Types
export interface ConnectionTestResult {
  success: boolean
  message: string
  details?: any
  responseTime?: number
  timestamp: string
}

export interface ConnectionTestOptions {
  timeoutMs?: number
  retries?: number
  validateSSL?: boolean
}

// Configuration Data Types
export interface ConfigurationData {
  [key: string]: ConfigurationValue
}

export interface ConfigurationValue {
  value: any
  isEncrypted: boolean
  isSensitive: boolean
  dataType: 'string' | 'number' | 'boolean' | 'json' | 'url' | 'password' | 'email'
  lastUpdated: string
  version?: number
}

// Configuration Management Types
export interface ConfigurationHistory {
  id: string
  category: string
  changes: ConfigurationChange[]
  timestamp: string
  changeReason?: string
  userId: string
}

export interface ConfigurationChange {
  field: string
  oldValue: any
  newValue: any
  operation: 'create' | 'update' | 'delete'
}

// Export/Import Types
export interface ExportData {
  version: string
  exportDate: string
  userId: string
  configurations: { [category: string]: ConfigurationData }
  metadata: ExportMetadata
}

export interface ExportMetadata {
  appVersion: string
  exportedCategories: string[]
  totalConfigurations: number
  containsSensitiveData: boolean
}

export interface ImportResult {
  success: boolean
  importedCategories: string[]
  skippedCategories: string[]
  errors: ImportError[]
  warnings: string[]
  totalImported: number
}

export interface ImportError {
  category: string
  field?: string
  message: string
  severity: 'error' | 'warning'
}

// Cache Types
export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
  key: string
}

export interface CacheStatistics {
  hits: number
  misses: number
  size: number
  hitRate: number
  totalOperations: number
}

// Service Configuration Categories
export type ConfigurationCategory = 
  | 'email' 
  | 'ai_services' 
  | 'database' 
  | 'monitoring' 
  | 'security'
  | 'notifications'
  | 'integrations'

// Email Configuration Types
export interface EmailConfiguration {
  host: string
  port: number
  secure: boolean
  username: string
  password: string
  provider: 'gmail' | 'outlook' | 'yahoo' | 'imap' | 'other'
  authType: 'password' | 'oauth' | 'app_password'
  folders: {
    inbox: string
    sent: string
    drafts: string
    trash: string
  }
  settings: EmailSettings
}

export interface EmailSettings {
  autoSync: boolean
  syncInterval: number
  maxEmailsPerSync: number
  enablePushNotifications: boolean
  markAsReadOnSync: boolean
}

// AI Services Configuration Types
export interface AIServicesConfiguration {
  googleAI: {
    apiKey: string
    model: string
    maxTokens: number
    temperature: number
    enabled: boolean
  }
  openAI?: {
    apiKey: string
    model: string
    maxTokens: number
    temperature: number
    enabled: boolean
  }
  settings: {
    defaultProvider: 'google' | 'openai'
    fallbackEnabled: boolean
    rateLimitPerMinute: number
  }
}

// Database Configuration Types
export interface DatabaseConfiguration {
  supabase: {
    url: string
    anonKey: string
    serviceKey?: string
    enabled: boolean
  }
  settings: {
    connectionPoolSize: number
    queryTimeout: number
    enableRealtime: boolean
    enableLogging: boolean
  }
}

// Monitoring Configuration Types
export interface MonitoringConfiguration {
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error'
    enableConsole: boolean
    enableRemote: boolean
    remoteEndpoint?: string
  }
  metrics: {
    enabled: boolean
    collectInterval: number
    endpoint?: string
  }
  alerts: {
    enabled: boolean
    emailNotifications: boolean
    slackWebhook?: string
  }
}

// Security Configuration Types
export interface SecurityConfiguration {
  encryption: {
    enabled: boolean
    algorithm: string
    keyRotationDays: number
  }
  authentication: {
    sessionTimeout: number
    requireTwoFactor: boolean
    allowedDomains: string[]
  }
  rateLimiting: {
    enabled: boolean
    requestsPerMinute: number
    burstLimit: number
  }
}

// Validation Schema Names
export type ValidationSchemaName = 
  | 'email-configuration'
  | 'ai-services-configuration' 
  | 'database-configuration'
  | 'monitoring-configuration'
  | 'security-configuration'

// Service Response Types
export interface ServiceResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

export interface ServiceListResponse<T> {
  data: T[]
  error: string | null
  success: boolean
  count?: number
  total?: number
}
