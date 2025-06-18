/**
 * Configuration Service
 * Main service for configuration CRUD operations with encryption integration,
 * caching, history tracking, and real-time notifications
 */

import { supabase } from '../../lib/supabase'
import type { 
  ConfigurationData,
  ConfigurationCategory,
  ConfigurationHistory,
  ExportData,
  ImportResult,
  ServiceResponse
} from './types'
import { EncryptionService } from '../security/encryptionService'
import { ConfigurationCache } from './configurationCache'
import { ConfigurationHistoryService } from './configurationHistory'
import { ConfigurationExportService } from './configurationExport'
import { ConfigurationValidationService } from './validationService'

/**
 * Configuration Service
 */
export class ConfigurationService {
  private static readonly TABLE_NAME = 'system_configurations'
  private static realtimeSubscription: any = null

  /**
   * Initialize the service
   */
  static async initialize(): Promise<void> {
    try {
      // Initialize cache
      ConfigurationCache.initialize()
      
      // Initialize history tracking
      ConfigurationHistoryService.initialize()
      
      // Set up real-time subscriptions
      await this.setupRealtimeSubscriptions()
      
      console.debug('ConfigurationService initialized successfully')
    } catch (error) {
      console.error('Failed to initialize ConfigurationService:', error)
      throw error
    }
  }

  /**
   * Shutdown the service
   */
  static async shutdown(): Promise<void> {
    try {
      // Remove real-time subscriptions
      if (this.realtimeSubscription) {
        await supabase.removeChannel(this.realtimeSubscription)
        this.realtimeSubscription = null
      }
      
      // Shutdown cache
      ConfigurationCache.shutdown()
      
      // Shutdown history service
      ConfigurationHistoryService.shutdown()
      
      console.debug('ConfigurationService shutdown successfully')
    } catch (error) {
      console.error('Failed to shutdown ConfigurationService:', error)
    }
  }

  /**
   * Get configuration for a specific category
   * @param userId - User ID
   * @param category - Configuration category
   * @returns Promise with configuration data
   */
  static async getConfiguration(
    userId: string,
    category: ConfigurationCategory
  ): Promise<ServiceResponse<ConfigurationData>> {
    try {
      // Check cache first
      const cachedData = ConfigurationCache.get(userId, category)
      if (cachedData) {
        return {
          data: await this.decryptSensitiveData(cachedData),
          error: null,
          success: true
        }
      }

      // Fetch from database
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('user_id', userId)
        .eq('category', category)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // No configuration found, return empty
          return {
            data: {},
            error: null,
            success: true
          }
        }
        throw error
      }

      const configData = data.configuration_data as ConfigurationData
      const decryptedData = await this.decryptSensitiveData(configData)

      // Cache the result
      ConfigurationCache.set(userId, category, configData)

      return {
        data: decryptedData,
        error: null,
        success: true
      }
    } catch (error) {
      console.error('Failed to get configuration:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to get configuration',
        success: false
      }
    }
  }

  /**
   * Create new configuration
   * @param userId - User ID
   * @param category - Configuration category
   * @param config - Configuration data
   * @returns Promise with configuration ID
   */
  static async createConfiguration(
    userId: string,
    category: ConfigurationCategory,
    config: any
  ): Promise<ServiceResponse<string>> {
    try {
      // Validate configuration
      const validation = await ConfigurationValidationService.validateConfiguration(
        category,
        config,
        { testConnections: false, skipSanitization: false }
      )

      if (!validation.isValid) {
        return {
          data: null,
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          success: false
        }
      }

      const sanitizedConfig = validation.sanitizedData || config
      const encryptedConfig = await this.encryptSensitiveData(sanitizedConfig)

      // Insert into database
      const { data, error } = await supabase
        .from(this.TABLE_NAME)
        .insert({
          user_id: userId,
          category,
          configuration_data: encryptedConfig,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (error) throw error

      // Record history
      ConfigurationHistoryService.recordChange(
        userId,
        category,
        null,
        encryptedConfig,
        'Configuration created'
      )

      // Invalidate cache
      ConfigurationCache.delete(userId, category)

      return {
        data: data.id,
        error: null,
        success: true
      }
    } catch (error) {
      console.error('Failed to create configuration:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to create configuration',
        success: false
      }
    }
  }

  /**
   * Update existing configuration
   * @param userId - User ID
   * @param category - Configuration category
   * @param config - New configuration data
   * @returns Promise with success status
   */
  static async updateConfiguration(
    userId: string,
    category: ConfigurationCategory,
    config: any
  ): Promise<ServiceResponse<void>> {
    try {
      // Get current configuration for history
      const currentResponse = await this.getConfiguration(userId, category)
      const currentConfig = currentResponse.data

      // Validate new configuration
      const validation = await ConfigurationValidationService.validateConfiguration(
        category,
        config,
        { testConnections: false, skipSanitization: false }
      )

      if (!validation.isValid) {
        return {
          data: null,
          error: `Validation failed: ${validation.errors.map(e => e.message).join(', ')}`,
          success: false
        }
      }

      const sanitizedConfig = validation.sanitizedData || config
      const encryptedConfig = await this.encryptSensitiveData(sanitizedConfig)

      // Update in database
      const { error } = await supabase
        .from(this.TABLE_NAME)
        .update({
          configuration_data: encryptedConfig,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('category', category)

      if (error) throw error

      // Record history
      ConfigurationHistoryService.recordChange(
        userId,
        category,
        currentConfig,
        encryptedConfig,
        'Configuration updated'
      )

      // Invalidate cache
      ConfigurationCache.delete(userId, category)

      return {
        data: null,
        error: null,
        success: true
      }
    } catch (error) {
      console.error('Failed to update configuration:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to update configuration',
        success: false
      }
    }
  }

  /**
   * Delete configuration
   * @param userId - User ID
   * @param category - Configuration category
   * @param key - Optional specific key to delete (if not provided, deletes entire category)
   * @returns Promise with success status
   */
  static async deleteConfiguration(
    userId: string,
    category: ConfigurationCategory,
    key?: string
  ): Promise<ServiceResponse<void>> {
    try {
      if (key) {
        // Delete specific key from configuration
        const currentResponse = await this.getConfiguration(userId, category)
        if (!currentResponse.success || !currentResponse.data) {
          return {
            data: null,
            error: 'Configuration not found',
            success: false
          }
        }

        const updatedConfig = { ...currentResponse.data }
        delete updatedConfig[key]

        return await this.updateConfiguration(userId, category, updatedConfig)
      } else {
        // Delete entire configuration category
        const currentResponse = await this.getConfiguration(userId, category)
        const currentConfig = currentResponse.data

        const { error } = await supabase
          .from(this.TABLE_NAME)
          .delete()
          .eq('user_id', userId)
          .eq('category', category)

        if (error) throw error

        // Record history
        if (currentConfig) {
          ConfigurationHistoryService.recordChange(
            userId,
            category,
            currentConfig,
            {},
            'Configuration deleted'
          )
        }

        // Invalidate cache
        ConfigurationCache.delete(userId, category)

        return {
          data: null,
          error: null,
          success: true
        }
      }
    } catch (error) {
      console.error('Failed to delete configuration:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to delete configuration',
        success: false
      }
    }
  }

  /**
   * Get configuration history
   * @param userId - User ID
   * @param category - Configuration category
   * @returns Promise with configuration history
   */
  static async getConfigurationHistory(
    userId: string,
    category: ConfigurationCategory
  ): Promise<ServiceResponse<ConfigurationHistory[]>> {
    try {
      const history = ConfigurationHistoryService.getHistory(userId, category)
      
      return {
        data: history,
        error: null,
        success: true
      }
    } catch (error) {
      console.error('Failed to get configuration history:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to get configuration history',
        success: false
      }
    }
  }

  /**
   * Restore configuration from history
   * @param userId - User ID
   * @param historyId - History entry ID to restore
   * @returns Promise with success status
   */
  static async restoreConfiguration(
    userId: string,
    historyId: string
  ): Promise<ServiceResponse<void>> {
    try {
      // This would need to be implemented based on how you want to handle restoration
      // For now, return a placeholder response
      return {
        data: null,
        error: 'Restore functionality not yet implemented',
        success: false
      }
    } catch (error) {
      console.error('Failed to restore configuration:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to restore configuration',
        success: false
      }
    }
  }

  /**
   * Export configuration
   * @param userId - User ID
   * @param categories - Optional array of categories to export
   * @returns Promise with export data
   */
  static async exportConfiguration(
    userId: string,
    categories?: ConfigurationCategory[]
  ): Promise<ServiceResponse<ExportData>> {
    try {
      // Get all configurations for user
      const { data: configs, error } = await supabase
        .from(this.TABLE_NAME)
        .select('*')
        .eq('user_id', userId)

      if (error) throw error

      const configurationsData: Record<ConfigurationCategory, ConfigurationData> = {}

      for (const config of configs) {
        const category = config.category as ConfigurationCategory
        if (!categories || categories.includes(category)) {
          configurationsData[category] = config.configuration_data
        }
      }

      const exportData = await ConfigurationExportService.exportConfiguration(
        userId,
        configurationsData,
        categories
      )

      return {
        data: exportData,
        error: null,
        success: true
      }
    } catch (error) {
      console.error('Failed to export configuration:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to export configuration',
        success: false
      }
    }
  }

  /**
   * Import configuration
   * @param userId - User ID
   * @param importData - Export data to import
   * @returns Promise with import result
   */
  static async importConfiguration(
    userId: string,
    importData: ExportData
  ): Promise<ServiceResponse<ImportResult>> {
    try {
      const importResult = await ConfigurationExportService.importConfiguration(
        userId,
        importData,
        { overwriteExisting: false }
      )

      // If import was successful, invalidate cache for affected categories
      if (importResult.success) {
        for (const category of importResult.importedCategories) {
          ConfigurationCache.delete(userId, category)
        }
      }

      return {
        data: importResult,
        error: null,
        success: true
      }
    } catch (error) {
      console.error('Failed to import configuration:', error)
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Failed to import configuration',
        success: false
      }
    }
  }

  /**
   * Private helper methods
   */

  /**
   * Encrypt sensitive data in configuration
   * @param config - Configuration data
   * @returns Promise with encrypted configuration data
   */
  private static async encryptSensitiveData(config: ConfigurationData): Promise<ConfigurationData> {
    const encryptedConfig: ConfigurationData = {}

    for (const [key, value] of Object.entries(config)) {
      if (value.isSensitive && !value.isEncrypted) {
        const encryptResult = await EncryptionService.encrypt(String(value.value))
        if (encryptResult.success) {
          encryptedConfig[key] = {
            ...value,
            value: encryptResult.encryptedData,
            isEncrypted: true
          }
        } else {
          console.warn(`Failed to encrypt value for key: ${key}`)
          encryptedConfig[key] = value
        }
      } else {
        encryptedConfig[key] = value
      }
    }

    return encryptedConfig
  }

  /**
   * Decrypt sensitive data in configuration
   * @param config - Configuration data with encrypted values
   * @returns Promise with decrypted configuration data
   */
  private static async decryptSensitiveData(config: ConfigurationData): Promise<ConfigurationData> {
    const decryptedConfig: ConfigurationData = {}

    for (const [key, value] of Object.entries(config)) {
      if (value.isEncrypted && typeof value.value === 'string') {
        const decryptResult = await EncryptionService.decrypt(value.value)
        if (decryptResult.success) {
          decryptedConfig[key] = {
            ...value,
            value: decryptResult.decryptedData,
            isEncrypted: false
          }
        } else {
          console.warn(`Failed to decrypt value for key: ${key}`)
          decryptedConfig[key] = value
        }
      } else {
        decryptedConfig[key] = value
      }
    }

    return decryptedConfig
  }
}
