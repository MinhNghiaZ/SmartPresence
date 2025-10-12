/**
 * Production-ready Logger System
 * - Only logs errors and warnings in production
 * - Never logs sensitive data (passwords, tokens)
 * - Minimal I/O operations
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogConfig {
    environment: 'production' | 'development' | 'test';
    minLevel: LogLevel;
}

class Logger {
    private config: LogConfig;
    private logLevels: Record<LogLevel, number> = {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3
    };

    constructor() {
        this.config = {
            environment: (process.env.NODE_ENV as any) || 'development',
            minLevel: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
        };
    }

    private shouldLog(level: LogLevel): boolean {
        return this.logLevels[level] <= this.logLevels[this.config.minLevel];
    }

    private sanitizeData(data: any): any {
        if (typeof data !== 'object' || data === null) {
            return data;
        }

        const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'currentPassword', 'newPassword'];
        const sanitized = Array.isArray(data) ? [...data] : { ...data };

        for (const key in sanitized) {
            const lowerKey = key.toLowerCase();
            if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                sanitized[key] = this.sanitizeData(sanitized[key]);
            }
        }

        return sanitized;
    }

    private formatMessage(level: LogLevel, message: string, data?: any): string {
        const timestamp = new Date().toISOString();
        const sanitizedData = data ? this.sanitizeData(data) : undefined;
        
        if (sanitizedData) {
            return `[${timestamp}] [${level.toUpperCase()}] ${message} ${JSON.stringify(sanitizedData)}`;
        }
        return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    }

    error(message: string, error?: any): void {
        if (!this.shouldLog('error')) return;
        
        const errorData = error instanceof Error ? {
            name: error.name,
            message: error.message,
            stack: this.config.environment === 'development' ? error.stack : undefined
        } : error;

        console.error(this.formatMessage('error', message, errorData));
    }

    warn(message: string, data?: any): void {
        if (!this.shouldLog('warn')) return;
        console.warn(this.formatMessage('warn', message, data));
    }

    info(message: string, data?: any): void {
        if (!this.shouldLog('info')) return;
        console.log(this.formatMessage('info', message, data));
    }

    debug(message: string, data?: any): void {
        if (!this.shouldLog('debug')) return;
        console.log(this.formatMessage('debug', message, data));
    }

    // Special method for performance monitoring
    performance(operation: string, duration: number): void {
        if (duration > 1000) { // Only log slow operations (>1s)
            this.warn(`Slow operation detected: ${operation}`, { duration_ms: duration });
        } else if (this.config.environment === 'development') {
            this.debug(`Performance: ${operation}`, { duration_ms: duration });
        }
    }
}

// Singleton instance
export const logger = new Logger();

// Helper function for measuring performance
export function measurePerformance<T>(
    operation: string,
    fn: () => Promise<T>
): Promise<T> {
    const start = Date.now();
    return fn().finally(() => {
        const duration = Date.now() - start;
        logger.performance(operation, duration);
    });
}
