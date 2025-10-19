// src/Services/AttendanceService/index.ts

// Re-export types from models for backward compatibility
export type {
    AttendanceCheckInRequest,
    AttendanceCheckInResponse,
    AttendanceRecord,
    AttendanceHistoryResponse,
    AttendanceStats,
    AttendanceStatsResponse,
    HomeAttendanceRecord
} from '../../models';
export { 
    attendanceService as default,
    attendanceService
} from './AttendanceService';