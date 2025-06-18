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
import configurationAPIRoutes from './routes/configurationAPI';

// Import real email processing services
import { EmailProcessingService } from '../src/services/email/emailProcessingService';
import { WealthsimpleEmailParser } from '../src/services/email/wealthsimpleEmailParser';
import { ManualReviewQueue } from '../src/services/email/manualReviewQueue';
import { IMAPProcessorService } from '../src/services/email/imapProcessorService';
import { supabase } from '../src/lib/supabase';

// Server-specific email processing will be implemented with real services

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

// Configuration hot-reload functionality
let configurationCache: Map<string, any> = new Map();
let lastConfigUpdate: string | null = null;

/**
 * Reload configuration from database without server restart
 */
async function reloadConfiguration(): Promise<boolean> {
  try {
    logger.info('Reloading configuration from database...');
    
    // Fetch latest configurations
    const { data: configs, error } = await supabase
      .from('email_configurations')
      .select('*')
      .eq('is_active', true);

    if (error) {
      logger.error('Failed to reload configuration:', error);
      return false;
    }

    // Update configuration cache
    configurationCache.clear();
    configs?.forEach(config => {
      configurationCache.set(`${config.configuration_type}_${config.id}`, config);
    });

    lastConfigUpdate = new Date().toISOString();
    
    // Reinitialize IMAP if configuration changed
    const imapConfig = configs?.find(c => c.configuration_type === 'imap');
    if (imapConfig && imapClient) {
      logger.info('IMAP configuration changed, reinitializing...');
      await reinitializeIMAPService(imapConfig.configuration_data);
    }

    logger.info('Configuration reloaded successfully', {
      configCount: configs?.length || 0,
      lastUpdate: lastConfigUpdate
    });

    return true;
  } catch (error) {
    logger.error('Configuration reload failed:', error);
    return false;
  }
}

/**
 * Reinitialize IMAP service with new configuration
 */
async function reinitializeIMAPService(newConfig: any): Promise<void> {
  try {
    // Close existing connection
    if (imapClient) {
      await imapClient.logout();
      imapClient = null;
      imapStatus.status = 'stopped';
    }

    // Initialize with new configuration
    await initializeIMAPService();
    
    logger.info('IMAP service reinitialized with new configuration');
  } catch (error) {
    logger.error('Failed to reinitialize IMAP service:', error);
    imapStatus.status = 'error';
    imapStatus.lastError = error instanceof Error ? error.message : 'Unknown error';
  }
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
 * Process email content using real EmailProcessingService
 */
async function processEmailContent(emailRequest: EmailProcessRequest): Promise<EmailProcessResponse> {
  const startTime = Date.now();
  processingStats.pending++;

  try {
    logger.info('Processing email with real services', {
      subject: emailRequest.subject,
      fromEmail: emailRequest.fromEmail,
      hasContent: !!emailRequest.emailContent
    });

    // Use real EmailProcessingService to process the email
    const processingResult = await EmailProcessingService.processEmail(
      emailRequest.subject,
      emailRequest.fromEmail,
      emailRequest.emailContent,
      emailRequest.emailContent // textContent fallback
    );

    if (!processingResult.success) {
      throw new Error(processingResult.errors?.join(', ') || 'Email processing failed');
    }

    const processingTime = Date.now() - startTime;
    processingStats.processingTimes.push(processingTime);
    processingStats.successfullyProcessed++;
    processingStats.lastProcessedAt = new Date().toISOString();

    // Extract relevant data from processing result
    const emailData = processingResult.emailData;
    const symbolResult = processingResult.symbolResult;

    logger.info('Email processed successfully with real services', { 
      symbol: symbolResult?.symbol,
      confidence: symbolResult?.confidence,
      transactionCreated: processingResult.transactionCreated,
      processingTime
    });

    return {
      success: true,
      message: 'Email processed successfully',
      data: {
        symbol: symbolResult?.symbol || emailData?.symbol || 'Unknown',
        type: emailData?.transactionType || 'unknown',
        quantity: emailData?.quantity || 0,
        price: emailData?.price || 0,
        date: emailData?.transactionDate || new Date().toISOString(),
        confidence: symbolResult?.confidence || emailData?.confidence || 0
      }
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

// Configuration Management API Routes
app.use('/api/configuration', configurationAPIRoutes);

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
    logger.info('Manual email processing triggered via API', { requestId });
    
    // Use real IMAPProcessorService for manual processing
    if (imapClient) {
      // Get current IMAP configuration from database
      const { data: config, error } = await supabase
        .from('email_configurations')
        .select('*')
        .eq('configuration_type', 'imap')
        .eq('is_active', true)
        .single();

      if (error || !config) {
        logger.warn('No active IMAP configuration found', { error, requestId });
        return res.status(400).json(createResponse(
          null,
          false,
          requestId,
          'No active IMAP configuration found'
        ));
      }

      // Process emails using real IMAP processor
      const processor = new IMAPProcessorService(imapClient, {
        folder: config.configuration_data.folder || 'INBOX',
        batchSize: 10,
        processingOptions: {
          markAsRead: config.configuration_data.mark_as_read || false,
          archiveProcessed: config.configuration_data.archive_processed || false
        }
      });

      const results = await processor.processNewEmails();
      
      // Update processing stats
      processingStats.totalProcessed += results.totalProcessed;
      processingStats.successfullyProcessed += results.successful;
      processingStats.failed += results.failed;
      processingStats.lastProcessedAt = new Date().toISOString();

      logger.info('Manual IMAP processing completed', {
        requestId,
        results,
        totalProcessed: results.totalProcessed
      });

      res.json(createResponse({
        processed: results.totalProcessed,
        successful: results.successful,
        failed: results.failed,
        message: `Successfully processed ${results.totalProcessed} emails`,
        details: results
      }, true, requestId));
    } else {
      res.status(503).json(createResponse(
        { processed: 0, message: 'IMAP service not available' },
        false,
        requestId,
        'IMAP service not initialized'
      ));
    }
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

// Email Management API endpoints - integrated with real services
app.get('/api/email/import/jobs', async (req, res) => {
  const requestId = req.requestId;
  
  try {
    // Use real database query for import jobs
    const { data: jobs, error } = await supabase
      .from('email_processing_logs')
      .select('*')
      .eq('processing_type', 'batch_import')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    res.json(createResponse({
      jobs: jobs || [],
      total: jobs?.length || 0,
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
    const { email_count, source_type = 'manual', configuration_id } = req.body;
    
    // Create real import job in database
    const { data: job, error } = await supabase
      .from('email_processing_logs')
      .insert([{
        processing_type: 'batch_import',
        status: 'pending',
        email_count: email_count || 0,
        source_type,
        configuration_id,
        user_id: 'system', // TODO: get from auth context
        metadata: { 
          request_id: requestId,
          created_via: 'api'
        }
      }])
      .select()
      .single();

    if (error) {
      throw error;
    }

    res.status(201).json(createResponse({
      id: job.id,
      status: job.status,
      message: 'Import job created successfully',
      job
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
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    
    // Use real ManualReviewQueue to get queue items
    const queueItems = ManualReviewQueue.getQueueItems(
      { status: 'pending' },
      'priority',
      'desc',
      pageSize,
      (page - 1) * pageSize
    );

    const queueStats = ManualReviewQueue.getQueueStats();

    res.json(createResponse({
      queue: queueItems,
      total: queueStats.total,
      page,
      pageSize,
      stats: queueStats
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

// Get processing queue (active/pending processing jobs)
app.get('/api/email/processing/queue', async (req, res) => {
  const requestId = req.requestId;
  
  try {
    // Get real processing queue from database
    const { data: processingJobs, error } = await supabase
      .from('email_processing_logs')
      .select('*')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    const queueItems = (processingJobs || []).map(job => ({
      id: job.id,
      status: job.status,
      emailSubject: job.metadata?.email_subject || 'Unknown Subject',
      fromEmail: job.metadata?.from_email || 'Unknown Sender',
      progress: {
        current: job.status === 'completed' ? 4 : job.status === 'processing' ? 2 : 0,
        total: 4,
        percentage: job.status === 'completed' ? 100 : job.status === 'processing' ? 50 : 0
      },
      stages: {
        parsing: job.status === 'completed' || job.status === 'processing' ? 'completed' : 'pending',
        duplicateCheck: job.status === 'completed' ? 'completed' : 'pending',
        symbolProcessing: job.status === 'completed' ? 'completed' : 'pending',
        transactionCreation: job.status === 'completed' ? 'completed' : 'pending'
      },
      timestamps: {
        startedAt: job.created_at,
        completedAt: job.status === 'completed' ? job.updated_at : undefined,
        lastUpdatedAt: job.updated_at
      },
      errors: job.error_details ? [job.error_details] : []
    }));

    res.json(createResponse(queueItems, true, requestId));
  } catch (error) {
    logger.error('Processing queue endpoint error:', error);
    res.status(500).json(createResponse(
      null,
      false,
      requestId,
      'Error retrieving processing queue'
    ));
  }
});

// Review queue management endpoints
app.post('/api/email/review/queue/:id/claim', async (req, res) => {
  const requestId = req.requestId;
  const { id } = req.params;
  const { reviewerId } = req.body;
  
  try {
    const success = await ManualReviewQueue.claimForReview(id, reviewerId || 'system');
    
    if (success) {
      const item = ManualReviewQueue.getQueueItem(id);
      res.json(createResponse({
        success: true,
        message: 'Item claimed for review',
        item
      }, true, requestId));
    } else {
      res.status(404).json(createResponse(
        null,
        false,
        requestId,
        'Item not found or not available for claim'
      ));
    }
  } catch (error) {
    logger.error('Claim review item error:', error);
    res.status(500).json(createResponse(
      null,
      false,
      requestId,
      'Error claiming review item'
    ));
  }
});

app.post('/api/email/review/queue/:id/action', async (req, res) => {
  const requestId = req.requestId;
  const { id } = req.params;
  const action = req.body;
  
  try {
    const result = await ManualReviewQueue.processReviewAction(id, action);
    
    if (result.success) {
      res.json(createResponse({
        success: true,
        message: 'Review action processed successfully',
        item: result.item
      }, true, requestId));
    } else {
      res.status(400).json(createResponse(
        null,
        false,
        requestId,
        result.error || 'Failed to process review action'
      ));
    }
  } catch (error) {
    logger.error('Process review action error:', error);
    res.status(500).json(createResponse(
      null,
      false,
      requestId,
      'Error processing review action'
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
    // Get real processing stats from database and services
    const { data: processingLogs, error } = await supabase
      .from('email_processing_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    // Get queue stats from ManualReviewQueue
    const queueStats = ManualReviewQueue.getQueueStats();
    
    // Calculate real stats from database
    const logs = processingLogs || [];
    const successful = logs.filter(log => log.status === 'completed').length;
    const failed = logs.filter(log => log.status === 'failed').length;
    const lastProcessedLog = logs.find(log => log.status === 'completed');
    
    const avgProcessingTime = logs.length > 0 
      ? logs.reduce((sum, log) => sum + (log.processing_time || 0), 0) / logs.length
      : processingStats.processingTimes.length > 0 
        ? processingStats.processingTimes.reduce((a, b) => a + b, 0) / processingStats.processingTimes.length 
        : 0;

    res.json(createResponse({
      // Real database stats
      totalProcessed: logs.length || processingStats.totalProcessed,
      successful: successful || processingStats.successfullyProcessed,
      failed: failed || processingStats.failed,
      
      // Queue stats from ManualReviewQueue
      duplicates: queueStats.byPriority.high + queueStats.byPriority.urgent, // Approximate duplicates as high priority items
      reviewRequired: queueStats.byStatus.pending + queueStats.byStatus['in-review'],
      
      // Performance metrics
      averageProcessingTime: avgProcessingTime,
      lastProcessedAt: lastProcessedLog?.created_at || processingStats.lastProcessedAt,
      
      // Queue health metrics
      queueHealthScore: queueStats.queueHealthScore,
      throughputMetrics: queueStats.throughputMetrics
    }, true, requestId));
  } catch (error) {
    logger.error('Email stats endpoint error:', error);
    
    // Fallback to in-memory stats if database query fails
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
  }
});

// Configuration management endpoints
app.post('/api/configuration/reload', async (req, res) => {
  const requestId = req.requestId;
  
  try {
    logger.info('Configuration reload requested via API', { requestId });
    
    const success = await reloadConfiguration();
    
    if (success) {
      res.json(createResponse({
        success: true,
        message: 'Configuration reloaded successfully',
        lastUpdate: lastConfigUpdate,
        configCount: configurationCache.size
      }, true, requestId));
    } else {
      res.status(500).json(createResponse(
        null,
        false,
        requestId,
        'Failed to reload configuration'
      ));
    }
  } catch (error) {
    logger.error('Configuration reload endpoint error:', error);
    res.status(500).json(createResponse(
      null,
      false,
      requestId,
      'Error reloading configuration'
    ));
  }
});

app.get('/api/configuration/status', async (req, res) => {
  const requestId = req.requestId;
  
  try {
    res.json(createResponse({
      lastUpdate: lastConfigUpdate,
      configCount: configurationCache.size,
      configurations: Array.from(configurationCache.keys()),
      imapStatus: imapStatus.status,
      services: {
        imap: imapClient ? 'configured' : 'not_configured',
        monitoring: serviceMonitor ? 'active' : 'inactive'
      }
    }, true, requestId));
  } catch (error) {
    logger.error('Configuration status endpoint error:', error);
    res.status(500).json(createResponse(
      null,
      false,
      requestId,
      'Error retrieving configuration status'
    ));
  }
});

// Configuration management endpoints
app.post('/api/configuration/reload', async (req, res) => {
  const requestId = req.requestId;
  
  try {
    logger.info('Configuration reload requested via API', { requestId });
    
    const success = await reloadConfiguration();
    
    if (success) {
      res.json(createResponse({
        success: true,
        message: 'Configuration reloaded successfully',
        lastUpdate: lastConfigUpdate,
        configCount: configurationCache.size
      }, true, requestId));
    } else {
      res.status(500).json(createResponse(
        null,
        false,
        requestId,
        'Failed to reload configuration'
      ));
    }
  } catch (error) {
    logger.error('Configuration reload endpoint error:', error);
    res.status(500).json(createResponse(
      null,
      false,
      requestId,
      'Error reloading configuration'
    ));
  }
});

app.get('/api/configuration/status', async (req, res) => {
  const requestId = req.requestId;
  
  try {
    res.json(createResponse({
      lastUpdate: lastConfigUpdate,
      configCount: configurationCache.size,
      configurations: Array.from(configurationCache.keys()),
      imapStatus: imapStatus.status,
      services: {
        imap: imapClient ? 'configured' : 'not_configured',
        monitoring: serviceMonitor ? 'active' : 'inactive'
      }
    }, true, requestId));
  } catch (error) {
    logger.error('Configuration status endpoint error:', error);
    res.status(500).json(createResponse(
      null,
      false,
      requestId,
      'Error retrieving configuration status'
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

  logger.info('✅ Configuration Management API routes mounted at /api/configuration');

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
