/**
 * Mock Configuration Service
 * Temporary implementation until real ConfigurationService (Task 4) is complete
 * Provides basic configuration management functionality for testing
 */

interface ConfigurationData {
  [key: string]: any;
}

interface ConfigurationTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  version: string;
  template: ConfigurationData;
  requiredFields: string[];
  optionalFields: string[];
}

interface ExportData {
  version: string;
  exportDate: string;
  configurations: Record<string, ConfigurationData>;
  metadata: {
    userId: string;
    categories: string[];
  };
}

interface ImportResult {
  success: boolean;
  imported: number;
  failed: number;
  errors: Array<{
    category: string;
    message: string;
  }>;
  summary: string;
}

/**
 * Mock Configuration Service
 * Simulates configuration management operations using in-memory storage
 */
export class MockConfigurationService {
  private static configurations: Map<string, Record<string, ConfigurationData>> = new Map();
  private static templates: ConfigurationTemplate[] = [];

  /**
   * Initialize mock service with default templates
   */
  static initialize() {
    if (this.templates.length === 0) {
      this.templates = this.getDefaultTemplates();
      console.log('🔧 MockConfigurationService initialized with default templates');
    }
  }

  /**
   * Get configuration for a specific category and user
   */
  static async getConfiguration(userId: string, category: string): Promise<ConfigurationData> {
    this.initialize();
    
    const userConfigs = this.configurations.get(userId) || {};
    const categoryConfig = userConfigs[category];
    
    if (categoryConfig) {
      console.log(`📖 Retrieved ${category} configuration for user ${userId}`);
      return { ...categoryConfig };
    }
    
    // Return default template if no user configuration exists
    const template = this.templates.find(t => t.category === category);
    if (template) {
      console.log(`📋 Using default template for ${category} (user ${userId})`);
      return { ...template.template };
    }
    
    console.log(`⚠️  No configuration found for ${category} (user ${userId})`);
    return {};
  }

  /**
   * Save configuration for a specific category and user
   */
  static async saveConfiguration(
    userId: string,
    category: string,
    configuration: ConfigurationData,
    overwrite: boolean = false
  ): Promise<ConfigurationData> {
    this.initialize();
    
    const userConfigs = this.configurations.get(userId) || {};
    
    if (userConfigs[category] && !overwrite) {
      throw new Error(`Configuration for ${category} already exists. Use overwrite=true to replace.`);
    }
    
    userConfigs[category] = { ...configuration, lastUpdated: new Date().toISOString() };
    this.configurations.set(userId, userConfigs);
    
    console.log(`💾 Saved ${category} configuration for user ${userId}`);
    return { ...userConfigs[category] };
  }

  /**
   * Update a specific configuration key
   */
  static async updateConfigurationKey(
    userId: string,
    category: string,
    key: string,
    value: any
  ): Promise<ConfigurationData> {
    this.initialize();
    
    const userConfigs = this.configurations.get(userId) || {};
    const categoryConfig = userConfigs[category] || {};
    
    categoryConfig[key] = value;
    categoryConfig.lastUpdated = new Date().toISOString();
    
    userConfigs[category] = categoryConfig;
    this.configurations.set(userId, userConfigs);
    
    console.log(`🔧 Updated ${category}.${key} for user ${userId}`);
    return { ...categoryConfig };
  }

  /**
   * Delete a specific configuration key
   */
  static async deleteConfigurationKey(
    userId: string,
    category: string,
    key: string
  ): Promise<void> {
    this.initialize();
    
    const userConfigs = this.configurations.get(userId) || {};
    const categoryConfig = userConfigs[category];
    
    if (!categoryConfig || !(key in categoryConfig)) {
      throw new Error(`Configuration key ${key} not found in ${category}`);
    }
    
    delete categoryConfig[key];
    categoryConfig.lastUpdated = new Date().toISOString();
    
    userConfigs[category] = categoryConfig;
    this.configurations.set(userId, userConfigs);
    
    console.log(`🗑️ Deleted ${category}.${key} for user ${userId}`);
  }

  /**
   * Get available configuration templates
   */
  static async getConfigurationTemplates(category?: string): Promise<ConfigurationTemplate[]> {
    this.initialize();
    
    if (category) {
      return this.templates.filter(t => t.category === category);
    }
    
    return [...this.templates];
  }

  /**
   * Export configurations for a user
   */
  static async exportConfigurations(
    userId: string,
    categories?: string[],
    includeDefaults: boolean = false
  ): Promise<ExportData> {
    this.initialize();
    
    const userConfigs = this.configurations.get(userId) || {};
    const exportData: ExportData = {
      version: '1.0.0',
      exportDate: new Date().toISOString(),
      configurations: {},
      metadata: {
        userId,
        categories: categories || Object.keys(userConfigs)
      }
    };

    const categoriesToExport = categories || Object.keys(userConfigs);
    
    categoriesToExport.forEach(category => {
      if (userConfigs[category]) {
        exportData.configurations[category] = { ...userConfigs[category] };
      } else if (includeDefaults) {
        const template = this.templates.find(t => t.category === category);
        if (template) {
          exportData.configurations[category] = { ...template.template };
        }
      }
    });

    console.log(`📤 Exported ${Object.keys(exportData.configurations).length} configurations for user ${userId}`);
    return exportData;
  }

  /**
   * Import configurations for a user
   */
  static async importConfigurations(
    userId: string,
    data: ExportData,
    overwrite: boolean = false,
    validateOnly: boolean = false
  ): Promise<ImportResult> {
    this.initialize();
    
    const result: ImportResult = {
      success: true,
      imported: 0,
      failed: 0,
      errors: [],
      summary: ''
    };

    if (!data.version || !data.configurations) {
      throw new Error('Invalid import data format');
    }

    const userConfigs = this.configurations.get(userId) || {};

    for (const [category, config] of Object.entries(data.configurations)) {
      try {
        // Validate category exists in templates
        const template = this.templates.find(t => t.category === category);
        if (!template) {
          result.errors.push({
            category,
            message: `Unknown category: ${category}`
          });
          result.failed++;
          continue;
        }

        // Check if configuration already exists
        if (userConfigs[category] && !overwrite) {
          result.errors.push({
            category,
            message: `Configuration already exists (use overwrite=true)`
          });
          result.failed++;
          continue;
        }

        // If not validation-only, actually import
        if (!validateOnly) {
          userConfigs[category] = {
            ...config,
            importedAt: new Date().toISOString(),
            importVersion: data.version
          };
          result.imported++;
        } else {
          result.imported++;
        }
      } catch (error) {
        result.errors.push({
          category,
          message: error instanceof Error ? error.message : 'Import failed'
        });
        result.failed++;
      }
    }

    if (!validateOnly && result.imported > 0) {
      this.configurations.set(userId, userConfigs);
    }

    result.success = result.failed === 0;
    result.summary = validateOnly 
      ? `Validation: ${result.imported} valid, ${result.failed} failed`
      : `Import: ${result.imported} successful, ${result.failed} failed`;

    console.log(`📥 ${validateOnly ? 'Validated' : 'Imported'} configurations for user ${userId}: ${result.summary}`);
    return result;
  }

  /**
   * Reset category to default values
   */
  static async resetToDefaults(userId: string, category: string): Promise<ConfigurationData> {
    this.initialize();
    
    const template = this.templates.find(t => t.category === category);
    if (!template) {
      throw new Error(`No default template found for category: ${category}`);
    }

    const userConfigs = this.configurations.get(userId) || {};
    const defaultConfig = {
      ...template.template,
      resetAt: new Date().toISOString()
    };
    
    userConfigs[category] = defaultConfig;
    this.configurations.set(userId, userConfigs);

    console.log(`🔄 Reset ${category} to defaults for user ${userId}`);
    return { ...defaultConfig };
  }

  /**
   * Get default configuration templates
   */
  private static getDefaultTemplates(): ConfigurationTemplate[] {
    return [
      {
        id: 'email-server-default',
        name: 'Email Server Default',
        category: 'email_server',
        description: 'Default IMAP email server configuration',
        version: '1.0.0',
        template: {
          imap_host: '',
          imap_port: 993,
          imap_secure: true,
          imap_username: '',
          imap_password: '',
          batch_size: 10,
          processing_interval: 5
        },
        requiredFields: ['imap_host', 'imap_username', 'imap_password'],
        optionalFields: ['imap_port', 'imap_secure', 'batch_size', 'processing_interval']
      },
      {
        id: 'ai-services-default',
        name: 'AI Services Default',
        category: 'ai_services',
        description: 'Default AI services configuration',
        version: '1.0.0',
        template: {
          google_api_key: '',
          max_tokens: 1000,
          temperature: 0.3,
          confidence_threshold: 0.8,
          rate_limit_requests_per_minute: 60
        },
        requiredFields: ['google_api_key'],
        optionalFields: ['max_tokens', 'temperature', 'confidence_threshold', 'rate_limit_requests_per_minute']
      },
      {
        id: 'database-default',
        name: 'Database Default',
        category: 'database',
        description: 'Default database configuration',
        version: '1.0.0',
        template: {
          supabase_url: '',
          supabase_anon_key: '',
          max_connections: 10,
          connection_timeout: 30000,
          query_timeout: 60000
        },
        requiredFields: ['supabase_url', 'supabase_anon_key'],
        optionalFields: ['max_connections', 'connection_timeout', 'query_timeout']
      },
      {
        id: 'monitoring-default',
        name: 'Monitoring Default',
        category: 'monitoring',
        description: 'Default monitoring configuration',
        version: '1.0.0',
        template: {
          health_check_interval: 30000,
          error_threshold: 10,
          memory_threshold: 85,
          cpu_threshold: 80,
          log_level: 'info'
        },
        requiredFields: [],
        optionalFields: ['health_check_interval', 'error_threshold', 'memory_threshold', 'cpu_threshold', 'log_level']
      },
      {
        id: 'security-default',
        name: 'Security Default',
        category: 'security',
        description: 'Default security configuration',
        version: '1.0.0',
        template: {
          encryption_algorithm: 'AES-256-GCM',
          session_timeout_minutes: 480,
          password_min_length: 12,
          account_lockout_attempts: 5
        },
        requiredFields: [],
        optionalFields: ['encryption_algorithm', 'session_timeout_minutes', 'password_min_length', 'account_lockout_attempts']
      },
      {
        id: 'api-default',
        name: 'API Default',
        category: 'api',
        description: 'Default API configuration',
        version: '1.0.0',
        template: {
          server_port: 3001,
          rate_limit_requests_per_minute: 100,
          max_request_size_mb: 50,
          api_request_timeout: 30000,
          cors_enabled: true
        },
        requiredFields: [],
        optionalFields: ['server_port', 'rate_limit_requests_per_minute', 'max_request_size_mb', 'api_request_timeout', 'cors_enabled']
      }
    ];
  }
}