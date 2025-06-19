import { debug } from '../utils/debug';

/**
 * Browser Log Viewer Integration
 * Connects the external log viewer with the app's debug system
 */
export class BrowserLogIntegration {
  private static instance: BrowserLogIntegration;
  private isConnected = false;
  private logQueue: Array<any> = [];
  private maxQueueSize = 1000;
  private broadcastChannel: BroadcastChannel | null = null;

  static getInstance(): BrowserLogIntegration {
    if (!BrowserLogIntegration.instance) {
      BrowserLogIntegration.instance = new BrowserLogIntegration();
    }
    return BrowserLogIntegration.instance;
  }

  constructor() {
    this.init();
  }

  private init() {
    // Set up BroadcastChannel for cross-window communication
    try {
      this.broadcastChannel = new BroadcastChannel('investra-logs');
      this.broadcastChannel.addEventListener('message', this.handleBroadcastMessage.bind(this));
    } catch (error) {
      debug.warn('BroadcastChannel not available, falling back to postMessage', error, 'LogViewer');
    }

    // Listen for messages from the log viewer
    window.addEventListener('message', this.handleMessage.bind(this));
    
    // Override the debug logger to also send to external viewer
    this.integrateWithDebugLogger();
    
    // Override console methods too
    this.integrateWithConsole();
    
    // Announce availability
    this.announceAvailability();
    
    debug.info('Browser Log Integration initialized', undefined, 'LogViewer');
  }

  private handleBroadcastMessage(event: MessageEvent) {
    const { type } = event.data;

    switch (type) {
      case 'LOG_VIEWER_CONNECT':
        this.handleConnect();
        break;
      case 'LOG_VIEWER_DISCONNECT':
        this.handleDisconnect();
        break;
      case 'REQUEST_LOG_HISTORY':
        this.sendLogHistory();
        break;
      case 'CLEAR_LOGS':
        this.clearLogs();
        break;
    }
  }

  private handleMessage(event: MessageEvent) {
    // Only accept messages from same origin for security
    if (event.origin !== window.location.origin) return;

    const { type } = event.data;

    switch (type) {
      case 'LOG_VIEWER_CONNECT':
        this.handleConnect();
        break;
      case 'LOG_VIEWER_DISCONNECT':
        this.handleDisconnect();
        break;
      case 'REQUEST_LOG_HISTORY':
        this.sendLogHistory();
        break;
      case 'CLEAR_LOGS':
        this.clearLogs();
        break;
    }
  }

  private handleConnect() {
    this.isConnected = true;
    debug.info('External log viewer connected', undefined, 'LogViewer');
    
    // Send all existing logs from debug system and queue
    this.sendLogHistory();
    
    // Notify the viewer that we're connected
    this.postToViewer({
      type: 'APP_CONNECTED',
      data: {
        appName: 'Investra AI',
        timestamp: new Date().toISOString()
      }
    });
  }

  private handleDisconnect() {
    this.isConnected = false;
    debug.info('External log viewer disconnected', undefined, 'LogViewer');
  }

  private sendLogHistory() {
    if (!this.isConnected) return;

    // Get logs from the debug system
    const logs = debug.getLogs();
    
    // Also include queued logs
    const allLogs = [...logs, ...this.logQueue];
    
    this.postToViewer({
      type: 'LOG_HISTORY',
      data: {
        logs: allLogs.map(this.formatLogForViewer),
        timestamp: new Date().toISOString()
      }
    });

    // Clear the queue since we've sent all logs
    this.logQueue = [];
  }

  private formatLogForViewer(log: any) {
    return {
      id: `${log.timestamp.getTime()}-${Math.random()}`,
      timestamp: log.timestamp,
      level: log.level,
      message: log.message,
      source: log.source || 'App',
      data: log.data
    };
  }

  private integrateWithConsole() {
    // Store original console methods
    const originalConsole = {
      log: console.log.bind(console),
      info: console.info.bind(console),
      warn: console.warn.bind(console),
      error: console.error.bind(console),
      debug: console.debug.bind(console)
    };

    // Override console methods to also send to external viewer
    console.log = (...args) => {
      originalConsole.log(...args);
      this.sendLogToViewer('log', this.formatConsoleArgs(args), args, 'Console');
    };

    console.info = (...args) => {
      originalConsole.info(...args);
      this.sendLogToViewer('info', this.formatConsoleArgs(args), args, 'Console');
    };

    console.warn = (...args) => {
      originalConsole.warn(...args);
      this.sendLogToViewer('warn', this.formatConsoleArgs(args), args, 'Console');
    };

    console.error = (...args) => {
      originalConsole.error(...args);
      this.sendLogToViewer('error', this.formatConsoleArgs(args), args, 'Console');
    };

    console.debug = (...args) => {
      originalConsole.debug(...args);
      this.sendLogToViewer('debug', this.formatConsoleArgs(args), args, 'Console');
    };
  }

  private formatConsoleArgs(args: any[]): string {
    return args.map(arg => {
      if (typeof arg === 'object') {
        try {
          return JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }
      return String(arg);
    }).join(' ');
  }

  private integrateWithDebugLogger() {
    // Get the current debug instance
    const originalLog = debug.log.bind(debug);
    const originalInfo = debug.info.bind(debug);
    const originalWarn = debug.warn.bind(debug);
    const originalError = debug.error.bind(debug);
    const originalDebug = debug.debug.bind(debug);

    // Override methods to also send to external viewer
    debug.log = (message: string, data?: unknown, source = 'App') => {
      originalLog(message, data, source);
      this.sendLogToViewer('log', message, data, source);
    };

    debug.info = (message: string, data?: unknown, source = 'App') => {
      originalInfo(message, data, source);
      this.sendLogToViewer('info', message, data, source);
    };

    debug.warn = (message: string, data?: unknown, source = 'App') => {
      originalWarn(message, data, source);
      this.sendLogToViewer('warn', message, data, source);
    };

    debug.error = (message: string, error?: unknown, source = 'App') => {
      originalError(message, error, source);
      this.sendLogToViewer('error', message, error, source);
    };

    debug.debug = (message: string, data?: unknown, source = 'App') => {
      originalDebug(message, data, source);
      this.sendLogToViewer('debug', message, data, source);
    };
  }

  private sendLogToViewer(level: string, message: string, data?: unknown, source = 'App') {
    const logEntry = {
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      source,
      data
    };

    if (!this.isConnected) {
      // Queue the log for when viewer connects
      this.queueLog(level, message, data, source);
      return;
    }

    this.postToViewer({
      type: 'LOG_ENTRY',
      data: logEntry
    });
  }

  private queueLog(level: string, message: string, data?: unknown, source = 'App') {
    const logEntry = {
      timestamp: new Date(),
      level,
      message,
      source,
      data
    };

    this.logQueue.push(logEntry);
    
    // Keep queue size manageable
    if (this.logQueue.length > this.maxQueueSize) {
      this.logQueue = this.logQueue.slice(-this.maxQueueSize);
    }
  }

  private postToViewer(message: any) {
    // Try to post to log viewer windows using BroadcastChannel
    try {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage(message);
      }
    } catch (error) {
      // Silently fail - viewer might not be available
    }

    // Fallback to postMessage for same-window communication
    try {
      // Post to parent if we're in an iframe
      if (window.parent !== window) {
        window.parent.postMessage(message, window.location.origin);
      }
      
      // Post to current window for internal communication
      window.postMessage(message, window.location.origin);
    } catch (error) {
      // Silently fail - viewer might not be available
    }
  }

  private announceAvailability() {
    // Periodically announce that logs are available
    setInterval(() => {
      if (!this.isConnected) {
        this.postToViewer({
          type: 'LOGS_AVAILABLE',
          data: {
            appName: 'Investra AI',
            logsCount: debug.getLogs().length,
            timestamp: new Date().toISOString()
          }
        });
      }
    }, 5000);
  }

  private clearLogs() {
    debug.clearLogs();
    this.logQueue = [];
  }

  // Public API for manual integration
  public connectViewer() {
    this.handleConnect();
  }

  public disconnectViewer() {
    this.handleDisconnect();
  }

  public sendCustomLog(level: string, message: string, data?: unknown, source = 'Custom') {
    this.sendLogToViewer(level, message, data, source);
  }

  public getStatus() {
    return {
      connected: this.isConnected,
      queuedLogs: this.logQueue.length,
      totalLogs: debug.getLogs().length
    };
  }
}

// Auto-initialize in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const integration = BrowserLogIntegration.getInstance();
  
  // Make available globally for debugging
  (window as any).browserLogIntegration = integration;
  
  debug.info('Browser Log Integration ready', undefined, 'LogViewer');
}
