// backend/src/models/attendance.ts

// ======================================
// CLASS SESSION INTERFACE
// ======================================
export interface ClassSession {
    sessionId: string;
    subjectId: string;
    timeSlotId: string;
    session_date: Date;
    session_status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    created_at: Date;
    started_at?: Date;
    ended_at?: Date;
    notes?: string;
}

// ✅ Database entities - chính xác theo schema
export interface Attendance {
    AttendanceId: string;
    studentId: string;
    subjectId: string;
    sessionId: string;        // ✅ Updated: use sessionId instead of timeSlotId
    enrollmentId: string;
    checked_in_at: Date; // TIMESTAMP
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    imageId?: string; // FK to captured_images
}

export interface StudentAccount {
    studentId: string;
    name: string;
    email: string;
    password: string;
    faceEmbedding?: any; // JSON type
    birthDate?: Date;
    gender?: string;
    phone?: string;
    cccd?: string;
    birthPlace?: string;
    ethnicity?: string;
    address?: string;
    cohort?: string;
    major?: string;
    faculty?: string;
    program?: string;
    academicYear?: string;
}

export interface CapturedImage {
    imageId: string;
    imageData?: Buffer; // BLOB
    studentId?: string;
    confidence?: number; // FLOAT
    recognition_result?: 'SUCCESS' | 'FAILED' | 'NO_FACE';
    subjectId?: string;
    timeSlotId?: string;
    captured_at: Date; // TIMESTAMP
    ip_address?: string; // VARCHAR(45)
}

// ✅ API Request interfaces
export interface CheckInRequest {
    studentId: string;
    subjectId: string;
    // timeSlotId removed - auto-detect từ active session
    faceDescriptor?: number[];
    imageData?: string; // Base64 image
    confidence?: number; // Face recognition confidence
    location: {
        latitude: number;
        longitude: number;
    };
}

export interface GetAttendanceHistoryRequest {
    studentId: string;
    subjectId?: string;
    startDate?: Date;
    endDate?: Date;
    page?: number;
    limit?: number;
}

export interface AttendanceStatsRequest {
    studentId: string;
    subjectId?: string;
    semesterId?: string;
}

// ✅ API Response interfaces
export interface CheckInResponse {
    success: boolean;
    attendanceId?: string;
    sessionId?: string;        // ✅ Thêm sessionId
    status: 'PRESENT' | 'LATE' | 'FAILED';
    message: string;
    timestamp: Date;
    confidence?: number;
    locationValid?: boolean;
    faceRecognitionSuccess?: boolean;
}

export interface AttendanceRecord {
    AttendanceId: string;
    studentId: string;
    studentName: string;
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    sessionId: string;        // ✅ Thay timeSlotId bằng sessionId
    session_date: string;     // ✅ Thêm session info
    day_of_week: string;
    start_time: string;
    end_time: string;
    roomId?: string;
    checked_in_at: Date;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    confidence?: number;
    imageId?: string;
}

export interface AttendanceHistoryResponse {
    success: boolean;
    studentId: string;
    count: number;
    totalRecords?: number;
    page?: number;
    limit?: number;
    records: AttendanceRecord[];
}

export interface AttendanceStats {
    totalSessions: number;
    presentSessions: number;
    lateSessions: number;
    absentSessions: number;
    attendanceRate: number; // Percentage
    subjects: {
        subjectId: string;
        subjectName: string;
        totalSessions: number;
        presentSessions: number;
        attendanceRate: number;
    }[];
}

export interface AttendanceStatsResponse {
    success: boolean;
    studentId: string;
    stats: AttendanceStats;
}

// ✅ Utility interfaces
export interface Location {
    latitude: number;
    longitude: number;
}

export interface TimeRange {
    start_time: string;
    end_time: string;
}

export interface DateRange {
    startDate: Date;
    endDate: Date;
}

// ✅ Constants
export const ATTENDANCE_CONSTANTS = {
    LATE_THRESHOLD_MINUTES: 15, // Muộn hơn 15 phút = LATE
    CHECK_IN_WINDOW_MINUTES: 30, // Cho phép check-in trước 30 phút
    CHECK_IN_DEADLINE_MINUTES: 30, // Hạn cuối check-in sau khi bắt đầu môn học
    MAX_DISTANCE_METERS: 500, // Khoảng cách tối đa cho GPS validation
} as const;

export const ATTENDANCE_STATUS = {
    PRESENT: 'PRESENT',
    ABSENT: 'ABSENT', 
    LATE: 'LATE',
    EXCUSED: 'EXCUSED'
} as const;

// ======================================
// CLASS SESSION API INTERFACES
// ======================================
export interface SessionRequest {
    subjectId: string;
    date?: string; // YYYY-MM-DD, default today
}

export interface SessionResponse {
    success: boolean;
    sessionId?: string;
    session?: ClassSession & {
        subjectName?: string;
        subjectCode?: string;
        start_time?: string;
        end_time?: string;
        roomId?: string;
        latitude?: number;
        longitude?: number;
        radius?: number;
    };
    message?: string;
}

export interface AbsentStudentsResponse {
    success: boolean;
    sessionId: string;
    session_date: string;
    count: number;
    absentStudents: {
        studentId: string;
        studentName: string;
        studentEmail: string;
    }[];
}