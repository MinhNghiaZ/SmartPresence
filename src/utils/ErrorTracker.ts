/**
 * ErrorTracker - Hệ thống tự động phát hiện và tracking lỗi
 * 
 * Tính năng:
 * - Auto-detect error types (localStorage, API, token, face, GPS)
 * - Device detection (weak/strong devices)
 * - Error categorization và severity levels
 * - Detailed logging với context
 * - Error statistics và reporting
 * - Auto-recovery suggestions
 */

import { StorageHelper } from './storageHelper';

// Error Categories
export const ErrorCategory = {
  STORAGE: 'STORAGE',           // localStorage issues
  AUTHENTICATION: 'AUTH',       // Token, login issues
  API: 'API',                   // API call failures
  FACE_RECOGNITION: 'FACE',     // Face detection/recognition
  GPS: 'GPS',                   // GPS/Location issues
  NETWORK: 'NETWORK',           // Network connectivity
  PERMISSION: 'PERMISSION',     // Browser permissions
  DEVICE: 'DEVICE',             // Device capability issues
  UNKNOWN: 'UNKNOWN'
} as const;

export type ErrorCategory = typeof ErrorCategory[keyof typeof ErrorCategory];

// Error Severity
export const ErrorSeverity = {
  CRITICAL: 'CRITICAL',   // App không thể hoạt động
  HIGH: 'HIGH',           // Feature chính bị lỗi
  MEDIUM: 'MEDIUM',       // Feature phụ bị lỗi
  LOW: 'LOW',             // Warning, không ảnh hưởng nhiều
  INFO: 'INFO'            // Thông tin debug
} as const;

export type ErrorSeverity = typeof ErrorSeverity[keyof typeof ErrorSeverity];

// Device Info
export interface DeviceInfo {
  userAgent: string;
  platform: string;
  isMobile: boolean;
  isWeakDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  memoryGB?: number;
  cores?: number;
  connection?: string;
}

// Error Info
export interface ErrorInfo {
  id: string;
  timestamp: Date;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  context?: Record<string, any>;
  device: DeviceInfo;
  solution?: string;
  recovered: boolean;
}

// Error Statistics
export interface ErrorStats {
  total: number;
  byCategory: Record<ErrorCategory, number>;
  bySeverity: Record<ErrorSeverity, number>;
  criticalErrors: ErrorInfo[];
  recentErrors: ErrorInfo[];
}

export class ErrorTracker {
  private static errors: ErrorInfo[] = [];
  private static maxErrors = 100; // Giữ tối đa 100 errors
  private static deviceInfo: DeviceInfo | null = null;

  /**
   * Initialize error tracker với device detection
   */
  static initialize(): void {
    this.deviceInfo = this.detectDevice();
    this.setupGlobalErrorHandler();
    console.log('🔍 ErrorTracker initialized', this.deviceInfo);
  }

  /**
   * Detect device capabilities
   */
  private static detectDevice(): DeviceInfo {
    const ua = navigator.userAgent.toLowerCase();
    const isMobile = /mobile|android|iphone|ipad|ipod/.test(ua);
    
    // Detect weak devices
    const isWeakDevice = this.isDeviceWeak();
    
    // Get hardware info if available
    const nav = navigator as any;
    const memory = nav.deviceMemory; // GB
    const cores = nav.hardwareConcurrency;
    const connection = nav.connection?.effectiveType;

    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isMobile,
      isWeakDevice,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      memoryGB: memory,
      cores,
      connection
    };
  }

  /**
   * Phát hiện thiết bị yếu dựa trên hardware
   */
  private static isDeviceWeak(): boolean {
    const nav = navigator as any;
    
    // Check memory
    if (nav.deviceMemory && nav.deviceMemory <= 2) {
      return true; // <= 2GB RAM
    }

    // Check cores
    if (nav.hardwareConcurrency && nav.hardwareConcurrency <= 2) {
      return true; // <= 2 cores
    }

    // Check connection
    if (nav.connection?.effectiveType === '2g' || nav.connection?.effectiveType === 'slow-2g') {
      return true; // Slow network
    }

    // Check if localStorage không hoạt động
    if (!StorageHelper.checkLocalStorage()) {
      return true; // localStorage issue = likely weak device
    }

    return false;
  }

  /**
   * Setup global error handler
   */
  private static setupGlobalErrorHandler(): void {
    // Catch unhandled errors
    window.addEventListener('error', (event) => {
      this.trackError({
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.HIGH,
        message: event.message,
        stack: event.error?.stack,
        context: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      });
    });

    // Catch unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        category: ErrorCategory.UNKNOWN,
        severity: ErrorSeverity.HIGH,
        message: `Unhandled Promise Rejection: ${event.reason}`,
        context: {
          reason: event.reason
        }
      });
    });
  }

  /**
   * Track error với auto-detection
   */
  static trackError(params: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    message: string;
    error?: Error | any;
    stack?: string;
    context?: Record<string, any>;
  }): ErrorInfo {
    const { message, error, stack, context } = params;

    // Auto-detect category nếu không được cung cấp
    const category = params.category || this.detectCategory(message, error, context);
    
    // Auto-detect severity
    const severity = params.severity || this.detectSeverity(category, message, error);

    // Generate error ID
    const id = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create error info
    const errorInfo: ErrorInfo = {
      id,
      timestamp: new Date(),
      category,
      severity,
      message,
      stack: stack || error?.stack,
      context: {
        ...context,
        errorName: error?.name,
        errorMessage: error?.message
      },
      device: this.deviceInfo || this.detectDevice(),
      solution: this.getSolution(category, message, error),
      recovered: false
    };

    // Store error
    this.errors.push(errorInfo);
    
    // Limit array size
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to console based on severity
    this.logError(errorInfo);

    // Save to storage for persistence
    this.saveErrors();

    return errorInfo;
  }

  /**
   * Auto-detect error category
   */
  private static detectCategory(
    message: string,
    _error?: Error | any,
    context?: Record<string, any>
  ): ErrorCategory {
    const msg = message.toLowerCase();
    const errorMsg = _error?.message?.toLowerCase() || '';

    // localStorage issues
    if (msg.includes('localstorage') || msg.includes('storage') || 
        msg.includes('quotaexceeded') || errorMsg.includes('storage')) {
      return ErrorCategory.STORAGE;
    }

    // Authentication issues
    if (msg.includes('token') || msg.includes('login') || msg.includes('auth') ||
        msg.includes('session') || msg.includes('401') || msg.includes('403')) {
      return ErrorCategory.AUTHENTICATION;
    }

    // Face recognition issues
    if (msg.includes('face') || msg.includes('descriptor') || msg.includes('detection') ||
        msg.includes('recognition') || context?.service === 'face') {
      return ErrorCategory.FACE_RECOGNITION;
    }

    // GPS issues
    if (msg.includes('gps') || msg.includes('location') || msg.includes('geolocation') ||
        msg.includes('position')) {
      return ErrorCategory.GPS;
    }

    // API issues
    if (msg.includes('api') || msg.includes('fetch') || msg.includes('http') ||
        msg.includes('network') || msg.includes('status') || _error?.name === 'TypeError') {
      return ErrorCategory.API;
    }

    // Network issues
    if (msg.includes('network') || msg.includes('offline') || msg.includes('connection') ||
        _error?.message?.includes('Failed to fetch')) {
      return ErrorCategory.NETWORK;
    }

    // Permission issues
    if (msg.includes('permission') || msg.includes('denied') || msg.includes('notallowed')) {
      return ErrorCategory.PERMISSION;
    }

    // Device issues
    if (msg.includes('device') || msg.includes('browser') || msg.includes('unsupported')) {
      return ErrorCategory.DEVICE;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Auto-detect error severity
   */
  private static detectSeverity(
    category: ErrorCategory,
    message: string,
    _error?: Error | any
  ): ErrorSeverity {
    const msg = message.toLowerCase();

    // Critical keywords
    if (msg.includes('critical') || msg.includes('fatal') || 
        msg.includes('cannot continue') || msg.includes('app crash')) {
      return ErrorSeverity.CRITICAL;
    }

    // High severity by category
    if (category === ErrorCategory.AUTHENTICATION || 
        category === ErrorCategory.STORAGE) {
      return ErrorSeverity.HIGH;
    }

    // Medium severity
    if (category === ErrorCategory.FACE_RECOGNITION ||
        category === ErrorCategory.GPS ||
        category === ErrorCategory.API) {
      return ErrorSeverity.MEDIUM;
    }

    // Low severity
    if (msg.includes('warning') || msg.includes('deprecated')) {
      return ErrorSeverity.LOW;
    }

    return ErrorSeverity.MEDIUM;
  }

  /**
   * Get solution suggestion based on error
   */
  private static getSolution(
    category: ErrorCategory,
    message: string,
    _error?: Error | any
  ): string {
    const msg = message.toLowerCase();

    switch (category) {
      case ErrorCategory.STORAGE:
        if (msg.includes('quotaexceeded')) {
          return 'Xóa dữ liệu cũ hoặc clear browser cache. Sử dụng memory fallback.';
        }
        return 'localStorage không khả dụng. Đã tự động chuyển sang memory storage. Data sẽ mất khi refresh page.';

      case ErrorCategory.AUTHENTICATION:
        if (msg.includes('token')) {
          return 'Token bị mất hoặc hết hạn. Vui lòng đăng nhập lại.';
        }
        return 'Lỗi xác thực. Thử logout và login lại.';

      case ErrorCategory.FACE_RECOGNITION:
        if (msg.includes('model')) {
          return 'AI models chưa load xong. Đợi một chút hoặc refresh page.';
        }
        if (msg.includes('no face')) {
          return 'Không phát hiện khuôn mặt. Đảm bảo mặt trong khung và đủ ánh sáng.';
        }
        return 'Lỗi nhận dạng khuôn mặt. Thử lại với ánh sáng tốt hơn.';

      case ErrorCategory.GPS:
        if (msg.includes('permission')) {
          return 'Cấp quyền truy cập vị trí cho trình duyệt trong Settings.';
        }
        return 'Không thể lấy vị trí. Bật GPS và cho phép trình duyệt truy cập.';

      case ErrorCategory.API:
        if (msg.includes('401') || msg.includes('403')) {
          return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
        }
        if (msg.includes('500') || msg.includes('502') || msg.includes('503')) {
          return 'Lỗi server. Vui lòng thử lại sau ít phút.';
        }
        return 'Lỗi kết nối API. Kiểm tra kết nối mạng.';

      case ErrorCategory.NETWORK:
        return 'Lỗi mạng. Kiểm tra kết nối Internet và thử lại.';

      case ErrorCategory.PERMISSION:
        return 'Cần cấp quyền truy cập. Kiểm tra settings trình duyệt.';

      case ErrorCategory.DEVICE:
        if (this.deviceInfo?.isWeakDevice) {
          return 'Thiết bị yếu có thể gặp vấn đề về hiệu năng. Thử đóng các app khác.';
        }
        return 'Thiết bị hoặc trình duyệt không hỗ trợ đầy đủ. Cập nhật trình duyệt.';

      default:
        return 'Lỗi không xác định. Thử refresh page hoặc liên hệ support.';
    }
  }

  /**
   * Log error to console
   */
  private static logError(errorInfo: ErrorInfo): void {
    const emoji = this.getSeverityEmoji(errorInfo.severity);
    const prefix = `${emoji} [${errorInfo.category}] ${errorInfo.severity}:`;

    console.group(prefix, errorInfo.message);
    console.log('📅 Time:', errorInfo.timestamp.toLocaleString());
    console.log('🆔 Error ID:', errorInfo.id);
    
    if (errorInfo.context) {
      console.log('📋 Context:', errorInfo.context);
    }
    
    if (errorInfo.stack) {
      console.log('📚 Stack:', errorInfo.stack);
    }
    
    console.log('💡 Solution:', errorInfo.solution);
    console.log('📱 Device:', {
      platform: errorInfo.device.platform,
      isWeak: errorInfo.device.isWeakDevice,
      memory: errorInfo.device.memoryGB,
      cores: errorInfo.device.cores
    });
    
    console.groupEnd();
  }

  /**
   * Get emoji for severity
   */
  private static getSeverityEmoji(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL: return '🔴';
      case ErrorSeverity.HIGH: return '🟠';
      case ErrorSeverity.MEDIUM: return '🟡';
      case ErrorSeverity.LOW: return '🟢';
      case ErrorSeverity.INFO: return '🔵';
      default: return '⚪';
    }
  }

  /**
   * Mark error as recovered
   */
  static markRecovered(errorId: string): void {
    const error = this.errors.find(e => e.id === errorId);
    if (error) {
      error.recovered = true;
      this.saveErrors();
      console.log('✅ Error recovered:', errorId);
    }
  }

  /**
   * Get error statistics
   */
  static getStats(): ErrorStats {
    const byCategory: Record<ErrorCategory, number> = {} as any;
    const bySeverity: Record<ErrorSeverity, number> = {} as any;

    // Initialize counts
    Object.values(ErrorCategory).forEach(cat => byCategory[cat] = 0);
    Object.values(ErrorSeverity).forEach(sev => bySeverity[sev] = 0);

    // Count errors
    this.errors.forEach(error => {
      byCategory[error.category]++;
      bySeverity[error.severity]++;
    });

    // Get critical errors
    const criticalErrors = this.errors.filter(
      e => e.severity === ErrorSeverity.CRITICAL || e.severity === ErrorSeverity.HIGH
    ).slice(-10); // Last 10

    // Get recent errors
    const recentErrors = this.errors.slice(-10); // Last 10

    return {
      total: this.errors.length,
      byCategory,
      bySeverity,
      criticalErrors,
      recentErrors
    };
  }

  /**
   * Get all errors
   */
  static getAllErrors(): ErrorInfo[] {
    return [...this.errors];
  }

  /**
   * Get errors by category
   */
  static getErrorsByCategory(category: ErrorCategory): ErrorInfo[] {
    return this.errors.filter(e => e.category === category);
  }

  /**
   * Clear all errors
   */
  static clearErrors(): void {
    this.errors = [];
    this.saveErrors();
    console.log('🗑️ All errors cleared');
  }

  /**
   * Save errors to storage
   */
  private static saveErrors(): void {
    try {
      const recentErrors = this.errors.slice(-20); // Keep last 20
      StorageHelper.setItem('error_tracker', JSON.stringify(recentErrors));
    } catch (error) {
      console.error('Failed to save errors:', error);
    }
  }

  /**
   * Load errors from storage
   */
  static loadErrors(): void {
    try {
      const stored = StorageHelper.getItem('error_tracker');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.errors = parsed.map((e: any) => ({
          ...e,
          timestamp: new Date(e.timestamp)
        }));
        console.log(`📂 Loaded ${this.errors.length} errors from storage`);
      }
    } catch (error) {
      console.error('Failed to load errors:', error);
    }
  }

  /**
   * Export errors as JSON
   */
  static exportErrors(): string {
    return JSON.stringify({
      device: this.deviceInfo,
      stats: this.getStats(),
      errors: this.errors
    }, null, 2);
  }
}

// Auto-initialize when imported
ErrorTracker.initialize();
ErrorTracker.loadErrors();
