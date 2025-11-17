export interface FaceDescriptor{
    studentId: string;
    name: string;
    descriptor: number[]; 
}

export interface FaceTemplate {
    id: string;
    descriptor: number[];
    quality: 'excellent' | 'good' | 'acceptable';
    createdAt: Date;
    usageCount: number;
    successRate: number;
}

export interface MultiFaceData {
    studentId: string;
    templates: FaceTemplate[];
    primaryTemplateId: string;
}

export interface FaceRegistrationRequest{
    studentId: string;
    descriptor: number[];
    imageData?: string;
    replaceExisting?: boolean; // Allow replacing if multi-template
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
    // ✨ ADAPTIVE THRESHOLD SYSTEM - Cosine distance thresholds (0-1, lower = better match)
    THRESHOLDS: {
        EXCELLENT: 0.15,   // High confidence matches (perfect conditions) - 85% similarity
        GOOD: 0.25,        // Good matches (normal conditions) - 75% similarity
        ACCEPTABLE: 0.35,  // Acceptable matches (challenging conditions) - 65% similarity
        STRICT: 0.10       // Very strict for sensitive operations - 90% similarity
    },
    DEFAULT_MATCH_THRESHOLD: 0.25, // Use GOOD as default (75% similarity)
    
    // ✨ QUALITY THRESHOLDS
    QUALITY: {
        MIN_BRIGHTNESS: 30,     // Minimum brightness (0-255)
        MAX_BRIGHTNESS: 220,    // Maximum brightness (0-255)
        MIN_CONTRAST: 20,       // Minimum contrast ratio
        MAX_BLUR_SCORE: 100,    // Maximum acceptable blur
        MIN_FACE_SIZE: 80,      // Minimum face size in pixels
        MAX_FACE_ANGLE: 30      // Maximum face rotation in degrees
    },
    
    MIN_CONFIDENCE_DISPLAY: 60, // ✨ Confidence hiển thị tối thiểu 60%
    MAX_IMAGE_SIZE: 5 * 1024 * 1024, // 5MB
    
    // ✨ MULTI-TEMPLATE CONFIGURATION
    TEMPLATES: {
        MAX_TEMPLATES_PER_USER: 3,      // Maximum 3 face templates per user
        MIN_QUALITY_FOR_TEMPLATE: 'acceptable', // Minimum quality to save as template
        TEMPLATE_ROTATION_THRESHOLD: 50, // Replace template after 50 failed attempts
        SUCCESS_RATE_THRESHOLD: 0.80,    // Replace template if success rate < 80%
        TEMPLATE_AGE_LIMIT_DAYS: 90      // Replace templates older than 90 days
    }
} as const;
