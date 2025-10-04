// backend/src/models/subject.ts

// ✅ Database entities - chính xác theo schema
export interface Subject {
    subjectId: string;
    name: string;
    code: string;
    credit: number;
    semesterId?: string;
}

export interface Semester {
    semesterId: string;
    semester_start_date: Date;
    semester_end_date: Date;
    is_active: boolean;
}

export interface TimeSlot {
    timeSlotId: string;
    subjectId: string;
    roomId?: string;
    day_of_week: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
    start_time: string; // TIME format "HH:MM:SS"
    end_time: string;   // TIME format "HH:MM:SS"
}

export interface Room {
    roomId: string;
    latitude: number;  // DECIMAL(10, 8)
    longitude: number; // DECIMAL(11, 8)
    radius: number;    // INT
}

export interface Enrollment {
    enrollmentId: string;
    studentId: string;
    subjectId: string;
    semesterId: string;
}

// ✅ API Response interfaces
export interface SubjectWithSchedule {
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    credit: number;
    timeSlotId: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    roomId?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
}

export interface StudentSubjectsResponse {
    success: boolean;
    studentId: string;
    count: number;
    subjects: SubjectWithSchedule[];
}

export interface CurrentTimeSlotResponse {
    success: boolean;
    hasActiveTimeSlot: boolean;
    timeSlot?: TimeSlot & {
        roomInfo?: Room;
    };
    message?: string;
}

export interface SubjectScheduleResponse {
    success: boolean;
    subjectId: string;
    count: number;
    schedule: SubjectWithSchedule[];
}

// ✅ Request interfaces
export interface GetStudentSubjectsRequest {
    studentId: string;
    semesterId?: string;
}

export interface GetCurrentTimeSlotRequest {
    subjectId: string;
    currentTime?: string;
    currentDay?: string;
}