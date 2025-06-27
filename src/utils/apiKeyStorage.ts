/**
 * API Key Storage Utility
 * Helper functions for managing API keys in localStorage
 */

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
   * Get API key from environment variables or localStorage
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
   * Check if API key is available for provider
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
