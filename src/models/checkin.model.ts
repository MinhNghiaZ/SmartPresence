// Unified Check-in Models

import type { FaceRecognitionResult } from './face.model';

export interface CheckInRequest {
    subjectId: string;
    subjectCode?: string; // For display purposes
    latitude: number;
    longitude: number;
    videoElement: HTMLVideoElement; // For face recognition
    faceResult?: FaceRecognitionResult; // Optional: If face recognition already done
}

export interface CheckInResult {
    success: boolean;
    message: string;
    steps: {
        timeValidation: CheckInStepResult;
        locationValidation: CheckInStepResult;
        faceRecognition: CheckInStepResult;
        attendanceRecord: CheckInStepResult;
    };
    attendanceId?: string;
    timestamp?: string;
    status?: string; // Attendance status (PRESENT, LATE, etc.)
}

export interface CheckInStepResult {
    success: boolean;
    message: string;
    data?: any;
}
