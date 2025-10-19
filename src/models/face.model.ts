// Face Recognition Models

import * as faceapi from 'face-api.js';

export interface FaceRegistrationRequest {
    studentId: string;
    descriptor: number[];
    imageData?: string;
}

export interface FaceRecognitionRequest {
    descriptor: number[];
    imageData?: string;
    subjectId?: string;
    timeSlotId?: string;
    studentId: string;
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
    canRegister?: boolean;
    reason?: string;
}

export interface FaceDescriptor {
    id: string;
    name: string;
    descriptor: Float32Array;
}

export interface FaceRecognitionResult {
    isMatch: boolean;
    confidence: number;
    person?: FaceDescriptor;
    box?: faceapi.Box;
    imageData?: string; // Base64 image data captured during recognition
    descriptor?: number[]; // Face descriptor for comparison
}
