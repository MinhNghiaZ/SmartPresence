// Centralized logging utility for SmartPresence app

export const LogLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3
} as const;

type LogLevel = typeof LogLevel[keyof typeof LogLevel];

class Logger {
  private static instance: Logger;
  private logLevel: LogLevel = LogLevel.ERROR; // Production: ERROR only
  
  private constructor() {
    // Set log level based on environment
    if (import.meta.env.DEV) {
      this.logLevel = LogLevel.DEBUG; // Development: All logs
    }
  }

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.logLevel;
  }

  private formatMessage(category: string, message: string, data?: any): [string, any?] {
    const timestamp = new Date().toLocaleTimeString();
    const formattedMessage = `[${timestamp}] ${category}: ${message}`;
    return data ? [formattedMessage, data] : [formattedMessage];
  }

  // Error logging - always shown
  error(category: string, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const [msg, payload] = this.formatMessage(category, message, data);
      payload ? console.error(msg, payload) : console.error(msg);
    }
  }

  // Warning logging
  warn(category: string, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      const [msg, payload] = this.formatMessage(category, message, data);
      payload ? console.warn(msg, payload) : console.warn(msg);
    }
  }

  // Info logging
  info(category: string, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      const [msg, payload] = this.formatMessage(category, message, data);
      payload ? console.log(msg, payload) : console.log(msg);
    }
  }

  // Debug logging - development only
  debug(category: string, message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      const [msg, payload] = this.formatMessage(category, message, data);
      payload ? console.log(msg, payload) : console.log(msg);
    }
  }

  // Quick access methods for common categories
  auth = {
    error: (msg: string, data?: any) => this.error('AUTH', msg, data),
    warn: (msg: string, data?: any) => this.warn('AUTH', msg, data),
    info: (msg: string, data?: any) => this.info('AUTH', msg, data),
    debug: (msg: string, data?: any) => this.debug('AUTH', msg, data)
  };

  face = {
    error: (msg: string, data?: any) => this.error('FACE', msg, data),
    warn: (msg: string, data?: any) => this.warn('FACE', msg, data),
    info: (msg: string, data?: any) => this.info('FACE', msg, data),
    debug: (msg: string, data?: any) => this.debug('FACE', msg, data)
  };

  attendance = {
    error: (msg: string, data?: any) => this.error('ATTENDANCE', msg, data),
    warn: (msg: string, data?: any) => this.warn('ATTENDANCE', msg, data),
    info: (msg: string, data?: any) => this.info('ATTENDANCE', msg, data),
    debug: (msg: string, data?: any) => this.debug('ATTENDANCE', msg, data)
  };

  gps = {
    error: (msg: string, data?: any) => this.error('GPS', msg, data),
    warn: (msg: string, data?: any) => this.warn('GPS', msg, data),
    info: (msg: string, data?: any) => this.info('GPS', msg, data),
    debug: (msg: string, data?: any) => this.debug('GPS', msg, data)
  };

  api = {
    error: (msg: string, data?: any) => this.error('API', msg, data),
    warn: (msg: string, data?: any) => this.warn('API', msg, data),
    info: (msg: string, data?: any) => this.info('API', msg, data),
    debug: (msg: string, data?: any) => this.debug('API', msg, data)
  };

  ui = {
    error: (msg: string, data?: any) => this.error('UI', msg, data),
    warn: (msg: string, data?: any) => this.warn('UI', msg, data),
    info: (msg: string, data?: any) => this.info('UI', msg, data),
    debug: (msg: string, data?: any) => this.debug('UI', msg, data)
  };
}

// Export singleton instance
export const logger = Logger.getInstance();