export interface FaceDescriptor{
    studentId: string;
    name: string;
    descriptor: number[]; 
}

export interface FaceRegistrationRequest{
    studentId: string;
    descriptor: number[];
    imageData?: string;
}

export interface FaceRecognitionRequest {
    descriptor: number[];
    imageData?: string;
    subjectId?: string;
    timeSlotId?: string;
    studentId: string; // ✅ THÊM STUDENT ID
}

export interface FaceRecognitionResponse {
    success: boolean;
    isMatch: boolean;
    confidence: number;
    studentId?: string;
    studentName?: string;
    message: string;
}

export interface StudentFaceInfo {
    studentId: string;
    registered: boolean;
    name?: string;
}

export const FACE_CONSTANTS = {
    DEFAULT_MATCH_THRESHOLD: 0.4, // ✅ Giảm threshold để match dễ hơn (distance nhỏ hơn = match)
    MIN_CONFIDENCE_DISPLAY: 60, // ✨ Confidence hiển thị tối thiểu 60%
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
} as const;
