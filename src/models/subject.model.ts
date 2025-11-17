// Subject and Course Models

export interface SubjectInfo {
    subjectId: string;
    name: string;
    code: string;
    time: string;        // e.g., "7:30 AM - 9:30 AM" 
    room: string;        // e.g., "211 - B.08"
    instructor: string;  // e.g., "Dr. Nguyen Van A"
    schedule: string;    // e.g., "Thứ 2, Thứ 5"
}

export interface Subject {
    subjectId: string;
    name: string;
    code: string;
    credit: number;
    semesterId?: string;
}

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

// API Response types
export interface TimeSlotResponse {
    success: boolean;
    currentTimeSlot?: any;
    message?: string;
}

export interface EnrollmentResponse {
    success: boolean;
    enrolled: boolean;
    message?: string;
}

export interface RoomInfoResponse {
    success: boolean;
    roomInfo?: any;
    message?: string;
}

export interface EnrolledStudent {
    studentId: string;
    studentName: string;
    email: string;
}
