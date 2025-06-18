/**
 * Configuration API Authentication Middleware
 * Handles authentication and authorization for configuration endpoints
 */

import express from 'express';
import jwt from 'jsonwebtoken';

// Mock Supabase client - will be replaced with real Supabase integration
interface MockUser {
  id: string;
  email: string;
  role: string;
  permissions: string[];
}

interface AuthenticatedRequest extends express.Request {
  user?: MockUser;
  userId?: string;
}

/**
 * Authentication middleware for configuration API
 * Validates JWT tokens and extracts user information
 */
export const authenticateConfigurationRequest = async (
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_AUTHORIZATION',
          message: 'Authorization header with Bearer token required'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId || 'unknown'
        }
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // TODO: Replace with real Supabase JWT validation
    // For now, use mock validation
    const user = await validateToken(token);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired authentication token'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId || 'unknown'
        }
      });
    }

    // Attach user information to request
    req.user = user;
    req.userId = user.id;
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({
      success: false,
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'Authentication failed'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      }
    });
  }
};

/**
 * Authorization middleware for configuration API
 * Checks if user has permission to access specific configuration categories
 */
export const authorizeConfigurationAccess = (requiredPermission?: string) => {
  return (req: AuthenticatedRequest, res: express.Response, next: express.NextFunction) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'USER_NOT_AUTHENTICATED',
            message: 'User authentication required'
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: req.requestId || 'unknown'
          }
        });
      }

      // Check for admin role (can access everything)
      if (user.role === 'admin') {
        return next();
      }

      // Check specific permission if required
      if (requiredPermission && !user.permissions.includes(requiredPermission)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_PERMISSIONS',
            message: `Permission '${requiredPermission}' required`
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: req.requestId || 'unknown'
          }
        });
      }

      // Check category-specific permissions
      const category = req.params.category;
      if (category && !hasConfigurationCategoryAccess(user, category)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'CATEGORY_ACCESS_DENIED',
            message: `Access denied to configuration category '${category}'`
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: req.requestId || 'unknown'
          }
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(403).json({
        success: false,
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'Authorization check failed'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId || 'unknown'
        }
      });
    }
  };
};

/**
 * Middleware to check if user owns the configuration resource
 * Prevents users from accessing other users' configurations
 */
export const checkConfigurationOwnership = async (
  req: AuthenticatedRequest,
  res: express.Response,
  next: express.NextFunction
) => {
  try {
    const user = req.user;
    const category = req.params.category;
    
    if (!user || !category) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REQUIRED_PARAMETERS',
          message: 'User authentication and category required'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId || 'unknown'
        }
      });
    }

    // TODO: Check actual configuration ownership in database
    // For now, assume user owns their own configurations
    const hasAccess = await checkUserConfigurationAccess(user.id, category);
    
    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'CONFIGURATION_ACCESS_DENIED',
          message: 'Access denied to this configuration resource'
        },
        metadata: {
          timestamp: new Date().toISOString(),
          requestId: req.requestId || 'unknown'
        }
      });
    }

    next();
  } catch (error) {
    console.error('Ownership check error:', error);
    res.status(403).json({
      success: false,
      error: {
        code: 'OWNERSHIP_CHECK_ERROR',
        message: 'Failed to verify resource ownership'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      }
    });
  }
};

/**
 * Mock token validation function
 * TODO: Replace with real Supabase JWT validation
 */
async function validateToken(token: string): Promise<MockUser | null> {
  try {
    // Mock validation - in production, this would validate with Supabase
    if (token === 'mock-admin-token') {
      return {
        id: 'admin-user-id',
        email: 'admin@investra.ai',
        role: 'admin',
        permissions: ['config:read', 'config:write', 'config:delete', 'config:test']
      };
    }
    
    if (token === 'mock-user-token') {
      return {
        id: 'regular-user-id',
        email: 'user@investra.ai',
        role: 'user',
        permissions: ['config:read', 'config:write', 'config:test']
      };
    }

    // Try to decode as JWT (for development)
    if (token.startsWith('eyJ')) {
      try {
        // In production, use the actual Supabase JWT secret
        const decoded = jwt.decode(token) as any;
        if (decoded && decoded.sub) {
          return {
            id: decoded.sub,
            email: decoded.email || 'user@example.com',
            role: decoded.role || 'user',
            permissions: decoded.permissions || ['config:read', 'config:write', 'config:test']
          };
        }
      } catch (jwtError) {
        console.warn('JWT decode failed:', jwtError);
      }
    }

    return null;
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

/**
 * Check if user has access to specific configuration category
 */
function hasConfigurationCategoryAccess(user: MockUser, category: string): boolean {
  // Admin can access everything
  if (user.role === 'admin') {
    return true;
  }

  // Category-specific access rules
  const categoryPermissions: Record<string, string[]> = {
    'email_server': ['config:email', 'config:write'],
    'ai_services': ['config:ai', 'config:write'],
    'database': ['config:database', 'config:write'],
    'monitoring': ['config:monitoring', 'config:read'],
    'security': ['config:security', 'config:write'],
    'api': ['config:api', 'config:write']
  };

  const requiredPermissions = categoryPermissions[category] || ['config:read'];
  
  // Check if user has any of the required permissions
  return requiredPermissions.some(permission => 
    user.permissions.includes(permission) || user.permissions.includes('config:write')
  );
}

/**
 * Check if user has access to specific configuration resource
 * TODO: Implement real database check
 */
async function checkUserConfigurationAccess(userId: string, category: string): Promise<boolean> {
  try {
    // TODO: Query database to check if user owns this configuration
    // For now, allow access if user is authenticated
    return true;
  } catch (error) {
    console.error('Configuration access check error:', error);
    return false;
  }
}

/**
 * Extract user ID from request (for use in other middleware)
 */
export const extractUserId = (req: AuthenticatedRequest): string | null => {
  return req.userId || req.user?.id || null;
};

export default {
  authenticateConfigurationRequest,
  authorizeConfigurationAccess,
  checkConfigurationOwnership,
  extractUserId
};