/**
 * Conditional Logger - Only logs in development or when errors occur
 * Giảm logging không cần thiết trong production
 */

const isDevelopment = process.env.NODE_ENV === 'development';

export class ConditionalLogger {
    /**
     * Log chỉ trong development mode
     */
    static dev(...args: any[]): void {
        if (isDevelopment) {
            console.log(...args);
        }
    }

    /**
     * Log info - chỉ cho các sự kiện quan trọng
     */
    static info(...args: any[]): void {
        // Chỉ log startup info và critical events
        if (isDevelopment) {
            console.log(...args);
        }
    }

    /**
     * Log warning - luôn log
     */
    static warn(...args: any[]): void {
        console.warn(...args);
    }

    /**
     * Log error - luôn log
     */
    static error(...args: any[]): void {
        console.error(...args);
    }

    /**
     * Log success - chỉ trong development
     */
    static success(...args: any[]): void {
        if (isDevelopment) {
            console.log(...args);
        }
    }

    /**
     * Log debug - chỉ khi có biến môi trường DEBUG=true
     */
    static debug(...args: any[]): void {
        if (process.env.DEBUG === 'true') {
            console.log(...args);
        }
    }
}

// Export singleton cho convenience
export const logger = ConditionalLogger;
