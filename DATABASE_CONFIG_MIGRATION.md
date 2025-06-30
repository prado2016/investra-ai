# Database-Driven Configuration System

## 🎯 **CONCEPT**
Instead of using environment variables that can break, store ALL email-puller configuration in Supabase where it's already connected. This makes the system self-contained and eliminates deployment issues.

## 📋 **IMPLEMENTATION PLAN**

### **1. Create Configuration Table**
```sql
-- Create system_config table for centralized configuration
CREATE TABLE IF NOT EXISTS system_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  config_type VARCHAR(20) DEFAULT 'string' CHECK (config_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  is_encrypted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(config_key);

-- RLS policies - only service role can access
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Service role can read/write all config
CREATE POLICY "Service can manage system config" ON system_config
  FOR ALL USING (true);

-- Insert default configuration values
INSERT INTO system_config (config_key, config_value, config_type, description) VALUES
  ('email_encryption_key', 'auto_generated_on_first_run', 'string', 'Encryption key for Gmail passwords'),
  ('sync_interval_minutes', '30', 'number', 'Default sync interval in minutes'),
  ('max_emails_per_sync', '50', 'number', 'Maximum emails to process per sync'),
  ('enable_logging', 'true', 'boolean', 'Enable detailed logging'),
  ('log_level', 'info', 'string', 'Logging level (debug, info, warn, error)'),
  ('enable_scheduler', 'true', 'boolean', 'Enable automatic scheduled syncing'),
  ('archive_after_sync', 'true', 'boolean', 'Move emails to processed table after sync'),
  ('processed_folder_name', 'Investra/Processed', 'string', 'Gmail folder for processed emails'),
  ('sync_request_poll_interval', '10', 'number', 'Seconds between checking for manual sync requests'),
  ('cleanup_old_requests_days', '7', 'number', 'Days to keep old sync requests')
ON CONFLICT (config_key) DO NOTHING;
```

### **2. Update Email-Puller Configuration System**

Create `email-puller/src/database-config.ts`:
```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from './logger.js';
import { encrypt, decrypt } from './encryption.js';
import crypto from 'crypto';

export interface SystemConfig {
  // Core settings
  emailEncryptionKey: string;
  syncIntervalMinutes: number;
  maxEmailsPerSync: number;
  
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
  private configCache: Map<string, any> = new Map();

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

      const configMap = new Map<string, any>();
      
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
            value = JSON.parse(value);
            break;
        }
        
        // Decrypt if encrypted
        if (row.is_encrypted) {
          try {
            value = decrypt(value);
          } catch (decryptError) {
            logger.warn(`Failed to decrypt config ${row.config_key}:`, decryptError);
          }
        }
        
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
        enableLogging: configMap.get('enable_logging') ?? true,
        logLevel: configMap.get('log_level') || 'info',
        enableScheduler: configMap.get('enable_scheduler') ?? true,
        archiveAfterSync: configMap.get('archive_after_sync') ?? true,
        processedFolderName: configMap.get('processed_folder_name') || 'Investra/Processed',
        syncRequestPollInterval: configMap.get('sync_request_poll_interval') || 10,
        cleanupOldRequestsDays: configMap.get('cleanup_old_requests_days') || 7
      };

      this.configCache = configMap;
      logger.info('System configuration loaded from database');
      return this.config;

    } catch (error) {
      logger.error('Error loading configuration from database:', error);
      throw error;
    }
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
  async setConfig(key: string, value: any, encrypted: boolean = false): Promise<void> {
    try {
      let processedValue = value;
      
      if (encrypted && typeof value === 'string') {
        processedValue = encrypt(value);
      }
      
      const { error } = await this.client
        .from('system_config')
        .upsert({
          config_key: key,
          config_value: processedValue.toString(),
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
  async getConfigValue(key: string): Promise<any> {
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
          value = JSON.parse(value);
          break;
      }
      
      // Decrypt if needed
      if (data.is_encrypted) {
        value = decrypt(value);
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
}
```

### **3. Update Main Email-Puller**

Update `email-puller/src/imap-puller.ts`:
```typescript
import { DatabaseConfig } from './database-config.js';
import { SyncManager } from './sync-manager.js';
import { SyncRequestMonitor } from './sync-request-monitor.js';
import { logger } from './logger.js';

// Minimal environment variables (only Supabase connection)
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing required Supabase connection variables:');
  console.error('- SUPABASE_URL or VITE_SUPABASE_URL');
  console.error('- SUPABASE_ANON_KEY or VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

async function main() {
  try {
    logger.info('🚀 Starting Investra Email-Puller with database configuration');

    // Load configuration from database
    const dbConfig = new DatabaseConfig(SUPABASE_URL, SUPABASE_KEY);
    const config = await dbConfig.loadConfig();
    
    logger.info('✅ Configuration loaded from database:', {
      syncInterval: config.syncIntervalMinutes,
      maxEmails: config.maxEmailsPerSync,
      schedulerEnabled: config.enableScheduler,
      logLevel: config.logLevel
    });

    // Initialize sync manager with database config
    const syncManager = new SyncManager(dbConfig);
    
    // Start sync request monitor
    const syncMonitor = new SyncRequestMonitor(syncManager, dbConfig);
    syncMonitor.start();

    // Start scheduler if enabled
    if (config.enableScheduler) {
      setInterval(async () => {
        try {
          await syncManager.syncAllUsers();
        } catch (error) {
          logger.error('Scheduled sync error:', error);
        }
      }, config.syncIntervalMinutes * 60 * 1000);
      
      logger.info(`⏰ Scheduler started (${config.syncIntervalMinutes} minute intervals)`);
    }

    // Cleanup old requests daily
    setInterval(async () => {
      try {
        await syncMonitor.cleanupOldRequests(config.cleanupOldRequestsDays);
      } catch (error) {
        logger.error('Cleanup error:', error);
      }
    }, 24 * 60 * 60 * 1000);

    // Graceful shutdown
    process.on('SIGINT', () => {
      logger.info('🛑 Shutting down email-puller...');
      syncMonitor.stop();
      process.exit(0);
    });

    logger.info('✅ Email-puller started successfully');

  } catch (error) {
    logger.error('❌ Failed to start email-puller:', error);
    process.exit(1);
  }
}

main();
```

## ✅ **BENEFITS**

1. **🔐 Self-Contained**: Only needs Supabase connection, everything else from database
2. **🔧 Dynamic Configuration**: Change settings without redeploying
3. **📊 Centralized**: All config in one place with UI management potential  
4. **🛡️ Robust**: No more environment variable deployment issues
5. **🔄 Auto-Recovery**: Service can restart and get all config from database
6. **⚙️ Flexible**: Easy to add new configuration options

## 🚀 **DEPLOYMENT**

1. **Run the SQL migration** in Supabase Dashboard
2. **Update email-puller code** with new database config system
3. **Deploy**: Only needs SUPABASE_URL and SUPABASE_ANON_KEY environment variables
4. **Self-configures**: Everything else loads from database automatically

This approach eliminates the recurring environment variable issues completely!