/**
 * ErrorTracker Usage Examples
 * 
 * Các ví dụ sử dụng ErrorTracker trong các scenarios thực tế
 */

import { ErrorTracker, ErrorCategory, ErrorSeverity } from '../utils/ErrorTracker';

// ===================================
// EXAMPLE 1: Auto-detection
// ===================================

export function exampleAutoDetection() {
  console.log('=== Example 1: Auto-detection ===\n');

  // ErrorTracker tự động detect category từ message
  ErrorTracker.trackError({
    message: 'localStorage quota exceeded'
  });
  // → Auto-detect: STORAGE category, HIGH severity

  ErrorTracker.trackError({
    message: 'Token not found, please login again'
  });
  // → Auto-detect: AUTHENTICATION category, HIGH severity

  ErrorTracker.trackError({
    message: 'Failed to fetch API data: 500'
  });
  // → Auto-detect: API category, MEDIUM severity

  ErrorTracker.trackError({
    message: 'No face detected in image'
  });
  // → Auto-detect: FACE_RECOGNITION category, MEDIUM severity

  ErrorTracker.trackError({
    message: 'GPS permission denied by user'
  });
  // → Auto-detect: GPS category, MEDIUM severity

  // Get stats
  const stats = ErrorTracker.getStats();
  console.log('Stats after auto-detection:', stats);
  console.log('\n');
}

// ===================================
// EXAMPLE 2: Manual tracking với context
// ===================================

export function exampleManualTracking() {
  console.log('=== Example 2: Manual tracking ===\n');

  try {
    // Simulate API call
    throw new Error('Network timeout after 30 seconds');
  } catch (error) {
    ErrorTracker.trackError({
      category: ErrorCategory.API,
      severity: ErrorSeverity.HIGH,
      message: 'API call failed due to timeout',
      error: error as Error,
      context: {
        service: 'UserService',
        method: 'fetchUserData',
        url: '/api/users/123',
        timeout: 30000,
        retryCount: 3
      }
    });
  }

  console.log('Error tracked with full context\n');
}

// ===================================
// EXAMPLE 3: Integration với Service
// ===================================

export class ExampleService {
  async loadData(userId: string): Promise<any> {
    try {
      const response = await fetch(`/api/data/${userId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      // Track error với đầy đủ context
      ErrorTracker.trackError({
        category: ErrorCategory.API,
        severity: ErrorSeverity.HIGH,
        message: 'Failed to load user data',
        error: error as Error,
        context: {
          service: 'ExampleService',
          method: 'loadData',
          userId,
          timestamp: new Date().toISOString()
        }
      });
      
      // Re-throw để caller có thể handle
      throw error;
    }
  }

  async checkStorageAvailability(): Promise<boolean> {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return true;
    } catch (error) {
      ErrorTracker.trackError({
        category: ErrorCategory.STORAGE,
        severity: ErrorSeverity.HIGH,
        message: 'localStorage not available',
        error: error as Error,
        context: {
          service: 'ExampleService',
          method: 'checkStorageAvailability',
          quota: (navigator as any).storage?.estimate()
        }
      });
      return false;
    }
  }
}

// ===================================
// EXAMPLE 4: Get statistics
// ===================================

export function exampleGetStatistics() {
  console.log('=== Example 4: Statistics ===\n');

  const stats = ErrorTracker.getStats();

  console.log('Total errors:', stats.total);
  console.log('\nBy Category:');
  Object.entries(stats.byCategory).forEach(([cat, count]) => {
    if (count > 0) {
      console.log(`  ${cat}: ${count}`);
    }
  });

  console.log('\nBy Severity:');
  Object.entries(stats.bySeverity).forEach(([sev, count]) => {
    if (count > 0) {
      console.log(`  ${sev}: ${count}`);
    }
  });

  console.log('\nCritical Errors:');
  stats.criticalErrors.forEach(err => {
    console.log(`  - [${err.category}] ${err.message}`);
  });

  console.log('\nRecent Errors:');
  stats.recentErrors.slice(0, 5).forEach(err => {
    console.log(`  - [${err.timestamp.toLocaleTimeString()}] ${err.message}`);
  });

  console.log('\n');
}

// ===================================
// EXAMPLE 5: Filter errors by category
// ===================================

export function exampleFilterErrors() {
  console.log('=== Example 5: Filter by category ===\n');

  // Get all auth errors
  const authErrors = ErrorTracker.getErrorsByCategory(ErrorCategory.AUTHENTICATION);
  console.log(`Authentication errors: ${authErrors.length}`);
  authErrors.forEach(err => {
    console.log(`  - ${err.message}`);
    console.log(`    Solution: ${err.solution}`);
  });

  // Get all API errors
  const apiErrors = ErrorTracker.getErrorsByCategory(ErrorCategory.API);
  console.log(`\nAPI errors: ${apiErrors.length}`);
  apiErrors.forEach(err => {
    console.log(`  - ${err.message}`);
    console.log(`    Context:`, err.context);
  });

  console.log('\n');
}

// ===================================
// EXAMPLE 6: Export errors
// ===================================

export function exampleExportErrors() {
  console.log('=== Example 6: Export errors ===\n');

  const json = ErrorTracker.exportErrors();
  console.log('Exported JSON (first 500 chars):');
  console.log(json.substring(0, 500) + '...');

  // Save to file (browser)
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `errors_${new Date().toISOString()}.json`;
  // a.click(); // Uncomment to actually download

  console.log('\nJSON ready for download');
  console.log('\n');
}

// ===================================
// EXAMPLE 7: Device detection
// ===================================

export function exampleDeviceDetection() {
  console.log('=== Example 7: Device Detection ===\n');

  const errors = ErrorTracker.getAllErrors();
  if (errors.length > 0) {
    const device = errors[0].device;
    
    console.log('Device Information:');
    console.log(`  Platform: ${device.platform}`);
    console.log(`  Type: ${device.isMobile ? 'Mobile' : 'Desktop'}`);
    console.log(`  Is Weak Device: ${device.isWeakDevice ? 'YES ⚠️' : 'NO ✅'}`);
    console.log(`  Memory: ${device.memoryGB || 'Unknown'} GB`);
    console.log(`  CPU Cores: ${device.cores || 'Unknown'}`);
    console.log(`  Screen: ${device.screenWidth}x${device.screenHeight}`);
    console.log(`  Connection: ${device.connection || 'Unknown'}`);

    if (device.isWeakDevice) {
      console.log('\n⚠️ WARNING: Weak device detected!');
      console.log('   This device may experience:');
      console.log('   - localStorage issues');
      console.log('   - Slow face recognition');
      console.log('   - Memory limitations');
    }
  } else {
    console.log('No errors yet, cannot show device info');
  }

  console.log('\n');
}

// ===================================
// EXAMPLE 8: Clear errors
// ===================================

export function exampleClearErrors() {
  console.log('=== Example 8: Clear errors ===\n');

  console.log('Before clear:', ErrorTracker.getStats().total, 'errors');
  
  ErrorTracker.clearErrors();
  
  console.log('After clear:', ErrorTracker.getStats().total, 'errors');
  console.log('\n');
}

// ===================================
// RUN ALL EXAMPLES
// ===================================

export function runAllExamples() {
  console.log('🔍 ErrorTracker Usage Examples\n');
  console.log('=====================================\n');

  exampleAutoDetection();
  exampleManualTracking();
  exampleGetStatistics();
  exampleFilterErrors();
  exampleDeviceDetection();
  exampleExportErrors();
  exampleClearErrors();

  console.log('✅ All examples completed!\n');
  console.log('=====================================\n');
}

// Usage:
// import { runAllExamples } from './ErrorTrackerExamples';
// runAllExamples();
