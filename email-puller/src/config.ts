/**
 * Configuration management for the email puller
 * Loads essential Supabase credentials from .env, then loads rest from database
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

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
  
  // Email management
  processedFolderName: string;
  archiveAfterSync: boolean;
}

// Load essential credentials from environment (required for initial database connection)
const getEssentialConfig = () => {
  // Try database-stored environment variables first
  const supabaseUrl = process.env.SUPABASE_URL || '';
  const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
  
  console.log('🔧 Loading essential config from environment variables...');
  console.log(`📡 SUPABASE_URL: ${supabaseUrl ? '[SET]' : '[EMPTY]'}`);
  console.log(`🔑 SUPABASE_ANON_KEY: ${supabaseKey ? '[SET]' : '[EMPTY]'}`);
  
  return {
    supabaseUrl,
    supabaseKey
  };
};

// Load additional configuration from database
const loadDatabaseConfig = async (supabaseUrl: string, supabaseKey: string): Promise<Partial<EmailPullerConfig>> => {
  try {
    console.log('🗄️ Loading additional configuration from database...');
    
    const client = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await client
      .from('system_config')
      .select('config_key, config_value, config_type')
      .in('config_key', [
        'sync_interval_minutes',
        'max_emails_per_sync',
        'enable_logging',
        'log_level',
        'enable_scheduler',
        'archive_after_sync',
        'processed_folder_name',
        'imap_host',
        'imap_port',
        'imap_secure'
      ]);

    if (error) {
      console.error('❌ Error loading database config:', error);
      return {};
    }

    const dbConfig: any = {};
    data?.forEach(item => {
      let value: any = item.config_value;
      
      // Convert data types
      switch (item.config_type) {
        case 'number':
          value = parseFloat(value);
          break;
        case 'boolean':
          value = value.toLowerCase() === 'true';
          break;
        case 'json':
          try {
            value = JSON.parse(value);
          } catch {
            console.warn(`Invalid JSON in config ${item.config_key}`);
          }
          break;
      }
      
      // Map database keys to config object keys
      const keyMapping: Record<string, string> = {
        'sync_interval_minutes': 'syncIntervalMinutes',
        'max_emails_per_sync': 'maxEmailsPerSync',
        'enable_logging': 'enableLogging',
        'log_level': 'logLevel',
        'enable_scheduler': 'enableScheduler',
        'archive_after_sync': 'archiveAfterSync',
        'processed_folder_name': 'processedFolderName',
        'imap_host': 'imapHost',
        'imap_port': 'imapPort',
        'imap_secure': 'imapSecure'
      };
      
      const configKey = keyMapping[item.config_key] || item.config_key;
      dbConfig[configKey] = value;
    });

    console.log('✅ Loaded database configuration:', Object.keys(dbConfig));
    return dbConfig;
    
  } catch (error) {
    console.error('❌ Failed to load database config:', error);
    return {};
  }
};

// Initialize configuration with database fallback
const initializeConfig = async (): Promise<EmailPullerConfig> => {
  const essential = getEssentialConfig();
  
  // Default fallback configuration
  const defaultConfig: EmailPullerConfig = {
    // Essential Supabase credentials (from environment)
    supabaseUrl: essential.supabaseUrl,
    supabaseKey: essential.supabaseKey,
    
    // IMAP settings (defaults that can be overridden by database)
    imapHost: 'imap.gmail.com',
    imapPort: 993,
    imapSecure: true,
    
    // Default Gmail credentials (optional - usually loaded from database)
    defaultGmailEmail: process.env.IMAP_USERNAME,
    defaultGmailPassword: process.env.IMAP_PASSWORD,
    
    // Sync settings (defaults that can be overridden by database)
    syncIntervalMinutes: 30,
    maxEmailsPerSync: 50,
    
    // Logging (defaults that can be overridden by database)
    enableLogging: true,
    logLevel: 'info',
    
    // Runtime
    runOnce: process.env.RUN_ONCE === 'true',
    enableScheduler: true,
    
    // Email management (defaults that can be overridden by database)
    processedFolderName: 'Investra/Processed',
    archiveAfterSync: true
  };

  // If we have Supabase credentials, try to load additional config from database
  if (essential.supabaseUrl && essential.supabaseKey) {
    const dbConfig = await loadDatabaseConfig(essential.supabaseUrl, essential.supabaseKey);
    
    // Merge database config with defaults
    return {
      ...defaultConfig,
      ...dbConfig
    };
  } else {
    console.warn('⚠️ No Supabase credentials found, using default configuration');
    return defaultConfig;
  }
};

// Export a promise that resolves to the configuration
export const configPromise = initializeConfig();

// For backward compatibility, export a synchronous config object with defaults
export const config: EmailPullerConfig = {
  // Essential Supabase credentials (from environment)
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_ANON_KEY || '',
  
  // IMAP settings
  imapHost: 'imap.gmail.com',
  imapPort: 993,
  imapSecure: true,
  
  // Default Gmail credentials (optional - usually loaded from database)
  defaultGmailEmail: process.env.IMAP_USERNAME,
  defaultGmailPassword: process.env.IMAP_PASSWORD,
  
  // Sync settings
  syncIntervalMinutes: 30,
  maxEmailsPerSync: 50,
  
  // Logging
  enableLogging: true,
  logLevel: 'info',
  
  // Runtime
  runOnce: process.env.RUN_ONCE === 'true',
  enableScheduler: true,
  
  // Email management
  processedFolderName: 'Investra/Processed',
  archiveAfterSync: true
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