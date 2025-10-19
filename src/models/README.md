# Models Directory

Thư mục này chứa tất cả các Interface và Type definitions được sử dụng chung trong toàn bộ frontend application.

## 📁 Cấu trúc

```
src/models/
├── index.ts                    # Central export point - import tất cả models từ đây
├── user.model.ts              # User và Authentication models
├── subject.model.ts           # Subject và Course models
├── attendance.model.ts        # Attendance và Check-in records models
├── face.model.ts              # Face Recognition models
├── gps.model.ts               # GPS và Location models
├── checkin.model.ts           # Unified Check-in models
├── image.model.ts             # Image Capture models
└── notification.model.ts      # Notification models
```

## 🎯 Mục đích

- **Tập trung hóa**: Tất cả interfaces được định nghĩa ở một nơi
- **Tái sử dụng**: Dễ dàng import và sử dụng ở nhiều nơi
- **Dễ bảo trì**: Chỉnh sửa interface một lần, áp dụng toàn bộ project
- **Type Safety**: Đảm bảo type consistency trong toàn bộ application

## 📖 Cách sử dụng

### Import từ central export

```typescript
// ✅ RECOMMENDED: Import từ models/index.ts
import type { User, LoginResult, Subject, AttendanceRecord } from '../models';
```

### Import từ file cụ thể (nếu cần)

```typescript
// ⚠️ Chỉ khi cần thiết
import type { User } from '../models/user.model';
import type { Subject } from '../models/subject.model';
```

## 📝 Chi tiết các Models

### user.model.ts
- `User`: Thông tin người dùng/sinh viên
- `LoginResult`: Kết quả đăng nhập

### subject.model.ts
- `Subject`: Thông tin môn học cơ bản
- `SubjectInfo`: Thông tin môn học chi tiết cho hiển thị
- `SubjectWithSchedule`: Môn học kèm lịch học
- `StudentSubjectsResponse`: Response từ API lấy môn học của sinh viên

### attendance.model.ts
- `AttendanceRecord`: Bản ghi điểm danh
- `AttendanceCheckInRequest`: Request điểm danh
- `AttendanceCheckInResponse`: Response điểm danh
- `AttendanceStats`: Thống kê điểm danh
- `AttendanceHistoryResponse`: Lịch sử điểm danh
- `HomeAttendanceRecord`: Bản ghi điểm danh cho HomeScreen

### face.model.ts
- `FaceDescriptor`: Face descriptor data
- `FaceRecognitionRequest`: Request nhận diện khuôn mặt
- `FaceRecognitionResponse`: Response nhận diện khuôn mặt
- `FaceRecognitionResult`: Kết quả nhận diện khuôn mặt
- `StudentFaceInfo`: Thông tin khuôn mặt sinh viên

### gps.model.ts
- `Location`: Tọa độ GPS
- `LocationSample`: Mẫu GPS kèm timestamp
- `LocationValidationResult`: Kết quả kiểm tra vị trí
- `AllowedArea`: Khu vực được phép
- `GPSProgressCallback`: Callback cho tiến trình GPS

### checkin.model.ts
- `CheckInRequest`: Request check-in tổng hợp
- `CheckInResult`: Kết quả check-in
- `CheckInStepResult`: Kết quả từng bước check-in

### image.model.ts
- `CapturedImage`: Ảnh chụp từ camera
- `LegacyCapturedImage`: Ảnh chụp (legacy format)

### notification.model.ts
- `NotificationItem`: Item thông báo
- `NotificationType`: Loại thông báo (info, success, error, warning)

## 🔄 Migration từ old code

Các Services đã được cập nhật để import từ models folder:

```typescript
// ❌ OLD
export interface User { ... }
export class AuthService { ... }

// ✅ NEW
import type { User, LoginResult } from '../../models';
export class AuthService { ... }
```

Các file Services vẫn re-export types để backward compatibility:

```typescript
// Vẫn có thể import từ Service (backward compatible)
import type { User } from '../Services/AuthService';

// Hoặc import trực tiếp từ models (recommended)
import type { User } from '../models';
```

## ⚠️ Lưu ý

1. **Không duplicate interfaces**: Nếu cần thêm interface mới, kiểm tra xem đã có trong models chưa
2. **Đặt tên rõ ràng**: Interface name phải mô tả chính xác mục đích sử dụng
3. **Group theo domain**: Các interface liên quan nhau nên ở cùng một file
4. **Export từ index.ts**: Luôn export từ index.ts để dễ import

## 🚀 Next Steps

- [ ] Kiểm tra và cập nhật các components còn lại để sử dụng models
- [ ] Xóa các interface trùng lặp trong components
- [ ] Thêm JSDoc comments cho các interfaces quan trọng
- [ ] Xem xét thêm validation schemas (Zod, Yup) nếu cần
