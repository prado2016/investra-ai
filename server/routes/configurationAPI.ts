/**
 * Configuration Management API Routes
 * Task 5: Build Configuration Management API
 * 
 * Provides REST API endpoints for comprehensive configuration management
 * with authentication, validation, rate limiting, and comprehensive error handling.
 */

import express from 'express';
import rateLimit from 'express-rate-limit';
import { body, param, query, validationResult } from 'express-validator';

// TODO: Import real services once Tasks 2-4 are complete
// import { ConfigurationService } from '../../src/services/configuration/configurationService';
// import { ConfigurationValidationService } from '../../src/services/configuration/validationService';
// import { EncryptionService } from '../../src/services/security/encryptionService';

// Temporary mock implementations - will be replaced with real services
import { MockConfigurationService } from '../services/mockConfigurationService';
import { MockValidationService } from '../services/mockValidationService';

// Import authentication and validation middleware
import {
  authenticateConfigurationRequest,
  authorizeConfigurationAccess,
  checkConfigurationOwnership
} from '../middleware/configurationAuth';
import {
  validateCategory,
  validateConfigKey,
  validateConfigurationData,
  validateExportRequest,
  validateImportRequest,
  validateTestRequest,
  validateTemplateQuery,
  validateConfigurationValue,
  handleValidationErrors,
  sanitizeConfigurationData
} from '../middleware/configurationValidation';
import {
  configurationRateLimit,
  testConnectionRateLimit,
  importExportRateLimit,
  sensitiveOperationsRateLimit,
  burstProtection,
  logRateLimitViolations,
  addRateLimitHeaders
} from '../middleware/configurationRateLimit';

const router = express.Router();


// Types for API responses
interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata?: {
    timestamp: string;
    requestId: string;
    processingTime: number;
    userId?: string;
  };
}

interface ConfigurationData {
  [key: string]: any;
}

interface ValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    message: string;
    code: string;
  }>;
  warnings?: Array<{
    field: string;
    message: string;
  }>;
}

interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: any;
  responseTime: number;
  timestamp: string;
}

interface ConfigurationTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  version: string;
  template: ConfigurationData;
  requiredFields: string[];
  optionalFields: string[];
}

// Middleware for request ID generation
const addRequestId = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const requestId = `cfg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};


// Helper function to create standardized API responses
function createResponse<T>(
  data: T,
  success: boolean = true,
  requestId?: string,
  userId?: string,
  processingTime?: number
): APIResponse<T> {
  return {
    success,
    data,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: requestId || 'unknown',
      processingTime: processingTime || 0,
      userId
    }
  };
}

function createErrorResponse(
  code: string,
  message: string,
  requestId?: string,
  details?: any,
  processingTime?: number
): APIResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: requestId || 'unknown',
      processingTime: processingTime || 0
    }
  };
}

// Apply middleware to all routes
router.use(addRequestId);
router.use(logRateLimitViolations);
router.use(addRateLimitHeaders);
router.use(burstProtection(5, 5000)); // Max 5 requests in 5 seconds
router.use(configurationRateLimit);
router.use(authenticateConfigurationRequest);
router.use(authorizeConfigurationAccess());

/**
 * GET /api/configuration/:category
 * Get configuration for a specific category
 */
router.get(
  '/:category',
  [
    validateCategory(),
    handleValidationErrors
  ],
  async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const { category } = req.params;
    const userId = req.userId!;

    try {
      console.log(`📖 Getting ${category} configuration for user ${userId}`);
      
      // TODO: Use real ConfigurationService
      const configuration = await MockConfigurationService.getConfiguration(userId, category);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Retrieved ${category} configuration in ${processingTime}ms`);
      
      res.json(createResponse(configuration, true, req.requestId, userId, processingTime));
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Failed to get ${category} configuration:`, error);
      
      res.status(500).json(createErrorResponse(
        'CONFIGURATION_RETRIEVAL_ERROR',
        `Failed to retrieve ${category} configuration`,
        req.requestId,
        error instanceof Error ? error.message : 'Unknown error',
        processingTime
      ));
    }
  }
);

/**
 * POST /api/configuration/:category
 * Create or update configuration for a specific category
 */
router.post(
  '/:category',
  [
    validateCategory(),
    sanitizeConfigurationData,
    ...validateConfigurationData(),
    body('overwrite')
      .optional()
      .isBoolean()
      .withMessage('Overwrite flag must be a boolean'),
    handleValidationErrors
  ],
  async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const { category } = req.params;
    const { configuration, overwrite = false } = req.body;
    const userId = req.userId!;

    try {
      console.log(`💾 Saving ${category} configuration for user ${userId}`);
      
      // Validate configuration before saving
      // TODO: Use real ConfigurationValidationService
      const validationResult = await MockValidationService.validateConfiguration(category, configuration);
      
      if (!validationResult.isValid) {
        const processingTime = Date.now() - startTime;
        return res.status(400).json(createErrorResponse(
          'CONFIGURATION_VALIDATION_ERROR',
          'Configuration validation failed',
          req.requestId,
          validationResult.errors,
          processingTime
        ));
      }

      // Save configuration
      // TODO: Use real ConfigurationService
      const savedConfiguration = await MockConfigurationService.saveConfiguration(
        userId, 
        category, 
        configuration, 
        overwrite
      );
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Saved ${category} configuration in ${processingTime}ms`);
      
      res.status(201).json(createResponse(savedConfiguration, true, req.requestId, userId, processingTime));
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Failed to save ${category} configuration:`, error);
      
      const statusCode = error instanceof Error && error.message.includes('already exists') ? 409 : 500;
      const errorCode = statusCode === 409 ? 'CONFIGURATION_EXISTS' : 'CONFIGURATION_SAVE_ERROR';
      
      res.status(statusCode).json(createErrorResponse(
        errorCode,
        `Failed to save ${category} configuration`,
        req.requestId,
        error instanceof Error ? error.message : 'Unknown error',
        processingTime
      ));
    }
  }
);

/**
 * PUT /api/configuration/:category/:key
 * Update a specific configuration key
 */
router.put(
  '/:category/:key',
  [
    validateCategory(),
    validateConfigKey(),
    validateConfigurationValue(),
    handleValidationErrors
  ],
  async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const { category, key } = req.params;
    const { value } = req.body;
    const userId = req.userId!;

    try {
      console.log(`🔧 Updating ${category}.${key} for user ${userId}`);
      
      // Validate individual field
      // TODO: Use real ConfigurationValidationService
      const validationResult = await MockValidationService.validateField(category, key, value);
      
      if (!validationResult.isValid) {
        const processingTime = Date.now() - startTime;
        return res.status(400).json(createErrorResponse(
          'FIELD_VALIDATION_ERROR',
          'Field validation failed',
          req.requestId,
          validationResult.errors,
          processingTime
        ));
      }

      // Update configuration key
      // TODO: Use real ConfigurationService
      const updatedConfiguration = await MockConfigurationService.updateConfigurationKey(
        userId, 
        category, 
        key, 
        value
      );
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Updated ${category}.${key} in ${processingTime}ms`);
      
      res.json(createResponse(updatedConfiguration, true, req.requestId, userId, processingTime));
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Failed to update ${category}.${key}:`, error);
      
      res.status(500).json(createErrorResponse(
        'CONFIGURATION_UPDATE_ERROR',
        `Failed to update ${category}.${key}`,
        req.requestId,
        error instanceof Error ? error.message : 'Unknown error',
        processingTime
      ));
    }
  }
);

/**
 * DELETE /api/configuration/:category/:key
 * Delete a specific configuration key
 */
router.delete(
  '/:category/:key',
  sensitiveOperationsRateLimit,
  [
    validateCategory(),
    validateConfigKey(),
    handleValidationErrors
  ],
  async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const { category, key } = req.params;
    const userId = req.userId!;

    try {
      console.log(`🗑️ Deleting ${category}.${key} for user ${userId}`);
      
      // TODO: Use real ConfigurationService
      await MockConfigurationService.deleteConfigurationKey(userId, category, key);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Deleted ${category}.${key} in ${processingTime}ms`);
      
      res.json(createResponse(
        { message: `Configuration key ${key} deleted successfully` }, 
        true, 
        req.requestId, 
        userId, 
        processingTime
      ));
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Failed to delete ${category}.${key}:`, error);
      
      const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
      const errorCode = statusCode === 404 ? 'CONFIGURATION_NOT_FOUND' : 'CONFIGURATION_DELETE_ERROR';
      
      res.status(statusCode).json(createErrorResponse(
        errorCode,
        `Failed to delete ${category}.${key}`,
        req.requestId,
        error instanceof Error ? error.message : 'Unknown error',
        processingTime
      ));
    }
  }
);

/**
 * POST /api/configuration/:category/test
 * Test configuration connection
 */
router.post(
  '/:category/test',
  testConnectionRateLimit,
  [
    validateCategory(),
    ...validateTestRequest(),
    handleValidationErrors
  ],
  async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const { category } = req.params;
    const { configuration } = req.body;
    const userId = req.userId!;

    try {
      console.log(`🧪 Testing ${category} configuration for user ${userId}`);
      
      // TODO: Use real ConfigurationValidationService
      const testResult = await MockValidationService.testConnection(category, configuration);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Tested ${category} configuration in ${processingTime}ms - ${testResult.success ? 'SUCCESS' : 'FAILED'}`);
      
      // Return successful response even if connection test failed
      // The test result itself contains the success/failure information
      res.json(createResponse(testResult, true, req.requestId, userId, processingTime));
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Failed to test ${category} configuration:`, error);
      
      res.status(500).json(createErrorResponse(
        'CONFIGURATION_TEST_ERROR',
        `Failed to test ${category} configuration`,
        req.requestId,
        error instanceof Error ? error.message : 'Unknown error',
        processingTime
      ));
    }
  }
);

/**
 * GET /api/configuration/templates
 * Get available configuration templates
 */
router.get(
  '/templates',
  [
    ...validateTemplateQuery(),
    handleValidationErrors
  ],
  async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const { category } = req.query;

    try {
      console.log(`📋 Getting configuration templates${category ? ` for ${category}` : ''}`);
      
      // TODO: Use real ConfigurationService
      const templates = await MockConfigurationService.getConfigurationTemplates(category as string);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Retrieved ${templates.length} templates in ${processingTime}ms`);
      
      res.json(createResponse(templates, true, req.requestId, req.userId, processingTime));
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ Failed to get configuration templates:', error);
      
      res.status(500).json(createErrorResponse(
        'TEMPLATES_RETRIEVAL_ERROR',
        'Failed to retrieve configuration templates',
        req.requestId,
        error instanceof Error ? error.message : 'Unknown error',
        processingTime
      ));
    }
  }
);

/**
 * POST /api/configuration/export
 * Export configurations
 */
router.post(
  '/export',
  importExportRateLimit,
  [
    ...validateExportRequest(),
    handleValidationErrors
  ],
  async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const { categories, includeDefaults = false } = req.body;
    const userId = req.userId!;

    try {
      console.log(`📤 Exporting configurations for user ${userId}`);
      
      // TODO: Use real ConfigurationService
      const exportData = await MockConfigurationService.exportConfigurations(
        userId, 
        categories, 
        includeDefaults
      );
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Exported configurations in ${processingTime}ms`);
      
      // Set appropriate headers for file download
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="investra-config-${new Date().toISOString().split('T')[0]}.json"`);
      
      res.json(createResponse(exportData, true, req.requestId, userId, processingTime));
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ Failed to export configurations:', error);
      
      res.status(500).json(createErrorResponse(
        'CONFIGURATION_EXPORT_ERROR',
        'Failed to export configurations',
        req.requestId,
        error instanceof Error ? error.message : 'Unknown error',
        processingTime
      ));
    }
  }
);

/**
 * POST /api/configuration/import
 * Import configurations
 */
router.post(
  '/import',
  importExportRateLimit,
  [
    ...validateImportRequest(),
    handleValidationErrors
  ],
  async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const { data, overwrite = false, validateOnly = false } = req.body;
    const userId = req.userId!;

    try {
      console.log(`📥 Importing configurations for user ${userId}`);
      
      // TODO: Use real ConfigurationService
      const importResult = await MockConfigurationService.importConfigurations(
        userId, 
        data, 
        overwrite, 
        validateOnly
      );
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ ${validateOnly ? 'Validated' : 'Imported'} configurations in ${processingTime}ms`);
      
      res.json(createResponse(importResult, true, req.requestId, userId, processingTime));
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ Failed to import configurations:', error);
      
      res.status(400).json(createErrorResponse(
        'CONFIGURATION_IMPORT_ERROR',
        'Failed to import configurations',
        req.requestId,
        error instanceof Error ? error.message : 'Unknown error',
        processingTime
      ));
    }
  }
);

/**
 * POST /api/configuration/:category/reset
 * Reset category to default values
 */
router.post(
  '/:category/reset',
  sensitiveOperationsRateLimit,
  [
    validateCategory(),
    handleValidationErrors
  ],
  async (req: express.Request, res: express.Response) => {
    const startTime = Date.now();
    const { category } = req.params;
    const userId = req.userId!;

    try {
      console.log(`🔄 Resetting ${category} configuration to defaults for user ${userId}`);
      
      // TODO: Use real ConfigurationService
      const defaultConfiguration = await MockConfigurationService.resetToDefaults(userId, category);
      
      const processingTime = Date.now() - startTime;
      console.log(`✅ Reset ${category} configuration in ${processingTime}ms`);
      
      res.json(createResponse(defaultConfiguration, true, req.requestId, userId, processingTime));
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(`❌ Failed to reset ${category} configuration:`, error);
      
      res.status(500).json(createErrorResponse(
        'CONFIGURATION_RESET_ERROR',
        `Failed to reset ${category} configuration`,
        req.requestId,
        error instanceof Error ? error.message : 'Unknown error',
        processingTime
      ));
    }
  }
);

// Error handling middleware
router.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Configuration API error:', error);
  
  res.status(500).json(createErrorResponse(
    'INTERNAL_SERVER_ERROR',
    'An unexpected error occurred',
    req.requestId,
    process.env.NODE_ENV === 'development' ? error.stack : undefined
  ));
});

// Extend Express Request interface for TypeScript
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      userId?: string;
    }
  }
}

export default router;