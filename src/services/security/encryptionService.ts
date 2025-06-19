/**
 * Enhanced Encryption Service
 * Provides AES-256-GCM encryption/decryption for sensitive configuration data
 * Uses user-specific keys with PBKDF2 key derivation and comprehensive security features
 */

// Browser-compatible crypto support using Web Crypto API
const crypto = (() => {
  // Node.js environment check first
  if (typeof process !== 'undefined' && process.versions && process.versions.node) {
    // Node.js environment - use node:crypto
    try {
      const nodeCrypto = require('crypto');
      if (nodeCrypto.webcrypto) {
        // Node.js 16+ with Web Crypto API
        return nodeCrypto.webcrypto;
      } else if (globalThis.crypto && globalThis.crypto.subtle) {
        // Fallback to global crypto if available
        return globalThis.crypto;
      } else {
        // For older Node.js versions, we'll create a compatible interface
        console.warn('Web Crypto API not available in Node.js, creating fallback interface');
        return {
          subtle: {
            importKey: () => Promise.reject(new Error('Node.js crypto fallback not implemented')),
            deriveKey: () => Promise.reject(new Error('Node.js crypto fallback not implemented')),
            encrypt: () => Promise.reject(new Error('Node.js crypto fallback not implemented')),
            decrypt: () => Promise.reject(new Error('Node.js crypto fallback not implemented'))
          },
          getRandomValues: (array: Uint8Array) => {
            const nodeBuffer = nodeCrypto.randomBytes(array.length);
            array.set(nodeBuffer);
            return array;
          }
        };
      }
    } catch (error) {
      console.warn('Node.js crypto module not available:', error);
    }
  }
  
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    // Browser environment
    return window.crypto
  } else if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.subtle) {
    // Modern environment with Web Crypto API
    return globalThis.crypto
  } else {
    // Fallback for unsupported environments - don't throw error during module loading
    console.warn('Web Crypto API not available. Encryption service will have limited functionality.');
    return {
      subtle: {
        importKey: () => Promise.reject(new Error('Web Crypto API not available')),
        deriveKey: () => Promise.reject(new Error('Web Crypto API not available')),
        encrypt: () => Promise.reject(new Error('Web Crypto API not available')),
        decrypt: () => Promise.reject(new Error('Web Crypto API not available'))
      },
      getRandomValues: (array: Uint8Array) => {
        // Fallback random values
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      }
    };
  }
})()

// Base encryption key for key derivation (in production, this should be set via environment config)
const getBaseEncryptionKey = (): string => {
  // In browser environment, we'll use a combination of origin and a default key
  // In production, this should be configured through your app's configuration system
  if (typeof window !== 'undefined') {
    const origin = window.location?.origin || 'investra-ai-app'
    return `investra-ai-config-key-2024-${origin}-secure`
  }
  // For server-side rendering or Node.js environments
  return 'investra-ai-config-key-2024-secure-default'
}

const BASE_ENCRYPTION_KEY = getBaseEncryptionKey()

// Security constants
const PBKDF2_ITERATIONS = 100000 // OWASP recommended minimum
const SALT_LENGTH = 32 // 256 bits
const IV_LENGTH = 12 // 96 bits for AES-GCM

/**
 * Interfaces for encryption operations
 */
export interface EncryptedData {
  data: string
  salt: string
  iv: string
  version: string
}

export interface EncryptionConfig {
  iterations: number
  keyLength: number
  algorithm: string
}

export interface EncryptionResult {
  encryptedData: string
  success: boolean
  error?: string
  warning?: string
}

export interface DecryptionResult {
  decryptedData: string
  success: boolean
  error?: string
  warning?: string
}

/**
 * Convert string to ArrayBuffer for crypto operations
 */
function stringToArrayBuffer(str: string): ArrayBuffer {
  const encoder = new TextEncoder()
  return encoder.encode(str)
}

/**
 * Convert ArrayBuffer to string
 */
function arrayBufferToString(buffer: ArrayBuffer): string {
  const decoder = new TextDecoder()
  return decoder.decode(buffer)
}

/**
 * Convert ArrayBuffer to Base64 string for storage (browser-compatible)
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

/**
 * Convert Base64 string back to ArrayBuffer (browser-compatible)
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

/**
 * Generate a cryptographically secure salt
 */
function generateSalt(): Uint8Array {
  // Use crypto.getRandomValues if available, otherwise fallback to Math.random
  if (crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint8Array(SALT_LENGTH))
  } else {
    // Fallback for environments without crypto.getRandomValues
    const array = new Uint8Array(SALT_LENGTH)
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
    return array
  }
}

/**
 * Derive encryption key using PBKDF2 with user-specific salt
 */
async function deriveKey(userId: string, salt: Uint8Array): Promise<CryptoKey | null> {
  // Check if Web Crypto API is available before calling it
  if (!crypto.subtle) {
    console.warn('Web Crypto API not available for key derivation')
    return null
  }

  // Combine base key with user ID for user-specific keys
  const keyMaterial = stringToArrayBuffer(BASE_ENCRYPTION_KEY + userId)
  
  const baseKey = await crypto.subtle.importKey(
    'raw',
    keyMaterial,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Enhanced Encryption Service class
 */
export class EncryptionService {
  /**
   * Encrypt a value with user-specific key
   * @param plaintext - The string to encrypt
   * @param userId - User ID for key derivation
   * @returns Promise containing encrypted data
   */
  static async encryptValue(plaintext: string, userId: string): Promise<EncryptionResult> {
    try {
      if (!plaintext) {
        return {
          encryptedData: '',
          success: false,
          error: 'No data provided for encryption'
        }
      }

      if (!userId) {
        return {
          encryptedData: '',
          success: false,
          error: 'User ID required for encryption'
        }
      }

      // Check if Web Crypto API is available before calling any crypto functions
      if (!crypto.subtle) {
        console.warn('Web Crypto API not available, using development fallback (data stored unencrypted)')
        // In development mode without HTTPS, store data unencrypted but marked as such
        const fallbackData = {
          data: btoa(plaintext), // Simple base64 encoding for obfuscation
          salt: 'dev-salt',
          iv: 'dev-iv',
          version: '1.0-dev-fallback'
        }
        
        return {
          encryptedData: JSON.stringify(fallbackData),
          success: true,
          warning: 'Data stored with development fallback (not secure)'
        }
      }

      const salt = generateSalt()
      const iv = crypto.getRandomValues ? crypto.getRandomValues(new Uint8Array(IV_LENGTH)) : new Uint8Array(IV_LENGTH).map(() => Math.floor(Math.random() * 256))
      const key = await deriveKey(userId, salt)
      
      // If key derivation failed, use fallback
      if (!key) {
        console.warn('Key derivation failed, using development fallback')
        const fallbackData = {
          data: btoa(plaintext),
          salt: 'dev-salt',
          iv: 'dev-iv',
          version: '1.0-dev-fallback'
        }
        
        return {
          encryptedData: JSON.stringify(fallbackData),
          success: true,
          warning: 'Data stored with development fallback (not secure)'
        }
      }
      
      const data = stringToArrayBuffer(plaintext)

      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        data
      )

      const encryptedData: EncryptedData = {
        data: arrayBufferToBase64(encrypted),
        salt: arrayBufferToBase64(salt.buffer),
        iv: arrayBufferToBase64(iv.buffer),
        version: '1.0'
      }

      return {
        encryptedData: JSON.stringify(encryptedData),
        success: true
      }
    } catch (error) {
      console.error('Encryption error:', error)
      return {
        encryptedData: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown encryption error'
      }
    }
  }

  /**
   * Decrypt a value with user-specific key
   * @param encryptedDataString - The encrypted string to decrypt
   * @param userId - User ID for key derivation
   * @returns Promise containing decrypted plaintext
   */
  static async decryptValue(encryptedDataString: string, userId: string): Promise<DecryptionResult> {
    try {
      if (!encryptedDataString) {
        return {
          decryptedData: '',
          success: false,
          error: 'No encrypted data provided for decryption'
        }
      }

      if (!userId) {
        return {
          decryptedData: '',
          success: false,
          error: 'User ID required for decryption'
        }
      }

      let encryptedData: EncryptedData
      try {
        encryptedData = JSON.parse(encryptedDataString)
      } catch {
        return {
          decryptedData: '',
          success: false,
          error: 'Invalid encrypted data format'
        }
      }

      // Check for development fallback format
      if (encryptedData.version === '1.0-dev-fallback') {
        console.warn('Decrypting development fallback data (not secure)')
        try {
          const decrypted = atob(encryptedData.data)
          return {
            decryptedData: decrypted,
            success: true,
            warning: 'Data decrypted from development fallback (not secure)'
          }
        } catch {
          return {
            decryptedData: '',
            success: false,
            error: 'Failed to decode development fallback data'
          }
        }
      }

      if (!this.validateEncryptedFormat(encryptedData)) {
        return {
          decryptedData: '',
          success: false,
          error: 'Malformed encrypted data structure'
        }
      }

      // Check if Web Crypto API is available for real decryption
      if (!crypto.subtle) {
        return {
          decryptedData: '',
          success: false,
          error: 'Web Crypto API not available for decryption'
        }
      }

      const salt = new Uint8Array(base64ToArrayBuffer(encryptedData.salt))
      const iv = new Uint8Array(base64ToArrayBuffer(encryptedData.iv))
      const data = base64ToArrayBuffer(encryptedData.data)
      
      const key = await deriveKey(userId, salt)
      
      // If key derivation failed (Web Crypto API not available), return error
      if (!key) {
        return {
          decryptedData: '',
          success: false,
          error: 'Web Crypto API not available for decryption of encrypted data'
        }
      }

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        data
      )

      return {
        decryptedData: arrayBufferToString(decrypted),
        success: true
      }
    } catch (error) {
      console.error('Decryption error:', error)
      let errorMessage = 'Decryption failed - invalid data or key'
      
      if (error instanceof Error) {
        if (error.message.includes('operation failed') || error.message.includes('decrypt')) {
          errorMessage = 'Decryption failed - invalid data or key'
        } else {
          errorMessage = error.message
        }
      }
      
      return {
        decryptedData: '',
        success: false,
        error: errorMessage
      }
    }
  }

  /**
   * Generate a new salt for key derivation
   * @returns Base64 encoded salt
   */
  static generateSalt(): string {
    const salt = generateSalt()
    return arrayBufferToBase64(salt.buffer)
  }

  /**
   * Check if data is encrypted (JSON format with required fields)
   * @param data - The data to check
   * @returns boolean indicating if data appears encrypted
   */
  static isEncrypted(data: string): boolean {
    if (!data || typeof data !== 'string') return false
    
    try {
      const parsed = JSON.parse(data)
      if (parsed === null) return false
      return this.validateEncryptedFormat(parsed)
    } catch {
      return false
    }
  }

  /**
   * Validate encrypted data format
   * @param data - Parsed encrypted data object
   * @returns boolean indicating if format is valid
   */
  static validateEncryptedFormat(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.data === 'string' &&
      typeof data.salt === 'string' &&
      typeof data.iv === 'string' &&
      typeof data.version === 'string' &&
      data.data.length > 0 &&
      data.salt.length > 0 &&
      data.iv.length > 0
    )
  }

  /**
   * Safely encrypt only if data is not already encrypted
   * @param data - The data to potentially encrypt
   * @param userId - User ID for key derivation
   * @returns Promise containing encryption result
   */
  static async safeEncrypt(data: string, userId: string): Promise<EncryptionResult> {
    if (this.isEncrypted(data)) {
      return {
        encryptedData: data,
        success: true
      }
    }
    return this.encryptValue(data, userId)
  }

  /**
   * Safely decrypt only if data appears to be encrypted
   * @param data - The data to potentially decrypt
   * @param userId - User ID for key derivation
   * @returns Promise containing decryption result
   */
  static async safeDecrypt(data: string, userId: string): Promise<DecryptionResult> {
    if (!this.isEncrypted(data)) {
      return {
        decryptedData: data,
        success: true
      }
    }
    return this.decryptValue(data, userId)
  }

  /**
   * Get encryption configuration
   * @returns Current encryption configuration
   */
  static getConfig(): EncryptionConfig {
    return {
      iterations: PBKDF2_ITERATIONS,
      keyLength: 256,
      algorithm: 'AES-GCM'
    }
  }

  // Legacy methods for backward compatibility
  /**
   * @deprecated Use encryptValue with userId instead
   */
  static async encrypt(plaintext: string): Promise<EncryptionResult> {
    console.warn('EncryptionService.encrypt is deprecated. Use encryptValue with userId instead.')
    return this.encryptValue(plaintext, 'default-user')
  }

  /**
   * @deprecated Use decryptValue with userId instead
   */
  static async decrypt(encryptedBase64: string): Promise<DecryptionResult> {
    console.warn('EncryptionService.decrypt is deprecated. Use decryptValue with userId instead.')
    return this.decryptValue(encryptedBase64, 'default-user')
  }
}
