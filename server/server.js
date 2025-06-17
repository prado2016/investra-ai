/**
 * Investra AI Email Processing API Server
 * Simple Express.js server to provide REST endpoints for email processing
 */

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

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
      health: {
        'GET /health': 'Health check'
      },
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

// Mock data for testing the connection
const mockEmailData = [
  {
    id: '1',
    subject: 'Trade Confirmation - AAPL Buy',
    from: 'noreply@wealthsimple.com',
    processedAt: new Date().toISOString(),
    status: 'completed',
    portfolioId: 'default',
    result: {
      success: true,
      transactionId: 'tx-001',
      symbol: 'AAPL',
      quantity: 10,
      price: 150.00,
      totalAmount: 1500.00
    }
  },
  {
    id: '2',
    subject: 'Trade Confirmation - TSLA Sell',
    from: 'noreply@wealthsimple.com',
    processedAt: new Date(Date.now() - 3600000).toISOString(),
    status: 'completed',
    portfolioId: 'default',
    result: {
      success: true,
      transactionId: 'tx-002',
      symbol: 'TSLA',
      quantity: 5,
      price: 200.00,
      totalAmount: 1000.00
    }
  }
];

// Email Processing API Routes
app.post('/api/email/process', (req, res) => {
  console.log('📧 Processing single email:', req.body.subject);
  
  const response = {
    success: true,
    data: {
      id: `processed-${Date.now()}`,
      subject: req.body.subject || 'Unknown Subject',
      fromEmail: req.body.fromEmail || 'unknown@email.com',
      portfolioId: req.body.portfolioId || 'default',
      processedAt: new Date().toISOString(),
      result: {
        success: true,
        transactionId: `tx-${Date.now()}`,
        symbol: 'AAPL',
        quantity: 10,
        price: 150.00,
        totalAmount: 1500.00
      },
      duplicateCheckResult: {
        isDuplicate: false,
        confidence: 0.95,
        action: 'accept'
      }
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: `req-${Date.now()}`,
      processingTime: 1200
    }
  };

  res.json(response);
});

app.post('/api/email/batch', (req, res) => {
  console.log('📧 Processing batch emails:', req.body.emails?.length || 0);
  
  const emails = req.body.emails || [];
  const processed = emails.map((email, index) => ({
    id: `batch-${Date.now()}-${index}`,
    subject: email.subject,
    fromEmail: email.fromEmail,
    portfolioId: email.portfolioId || 'default',
    processedAt: new Date().toISOString(),
    result: {
      success: true,
      transactionId: `tx-batch-${Date.now()}-${index}`,
      symbol: 'MOCK',
      quantity: 1,
      price: 100.00,
      totalAmount: 100.00
    }
  }));

  const response = {
    success: true,
    data: {
      processed,
      failed: [],
      summary: {
        total: emails.length,
        successful: emails.length,
        failed: 0,
        duplicates: 0,
        reviewRequired: 0
      }
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: `batch-${Date.now()}`,
      processingTime: 2500
    }
  };

  res.json(response);
});

app.post('/api/email/validate', (req, res) => {
  console.log('📧 Validating email:', req.body.subject);
  
  const response = {
    success: true,
    data: {
      isValid: true,
      errors: [],
      warnings: req.body.fromEmail?.includes('wealthsimple') ? [] : ['Email is not from Wealthsimple']
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: `validate-${Date.now()}`,
      processingTime: 150
    }
  };

  res.json(response);
});

// Email Status API Routes
app.get('/api/email/status/:id', (req, res) => {
  console.log('📊 Getting status for ID:', req.params.id);
  
  const response = {
    success: true,
    data: {
      id: req.params.id,
      status: 'completed',
      progress: {
        current: 4,
        total: 4,
        percentage: 100
      },
      stages: {
        parsing: 'completed',
        duplicateCheck: 'completed',
        symbolProcessing: 'completed',
        transactionCreation: 'completed'
      },
      result: {
        success: true,
        transactionId: `tx-${req.params.id}`,
        duplicateAction: 'accept'
      },
      timestamps: {
        startedAt: new Date(Date.now() - 5000).toISOString(),
        completedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString()
      },
      metadata: {
        emailSubject: 'Trade Confirmation',
        fromEmail: 'noreply@wealthsimple.com',
        portfolioId: 'default',
        processingTime: 5000
      },
      errors: [],
      warnings: []
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: `status-${Date.now()}`,
      processingTime: 50
    }
  };

  res.json(response);
});

app.get('/api/email/status', (req, res) => {
  console.log('📊 Getting multiple statuses for IDs:', req.query.ids);
  
  const ids = req.query.ids ? req.query.ids.split(',') : [];
  const statuses = ids.map(id => ({
    id,
    status: 'completed',
    progress: { current: 4, total: 4, percentage: 100 },
    result: { success: true, transactionId: `tx-${id}` }
  }));

  const response = {
    success: true,
    data: statuses,
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: `multi-status-${Date.now()}`,
      processingTime: 75
    }
  };

  res.json(response);
});

app.get('/api/email/history', (req, res) => {
  console.log('📜 Getting processing history');
  
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  
  const response = {
    success: true,
    data: {
      items: mockEmailData.slice(0, pageSize),
      pagination: {
        page,
        pageSize,
        total: mockEmailData.length,
        totalPages: Math.ceil(mockEmailData.length / pageSize)
      },
      summary: {
        totalProcessed: mockEmailData.length,
        successful: mockEmailData.length,
        failed: 0,
        duplicates: 0,
        reviewRequired: 0,
        averageProcessingTime: 1500
      }
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: `history-${Date.now()}`,
      processingTime: 100
    }
  };

  res.json(response);
});

app.get('/api/email/stats', (req, res) => {
  console.log('📈 Getting processing statistics');
  
  const response = {
    success: true,
    data: {
      overview: {
        totalProcessed: 125,
        successRate: 96.8,
        averageProcessingTime: 1450,
        duplicateRate: 3.2,
        reviewRate: 1.6
      },
      timeframes: {
        last24Hours: {
          processed: 18,
          successful: 17,
          failed: 1,
          duplicates: 0,
          reviewRequired: 0,
          averageProcessingTime: 1200
        },
        last7Days: {
          processed: 89,
          successful: 87,
          failed: 2,
          duplicates: 3,
          reviewRequired: 1,
          averageProcessingTime: 1350
        },
        last30Days: {
          processed: 125,
          successful: 121,
          failed: 4,
          duplicates: 4,
          reviewRequired: 2,
          averageProcessingTime: 1450
        }
      },
      queue: {
        total: 2,
        pending: 1,
        inReview: 1,
        escalated: 0
      },
      trends: {
        processingVolume: [12, 15, 18, 22, 18, 16, 14],
        successRate: [98, 97, 96, 97, 97, 96, 97],
        duplicateRate: [2, 3, 4, 3, 3, 3, 3]
      }
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: `stats-${Date.now()}`,
      processingTime: 80
    }
  };

  res.json(response);
});

app.get('/api/email/health', (req, res) => {
  console.log('❤️ Health check requested');
  
  const response = {
    success: true,
    data: {
      status: 'healthy',
      services: {
        database: { status: 'connected', responseTime: 45 },
        emailParser: { status: 'operational', version: '1.0.0' },
        duplicateDetection: { status: 'operational', cacheSize: 1500 },
        imapService: { status: 'connected', lastSync: new Date().toISOString() }
      },
      metrics: {
        uptime: 86400000,
        memoryUsage: '45%',
        cpuUsage: '12%',
        diskUsage: '67%'
      },
      version: '1.0.0',
      environment: 'development'
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: `health-${Date.now()}`,
      processingTime: 25
    }
  };

  res.json(response);
});

// Email Management API Routes
app.get('/api/email/import/jobs', (req, res) => {
  console.log('📋 Getting import jobs');
  
  const response = {
    success: true,
    data: {
      jobs: [
        {
          id: 'job-001',
          name: 'Daily Email Import',
          status: 'completed',
          type: 'scheduled',
          progress: { total: 25, processed: 25, successful: 24, failed: 1 },
          timestamps: {
            createdAt: new Date(Date.now() - 7200000).toISOString(),
            completedAt: new Date(Date.now() - 3600000).toISOString()
          }
        }
      ],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
      summary: { totalJobs: 1, runningJobs: 0, completedJobs: 1, failedJobs: 0, pendingJobs: 0 }
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: `jobs-${Date.now()}`,
      processingTime: 60
    }
  };

  res.json(response);
});

app.post('/api/email/import/jobs', (req, res) => {
  console.log('📋 Creating import job:', req.body.name);
  
  const response = {
    success: true,
    data: {
      id: `job-${Date.now()}`,
      name: req.body.name,
      status: 'pending',
      type: req.body.type || 'manual',
      timestamps: {
        createdAt: new Date().toISOString()
      }
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: `create-job-${Date.now()}`,
      processingTime: 120
    }
  };

  res.json(response);
});

// Email Review Queue API Routes
app.get('/api/email/review/queue', (req, res) => {
  console.log('📝 Getting review queue items');
  
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 20;
  
  const mockQueueItems = [
    {
      id: 'queue-001',
      status: 'processing',
      emailSubject: 'Trade Confirmation - AAPL Purchase',
      fromEmail: 'notifications@wealthsimple.com',
      progress: {
        current: 3,
        total: 4,
        percentage: 75
      },
      stages: {
        parsing: 'completed',
        duplicateCheck: 'completed',
        symbolProcessing: 'completed',
        transactionCreation: 'pending'
      },
      timestamps: {
        startedAt: new Date(Date.now() - 30000).toISOString(),
        lastUpdatedAt: new Date().toISOString()
      },
      errors: []
    },
    {
      id: 'queue-002',
      status: 'review-required',
      emailSubject: 'Trade Confirmation - TSLA Sale',
      fromEmail: 'notifications@wealthsimple.com',
      progress: {
        current: 2,
        total: 4,
        percentage: 50
      },
      stages: {
        parsing: 'completed',
        duplicateCheck: 'completed',
        symbolProcessing: 'failed',
        transactionCreation: 'pending'
      },
      timestamps: {
        startedAt: new Date(Date.now() - 120000).toISOString(),
        lastUpdatedAt: new Date(Date.now() - 60000).toISOString()
      },
      errors: ['Symbol lookup failed for TSLA']
    }
  ];
  
  const response = {
    success: true,
    data: mockQueueItems.slice(0, pageSize),
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: `queue-${Date.now()}`,
      processingTime: 85
    }
  };

  res.json(response);
});

// IMAP Service API Routes
app.get('/api/imap/status', (req, res) => {
  console.log('📧 Getting IMAP service status');
  
  const response = {
    success: true,
    data: {
      status: 'connected',
      isRunning: true,
      config: {
        host: process.env.IMAP_HOST || 'imap.gmail.com',
        port: 993,
        secure: true,
        enabled: true
      },
      stats: {
        connected: true,
        lastSync: new Date().toISOString(),
        totalProcessed: 89,
        newEmails: 0,
        errors: 0
      },
      monitoring: {
        isActive: true,
        interval: 30000,
        lastCheck: new Date().toISOString()
      }
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: `imap-status-${Date.now()}`,
      processingTime: 40
    }
  };

  res.json(response);
});

app.post('/api/imap/start', (req, res) => {
  console.log('🚀 Starting IMAP service');
  
  const response = {
    success: true,
    data: {
      status: 'started',
      message: 'IMAP service started successfully',
      config: {
        host: process.env.IMAP_HOST || 'imap.gmail.com',
        port: 993,
        monitoring: true
      }
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: `imap-start-${Date.now()}`,
      processingTime: 200
    }
  };

  res.json(response);
});

app.post('/api/imap/process-now', (req, res) => {
  console.log('⚡ Processing emails now');
  
  const response = {
    success: true,
    data: {
      processed: 3,
      successful: 3,
      failed: 0,
      duplicates: 0,
      reviewRequired: 0,
      results: [
        { uid: 1001, success: true, duplicateAction: 'accept' },
        { uid: 1002, success: true, duplicateAction: 'accept' },
        { uid: 1003, success: true, duplicateAction: 'accept' }
      ]
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: `process-now-${Date.now()}`,
      processingTime: 3500
    }
  };

  res.json(response);
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', error);
  res.status(500).json({
    success: false,
    error: {
      code: 'SERVER_ERROR',
      message: error.message || 'Internal server error'
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: `error-${Date.now()}`,
      processingTime: 0
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Endpoint ${req.method} ${req.originalUrl} not found`
    },
    metadata: {
      timestamp: new Date().toISOString(),
      requestId: `404-${Date.now()}`,
      processingTime: 0
    }
  });
});

// Start server
async function startServer() {
  try {
    console.log('🚀 Starting Investra AI Email Processing API Server...');
    
    app.listen(PORT, () => {
      console.log(`✅ Server running on port ${PORT}`);
      console.log(`🌐 API Documentation: http://localhost:${PORT}/api`);
      console.log(`❤️ Health Check: http://localhost:${PORT}/health`);
      console.log(`📧 Email Processing: http://localhost:${PORT}/api/email/process`);
      console.log(`📊 Email Status: http://localhost:${PORT}/api/email/stats`);
      console.log(`🔧 IMAP Control: http://localhost:${PORT}/api/imap/status`);
      console.log('');
      console.log('🎯 Mock API ready to connect with frontend!');
      console.log('📱 Frontend should be accessible at http://localhost:5173/email-management');
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
