/**
 * Email Import Service
 * Handles triggering email pulls and monitoring sync status
 */

import { supabase } from '../../lib/supabase';

export interface SyncStatus {
  isRunning: boolean;
  lastSync?: string;
  nextSync?: string;
  emailsSynced: number;
  error?: string;
  progress?: {
    current: number;
    total: number;
    status: string;
  };
}

export interface SyncResult {
  success: boolean;
  emailsSynced: number;
  configurationsProcessed: number;
  duration: number;
  errors: string[];
  message?: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class EmailImportService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = this.getBaseUrl();
  }

  private getBaseUrl(): string {
    const apiUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL;
    
    if (import.meta.env.MODE === 'production' && apiUrl) {
      return apiUrl;
    }
    
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
   * Trigger a manual email sync
   */
  async triggerSync(force: boolean = false): Promise<ServiceResponse<SyncResult>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/imap/trigger-sync`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          force,
          manual: true
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Sync trigger failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result.data,
        message: result.message || 'Email sync triggered successfully'
      };
    } catch (error) {
      console.error('Failed to trigger email sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to trigger email sync'
      };
    }
  }

  /**
   * Get current sync status
   */
  async getSyncStatus(): Promise<ServiceResponse<SyncStatus>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/imap/sync-status`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: true,
            data: {
              isRunning: false,
              emailsSynced: 0
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
      console.error('Failed to get sync status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sync status'
      };
    }
  }

  /**
   * Get sync history
   */
  async getSyncHistory(limit: number = 10): Promise<ServiceResponse<SyncResult[]>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/imap/sync-history?limit=${limit}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: true,
            data: []
          };
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        data: result.data || []
      };
    } catch (error) {
      console.error('Failed to get sync history:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sync history'
      };
    }
  }

  /**
   * Cancel a running sync
   */
  async cancelSync(): Promise<ServiceResponse<void>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/imap/cancel-sync`, {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Cancel sync failed: ${response.statusText}`);
      }

      return {
        success: true,
        message: 'Sync cancelled successfully'
      };
    } catch (error) {
      console.error('Failed to cancel sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel sync'
      };
    }
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<ServiceResponse<{
    totalSyncs: number;
    totalEmailsImported: number;
    averageEmailsPerSync: number;
    lastSuccessfulSync?: string;
    failureRate: number;
    syncFrequency: {
      daily: number;
      weekly: number;
      monthly: number;
    };
  }>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/imap/sync-stats`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 404) {
          return {
            success: true,
            data: {
              totalSyncs: 0,
              totalEmailsImported: 0,
              averageEmailsPerSync: 0,
              failureRate: 0,
              syncFrequency: {
                daily: 0,
                weekly: 0,
                monthly: 0
              }
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
      console.error('Failed to get sync stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get sync stats'
      };
    }
  }

  /**
   * Set sync schedule (update configuration)
   */
  async setSyncSchedule(intervalMinutes: number): Promise<ServiceResponse<void>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/imap/sync-schedule`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          sync_interval_minutes: intervalMinutes
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Schedule update failed: ${response.statusText}`);
      }

      return {
        success: true,
        message: 'Sync schedule updated successfully'
      };
    } catch (error) {
      console.error('Failed to set sync schedule:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to set sync schedule'
      };
    }
  }

  /**
   * Test email puller connection
   */
  async testEmailPullerConnection(): Promise<ServiceResponse<{
    connected: boolean;
    version?: string;
    lastHeartbeat?: string;
    status: 'running' | 'stopped' | 'error';
  }>> {
    try {
      const headers = await this.getAuthHeaders();
      const response = await fetch(`${this.baseUrl}/api/imap/puller-status`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 503) {
          return {
            success: true,
            data: {
              connected: false,
              status: 'stopped'
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
      console.error('Failed to test email puller connection:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test email puller connection'
      };
    }
  }

  /**
   * Poll sync status until completion (useful for UI progress tracking)
   */
  async pollSyncStatus(
    onProgress?: (status: SyncStatus) => void,
    timeoutMs: number = 300000 // 5 minutes
  ): Promise<ServiceResponse<SyncResult>> {
    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    return new Promise((resolve) => {
      const poll = async () => {
        try {
          if (Date.now() - startTime > timeoutMs) {
            resolve({
              success: false,
              error: 'Sync polling timeout'
            });
            return;
          }

          const statusResponse = await this.getSyncStatus();
          
          if (!statusResponse.success || !statusResponse.data) {
            resolve({
              success: false,
              error: statusResponse.error || 'Failed to get sync status'
            });
            return;
          }

          const status = statusResponse.data;
          onProgress?.(status);

          if (!status.isRunning) {
            // Sync completed, get final result
            const historyResponse = await this.getSyncHistory(1);
            
            if (historyResponse.success && historyResponse.data && historyResponse.data.length > 0) {
              resolve({
                success: true,
                data: historyResponse.data[0]
              });
            } else {
              resolve({
                success: true,
                data: {
                  success: true,
                  emailsSynced: status.emailsSynced,
                  configurationsProcessed: 1,
                  duration: Date.now() - startTime,
                  errors: status.error ? [status.error] : []
                }
              });
            }
            return;
          }

          // Continue polling
          setTimeout(poll, pollInterval);

        } catch (error) {
          resolve({
            success: false,
            error: error instanceof Error ? error.message : 'Polling failed'
          });
        }
      };

      poll();
    });
  }
}

export const emailImportService = new EmailImportService();