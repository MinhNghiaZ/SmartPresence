# 🔔 Cải Tiến Hệ Thống Thông Báo (Notification System Improvements)

## 📋 Tổng Quan

Đã cải thiện hệ thống thông báo của ứng dụng SmartPresence để cung cấp thông tin rõ ràng, cụ thể và hữu ích hơn cho người dùng.

## 🎯 Vấn Đề Trước Đây

- ❌ Thông báo chung chung, thiếu ngữ cảnh
- ❌ Không có tiêu đề (title) cho thông báo
- ❌ Không có nút hành động (action buttons)
- ❌ Code bị trùng lặp với nhiều `notify.push()` giống nhau
- ❌ Khó bảo trì và mở rộng

**Ví dụ thông báo cũ:**
```typescript
notify.push('❌ Quá trình điểm danh thất bại', 'error');
notify.push('❌ Lỗi camera', 'error');
```

## ✅ Giải Pháp Mới

### 1. **Mở Rộng Notification Model**

**File: `src/models/notification.model.ts`**

Đã thêm 3 interfaces mới:

```typescript
// Nút hành động trong thông báo
export interface NotificationAction {
  label: string;
  onClick: () => void;
}

// Tùy chọn cho thông báo
export interface NotificationOptions {
  ttl?: number;
  title?: string;
  action?: NotificationAction;
}

// Template thông báo
export interface NotificationTemplate {
  message: string;
  type: NotificationType;
  ttl?: number;
  title?: string;
}
```

**NotificationItem** được mở rộng:
```typescript
export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  createdAt: number;
  ttl: number;
  title?: string;        // ✨ MỚI
  action?: NotificationAction;  // ✨ MỚI
}
```

---

### 2. **Nâng Cấp NotificationContext**

**File: `src/context/NotificationContext.tsx`**

#### **A. Phương thức cơ bản với tùy chọn**

```typescript
// Trước
push(message: string, type?: NotificationType, ttl?: number): string

// Sau
push(message: string, type?: NotificationType, ttl?: number, title?: string, action?: NotificationAction): string
```

#### **B. Phương thức tiện ích (Shortcut Methods)**

```typescript
success(message: string, options?: NotificationOptions): string
error(message: string, options?: NotificationOptions): string
warning(message: string, options?: NotificationOptions): string
info(message: string, options?: NotificationOptions): string
```

**Ví dụ sử dụng:**
```typescript
// Thông báo đơn giản
notify.success('Đăng ký thành công!');

// Thông báo với tiêu đề và thời gian tùy chỉnh
notify.error('Mật khẩu không đúng', {
  title: 'Lỗi đăng nhập',
  ttl: 5000
});
```

#### **C. Thông báo chuyên biệt (Specialized Notifications)**

##### 📚 **Attendance (Điểm danh)**

```typescript
attendance: {
  success(subjectName: string, status: 'Present' | 'Late'): string
  alreadyCheckedIn(): string
  notTimeYet(startTime: string): string
  locationInvalid(distance: number): string
  faceNotRegistered(): string
  faceNotRecognized(): string
}
```

**Ví dụ:**
```typescript
// Điểm danh thành công
notify.attendance.success('Lập Trình Web', 'Present');
// → "✅ Điểm danh thành công cho môn "Lập Trình Web""
// Title: "Điểm danh thành công"

// Vị trí không hợp lệ
notify.attendance.locationInvalid(150);
// → "📍 Vị trí không hợp lệ. Bạn cách phòng học 150m. Vui lòng đến lớp để điểm danh."
// Title: "Vị trí không hợp lệ"

// Chưa đăng ký khuôn mặt
notify.attendance.faceNotRegistered();
// → "👤 Bạn chưa đăng ký khuôn mặt. Vui lòng bấm nút "Đăng Ký Khuôn Mặt" trước khi điểm danh."
// Title: "Chưa đăng ký khuôn mặt"
```

##### 🔐 **Auth (Xác thực)**

```typescript
auth: {
  loginSuccess(userName: string): string
  loginFailed(): string
  sessionExpired(): string
  passwordChanged(): string
  invalidCredentials(): string
}
```

**Ví dụ:**
```typescript
// Đăng nhập thành công
notify.auth.loginSuccess('Nguyễn Văn A');
// → "👋 Chào mừng Nguyễn Văn A! Đăng nhập thành công."
// Title: "Đăng nhập thành công"

// Đổi mật khẩu thành công
notify.auth.passwordChanged();
// → "✅ Đổi mật khẩu thành công! Vui lòng đăng nhập lại với mật khẩu mới."
// Title: "Đổi mật khẩu"
```

##### 🌐 **Network (Mạng)**

```typescript
network: {
  offline(): string
  connectionError(): string
  slowConnection(): string
}
```

**Ví dụ:**
```typescript
// Mất kết nối
notify.network.offline();
// → "📡 Không có kết nối mạng. Vui lòng kiểm tra kết nối Internet của bạn."
// Title: "Mất kết nối"

// Lỗi kết nối
notify.network.connectionError();
// → "⚠️ Lỗi kết nối đến máy chủ. Vui lòng thử lại sau."
// Title: "Lỗi kết nối"
```

##### 📷 **Camera**

```typescript
camera: {
  permissionDenied(): string
  notFound(): string
  inUse(): string
  error(details?: string): string
}
```

**Ví dụ:**
```typescript
// Từ chối quyền camera
notify.camera.permissionDenied();
// → "📷 Quyền truy cập camera bị từ chối. Vui lòng cấp quyền camera trong cài đặt trình duyệt."
// Title: "Cần quyền camera"

// Camera đang được sử dụng
notify.camera.inUse();
// → "🔒 Camera đang được sử dụng bởi ứng dụng khác. Vui lòng đóng các ứng dụng khác và thử lại."
// Title: "Camera bận"
```

---

## 📂 Files Đã Cập Nhật

### ✅ Core Files
- ✅ `src/models/notification.model.ts` - Thêm interfaces mới
- ✅ `src/context/NotificationContext.tsx` - Triển khai hệ thống mới

### ✅ Screens
- ✅ `src/screens/HomeScreen/HomeScreen.tsx` - 9 notifications updated
- ✅ `src/screens/LoginScreen/LoginScreen.tsx` - 4 notifications updated
- ✅ `src/screens/ChangePasswordScreen/ChangePasswordScreen.tsx` - 7 notifications updated
- ✅ `src/App.tsx` - 2 notifications updated

### ✅ Components
- ✅ `src/components/CameraScreen/FaceRecognition.tsx` - 2 notifications updated

### ✅ Cleanup
- 🗑️ `src/utils/errorNotificationHelper.ts` - **DELETED** (file rỗng)

---

## 📊 So Sánh Trước/Sau

### **Ví dụ 1: Điểm danh thành công**

**❌ Trước:**
```typescript
notify.push('✅ ' + result.message, 'success');
```
- Không có tiêu đề
- Thông báo phụ thuộc vào message từ backend
- Không nhất quán

**✅ Sau:**
```typescript
notify.attendance.success(selectedSubject.name, 'Present');
```
- Có tiêu đề: "Điểm danh thành công"
- Message nhất quán: "✅ Điểm danh thành công cho môn "Lập Trình Web""
- TTL: 5000ms
- Code ngắn gọn, dễ hiểu

---

### **Ví dụ 2: Lỗi camera**

**❌ Trước:**
```typescript
notify.push(`❌ ${error instanceof Error ? error.message : 'Không thể khởi tạo camera...'}`, 'error');
```
- Phải parse error message thủ công
- Không phân loại lỗi cụ thể
- Code dài dòng

**✅ Sau:**
```typescript
const errorMsg = error instanceof Error ? error.message.toLowerCase() : '';
if (errorMsg.includes('permission') || errorMsg.includes('denied')) {
  notify.camera.permissionDenied();
} else if (errorMsg.includes('not found')) {
  notify.camera.notFound();
} else if (errorMsg.includes('in use')) {
  notify.camera.inUse();
} else {
  notify.camera.error(error instanceof Error ? error.message : undefined);
}
```
- Phân loại lỗi cụ thể
- Thông báo rõ ràng với hướng dẫn khắc phục
- Có tiêu đề phù hợp

**Kết quả:**
- `permissionDenied()` → "📷 Quyền truy cập camera bị từ chối. Vui lòng cấp quyền camera trong cài đặt trình duyệt." (Title: "Cần quyền camera")
- `notFound()` → "📷 Không tìm thấy camera. Vui lòng kiểm tra camera có được kết nối không." (Title: "Không có camera")
- `inUse()` → "🔒 Camera đang được sử dụng bởi ứng dụng khác..." (Title: "Camera bận")

---

### **Ví dụ 3: Đăng nhập**

**❌ Trước:**
```typescript
if (result.success) {
  notify.push(result.message, 'success');
} else {
  notify.push(result.message, 'error');
}
```
- Không có tiêu đề
- Không phân biệt lỗi cụ thể
- Phụ thuộc backend message

**✅ Sau:**
```typescript
if (result.success) {
  const userName = result.user?.name || studentId;
  notify.auth.loginSuccess(userName);
} else {
  const errorMsg = result.message?.toLowerCase() || '';
  if (errorMsg.includes('không đúng') || errorMsg.includes('invalid')) {
    notify.auth.invalidCredentials();
  } else {
    notify.auth.loginFailed();
  }
}
```
- Có tiêu đề: "Đăng nhập thành công" / "Thông tin không hợp lệ"
- Phân loại lỗi rõ ràng
- Message nhất quán, thân thiện

---

## 🎨 Lợi Ích

### 1. **Trải nghiệm người dùng tốt hơn (Better UX)**
- ✅ Thông báo có tiêu đề rõ ràng
- ✅ Icon phù hợp với từng loại thông báo
- ✅ Message cụ thể, dễ hiểu
- ✅ Hướng dẫn khắc phục rõ ràng

### 2. **Code dễ bảo trì (Maintainable Code)**
- ✅ Tập trung logic thông báo ở một nơi
- ✅ Không còn duplicate code
- ✅ Dễ thay đổi message cho toàn ứng dụng
- ✅ Type-safe với TypeScript

### 3. **Dễ mở rộng (Extensible)**
- ✅ Dễ thêm category mới (ví dụ: `notify.gps.*`)
- ✅ Dễ thêm action buttons trong tương lai
- ✅ Có thể thêm templates cho notification

### 4. **Nhất quán (Consistent)**
- ✅ Tất cả notifications follow cùng một pattern
- ✅ TTL phù hợp với từng loại thông báo
- ✅ Message formatting nhất quán

---

## 📈 Thống Kê

| Metric | Trước | Sau | Cải thiện |
|--------|-------|-----|-----------|
| Tổng số `notify.push()` calls | 24 | 0 | ✅ 100% |
| Files có notification | 6 | 6 | ➖ |
| Empty files | 1 | 0 | ✅ 100% |
| Specialized methods | 0 | 18 | ✅ +18 |
| Type safety | Partial | Full | ✅ 100% |

---

## 🔜 Hướng Phát Triển Tương Lai

1. **Action Buttons**
   ```typescript
   notify.error('Mất kết nối mạng', {
     title: 'Lỗi mạng',
     action: {
       label: 'Thử lại',
       onClick: () => retryConnection()
     }
   });
   ```

2. **GPS Category**
   ```typescript
   notify.gps.locationDisabled();
   notify.gps.lowAccuracy(accuracy);
   notify.gps.outOfRange(distance);
   ```

3. **Rich Notifications**
   ```typescript
   notify.attendance.success(subject, status, {
     showProgress: true,
     showHistory: true
   });
   ```

4. **Notification Queue**
   - Quản lý hàng đợi thông báo
   - Priority levels
   - Persistent notifications

---

## 📝 Migration Guide

Nếu cần thêm notification mới trong tương lai:

### **1. Sử dụng shortcut methods:**
```typescript
// Đơn giản
notify.success('Thao tác thành công!');

// Với options
notify.error('Có lỗi xảy ra', {
  title: 'Lỗi hệ thống',
  ttl: 6000
});
```

### **2. Thêm specialized method:**
```typescript
// Trong NotificationContext.tsx
const gps = useMemo(() => ({
  locationDisabled: () => {
    return error(
      '📍 GPS chưa được bật. Vui lòng bật GPS trong cài đặt.',
      { title: 'GPS tắt', ttl: 6000 }
    );
  }
}), [error]);

// Thêm vào contextValue
const contextValue = useMemo(() => ({
  // ...existing
  gps
}), [...existing, gps]);
```

### **3. Update interface:**
```typescript
interface NotificationContextValue {
  // ...existing
  gps: {
    locationDisabled: () => string;
  };
}
```

---

## ✅ Kết Luận

Hệ thống thông báo mới:
- ✅ Cung cấp thông tin cụ thể, rõ ràng hơn
- ✅ Dễ sử dụng với specialized methods
- ✅ Dễ bảo trì và mở rộng
- ✅ Type-safe với TypeScript
- ✅ Cải thiện trải nghiệm người dùng đáng kể

**Không còn thông báo chung chung, mỗi tình huống đều có message phù hợp!** 🎉
