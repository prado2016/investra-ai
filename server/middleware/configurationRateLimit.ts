/**
 * Configuration API Rate Limiting Middleware
 * Provides tiered rate limiting for different configuration operations
 */

import rateLimit from 'express-rate-limit';
import express from 'express';

// Store for tracking user-specific limits
const userLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Standard rate limiting for general configuration operations
 * 60 requests per minute per user
 */
export const configurationRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute per IP
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many configuration requests. Please try again later.'
    },
    metadata: {
      timestamp: new Date().toISOString(),
      limit: 60,
      windowMs: 60000
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: express.Request) => {
    // Use user ID if available, otherwise fall back to IP
    return req.userId || req.ip || 'unknown';
  }
});

/**
 * Restrictive rate limiting for connection testing
 * 10 tests per minute per user to prevent service abuse
 */
export const testConnectionRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 test requests per minute per user
  message: {
    success: false,
    error: {
      code: 'TEST_RATE_LIMIT_EXCEEDED',
      message: 'Too many connection tests. Please try again later.'
    },
    metadata: {
      timestamp: new Date().toISOString(),
      limit: 10,
      windowMs: 60000,
      suggestion: 'Connection tests are resource-intensive. Please wait before testing again.'
    }
  },
  keyGenerator: (req: express.Request) => {
    return req.userId || req.ip || 'unknown';
  }
});

/**
 * Moderate rate limiting for import/export operations
 * 20 operations per minute per user
 */
export const importExportRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 import/export requests per minute per user
  message: {
    success: false,
    error: {
      code: 'IMPORT_EXPORT_RATE_LIMIT_EXCEEDED',
      message: 'Too many import/export requests. Please try again later.'
    },
    metadata: {
      timestamp: new Date().toISOString(),
      limit: 20,
      windowMs: 60000
    }
  },
  keyGenerator: (req: express.Request) => {
    return req.userId || req.ip || 'unknown';
  }
});

/**
 * Strict rate limiting for sensitive operations (reset, delete)
 * 5 operations per minute per user
 */
export const sensitiveOperationsRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // 5 sensitive operations per minute per user
  message: {
    success: false,
    error: {
      code: 'SENSITIVE_OPERATIONS_RATE_LIMIT_EXCEEDED',
      message: 'Too many sensitive operations. Please try again later.'
    },
    metadata: {
      timestamp: new Date().toISOString(),
      limit: 5,
      windowMs: 60000,
      warning: 'Sensitive operations like reset and delete are strictly limited for security.'
    }
  },
  keyGenerator: (req: express.Request) => {
    return req.userId || req.ip || 'unknown';
  }
});

/**
 * Custom rate limiting for per-category operations
 * Allows different limits based on configuration category
 */
export const categoryBasedRateLimit = (category: string) => {
  const limits: Record<string, { max: number; windowMs: number }> = {
    'security': { max: 20, windowMs: 60000 }, // More restrictive for security
    'database': { max: 30, windowMs: 60000 }, // Moderate for database
    'email_server': { max: 40, windowMs: 60000 }, // More lenient for email
    'ai_services': { max: 25, windowMs: 60000 }, // Moderate for AI services
    'monitoring': { max: 50, windowMs: 60000 }, // More lenient for monitoring
    'api': { max: 35, windowMs: 60000 } // Moderate for API settings
  };

  const limit = limits[category] || { max: 30, windowMs: 60000 }; // Default

  return rateLimit({
    windowMs: limit.windowMs,
    max: limit.max,
    message: {
      success: false,
      error: {
        code: 'CATEGORY_RATE_LIMIT_EXCEEDED',
        message: `Too many ${category} configuration requests. Please try again later.`
      },
      metadata: {
        timestamp: new Date().toISOString(),
        category,
        limit: limit.max,
        windowMs: limit.windowMs
      }
    },
    keyGenerator: (req: express.Request) => {
      return `${req.userId || req.ip}-${category}`;
    }
  });
};

/**
 * Burst protection middleware
 * Prevents rapid successive requests from same user
 */
export const burstProtection = (maxBurst: number = 5, burstWindowMs: number = 5000) => {
  return rateLimit({
    windowMs: burstWindowMs,
    max: maxBurst,
    message: {
      success: false,
      error: {
        code: 'BURST_LIMIT_EXCEEDED',
        message: 'Too many requests in quick succession. Please slow down.'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        burstLimit: maxBurst,
        burstWindowMs
      }
    },
    keyGenerator: (req: express.Request) => {
      return req.userId || req.ip || 'unknown';
    }
  });
};

/**
 * Global configuration API rate limiter
 * Applied to all configuration endpoints
 */
export const globalConfigurationRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 total configuration API requests per minute per user
  message: {
    success: false,
    error: {
      code: 'GLOBAL_CONFIGURATION_RATE_LIMIT_EXCEEDED',
      message: 'Global configuration API rate limit exceeded. Please try again later.'
    },
    metadata: {
      timestamp: new Date().toISOString(),
      globalLimit: 100,
      windowMs: 60000,
      note: 'This is the overall limit across all configuration operations.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: express.Request) => {
    return `global-config-${req.userId || req.ip}`;
  }
});

/**
 * Custom middleware to log rate limit violations
 */
export const logRateLimitViolations = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const originalSend = res.send.bind(res);
  
  res.send = (body: any) => {
    if (res.statusCode === 429) {
      console.warn(`⚠️  Rate limit violation:`, {
        userId: req.userId || 'unknown',
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.get('User-Agent'),
        timestamp: new Date().toISOString(),
        requestId: req.requestId
      });
    }
    return originalSend(body);
  };
  
  next();
};

/**
 * Middleware to add rate limit headers to successful responses
 */
export const addRateLimitHeaders = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  // Add custom rate limit information to response headers
  res.setHeader('X-RateLimit-Policy', 'Configuration API Rate Limiting');
  res.setHeader('X-RateLimit-Categories', 'standard,test,import-export,sensitive,burst,global');
  
  next();
};

export default {
  configurationRateLimit,
  testConnectionRateLimit,
  importExportRateLimit,
  sensitiveOperationsRateLimit,
  categoryBasedRateLimit,
  burstProtection,
  globalConfigurationRateLimit,
  logRateLimitViolations,
  addRateLimitHeaders
};