/**
 * Browser-compatible Encryption Service Test
 * Simple test function that can be run in the browser console or React app
 */

import { EncryptionService } from './encryptionService';

export async function testEncryptionService(): Promise<void> {
  console.log('🧪 Starting Encryption Service Browser Tests...');
  
  const testUserId = 'test-user-123';
  const testData = 'sensitive-password-data';
  let testsPassed = 0;
  let testsTotal = 0;

  // Helper function to run a test
  const runTest = async (testName: string, testFn: () => Promise<boolean> | boolean): Promise<void> => {
    testsTotal++;
    try {
      const result = await testFn();
      if (result) {
        console.log(`✅ ${testName}`);
        testsPassed++;
      } else {
        console.error(`❌ ${testName} - Test failed`);
      }
    } catch (error) {
      console.error(`❌ ${testName} - Error:`, error);
    }
  };

  // Test 1: Basic encryption and decryption
  await runTest('Basic encryption and decryption', async () => {
    const encryptResult = await EncryptionService.encryptValue(testData, testUserId);
    if (!encryptResult.success) return false;
    
    const decryptResult = await EncryptionService.decryptValue(encryptResult.encryptedData, testUserId);
    return decryptResult.success && decryptResult.decryptedData === testData;
  });

  // Test 2: Empty data handling
  await runTest('Empty data handling', async () => {
    const encryptResult = await EncryptionService.encryptValue('', testUserId);
    return !encryptResult.success && encryptResult.error?.includes('No data provided');
  });

  // Test 3: Missing user ID handling
  await runTest('Missing user ID handling', async () => {
    const encryptResult = await EncryptionService.encryptValue(testData, '');
    return !encryptResult.success && encryptResult.error?.includes('User ID required');
  });

  // Test 4: Encrypted data detection
  await runTest('Encrypted data detection', async () => {
    const encryptResult = await EncryptionService.encryptValue(testData, testUserId);
    if (!encryptResult.success) return false;
    
    const isEncrypted = EncryptionService.isEncrypted(encryptResult.encryptedData);
    const isPlainText = EncryptionService.isEncrypted(testData);
    
    return isEncrypted && !isPlainText;
  });

  // Test 5: Safe encrypt/decrypt operations
  await runTest('Safe encrypt/decrypt operations', async () => {
    // Safe encrypt plain text
    const safeEncryptResult = await EncryptionService.safeEncrypt(testData, testUserId);
    if (!safeEncryptResult.success) return false;
    
    // Safe encrypt already encrypted data (should not double-encrypt)
    const doubleEncryptResult = await EncryptionService.safeEncrypt(safeEncryptResult.encryptedData, testUserId);
    if (!doubleEncryptResult.success || doubleEncryptResult.encryptedData !== safeEncryptResult.encryptedData) return false;
    
    // Safe decrypt encrypted data
    const safeDecryptResult = await EncryptionService.safeDecrypt(safeEncryptResult.encryptedData, testUserId);
    if (!safeDecryptResult.success || safeDecryptResult.decryptedData !== testData) return false;
    
    // Safe decrypt plain text (should return as-is)
    const plainDecryptResult = await EncryptionService.safeDecrypt(testData, testUserId);
    return plainDecryptResult.success && plainDecryptResult.decryptedData === testData;
  });

  // Test 6: Wrong user ID should fail decryption
  await runTest('Wrong user ID decryption failure', async () => {
    const encryptResult = await EncryptionService.encryptValue(testData, testUserId);
    if (!encryptResult.success) return false;
    
    const decryptResult = await EncryptionService.decryptValue(encryptResult.encryptedData, 'wrong-user-id');
    return !decryptResult.success && decryptResult.error?.includes('Decryption failed');
  });

  // Test 7: Malformed data handling
  await runTest('Malformed data handling', async () => {
    const decryptResult = await EncryptionService.decryptValue('not-valid-json', testUserId);
    return !decryptResult.success && decryptResult.error?.includes('Invalid encrypted data format');
  });

  // Test 8: Configuration retrieval
  await runTest('Configuration retrieval', () => {
    const config = EncryptionService.getConfig();
    return config.iterations === 100000 && 
           config.keyLength === 256 && 
           config.algorithm === 'AES-GCM';
  });

  // Test 9: Salt generation
  await runTest('Salt generation', () => {
    const salt1 = EncryptionService.generateSalt();
    const salt2 = EncryptionService.generateSalt();
    
    return typeof salt1 === 'string' && 
           typeof salt2 === 'string' && 
           salt1 !== salt2 && 
           salt1.length > 0 && 
           salt2.length > 0;
  });

  // Test 10: Unique encryption outputs
  await runTest('Unique encryption outputs', async () => {
    const encrypt1 = await EncryptionService.encryptValue(testData, testUserId);
    const encrypt2 = await EncryptionService.encryptValue(testData, testUserId);
    
    if (!encrypt1.success || !encrypt2.success) return false;
    
    // Different encrypted outputs
    if (encrypt1.encryptedData === encrypt2.encryptedData) return false;
    
    // But both decrypt to same original data
    const decrypt1 = await EncryptionService.decryptValue(encrypt1.encryptedData, testUserId);
    const decrypt2 = await EncryptionService.decryptValue(encrypt2.encryptedData, testUserId);
    
    return decrypt1.success && decrypt2.success && 
           decrypt1.decryptedData === testData && 
           decrypt2.decryptedData === testData;
  });

  // Test 11: User-specific encryption keys
  await runTest('User-specific encryption keys', async () => {
    const user1 = 'user-1';
    const user2 = 'user-2';
    
    const encrypt1 = await EncryptionService.encryptValue(testData, user1);
    const encrypt2 = await EncryptionService.encryptValue(testData, user2);
    
    if (!encrypt1.success || !encrypt2.success) return false;
    
    // Each user can decrypt their own data
    const decrypt1 = await EncryptionService.decryptValue(encrypt1.encryptedData, user1);
    const decrypt2 = await EncryptionService.decryptValue(encrypt2.encryptedData, user2);
    
    if (!decrypt1.success || !decrypt2.success) return false;
    if (decrypt1.decryptedData !== testData || decrypt2.decryptedData !== testData) return false;
    
    // User 1 cannot decrypt User 2's data
    const crossDecrypt = await EncryptionService.decryptValue(encrypt2.encryptedData, user1);
    return !crossDecrypt.success;
  });

  // Test 12: Long data handling
  await runTest('Long data handling', async () => {
    const longData = 'A'.repeat(10000);
    const encryptResult = await EncryptionService.encryptValue(longData, testUserId);
    if (!encryptResult.success) return false;
    
    const decryptResult = await EncryptionService.decryptValue(encryptResult.encryptedData, testUserId);
    return decryptResult.success && decryptResult.decryptedData === longData;
  });

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log(`✅ Passed: ${testsPassed}/${testsTotal}`);
  console.log(`❌ Failed: ${testsTotal - testsPassed}/${testsTotal}`);
  
  if (testsPassed === testsTotal) {
    console.log('🎉 All tests passed! Encryption service is working correctly in the browser.');
  } else {
    console.error('⚠️ Some tests failed. Please check the implementation.');
  }
  
  return;
}

// Auto-run tests if this file is imported
if (typeof window !== 'undefined') {
  // In browser environment, expose test function globally
  (window as any).testEncryptionService = testEncryptionService;
  console.log('🔧 Encryption service test available. Run testEncryptionService() in console to test.');
}
