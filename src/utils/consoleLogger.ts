/**
 * Production-safe Logger Utility
 * Automatically disables console.log in production, keeps console.error always
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

interface Logger {
  log: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  debug: (...args: any[]) => void;
  group: (label: string) => void;
  groupEnd: () => void;
}

/**
 * Development logger - logs everything
 */
const devLogger: Logger = {
  log(...args: any[]) {
    console.log(...args);
  },
  info(...args: any[]) {
    console.info(...args);
  },
  warn(...args: any[]) {
    console.warn(...args);
  },
  error(...args: any[]) {
    console.error(...args);
  },
  debug(...args: any[]) {
    console.debug(...args);
  },
  group(label: string) {
    console.group(label);
  },
  groupEnd() {
    console.groupEnd();
  },
};

/**
 * Production logger - only logs errors
 */
const prodLogger: Logger = {
  log() {}, // No-op
  info() {}, // No-op
  warn() {}, // No-op
  error(...args: any[]) {
    console.error(...args);
  }, // Always log errors
  debug() {}, // No-op
  group() {}, // No-op
  groupEnd() {}, // No-op
};

/**
 * Export the appropriate logger based on environment
 */
export const consoleLogger = isDevelopment ? devLogger : prodLogger;

/**
 * Specialized logger for face recognition with emoji prefixes
 */
export const faceLogger = {
  start(...args: any[]) {
    consoleLogger.log('🎯 FACE RECOGNITION STARTING:', ...args);
  },
  completed(...args: any[]) {
    consoleLogger.log('✅ FACE RECOGNITION COMPLETED:', ...args);
  },
  skipped(...args: any[]) {
    consoleLogger.log('🚫 FACE RECOGNITION SKIPPED:', ...args);
  },
  error(...args: any[]) {
    consoleLogger.error('❌ FACE RECOGNITION ERROR:', ...args);
  },
  finished() {
    consoleLogger.log('🏁 FACE RECOGNITION FINISHED');
  },
  alignment(aligned: boolean, details: string) {
    if (aligned) {
      consoleLogger.log(`✅ Face aligned! ${details}`);
    } else {
      consoleLogger.log(`⚠️ Face alignment failed: ${details}`);
    }
  },
};

/**
 * Specialized logger for camera operations
 */
export const cameraLogger = {
  start(...args: any[]) {
    consoleLogger.log('📹 Camera starting...', ...args);
  },
  success(...args: any[]) {
    consoleLogger.log('📹 Camera started successfully', ...args);
  },
  error(...args: any[]) {
    consoleLogger.error('📹 Camera Error:', ...args);
  },
  strategy(num: number, total: number) {
    consoleLogger.log(`📹 Trying camera strategy ${num}/${total}`);
  },
  info(message: string, data?: any) {
    consoleLogger.log(`📹 ${message}`, data || '');
  },
};

/**
 * Performance logger
 */
export const perfLogger = {
  mark(name: string) {
    if (isDevelopment && performance) {
      performance.mark(name);
    }
  },
  measure(name: string, startMark: string, endMark: string) {
    if (isDevelopment && performance) {
      try {
        performance.measure(name, startMark, endMark);
        const measure = performance.getEntriesByName(name)[0];
        consoleLogger.log(`⏱️ ${name}: ${measure.duration.toFixed(2)}ms`);
      } catch (e) {
        // Ignore if marks don't exist
      }
    }
  },
};

/**
 * Helper to check if we're in development mode
 */
export const isDevMode = (): boolean => isDevelopment;

export default consoleLogger;
