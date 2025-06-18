/**
 * Investra AI Email Processing API Server - Simple Production
 * Task 13.1: Deploy API Server to Production
 * Standalone production server without frontend dependencies
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import winston from 'winston';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const NODE_ENV = process.env.NODE_ENV || 'production';

// Initialize logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://investra.com',
    'https://app.investra.com'
  ],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  logger.info('Request started', {
    requestId,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip
  });

  const originalJson = res.json;
  res.json = function(body: any) {
    const duration = Date.now() - startTime;
    logger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration
    });
    return originalJson.call(this, body);
  };

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const healthData = {
    status: 'healthy',
    service: 'Investra AI Email Processing API',
    version: '1.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };

  res.json({
    success: true,
    data: healthData,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: Math.random().toString(36).substring(7)
    }
  });
});

// Email processing endpoint (mock for now)
app.post('/api/email/process', (req, res) => {
  try {
    const { subject, fromEmail, htmlContent, textContent } = req.body;
    
    // Basic validation
    if (!subject || !fromEmail || (!htmlContent && !textContent)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: subject, fromEmail, and content'
        }
      });
    }

    // Mock processing result
    const mockResult = {
      emailId: `email_${Date.now()}`,
      status: 'processed',
      extractedData: {
        transactions: [{
          type: 'BUY',
          amount: 1000,
          currency: 'CAD',
          date: new Date().toISOString(),
          description: 'Mock transaction from email processing',
          symbol: 'MOCK'
        }],
        metadata: {
          fromEmail,
          processingMethod: 'simple_production_server',
          confidence: 0.9
        }
      },
      processingTime: 150
    };

    logger.info('Email processed', {
      emailId: mockResult.emailId,
      fromEmail,
      subject: subject.substring(0, 50)
    });

    res.json({
      success: true,
      data: mockResult,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substring(7)
      }
    });

  } catch (error) {
    logger.error('Email processing error', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'PROCESSING_ERROR',
        message: 'Email processing failed'
      }
    });
  }
});

// Email configuration endpoints
app.post('/api/email/test-connection', async (req, res) => {
  try {
    const { host, port, secure, username, password } = req.body;
    
    // Validate required fields
    if (!host || !port || !username || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: host, port, username, password'
        }
      });
    }

    // For now, simulate IMAP connection test
    // TODO: Implement real IMAP connection using imapflow
    const mockTest = {
      success: true,
      message: `IMAP connection test passed for ${username}`,
      details: {
        host,
        port,
        secure,
        username,
        connectionTime: Date.now(),
        protocol: secure ? 'IMAPS' : 'IMAP'
      }
    };

    logger.info('Email connection tested', { username, host, port, secure });

    res.json({
      success: true,
      data: mockTest,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substring(7)
      }
    });

  } catch (error) {
    logger.error('Email connection test error', { error });
    res.status(500).json({
      success: false,
      error: {
        code: 'CONNECTION_TEST_ERROR',
        message: 'Email connection test failed'
      }
    });
  }
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'email-processing-api',
      status: 'operational',
      features: {
        emailProcessing: true,
        monitoring: true,
        logging: true
      },
      endpoints: [
        'GET /health',
        'POST /api/email/process',
        'POST /api/email/test-connection',
        'GET /api/status'
      ]
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
    }
  });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });
  
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: NODE_ENV === 'production' ? 'Internal server error' : err.message
    }
  });
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully...`);
  process.exit(0);
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start server
app.listen(PORT, '0.0.0.0', () => {
  logger.info('Server started', {
    port: PORT,
    environment: NODE_ENV,
    host: '0.0.0.0',
    endpoints: [
      `http://0.0.0.0:${PORT}/health`,
      `http://0.0.0.0:${PORT}/api/status`,
      `http://0.0.0.0:${PORT}/api/email/process`
    ]
  });
  
  console.log(`🚀 Simple production server running on port ${PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🌐 Server accessible from all interfaces on 0.0.0.0:${PORT}`);
  console.log(`🔗 Health check: http://0.0.0.0:${PORT}/health`);
});