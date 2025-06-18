/**
 * Investra AI Email Processing API Server
 * Deploys the existing TypeScript backend APIs as an Express server
 * Connects the sophisticated email processing system to the web interface
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Import email connection test route
import emailConnectionTestRoute from './routes/emailConnectionTest';

// Import the existing APIs
import { EmailProcessingAPI } from '../src/services/endpoints/emailProcessingAPI';
import { EmailStatusAPI } from '../src/services/endpoints/emailStatusAPI';
import { EmailManagementAPI } from '../src/services/endpoints/emailManagementAPI';
import { IMAPServiceAPI } from '../src/services/endpoints/imapServiceAPI';

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

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://127.0.0.1:5173',
    // Allow environment-specific origins
    ...(process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [])
  ],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Investra AI Email Processing API'
  });
});

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    service: 'Investra AI Email Processing API',
    version: '1.0.0',
    endpoints: {
      email: {
        'POST /api/email/process': 'Process single email',
        'POST /api/email/batch': 'Process multiple emails',
        'POST /api/email/validate': 'Validate email without processing',
        'GET /api/email/status/:id': 'Get processing status',
        'GET /api/email/status': 'Get multiple processing statuses',
        'GET /api/email/history': 'Get processing history',
        'GET /api/email/stats': 'Get processing statistics',
        'GET /api/email/health': 'Health check'
      },
      management: {
        'GET /api/email/import/jobs': 'List import jobs',
        'POST /api/email/import/jobs': 'Create import job',
        'GET /api/email/import/jobs/:id': 'Get specific import job',
        'PUT /api/email/import/jobs/:id/cancel': 'Cancel import job',
        'POST /api/email/import/retry': 'Retry failed processing',
        'GET /api/email/review/queue': 'Get review queue',
        'POST /api/email/review/manage': 'Manage review queue'
      },
      imap: {
        'GET /api/imap/status': 'Get IMAP service status',
        'POST /api/imap/start': 'Start IMAP service',
        'POST /api/imap/stop': 'Stop IMAP service',
        'POST /api/imap/restart': 'Restart IMAP service',
        'GET /api/imap/config': 'Get IMAP configuration',
        'POST /api/imap/config': 'Update IMAP configuration',
        'POST /api/imap/test-connection': 'Test IMAP connection',
        'POST /api/imap/process-now': 'Process emails manually',
        'DELETE /api/imap/cache': 'Clear processed cache'
      }
    }
  });
});

// Helper function to handle API responses
const handleAPIResponse = async (apiCall: Promise<any>, res: express.Response) => {
  try {
    const result = await apiCall;
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      },
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substring(7),
        processingTime: 0
      }
    });
  }
};

// Mount email connection test routes
app.use('/api/email', emailConnectionTestRoute);

// Email Processing API Routes
app.post('/api/email/process', async (req, res) => {
  await handleAPIResponse(EmailProcessingAPI.processEmail(req.body), res);
});

app.post('/api/email/batch', async (req, res) => {
  await handleAPIResponse(EmailProcessingAPI.processBatchEmails(req.body), res);
});

app.post('/api/email/validate', async (req, res) => {
  await handleAPIResponse(EmailProcessingAPI.validateEmail(req.body), res);
});

// Email Status API Routes
app.get('/api/email/status/:id', async (req, res) => {
  await handleAPIResponse(EmailStatusAPI.getProcessingStatus(req.params.id), res);
});

app.get('/api/email/status', async (req, res) => {
  const ids = req.query.ids as string;
  if (!ids) {
    return res.status(400).json({ error: 'ids parameter required' });
  }
  await handleAPIResponse(EmailStatusAPI.getMultipleProcessingStatus(ids.split(',')), res);
});

app.get('/api/email/history', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const filter = req.query.filter ? JSON.parse(req.query.filter as string) : undefined;
  await handleAPIResponse(EmailStatusAPI.getProcessingHistory(page, pageSize, filter), res);
});

app.get('/api/email/stats', async (req, res) => {
  await handleAPIResponse(EmailStatusAPI.getProcessingStats(), res);
});

app.get('/api/email/health', async (req, res) => {
  await handleAPIResponse(EmailStatusAPI.getHealthCheck(), res);
});

// Email Management API Routes
app.get('/api/email/import/jobs', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const filter = req.query.filter ? JSON.parse(req.query.filter as string) : undefined;
  await handleAPIResponse(EmailManagementAPI.getImportJobs(page, pageSize, filter), res);
});

app.post('/api/email/import/jobs', async (req, res) => {
  await handleAPIResponse(EmailManagementAPI.createImportJob(req.body), res);
});

app.get('/api/email/import/jobs/:id', async (req, res) => {
  await handleAPIResponse(EmailManagementAPI.getImportJob(req.params.id), res);
});

app.put('/api/email/import/jobs/:id/cancel', async (req, res) => {
  await handleAPIResponse(EmailManagementAPI.cancelImportJob(req.params.id), res);
});

app.post('/api/email/import/retry', async (req, res) => {
  await handleAPIResponse(EmailManagementAPI.retryProcessing(req.body), res);
});

app.get('/api/email/review/queue', async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 20;
  const filter = req.query.filter ? JSON.parse(req.query.filter as string) : undefined;
  await handleAPIResponse(EmailManagementAPI.getReviewQueue(page, pageSize, filter), res);
});

app.post('/api/email/review/manage', async (req, res) => {
  await handleAPIResponse(EmailManagementAPI.manageReviewQueue(req.body), res);
});

// IMAP Service API Routes
app.get('/api/imap/status', async (req, res) => {
  await handleAPIResponse(IMAPServiceAPI.getServiceStatus(), res);
});

app.post('/api/imap/start', async (req, res) => {
  await handleAPIResponse(IMAPServiceAPI.startService(), res);
});

app.post('/api/imap/stop', async (req, res) => {
  await handleAPIResponse(IMAPServiceAPI.stopService(), res);
});

app.post('/api/imap/restart', async (req, res) => {
  await handleAPIResponse(IMAPServiceAPI.restartService(), res);
});

app.get('/api/imap/config', async (req, res) => {
  await handleAPIResponse(IMAPServiceAPI.getServiceConfig(), res);
});

app.post('/api/imap/config', async (req, res) => {
  await handleAPIResponse(IMAPServiceAPI.updateServiceConfig(req.body), res);
});

app.post('/api/imap/test-connection', async (req, res) => {
  await handleAPIResponse(IMAPServiceAPI.testConnection(), res);
});

app.post('/api/imap/process-now', async (req, res) => {
  const portfolioId = req.body.portfolioId;
  await handleAPIResponse(IMAPServiceAPI.processEmailsNow(portfolioId), res);
});

app.delete('/api/imap/cache', async (req, res) => {
  await handleAPIResponse(IMAPServiceAPI.clearProcessedCache(), res);
});

// Unified Email API Routes (convenience endpoints)
app.use('/api/email', (req, res, next) => {
  // Add any middleware specific to unified email API
  next();
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: error.message || 'Internal server error'
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substring(7),
      processingTime: 0
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substring(7),
      processingTime: 0
    }
  });
});

// Start server
async function startServer() {
  try {
    console.log('🚀 Starting Investra AI Email Processing API Server...');
    console.log('📧 IMAP service can be configured via /api/imap/config endpoint');
    
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 API Documentation: http://localhost:${PORT}/api`);
      console.log(`❤️ Health Check: http://localhost:${PORT}/health`);
      console.log(`📧 Email Processing: http://localhost:${PORT}/api/email/process`);
      console.log(`📊 Email Status: http://localhost:${PORT}/api/email/stats`);
      console.log(`🔧 IMAP Control: http://localhost:${PORT}/api/imap/status`);
      console.log('');
      console.log('🎯 Ready to process Wealthsimple emails!');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Server terminated');
  process.exit(0);
});

// Start the server
startServer();
