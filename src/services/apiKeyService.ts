/**
 * API Key Management Service for Supabase
 * Task 13: Database integration for API key management
 */

import { supabase } from '../lib/supabase';
import { ApiKeyEncryption, ApiKeyValidator } from '../utils/apiKeyUtils';
import type { ApiKey, ApiProvider, ApiUsage } from '../lib/database/enhanced-types';

export interface CreateApiKeyRequest {
  provider: ApiProvider;
  keyName: string;
  apiKey: string;
  allowedFeatures?: string[];
  rateLimitPerHour?: number;
  rateLimitPerDay?: number;
  expiresAt?: string;
}

export interface UpdateApiKeyRequest {
  keyName?: string;
  isActive?: boolean;
  allowedFeatures?: string[];
  rateLimitPerHour?: number;
  rateLimitPerDay?: number;
  expiresAt?: string;
}

export class ApiKeyService {
  /**
   * Get all API keys for the current user
   */
  static async getApiKeys(): Promise<ApiKey[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching API keys:', error);
        throw new Error(`Failed to fetch API keys: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getApiKeys:', error);
      throw error;
    }
  }

  /**
   * Get a specific API key by ID
   */
  static async getApiKey(keyId: string): Promise<ApiKey | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('id', keyId)
        .eq('user_id', user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        console.error('Error fetching API key:', error);
        throw new Error(`Failed to fetch API key: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in getApiKey:', error);
      throw error;
    }
  }

  /**
   * Create a new API key
   */
  static async createApiKey(request: CreateApiKeyRequest): Promise<ApiKey> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Validate API key format
      const validation = ApiKeyValidator.validateKeyFormat(request.provider, request.apiKey);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      // Sanitize and encrypt the API key
      const sanitizedKey = ApiKeyValidator.sanitizeApiKey(request.apiKey);
      const encryptedKey = await ApiKeyEncryption.encryptApiKey(sanitizedKey);

      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          provider: request.provider,
          key_name: request.keyName.trim(),
          encrypted_key: encryptedKey,
          allowed_features: request.allowedFeatures || ['symbol_lookup'],
          rate_limit_per_hour: request.rateLimitPerHour || 100,
          rate_limit_per_day: request.rateLimitPerDay || 1000,
          expires_at: request.expiresAt || null,
          is_active: true,
          usage_count: 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating API key:', error);
        if (error.code === '23505') { // Unique constraint violation
          throw new Error('An API key with this name already exists for this provider');
        }
        throw new Error(`Failed to create API key: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createApiKey:', error);
      throw error;
    }
  }

  /**
   * Update an existing API key
   */
  static async updateApiKey(keyId: string, updates: UpdateApiKeyRequest): Promise<ApiKey> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const updateData: Partial<ApiKey> = {};

      if (updates.keyName !== undefined) {
        updateData.key_name = updates.keyName.trim();
      }
      if (updates.isActive !== undefined) {
        updateData.is_active = updates.isActive;
      }
      if (updates.allowedFeatures !== undefined) {
        updateData.allowed_features = updates.allowedFeatures;
      }
      if (updates.rateLimitPerHour !== undefined) {
        updateData.rate_limit_per_hour = updates.rateLimitPerHour;
      }
      if (updates.rateLimitPerDay !== undefined) {
        updateData.rate_limit_per_day = updates.rateLimitPerDay;
      }
      if (updates.expiresAt !== undefined) {
        updateData.expires_at = updates.expiresAt;
      }

      const { data, error } = await supabase
        .from('api_keys')
        .update(updateData)
        .eq('id', keyId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating API key:', error);
        throw new Error(`Failed to update API key: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in updateApiKey:', error);
      throw error;
    }
  }

  /**
   * Delete an API key
   */
  static async deleteApiKey(keyId: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Error deleting API key:', error);
        throw new Error(`Failed to delete API key: ${error.message}`);
      }
    } catch (error) {
      console.error('Error in deleteApiKey:', error);
      throw error;
    }
  }

  /**
   * Get decrypted API key for use (only when needed)
   */
  static async getDecryptedApiKey(keyId: string): Promise<string> {
    try {
      const apiKey = await this.getApiKey(keyId);
      if (!apiKey) {
        throw new Error('API key not found');
      }

      if (!apiKey.is_active) {
        throw new Error('API key is not active');
      }

      // Check if key has expired
      if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
        throw new Error('API key has expired');
      }

      return await ApiKeyEncryption.decryptApiKey(apiKey.encrypted_key);
    } catch (error) {
      console.error('Error in getDecryptedApiKey:', error);
      throw error;
    }
  }

  /**
   * Record API usage
   */
  static async recordUsage(
    keyId: string,
    endpoint: string,
    method: string = 'POST',
    statusCode?: number,
    responseTimeMs?: number,
    featureUsed?: string,
    errorMessage?: string,
    requestSize?: number,
    responseSize?: number
  ): Promise<void> {
    try {
      const { error: usageError } = await supabase
        .from('api_usage')
        .insert({
          api_key_id: keyId,
          endpoint,
          request_method: method,
          status_code: statusCode,
          response_time_ms: responseTimeMs,
          feature_used: featureUsed,
          error_message: errorMessage,
          request_size_bytes: requestSize,
          response_size_bytes: responseSize,
          timestamp: new Date().toISOString()
        });

      if (usageError) {
        console.error('Error recording API usage:', usageError);
        // Don't throw here to avoid interrupting the main flow
      }

      // Update usage count
      const { error: updateError } = await supabase
        .rpc('increment_api_usage_count', { key_id: keyId });

      if (updateError) {
        console.error('Error updating usage count:', updateError);
      }

      // Update last_used timestamp
      const { error: timestampError } = await supabase
        .from('api_keys')
        .update({ last_used: new Date().toISOString() })
        .eq('id', keyId);

      if (timestampError) {
        console.error('Error updating last used timestamp:', timestampError);
      }
    } catch (error) {
      console.error('Error in recordUsage:', error);
      // Don't throw to avoid interrupting main application flow
    }
  }

  /**
   * Get API usage statistics for a key
   */
  static async getUsageStats(keyId: string, days: number = 30): Promise<ApiUsage[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('api_usage')
        .select('*')
        .eq('api_key_id', keyId)
        .gte('timestamp', startDate.toISOString())
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching usage stats:', error);
        throw new Error(`Failed to fetch usage statistics: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUsageStats:', error);
      throw error;
    }
  }

  /**
   * Check rate limits for an API key
   */
  static async checkRateLimit(keyId: string): Promise<{ 
    withinHourlyLimit: boolean; 
    withinDailyLimit: boolean; 
    hourlyCount: number; 
    dailyCount: number; 
    hourlyLimit: number; 
    dailyLimit: number; 
  }> {
    try {
      const apiKey = await this.getApiKey(keyId);
      if (!apiKey) {
        throw new Error('API key not found');
      }

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      // Get hourly usage count
      const { count: hourlyCount } = await supabase
        .from('api_usage')
        .select('*', { count: 'exact', head: true })
        .eq('api_key_id', keyId)
        .gte('timestamp', oneHourAgo.toISOString());

      // Get daily usage count
      const { count: dailyCount } = await supabase
        .from('api_usage')
        .select('*', { count: 'exact', head: true })
        .eq('api_key_id', keyId)
        .gte('timestamp', oneDayAgo.toISOString());

      return {
        withinHourlyLimit: (hourlyCount || 0) < apiKey.rate_limit_per_hour,
        withinDailyLimit: (dailyCount || 0) < apiKey.rate_limit_per_day,
        hourlyCount: hourlyCount || 0,
        dailyCount: dailyCount || 0,
        hourlyLimit: apiKey.rate_limit_per_hour,
        dailyLimit: apiKey.rate_limit_per_day
      };
    } catch (error) {
      console.error('Error in checkRateLimit:', error);
      throw error;
    }
  }

  /**
   * Get active API key for a specific provider
   */
  static async getActiveKeyForProvider(provider: ApiProvider): Promise<ApiKey | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', provider)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No active key found
        }
        console.error('Error fetching active API key:', error);
        throw new Error(`Failed to fetch active API key: ${error.message}`);
      }

      // Check if key has expired
      if (data.expires_at && new Date(data.expires_at) < new Date()) {
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getActiveKeyForProvider:', error);
      throw error;
    }
  }
}

export default ApiKeyService;
