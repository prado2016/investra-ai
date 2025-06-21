/**
 * Configuration management for the email puller
 */

import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export interface EmailPullerConfig {
  // Supabase configuration
  supabaseUrl: string;
  supabaseKey: string;
  
  // IMAP configuration
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  
  // Gmail credentials (will be loaded from database per user)
  defaultGmailEmail?: string;
  defaultGmailPassword?: string;
  
  // Sync configuration
  syncIntervalMinutes: number;
  maxEmailsPerSync: number;
  
  // Logging
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  // Runtime configuration
  runOnce: boolean;
  enableScheduler: boolean;
}

export const config: EmailPullerConfig = {
  // Supabase
  supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
  supabaseKey: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  
  // IMAP settings
  imapHost: process.env.IMAP_HOST || 'imap.gmail.com',
  imapPort: parseInt(process.env.IMAP_PORT || '993'),
  imapSecure: process.env.IMAP_SECURE !== 'false',
  
  // Default Gmail credentials (optional - usually loaded from database)
  defaultGmailEmail: process.env.IMAP_USERNAME,
  defaultGmailPassword: process.env.IMAP_PASSWORD,
  
  // Sync settings
  syncIntervalMinutes: parseInt(process.env.SYNC_INTERVAL_MINUTES || '30'),
  maxEmailsPerSync: parseInt(process.env.MAX_EMAILS_PER_SYNC || '50'),
  
  // Logging
  enableLogging: process.env.ENABLE_LOGGING !== 'false',
  logLevel: (process.env.LOG_LEVEL as any) || 'info',
  
  // Runtime
  runOnce: process.env.RUN_ONCE === 'true',
  enableScheduler: process.env.ENABLE_SCHEDULER !== 'false'
};

// Validation
export function validateConfig(): string[] {
  const errors: string[] = [];
  
  if (!config.supabaseUrl) {
    errors.push('SUPABASE_URL or VITE_SUPABASE_URL is required');
  }
  
  if (!config.supabaseKey) {
    errors.push('SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY is required');
  }
  
  if (!config.imapHost) {
    errors.push('IMAP_HOST is required');
  }
  
  if (config.imapPort <= 0 || config.imapPort > 65535) {
    errors.push('IMAP_PORT must be between 1 and 65535');
  }
  
  if (config.syncIntervalMinutes < 1) {
    errors.push('SYNC_INTERVAL_MINUTES must be at least 1');
  }
  
  if (config.maxEmailsPerSync < 1) {
    errors.push('MAX_EMAILS_PER_SYNC must be at least 1');
  }
  
  return errors;
}

// Export environment for external access
export const env = process.env;