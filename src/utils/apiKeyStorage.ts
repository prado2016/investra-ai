/**
 * API Key Storage Utility
 * Helper functions for managing API keys in localStorage and database
 */

import { supabase } from '../lib/supabase';

interface StoredApiKey {
  provider: string;
  keyName: string;
  apiKey: string;
  model?: string;
  createdAt: string;
  isActive: boolean;
  isDefault: boolean;
}

export class ApiKeyStorage {
  private static STORAGE_KEY = 'stock_tracker_api_keys';

  /**
   * Get API key from database
   */
  private static async getApiKeyFromDatabase(provider: string): Promise<{ apiKey?: string; model?: string }> {
    try {
      // Look for default key: provider_api_key
      const { data: defaultKeyData } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', `${provider}_api_key`)
        .single();

      // Look for default model: provider_model
      const { data: defaultModelData } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', `${provider}_model`)
        .single();

      if (defaultKeyData?.config_value) {
        return {
          apiKey: defaultKeyData.config_value,
          model: defaultModelData?.config_value
        };
      }

      // If no default key, look for any key for this provider
      const { data: anyKeyData } = await supabase
        .from('system_config')
        .select('config_key, config_value')
        .like('config_key', `${provider}_%_api_key`)
        .limit(1);

      if (anyKeyData && anyKeyData.length > 0) {
        const keyConfig = anyKeyData[0];
        
        // Extract key name to get corresponding model
        const keyName = keyConfig.config_key.replace(`${provider}_`, '').replace('_api_key', '');
        const { data: modelData } = await supabase
          .from('system_config')
          .select('config_value')
          .eq('config_key', `${provider}_${keyName}_model`)
          .single();

        return {
          apiKey: keyConfig.config_value,
          model: modelData?.config_value
        };
      }

      return {};
    } catch (error) {
      console.error(`Error getting API key for ${provider} from database:`, error);
      return {};
    }
  }

  /**
   * Get all stored API keys
   */
  static getStoredKeys(): StoredApiKey[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
      }
    } catch (error) {
      console.error('Error loading stored API keys:', error);
    }
    return [];
  }

  /**
   * Get default API key for a specific provider
   */
  static getApiKey(provider: string): string | null {
    const keys = this.getStoredKeys();
    const defaultKey = keys.find(key => 
      key.provider === provider && key.isActive && key.isDefault
    );
    return defaultKey?.apiKey || null;
  }

  /**
   * Get default API key configuration (including model) for a specific provider
   */
  static getDefaultKeyConfig(provider: string): { apiKey: string; model?: string } | null {
    const keys = this.getStoredKeys();
    const defaultKey = keys.find(key => 
      key.provider === provider && key.isActive && key.isDefault
    );
    
    if (defaultKey) {
      return {
        apiKey: defaultKey.apiKey,
        model: defaultKey.model
      };
    }
    
    return null;
  }

  /**
   * Get API key from database, environment variables, or localStorage
   */
  static async getApiKeyWithFallbackAsync(provider: string): Promise<{ apiKey?: string; model?: string }> {
    // First try database
    const dbResult = await this.getApiKeyFromDatabase(provider);
    if (dbResult.apiKey) {
      return dbResult;
    }

    // Then try environment variables
    const envKey = `VITE_${provider.toUpperCase()}_API_KEY`;
    const envValue = import.meta.env[envKey];
    
    if (envValue && envValue !== 'your_gemini_api_key_here' && envValue !== 'your_openrouter_api_key_here') {
      return { apiKey: envValue };
    }

    // Fallback to localStorage
    const localKey = this.getApiKey(provider);
    if (localKey) {
      const config = this.getDefaultKeyConfig(provider);
      return { apiKey: localKey, model: config?.model };
    }

    return {};
  }

  /**
   * Get API key from environment variables or localStorage (synchronous version for backwards compatibility)
   */
  static getApiKeyWithFallback(provider: string): string | null {
    // First try environment variables
    const envKey = `VITE_${provider.toUpperCase()}_API_KEY`;
    const envValue = import.meta.env[envKey];
    
    if (envValue && envValue !== 'your_gemini_api_key_here' && envValue !== 'your_openrouter_api_key_here') {
      return envValue;
    }

    // Fallback to localStorage
    return this.getApiKey(provider);
  }

  /**
   * Get the default provider (the one marked as default) - async version
   */
  static async getDefaultProviderAsync(): Promise<string | null> {
    try {
      // First check database
      const { data: defaultProviderData } = await supabase
        .from('system_config')
        .select('config_value')
        .eq('config_key', 'default_ai_provider')
        .single();
      
      if (defaultProviderData?.config_value) {
        return defaultProviderData.config_value;
      }
    } catch (error) {
      console.warn('Failed to get default provider from database:', error);
    }

    // Fallback to localStorage
    const keys = this.getStoredKeys();
    const defaultKey = keys.find(key => key.isActive && key.isDefault);
    return defaultKey?.provider || null;
  }

  /**
   * Get the default provider (the one marked as default) - synchronous version for backwards compatibility
   */
  static getDefaultProvider(): string | null {
    const keys = this.getStoredKeys();
    const defaultKey = keys.find(key => key.isActive && key.isDefault);
    return defaultKey?.provider || null;
  }

  /**
   * Check if API key is available for provider - async version
   */
  static async hasApiKeyAsync(provider: string): Promise<boolean> {
    const result = await this.getApiKeyWithFallbackAsync(provider);
    return !!result.apiKey;
  }

  /**
   * Check if API key is available for provider - synchronous version for backwards compatibility
   */
  static hasApiKey(provider: string): boolean {
    return this.getApiKeyWithFallback(provider) !== null;
  }

  /**
   * Save API key for a provider
   */
  static saveApiKey(provider: string, keyName: string, apiKey: string, model?: string, isDefault?: boolean): boolean {
    try {
      const keys = this.getStoredKeys();
      const newKey: StoredApiKey = {
        provider,
        keyName,
        apiKey,
        model,
        createdAt: new Date().toISOString(),
        isActive: true,
        isDefault: isDefault || false
      };

      // Check if key with same name already exists
      const existingIndex = keys.findIndex(key => 
        key.keyName === keyName && key.provider === provider
      );

      let updatedKeys;
      if (existingIndex >= 0) {
        // Update existing key
        updatedKeys = [...keys];
        updatedKeys[existingIndex] = newKey;
      } else {
        // Add new key
        updatedKeys = [...keys, newKey];
      }

      // If this is being set as default, unset other defaults for this provider
      if (isDefault) {
        updatedKeys = updatedKeys.map(key => ({
          ...key,
          isDefault: key.provider === provider && key.keyName === keyName
        }));
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedKeys));
      return true;
    } catch (error) {
      console.error('Error saving API key:', error);
      return false;
    }
  }

  /**
   * Remove API key
   */
  static removeApiKey(provider: string, keyName: string): boolean {
    try {
      const keys = this.getStoredKeys();
      const updatedKeys = keys.filter(key => 
        !(key.provider === provider && key.keyName === keyName)
      );
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedKeys));
      return true;
    } catch (error) {
      console.error('Error removing API key:', error);
      return false;
    }
  }
}
