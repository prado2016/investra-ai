/**
 * Simple logging utility for the email puller
 */

// Config is now loaded from database-config.ts

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private logLevels: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3
  };

  private currentLevel: number;

  constructor() {
    // Default to info level, can be overridden by environment or database config
    const logLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';
    this.currentLevel = this.logLevels[logLevel] || this.logLevels.info;
  }

  private shouldLog(level: LogLevel): boolean {
    const enableLogging = process.env.ENABLE_LOGGING !== 'false';
    return enableLogging && this.logLevels[level] >= this.currentLevel;
  }

  private formatMessage(level: LogLevel, message: string, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    const formattedArgs = args.length > 0 ? ' ' + args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ') : '';
    
    return `[${timestamp}] ${levelStr} ${message}${formattedArgs}`;
  }

  debug(message: string, ...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', message, ...args));
    }
  }

  info(message: string, ...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, ...args));
    }
  }

  warn(message: string, ...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, ...args));
    }
  }

  error(message: string, ...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', message, ...args));
    }
  }

  setLevel(level: LogLevel): void {
    this.currentLevel = this.logLevels[level] || this.logLevels.info;
  }
}

export const logger = new Logger();