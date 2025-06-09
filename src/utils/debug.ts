// Debug utility functions for development mode
declare global {
  const __DEV__: boolean;
  const __DEBUG__: boolean;
}

export const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : process.env.NODE_ENV === 'development';
export const isDebug = typeof __DEBUG__ !== 'undefined' ? __DEBUG__ : true;

export class DebugLogger {
  private static instance: DebugLogger;
  private logs: Array<{
    timestamp: Date;
    level: 'log' | 'warn' | 'error' | 'info' | 'debug';
    message: string;
    data?: unknown;
    source?: string;
  }> = [];

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger();
    }
    return DebugLogger.instance;
  }

  private formatMessage(level: string, source: string, message: string): string {
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
    return `[${timestamp}] [${level.toUpperCase()}] [${source}] ${message}`;
  }

  log(message: string, data?: unknown, source = 'App') {
    if (!isDev && !isDebug) return;
    
    const logEntry = {
      timestamp: new Date(),
      level: 'log' as const,
      message,
      data,
      source
    };
    
    this.logs.push(logEntry);
    console.log(this.formatMessage('log', source, message), data || '');
  }

  warn(message: string, data?: unknown, source = 'App') {
    if (!isDev && !isDebug) return;
    
    const logEntry = {
      timestamp: new Date(),
      level: 'warn' as const,
      message,
      data,
      source
    };
    
    this.logs.push(logEntry);
    console.warn(this.formatMessage('warn', source, message), data || '');
  }

  error(message: string, error?: unknown, source = 'App') {
    const logEntry = {
      timestamp: new Date(),
      level: 'error' as const,
      message,
      data: error,
      source
    };
    
    this.logs.push(logEntry);
    console.error(this.formatMessage('error', source, message), error || '');
  }

  info(message: string, data?: unknown, source = 'App') {
    if (!isDev && !isDebug) return;
    
    const logEntry = {
      timestamp: new Date(),
      level: 'info' as const,
      message,
      data,
      source
    };
    
    this.logs.push(logEntry);
    console.info(this.formatMessage('info', source, message), data || '');
  }

  debug(message: string, data?: unknown, source = 'App') {
    if (!isDev && !isDebug) return;
    
    const logEntry = {
      timestamp: new Date(),
      level: 'debug' as const,
      message,
      data,
      source
    };
    
    this.logs.push(logEntry);
    console.debug(this.formatMessage('debug', source, message), data || '');
  }

  getLogs() {
    return [...this.logs];
  }

  clearLogs() {
    this.logs = [];
  }

  exportLogs() {
    return JSON.stringify(this.logs, null, 2);
  }

  // Performance monitoring
  time(label: string) {
    if (!isDev && !isDebug) return;
    console.time(`⏱️ ${label}`);
  }

  timeEnd(label: string) {
    if (!isDev && !isDebug) return;
    console.timeEnd(`⏱️ ${label}`);
  }

  // Component lifecycle debugging
  componentMount(componentName: string, props?: unknown) {
    this.debug(`Component mounted: ${componentName}`, props, 'React');
  }

  componentUnmount(componentName: string) {
    this.debug(`Component unmounted: ${componentName}`, undefined, 'React');
  }

  componentUpdate(componentName: string, prevProps?: unknown, newProps?: unknown) {
    this.debug(`Component updated: ${componentName}`, { prevProps, newProps }, 'React');
  }

  // API call debugging
  apiRequest(method: string, url: string, data?: unknown) {
    this.info(`API ${method.toUpperCase()} ${url}`, data, 'API');
  }

  apiResponse(method: string, url: string, status: number, data?: unknown) {
    const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
    this[level](`API ${method.toUpperCase()} ${url} - ${status}`, data, 'API');
  }

  apiError(method: string, url: string, error: unknown) {
    this.error(`API ${method.toUpperCase()} ${url} - ERROR`, error, 'API');
  }
}

// Global debug instance
export const debug = DebugLogger.getInstance();

// Enhanced error tracking
export class ErrorTracker {
  private static errors: Array<{
    id: string;
    timestamp: Date;
    error: Error;
    context?: unknown;
    userAgent?: string;
    url?: string;
    userId?: string;
  }> = [];

  static trackError(error: Error, context?: unknown, userId?: string) {
    const errorRecord = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } as Error,
      context,
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId,
    };

    this.errors.push(errorRecord);
    debug.error(`Error tracked: ${error.message}`, errorRecord, 'ErrorTracker');

    // In production, send to error tracking service
    if (!isDev) {
      this.sendToErrorService(errorRecord);
    }

    return errorRecord.id;
  }

  private static sendToErrorService(errorRecord: unknown) {
    // Placeholder for error tracking service integration
    // e.g., Sentry, LogRocket, etc.
    debug.info('Would send error to tracking service in production', errorRecord, 'ErrorTracker');
  }

  static getErrors() {
    return [...this.errors];
  }

  static clearErrors() {
    this.errors = [];
  }
}

// Performance monitoring utilities
export class PerformanceTracker {
  private static marks: Map<string, number> = new Map();
  private static measures: Array<{
    name: string;
    duration: number;
    timestamp: Date;
  }> = [];

  static mark(name: string) {
    if (!isDev && !isDebug) return;
    this.marks.set(name, performance.now());
    debug.debug(`Performance mark: ${name}`, undefined, 'Performance');
  }

  static measure(name: string, startMark?: string) {
    if (!isDev && !isDebug) return;

    const endTime = performance.now();
    const startTime = startMark ? this.marks.get(startMark) : this.marks.get(name);
    
    if (startTime !== undefined) {
      const duration = endTime - startTime;
      this.measures.push({
        name,
        duration,
        timestamp: new Date(),
      });
      
      debug.info(`Performance measure: ${name} took ${duration.toFixed(2)}ms`, undefined, 'Performance');
      return duration;
    }
  }

  static getMeasures() {
    return [...this.measures];
  }

  static clearMeasures() {
    this.measures = [];
    this.marks.clear();
  }
}

// Development-only debugging helpers
export const devTools = {
  // Global access to debug tools
  enableDebugMode() {
    if (isDev) {
      (window as unknown as Record<string, unknown>).debug = debug;
      (window as unknown as Record<string, unknown>).errorTracker = ErrorTracker;
      (window as unknown as Record<string, unknown>).performanceTracker = PerformanceTracker;
      debug.info('Debug tools attached to window object', undefined, 'DevTools');
    }
  },

  // Component debugging wrapper
  logComponentRender(componentName: string, props?: unknown) {
    if (isDev || isDebug) {
      debug.debug(`Rendering ${componentName}`, props, 'React');
    }
  },

  // State change debugging
  logStateChange(stateName: string, oldValue: unknown, newValue: unknown) {
    if (isDev || isDebug) {
      debug.debug(`State change: ${stateName}`, { from: oldValue, to: newValue }, 'State');
    }
  },

  // Effect debugging
  logEffect(effectName: string, dependencies?: unknown[]) {
    if (isDev || isDebug) {
      debug.debug(`Effect triggered: ${effectName}`, { dependencies }, 'React');
    }
  },
};

// Initialize debug tools in development
if (isDev) {
  devTools.enableDebugMode();
  debug.info('🐛 Debug mode enabled', { isDev, isDebug }, 'Debug');
}
