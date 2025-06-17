/**
 * Investra AI Email Processing API Server (TypeScript)
 * A clean TypeScript implementation with mock endpoints
 * Ready to be connected to real email processing services
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

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
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://10.0.0.89'],
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

// Helper function to create API responses
const createResponse = <T>(data: T, success: boolean = true): APIResponse<T> => ({
  success,
  data: success ? data : undefined,
  error: success ? undefined : { code: 'ERROR', message: 'Operation failed' },
  metadata: {
    timestamp: new Date().toISOString(),
    requestId: Math.random().toString(36).substring(7),
    processingTime: Math.floor(Math.random() * 100)
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json(createResponse({ 
    status: 'healthy',
    service: 'Investra AI Email Processing API (TypeScript)'
  }));
});

// API Documentation endpoint
app.get('/api', (req, res) => {
  res.json(createResponse({
    service: 'Investra AI Email Processing API',
    version: '1.0.0',
    implementation: 'TypeScript',
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
  }));
});

// Email Processing Endpoints
app.post('/api/email/process', (req, res) => {
  const request = req.body as EmailProcessRequest;
  
  // Mock email processing
  const response: EmailProcessResponse = {
    emailId: `email_${Date.now()}`,
    status: 'processed',
    extractedData: {
      transactions: [
        {
          type: 'BUY',
          amount: 1000.00,
          currency: 'CAD',
          date: new Date().toISOString(),
          description: `Processed from: ${request.subject}`,
          symbol: 'MOCK'
        }
      ],
      metadata: {
        fromEmail: request.fromEmail,
        processingMethod: 'mock_typescript_server'
      }
    },
    processingTime: 150
  };
  
  res.json(createResponse(response));
});

app.post('/api/email/batch', (req, res) => {
  const request = req.body as BatchEmailProcessRequest;
  
  const responses = request.emails.map((email, index) => ({
    emailId: `batch_email_${Date.now()}_${index}`,
    status: 'processed' as const,
    extractedData: {
      transactions: [{
        type: 'BUY',
        amount: 500.00 + (index * 100),
        currency: 'CAD',
        date: new Date().toISOString(),
        description: `Batch processed: ${email.subject}`,
        symbol: `MOCK${index}`
      }]
    },
    processingTime: 100 + (index * 20)
  }));
  
  res.json(createResponse({
    batchId: request.batchId || `batch_${Date.now()}`,
    results: responses,
    totalProcessed: responses.length,
    successCount: responses.length,
    failedCount: 0
  }));
});

app.get('/api/email/status/:id', (req, res) => {
  const { id } = req.params;
  
  const status: ProcessingStatus = {
    id,
    status: 'completed',
    progress: 100,
    startTime: new Date(Date.now() - 5000).toISOString(),
    endTime: new Date().toISOString(),
    emailCount: 1,
    processedCount: 1,
    failedCount: 0
  };
  
  res.json(createResponse(status));
});

app.get('/api/email/stats', (req, res) => {
  const stats: ProcessingStatsResponse = {
    totalEmails: 1247,
    successfullyProcessed: 1198,
    failed: 49,
    averageProcessingTime: 125,
    lastProcessedDate: new Date().toISOString(),
    processingRatePerHour: 89,
    mostCommonErrors: [
      { error: 'Invalid email format', count: 23 },
      { error: 'Parsing timeout', count: 15 },
      { error: 'Unknown transaction type', count: 11 }
    ]
  };
  
  res.json(createResponse(stats));
});

app.get('/api/email/history', (req, res) => {
  const history: ProcessingHistoryItem[] = [
    {
      id: 'hist_1',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      emailSubject: 'Wealthsimple Trade Confirmation',
      fromEmail: 'trade@wealthsimple.com',
      status: 'success',
      transactionsExtracted: 1,
      processingTime: 145
    },
    {
      id: 'hist_2',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      emailSubject: 'Monthly Statement',
      fromEmail: 'statements@wealthsimple.com',
      status: 'success',
      transactionsExtracted: 15,
      processingTime: 890
    }
  ];
  
  res.json(createResponse(history));
});

// Import Job Management
app.get('/api/email/import/jobs', (req, res) => {
  const jobs: ImportJob[] = [
    {
      id: 'job_1',
      status: 'completed',
      source: 'imap',
      startTime: new Date(Date.now() - 1800000).toISOString(),
      endTime: new Date(Date.now() - 600000).toISOString(),
      totalEmails: 45,
      processedEmails: 45,
      failedEmails: 0,
      progress: 100
    }
  ];
  
  res.json(createResponse(jobs));
});

app.get('/api/email/review/queue', (req, res) => {
  const queue: ReviewQueueItem[] = [
    {
      id: 'review_1',
      emailId: 'email_123',
      subject: 'Complex Trade Notification',
      fromEmail: 'notifications@wealthsimple.com',
      receivedDate: new Date(Date.now() - 1800000).toISOString(),
      reason: 'low_confidence',
      confidence: 0.65,
      suggestedActions: ['Manual review required', 'Verify transaction details']
    }
  ];
  
  res.json(createResponse(queue));
});

// IMAP Service Endpoints
app.get('/api/imap/status', (req, res) => {
  const status: IMAPServiceStatus = {
    status: 'stopped',
    lastSync: new Date(Date.now() - 3600000).toISOString(),
    emailsProcessed: 1247,
    config: {
      server: 'imap.gmail.com',
      port: 993,
      username: 'user@example.com',
      useSSL: true,
      folder: 'INBOX'
    }
  };
  
  res.json(createResponse(status));
});

app.post('/api/imap/start', (req, res) => {
  res.json(createResponse({ 
    message: 'IMAP service start requested',
    status: 'starting' 
  }));
});

app.post('/api/imap/stop', (req, res) => {
  res.json(createResponse({ 
    message: 'IMAP service stop requested',
    status: 'stopping' 
  }));
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json(createResponse(
    { message: `Endpoint ${req.method} ${req.originalUrl} not found` },
    false
  ));
});

// Start server
async function startServer() {
  try {
    console.log('🚀 Starting Investra AI Email Processing API Server (TypeScript)...');
    console.log('📧 Ready to connect to real email processing services');
    
    app.listen(PORT, () => {
      console.log(`✅ TypeScript Server running on port ${PORT}`);
      console.log(`🌐 API Documentation: http://localhost:${PORT}/api`);
      console.log(`❤️ Health Check: http://localhost:${PORT}/health`);
      console.log(`📧 Email Processing: http://localhost:${PORT}/api/email/process`);
      console.log(`📊 Email Status: http://localhost:${PORT}/api/email/stats`);
      console.log(`🔧 IMAP Control: http://localhost:${PORT}/api/imap/status`);
      console.log('');
      console.log('🎯 Ready to process Wealthsimple emails! (TypeScript Implementation)');
    });
    
  } catch (error) {
    console.error('❌ Failed to start TypeScript server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down TypeScript server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 TypeScript server terminated');
  process.exit(0);
});

// Start the server
startServer();
