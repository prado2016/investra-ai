/**
 * Encryption Service
 * Provides symmetric encryption/decryption for sensitive configuration data
 * Uses browser-compatible crypto APIs with AES-GCM encryption
 */

// Define key for encryption (in production, this should come from a secure key management system)
const ENCRYPTION_KEY_STRING = 'investra-ai-config-key-2024-secure'

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
 * Generate a consistent key from a string
 */
async function getKey(): Promise<CryptoKey> {
  const keyData = stringToArrayBuffer(ENCRYPTION_KEY_STRING)
  const hash = await crypto.subtle.digest('SHA-256', keyData)
  
  return crypto.subtle.importKey(
    'raw',
    hash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  )
}

/**
 * Convert ArrayBuffer to Base64 string for storage
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
 * Convert Base64 string back to ArrayBuffer
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes.buffer
}

export interface EncryptionResult {
  encryptedData: string
  success: boolean
  error?: string
}

export interface DecryptionResult {
  decryptedData: string
  success: boolean
  error?: string
}

/**
 * Encryption Service class
 */
export class EncryptionService {
  /**
   * Encrypt a string value
   * @param plaintext - The string to encrypt
   * @returns Promise containing encrypted data as base64 string
   */
  static async encrypt(plaintext: string): Promise<EncryptionResult> {
    try {
      if (!plaintext) {
        return {
          encryptedData: '',
          success: false,
          error: 'No data provided for encryption'
        }
      }

      const key = await getKey()
      const iv = crypto.getRandomValues(new Uint8Array(12)) // 96-bit IV for AES-GCM
      const data = stringToArrayBuffer(plaintext)

      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        data
      )

      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength)
      combined.set(iv)
      combined.set(new Uint8Array(encrypted), iv.length)

      return {
        encryptedData: arrayBufferToBase64(combined.buffer),
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
   * Decrypt a string value
   * @param encryptedBase64 - The base64 encrypted string to decrypt
   * @returns Promise containing decrypted plaintext
   */
  static async decrypt(encryptedBase64: string): Promise<DecryptionResult> {
    try {
      if (!encryptedBase64) {
        return {
          decryptedData: '',
          success: false,
          error: 'No encrypted data provided for decryption'
        }
      }

      const key = await getKey()
      const combined = base64ToArrayBuffer(encryptedBase64)
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12) // First 12 bytes are IV
      const encrypted = combined.slice(12) // Rest is encrypted data

      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encrypted
      )

      return {
        decryptedData: arrayBufferToString(decrypted),
        success: true
      }
    } catch (error) {
      console.error('Decryption error:', error)
      return {
        decryptedData: '',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown decryption error'
      }
    }
  }

  /**
   * Check if data appears to be encrypted (base64 format)
   * @param data - The data to check
   * @returns boolean indicating if data appears encrypted
   */
  static isEncrypted(data: string): boolean {
    if (!data || typeof data !== 'string') return false
    
    // Check if it's base64 format and has reasonable length for encrypted data
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
    return base64Regex.test(data) && data.length > 20 // Minimum length for IV + some data
  }

  /**
   * Safely encrypt only if data is not already encrypted
   * @param data - The data to potentially encrypt
   * @returns Promise containing encryption result
   */
  static async safeEncrypt(data: string): Promise<EncryptionResult> {
    if (this.isEncrypted(data)) {
      return {
        encryptedData: data,
        success: true
      }
    }
    return this.encrypt(data)
  }

  /**
   * Safely decrypt only if data appears to be encrypted
   * @param data - The data to potentially decrypt
   * @returns Promise containing decryption result
   */
  static async safeDecrypt(data: string): Promise<DecryptionResult> {
    if (!this.isEncrypted(data)) {
      return {
        decryptedData: data,
        success: true
      }
    }
    return this.decrypt(data)
  }
}
