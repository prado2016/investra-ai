/**
 * Configuration API Validation Middleware
 * Provides comprehensive request validation for configuration endpoints
 */

import express from 'express';
import { body, param, query, ValidationChain, validationResult } from 'express-validator';

// Configuration categories
const VALID_CATEGORIES = [
  'database',
  'ai_services', 
  'email_server',
  'monitoring',
  'security',
  'api'
] as const;

type ConfigurationCategory = typeof VALID_CATEGORIES[number];

// Configuration key patterns
const CONFIG_KEY_PATTERN = /^[a-z][a-z0-9_]*$/;
const CONFIG_KEY_MAX_LENGTH = 100;

/**
 * Validation chain for configuration category parameter
 */
export const validateCategory = (): ValidationChain =>
  param('category')
    .isIn(VALID_CATEGORIES)
    .withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`);

/**
 * Validation chain for configuration key parameter
 */
export const validateConfigKey = (): ValidationChain =>
  param('key')
    .isLength({ min: 1, max: CONFIG_KEY_MAX_LENGTH })
    .withMessage(`Configuration key must be 1-${CONFIG_KEY_MAX_LENGTH} characters`)
    .matches(CONFIG_KEY_PATTERN)
    .withMessage('Configuration key must start with lowercase letter and contain only lowercase letters, numbers, and underscores');

/**
 * Validation chains for configuration data based on category
 */
export const validateConfigurationData = (category?: ConfigurationCategory): ValidationChain[] => {
  const baseValidation = [
    body('configuration')
      .isObject()
      .withMessage('Configuration must be an object')
      .custom((value: any) => {
        if (Object.keys(value).length === 0) {
          throw new Error('Configuration cannot be empty');
        }
        return true;
      })
  ];

  // Add category-specific validation
  if (category) {
    baseValidation.push(...getCategorySpecificValidation(category));
  }

  return baseValidation;
};

/**
 * Get category-specific validation rules
 */
function getCategorySpecificValidation(category: ConfigurationCategory): ValidationChain[] {
  switch (category) {
    case 'email_server':
      return [
        body('configuration.imap_host')
          .optional()
          .isString()
          .isLength({ min: 1, max: 255 })
          .withMessage('IMAP host must be a non-empty string (max 255 chars)'),
        
        body('configuration.imap_port')
          .optional()
          .isInt({ min: 1, max: 65535 })
          .withMessage('IMAP port must be between 1 and 65535'),
        
        body('configuration.imap_secure')
          .optional()
          .isBoolean()
          .withMessage('IMAP secure must be a boolean'),
        
        body('configuration.imap_username')
          .optional()
          .isEmail()
          .withMessage('IMAP username must be a valid email address'),
        
        body('configuration.imap_password')
          .optional()
          .isString()
          .isLength({ min: 1 })
          .withMessage('IMAP password must be a non-empty string'),
        
        body('configuration.batch_size')
          .optional()
          .isInt({ min: 1, max: 100 })
          .withMessage('Batch size must be between 1 and 100'),
        
        body('configuration.processing_interval')
          .optional()
          .isInt({ min: 1, max: 60 })
          .withMessage('Processing interval must be between 1 and 60 minutes')
      ];

    case 'ai_services':
      return [
        body('configuration.google_api_key')
          .optional()
          .isString()
          .matches(/^AIza[0-9A-Za-z-_]{35}$/)
          .withMessage('Google API key must be valid format (AIza...)'),
        
        body('configuration.max_tokens')
          .optional()
          .isInt({ min: 100, max: 8000 })
          .withMessage('Max tokens must be between 100 and 8000'),
        
        body('configuration.temperature')
          .optional()
          .isFloat({ min: 0, max: 1 })
          .withMessage('Temperature must be between 0 and 1'),
        
        body('configuration.confidence_threshold')
          .optional()
          .isFloat({ min: 0.1, max: 1.0 })
          .withMessage('Confidence threshold must be between 0.1 and 1.0'),
        
        body('configuration.rate_limit_requests_per_minute')
          .optional()
          .isInt({ min: 1, max: 300 })
          .withMessage('Rate limit must be between 1 and 300 requests per minute')
      ];

    case 'database':
      return [
        body('configuration.supabase_url')
          .optional()
          .isURL()
          .matches(/\.supabase\.co$/)
          .withMessage('Supabase URL must be a valid Supabase URL'),
        
        body('configuration.supabase_anon_key')
          .optional()
          .isString()
          .matches(/^eyJ/)
          .withMessage('Supabase anonymous key must be a valid JWT token'),
        
        body('configuration.supabase_service_role_key')
          .optional()
          .isString()
          .matches(/^eyJ/)
          .withMessage('Supabase service role key must be a valid JWT token'),
        
        body('configuration.max_connections')
          .optional()
          .isInt({ min: 1, max: 100 })
          .withMessage('Max connections must be between 1 and 100'),
        
        body('configuration.connection_timeout')
          .optional()
          .isInt({ min: 5000, max: 120000 })
          .withMessage('Connection timeout must be between 5000 and 120000 ms'),
        
        body('configuration.query_timeout')
          .optional()
          .isInt({ min: 5000, max: 300000 })
          .withMessage('Query timeout must be between 5000 and 300000 ms')
      ];

    case 'monitoring':
      return [
        body('configuration.health_check_interval')
          .optional()
          .isInt({ min: 10000, max: 300000 })
          .withMessage('Health check interval must be between 10000 and 300000 ms'),
        
        body('configuration.error_threshold')
          .optional()
          .isInt({ min: 1, max: 100 })
          .withMessage('Error threshold must be between 1 and 100'),
        
        body('configuration.alert_email')
          .optional()
          .isEmail()
          .withMessage('Alert email must be a valid email address'),
        
        body('configuration.memory_threshold')
          .optional()
          .isInt({ min: 50, max: 95 })
          .withMessage('Memory threshold must be between 50% and 95%'),
        
        body('configuration.cpu_threshold')
          .optional()
          .isInt({ min: 50, max: 95 })
          .withMessage('CPU threshold must be between 50% and 95%'),
        
        body('configuration.log_level')
          .optional()
          .isIn(['debug', 'info', 'warn', 'error'])
          .withMessage('Log level must be one of: debug, info, warn, error')
      ];

    case 'security':
      return [
        body('configuration.encryption_algorithm')
          .optional()
          .isIn(['AES-256-GCM', 'AES-256-CBC', 'ChaCha20-Poly1305'])
          .withMessage('Encryption algorithm must be one of: AES-256-GCM, AES-256-CBC, ChaCha20-Poly1305'),
        
        body('configuration.session_timeout_minutes')
          .optional()
          .isInt({ min: 60, max: 1440 })
          .withMessage('Session timeout must be between 60 and 1440 minutes'),
        
        body('configuration.password_min_length')
          .optional()
          .isInt({ min: 8, max: 128 })
          .withMessage('Password minimum length must be between 8 and 128'),
        
        body('configuration.account_lockout_attempts')
          .optional()
          .isInt({ min: 3, max: 20 })
          .withMessage('Account lockout attempts must be between 3 and 20'),
        
        body('configuration.key_derivation_iterations')
          .optional()
          .isInt({ min: 50000, max: 1000000 })
          .withMessage('Key derivation iterations must be between 50000 and 1000000')
      ];

    case 'api':
      return [
        body('configuration.server_port')
          .optional()
          .isInt({ min: 1000, max: 65535 })
          .withMessage('Server port must be between 1000 and 65535'),
        
        body('configuration.rate_limit_requests_per_minute')
          .optional()
          .isInt({ min: 10, max: 1000 })
          .withMessage('Rate limit must be between 10 and 1000 requests per minute'),
        
        body('configuration.max_request_size_mb')
          .optional()
          .isInt({ min: 1, max: 1000 })
          .withMessage('Max request size must be between 1 and 1000 MB'),
        
        body('configuration.api_request_timeout')
          .optional()
          .isInt({ min: 5000, max: 120000 })
          .withMessage('API request timeout must be between 5000 and 120000 ms'),
        
        body('configuration.cors_origins')
          .optional()
          .isString()
          .withMessage('CORS origins must be a string')
      ];

    default:
      return [];
  }
}

/**
 * Validation for export request
 */
export const validateExportRequest = (): ValidationChain[] => [
  body('categories')
    .optional()
    .isArray()
    .withMessage('Categories must be an array'),
  
  body('categories.*')
    .optional()
    .isIn(VALID_CATEGORIES)
    .withMessage(`Each category must be one of: ${VALID_CATEGORIES.join(', ')}`),
  
  body('includeDefaults')
    .optional()
    .isBoolean()
    .withMessage('Include defaults must be a boolean')
];

/**
 * Validation for import request
 */
export const validateImportRequest = (): ValidationChain[] => [
  body('data')
    .isObject()
    .withMessage('Import data must be an object'),
  
  body('data.version')
    .exists()
    .isString()
    .matches(/^\d+\.\d+\.\d+$/)
    .withMessage('Data version must be in semver format (e.g., 1.0.0)'),
  
  body('data.configurations')
    .isObject()
    .withMessage('Configurations must be an object'),
  
  body('overwrite')
    .optional()
    .isBoolean()
    .withMessage('Overwrite must be a boolean'),
  
  body('validateOnly')
    .optional()
    .isBoolean()
    .withMessage('Validate only must be a boolean')
];

/**
 * Validation for test connection request
 */
export const validateTestRequest = (): ValidationChain[] => [
  body('configuration')
    .isObject()
    .withMessage('Configuration must be an object')
    .custom((value: any) => {
      if (Object.keys(value).length === 0) {
        throw new Error('Configuration cannot be empty for testing');
      }
      return true;
    })
];

/**
 * Validation for template query
 */
export const validateTemplateQuery = (): ValidationChain[] => [
  query('category')
    .optional()
    .isIn(VALID_CATEGORIES)
    .withMessage(`Category must be one of: ${VALID_CATEGORIES.join(', ')}`)
];

/**
 * Custom validation for configuration values based on data type
 */
export const validateConfigurationValue = () => 
  body('value')
    .custom((value: any, { req }: { req: any }) => {
      const key = req.params?.key;
      
      // Type-specific validation
      if (key?.includes('_port')) {
        if (!Number.isInteger(value) || value < 1 || value > 65535) {
          throw new Error('Port must be an integer between 1 and 65535');
        }
      }
      
      if (key?.includes('_email')) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (typeof value === 'string' && value.length > 0 && !emailRegex.test(value)) {
          throw new Error('Must be a valid email address');
        }
      }
      
      if (key?.includes('_url')) {
        try {
          new URL(value);
        } catch {
          throw new Error('Must be a valid URL');
        }
      }
      
      if (key?.includes('_password') || key?.includes('_key')) {
        if (typeof value !== 'string' || value.length === 0) {
          throw new Error('Password/key must be a non-empty string');
        }
      }
      
      return true;
    });

/**
 * Middleware to handle validation errors
 */
export const handleValidationErrors = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((error: any) => ({
      field: error.type === 'field' ? error.path : error.type,
      message: error.msg,
      value: error.type === 'field' ? error.value : undefined
    }));

    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: formattedErrors
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: req.requestId || 'unknown'
      }
    });
  }
  
  next();
};

/**
 * Custom sanitization for sensitive configuration data
 */
export const sanitizeConfigurationData = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (req.body?.configuration) {
    const config = req.body.configuration;
    
    // Trim string values
    Object.keys(config).forEach(key => {
      if (typeof config[key] === 'string') {
        config[key] = config[key].trim();
      }
    });
    
    // Remove empty string values (convert to null)
    Object.keys(config).forEach(key => {
      if (config[key] === '') {
        config[key] = null;
      }
    });
    
    // Normalize boolean values
    Object.keys(config).forEach(key => {
      if (typeof config[key] === 'string') {
        const lowerValue = config[key].toLowerCase();
        if (lowerValue === 'true' || lowerValue === 'false') {
          config[key] = lowerValue === 'true';
        }
      }
    });
  }
  
  next();
};

/**
 * Validate configuration completeness for testing
 */
export const validateConfigurationForTesting = (category: ConfigurationCategory) => 
  body('configuration')
    .custom((config: any) => {
      const requiredFields = getRequiredFieldsForTesting(category);
      const missingFields = requiredFields.filter(field => !config[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields for testing: ${missingFields.join(', ')}`);
      }
      
      return true;
    });

/**
 * Get required fields for testing specific categories
 */
function getRequiredFieldsForTesting(category: ConfigurationCategory): string[] {
  switch (category) {
    case 'email_server':
      return ['imap_host', 'imap_port', 'imap_username', 'imap_password'];
    case 'ai_services':
      return ['google_api_key'];
    case 'database':
      return ['supabase_url', 'supabase_anon_key'];
    case 'monitoring':
      return [];
    case 'security':
      return [];
    case 'api':
      return [];
    default:
      return [];
  }
}

export default {
  validateCategory,
  validateConfigKey,
  validateConfigurationData,
  validateExportRequest,
  validateImportRequest,
  validateTestRequest,
  validateTemplateQuery,
  validateConfigurationValue,
  validateConfigurationForTesting,
  handleValidationErrors,
  sanitizeConfigurationData
};