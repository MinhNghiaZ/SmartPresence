// Image Capture Models

export interface CapturedImage {
    imageId: string;
    studentId: string | null;
    studentName?: string;
    imageData: string; // base64 image data
    confidence: number;
    status: string;
    subjectId?: string;
    subjectName?: string;
    capturedAt: string;
    ipAddress?: string;
}

export interface LegacyCapturedImage {
    id: string;
    userId: string;
    userName: string;
    imageData: string;
    timestamp: string;
    confidence: number;
    checkInStatus: 'success' | 'failed';
}
