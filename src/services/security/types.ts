/**
 * TypeScript interfaces and types for the security/encryption services
 */

/**
 * Encrypted data structure stored in database
 */
export interface EncryptedData {
  /** Base64 encoded encrypted data */
  data: string
  /** Base64 encoded salt used for key derivation */
  salt: string
  /** Base64 encoded initialization vector */
  iv: string
  /** Encryption format version for backward compatibility */
  version: string
  /** Timestamp when data was encrypted */
  encrypted_at?: string
  /** Algorithm used for encryption */
  algorithm?: string
}

/**
 * Encryption configuration parameters
 */
export interface EncryptionConfig {
  /** PBKDF2 iterations for key derivation */
  iterations: number
  /** Key length in bits (256 for AES-256) */
  keyLength: number
  /** Encryption algorithm identifier */
  algorithm: string
  /** Salt length in bytes */
  saltLength?: number
  /** IV length in bytes */
  ivLength?: number
}

/**
 * Result of encryption operation
 */
export interface EncryptionResult {
  /** Encrypted data as JSON string */
  encryptedData: string
  /** Whether operation was successful */
  success: boolean
  /** Error message if operation failed */
  error?: string
  /** Additional metadata */
  metadata?: {
    algorithm: string
    version: string
    encrypted_at: string
  }
}

/**
 * Result of decryption operation
 */
export interface DecryptionResult {
  /** Decrypted plaintext data */
  decryptedData: string
  /** Whether operation was successful */
  success: boolean
  /** Error message if operation failed */
  error?: string
  /** Additional metadata from encryption */
  metadata?: {
    algorithm: string
    version: string
    encrypted_at?: string
  }
}

/**
 * Key derivation parameters
 */
export interface KeyDerivationParams {
  /** User ID for personalized key derivation */
  userId: string
  /** Salt for key derivation */
  salt: Uint8Array
  /** Number of PBKDF2 iterations */
  iterations: number
  /** Hash algorithm for PBKDF2 */
  hashAlgorithm: string
}

/**
 * Security audit log entry
 */
export interface SecurityAuditEntry {
  /** Unique identifier for audit entry */
  id: string
  /** User ID who performed the operation */
  userId: string
  /** Type of operation (encrypt, decrypt, key_rotation, etc.) */
  operation: 'encrypt' | 'decrypt' | 'key_rotation' | 'key_derivation' | 'validation'
  /** Whether operation was successful */
  success: boolean
  /** Error details if operation failed */
  error?: string
  /** Timestamp of operation */
  timestamp: string
  /** Additional metadata (without sensitive data) */
  metadata?: {
    algorithm?: string
    dataType?: string
    dataSize?: number
    ipAddress?: string
    userAgent?: string
  }
}

/**
 * Key rotation configuration
 */
export interface KeyRotationConfig {
  /** Whether automatic key rotation is enabled */
  enabled: boolean
  /** Rotation interval in days */
  intervalDays: number
  /** Maximum age of keys before forced rotation */
  maxKeyAgeDays: number
  /** Whether to keep old keys for decryption */
  keepOldKeys: boolean
  /** Number of old key versions to retain */
  oldKeyRetentionCount: number
}

/**
 * Encryption validation result
 */
export interface EncryptionValidationResult {
  /** Whether encryption data is valid */
  isValid: boolean
  /** Validation error messages */
  errors: string[]
  /** Warnings that don't prevent operation */
  warnings: string[]
  /** Detected encryption version */
  version?: string
  /** Detected algorithm */
  algorithm?: string
}

/**
 * Security configuration for encryption service
 */
export interface SecurityConfig {
  /** Encryption configuration */
  encryption: EncryptionConfig
  /** Key rotation configuration */
  keyRotation: KeyRotationConfig
  /** Whether to enable security audit logging */
  auditLogging: boolean
  /** Whether to validate encrypted data integrity */
  integrityValidation: boolean
  /** Maximum encryption operation timeout in milliseconds */
  operationTimeoutMs: number
}

/**
 * Error types for encryption operations
 */
export type EncryptionError = 
  | 'INVALID_INPUT'
  | 'MISSING_USER_ID'
  | 'KEY_DERIVATION_FAILED'
  | 'ENCRYPTION_FAILED'
  | 'DECRYPTION_FAILED'
  | 'INVALID_ENCRYPTED_FORMAT'
  | 'MALFORMED_DATA'
  | 'OPERATION_TIMEOUT'
  | 'UNKNOWN_ERROR'

/**
 * Data classification levels for encryption
 */
export type DataClassification = 
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted'
  | 'top_secret'

/**
 * Configuration value with encryption metadata
 */
export interface EncryptedConfigValue {
  /** The actual value (encrypted or plaintext) */
  value: string
  /** Whether this value is encrypted */
  isEncrypted: boolean
  /** Whether this value should be encrypted */
  shouldEncrypt: boolean
  /** Data classification level */
  classification: DataClassification
  /** When value was last updated */
  lastUpdated: string
  /** User who last updated the value */
  lastUpdatedBy: string
  /** Encryption metadata if applicable */
  encryptionMetadata?: {
    algorithm: string
    version: string
    encrypted_at: string
  }
}
