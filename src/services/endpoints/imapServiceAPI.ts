/**
 * IMAP Service API Endpoints
 * Task 7.4: Add error handling and status monitoring
 * RESTful API interface for IMAP email service management
 */

import { IMAPProcessorService } from '../email/imapProcessorService';
import { supabase } from '../../lib/supabase';
import type { APIResponse } from './emailProcessingAPI';
import type { IMAPServiceConfig } from '../email/imapProcessorService';
import type { IMAPProcessorStats } from '../email/imapEmailProcessor';

export interface IMAPServiceStatusResponse {
  status: 'stopped' | 'starting' | 'running' | 'error' | 'reconnecting';
  healthy: boolean;
  uptime: number;
  stats: IMAPProcessorStats;
  lastError?: string;
  startedAt?: string;
}

export interface IMAPServiceConfigResponse {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  defaultPortfolioId: string;
  pollInterval?: number;
  autoReconnect?: boolean;
  maxRetries?: number;
  // password excluded for security
}

export interface IMAPConnectionTestResponse {
  success: boolean;
  error?: string;
  serverInfo?: Record<string, unknown>;
  responseTime: number;
}

export interface IMAPProcessEmailsResponse {
  processed: number;
  successful: number;
  failed: number;
  duplicates: number;
  reviewRequired: number;
  results: Array<{
    uid: number;
    success: boolean;
    duplicateAction?: 'accept' | 'reject' | 'review';
    error?: string;
  }>;
}

/**
 * IMAP Service API Class
 */
export class IMAPServiceAPI {
  /**
   * GET /api/imap/status - Get IMAP service status
   */
  static async getServiceStatus(): Promise<APIResponse<IMAPServiceStatusResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return this.errorResponse('UNAUTHORIZED', 'User not authenticated', requestId, startTime);
      }

      // Get service instance (without starting it)
      let service: IMAPProcessorService;
      try {
        service = IMAPProcessorService.getInstance();
      } catch {
        // Service not initialized, create with default config
        const defaultConfig = IMAPProcessorService.createDefaultConfig();
        service = IMAPProcessorService.getInstance(defaultConfig);
      }

      const status = service.getStatus();
      const health = service.getHealthCheck();

      const response: IMAPServiceStatusResponse = {
        status: status.status,
        healthy: health.healthy,
        uptime: health.uptime,
        stats: status.stats,
        lastError: status.lastError,
        startedAt: status.startedAt
      };

      return this.successResponse(response, requestId, startTime, user.id);

    } catch (error) {
      return this.errorResponse(
        'STATUS_ERROR',
        error instanceof Error ? error.message : 'Failed to get status',
        requestId,
        startTime
      );
    }
  }

  /**
   * POST /api/imap/start - Start IMAP service
   */
  static async startService(): Promise<APIResponse<IMAPServiceStatusResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return this.errorResponse('UNAUTHORIZED', 'User not authenticated', requestId, startTime);
      }

      // Get or create service instance
      let service: IMAPProcessorService;
      try {
        service = IMAPProcessorService.getInstance();
      } catch {
        const config = IMAPProcessorService.createConfigFromEnv();
        service = IMAPProcessorService.getInstance(config);
      }

      // Start the service
      await service.start();

      const status = service.getStatus();
      const health = service.getHealthCheck();

      const response: IMAPServiceStatusResponse = {
        status: status.status,
        healthy: health.healthy,
        uptime: health.uptime,
        stats: status.stats,
        lastError: status.lastError,
        startedAt: status.startedAt
      };

      console.log(`✅ IMAP Service started via API by user ${user.id}`);

      return this.successResponse(response, requestId, startTime, user.id);

    } catch (error) {
      console.error('❌ Failed to start IMAP service via API:', error);

      return this.errorResponse(
        'SERVICE_START_ERROR',
        error instanceof Error ? error.message : 'Failed to start service',
        requestId,
        startTime
      );
    }
  }

  /**
   * POST /api/imap/stop - Stop IMAP service
   */
  static async stopService(): Promise<APIResponse<IMAPServiceStatusResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return this.errorResponse('UNAUTHORIZED', 'User not authenticated', requestId, startTime);
      }

      // Get service instance
      let service: IMAPProcessorService;
      try {
        service = IMAPProcessorService.getInstance();
      } catch {
        // Service not initialized, nothing to stop
        const response: IMAPServiceStatusResponse = {
          status: 'stopped',
          healthy: false,
          uptime: 0,
          stats: {
            connected: false,
            totalProcessed: 0,
            successful: 0,
            failed: 0,
            duplicates: 0,
            reviewRequired: 0,
            connectionUptime: 0,
            averageProcessingTime: 0
          }
        };

        return this.successResponse(response, requestId, startTime, user.id);
      }

      // Stop the service
      await service.stop();

      const status = service.getStatus();
      const health = service.getHealthCheck();

      const response: IMAPServiceStatusResponse = {
        status: status.status,
        healthy: health.healthy,
        uptime: health.uptime,
        stats: status.stats,
        lastError: status.lastError,
        startedAt: status.startedAt
      };

      console.log(`✅ IMAP Service stopped via API by user ${user.id}`);

      return this.successResponse(response, requestId, startTime, user.id);

    } catch (error) {
      console.error('❌ Failed to stop IMAP service via API:', error);

      return this.errorResponse(
        'SERVICE_STOP_ERROR',
        error instanceof Error ? error.message : 'Failed to stop service',
        requestId,
        startTime
      );
    }
  }

  /**
   * POST /api/imap/restart - Restart IMAP service
   */
  static async restartService(): Promise<APIResponse<IMAPServiceStatusResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return this.errorResponse('UNAUTHORIZED', 'User not authenticated', requestId, startTime);
      }

      // Get or create service instance
      let service: IMAPProcessorService;
      try {
        service = IMAPProcessorService.getInstance();
      } catch {
        const config = IMAPProcessorService.createConfigFromEnv();
        service = IMAPProcessorService.getInstance(config);
      }

      // Restart the service
      await service.restart();

      const status = service.getStatus();
      const health = service.getHealthCheck();

      const response: IMAPServiceStatusResponse = {
        status: status.status,
        healthy: health.healthy,
        uptime: health.uptime,
        stats: status.stats,
        lastError: status.lastError,
        startedAt: status.startedAt
      };

      console.log(`✅ IMAP Service restarted via API by user ${user.id}`);

      return this.successResponse(response, requestId, startTime, user.id);

    } catch (error) {
      console.error('❌ Failed to restart IMAP service via API:', error);

      return this.errorResponse(
        'SERVICE_RESTART_ERROR',
        error instanceof Error ? error.message : 'Failed to restart service',
        requestId,
        startTime
      );
    }
  }

  /**
   * GET /api/imap/config - Get IMAP service configuration
   */
  static async getServiceConfig(): Promise<APIResponse<IMAPServiceConfigResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return this.errorResponse('UNAUTHORIZED', 'User not authenticated', requestId, startTime);
      }

      // Get service instance
      let service: IMAPProcessorService;
      try {
        service = IMAPProcessorService.getInstance();
      } catch {
        const config = IMAPProcessorService.createDefaultConfig();
        service = IMAPProcessorService.getInstance(config);
      }

      const config = service.getConfig();

      // Remove sensitive information
      const response: IMAPServiceConfigResponse = {
        enabled: config.enabled,
        host: config.host,
        port: config.port,
        secure: config.secure,
        username: config.username,
        defaultPortfolioId: config.defaultPortfolioId,
        pollInterval: config.pollInterval,
        autoReconnect: config.autoReconnect,
        maxRetries: config.maxRetries
      };

      return this.successResponse(response, requestId, startTime, user.id);

    } catch (error) {
      return this.errorResponse(
        'CONFIG_ERROR',
        error instanceof Error ? error.message : 'Failed to get config',
        requestId,
        startTime
      );
    }
  }

  /**
   * POST /api/imap/config - Update IMAP service configuration
   */
  static async updateServiceConfig(configUpdates: Partial<IMAPServiceConfig>): Promise<APIResponse<IMAPServiceConfigResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return this.errorResponse('UNAUTHORIZED', 'User not authenticated', requestId, startTime);
      }

      // Validate config updates
      const validation = this.validateConfigUpdates(configUpdates);
      if (!validation.isValid) {
        return this.errorResponse('INVALID_CONFIG', validation.errors.join(', '), requestId, startTime);
      }

      // Get service instance
      let service: IMAPProcessorService;
      try {
        service = IMAPProcessorService.getInstance();
      } catch {
        const config = IMAPProcessorService.createDefaultConfig();
        service = IMAPProcessorService.getInstance(config);
      }

      // Update configuration
      await service.updateConfig(configUpdates);

      const config = service.getConfig();

      // Return updated config (without sensitive info)
      const response: IMAPServiceConfigResponse = {
        enabled: config.enabled,
        host: config.host,
        port: config.port,
        secure: config.secure,
        username: config.username,
        defaultPortfolioId: config.defaultPortfolioId,
        pollInterval: config.pollInterval,
        autoReconnect: config.autoReconnect,
        maxRetries: config.maxRetries
      };

      console.log(`✅ IMAP Service config updated via API by user ${user.id}`);

      return this.successResponse(response, requestId, startTime, user.id);

    } catch (error) {
      console.error('❌ Failed to update IMAP service config via API:', error);

      return this.errorResponse(
        'CONFIG_UPDATE_ERROR',
        error instanceof Error ? error.message : 'Failed to update config',
        requestId,
        startTime
      );
    }
  }

  /**
   * POST /api/imap/test-connection - Test IMAP connection
   */
  static async testConnection(): Promise<APIResponse<IMAPConnectionTestResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return this.errorResponse('UNAUTHORIZED', 'User not authenticated', requestId, startTime);
      }

      // Get service instance
      let service: IMAPProcessorService;
      try {
        service = IMAPProcessorService.getInstance();
      } catch {
        const config = IMAPProcessorService.createConfigFromEnv();
        service = IMAPProcessorService.getInstance(config);
      }

      // Test connection
      const testStartTime = Date.now();
      const result = await service.testConnection();
      const responseTime = Date.now() - testStartTime;

      const response: IMAPConnectionTestResponse = {
        success: result.success,
        error: result.error,
        serverInfo: result.serverInfo,
        responseTime
      };

      return this.successResponse(response, requestId, startTime, user.id);

    } catch (error) {
      return this.errorResponse(
        'CONNECTION_TEST_ERROR',
        error instanceof Error ? error.message : 'Connection test failed',
        requestId,
        startTime
      );
    }
  }

  /**
   * POST /api/imap/process-now - Process emails manually
   */
  static async processEmailsNow(portfolioId?: string): Promise<APIResponse<IMAPProcessEmailsResponse>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return this.errorResponse('UNAUTHORIZED', 'User not authenticated', requestId, startTime);
      }

      // Get service instance
      let service: IMAPProcessorService;
      try {
        service = IMAPProcessorService.getInstance();
      } catch {
        return this.errorResponse('SERVICE_NOT_INITIALIZED', 'IMAP service not initialized', requestId, startTime);
      }

      // Process emails
      const results = await service.processEmailsNow(portfolioId);

      const response: IMAPProcessEmailsResponse = {
        processed: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        duplicates: results.filter(r => r.duplicateAction === 'reject').length,
        reviewRequired: results.filter(r => r.duplicateAction === 'review').length,
        results: results.map(r => ({
          uid: r.uid,
          success: r.success,
          duplicateAction: r.duplicateAction,
          error: r.error
        }))
      };

      console.log(`✅ Processed ${results.length} emails manually via API for user ${user.id}`);

      return this.successResponse(response, requestId, startTime, user.id);

    } catch (error) {
      console.error('❌ Failed to process emails manually via API:', error);

      return this.errorResponse(
        'MANUAL_PROCESSING_ERROR',
        error instanceof Error ? error.message : 'Failed to process emails',
        requestId,
        startTime
      );
    }
  }

  /**
   * DELETE /api/imap/cache - Clear processed emails cache
   */
  static async clearProcessedCache(): Promise<APIResponse<{ cleared: boolean }>> {
    const requestId = this.generateRequestId();
    const startTime = Date.now();

    try {
      // Authentication check
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return this.errorResponse('UNAUTHORIZED', 'User not authenticated', requestId, startTime);
      }

      // Get service instance
      let service: IMAPProcessorService;
      try {
        service = IMAPProcessorService.getInstance();
      } catch {
        return this.errorResponse('SERVICE_NOT_INITIALIZED', 'IMAP service not initialized', requestId, startTime);
      }

      // Clear cache
      service.clearProcessedCache();

      console.log(`✅ Cleared IMAP processed cache via API for user ${user.id}`);

      return this.successResponse({ cleared: true }, requestId, startTime, user.id);

    } catch (error) {
      return this.errorResponse(
        'CACHE_CLEAR_ERROR',
        error instanceof Error ? error.message : 'Failed to clear cache',
        requestId,
        startTime
      );
    }
  }

  /**
   * Validate configuration updates
   */
  private static validateConfigUpdates(config: Partial<IMAPServiceConfig>): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (config.host !== undefined && (!config.host || config.host.trim().length === 0)) {
      errors.push('Host cannot be empty');
    }

    if (config.port !== undefined && (config.port < 1 || config.port > 65535)) {
      errors.push('Port must be between 1 and 65535');
    }

    if (config.username !== undefined && (!config.username || config.username.trim().length === 0)) {
      errors.push('Username cannot be empty');
    }

    if (config.pollInterval !== undefined && config.pollInterval < 5000) {
      errors.push('Poll interval must be at least 5000ms');
    }

    if (config.maxRetries !== undefined && (config.maxRetries < 0 || config.maxRetries > 10)) {
      errors.push('Max retries must be between 0 and 10');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Generate unique request ID
   */
  private static generateRequestId(): string {
    return `imap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create success response
   */
  private static successResponse<T>(
    data: T,
    requestId: string,
    startTime: number,
    userId?: string,
    cached = false
  ): APIResponse<T> {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTime: Date.now() - startTime,
        cached,
        userId
      }
    };
  }

  /**
   * Create error response
   */
  private static errorResponse<T = never>(
    code: string,
    message: string,
    requestId: string,
    startTime: number,
    details?: unknown,
    userId?: string
  ): APIResponse<T> {
    return {
      success: false,
      error: {
        code,
        message,
        details
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId,
        processingTime: Date.now() - startTime,
        userId
      }
    };
  }
}

export default IMAPServiceAPI;