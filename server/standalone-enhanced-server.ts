/**
 * Investra AI Email Processing API Server - Standalone Enhanced Production
 * Production server with IMAP capabilities, monitoring, and error handling
 * Self-contained without frontend dependencies
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import winston from 'winston';
import 'winston-daily-rotate-file';
import { ImapFlow } from 'imapflow';
import { ServiceMonitor } from './monitoring-service';

// Server-specific email processing will be implemented inline
// to avoid frontend dependencies

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'production';
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Local type definitions (extracted from frontend types)
interface APIResponse<T = unknown> {
  data?: T;
  error?: string;
  success: boolean;
  timestamp: string;
  requestId?: string;
}

interface EmailProcessRequest {
  emailContent: string;
  fromEmail: string;
  subject: string;
  portfolioId?: string;
}

interface EmailProcessResponse {
  success: boolean;
  message: string;
  data?: {
    symbol: string;
    type: string;
    quantity: number;
    price: number;
    date: string;
    confidence: number;
  };
  error?: string;
}

interface IMAPServiceStatus {
  status: 'running' | 'stopped' | 'error';
  message: string;
  lastConnection?: string;
  messagesProcessed?: number;
  errors?: string[];
}

interface ProcessingStatsResponse {
  totalProcessed: number;
  successfullyProcessed: number;
  failed: number;
  pending: number;
  lastProcessedAt?: string;
  averageProcessingTime?: number;
}

// Simplified IMAP configuration
interface IMAPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Global services
let imapClient: ImapFlow | null = null;
let serviceMonitor: ServiceMonitor | null = null;
let logger: winston.Logger;
let processingStats = {
  totalProcessed: 0,
  successfullyProcessed: 0,
  failed: 0,
  pending: 0,
  lastProcessedAt: null as string | null,
  processingTimes: [] as number[]
};

// Server-specific IMAP configuration interface
interface ServerIMAPConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  enabled: boolean;
}

// IMAP status tracking
let imapStatus = {
  status: 'stopped' as 'stopped' | 'starting' | 'running' | 'error',
  lastError: null as string | null,
  connectedAt: null as string | null,
  stats: {
    totalEmails: 0,
    processedEmails: 0,
    failedEmails: 0,
    lastCheckAt: null as string | null
  }
};

/**
 * Initialize Winston logger with production configuration
 */
function initializeLogger(): winston.Logger {
  const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  );

  const transports: winston.transport[] = [
    new winston.transports.Console({
      level: LOG_LEVEL,
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ];

  // Add file logging in production
  if (NODE_ENV === 'production') {
    transports.push(
      new winston.transports.DailyRotateFile({
        filename: 'logs/email-api-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        level: 'info',
        format: logFormat
      }),
      new winston.transports.DailyRotateFile({
        filename: 'logs/email-api-error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '30d',
        level: 'error',
        format: logFormat
      })
    );
  }

  return winston.createLogger({
    level: LOG_LEVEL,
    format: logFormat,
    transports,
    exitOnError: false
  });
}

/**
 * Create standardized API response
 */
function createResponse<T>(
  data: T | null = null,
  success: boolean = true,
  requestId?: string,
  error?: string
): APIResponse<T> {
  return {
    data: data || undefined,
    error,
    success,
    timestamp: new Date().toISOString(),
    requestId
  };
}

/**
 * Initialize IMAP service using direct ImapFlow connection
 */
async function initializeIMAPService(): Promise<boolean> {
  try {
    // Get IMAP configuration from environment
    const config: ServerIMAPConfig = {
      host: process.env.IMAP_HOST || '',
      port: parseInt(process.env.IMAP_PORT || '993'),
      secure: process.env.IMAP_SECURE !== 'false',
      username: process.env.IMAP_USERNAME || '',
      password: process.env.IMAP_PASSWORD || '',
      enabled: process.env.IMAP_ENABLED === 'true'
    };
    
    if (!config.enabled || !config.host || !config.username || !config.password) {
      logger.warn('IMAP configuration incomplete, running in email-only mode');
      imapStatus.status = 'stopped';
      return false;
    }

    // Initialize IMAP client
    imapStatus.status = 'starting';
    imapClient = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.username,
        pass: config.password
      },
      logger: false
    });

    // Test connection
    await imapClient.connect();
    await imapClient.logout();
    
    imapStatus.status = 'running';
    imapStatus.connectedAt = new Date().toISOString();
    imapStatus.lastError = null;
    
    logger.info('IMAP service initialized successfully', {
      host: config.host,
      port: config.port,
      username: config.username
    });
    
    return true;
  } catch (error) {
    imapStatus.status = 'error';
    imapStatus.lastError = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to initialize IMAP service:', error);
    return false;
  }
}

/**
 * Process email content (simplified version)
 */
async function processEmailContent(emailRequest: EmailProcessRequest): Promise<EmailProcessResponse> {
  const startTime = Date.now();
  processingStats.pending++;

  try {
    // Simplified email processing logic
    // In a real implementation, this would use actual parsing services
    const { emailContent, fromEmail, subject } = emailRequest;
    
    // Basic symbol extraction (placeholder)
    const symbolMatch = emailContent.match(/\b[A-Z]{1,5}\b/);
    const quantityMatch = emailContent.match(/(\d+(?:\.\d+)?)\s*shares?/i);
    const priceMatch = emailContent.match(/\$(\d+(?:\.\d+)?)/);
    
    if (!symbolMatch) {
      throw new Error('No symbol found in email content');
    }

    const result = {
      symbol: symbolMatch[0],
      type: emailContent.toLowerCase().includes('buy') ? 'buy' : 'sell',
      quantity: quantityMatch ? parseFloat(quantityMatch[1]) : 0,
      price: priceMatch ? parseFloat(priceMatch[1]) : 0,
      date: new Date().toISOString(),
      confidence: 0.8
    };

    const processingTime = Date.now() - startTime;
    processingStats.processingTimes.push(processingTime);
    processingStats.successfullyProcessed++;
    processingStats.lastProcessedAt = new Date().toISOString();

    logger.info('Email processed successfully', { 
      symbol: result.symbol, 
      processingTime,
      fromEmail 
    });

    return {
      success: true,
      message: 'Email processed successfully',
      data: result
    };
  } catch (error) {
    processingStats.failed++;
    logger.error('Email processing failed:', error);
    
    return {
      success: false,
      message: 'Email processing failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  } finally {
    processingStats.pending--;
    processingStats.totalProcessed++;
  }
}

/**
 * Get IMAP service status
 */
function getIMAPServiceStatus(): IMAPServiceStatus {
  if (!imapClient) {
    return {
      status: 'stopped',
      message: 'IMAP service not initialized or configured'
    };
  }

  return {
    status: 'running',
    message: 'IMAP service is operational',
    lastConnection: new Date().toISOString(),
    messagesProcessed: processingStats.totalProcessed,
    errors: []
  };
}

/**
 * Get processing statistics
 */
function getProcessingStats(): ProcessingStatsResponse {
  const avgTime = processingStats.processingTimes.length > 0
    ? processingStats.processingTimes.reduce((a, b) => a + b, 0) / processingStats.processingTimes.length
    : undefined;

  return {
    totalProcessed: processingStats.totalProcessed,
    successfullyProcessed: processingStats.successfullyProcessed,
    failed: processingStats.failed,
    pending: processingStats.pending,
    lastProcessedAt: processingStats.lastProcessedAt || undefined,
    averageProcessingTime: avgTime
  };
}

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.requestId = requestId;
  
  logger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });
  
  next();
});

// Health check endpoint
app.get('/health', async (req, res) => {
  const requestId = req.requestId;
  
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      environment: NODE_ENV,
      services: {
        imap: imapClient ? 'configured' : 'not_configured',
        imapStatus: imapStatus.status,
        monitoring: serviceMonitor ? 'active' : 'inactive',
        emailProcessing: 'available'
      },
      endpoints: {
        email: {
          'POST /api/email/process': 'Process single email',
          'GET /api/email/stats': 'Get processing statistics'
        },
        management: {
          'GET /api/email/import/jobs': 'List import jobs',
          'POST /api/email/import/jobs': 'Create import job',
          'GET /api/email/review/queue': 'Get review queue'
        },
        imap: {
          'GET /api/imap/status': 'Get IMAP service status',
          'POST /api/imap/start': 'Start IMAP service',
          'POST /api/imap/stop': 'Stop IMAP service',
          'POST /api/imap/restart': 'Restart IMAP service',
          'POST /api/imap/process-now': 'Process emails manually'
        }
      }
    };

    logger.info('Health check performed', { requestId, status: 'healthy' });
    res.json(createResponse(health, true, requestId));
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(500).json(createResponse(null, false, requestId, 'Health check failed'));
  }
});

// Process single email
app.post('/api/process-email', async (req, res) => {
  const requestId = req.requestId;
  
  try {
    const emailRequest: EmailProcessRequest = req.body;
    
    if (!emailRequest.emailContent || !emailRequest.fromEmail) {
      return res.status(400).json(createResponse(
        null,
        false,
        requestId,
        'Missing required fields: emailContent, fromEmail'
      ));
    }

    const result = await processEmailContent(emailRequest);
    
    if (result.success) {
      res.json(createResponse(result, true, requestId));
    } else {
      res.status(422).json(createResponse(result, false, requestId, result.error));
    }
  } catch (error) {
    logger.error('Process email endpoint error:', error);
    res.status(500).json(createResponse(
      null,
      false,
      requestId,
      'Internal server error during email processing'
    ));
  }
});

// Get IMAP service status using direct status tracking
app.get('/api/imap/status', async (req, res) => {
  const requestId = req.requestId;
  
  try {
    const statusData = {
      status: imapStatus.status,
      healthy: imapStatus.status === 'running',
      uptime: imapStatus.connectedAt ? 
        Math.floor((Date.now() - new Date(imapStatus.connectedAt).getTime()) / 1000) : 0,
      lastError: imapStatus.lastError,
      stats: imapStatus.stats
    };

    res.json(createResponse(statusData, true, requestId));
  } catch (error) {
    logger.error('IMAP status endpoint error:', error);
    res.status(500).json(createResponse(
      null,
      false,
      requestId,
      'Failed to get IMAP service status'
    ));
  }
});

// Get processing statistics
app.get('/api/stats', (req, res) => {
  const requestId = req.requestId;
  
  try {
    const stats = getProcessingStats();
    res.json(createResponse(stats, true, requestId));
  } catch (error) {
    logger.error('Stats endpoint error:', error);
    res.status(500).json(createResponse(
      null,
      false,
      requestId,
      'Failed to get processing statistics'
    ));
  }
});

// IMAP service management endpoints
app.post('/api/imap/start', async (req, res) => {
  const requestId = req.requestId;
  
  try {
    if (imapStatus.status === 'running') {
      return res.json(createResponse({
        status: 'running',
        message: 'IMAP service is already running'
      }, true, requestId));
    }

    const initialized = await initializeIMAPService();
    if (!initialized) {
      return res.status(500).json(createResponse(
        null,
        false,
        requestId,
        'Failed to initialize IMAP service'
      ));
    }

    res.json(createResponse({
      status: imapStatus.status,
      message: 'IMAP service started successfully'
    }, true, requestId));
  } catch (error) {
    logger.error('IMAP start endpoint error:', error);
    res.status(500).json(createResponse(
      null,
      false,
      requestId,
      'Error starting IMAP service'
    ));
  }
});

app.post('/api/imap/stop', async (req, res) => {
  const requestId = req.requestId;
  
  try {
    if (imapClient) {
      await imapClient.logout();
      imapClient = null;
    }
    
    imapStatus.status = 'stopped';
    imapStatus.connectedAt = null;

    res.json(createResponse({
      status: 'stopped',
      message: 'IMAP service stopped successfully'
    }, true, requestId));
  } catch (error) {
    logger.error('IMAP stop endpoint error:', error);
    res.status(500).json(createResponse(
      null,
      false,
      requestId,
      'Error stopping IMAP service'
    ));
  }
});

app.post('/api/imap/restart', async (req, res) => {
  const requestId = req.requestId;
  
  try {
    // Stop first
    if (imapClient) {
      await imapClient.logout();
      imapClient = null;
    }
    
    // Start again
    const initialized = await initializeIMAPService();
    if (!initialized) {
      return res.status(500).json(createResponse(
        null,
        false,
        requestId,
        'Failed to restart IMAP service'
      ));
    }

    res.json(createResponse({
      status: imapStatus.status,
      message: 'IMAP service restarted successfully'
    }, true, requestId));
  } catch (error) {
    logger.error('IMAP restart endpoint error:', error);
    res.status(500).json(createResponse(
      null,
      false,
      requestId,
      'Error restarting IMAP service'
    ));
  }
});

app.post('/api/imap/process-now', async (req, res) => {
  const requestId = req.requestId;
  
  try {
    // Simple implementation - just return success for now
    res.json(createResponse({
      processed: 0,
      message: 'Manual email processing triggered (placeholder implementation)'
    }, true, requestId));
  } catch (error) {
    logger.error('IMAP process-now endpoint error:', error);
    res.status(500).json(createResponse(
      null,
      false,
      requestId,
      'Error processing emails manually'
    ));
  }
});

// Email Management API endpoints - simplified mock implementations
app.get('/api/email/import/jobs', async (req, res) => {
  const requestId = req.requestId;
  
  try {
    // Return empty list for now
    res.json(createResponse({
      jobs: [],
      total: 0,
      page: 1,
      pageSize: 20
    }, true, requestId));
  } catch (error) {
    logger.error('Import jobs endpoint error:', error);
    res.status(500).json(createResponse(
      null,
      false,
      requestId,
      'Error retrieving import jobs'
    ));
  }
});

app.post('/api/email/import/jobs', async (req, res) => {
  const requestId = req.requestId;
  
  try {
    // Simple mock implementation
    res.status(201).json(createResponse({
      id: Date.now(),
      status: 'created',
      message: 'Import job created (placeholder implementation)'
    }, true, requestId));
  } catch (error) {
    logger.error('Create import job endpoint error:', error);
    res.status(500).json(createResponse(
      null,
      false,
      requestId,
      'Error creating import job'
    ));
  }
});

app.get('/api/email/review/queue', async (req, res) => {
  const requestId = req.requestId;
  
  try {
    // Return empty queue for now
    res.json(createResponse({
      queue: [],
      total: 0,
      page: 1,
      pageSize: 20
    }, true, requestId));
  } catch (error) {
    logger.error('Review queue endpoint error:', error);
    res.status(500).json(createResponse(
      null,
      false,
      requestId,
      'Error retrieving review queue'
    ));
  }
});

app.post('/api/email/process', async (req, res) => {
  const requestId = req.requestId;
  
  try {
    const result = await processEmailContent(req.body);
    
    if (result.success) {
      res.json(createResponse(result, true, requestId));
    } else {
      res.status(422).json(createResponse(
        null,
        false,
        requestId,
        result.error || 'Failed to process email'
      ));
    }
  } catch (error) {
    logger.error('Process email endpoint error:', error);
    res.status(500).json(createResponse(
      null,
      false,
      requestId,
      'Error processing email'
    ));
  }
});

app.get('/api/email/stats', async (req, res) => {
  const requestId = req.requestId;
  
  try {
    res.json(createResponse({
      totalProcessed: processingStats.totalProcessed,
      successful: processingStats.successfullyProcessed,
      failed: processingStats.failed,
      duplicates: 0,
      reviewRequired: processingStats.pending,
      averageProcessingTime: processingStats.processingTimes.length > 0 ?
        processingStats.processingTimes.reduce((a, b) => a + b, 0) / processingStats.processingTimes.length : 0,
      lastProcessedAt: processingStats.lastProcessedAt
    }, true, requestId));
  } catch (error) {
    logger.error('Email stats endpoint error:', error);
    res.status(500).json(createResponse(
      null,
      false,
      requestId,
      'Error retrieving email statistics'
    ));
  }
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  const requestId = req.requestId;
  
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    requestId,
    url: req.url,
    method: req.method
  });

  res.status(500).json(createResponse(
    null,
    false,
    requestId,
    'Internal server error'
  ));
});

// 404 handler
app.use('*', (req, res) => {
  const requestId = req.requestId;
  res.status(404).json(createResponse(
    null,
    false,
    requestId,
    'Endpoint not found'
  ));
});

/**
 * Initialize and start the server
 */
async function startServer() {
  logger = initializeLogger();
  
  logger.info('Starting Enhanced Email Processing API Server', {
    version: '2.0.0',
    environment: NODE_ENV,
    port: PORT,
    logLevel: LOG_LEVEL
  });

  try {
    // Initialize monitoring
    serviceMonitor = new ServiceMonitor({
      enabled: true,
      healthCheckInterval: 30000,
      memoryThreshold: 512,
      cpuThreshold: 80,
      diskThreshold: 85,
      errorThreshold: 10,
      autoRestart: false,
      maxRestarts: 3,
      restartDelay: 5000
    });
    
    // Initialize IMAP if configured
    if (process.env.IMAP_ENABLED !== 'false') {
      await initializeIMAPService();
    }

    // Start server
    const server = app.listen(PORT, () => {
      logger.info(`🚀 Enhanced Email Processing API Server running on port ${PORT}`);
      logger.info(`📧 IMAP Service: ${imapClient ? 'Enabled' : 'Disabled/Not Configured'}`);
      logger.info(`📊 Monitoring: ${serviceMonitor ? 'Active' : 'Inactive'}`);
      logger.info(`🌍 Environment: ${NODE_ENV}`);
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      
      server.close(async () => {
        try {
          if (imapClient) {
            await imapClient.logout();
            logger.info('IMAP connection closed');
          }
          
          logger.info('Server shutdown complete');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Type augmentation for Express request
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

// Start the server
if (require.main === module) {
  startServer().catch((error) => {
    console.error('Fatal error starting server:', error);
    process.exit(1);
  });
}

export default app;
