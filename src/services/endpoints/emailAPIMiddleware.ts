/**
 * Email API Middleware and Validation
 * Task 6.4: Add proper authentication and input validation
 * Centralized middleware for email processing API endpoints
 */

import { supabase } from '../../lib/supabase';
import type { User } from '@supabase/supabase-js';
import type { APIResponse } from './emailProcessingAPI';

/**
 * Authentication result interface
 */
export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (userId: string) => string;
}

/**
 * Validation rule types
 */
export type ValidationRule = 
  | { type: 'required'; message?: string }
  | { type: 'string'; minLength?: number; maxLength?: number; message?: string }
  | { type: 'number'; min?: number; max?: number; message?: string }
  | { type: 'email'; message?: string }
  | { type: 'array'; minItems?: number; maxItems?: number; message?: string }
  | { type: 'enum'; values: string[]; message?: string }
  | { type: 'custom'; validator: (value: unknown) => boolean; message: string };

/**
 * Validation schema type
 */
export type ValidationSchema = Record<string, ValidationRule[]>;

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
}

/**
 * Request context interface
 */
export interface RequestContext {
  user: User;
  requestId: string;
  timestamp: string;
  userAgent?: string;
  ipAddress?: string;
}

/**
 * Email API Middleware Class
 */
export class EmailAPIMiddleware {
  // Rate limiting storage (in production, use Redis or similar)
  private static rateLimitStore = new Map<string, { count: number; resetTime: number }>();
  
  // Request logging storage
  private static requestLogs: Array<{
    requestId: string;
    userId: string;
    endpoint: string;
    method: string;
    timestamp: string;
    processingTime: number;
    success: boolean;
  }> = [];

  /**
   * Authenticate user request
   */
  static async authenticateUser(): Promise<AuthResult> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('Authentication error:', error);
        return {
          success: false,
          error: 'Authentication failed'
        };
      }

      if (!user) {
        return {
          success: false,
          error: 'User not authenticated'
        };
      }

      // Additional user validation (check if user is active, has permissions, etc.)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, email, is_active')
        .eq('id', user.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = not found
        console.error('Profile lookup error:', profileError);
        return {
          success: false,
          error: 'User profile validation failed'
        };
      }

      // If profile exists, check if user is active
      if (profile && !profile.is_active) {
        return {
          success: false,
          error: 'User account is not active'
        };
      }

      return {
        success: true,
        user
      };

    } catch (error) {
      console.error('Authentication exception:', error);
      return {
        success: false,
        error: 'Authentication system error'
      };
    }
  }

  /**
   * Check rate limits for user
   */
  static checkRateLimit(userId: string, config: RateLimitConfig): { allowed: boolean; resetTime?: number; remaining?: number } {
    const key = config.keyGenerator ? config.keyGenerator(userId) : `rate_limit:${userId}`;
    const now = Date.now();
    
    const existing = this.rateLimitStore.get(key);
    
    if (!existing || now > existing.resetTime) {
      // New window or expired window
      const resetTime = now + config.windowMs;
      this.rateLimitStore.set(key, { count: 1, resetTime });
      return {
        allowed: true,
        resetTime,
        remaining: config.maxRequests - 1
      };
    }

    if (existing.count >= config.maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        resetTime: existing.resetTime,
        remaining: 0
      };
    }

    // Increment count
    existing.count++;
    this.rateLimitStore.set(key, existing);
    
    return {
      allowed: true,
      resetTime: existing.resetTime,
      remaining: config.maxRequests - existing.count
    };
  }

  /**
   * Validate request data against schema
   */
  static validateRequest(data: Record<string, unknown>, schema: ValidationSchema): ValidationResult {
    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      const fieldErrors: string[] = [];
      const fieldWarnings: string[] = [];

      for (const rule of rules) {
        const result = this.validateField(value, rule, field);
        
        if (result.error) {
          fieldErrors.push(result.error);
        }
        
        if (result.warning) {
          fieldWarnings.push(result.warning);
        }
      }

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
      
      if (fieldWarnings.length > 0) {
        warnings[field] = fieldWarnings;
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate individual field against a rule
   */
  private static validateField(value: unknown, rule: ValidationRule, fieldName: string): { error?: string; warning?: string } {
    switch (rule.type) {
      case 'required': {
        if (value === undefined || value === null || value === '') {
          return { error: rule.message || `${fieldName} is required` };
        }
        break;
      }

      case 'string': {
        if (typeof value !== 'string') {
          return { error: rule.message || `${fieldName} must be a string` };
        }
        if (rule.minLength && value.length < rule.minLength) {
          return { error: rule.message || `${fieldName} must be at least ${rule.minLength} characters` };
        }
        if (rule.maxLength && value.length > rule.maxLength) {
          return { error: rule.message || `${fieldName} cannot exceed ${rule.maxLength} characters` };
        }
        break;
      }

      case 'number': {
        if (typeof value !== 'number' || isNaN(value)) {
          return { error: rule.message || `${fieldName} must be a valid number` };
        }
        if (rule.min !== undefined && value < rule.min) {
          return { error: rule.message || `${fieldName} must be at least ${rule.min}` };
        }
        if (rule.max !== undefined && value > rule.max) {
          return { error: rule.message || `${fieldName} cannot exceed ${rule.max}` };
        }
        break;
      }

      case 'email': {
        if (typeof value !== 'string') {
          return { error: rule.message || `${fieldName} must be a string` };
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          return { error: rule.message || `${fieldName} must be a valid email address` };
        }
        break;
      }

      case 'array': {
        if (!Array.isArray(value)) {
          return { error: rule.message || `${fieldName} must be an array` };
        }
        if (rule.minItems && value.length < rule.minItems) {
          return { error: rule.message || `${fieldName} must have at least ${rule.minItems} items` };
        }
        if (rule.maxItems && value.length > rule.maxItems) {
          return { error: rule.message || `${fieldName} cannot have more than ${rule.maxItems} items` };
        }
        break;
      }

      case 'enum': {
        if (!rule.values.includes(value as string)) {
          return { error: rule.message || `${fieldName} must be one of: ${rule.values.join(', ')}` };
        }
        break;
      }

      case 'custom': {
        if (!rule.validator(value)) {
          return { error: rule.message };
        }
        break;
      }
    }

    return {};
  }

  /**
   * Log API request
   */
  static logRequest(
    requestId: string,
    userId: string,
    endpoint: string,
    method: string,
    processingTime: number,
    success: boolean
  ): void {
    const logEntry = {
      requestId,
      userId,
      endpoint,
      method,
      timestamp: new Date().toISOString(),
      processingTime,
      success
    };

    this.requestLogs.push(logEntry);

    // Keep only last 1000 entries in memory
    if (this.requestLogs.length > 1000) {
      this.requestLogs = this.requestLogs.slice(-1000);
    }

    // Log to console for debugging
    console.log(`📊 API Request: ${method} ${endpoint} - ${success ? 'SUCCESS' : 'FAILED'} (${processingTime}ms) [${requestId}]`);
  }

  /**
   * Get request logs for analysis
   */
  static getRequestLogs(
    filter?: {
      userId?: string;
      endpoint?: string;
      success?: boolean;
      timeRange?: { start: string; end: string };
    }
  ): typeof EmailAPIMiddleware.requestLogs {
    let logs = [...this.requestLogs];

    if (filter?.userId) {
      logs = logs.filter(log => log.userId === filter.userId);
    }

    if (filter?.endpoint) {
      const endpoint = filter.endpoint;
      logs = logs.filter(log => log.endpoint.includes(endpoint));
    }

    if (filter?.success !== undefined) {
      logs = logs.filter(log => log.success === filter.success);
    }

    if (filter?.timeRange) {
      const start = new Date(filter.timeRange.start);
      const end = new Date(filter.timeRange.end);
      logs = logs.filter(log => {
        const logTime = new Date(log.timestamp);
        return logTime >= start && logTime <= end;
      });
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Sanitize input data
   */
  static sanitizeInput(data: unknown): unknown {
    if (typeof data === 'string') {
      // Remove potential XSS attempts and trim whitespace
      return data
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeInput(item));
    }

    if (data && typeof data === 'object') {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        // Sanitize key name
        const sanitizedKey = key.replace(/[^\w\-_]/g, '');
        if (sanitizedKey) {
          sanitized[sanitizedKey] = this.sanitizeInput(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Create standardized error response
   */
  static createErrorResponse<T = never>(
    code: string,
    message: string,
    requestId: string,
    processingTime: number,
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
        processingTime,
        userId
      }
    };
  }

  /**
   * Comprehensive request validation and auth wrapper
   */
  static async validateAndAuthenticate(
    requestData: Record<string, unknown>,
    schema?: ValidationSchema,
    rateLimitConfig?: RateLimitConfig
  ): Promise<{
    success: boolean;
    context?: RequestContext;
    error?: APIResponse;
    sanitizedData?: Record<string, unknown>;
  }> {
    const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      // 1. Authenticate user
      const authResult = await this.authenticateUser();
      if (!authResult.success || !authResult.user) {
        return {
          success: false,
          error: this.createErrorResponse(
            'UNAUTHORIZED',
            authResult.error || 'Authentication failed',
            requestId,
            Date.now() - startTime
          )
        };
      }

      // 2. Check rate limits
      if (rateLimitConfig) {
        const rateLimitResult = this.checkRateLimit(authResult.user.id, rateLimitConfig);
        if (!rateLimitResult.allowed) {
          return {
            success: false,
            error: this.createErrorResponse(
              'RATE_LIMIT_EXCEEDED',
              'Too many requests. Please try again later.',
              requestId,
              Date.now() - startTime,
              {
                resetTime: rateLimitResult.resetTime,
                remaining: rateLimitResult.remaining
              },
              authResult.user.id
            )
          };
        }
      }

      // 3. Sanitize input data
      const sanitizedData = this.sanitizeInput(requestData);

      // 4. Validate input schema
      if (schema) {
        const validationResult = this.validateRequest(sanitizedData as Record<string, unknown>, schema);
        if (!validationResult.isValid) {
          return {
            success: false,
            error: this.createErrorResponse(
              'VALIDATION_ERROR',
              'Request validation failed',
              requestId,
              Date.now() - startTime,
              {
                errors: validationResult.errors,
                warnings: validationResult.warnings
              } as Record<string, unknown>,
              authResult.user.id
            )
          };
        }
      }

      // 5. Create request context
      const context: RequestContext = {
        user: authResult.user,
        requestId,
        timestamp: new Date().toISOString()
      };

      return {
        success: true,
        context,
        sanitizedData: sanitizedData as Record<string, unknown>
      };

    } catch (error) {
      return {
        success: false,
        error: this.createErrorResponse(
          'MIDDLEWARE_ERROR',
          error instanceof Error ? error.message : 'Request processing failed',
          requestId,
          Date.now() - startTime
        )
      };
    }
  }

  /**
   * Clean up old rate limit entries
   */
  static cleanupRateLimits(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, data] of Array.from(this.rateLimitStore.entries())) {
      if (now > data.resetTime) {
        toDelete.push(key);
      }
    }

    toDelete.forEach(key => this.rateLimitStore.delete(key));
    
    if (toDelete.length > 0) {
      console.log(`🧹 Cleaned up ${toDelete.length} expired rate limit entries`);
    }
  }
}

/**
 * Predefined validation schemas for common email API requests
 */
export const EmailAPISchemas = {
  emailProcess: {
    subject: [
      { type: 'required' as const },
      { type: 'string' as const, minLength: 1, maxLength: 1000 }
    ],
    fromEmail: [
      { type: 'required' as const },
      { type: 'email' as const }
    ],
    htmlContent: [
      { type: 'required' as const },
      { type: 'string' as const, minLength: 1, maxLength: 100000 }
    ],
    textContent: [
      { type: 'string' as const, maxLength: 50000 }
    ],
    portfolioId: [
      { type: 'string' as const, minLength: 1, maxLength: 100 }
    ]
  },

  batchProcess: {
    emails: [
      { type: 'required' as const },
      { type: 'array' as const, minItems: 1, maxItems: 50 }
    ],
    portfolioId: [
      { type: 'string' as const, minLength: 1, maxLength: 100 }
    ]
  },

  pagination: {
    page: [
      { type: 'number' as const, min: 1, max: 10000 }
    ],
    pageSize: [
      { type: 'number' as const, min: 1, max: 100 }
    ]
  }
};

/**
 * Predefined rate limit configurations
 */
export const RateLimitConfigs = {
  emailProcessing: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 requests per minute
    skipSuccessfulRequests: false
  },
  
  statusQueries: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // 100 requests per minute
    skipSuccessfulRequests: true
  },
  
  management: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 requests per minute
    skipSuccessfulRequests: false
  }
};

export default EmailAPIMiddleware;