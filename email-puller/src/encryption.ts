/**
 * Simple encryption utilities for storing Gmail app passwords
 */

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'investra-email-key-change-in-production-32';
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypt a string (e.g., Gmail app password)
 */
export function encrypt(text: string): string {
  try {
    const iv = crypto.randomBytes(16);
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    throw new Error(`Encryption failed: ${error}`);
  }
}

/**
 * Decrypt a string
 */
export function decrypt(encryptedText: string): string {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted text format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error}`);
  }
}

/**
 * Simple hash function for email message IDs
 */
export function hashMessageId(messageId: string): string {
  return crypto.createHash('sha256').update(messageId).digest('hex').substring(0, 16);
}

/**
 * Validate that a string can be decrypted (for testing encrypted passwords)
 */
export function validateEncryption(encryptedText: string): boolean {
  try {
    decrypt(encryptedText);
    return true;
  } catch {
    return false;
  }
}