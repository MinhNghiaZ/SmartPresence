// Attendance and Check-in Models

export interface AttendanceCheckInRequest {
    studentId: string;
    subjectId: string;
    location: {
        latitude: number;
        longitude: number;
    };
    faceDescriptor?: number[];
    imageData?: string; // Base64 image
    confidence?: number; // Face recognition confidence
}

export interface AttendanceCheckInResponse {
    success: boolean;
    attendanceId?: string;
    sessionId?: string;
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
    sessionId: string;
    session_date: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    roomId?: string;
    checked_in_at: Date;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    confidence?: number;
    imageId?: string;
    hasImage: number;
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

// Frontend-specific interfaces for HomeScreen
export interface HomeAttendanceRecord {
    id: string;
    subject: string;
    timestamp: string;
    location: string;
    status: 'Present' | 'Late' | 'Absent';
}
