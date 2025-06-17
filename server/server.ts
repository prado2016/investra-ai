/**
 * TypeScript API Server for Email Processing
 * This server uses the existing TypeScript APIs to provide HTTP endpoints
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import the existing TypeScript APIs
import { EmailAPI } from '../src/services/endpoints/emailAPI';
import type { 
  EmailProcessRequest, 
  BatchEmailProcessRequest,
  ImportJobCreateRequest,
  ReviewManagementRequest,
  RetryRequest
} from '../src/services/endpoints/emailAPI';

// Load environment variables
dotenv.config();

const app = express();
const port = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📊 ${timestamp} ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Investra Email Processing API'
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'Investra Email Processing API',
    version: '1.0.0',
    endpoints: {
      'POST /api/email/process': 'Process single email',
      'POST /api/email/batch': 'Process multiple emails',
      'POST /api/email/validate': 'Validate email without processing',
      'GET /api/email/status/:id': 'Get processing status',
      'GET /api/email/history': 'Get processing history',
      'GET /api/email/stats': 'Get processing statistics',
      'GET /api/email/health': 'System health check',
      'GET /api/email/import/jobs': 'Get import jobs',
      'POST /api/email/import/jobs': 'Create import job',
      'GET /api/email/review/queue': 'Get review queue',
      'POST /api/email/review/manage': 'Manage review queue',
      'POST /api/email/retry': 'Retry failed processing',
      'GET /api/imap/status': 'Get IMAP service status',
      'POST /api/imap/start': 'Start IMAP service',
      'POST /api/imap/stop': 'Stop IMAP service',
      'POST /api/imap/restart': 'Restart IMAP service'
    }
  });
});

// Email Processing Endpoints
app.post('/api/email/process', async (req, res) => {
  try {
    const request: EmailProcessRequest = req.body;
    const result = await EmailAPI.processEmail(request);
    res.json(result);
  } catch (error) {
    console.error('❌ Email processing error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    });
  }
});

app.post('/api/email/batch', async (req, res) => {
  try {
    const request: BatchEmailProcessRequest = req.body;
    const result = await EmailAPI.processBatchEmails(request);
    res.json(result);
  } catch (error) {
    console.error('❌ Batch processing error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    });
  }
});

app.post('/api/email/validate', async (req, res) => {
  try {
    const request = req.body;
    const result = await EmailAPI.validateEmail(request);
    res.json(result);
  } catch (error) {
    console.error('❌ Email validation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    });
  }
});

// Email Status Endpoints
app.get('/api/email/status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await EmailAPI.getProcessingStatus(id);
    res.json(result);
  } catch (error) {
    console.error('❌ Status retrieval error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    });
  }
});

app.get('/api/email/history', async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined;
    const filter = req.query.filter ? JSON.parse(req.query.filter as string) : undefined;
    
    const result = await EmailAPI.getProcessingHistory(page, pageSize, filter);
    res.json(result);
  } catch (error) {
    console.error('❌ History retrieval error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    });
  }
});

app.get('/api/email/stats', async (req, res) => {
  try {
    const result = await EmailAPI.getProcessingStats();
    res.json(result);
  } catch (error) {
    console.error('❌ Stats retrieval error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    });
  }
});

app.get('/api/email/health', async (req, res) => {
  try {
    const result = await EmailAPI.getHealthCheck();
    res.json(result);
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    });
  }
});

// Email Management Endpoints
app.get('/api/email/import/jobs', async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined;
    const filter = req.query.filter ? JSON.parse(req.query.filter as string) : undefined;
    
    const result = await EmailAPI.getImportJobs(page, pageSize, filter);
    res.json(result);
  } catch (error) {
    console.error('❌ Import jobs retrieval error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    });
  }
});

app.post('/api/email/import/jobs', async (req, res) => {
  try {
    const request: ImportJobCreateRequest = req.body;
    const result = await EmailAPI.createImportJob(request);
    res.json(result);
  } catch (error) {
    console.error('❌ Import job creation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    });
  }
});

app.get('/api/email/review/queue', async (req, res) => {
  try {
    const page = req.query.page ? parseInt(req.query.page as string) : undefined;
    const pageSize = req.query.pageSize ? parseInt(req.query.pageSize as string) : undefined;
    const filter = req.query.filter ? JSON.parse(req.query.filter as string) : undefined;
    
    const result = await EmailAPI.getReviewQueue(page, pageSize, filter);
    res.json(result);
  } catch (error) {
    console.error('❌ Review queue retrieval error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    });
  }
});

app.post('/api/email/review/manage', async (req, res) => {
  try {
    const request: ReviewManagementRequest = req.body;
    const result = await EmailAPI.manageReviewQueue(request);
    res.json(result);
  } catch (error) {
    console.error('❌ Review management error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    });
  }
});

app.post('/api/email/retry', async (req, res) => {
  try {
    const request: RetryRequest = req.body;
    const result = await EmailAPI.retryProcessing(request);
    res.json(result);
  } catch (error) {
    console.error('❌ Retry processing error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    });
  }
});

// IMAP Service Endpoints (placeholder implementations for now)
app.get('/api/imap/status', async (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'stopped',
      lastConnected: null,
      emailsProcessed: 0,
      errors: []
    }
  });
});

app.post('/api/imap/start', async (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'IMAP service start requested',
      status: 'starting'
    }
  });
});

app.post('/api/imap/stop', async (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'IMAP service stop requested',
      status: 'stopping'
    }
  });
});

app.post('/api/imap/restart', async (req, res) => {
  res.json({
    success: true,
    data: {
      message: 'IMAP service restart requested',
      status: 'restarting'
    }
  });
});

// Error handling middleware
app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('🚨 Unhandled error:', error);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.path} not found`
    }
  });
});

// Start server
app.listen(port, () => {
  console.log('🚀 Email Processing API Server Started');
  console.log(`📍 Server running on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log(`📖 API docs: http://localhost:${port}/api`);
  console.log('🎯 Ready to process emails!');
});

export default app;
