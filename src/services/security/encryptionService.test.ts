/**
 * Comprehensive unit tests for the Enhanced Encryption Service
 * Tests all encryption/decryption scenarios, edge cases, and security features
 */

import { EncryptionService } from './encryptionService'
import type { EncryptionResult, DecryptionResult } from './encryptionService'

describe('EncryptionService', () => {
  const testUserId = 'test-user-123'
  const testData = 'sensitive-password-123'
  const longTestData = 'a'.repeat(10000) // Test large data
  const emptyData = ''
  const nullData = null as any
  const undefinedData = undefined as any

  beforeEach(() => {
    // Reset any global state if needed
  })

  afterEach(() => {
    // Cleanup if needed
  })

  describe('encryptValue', () => {
    it('should successfully encrypt valid data with valid user ID', async () => {
      const result = await EncryptionService.encryptValue(testData, testUserId)
      
      expect(result.success).toBe(true)
      expect(result.encryptedData).toBeDefined()
      expect(result.encryptedData.length).toBeGreaterThan(0)
      expect(result.error).toBeUndefined()
      
      // Verify it's valid JSON with expected structure
      const parsed = JSON.parse(result.encryptedData)
      expect(parsed).toHaveProperty('data')
      expect(parsed).toHaveProperty('salt')
      expect(parsed).toHaveProperty('iv')
      expect(parsed).toHaveProperty('version')
    })

    it('should encrypt large data successfully', async () => {
      const result = await EncryptionService.encryptValue(longTestData, testUserId)
      
      expect(result.success).toBe(true)
      expect(result.encryptedData).toBeDefined()
    })

    it('should fail with empty data', async () => {
      const result = await EncryptionService.encryptValue(emptyData, testUserId)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('No data provided')
    })

    it('should fail with missing user ID', async () => {
      const result = await EncryptionService.encryptValue(testData, '')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('User ID required')
    })

    it('should handle null/undefined inputs gracefully', async () => {
      const resultNull = await EncryptionService.encryptValue(nullData, testUserId)
      const resultUndefined = await EncryptionService.encryptValue(undefinedData, testUserId)
      
      expect(resultNull.success).toBe(false)
      expect(resultUndefined.success).toBe(false)
    })

    it('should generate different encryptions for same data (unique IVs)', async () => {
      const result1 = await EncryptionService.encryptValue(testData, testUserId)
      const result2 = await EncryptionService.encryptValue(testData, testUserId)
      
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result1.encryptedData).not.toBe(result2.encryptedData)
    })

    it('should generate different encryptions for different users', async () => {
      const result1 = await EncryptionService.encryptValue(testData, 'user1')
      const result2 = await EncryptionService.encryptValue(testData, 'user2')
      
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result1.encryptedData).not.toBe(result2.encryptedData)
    })
  })

  describe('decryptValue', () => {
    it('should successfully decrypt data encrypted with same user ID', async () => {
      const encryptResult = await EncryptionService.encryptValue(testData, testUserId)
      expect(encryptResult.success).toBe(true)
      
      const decryptResult = await EncryptionService.decryptValue(encryptResult.encryptedData, testUserId)
      
      expect(decryptResult.success).toBe(true)
      expect(decryptResult.decryptedData).toBe(testData)
      expect(decryptResult.error).toBeUndefined()
    })

    it('should decrypt large data correctly', async () => {
      const encryptResult = await EncryptionService.encryptValue(longTestData, testUserId)
      const decryptResult = await EncryptionService.decryptValue(encryptResult.encryptedData, testUserId)
      
      expect(decryptResult.success).toBe(true)
      expect(decryptResult.decryptedData).toBe(longTestData)
    })

    it('should fail to decrypt with wrong user ID', async () => {
      const encryptResult = await EncryptionService.encryptValue(testData, testUserId)
      const decryptResult = await EncryptionService.decryptValue(encryptResult.encryptedData, 'wrong-user')
      
      expect(decryptResult.success).toBe(false)
      expect(decryptResult.error).toContain('Decryption failed')
    })

    it('should fail with empty encrypted data', async () => {
      const result = await EncryptionService.decryptValue('', testUserId)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('No encrypted data provided')
    })

    it('should fail with missing user ID', async () => {
      const encryptResult = await EncryptionService.encryptValue(testData, testUserId)
      const result = await EncryptionService.decryptValue(encryptResult.encryptedData, '')
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('User ID required')
    })

    it('should fail with invalid JSON format', async () => {
      const result = await EncryptionService.decryptValue('invalid-json', testUserId)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid encrypted data format')
    })

    it('should fail with malformed encrypted data structure', async () => {
      const malformedData = JSON.stringify({ data: 'test', missing: 'fields' })
      const result = await EncryptionService.decryptValue(malformedData, testUserId)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Malformed encrypted data structure')
    })

    it('should fail with corrupted encrypted data', async () => {
      const validEncryption = await EncryptionService.encryptValue(testData, testUserId)
      const parsed = JSON.parse(validEncryption.encryptedData)
      parsed.data = 'corrupted-base64-data-!!!'
      const corruptedData = JSON.stringify(parsed)
      
      const result = await EncryptionService.decryptValue(corruptedData, testUserId)
      
      expect(result.success).toBe(false)
      expect(result.error).toContain('Decryption failed')
    })
  })

  describe('isEncrypted', () => {
    it('should correctly identify encrypted data', async () => {
      const encryptResult = await EncryptionService.encryptValue(testData, testUserId)
      
      expect(EncryptionService.isEncrypted(encryptResult.encryptedData)).toBe(true)
    })

    it('should correctly identify non-encrypted data', () => {
      expect(EncryptionService.isEncrypted('plain-text')).toBe(false)
      expect(EncryptionService.isEncrypted('123456')).toBe(false)
      expect(EncryptionService.isEncrypted('')).toBe(false)
    })

    it('should handle invalid JSON gracefully', () => {
      expect(EncryptionService.isEncrypted('invalid-json{')).toBe(false)
      expect(EncryptionService.isEncrypted('null')).toBe(false)
    })

    it('should handle null/undefined inputs', () => {
      expect(EncryptionService.isEncrypted(null as any)).toBe(false)
      expect(EncryptionService.isEncrypted(undefined as any)).toBe(false)
    })
  })

  describe('validateEncryptedFormat', () => {
    it('should validate correct encrypted format', () => {
      const validData = {
        data: 'base64-data',
        salt: 'base64-salt',
        iv: 'base64-iv',
        version: '1.0'
      }
      
      expect(EncryptionService.validateEncryptedFormat(validData)).toBe(true)
    })

    it('should reject incomplete encrypted format', () => {
      const incompleteData = {
        data: 'base64-data',
        salt: 'base64-salt'
        // missing iv and version
      }
      
      expect(EncryptionService.validateEncryptedFormat(incompleteData)).toBe(false)
    })

    it('should reject wrong data types', () => {
      const wrongTypes = {
        data: 123,
        salt: 'base64-salt',
        iv: 'base64-iv',
        version: '1.0'
      }
      
      expect(EncryptionService.validateEncryptedFormat(wrongTypes)).toBe(false)
    })

    it('should reject empty strings', () => {
      const emptyStrings = {
        data: '',
        salt: 'base64-salt',
        iv: 'base64-iv',
        version: '1.0'
      }
      
      expect(EncryptionService.validateEncryptedFormat(emptyStrings)).toBe(false)
    })
  })

  describe('safeEncrypt', () => {
    it('should encrypt unencrypted data', async () => {
      const result = await EncryptionService.safeEncrypt(testData, testUserId)
      
      expect(result.success).toBe(true)
      expect(EncryptionService.isEncrypted(result.encryptedData)).toBe(true)
    })

    it('should return already encrypted data unchanged', async () => {
      const firstEncrypt = await EncryptionService.encryptValue(testData, testUserId)
      const secondEncrypt = await EncryptionService.safeEncrypt(firstEncrypt.encryptedData, testUserId)
      
      expect(secondEncrypt.success).toBe(true)
      expect(secondEncrypt.encryptedData).toBe(firstEncrypt.encryptedData)
    })
  })

  describe('safeDecrypt', () => {
    it('should decrypt encrypted data', async () => {
      const encrypted = await EncryptionService.encryptValue(testData, testUserId)
      const result = await EncryptionService.safeDecrypt(encrypted.encryptedData, testUserId)
      
      expect(result.success).toBe(true)
      expect(result.decryptedData).toBe(testData)
    })

    it('should return unencrypted data unchanged', async () => {
      const result = await EncryptionService.safeDecrypt(testData, testUserId)
      
      expect(result.success).toBe(true)
      expect(result.decryptedData).toBe(testData)
    })
  })

  describe('generateSalt', () => {
    it('should generate base64 encoded salt', () => {
      const salt = EncryptionService.generateSalt()
      
      expect(typeof salt).toBe('string')
      expect(salt.length).toBeGreaterThan(0)
      
      // Should be valid base64
      expect(() => atob(salt)).not.toThrow()
    })

    it('should generate different salts each time', () => {
      const salt1 = EncryptionService.generateSalt()
      const salt2 = EncryptionService.generateSalt()
      
      expect(salt1).not.toBe(salt2)
    })
  })

  describe('getConfig', () => {
    it('should return valid encryption configuration', () => {
      const config = EncryptionService.getConfig()
      
      expect(config).toHaveProperty('iterations')
      expect(config).toHaveProperty('keyLength')
      expect(config).toHaveProperty('algorithm')
      expect(config.iterations).toBeGreaterThan(0)
      expect(config.keyLength).toBe(256)
      expect(config.algorithm).toBe('AES-GCM')
    })
  })

  describe('legacy methods (deprecated)', () => {
    it('should encrypt with legacy encrypt method', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const result = await EncryptionService.encrypt(testData)
      
      expect(result.success).toBe(true)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('deprecated'))
      
      consoleSpy.mockRestore()
    })

    it('should decrypt with legacy decrypt method', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const encrypted = await EncryptionService.encrypt(testData)
      const result = await EncryptionService.decrypt(encrypted.encryptedData)
      
      expect(result.success).toBe(true)
      expect(result.decryptedData).toBe(testData)
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('deprecated'))
      
      consoleSpy.mockRestore()
    })
  })

  describe('performance tests', () => {
    it('should encrypt/decrypt within acceptable time limits', async () => {
      const startTime = Date.now()
      
      const encrypted = await EncryptionService.encryptValue(testData, testUserId)
      const decrypted = await EncryptionService.decryptValue(encrypted.encryptedData, testUserId)
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      expect(encrypted.success).toBe(true)
      expect(decrypted.success).toBe(true)
      expect(duration).toBeLessThan(1000) // Should complete in less than 1 second
    })

    it('should handle multiple concurrent operations', async () => {
      const promises = Array.from({ length: 10 }, (_, i) => 
        EncryptionService.encryptValue(`test-data-${i}`, `user-${i}`)
      )
      
      const results = await Promise.all(promises)
      
      results.forEach((result, i) => {
        expect(result.success).toBe(true)
        expect(result.encryptedData).toBeDefined()
      })
      
      // Verify all results are different
      const encryptedData = results.map(r => r.encryptedData)
      const uniqueData = new Set(encryptedData)
      expect(uniqueData.size).toBe(encryptedData.length)
    })
  })

  describe('security tests', () => {
    it('should not reveal plaintext in error messages', async () => {
      const sensitiveData = 'super-secret-password-123'
      
      // Try decrypting with wrong user
      const encrypted = await EncryptionService.encryptValue(sensitiveData, testUserId)
      const decryptResult = await EncryptionService.decryptValue(encrypted.encryptedData, 'wrong-user')
      
      expect(decryptResult.success).toBe(false)
      expect(decryptResult.error).toBeDefined()
      expect(decryptResult.error).not.toContain(sensitiveData)
    })

    it('should produce different results for same input (semantic security)', async () => {
      const results = await Promise.all([
        EncryptionService.encryptValue(testData, testUserId),
        EncryptionService.encryptValue(testData, testUserId),
        EncryptionService.encryptValue(testData, testUserId)
      ])
      
      results.forEach(result => expect(result.success).toBe(true))
      
      const encryptedValues = results.map(r => r.encryptedData)
      const uniqueValues = new Set(encryptedValues)
      expect(uniqueValues.size).toBe(3) // All should be different
    })
  })
})

// Import vi for mocking in the test that needs it
import { vi } from 'vitest'
