# Models Usage Examples

## 📖 Hướng dẫn sử dụng Models

### 1. Import cơ bản

```typescript
// ✅ RECOMMENDED: Import nhiều types cùng lúc từ central export
import type { 
  User, 
  LoginResult, 
  Subject, 
  AttendanceRecord 
} from '../models';

// ✅ ALSO GOOD: Import từ file cụ thể nếu cần tách biệt
import type { User } from '../models/user.model';
import type { Subject } from '../models/subject.model';
```

### 2. Sử dụng trong Components

```typescript
// Example: LoginScreen.tsx
import React, { useState } from 'react';
import type { User, LoginResult } from '../../models';
import { authService } from '../../Services/AuthService';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async () => {
    const result: LoginResult = await authService.login(studentId, password);
    
    if (result.success && result.user) {
      onLoginSuccess(result.user);
    }
  };

  return (
    <div>
      {/* Login form */}
    </div>
  );
};
```

### 3. Sử dụng trong Services

```typescript
// Example: CustomService.ts
import type { 
  User, 
  Subject, 
  AttendanceRecord,
  CheckInResult 
} from '../../models';

class CustomService {
  async processCheckIn(
    user: User, 
    subject: Subject
  ): Promise<CheckInResult> {
    // Service logic
    return {
      success: true,
      message: 'Check-in successful',
      steps: {
        timeValidation: { success: true, message: 'Time validated' },
        locationValidation: { success: true, message: 'Location valid' },
        faceRecognition: { success: true, message: 'Face recognized' },
        attendanceRecord: { success: true, message: 'Record saved' }
      }
    };
  }

  async getUserAttendance(user: User): Promise<AttendanceRecord[]> {
    // Get attendance records
    return [];
  }
}
```

### 4. Sử dụng trong Custom Hooks

```typescript
// Example: useAttendance.ts
import { useState, useEffect } from 'react';
import type { AttendanceRecord, AttendanceStats } from '../models';
import { attendanceService } from '../Services/AttendanceService';

export const useAttendance = (studentId: string) => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      
      const historyRes = await attendanceService.getAttendanceHistory(studentId);
      if (historyRes.success) {
        setRecords(historyRes.records);
      }

      const statsRes = await attendanceService.getAttendanceStats(studentId);
      if (statsRes.success) {
        setStats(statsRes.stats);
      }

      setLoading(false);
    };

    loadData();
  }, [studentId]);

  return { records, stats, loading };
};
```

### 5. Type Guards và Utility Functions

```typescript
// Example: typeGuards.ts
import type { User, AttendanceRecord } from '../models';

export function isStudent(user: User): boolean {
  return user.userType === 'student';
}

export function isAdmin(user: User): boolean {
  return user.userType === 'admin';
}

export function isPresent(record: AttendanceRecord): boolean {
  return record.status === 'PRESENT';
}

export function isLate(record: AttendanceRecord): boolean {
  return record.status === 'LATE';
}

export function hasImage(record: AttendanceRecord): boolean {
  return record.hasImage === 1;
}
```

### 6. Extending Types

```typescript
// Example: Mở rộng types cho specific use case
import type { Subject, AttendanceRecord } from '../models';

// Thêm computed properties
export interface SubjectWithStats extends Subject {
  totalSessions: number;
  attendedSessions: number;
  attendanceRate: number;
}

// Combine multiple types
export interface AttendanceWithSubject {
  attendance: AttendanceRecord;
  subject: Subject;
  isToday: boolean;
}

// Partial types cho forms
export type SubjectFormData = Pick<Subject, 'name' | 'code' | 'credit'>;
export type UserUpdateData = Partial<Pick<User, 'name' | 'email' | 'phone' | 'avatar'>>;
```

### 7. Props với Models

```typescript
// Example: Component Props với models
import type { Subject, AttendanceRecord, User } from '../../models';

interface SubjectCardProps {
  subject: Subject;
  onSelect: (subject: Subject) => void;
}

interface AttendanceListProps {
  records: AttendanceRecord[];
  user: User;
  onRefresh: () => void;
}

interface CheckInFormProps {
  subject: Subject;
  onSuccess: (record: AttendanceRecord) => void;
  onError: (error: string) => void;
}
```

### 8. API Response Handling

```typescript
// Example: Handling API responses với proper types
import type { 
  AttendanceHistoryResponse, 
  StudentSubjectsResponse,
  AttendanceStatsResponse 
} from '../models';

async function loadStudentData(studentId: string) {
  try {
    // Fetch subjects
    const subjectsRes: StudentSubjectsResponse = await fetch(
      `/api/subjects/student/${studentId}`
    ).then(r => r.json());

    if (!subjectsRes.success) {
      throw new Error('Failed to load subjects');
    }

    // Fetch attendance
    const attendanceRes: AttendanceHistoryResponse = await fetch(
      `/api/attendance/history/${studentId}`
    ).then(r => r.json());

    if (!attendanceRes.success) {
      throw new Error('Failed to load attendance');
    }

    // Fetch stats
    const statsRes: AttendanceStatsResponse = await fetch(
      `/api/attendance/stats/${studentId}`
    ).then(r => r.json());

    return {
      subjects: subjectsRes.subjects,
      attendance: attendanceRes.records,
      stats: statsRes.success ? statsRes.stats : null
    };
  } catch (error) {
    console.error('Error loading student data:', error);
    throw error;
  }
}
```

### 9. Context với Models

```typescript
// Example: StudentContext.tsx
import React, { createContext, useContext, useState } from 'react';
import type { User, Subject, AttendanceRecord } from '../models';

interface StudentContextValue {
  user: User | null;
  subjects: Subject[];
  recentAttendance: AttendanceRecord[];
  setUser: (user: User | null) => void;
  setSubjects: (subjects: Subject[]) => void;
  addAttendance: (record: AttendanceRecord) => void;
}

const StudentContext = createContext<StudentContextValue | undefined>(undefined);

export const useStudent = () => {
  const context = useContext(StudentContext);
  if (!context) {
    throw new Error('useStudent must be used within StudentProvider');
  }
  return context;
};

export const StudentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([]);

  const addAttendance = (record: AttendanceRecord) => {
    setRecentAttendance(prev => [record, ...prev].slice(0, 10));
  };

  return (
    <StudentContext.Provider
      value={{
        user,
        subjects,
        recentAttendance,
        setUser,
        setSubjects,
        addAttendance
      }}
    >
      {children}
    </StudentContext.Provider>
  );
};
```

### 10. Testing với Models

```typescript
// Example: Component.test.tsx
import { render, screen } from '@testing-library/react';
import type { User, Subject, AttendanceRecord } from '../models';
import { SubjectCard } from './SubjectCard';

describe('SubjectCard', () => {
  const mockSubject: Subject = {
    subjectId: 'SUB001',
    name: 'Advanced Programming',
    code: 'CSE107',
    credit: 3,
    semesterId: 'SEM2024'
  };

  const mockUser: User = {
    id: '22312001',
    name: 'John Doe',
    email: 'john@example.com',
    userType: 'student'
  };

  it('should render subject information', () => {
    render(<SubjectCard subject={mockSubject} user={mockUser} />);
    
    expect(screen.getByText('Advanced Programming')).toBeInTheDocument();
    expect(screen.getByText('CSE107')).toBeInTheDocument();
  });
});
```

## 🎯 Best Practices

### ✅ DO

1. **Import types với `type` keyword**
   ```typescript
   import type { User } from '../models';  // ✅ Good
   ```

2. **Sử dụng central export**
   ```typescript
   import type { User, Subject } from '../models';  // ✅ Good
   ```

3. **Tái sử dụng types thay vì duplicate**
   ```typescript
   import type { AttendanceRecord } from '../models';  // ✅ Good
   // Không tự định nghĩa lại interface AttendanceRecord
   ```

### ❌ DON'T

1. **Không import class/value khi chỉ cần type**
   ```typescript
   import { User } from '../models';  // ❌ Bad (nếu chỉ dùng làm type)
   import type { User } from '../models';  // ✅ Good
   ```

2. **Không duplicate interface definitions**
   ```typescript
   // ❌ Bad
   interface Subject {
     subjectId: string;
     name: string;
   }
   
   // ✅ Good
   import type { Subject } from '../models';
   ```

3. **Không hardcode type values**
   ```typescript
   // ❌ Bad
   const status: string = 'PRESENT';
   
   // ✅ Good
   const status: AttendanceRecord['status'] = 'PRESENT';
   ```

## 📚 Related Resources

- [src/models/README.md](./README.md) - Models documentation
- [MODELS_REFACTORING_SUMMARY.md](../MODELS_REFACTORING_SUMMARY.md) - Refactoring summary
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
