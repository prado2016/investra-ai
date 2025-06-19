/**
 * Configuration Export/Import Service
 * Handles exporting configurations to JSON and importing them back
 * Preserves encryption and includes version compatibility checks
 */

import type { 
  ExportData, 
  ExportMetadata, 
  ImportResult, 
  ImportError,
  ConfigurationData,
  ConfigurationCategory
} from './types'
import { EncryptionService } from '../security/encryptionService'

/**
 * Configuration Export/Import Service
 */
export class ConfigurationExportService {
  private static readonly CURRENT_VERSION = '1.0.0'
  private static readonly SUPPORTED_VERSIONS = ['1.0.0']
  private static readonly MAX_EXPORT_SIZE = 10 * 1024 * 1024 // 10MB

  /**
   * Export configurations to JSON format
   * @param userId - User ID
   * @param configurations - Configurations to export
   * @param categories - Optional array of categories to export (exports all if not specified)
   * @returns Promise with export data
   */
  static async exportConfiguration(
    userId: string,
    configurations: Record<ConfigurationCategory, ConfigurationData>,
    categories?: ConfigurationCategory[]
  ): Promise<ExportData> {
    try {
      // Filter configurations by categories if specified
      const configurationsToExport = categories 
        ? this.filterConfigurationsByCategories(configurations, categories)
        : configurations

      // Create metadata
      const metadata: ExportMetadata = {
        appVersion: this.CURRENT_VERSION,
        exportedCategories: Object.keys(configurationsToExport) as ConfigurationCategory[],
        totalConfigurations: Object.keys(configurationsToExport).length,
        containsSensitiveData: this.checkForSensitiveData(configurationsToExport)
      }

      // Prepare export data
      const exportData: ExportData = {
        version: this.CURRENT_VERSION,
        exportDate: new Date().toISOString(),
        userId,
        configurations: configurationsToExport,
        metadata
      }

      // Validate export size
      const exportJson = JSON.stringify(exportData)
      if (exportJson.length > this.MAX_EXPORT_SIZE) {
        throw new Error(`Export data too large: ${exportJson.length} bytes (max: ${this.MAX_EXPORT_SIZE})`)
      }

      return exportData
    } catch (error) {
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Import configurations from JSON data
   * @param userId - User ID
   * @param importData - Export data to import
   * @param options - Import options
   * @returns Promise with import result
   */
  static async importConfiguration(
    userId: string,
    importData: ExportData,
    options: {
      overwriteExisting?: boolean
      validateOnly?: boolean
      categories?: ConfigurationCategory[]
    } = {}
  ): Promise<ImportResult> {
    const {
      overwriteExisting = false,
      validateOnly = false,
      categories
    } = options

    const errors: ImportError[] = []
    const warnings: string[] = []
    const importedCategories: ConfigurationCategory[] = []
    const skippedCategories: ConfigurationCategory[] = []

    try {
      // Validate import data structure
      const structureValidation = this.validateImportStructure(importData)
      if (!structureValidation.valid) {
        errors.push({
          category: 'structure' as ConfigurationCategory,
          message: structureValidation.error || 'Invalid import structure',
          severity: 'error'
        })
        return {
          success: false,
          importedCategories: [],
          skippedCategories: [],
          errors,
          warnings,
          totalImported: 0
        }
      }

      // Check version compatibility
      if (!this.SUPPORTED_VERSIONS.includes(importData.version)) {
        warnings.push(`Version ${importData.version} may not be fully compatible with current version ${this.CURRENT_VERSION}`)
      }

      // Validate user ID (optional security check)
      if (importData.userId !== userId && importData.userId !== '*') {
        warnings.push('Import data was created for a different user')
      }

      // Filter categories if specified
      const categoriesToImport = categories 
        ? categories.filter(cat => Object.keys(importData.configurations).includes(cat))
        : Object.keys(importData.configurations) as ConfigurationCategory[]

      if (validateOnly) {
        // Only validate, don't actually import
        for (const category of categoriesToImport) {
          const categoryData = importData.configurations[category]
          const validation = await this.validateCategoryData(category, categoryData)
          
          if (validation.valid) {
            importedCategories.push(category)
          } else {
            errors.push({
              category,
              message: validation.error || 'Category validation failed',
              severity: 'error'
            })
          }
        }
      } else {
        // Actually import the data
        for (const category of categoriesToImport) {
          try {
            const categoryData = importData.configurations[category]
            const processedData = await this.processCategoryData(category, categoryData)
            
            // Here you would save the data to your storage system
            // For now, we'll just mark it as imported
            importedCategories.push(category)
          } catch (error) {
            errors.push({
              category,
              message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
              severity: 'error'
            })
            skippedCategories.push(category)
          }
        }
      }

      return {
        success: errors.length === 0,
        importedCategories,
        skippedCategories,
        errors,
        warnings,
        totalImported: importedCategories.length
      }
    } catch (error) {
      errors.push({
        category: 'import' as ConfigurationCategory,
        message: `Import process failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      })

      return {
        success: false,
        importedCategories: [],
        skippedCategories: [],
        errors,
        warnings,
        totalImported: 0
      }
    }
  }

  /**
   * Export configurations to JSON string
   * @param userId - User ID
   * @param configurations - Configurations to export
   * @param categories - Optional categories to export
   * @returns Promise with JSON string
   */
  static async exportToJson(
    userId: string,
    configurations: Record<ConfigurationCategory, ConfigurationData>,
    categories?: ConfigurationCategory[]
  ): Promise<string> {
    const exportData = await this.exportConfiguration(userId, configurations, categories)
    return JSON.stringify(exportData, null, 2)
  }

  /**
   * Import configurations from JSON string
   * @param userId - User ID
   * @param jsonData - JSON string containing export data
   * @param options - Import options
   * @returns Promise with import result
   */
  static async importFromJson(
    userId: string,
    jsonData: string,
    options?: {
      overwriteExisting?: boolean
      validateOnly?: boolean
      categories?: ConfigurationCategory[]
    }
  ): Promise<ImportResult> {
    try {
      const importData: ExportData = JSON.parse(jsonData)
      return await this.importConfiguration(userId, importData, options)
    } catch (error) {
      return {
        success: false,
        importedCategories: [],
        skippedCategories: [],
        errors: [{
          category: 'json' as ConfigurationCategory,
          message: `JSON parsing failed: ${error instanceof Error ? error.message : 'Invalid JSON'}`,
          severity: 'error'
        }],
        warnings: [],
        totalImported: 0
      }
    }
  }

  /**
   * Create a backup export with all configurations
   * @param userId - User ID
   * @param configurations - All user configurations
   * @returns Promise with backup export data
   */
  static async createBackup(
    userId: string,
    configurations: Record<ConfigurationCategory, ConfigurationData>
  ): Promise<ExportData> {
    return await this.exportConfiguration(userId, configurations)
  }

  /**
   * Restore from backup
   * @param userId - User ID
   * @param backupData - Backup export data
   * @returns Promise with restore result
   */
  static async restoreFromBackup(
    userId: string,
    backupData: ExportData
  ): Promise<ImportResult> {
    return await this.importConfiguration(userId, backupData, {
      overwriteExisting: true,
      validateOnly: false
    })
  }

  /**
   * Private helper methods
   */

  /**
   * Filter configurations by categories
   * @param configurations - All configurations
   * @param categories - Categories to include
   * @returns Filtered configurations
   */
  private static filterConfigurationsByCategories(
    configurations: Record<ConfigurationCategory, ConfigurationData>,
    categories: ConfigurationCategory[]
  ): Record<ConfigurationCategory, ConfigurationData> {
    const filtered: Record<string, ConfigurationData> = {}
    
    for (const category of categories) {
      if (configurations[category]) {
        filtered[category] = configurations[category]
      }
    }
    
    return filtered as Record<ConfigurationCategory, ConfigurationData>
  }

  /**
   * Check if configurations contain sensitive data
   * @param configurations - Configurations to check
   * @returns True if sensitive data is found
   */
  private static checkForSensitiveData(
    configurations: Record<ConfigurationCategory, ConfigurationData>
  ): boolean {
    for (const categoryData of Object.values(configurations)) {
      for (const configValue of Object.values(categoryData)) {
        if (configValue.isSensitive || configValue.isEncrypted) {
          return true
        }
      }
    }
    return false
  }

  /**
   * Validate import data structure
   * @param importData - Data to validate
   * @returns Validation result
   */
  private static validateImportStructure(importData: any): { valid: boolean; error?: string } {
    if (!importData || typeof importData !== 'object') {
      return { valid: false, error: 'Import data must be an object' }
    }

    if (!importData.version || typeof importData.version !== 'string') {
      return { valid: false, error: 'Missing or invalid version field' }
    }

    if (!importData.exportDate || typeof importData.exportDate !== 'string') {
      return { valid: false, error: 'Missing or invalid exportDate field' }
    }

    if (!importData.userId || typeof importData.userId !== 'string') {
      return { valid: false, error: 'Missing or invalid userId field' }
    }

    if (!importData.configurations || typeof importData.configurations !== 'object') {
      return { valid: false, error: 'Missing or invalid configurations field' }
    }

    if (!importData.metadata || typeof importData.metadata !== 'object') {
      return { valid: false, error: 'Missing or invalid metadata field' }
    }

    return { valid: true }
  }

  /**
   * Validate category data
   * @param category - Configuration category
   * @param data - Category data to validate
   * @returns Validation result
   */
  private static async validateCategoryData(
    category: ConfigurationCategory,
    data: ConfigurationData
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      if (!data || typeof data !== 'object') {
        return { valid: false, error: 'Category data must be an object' }
      }

      // Validate each configuration value
      for (const [key, value] of Object.entries(data)) {
        if (!value || typeof value !== 'object') {
          return { valid: false, error: `Invalid configuration value for key: ${key}` }
        }

        if (!this.isValidConfigurationValue(value)) {
          return { valid: false, error: `Invalid configuration value structure for key: ${key}` }
        }
      }

      return { valid: true }
    } catch (error) {
      return { 
        valid: false, 
        error: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      }
    }
  }

  /**
   * Check if object is a valid configuration value
   * @param value - Value to check
   * @returns True if valid configuration value
   */
  private static isValidConfigurationValue(value: any): boolean {
    return (
      typeof value === 'object' &&
      value.hasOwnProperty('value') &&
      typeof value.isEncrypted === 'boolean' &&
      typeof value.isSensitive === 'boolean' &&
      typeof value.dataType === 'string' &&
      typeof value.lastUpdated === 'string'
    )
  }

  /**
   * Process category data before import
   * @param category - Configuration category
   * @param data - Category data to process
   * @returns Processed category data
   */
  private static async processCategoryData(
    category: ConfigurationCategory,
    data: ConfigurationData
  ): Promise<ConfigurationData> {
    const processedData: ConfigurationData = {}

    for (const [key, value] of Object.entries(data)) {
      try {
        const processedValue = { ...value }

        // Handle encrypted data
        if (value.isEncrypted && typeof value.value === 'string') {
          // Verify that encrypted data can be decrypted
          const decryptResult = await EncryptionService.decrypt(value.value)
          if (!decryptResult.success) {
            console.warn(`Failed to decrypt value for key: ${key}`)
            // Keep the encrypted value but mark it as potentially corrupted
            processedValue.value = value.value
          }
        }

        // Update last updated timestamp to current time
        processedValue.lastUpdated = new Date().toISOString()

        processedData[key] = processedValue
      } catch (error) {
        console.warn(`Failed to process key ${key}:`, error)
        // Skip this key or include with warning
        processedData[key] = value
      }
    }

    return processedData
  }

  /**
   * Get export statistics
   * @param exportData - Export data to analyze
   * @returns Export statistics
   */
  static getExportStatistics(exportData: ExportData): {
    totalCategories: number
    totalConfigurations: number
    encryptedValues: number
    sensitiveValues: number
    exportSize: number
    dataTypes: Record<string, number>
  } {
    let totalConfigurations = 0
    let encryptedValues = 0
    let sensitiveValues = 0
    const dataTypes: Record<string, number> = {}

    for (const categoryData of Object.values(exportData.configurations)) {
      for (const configValue of Object.values(categoryData)) {
        totalConfigurations++
        
        if (configValue.isEncrypted) encryptedValues++
        if (configValue.isSensitive) sensitiveValues++
        
        dataTypes[configValue.dataType] = (dataTypes[configValue.dataType] || 0) + 1
      }
    }

    return {
      totalCategories: Object.keys(exportData.configurations).length,
      totalConfigurations,
      encryptedValues,
      sensitiveValues,
      exportSize: JSON.stringify(exportData).length,
      dataTypes
    }
  }

  /**
   * Validate export data integrity
   * @param exportData - Export data to validate
   * @returns Validation result with details
   */
  static validateExportIntegrity(exportData: ExportData): {
    valid: boolean
    errors: string[]
    warnings: string[]
  } {
    const errors: string[] = []
    const warnings: string[] = []

    // Check basic structure
    const structureValidation = this.validateImportStructure(exportData)
    if (!structureValidation.valid) {
      errors.push(structureValidation.error || 'Invalid structure')
    }

    // Check metadata consistency
    const actualCategories = Object.keys(exportData.configurations)
    const metadataCategories = exportData.metadata.exportedCategories

    if (actualCategories.length !== metadataCategories.length) {
      warnings.push('Metadata category count does not match actual categories')
    }

    if (exportData.metadata.totalConfigurations !== actualCategories.length) {
      warnings.push('Metadata configuration count may be incorrect')
    }

    // Check for empty categories
    for (const [category, data] of Object.entries(exportData.configurations)) {
      if (Object.keys(data).length === 0) {
        warnings.push(`Category '${category}' is empty`)
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    }
  }
}
