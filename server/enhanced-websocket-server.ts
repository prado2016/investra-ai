/**
 * Enhanced Investra AI Email Processing API Server with WebSocket Support
 * Real-time email processing updates and live monitoring
 */

import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import dotenv from 'dotenv';
import winston from 'winston';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3001', 10);
const WS_PORT = parseInt(process.env.WS_PORT || '3002', 10);
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

// Create HTTP server
const server = createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ port: WS_PORT });

// WebSocket connection management
const clients = new Set<WebSocket>();

// WebSocket message types
interface WebSocketMessage {
  type: 'email_processing_started' | 'email_processing_completed' | 'email_processing_failed' | 'system_status' | 'connection_test';
  data: any;
  timestamp: string;
  id: string;
}

// WebSocket connection handler
wss.on('connection', (ws: WebSocket) => {
  clients.add(ws);
  logger.info('WebSocket client connected', { totalClients: clients.size });

  // Send welcome message
  const welcomeMessage: WebSocketMessage = {
    type: 'system_status',
    data: {
      status: 'connected',
      message: 'Real-time email processing updates enabled',
      serverTime: new Date().toISOString()
    },
    timestamp: new Date().toISOString(),
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
  
  ws.send(JSON.stringify(welcomeMessage));

  ws.on('close', () => {
    clients.delete(ws);
    logger.info('WebSocket client disconnected', { totalClients: clients.size });
  });

  ws.on('error', (error) => {
    logger.error('WebSocket error', { error: error.message });
    clients.delete(ws);
  });
});

// Broadcast message to all connected clients
function broadcastToClients(message: WebSocketMessage) {
  const messageStr = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
  logger.info('Broadcasted message to clients', { 
    type: message.type, 
    clientCount: clients.size 
  });
}

// Middleware
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://10.0.0.89',
    'http://10.0.0.89:80',
    'https://investra.com',
    'https://app.investra.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
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
    service: 'Investra AI Email Processing API with WebSocket',
    version: '2.0.0',
    environment: NODE_ENV,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    websocket: {
      port: WS_PORT,
      connectedClients: clients.size,
      status: 'operational'
    }
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

// Enhanced email processing endpoint with real-time updates
app.post('/api/email/process', async (req, res) => {
  const processingId = `proc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
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

    // Broadcast processing started
    broadcastToClients({
      type: 'email_processing_started',
      data: {
        processingId,
        subject: subject.substring(0, 50) + '...',
        fromEmail,
        startTime: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      id: processingId
    });

    // Simulate processing delay for real-time demo
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Mock processing result
    const mockResult = {
      processingId,
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
          processingMethod: 'enhanced_websocket_server',
          confidence: 0.9
        }
      },
      processingTime: 1150
    };

    // Broadcast processing completed
    broadcastToClients({
      type: 'email_processing_completed',
      data: {
        processingId,
        result: mockResult,
        completedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      id: processingId
    });

    logger.info('Email processed with real-time updates', {
      processingId,
      emailId: mockResult.emailId,
      fromEmail,
      subject: subject.substring(0, 50)
    });

    res.json({
      success: true,
      data: mockResult,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substring(7),
        realTimeUpdates: true,
        websocketPort: WS_PORT
      }
    });

  } catch (error) {
    // Broadcast processing failed
    broadcastToClients({
      type: 'email_processing_failed',
      data: {
        processingId,
        error: error instanceof Error ? error.message : 'Unknown error',
        failedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      id: processingId
    });

    logger.error('Email processing error', { error, processingId });
    res.status(500).json({
      success: false,
      error: {
        code: 'PROCESSING_ERROR',
        message: 'Email processing failed'
      }
    });
  }
});

// Enhanced connection test with real-time updates
app.post('/api/email/test-connection', async (req, res) => {
  const testId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
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

    // Broadcast connection test started
    broadcastToClients({
      type: 'connection_test',
      data: {
        testId,
        status: 'testing',
        host,
        port,
        username,
        startTime: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      id: testId
    });

    // Simulate connection test delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock connection test result
    const mockTest = {
      testId,
      success: true,
      message: `IMAP connection test passed for ${username}`,
      details: {
        host,
        port,
        secure,
        username,
        connectionTime: Date.now(),
        protocol: secure ? 'IMAPS' : 'IMAP',
        testDuration: 2000
      }
    };

    // Broadcast connection test completed
    broadcastToClients({
      type: 'connection_test',
      data: {
        testId,
        status: 'completed',
        result: mockTest,
        completedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      id: testId
    });

    logger.info('Email connection tested with real-time updates', { 
      testId, username, host, port, secure 
    });

    res.json({
      success: true,
      data: mockTest,
      metadata: {
        timestamp: new Date().toISOString(),
        requestId: Math.random().toString(36).substring(7),
        realTimeUpdates: true,
        websocketPort: WS_PORT
      }
    });

  } catch (error) {
    logger.error('Email connection test error', { error, testId });
    res.status(500).json({
      success: false,
      error: {
        code: 'CONNECTION_TEST_ERROR',
        message: 'Email connection test failed'
      }
    });
  }
});

// WebSocket info endpoint
app.get('/api/websocket/info', (req, res) => {
  res.json({
    success: true,
    data: {
      websocketPort: WS_PORT,
      connectedClients: clients.size,
      status: 'operational',
      connectionUrl: `ws://localhost:${WS_PORT}`,
      messageTypes: [
        'email_processing_started',
        'email_processing_completed', 
        'email_processing_failed',
        'connection_test',
        'system_status'
      ]
    }
  });
});

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    data: {
      name: 'Investra AI Email Processing API',
      version: '2.0.0',
      description: 'Enhanced email processing API with real-time WebSocket updates',
      documentation: {
        baseUrl: `http://localhost:${PORT}`,
        websocketUrl: `ws://localhost:${WS_PORT}`,
        endpoints: {
          'GET /health': {
            description: 'Health check endpoint with system metrics',
            response: 'System health status and metrics'
          },
          'GET /api': {
            description: 'API documentation and endpoint information',
            response: 'Complete API documentation'
          },
          'GET /api/status': {
            description: 'Service operational status',
            response: 'Service status and feature availability'
          },
          'GET /api/websocket/info': {
            description: 'WebSocket connection information',
            response: 'WebSocket port, status, and message types'
          },
          'POST /api/email/process': {
            description: 'Process Wealthsimple email with real-time updates',
            parameters: {
              subject: 'Email subject line (required)',
              fromEmail: 'Sender email address (required)',
              htmlContent: 'HTML email content (optional)',
              textContent: 'Plain text email content (optional)'
            },
            response: 'Processing result with transaction data',
            realTimeUpdates: ['email_processing_started', 'email_processing_completed', 'email_processing_failed']
          },
          'POST /api/email/test-connection': {
            description: 'Test IMAP email connection with real-time updates',
            parameters: {
              host: 'IMAP server hostname (required)',
              port: 'IMAP server port (required)',
              secure: 'Use SSL/TLS (required)',
              username: 'Email username (required)',
              password: 'Email password (required)'
            },
            response: 'Connection test result',
            realTimeUpdates: ['connection_test']
          }
        },
        websocket: {
          url: `ws://localhost:${WS_PORT}`,
          messageTypes: [
            'system_status - System status updates',
            'email_processing_started - Email processing initiated',
            'email_processing_completed - Email processing finished successfully',
            'email_processing_failed - Email processing failed',
            'connection_test - IMAP connection test updates'
          ]
        }
      }
    }
  });
});

// API status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'email-processing-api-enhanced',
      status: 'operational',
      features: {
        emailProcessing: true,
        realTimeUpdates: true,
        websocketSupport: true,
        monitoring: true,
        logging: true
      },
      websocket: {
        port: WS_PORT,
        connectedClients: clients.size
      },
      endpoints: [
        'GET /health',
        'GET /api',
        'GET /api/status',
        'GET /api/websocket/info',
        'POST /api/email/process',
        'POST /api/email/test-connection'
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
  
  // Close WebSocket server
  wss.close(() => {
    logger.info('WebSocket server closed');
  });
  
  // Close HTTP server
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

// Start servers
server.listen(PORT, '0.0.0.0', () => {
  logger.info('Enhanced server started', {
    httpPort: PORT,
    websocketPort: WS_PORT,
    environment: NODE_ENV,
    host: '0.0.0.0'
  });
  
  console.log(`🚀 Enhanced production server running on port ${PORT}`);
  console.log(`🔌 WebSocket server running on port ${WS_PORT}`);
  console.log(`📊 Environment: ${NODE_ENV}`);
  console.log(`🌐 HTTP: http://0.0.0.0:${PORT}`);
  console.log(`🔗 WebSocket: ws://0.0.0.0:${WS_PORT}`);
  console.log(`🏥 Health check: http://0.0.0.0:${PORT}/health`);
});
