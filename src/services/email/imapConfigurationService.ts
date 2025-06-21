/**
 * IMAP Configuration Service
 * Manages Gmail IMAP settings for users
 */

import { supabase } from '../../lib/supabase';

export interface ImapConfiguration {
  id: string;
  user_id: string;
  name: string;
  gmail_email: string;
  encrypted_app_password: string;
  imap_host: string;
  imap_port: number;
  imap_secure: boolean;
  is_active: boolean;
  last_sync_at: string | null;
  sync_status: 'idle' | 'syncing' | 'error' | 'success';
  last_error: string | null;
  emails_synced: number;
  sync_interval_minutes: number;
  max_emails_per_sync: number;
  created_at: string;
  updated_at: string;
}

export interface ImapConfigurationInput {
  name: string;
  gmail_email: string;
  app_password: string;
  is_active?: boolean;
  sync_interval_minutes?: number;
  max_emails_per_sync?: number;
}

export interface TestConnectionRequest {
  gmail_email: string;
  app_password: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ImapConfigurationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = this.getBaseUrl();
  }

  private getBaseUrl(): string {
    // Use environment variable for API base URL or fallback to proxy
    const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL;
    
    if (import.meta.env.MODE === 'production' && apiUrl) {
      return apiUrl;
    }
    
    // In development, use Vite proxy (empty string = same origin)
    return '';
  }

  /**
   * Get authentication headers with Supabase JWT token
   */
  private async getAuthHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    } catch (error) {
      console.warn('Failed to get authentication token:', error);
    }

    return headers;
  }

  /**
   * Get current user's IMAP configuration
   */
  async getConfiguration(): Promise<ServiceResponse<ImapConfiguration>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/imap/config`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { 
            success: true, 
            data: undefined,
            message: 'No configuration found'
          };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('Failed to get IMAP configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get configuration'
      };
    }
  }

  /**
   * Save or update IMAP configuration
   */
  async saveConfiguration(config: ImapConfigurationInput): Promise<ServiceResponse<ImapConfiguration>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/imap/config`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name: config.name,
          gmail_email: config.gmail_email,
          app_password: config.app_password,
          is_active: config.is_active ?? true,
          sync_interval_minutes: config.sync_interval_minutes ?? 30,
          max_emails_per_sync: config.max_emails_per_sync ?? 50
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result.data,
        message: 'Configuration saved successfully'
      };
    } catch (error) {
      console.error('Failed to save IMAP configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save configuration'
      };
    }
  }

  /**
   * Test IMAP connection
   */
  async testConnection(request: TestConnectionRequest): Promise<ServiceResponse<boolean>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/imap/test-connection`, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Connection test failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result.success,
        message: result.message || 'Connection test successful'
      };
    } catch (error) {
      console.error('IMAP connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Connection test failed'
      };
    }
  }

  /**
   * Update configuration status (for internal use)
   */
  async updateConfigurationStatus(
    status: ImapConfiguration['sync_status'],
    error?: string
  ): Promise<ServiceResponse<void>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/imap/config/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          sync_status: status,
          last_error: error || null
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to update status: ${response.statusText}`);
      }

      return {
        success: true,
        message: 'Status updated successfully'
      };
    } catch (error) {
      console.error('Failed to update configuration status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update status'
      };
    }
  }

  /**
   * Delete IMAP configuration
   */
  async deleteConfiguration(): Promise<ServiceResponse<void>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/imap/config`, {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to delete: ${response.statusText}`);
      }

      return {
        success: true,
        message: 'Configuration deleted successfully'
      };
    } catch (error) {
      console.error('Failed to delete IMAP configuration:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete configuration'
      };
    }
  }

  /**
   * Get configuration statistics
   */
  async getConfigurationStats(): Promise<ServiceResponse<{
    totalEmails: number;
    lastSyncAt: string | null;
    syncStatus: string;
    errorCount: number;
  }>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/imap/config/stats`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: true,
            data: {
              totalEmails: 0,
              lastSyncAt: null,
              syncStatus: 'idle',
              errorCount: 0
            }
          };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result.data
      };
    } catch (error) {
      console.error('Failed to get configuration stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get stats'
      };
    }
  }
}

export const imapConfigurationService = new ImapConfigurationService();