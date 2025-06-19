/**
 * Email Processing Monitoring API
 * Provides REST endpoints for monitoring dashboard and real-time metrics
 */

import express from 'express';
import { WebSocket, WebSocketServer } from 'ws';
import { createServer } from 'http';
import { emailProcessingMonitor } from '../src/services/monitoring/emailProcessingMonitor';
import { emailHealthCheck } from '../src/services/monitoring/emailHealthCheck';
import { emailAlertManager } from '../src/services/monitoring/emailAlertManager';
import { emailLogger } from '../src/services/monitoring/emailLogger';
import { emailDashboard } from '../src/services/monitoring/emailDashboard';

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.use(express.json());

// CORS middleware for development
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  next();
});

/**
 * Dashboard Data Endpoints
 */

// Get current metrics
app.get('/api/monitoring/metrics', async (req, res) => {
  try {
    const metrics = emailProcessingMonitor.getMetrics();
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get system health
app.get('/api/monitoring/health', async (req, res) => {
  try {
    const health = await emailHealthCheck.performFullHealthCheck();
    res.json({
      success: true,
      data: health
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get processing events (with pagination)
app.get('/api/monitoring/events', async (req, res) => {
  try {
    const { 
      limit = 50, 
      offset = 0, 
      type, 
      startDate, 
      endDate 
    } = req.query;

    const events = emailProcessingMonitor.getEvents();
    let filteredEvents = events;

    // Filter by type
    if (type) {
      filteredEvents = filteredEvents.filter(event => event.type === type);
    }

    // Filter by date range
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate as string) : new Date(0);
      const end = endDate ? new Date(endDate as string) : new Date();
      
      filteredEvents = filteredEvents.filter(event => {
        const eventDate = new Date(event.timestamp);
        return eventDate >= start && eventDate <= end;
      });
    }

    // Pagination
    const total = filteredEvents.length;
    const paginatedEvents = filteredEvents
      .slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      success: true,
      data: {
        events: paginatedEvents,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: Number(offset) + Number(limit) < total
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get alerts
app.get('/api/monitoring/alerts', async (req, res) => {
  try {
    const { status, severity } = req.query;
    const alerts = emailAlertManager.getActiveAlerts();
    
    let filteredAlerts = alerts;
    
    if (status) {
      filteredAlerts = filteredAlerts.filter(alert => alert.status === status);
    }
    
    if (severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === severity);
    }

    res.json({
      success: true,
      data: filteredAlerts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get logs with search and filtering
app.get('/api/monitoring/logs', async (req, res) => {
  try {
    const {
      query: searchQuery,
      level,
      component,
      startDate,
      endDate,
      limit = 100,
      offset = 0
    } = req.query;

    const filters: any = {};
    
    if (level) filters.level = level;
    if (component) filters.component = component;
    if (startDate) filters.startDate = new Date(startDate as string);
    if (endDate) filters.endDate = new Date(endDate as string);

    const result = await emailLogger.searchLogs(
      searchQuery as string || '',
      filters,
      {
        limit: Number(limit),
        offset: Number(offset)
      }
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get dashboard data (all metrics combined)
app.get('/api/monitoring/dashboard', async (req, res) => {
  try {
    const dashboardData = await emailDashboard.getDashboardData();
    res.json({
      success: true,
      data: dashboardData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Export dashboard data
app.get('/api/monitoring/export/:format', async (req, res) => {
  try {
    const { format } = req.params;
    const { startDate, endDate } = req.query;

    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid format. Supported formats: json, csv'
      });
    }

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const exportData = await emailDashboard.exportData(format as 'json' | 'csv', { start, end });

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="monitoring-data.csv"');
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename="monitoring-data.json"');
    }

    res.send(exportData);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Alert Management Endpoints
 */

// Acknowledge alert
app.post('/api/monitoring/alerts/:alertId/acknowledge', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { userId, notes } = req.body;

    await emailAlertManager.acknowledgeAlert(alertId, userId, notes);

    res.json({
      success: true,
      message: 'Alert acknowledged successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Resolve alert
app.post('/api/monitoring/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { userId, resolution } = req.body;

    await emailAlertManager.resolveAlert(alertId, userId, resolution);

    res.json({
      success: true,
      message: 'Alert resolved successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * WebSocket for Real-time Updates
 */
const connectedClients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  console.log('📡 Client connected to monitoring WebSocket');
  connectedClients.add(ws);

  // Send initial data
  ws.send(JSON.stringify({
    type: 'initial_data',
    data: emailProcessingMonitor.getMetrics()
  }));

  ws.on('close', () => {
    console.log('📡 Client disconnected from monitoring WebSocket');
    connectedClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('📡 WebSocket error:', error);
    connectedClients.delete(ws);
  });
});

// Broadcast real-time updates to connected clients
function broadcastUpdate(type: string, data: any) {
  const message = JSON.stringify({ type, data, timestamp: new Date().toISOString() });
  
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error('📡 Error sending WebSocket message:', error);
        connectedClients.delete(client);
      }
    }
  });
}

// Listen for monitoring events and broadcast them
emailProcessingMonitor.on('metricsUpdated', (metrics) => {
  broadcastUpdate('metrics_updated', metrics);
});

emailProcessingMonitor.on('eventRecorded', (event) => {
  broadcastUpdate('event_recorded', event);
});

emailAlertManager.on('alertTriggered', (alert) => {
  broadcastUpdate('alert_triggered', alert);
});

emailAlertManager.on('alertResolved', (alert) => {
  broadcastUpdate('alert_resolved', alert);
});

/**
 * Start monitoring API server
 */
export function startMonitoringAPI(port: number = 3002) {
  return new Promise<void>((resolve) => {
    server.listen(port, () => {
      console.log(`📊 Monitoring API server running on port ${port}`);
      console.log(`📡 WebSocket server running on port ${port}`);
      resolve();
    });
  });
}

/**
 * Stop monitoring API server
 */
export function stopMonitoringAPI() {
  return new Promise<void>((resolve) => {
    server.close(() => {
      console.log('📊 Monitoring API server stopped');
      resolve();
    });
  });
}

export { app as monitoringApp, server as monitoringServer };
