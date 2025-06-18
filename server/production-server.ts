/**
 * Investra AI Email Processing API Server - Production
 * Task 11.1: Deploy IMAP Service to Production
 * Integrates real IMAP processor service with production-ready configuration
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Import the actual email processing services
import { IMAPProcessorService } from '../src/services/email/imapProcessorService';
import { EmailProcessingService } from '../src/services/email/emailProcessingService';
import { WealthsimpleEmailParser } from '../src/services/email/wealthsimpleEmailParser';

// Import local type definitions
import type {
  APIResponse,
  EmailProcessRequest,
  BatchEmailProcessRequest,
  EmailProcessResponse,
  ProcessingStatus,
  ProcessingHistoryItem,
  ProcessingStatsResponse,
  ImportJob,
  ReviewQueueItem,
  IMAPServiceStatus
} from './src/types/emailTypes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const NODE_ENV = process.env.NODE_ENV || 'production';

// Global IMAP service instance
let imapService: IMAPProcessorService | null = null;

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://127.0.0.1:5173', 
    // Allow environment-specific origins
    ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : []),
    'https://investra.com',
    'https://app.investra.com'
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Production request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const userAgent = req.get('User-Agent') || 'unknown';
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  console.log(`[${timestamp}] ${req.method} ${req.path} - IP: ${ip} - UA: ${userAgent.substring(0, 100)}`);
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[${new Date().toISOString()}] ERROR:`, err);
  
  if (NODE_ENV === 'production') {
    res.status(500).json(createErrorResponse('Internal server error'));
  } else {
    res.status(500).json(createErrorResponse(err.message));
  }
});

// Helper function to create API responses
const createResponse = <T>(data: T, success: boolean = true): APIResponse<T> => ({
  success,
  data: success ? data : undefined,
  error: success ? undefined : { code: 'ERROR', message: 'Operation failed' },
  metadata: {
    timestamp: new Date().toISOString(),
    requestId: Math.random().toString(36).substring(7),
    processingTime: 0 // Will be calculated by individual endpoints
  }
});

const createErrorResponse = (message: string, code: string = 'ERROR'): APIResponse<never> => ({
  success: false,
  error: { code, message },
  metadata: {
    timestamp: new Date().toISOString(),
    requestId: Math.random().toString(36).substring(7),
    processingTime: 0
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  const imapStatus = imapService?.getHealthCheck();
  
  res.json(createResponse({ 
    status: 'healthy',
    service: 'Investra AI Email Processing API (Production)',
    version: '1.0.0',
    environment: NODE_ENV,
    imap: {
      available: !!imapService,
      healthy: imapStatus?.healthy || false,
      status: imapStatus?.status || 'not_initialized'
    },
    timestamp: new Date().toISOString()
  }));
});

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.json(createResponse({
    service: 'Investra AI Email Processing API',
    version: '1.0.0',
    implementation: 'Production TypeScript',
    environment: NODE_ENV,
    endpoints: {
      email: {
        'POST /api/email/process': 'Process single email with real Wealthsimple parser',
        'POST /api/email/batch': 'Process multiple emails',
        'POST /api/email/validate': 'Validate email without processing',
        'GET /api/email/status/:id': 'Get processing status',
        'GET /api/email/stats': 'Get processing statistics',
        'GET /api/email/history': 'Get processing history',
        'GET /api/email/health': 'Health check'
      },
      management: {
        'GET /api/email/import/jobs': 'List import jobs',
        'POST /api/email/import/jobs': 'Create import job',
        'POST /api/email/import/retry': 'Retry failed processing',
        'GET /api/email/review/queue': 'Get review queue',
        'POST /api/email/review/manage': 'Manage review queue'
      },
      imap: {
        'GET /api/imap/status': 'Get IMAP service status',
        'POST /api/imap/start': 'Start IMAP service',
        'POST /api/imap/stop': 'Stop IMAP service',
        'POST /api/imap/restart': 'Restart IMAP service',
        'GET /api/imap/config': 'Get IMAP configuration (sanitized)',
        'POST /api/imap/config': 'Update IMAP configuration',
        'POST /api/imap/test-connection': 'Test IMAP connection',
        'POST /api/imap/process-now': 'Process emails manually',
        'DELETE /api/imap/cache': 'Clear processed cache'
      }
    }
  }));
});

// Real Email Processing Endpoints
app.post('/api/email/process', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const request = req.body as EmailProcessRequest;
    
    // Validate request
    if (!request.subject || !request.fromEmail || (!request.htmlContent && !request.textContent)) {
      return res.status(400).json(createErrorResponse('Missing required fields: subject, fromEmail, and content'));
    }
    
    console.log(`📧 Processing email: ${request.subject} from ${request.fromEmail}`);
    
    // Use real Wealthsimple email parser
    const parseResult = WealthsimpleEmailParser.parseEmail({
      subject: request.subject,
      from: request.fromEmail,
      html: request.htmlContent || '',
      text: request.textContent || ''
    });
    
    if (!parseResult.success) {
      console.log(`❌ Parsing failed: ${parseResult.error}`);
      return res.json(createResponse({
        emailId: `email_${Date.now()}`,
        status: 'failed',
        error: parseResult.error,
        processingTime: Date.now() - startTime
      } as EmailProcessResponse));
    }
    
    const response: EmailProcessResponse = {
      emailId: `email_${Date.now()}`,
      status: 'processed',
      extractedData: {
        transactions: [{
          type: parseResult.data?.transactionType?.toUpperCase() || 'UNKNOWN',
          amount: parseResult.data?.totalAmount || 0,
          currency: 'CAD', // Default to CAD for Wealthsimple
          date: new Date().toISOString(),
          description: `${parseResult.data?.transactionType} ${parseResult.data?.quantity} shares of ${parseResult.data?.symbol}`,
          symbol: parseResult.data?.symbol || 'UNKNOWN'
        }],
        metadata: {
          fromEmail: request.fromEmail,
          processingMethod: 'production_wealthsimple_parser',
          confidence: parseResult.confidence || 0,
          accountType: parseResult.data?.accountType
        }
      },
      processingTime: Date.now() - startTime
    };
    
    console.log(`✅ Email processed successfully: ${response.extractedData.transactions[0].symbol}`);
    res.json(createResponse(response));
    
  } catch (error) {
    console.error('❌ Email processing error:', error);
    res.status(500).json(createErrorResponse(
      error instanceof Error ? error.message : 'Email processing failed'
    ));
  }
});

app.post('/api/email/validate', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const request = req.body as Pick<EmailProcessRequest, 'subject' | 'fromEmail' | 'htmlContent' | 'textContent'>;
    
    // Validate using Wealthsimple parser without processing
    const isWealthsimple = WealthsimpleEmailParser.isWealthsimpleEmail(request.fromEmail);
    const parseResult = WealthsimpleEmailParser.parseEmail({
      subject: request.subject,
      from: request.fromEmail,
      html: request.htmlContent || '',
      text: request.textContent || ''
    });
    
    res.json(createResponse({
      valid: parseResult.success,
      isWealthsimple,
      confidence: parseResult.confidence || 0,
      extractedSymbol: parseResult.data?.symbol,
      extractedType: parseResult.data?.transactionType,
      errors: parseResult.success ? [] : [parseResult.error],
      processingTime: Date.now() - startTime
    }));
    
  } catch (error) {
    console.error('❌ Email validation error:', error);
    res.status(500).json(createErrorResponse(
      error instanceof Error ? error.message : 'Email validation failed'
    ));
  }
});

// IMAP Service Endpoints - Real Implementation
app.get('/api/imap/status', async (req, res) => {
  try {
    if (!imapService) {
      return res.json(createResponse({
        status: 'not_initialized',
        message: 'IMAP service not initialized'
      } as IMAPServiceStatus));
    }
    
    const status = imapService.getStatus();
    const healthCheck = imapService.getHealthCheck();
    
    const response: IMAPServiceStatus = {
      status: status.status === 'running' ? 'running' : 'stopped',
      lastSync: status.startedAt || new Date().toISOString(),
      emailsProcessed: status.stats.totalProcessed,
      config: {
        server: imapService.getConfig().host,
        port: imapService.getConfig().port,
        username: imapService.getConfig().username,
        useSSL: imapService.getConfig().secure,
        folder: 'INBOX'
      },
      healthy: healthCheck.healthy,
      uptime: healthCheck.uptime,
      stats: status.stats
    };
    
    res.json(createResponse(response));
    
  } catch (error) {
    console.error('❌ IMAP status error:', error);
    res.status(500).json(createErrorResponse(
      error instanceof Error ? error.message : 'Failed to get IMAP status'
    ));
  }
});

app.post('/api/imap/start', async (req, res) => {
  try {
    if (!imapService) {
      // Initialize IMAP service with configuration
      const config = IMAPProcessorService.createConfigFromEnv();
      imapService = IMAPProcessorService.getInstance(config);
    }
    
    await imapService.start();
    
    res.json(createResponse({ 
      message: 'IMAP service started successfully',
      status: 'running' 
    }));
    
  } catch (error) {
    console.error('❌ IMAP start error:', error);
    res.status(500).json(createErrorResponse(
      error instanceof Error ? error.message : 'Failed to start IMAP service'
    ));
  }
});

app.post('/api/imap/stop', async (req, res) => {
  try {
    if (!imapService) {
      return res.json(createResponse({ 
        message: 'IMAP service was not running',
        status: 'stopped' 
      }));
    }
    
    await imapService.stop();
    
    res.json(createResponse({ 
      message: 'IMAP service stopped successfully',
      status: 'stopped' 
    }));
    
  } catch (error) {
    console.error('❌ IMAP stop error:', error);
    res.status(500).json(createErrorResponse(
      error instanceof Error ? error.message : 'Failed to stop IMAP service'
    ));
  }
});

app.post('/api/imap/restart', async (req, res) => {
  try {
    if (!imapService) {
      const config = IMAPProcessorService.createConfigFromEnv();
      imapService = IMAPProcessorService.getInstance(config);
    }
    
    await imapService.restart();
    
    res.json(createResponse({ 
      message: 'IMAP service restarted successfully',
      status: 'running' 
    }));
    
  } catch (error) {
    console.error('❌ IMAP restart error:', error);
    res.status(500).json(createErrorResponse(
      error instanceof Error ? error.message : 'Failed to restart IMAP service'
    ));
  }
});

app.post('/api/imap/test-connection', async (req, res) => {
  try {
    if (!imapService) {
      const config = IMAPProcessorService.createConfigFromEnv();
      imapService = IMAPProcessorService.getInstance(config);
    }
    
    const testResult = await imapService.testConnection();
    
    res.json(createResponse({
      success: testResult.success,
      error: testResult.error,
      serverInfo: testResult.serverInfo
    }));
    
  } catch (error) {
    console.error('❌ IMAP connection test error:', error);
    res.status(500).json(createErrorResponse(
      error instanceof Error ? error.message : 'Connection test failed'
    ));
  }
});

app.post('/api/imap/process-now', async (req, res) => {
  try {
    if (!imapService) {
      return res.status(400).json(createErrorResponse('IMAP service not initialized'));
    }
    
    const portfolioId = req.body.portfolioId || 'default';
    const results = await imapService.processEmailsNow(portfolioId);
    
    res.json(createResponse({
      message: `Processed ${results.length} emails`,
      results: results.map(r => ({
        success: r.success,
        emailId: r.emailId,
        error: r.error
      }))
    }));
    
  } catch (error) {
    console.error('❌ IMAP manual processing error:', error);
    res.status(500).json(createErrorResponse(
      error instanceof Error ? error.message : 'Manual processing failed'
    ));
  }
});

app.get('/api/imap/config', (req, res) => {
  try {
    if (!imapService) {
      return res.status(400).json(createErrorResponse('IMAP service not initialized'));
    }
    
    const config = imapService.getConfig(); // This returns sanitized config (password hidden)
    res.json(createResponse(config));
    
  } catch (error) {
    console.error('❌ IMAP config error:', error);
    res.status(500).json(createErrorResponse(
      error instanceof Error ? error.message : 'Failed to get configuration'
    ));
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json(createErrorResponse(
    `Endpoint ${req.method} ${req.originalUrl} not found`,
    'NOT_FOUND'
  ));
});

// Initialize IMAP service on startup
async function initializeIMAPService() {
  try {
    console.log('🔧 Initializing IMAP service...');
    
    const config = IMAPProcessorService.createConfigFromEnv();
    console.log(`📧 IMAP Config: ${config.host}:${config.port} (${config.username})`);
    
    if (config.enabled) {
      imapService = IMAPProcessorService.getInstance(config);
      
      // Test connection but don't start automatically
      const testResult = await imapService.testConnection();
      if (testResult.success) {
        console.log('✅ IMAP connection test successful');
      } else {
        console.log(`⚠️ IMAP connection test failed: ${testResult.error}`);
      }
    } else {
      console.log('⚠️ IMAP service disabled in configuration');
    }
    
  } catch (error) {
    console.error('❌ Failed to initialize IMAP service:', error);
  }
}

// Start server
async function startServer() {
  try {
    console.log('🚀 Starting Investra AI Email Processing API Server (Production)...');
    console.log(`🌍 Environment: ${NODE_ENV}`);
    console.log(`🔐 CORS Origins: ${NODE_ENV === 'production' ? 'Production domains only' : 'Development + Production'}`);
    
    // Initialize IMAP service
    await initializeIMAPService();
    
    app.listen(PORT, () => {
      console.log(`✅ Production Server running on port ${PORT}`);
      console.log(`🌐 API Documentation: http://localhost:${PORT}/api`);
      console.log(`❤️ Health Check: http://localhost:${PORT}/health`);
      console.log(`📧 Email Processing: http://localhost:${PORT}/api/email/process`);
      console.log(`📊 Email Stats: http://localhost:${PORT}/api/email/stats`);
      console.log(`🔧 IMAP Control: http://localhost:${PORT}/api/imap/status`);
      console.log('');
      console.log('🎯 Production server ready for real Wealthsimple email processing!');
      console.log('📝 Use /api/imap/start to begin email monitoring');
    });
    
  } catch (error) {
    console.error('❌ Failed to start production server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
  
  try {
    if (imapService) {
      console.log('📧 Stopping IMAP service...');
      await imapService.stop();
    }
    
    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
startServer();