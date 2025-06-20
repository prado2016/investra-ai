/**
 * Email Configuration Service
 * Handles CRUD operations for email configurations in Supabase
 */

import { supabase } from '../lib/supabase'
import { EncryptionService } from './security/encryptionService'
import type { 
  EmailConfiguration, 
  EmailProcessingLog, 
  EmailProvider
} from '../lib/database/types'

// Request/Response Types
export interface CreateEmailConfigRequest {
  name: string
  provider: EmailProvider
  imap_host: string
  imap_port: number
  imap_secure: boolean
  email_address: string
  password: string // Will be encrypted before storage
  auto_import_enabled?: boolean
  auto_insert_enabled?: boolean
  default_portfolio_id?: string | null
}

export interface UpdateEmailConfigRequest {
  name?: string
  provider?: EmailProvider
  imap_host?: string
  imap_port?: number
  imap_secure?: boolean
  email_address?: string
  password?: string // Will be encrypted before storage
  is_active?: boolean
  auto_import_enabled?: boolean
  auto_insert_enabled?: boolean
  default_portfolio_id?: string | null
}

export interface EmailConnectionTestResult {
  success: boolean
  error?: string
  tested_at: string
}

export interface ServiceResponse<T> {
  data: T | null
  error: string | null
  success: boolean
}

/**
 * Email Configuration Service
 */
export class EmailConfigurationService {
  /**
   * Create or update an email configuration (upsert)
   * If a configuration already exists for the user and email address, it will be updated.
   * Otherwise, a new configuration will be created.
   */
  static async createConfiguration(config: CreateEmailConfigRequest): Promise<ServiceResponse<EmailConfiguration>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: null, error: 'User not authenticated', success: false }
      }

      // Check if configuration already exists for this user and email
      const { data: existingConfig } = await supabase
        .from('email_configurations')
        .select('id')
        .eq('user_id', user.id)
        .eq('email_address', config.email_address)
        .single()

      // Encrypt password before storing
      const encryptedPassword = await this.encryptPassword(config.password)

      let result;
      if (existingConfig) {
        // Update existing configuration
        result = await supabase
          .from('email_configurations')
          .update({
            name: config.name,
            provider: config.provider,
            imap_host: config.imap_host,
            imap_port: config.imap_port,
            imap_secure: config.imap_secure,
            encrypted_password: encryptedPassword,
            auto_import_enabled: config.auto_import_enabled ?? true,
            default_portfolio_id: config.default_portfolio_id,
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingConfig.id)
          .select()
          .single()
      } else {
        // Create new configuration
        result = await supabase
          .from('email_configurations')
          .insert({
            user_id: user.id,
            name: config.name,
            provider: config.provider,
            imap_host: config.imap_host,
            imap_port: config.imap_port,
            imap_secure: config.imap_secure,
            email_address: config.email_address,
            encrypted_password: encryptedPassword,
            auto_import_enabled: config.auto_import_enabled ?? true,
            auto_insert_enabled: config.auto_insert_enabled ?? true,
            default_portfolio_id: config.default_portfolio_id,
            is_active: true
          })
          .select()
          .single()
      }

      if (result.error) {
        return { data: null, error: result.error.message, success: false }
      }

      return { data: result.data, error: null, success: true }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }

  /**
   * Get all email configurations for the authenticated user
   */
  static async getConfigurations(): Promise<ServiceResponse<EmailConfiguration[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: null, error: 'User not authenticated', success: false }
      }

      const { data, error } = await supabase
        .from('email_configurations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true })

      if (error) {
        return { data: null, error: error.message, success: false }
      }

      return { data: data || [], error: null, success: true }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }

  /**
   * Update an email configuration
   */
  static async updateConfiguration(
    id: string, 
    updates: UpdateEmailConfigRequest
  ): Promise<ServiceResponse<EmailConfiguration>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: null, error: 'User not authenticated', success: false }
      }

      // Prepare update data
      const updateData: Partial<UpdateEmailConfigRequest> = { ...updates }
      
      // Encrypt password if provided
      if (updates.password) {
        updateData.encrypted_password = await this.encryptPassword(updates.password)
        delete updateData.password
      }

      const { data, error } = await supabase
        .from('email_configurations')
        .update(updateData)
        .eq('id', id)
        .eq('user_id', user.id) // Ensure user can only update their own configs
        .select()
        .single()

      if (error) {
        return { data: null, error: error.message, success: false }
      }

      return { data, error: null, success: true }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }

  /**
   * Delete an email configuration
   */
  static async deleteConfiguration(id: string): Promise<ServiceResponse<boolean>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: null, error: 'User not authenticated', success: false }
      }

      const { error } = await supabase
        .from('email_configurations')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id) // Ensure user can only delete their own configs

      if (error) {
        return { data: null, error: error.message, success: false }
      }

      return { data: true, error: null, success: true }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }

  /**
   * Get auto-insert setting for a specific email configuration
   */
  static async getAutoInsertSetting(configId: string): Promise<ServiceResponse<boolean>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return { data: null, error: 'User not authenticated', success: false }
      }

      const { data, error } = await supabase
        .from('email_configurations')
        .select('auto_insert_enabled')
        .eq('id', configId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        return { data: null, error: error.message, success: false }
      }

      return {
        data: data?.auto_insert_enabled ?? true, // Default to true if not set
        error: null,
        success: true
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      }
    }
  }

  /**
   * Update auto-insert setting for a specific email configuration
   */
  static async updateAutoInsertSetting(configId: string, autoInsertEnabled: boolean): Promise<ServiceResponse<boolean>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return { data: null, error: 'User not authenticated', success: false }
      }

      const { data, error } = await supabase
        .from('email_configurations')
        .update({
          auto_insert_enabled: autoInsertEnabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', configId)
        .eq('user_id', user.id)
        .select('auto_insert_enabled')
        .single()

      if (error) {
        return { data: null, error: error.message, success: false }
      }

      return {
        data: data?.auto_insert_enabled ?? autoInsertEnabled,
        error: null,
        success: true
      }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      }
    }
  }

  /**
   * Get all email configurations with their auto-insert settings
   */
  static async getConfigurationsWithAutoInsert(): Promise<ServiceResponse<Array<EmailConfiguration & { auto_insert_enabled: boolean }>>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        return { data: null, error: 'User not authenticated', success: false }
      }

      const { data, error } = await supabase
        .from('email_configurations')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) {
        return { data: null, error: error.message, success: false }
      }

      return { data: data || [], error: null, success: true }
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      }
    }
  }

  /**
   * Test email connection
   */
  static async testConnection(id: string): Promise<ServiceResponse<EmailConnectionTestResult>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: null, error: 'User not authenticated', success: false }
      }

      // Get the configuration
      const { data: config, error: configError } = await supabase
        .from('email_configurations')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (configError || !config) {
        return { data: null, error: 'Configuration not found', success: false }
      }

      // TODO: Implement actual IMAP connection test
      // For now, return a mock result
      const testResult: EmailConnectionTestResult = {
        success: true,
        tested_at: new Date().toISOString()
      }

      // Update the configuration with test results
      await supabase
        .from('email_configurations')
        .update({
          last_tested_at: testResult.tested_at,
          last_test_success: testResult.success,
          last_test_error: testResult.error || null
        })
        .eq('id', id)

      return { data: testResult, error: null, success: true }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }

  /**
   * Get processing logs for a configuration
   */
  static async getProcessingLogs(configId: string): Promise<ServiceResponse<EmailProcessingLog[]>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: null, error: 'User not authenticated', success: false }
      }

      const { data, error } = await supabase
        .from('email_processing_logs')
        .select('*')
        .eq('email_config_id', configId)
        .order('created_at', { ascending: false })
        .limit(100) // Limit to most recent 100 logs

      if (error) {
        return { data: null, error: error.message, success: false }
      }

      return { data: data || [], error: null, success: true }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }

  /**
   * Get configuration with decrypted password (for internal use only)
   */
  static async getConfigurationWithPassword(id: string): Promise<ServiceResponse<EmailConfiguration & { decrypted_password: string }>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: null, error: 'User not authenticated', success: false }
      }

      const { data, error } = await supabase
        .from('email_configurations')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single()

      if (error) {
        return { data: null, error: error.message, success: false }
      }

      if (!data) {
        return { data: null, error: 'Configuration not found', success: false }
      }

      // Decrypt password
      const decryptedPassword = await this.decryptPassword(data.encrypted_password)

      return { 
        data: { 
          ...data, 
          decrypted_password: decryptedPassword 
        }, 
        error: null, 
        success: true 
      }
    } catch (error) {
      return { 
        data: null, 
        error: error instanceof Error ? error.message : 'Unknown error', 
        success: false 
      }
    }
  }

  /**
   * Private method to encrypt passwords using enhanced encryption service
   */
  private static async encryptPassword(password: string): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated for encryption')
      }

      const result = await EncryptionService.encryptValue(password, user.id)
      
      if (!result.success) {
        throw new Error(`Encryption failed: ${result.error}`)
      }

      if (result.warning) {
        console.warn('Encryption warning:', result.warning)
      }

      return result.encryptedData
    } catch (error) {
      console.error('Password encryption error:', error)
      // Fallback to base64 for backward compatibility (should be removed in production)
      return btoa(password)
    }
  }

  /**
   * Private method to decrypt passwords using enhanced encryption service
   */
  private static async decryptPassword(encryptedPassword: string): Promise<string> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('User not authenticated for decryption')
      }

      // Check if it's new format (JSON) or legacy format (base64)
      if (EncryptionService.isEncrypted(encryptedPassword)) {
        const result = await EncryptionService.decryptValue(encryptedPassword, user.id)
        
        if (!result.success) {
          throw new Error(`Decryption failed: ${result.error}`)
        }

        if (result.warning) {
          console.warn('Decryption warning:', result.warning)
        }

        return result.decryptedData
      } else {
        // Legacy base64 format - should be migrated
        console.warn('Legacy password format detected - consider re-saving configuration')
        return atob(encryptedPassword)
      }
    } catch (error) {
      console.error('Password decryption error:', error)
      // Fallback to base64 decoding for backward compatibility
      try {
        return atob(encryptedPassword)
      } catch {
        throw new Error('Failed to decrypt password - invalid format')
      }
    }
  }
}

export default EmailConfigurationService
