// Re-export types from models for backward compatibility
export type {
    FaceRegistrationRequest,
    FaceRecognitionRequest,
    FaceRecognitionResponse,
    StudentFaceInfo,
    FaceDescriptor,
    FaceRecognitionResult
} from '../../models';
export { FaceRecognizeService, faceRecognizeService } from './FaceRecognizeService';
