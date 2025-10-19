// src/Services/SubjectService/index.ts

// Re-export types from models for backward compatibility
export type {
    SubjectInfo,
    Subject,
    SubjectWithSchedule,
    StudentSubjectsResponse
} from '../../models';
export { 
    subjectService as default,
    subjectService
} from './SubjectService';