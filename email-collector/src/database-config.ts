/**
 * Database-driven configuration system for email-puller
 * Eliminates dependency on environment variables that can break
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger.js';
import crypto from 'crypto';

export interface SystemConfig {
  // Core settings
  emailEncryptionKey: string;
  syncIntervalMinutes: number;
  maxEmailsPerSync: number;
  
  // IMAP settings
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  
  // Logging
  enableLogging: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  
  // Runtime
  enableScheduler: boolean;
  archiveAfterSync: boolean;
  processedFolderName: string;
  
  // Monitoring
  syncRequestPollInterval: number;
  cleanupOldRequestsDays: number;
}

export class DatabaseConfig {
  private client: SupabaseClient;
  private config: SystemConfig | null = null;
  private configCache: Map<string, string | number | boolean | object> = new Map();

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.client = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Load all configuration from database
   */
  async loadConfig(): Promise<SystemConfig> {
    try {
      const { data, error } = await this.client
        .from('system_config')
        .select('config_key, config_value, config_type, is_encrypted');

      if (error) {
        logger.error('Failed to load system configuration:', error);
        throw error;
      }

      const configMap = new Map<string, string | number | boolean | object>();
      
      for (const row of data || []) {
        let value = row.config_value;
        
        // Handle different data types
        switch (row.config_type) {
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
              logger.warn(`Invalid JSON in config ${row.config_key}, using as string`);
            }
            break;
        }
        
        // For now, skip decryption since we need to set up the encryption properly
        // TODO: Implement proper encryption/decryption
        
        configMap.set(row.config_key, value);
      }

      // Generate encryption key if it doesn't exist or is default
      let encryptionKey = configMap.get('email_encryption_key');
      if (!encryptionKey || encryptionKey === 'auto_generated_on_first_run') {
        encryptionKey = crypto.randomBytes(32).toString('hex');
        await this.setConfig('email_encryption_key', encryptionKey);
        logger.info('Generated new encryption key for email passwords');
      }

      this.config = {
        emailEncryptionKey: encryptionKey,
        syncIntervalMinutes: configMap.get('sync_interval_minutes') || 30,
        maxEmailsPerSync: configMap.get('max_emails_per_sync') || 50,
        imapHost: configMap.get('imap_host') || 'imap.gmail.com',
        imapPort: configMap.get('imap_port') || 993,
        imapSecure: configMap.get('imap_secure') ?? true,
        enableLogging: configMap.get('enable_logging') ?? true,
        logLevel: (configMap.get('log_level') || 'info') as SystemConfig['logLevel'],
        enableScheduler: configMap.get('enable_scheduler') ?? true,
        archiveAfterSync: configMap.get('archive_after_sync') ?? true,
        processedFolderName: configMap.get('processed_folder_name') || 'Investra/Processed',
        syncRequestPollInterval: configMap.get('sync_request_poll_interval') || 10,
        cleanupOldRequestsDays: configMap.get('cleanup_old_requests_days') || 7
      };

      this.configCache = configMap;
      logger.info('System configuration loaded from database:', {
        syncInterval: this.config.syncIntervalMinutes,
        maxEmails: this.config.maxEmailsPerSync,
        scheduler: this.config.enableScheduler,
        logLevel: this.config.logLevel
      });
      
      return this.config;

    } catch (error) {
      logger.error('Error loading configuration from database:', error);
      
      // Return fallback configuration if database fails
      logger.warn('Using fallback configuration');
      this.config = this.getFallbackConfig();
      return this.config;
    }
  }

  /**
   * Fallback configuration if database is unavailable
   */
  private getFallbackConfig(): SystemConfig {
    return {
      emailEncryptionKey: crypto.randomBytes(32).toString('hex'),
      syncIntervalMinutes: 30,
      maxEmailsPerSync: 50,
      imapHost: 'imap.gmail.com',
      imapPort: 993,
      imapSecure: true,
      enableLogging: true,
      logLevel: 'info',
      enableScheduler: true,
      archiveAfterSync: true,
      processedFolderName: 'Investra/Processed',
      syncRequestPollInterval: 10,
      cleanupOldRequestsDays: 7
    };
  }

  /**
   * Get current configuration (cached)
   */
  getConfig(): SystemConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * Set a configuration value
   */
  async setConfig(key: string, value: string | number | boolean | object, encrypted: boolean = false): Promise<void> {
    try {
      let configType = 'string';
      if (typeof value === 'number') configType = 'number';
      else if (typeof value === 'boolean') configType = 'boolean';
      else if (typeof value === 'object') configType = 'json';

      const processedValue = configType === 'json' ? JSON.stringify(value) : value.toString();
      
      const { error } = await this.client
        .from('system_config')
        .upsert({
          config_key: key,
          config_value: processedValue,
          config_type: configType,
          is_encrypted: encrypted,
          updated_at: new Date().toISOString()
        });

      if (error) {
        logger.error(`Failed to set config ${key}:`, error);
        throw error;
      }

      // Update cache
      this.configCache.set(key, value);
      logger.debug(`Updated config ${key}`);

    } catch (error) {
      logger.error(`Error setting config ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get a specific configuration value
   */
  async getConfigValue(key: string): Promise<string | number | boolean | object | null> {
    if (this.configCache.has(key)) {
      return this.configCache.get(key);
    }

    try {
      const { data, error } = await this.client
        .from('system_config')
        .select('config_value, config_type, is_encrypted')
        .eq('config_key', key)
        .single();

      if (error) {
        logger.error(`Failed to get config ${key}:`, error);
        return null;
      }

      let value = data.config_value;
      
      // Process data type
      switch (data.config_type) {
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
            logger.warn(`Invalid JSON in config ${key}`);
          }
          break;
      }
      
      this.configCache.set(key, value);
      return value;

    } catch (error) {
      logger.error(`Error getting config ${key}:`, error);
      return null;
    }
  }

  /**
   * Refresh configuration from database
   */
  async refreshConfig(): Promise<SystemConfig> {
    this.configCache.clear();
    return await this.loadConfig();
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const { error } = await this.client
        .from('system_config')
        .select('config_key')
        .limit(1);

      if (error) {
        logger.error('Database connection test failed:', error);
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Database connection test error:', error);
      return false;
    }
  }
}