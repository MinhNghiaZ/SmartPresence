# Code Audit Report - Duplicate API Calls & Missing Service Usage

## 🔍 Tổng quan vấn đề

Sau khi kiểm tra, phát hiện **nhiều nơi gọi API trực tiếp** thay vì sử dụng Services đã có sẵn. Điều này gây ra:
- ❌ **Code duplication**: Logic giống nhau được viết lại nhiều lần
- ❌ **Khó maintain**: Khi thay đổi API, phải sửa nhiều nơi
- ❌ **Không consistent**: Cách xử lý error, token, headers khác nhau
- ❌ **Thiếu type safety**: Không sử dụng interfaces đã định nghĩa

## 📊 Thống kê vấn đề

### Files có vấn đề:
1. **AdminScreen.tsx** - 6 API calls trực tiếp
2. **HomeScreen.tsx** - 1 API call trực tiếp  
3. **StudentsList.tsx** - 2 API calls trực tiếp

**Tổng cộng: 9 API calls cần refactor**

---

## 🚨 Chi tiết các vấn đề

### 1. AdminScreen.tsx - 6 vấn đề nghiêm trọng

#### ❌ Vấn đề 1: `fetchSessionDates` (Line 103)
```typescript
// ❌ HIỆN TẠI: Gọi API trực tiếp
const response = await fetch(`/api/attendance/session-dates/${subjectId}`);
```

**Giải pháp:** Thêm method vào `AttendanceService`
```typescript
// ✅ NÊN: Thêm vào AttendanceService
async getSessionDates(subjectId: string): Promise<string[]> {
  const token = this.getToken();
  const response = await fetch(`${this.baseURL}/attendance/session-dates/${subjectId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    }
  });
  const data = await response.json();
  if (data.success) {
    return data.dates.map((date: string) => 
      new Date(date).toISOString().split('T')[0]
    );
  }
  return [];
}

// Sử dụng:
const dates = await attendanceService.getSessionDates(subjectId);
```

---

#### ❌ Vấn đề 2: `fetchSubjectAttendanceStats` (Line 130)
```typescript
// ❌ HIỆN TẠI: Duplicate code, gọi trực tiếp
const response = await fetch(`/api/attendance/subject/${subjectId}/students-stats`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }
});
```

**Giải pháp:** Thêm method vào `AttendanceService`
```typescript
// ✅ NÊN: Thêm vào AttendanceService
async getSubjectAttendanceStats(subjectId: string): Promise<{
  success: boolean;
  totalSessions: number;
  students: Array<{
    studentId: string;
    studentName: string;
    presentSessions: number;
    lateSessions: number;
    absentSessions: number;
    attendanceRate: number;
  }>;
}> {
  const token = authService.getToken();
  const response = await fetch(
    `${this.baseURL}/attendance/subject/${subjectId}/students-stats`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return await response.json();
}
```

**Note:** Logic này cũng bị duplicate ở `StudentsList.tsx` (Line 147)

---

#### ❌ Vấn đề 3: `adminUpdateAttendanceStatus` (Line 448)
```typescript
// ❌ HIỆN TẠI: Admin function nhưng không có trong Service
const response = await fetch('/api/attendance/admin/update-status', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ attendanceId, newStatus, adminId })
});
```

**Giải pháp:** Tạo `AdminService` hoặc thêm vào `AttendanceService`
```typescript
// ✅ OPTION 1: Thêm namespace Admin vào AttendanceService
class AttendanceServiceClass {
  // ... existing methods
  
  admin = {
    updateStatus: async (
      attendanceId: string,
      newStatus: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED',
      adminId: string
    ): Promise<{ success: boolean; message: string }> => {
      const token = authService.getToken();
      const response = await fetch(`${this.baseURL}/attendance/admin/update-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ attendanceId, newStatus, adminId })
      });
      return await response.json();
    }
  };
}

// Sử dụng:
await attendanceService.admin.updateStatus(attendanceId, newStatus, adminId);
```

---

#### ❌ Vấn đề 4: `adminCreateAttendanceRecord` (Line 472)
```typescript
// ❌ HIỆN TẠI: Admin function không có trong Service
const response = await fetch('/api/attendance/admin/create-record', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ studentId, subjectId, status, adminId, sessionDate })
});
```

**Giải pháp:** Thêm vào admin namespace
```typescript
// ✅ NÊN: Thêm vào admin namespace của AttendanceService
admin = {
  // ... updateStatus method
  
  createRecord: async (
    studentId: string,
    subjectId: string,
    status: 'PRESENT' | 'LATE',
    adminId: string,
    sessionDate?: string
  ): Promise<{ success: boolean; message: string; attendanceId?: string }> => {
    const token = authService.getToken();
    const response = await fetch(`${this.baseURL}/attendance/admin/create-record`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ studentId, subjectId, status, adminId, sessionDate })
    });
    return await response.json();
  }
};
```

---

#### ❌ Vấn đề 5: `adminCreateStudent` (Line 499)
```typescript
// ❌ HIỆN TẠI: Admin function cho Auth nhưng không có trong AuthService
const response = await fetch('/api/auth/admin/create-student', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ studentId, name, email, password, subjectIds })
});
```

**Giải pháp:** Thêm admin methods vào `AuthService`
```typescript
// ✅ NÊN: Thêm vào AuthService
class AuthService {
  // ... existing methods
  
  static async adminCreateStudent(
    studentId: string,
    name: string,
    email: string,
    password: string,
    subjectIds: string[]
  ): Promise<{ success: boolean; message: string }> {
    const token = this.getToken();
    const response = await fetch(`${this.API_BASE}/auth/admin/create-student`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ studentId, name, email, password, subjectIds })
    });
    return await response.json();
  }
}
```

---

#### ❌ Vấn đề 6: `adminResetStudentPassword` (Line 524)
```typescript
// ❌ HIỆN TẠI: Admin function không có trong AuthService
const response = await fetch('/api/auth/admin/reset-password', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ studentId, newPassword })
});
```

**Giải pháp:** Thêm vào `AuthService`
```typescript
// ✅ NÊN: Thêm vào AuthService
static async adminResetPassword(
  studentId: string,
  newPassword: string
): Promise<{ success: boolean; message: string }> {
  const token = this.getToken();
  const response = await fetch(`${this.API_BASE}/auth/admin/reset-password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ studentId, newPassword })
  });
  return await response.json();
}
```

---

### 2. HomeScreen.tsx - 1 vấn đề

#### ❌ Vấn đề 7: `loadAttendanceHistory` (Line 204)
```typescript
// ❌ HIỆN TẠI: Gọi simple-history API trực tiếp
const response = await fetch(`/api/attendance/simple-history/${currentUser.id}`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
});
```

**Vấn đề:** `AttendanceService` đã có method `getAttendanceHistory()` nhưng không dùng

**Giải pháp:** Sử dụng service có sẵn hoặc thêm method mới
```typescript
// ✅ OPTION 1: Dùng method có sẵn
const historyRes = await attendanceService.getAttendanceHistory(currentUser.id, {
  limit: 10,
  page: 1
});

// ✅ OPTION 2: Thêm method đơn giản hơn
async getSimpleHistory(studentId: string): Promise<{
  success: boolean;
  records: Array<{
    AttendanceId: string;
    subjectId: string;
    checked_in_at: Date;
    status: string;
  }>;
}> {
  const response = await fetch(`${this.baseURL}/attendance/simple-history/${studentId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  });
  return await response.json();
}
```

---

### 3. StudentsList.tsx - 2 vấn đề

#### ❌ Vấn đề 8: `deleteFaceEmbedding` (Line 108)
```typescript
// ❌ HIỆN TẠI: Gọi face API trực tiếp
const response = await fetch(`/api/face/delete-embedding/${studentId}`, {
  method: 'DELETE',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`,
  },
  body: JSON.stringify({ adminId: adminId })
});
```

**Giải pháp:** Thêm method vào `FaceRecognizeService`
```typescript
// ✅ NÊN: Thêm vào FaceRecognizeService
async deleteFaceEmbedding(
  studentId: string,
  adminId: string
): Promise<{ success: boolean; message: string }> {
  const token = localStorage.getItem('token');
  const response = await fetch(`${this.API_BASE}/delete-embedding/${studentId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ adminId })
  });
  return await response.json();
}
```

---

#### ❌ Vấn đề 9: `fetchSubjectAttendanceStats` (Line 147)
**DUPLICATE** của vấn đề #2 trong AdminScreen.tsx

Cùng một API call được viết lại ở component khác → cần dùng chung từ Service

---

## 📋 Kế hoạch refactoring

### Phase 1: Thêm missing methods vào Services (Priority: HIGH)

#### 1.1 AttendanceService - Thêm 3 methods

```typescript
// src/Services/AttendanceService/AttendanceService.ts

class AttendanceServiceClass {
  // ... existing methods

  /**
   * Get session dates for a subject
   */
  async getSessionDates(subjectId: string): Promise<string[]> {
    const token = authService.getToken();
    const response = await fetch(
      `${this.baseURL}/attendance/session-dates/${subjectId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    const data = await response.json();
    if (data.success) {
      return data.dates.map((date: string) => 
        new Date(date).toISOString().split('T')[0]
      );
    }
    return [];
  }

  /**
   * Get attendance statistics for entire subject
   */
  async getSubjectAttendanceStats(subjectId: string): Promise<{
    success: boolean;
    totalSessions: number;
    students: Array<{
      studentId: string;
      studentName: string;
      presentSessions: number;
      lateSessions: number;
      absentSessions: number;
      attendanceRate: number;
    }>;
  }> {
    const token = authService.getToken();
    const response = await fetch(
      `${this.baseURL}/attendance/subject/${subjectId}/students-stats`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    return await response.json();
  }

  /**
   * Get simple attendance history (lightweight version)
   */
  async getSimpleHistory(studentId: string): Promise<{
    success: boolean;
    records: Array<{
      AttendanceId: string;
      subjectId: string;
      checked_in_at: Date;
      status: string;
    }>;
  }> {
    const response = await fetch(
      `${this.baseURL}/attendance/simple-history/${studentId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    return await response.json();
  }

  /**
   * Admin methods namespace
   */
  admin = {
    updateStatus: async (
      attendanceId: string,
      newStatus: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED',
      adminId: string
    ): Promise<{ success: boolean; message: string }> => {
      const token = authService.getToken();
      const response = await fetch(
        `${this.baseURL}/attendance/admin/update-status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ attendanceId, newStatus, adminId })
        }
      );
      return await response.json();
    },

    createRecord: async (
      studentId: string,
      subjectId: string,
      status: 'PRESENT' | 'LATE',
      adminId: string,
      sessionDate?: string
    ): Promise<{ success: boolean; message: string; attendanceId?: string }> => {
      const token = authService.getToken();
      const response = await fetch(
        `${this.baseURL}/attendance/admin/create-record`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ studentId, subjectId, status, adminId, sessionDate })
        }
      );
      return await response.json();
    }
  };
}
```

#### 1.2 AuthService - Thêm 2 admin methods

```typescript
// src/Services/AuthService/AuthService.ts

export class AuthService {
  // ... existing methods

  /**
   * Admin: Create new student account
   */
  static async adminCreateStudent(
    studentId: string,
    name: string,
    email: string,
    password: string,
    subjectIds: string[]
  ): Promise<{ success: boolean; message: string }> {
    try {
      const token = this.getToken();
      const response = await fetch(`${this.API_BASE}/auth/admin/create-student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ studentId, name, email, password, subjectIds })
      });
      return await response.json();
    } catch (error) {
      console.error('Error creating student:', error);
      return { success: false, message: 'Network error' };
    }
  }

  /**
   * Admin: Reset student password
   */
  static async adminResetPassword(
    studentId: string,
    newPassword: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const token = this.getToken();
      const response = await fetch(`${this.API_BASE}/auth/admin/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ studentId, newPassword })
      });
      return await response.json();
    } catch (error) {
      console.error('Error resetting password:', error);
      return { success: false, message: 'Network error' };
    }
  }
}
```

#### 1.3 FaceRecognizeService - Thêm 1 method

```typescript
// src/Services/FaceRecognizeService/FaceRecognizeService.ts

export class FaceRecognizeService {
  // ... existing methods

  /**
   * Delete face embedding for a student (Admin only)
   */
  async deleteFaceEmbedding(
    studentId: string,
    adminId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${this.API_BASE}/delete-embedding/${studentId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ adminId })
        }
      );
      return await response.json();
    } catch (error) {
      console.error('Error deleting face embedding:', error);
      return { success: false, message: 'Network error' };
    }
  }
}
```

---

### Phase 2: Refactor components để sử dụng Services (Priority: HIGH)

#### 2.1 AdminScreen.tsx - Refactor 6 methods

**Before:**
```typescript
const fetchSessionDates = async (subjectId: string): Promise<string[]> => {
  const response = await fetch(`/api/attendance/session-dates/${subjectId}`);
  // ... logic
};
```

**After:**
```typescript
const fetchSessionDates = async (subjectId: string): Promise<string[]> => {
  return await attendanceService.getSessionDates(subjectId);
};

// Or better, remove wrapper and use directly:
const dates = await attendanceService.getSessionDates(subjectId);
```

Áp dụng tương tự cho 5 methods còn lại.

#### 2.2 HomeScreen.tsx - Refactor 1 method

```typescript
// ❌ Before
const response = await fetch(`/api/attendance/simple-history/${currentUser.id}`);

// ✅ After
const historyData = await attendanceService.getSimpleHistory(currentUser.id);
```

#### 2.3 StudentsList.tsx - Refactor 2 methods

```typescript
// ❌ Before
const response = await fetch(`/api/face/delete-embedding/${studentId}`, {...});

// ✅ After
const result = await faceRecognizeService.deleteFaceEmbedding(studentId, adminId);

// ❌ Before
const response = await fetch(`/api/attendance/subject/${subject.subjectId}/students-stats`, {...});

// ✅ After
const data = await attendanceService.getSubjectAttendanceStats(subject.subjectId);
```

---

### Phase 3: Add TypeScript interfaces (Priority: MEDIUM)

Thêm interfaces cho các response types mới:

```typescript
// src/models/attendance.model.ts

export interface SessionDatesResponse {
  success: boolean;
  dates: string[];
}

export interface SubjectAttendanceStats {
  success: boolean;
  totalSessions: number;
  students: StudentAttendanceStats[];
}

export interface StudentAttendanceStats {
  studentId: string;
  studentName: string;
  presentSessions: number;
  lateSessions: number;
  absentSessions: number;
  attendanceRate: number;
}

export interface SimpleAttendanceRecord {
  AttendanceId: string;
  subjectId: string;
  checked_in_at: Date;
  status: string;
}

export interface SimpleHistoryResponse {
  success: boolean;
  records: SimpleAttendanceRecord[];
}

export interface AdminUpdateStatusResponse {
  success: boolean;
  message: string;
}

export interface AdminCreateRecordResponse {
  success: boolean;
  message: string;
  attendanceId?: string;
}
```

```typescript
// src/models/user.model.ts

export interface AdminCreateStudentResponse {
  success: boolean;
  message: string;
}

export interface AdminResetPasswordResponse {
  success: boolean;
  message: string;
}
```

---

## 📈 Expected Benefits

Sau khi refactor:

1. **Code giảm ~200-300 lines** (loại bỏ duplicate code)
2. **Dễ maintain hơn**: Chỉ sửa 1 nơi khi API thay đổi
3. **Type safety**: Tất cả API calls đều có types
4. **Consistent**: Cách xử lý errors, tokens giống nhau
5. **Testable**: Dễ dàng mock services khi test
6. **Reusable**: Services có thể dùng ở nhiều components

---

## ✅ Checklist

### Phase 1: Add Service Methods
- [ ] AttendanceService.getSessionDates()
- [ ] AttendanceService.getSubjectAttendanceStats()
- [ ] AttendanceService.getSimpleHistory()
- [ ] AttendanceService.admin.updateStatus()
- [ ] AttendanceService.admin.createRecord()
- [ ] AuthService.adminCreateStudent()
- [ ] AuthService.adminResetPassword()
- [ ] FaceRecognizeService.deleteFaceEmbedding()

### Phase 2: Refactor Components
- [ ] AdminScreen.tsx - fetchSessionDates
- [ ] AdminScreen.tsx - fetchSubjectAttendanceStats
- [ ] AdminScreen.tsx - adminUpdateAttendanceStatus
- [ ] AdminScreen.tsx - adminCreateAttendanceRecord
- [ ] AdminScreen.tsx - adminCreateStudent
- [ ] AdminScreen.tsx - adminResetStudentPassword
- [ ] HomeScreen.tsx - loadAttendanceHistory
- [ ] StudentsList.tsx - deleteFaceEmbedding
- [ ] StudentsList.tsx - fetchSubjectAttendanceStats

### Phase 3: Add Type Definitions
- [ ] Add interfaces to models/attendance.model.ts
- [ ] Add interfaces to models/user.model.ts
- [ ] Update Services to use new interfaces
- [ ] Export new types from models/index.ts

### Phase 4: Testing & Validation
- [ ] Test all refactored components
- [ ] Verify no breaking changes
- [ ] Check error handling works correctly
- [ ] Update documentation

---

## 🎯 Priority Order

1. **CRITICAL** - Phase 1: Add missing service methods (estimated: 2-3 hours)
2. **HIGH** - Phase 2: Refactor AdminScreen.tsx (estimated: 1-2 hours)
3. **HIGH** - Phase 2: Refactor HomeScreen.tsx & StudentsList.tsx (estimated: 30 min)
4. **MEDIUM** - Phase 3: Add TypeScript interfaces (estimated: 30 min)
5. **LOW** - Phase 4: Testing & Documentation (estimated: 1 hour)

**Total estimated time: 5-7 hours**

---

**Date**: ${new Date().toISOString().split('T')[0]}
**Status**: 🔴 Needs immediate attention
**Severity**: HIGH - Code duplication and maintainability issues
