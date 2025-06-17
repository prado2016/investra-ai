/**
 * Email Configuration Service
 * Handles CRUD operations for email configurations in Supabase
 */

import { supabase } from '../lib/supabase'
import type { 
  EmailConfiguration, 
  EmailProcessingLog, 
  EmailImportRule,
  EmailProvider,
  EmailProcessingStatus,
  EmailImportAction 
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
   * Create a new email configuration
   */
  static async createConfiguration(config: CreateEmailConfigRequest): Promise<ServiceResponse<EmailConfiguration>> {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        return { data: null, error: 'User not authenticated', success: false }
      }

      // TODO: Encrypt password before storing
      const encryptedPassword = await this.encryptPassword(config.password)

      const { data, error } = await supabase
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
          default_portfolio_id: config.default_portfolio_id,
          is_active: true
        })
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
      const updateData: any = { ...updates }
      
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
   * Private method to encrypt passwords
   * TODO: Implement proper encryption
   */
  private static async encryptPassword(password: string): Promise<string> {
    // TODO: Implement proper encryption using crypto
    // For now, just base64 encode (NOT SECURE - placeholder only)
    return btoa(password)
  }

  /**
   * Private method to decrypt passwords
   * TODO: Implement proper decryption
   */
  private static async decryptPassword(encryptedPassword: string): Promise<string> {
    // TODO: Implement proper decryption using crypto
    // For now, just base64 decode (NOT SECURE - placeholder only)
    return atob(encryptedPassword)
  }
}

export default EmailConfigurationService
