# 🔍 ErrorTracker - Hệ thống Phát hiện và Tracking Lỗi Tự động

## 📋 Tổng quan

ErrorTracker là hệ thống tự động phát hiện, phân loại và tracking lỗi trong SmartPresence. Được thiết kế để:
- **Tự động phát hiện** loại lỗi (localStorage, API, token, face recognition, GPS)
- **Phát hiện thiết bị yếu** (Redmi Note 10 JE, etc.)
- **Đề xuất giải pháp** tự động cho từng loại lỗi
- **Tracking chi tiết** với context, stack trace, device info
- **Reporting và statistics** để phân tích vấn đề

## 🎯 Vấn đề giải quyết

### Các loại lỗi được phát hiện:

1. **STORAGE** - localStorage issues
   - Quota exceeded
   - localStorage disabled (private mode)
   - Storage không khả dụng (thiết bị yếu)

2. **AUTHENTICATION** - Token & login
   - Token bị null/expired
   - Session expired (401)
   - Login failures

3. **API** - API call failures
   - Network errors
   - HTTP status errors (4xx, 5xx)
   - Timeout issues

4. **FACE_RECOGNITION** - Face detection/recognition
   - Model loading failures
   - No face detected
   - Multiple faces detected
   - Recognition failures

5. **GPS** - Location issues
   - Permission denied
   - GPS not available
   - Location timeout

6. **NETWORK** - Connectivity
   - Offline status
   - Connection failures
   - Slow network

7. **PERMISSION** - Browser permissions
   - Camera blocked
   - Location blocked
   - Notification blocked

8. **DEVICE** - Device capability
   - Weak device detection
   - Unsupported browser
   - Low memory

## 🚀 Cách sử dụng

### 1. Auto-initialization

ErrorTracker tự động khởi tạo khi import:

```typescript
// Tự động chạy khi import bất kỳ file nào
import { ErrorTracker } from './utils/ErrorTracker';
```

### 2. Track errors manually

```typescript
import { ErrorTracker, ErrorCategory, ErrorSeverity } from './utils/ErrorTracker';

try {
  // Your code
} catch (error) {
  ErrorTracker.trackError({
    category: ErrorCategory.API,          // Optional - auto-detect if not provided
    severity: ErrorSeverity.HIGH,         // Optional - auto-detect if not provided
    message: 'Failed to fetch data',
    error: error as Error,                // Optional but recommended
    context: {                            // Optional additional info
      service: 'MyService',
      method: 'fetchData',
      userId: '123'
    }
  });
}
```

### 3. Auto-detection

ErrorTracker tự động detect category và severity:

```typescript
// ✅ Auto-detect category from message
ErrorTracker.trackError({
  message: 'localStorage quota exceeded'  // → STORAGE category
});

ErrorTracker.trackError({
  message: 'Token not found'              // → AUTHENTICATION category
});

ErrorTracker.trackError({
  message: 'Failed to load face models'   // → FACE_RECOGNITION category
});
```

### 4. Get error statistics

```typescript
const stats = ErrorTracker.getStats();

console.log('Total errors:', stats.total);
console.log('By category:', stats.byCategory);
console.log('By severity:', stats.bySeverity);
console.log('Critical errors:', stats.criticalErrors);
console.log('Recent errors:', stats.recentErrors);
```

### 5. Get errors by category

```typescript
const authErrors = ErrorTracker.getErrorsByCategory(ErrorCategory.AUTHENTICATION);
const faceErrors = ErrorTracker.getErrorsByCategory(ErrorCategory.FACE_RECOGNITION);
```

### 6. Export errors (for debugging)

```typescript
const json = ErrorTracker.exportErrors();
// Download or send to server
```

### 7. Clear errors

```typescript
ErrorTracker.clearErrors();
```

## 🎨 UI Component - ErrorDashboard

### Usage:

```tsx
import ErrorDashboard from './components/ErrorDashboard/ErrorDashboard';

function DebugScreen() {
  return (
    <ErrorDashboard 
      maxErrors={20}          // Show last 20 errors
      showDeviceInfo={true}   // Show device information
    />
  );
}
```

### Features:

- **Real-time updates** (auto-refresh every 5s)
- **Filter by category** (STORAGE, AUTH, API, etc.)
- **Statistics overview** (total, by severity, by category)
- **Device information** (platform, memory, cores, weak/strong)
- **Error details** (message, stack, context, solution)
- **Export to JSON** (for sharing với support team)
- **Clear all errors**

## 📊 Device Detection

ErrorTracker tự động phát hiện thiết bị yếu:

### Criteria:

- **Memory ≤ 2GB** → Weak device
- **CPU cores ≤ 2** → Weak device
- **Slow network** (2G, slow-2G) → Weak device
- **localStorage không hoạt động** → Weak device

### Device Info:

```typescript
{
  userAgent: string,
  platform: string,
  isMobile: boolean,
  isWeakDevice: boolean,      // ⚠️ Important for debugging
  screenWidth: number,
  screenHeight: number,
  memoryGB?: number,
  cores?: number,
  connection?: string
}
```

## 💡 Solution Suggestions

ErrorTracker tự động đề xuất giải pháp:

### Examples:

**STORAGE errors:**
```
"localStorage không khả dụng. Đã tự động chuyển sang memory storage. 
Data sẽ mất khi refresh page."
```

**AUTHENTICATION errors:**
```
"Token bị mất hoặc hết hạn. Vui lòng đăng nhập lại."
```

**FACE_RECOGNITION errors:**
```
"Không phát hiện khuôn mặt. Đảm bảo mặt trong khung và đủ ánh sáng."
```

**GPS errors:**
```
"Cấp quyền truy cập vị trí cho trình duyệt trong Settings."
```

## 🔧 Integration Examples

### AuthService:

```typescript
import { ErrorTracker, ErrorCategory, ErrorSeverity } from '../../utils/ErrorTracker';

static async login(id: string, password: string): Promise<LoginResult> {
  try {
    // Login logic
  } catch (error) {
    ErrorTracker.trackError({
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      message: 'Login failed',
      error: error as Error,
      context: {
        userId: id,
        service: 'AuthService',
        method: 'login'
      }
    });
    throw error;
  }
}
```

### FaceRecognizeService:

```typescript
async initializeModels(): Promise<void> {
  try {
    await Promise.all([...]);
  } catch (error) {
    ErrorTracker.trackError({
      category: ErrorCategory.FACE_RECOGNITION,
      severity: ErrorSeverity.CRITICAL,
      message: 'Failed to load face recognition models',
      error: error as Error,
      context: {
        service: 'FaceRecognizeService',
        method: 'initializeModels',
        modelUrl: this.MODEL_URL
      }
    });
    throw error;
  }
}
```

## 📈 Benefits

### For Developers:

- ✅ **Tự động phát hiện** loại lỗi → không cần categorize manually
- ✅ **Chi tiết context** → debug nhanh hơn
- ✅ **Device info** → biết lỗi xảy ra trên thiết bị nào
- ✅ **Solution suggestions** → biết cách fix ngay

### For Users:

- ✅ **Better error messages** → hiểu lỗi là gì
- ✅ **Auto-recovery** → app tự fix một số lỗi (localStorage fallback)
- ✅ **Clear instructions** → biết phải làm gì

### For Support Team:

- ✅ **Export errors** → users có thể gửi error report dễ dàng
- ✅ **Statistics** → biết lỗi nào xảy ra nhiều nhất
- ✅ **Device info** → biết vấn đề với thiết bị cụ thể

## 🧪 Testing

### Test error tracking:

```typescript
// Test auto-detection
ErrorTracker.trackError({ message: 'localStorage quota exceeded' });
ErrorTracker.trackError({ message: 'Token not found' });
ErrorTracker.trackError({ message: 'No face detected' });

// Check stats
const stats = ErrorTracker.getStats();
console.log(stats);

// Export
const json = ErrorTracker.exportErrors();
console.log(json);
```

### Test trong console:

```javascript
// Get stats
ErrorTracker.getStats()

// Get all errors
ErrorTracker.getAllErrors()

// Clear
ErrorTracker.clearErrors()

// Export
ErrorTracker.exportErrors()
```

## 📁 Files Created

```
src/
├── utils/
│   └── ErrorTracker.ts          ← Main tracking logic
├── components/
│   └── ErrorDashboard/
│       ├── ErrorDashboard.tsx   ← UI component
│       └── ErrorDashboard.css   ← Styles
```

## 🔄 Data Persistence

ErrorTracker tự động lưu errors vào StorageHelper:

- **Last 20 errors** được lưu
- **Automatic save** sau mỗi lần track error
- **Auto-load** khi khởi động app
- **Fallback to memory** nếu localStorage fail

## ⚠️ Limitations

1. **Memory fallback không persistent**:
   - Errors chỉ giữ trong memory
   - Mất khi refresh page
   - Workaround: Export to JSON trước khi close

2. **Max 100 errors in memory**:
   - Giữ tối đa 100 errors
   - Errors cũ sẽ bị xóa
   - Workaround: Export định kỳ

3. **No server-side tracking**:
   - Chỉ track ở client-side
   - Không tự động gửi về server
   - Future: Implement server reporting API

## 🚀 Future Improvements

1. **Server-side reporting**:
   - Tự động gửi critical errors về server
   - Centralized error dashboard cho admins

2. **Error recovery strategies**:
   - Auto-retry failed API calls
   - Auto-refresh tokens
   - Graceful degradation

3. **Performance monitoring**:
   - Track performance metrics
   - Detect slow operations
   - Memory usage monitoring

4. **User feedback**:
   - Allow users to add comments to errors
   - "Was this helpful?" for solutions
   - Error reporting modal

---

**Version**: 1.0.0  
**Last Updated**: 2025-11-18  
**Author**: GitHub Copilot
