// src/Services/AttendanceService/AttendanceService.ts

import { authService } from '../AuthService/AuthService';

// ======================================
// INTERFACES - Match backend responses
// ======================================

export interface AttendanceCheckInRequest {
    studentId: string;
    subjectId: string;
    location: {
        latitude: number;
        longitude: number;
    };
    faceDescriptor?: number[];
    imageData?: string; // Base64 image
    confidence?: number; // Face recognition confidence
}

export interface AttendanceCheckInResponse {
    success: boolean;
    attendanceId?: string;
    sessionId?: string;
    status: 'PRESENT' | 'LATE' | 'FAILED';
    message: string;
    timestamp: Date;
    confidence?: number;
    locationValid?: boolean;
    faceRecognitionSuccess?: boolean;
}

export interface AttendanceRecord {
    AttendanceId: string;
    studentId: string;
    studentName: string;
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    sessionId: string;
    session_date: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    roomId?: string;
    checked_in_at: Date;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
    confidence?: number;
    imageId?: string;
}

export interface AttendanceHistoryResponse {
    success: boolean;
    studentId: string;
    count: number;
    totalRecords?: number;
    page?: number;
    limit?: number;
    records: AttendanceRecord[];
}

export interface AttendanceStats {
    totalSessions: number;
    presentSessions: number;
    lateSessions: number;
    absentSessions: number;
    attendanceRate: number; // Percentage
    subjects: {
        subjectId: string;
        subjectName: string;
        totalSessions: number;
        presentSessions: number;
        attendanceRate: number;
    }[];
}

export interface AttendanceStatsResponse {
    success: boolean;
    studentId: string;
    stats: AttendanceStats;
}

// Frontend-specific interfaces for HomeScreen
export interface HomeAttendanceRecord {
    id: string;
    subject: string;
    timestamp: string;
    location: string;
    status: 'Present' | 'Late' | 'Absent';
}

// ======================================
// SERVICE CLASS
// ======================================

class AttendanceServiceClass {
    private baseURL: string;

    constructor() {
        this.baseURL = 'http://localhost:3001/api';
    }

    /**
     * Perform check-in with backend
     * This integrates with ClassSession system
     */
    async checkIn(request: AttendanceCheckInRequest): Promise<AttendanceCheckInResponse> {
        try {
            console.log('🔍 AttendanceService.checkIn called:', {
                studentId: request.studentId,
                subjectId: request.subjectId,
                hasLocation: !!request.location
            });

            const token = authService.getToken();
            if (!token) {
                throw new Error('Authentication token not found');
            }

            const response = await fetch(`${this.baseURL}/attendance/check-in`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('❌ Backend error response:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData: errorData,
                    requestData: {
                        studentId: request.studentId,
                        subjectId: request.subjectId,
                        hasLocation: !!request.location,
                        hasImageData: !!request.imageData
                    }
                });
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }

            const data: AttendanceCheckInResponse = await response.json();
            console.log('✅ Check-in response:', data);

            return data;

        } catch (error) {
            console.error('❌ Error during check-in:', error);
            
            return {
                success: false,
                status: 'FAILED',
                message: error instanceof Error ? error.message : 'Check-in failed',
                timestamp: new Date()
            };
        }
    }

    /**
     * Get attendance history for student
     */
    async getAttendanceHistory(
        studentId: string,
        options?: {
            subjectId?: string;
            page?: number;
            limit?: number;
        }
    ): Promise<AttendanceHistoryResponse> {
        try {
            console.log('🔍 AttendanceService.getAttendanceHistory called for:', studentId);

            const params = new URLSearchParams();
            if (options?.subjectId) params.append('subjectId', options.subjectId);
            if (options?.page) params.append('page', options.page.toString());
            if (options?.limit) params.append('limit', options.limit.toString());

            const token = authService.getToken();
            const response = await fetch(
                `${this.baseURL}/attendance/history/${studentId}?${params.toString()}`, 
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: AttendanceHistoryResponse = await response.json();
            console.log('✅ Attendance history fetched:', data);

            return data;

        } catch (error) {
            console.error('❌ Error fetching attendance history:', error);
            
            return {
                success: false,
                studentId: studentId,
                count: 0,
                records: []
            };
        }
    }

    /**
     * Get attendance statistics for student
     */
    async getAttendanceStats(
        studentId: string,
        subjectId?: string
    ): Promise<AttendanceStatsResponse> {
        try {
            console.log('🔍 AttendanceService.getAttendanceStats called for:', studentId);

            const params = new URLSearchParams();
            if (subjectId) params.append('subjectId', subjectId);

            const token = authService.getToken();
            const response = await fetch(
                `${this.baseURL}/attendance/stats/${studentId}?${params.toString()}`, 
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: AttendanceStatsResponse = await response.json();
            console.log('✅ Attendance stats fetched:', data);

            return data;

        } catch (error) {
            console.error('❌ Error fetching attendance stats:', error);
            
            return {
                success: false,
                studentId: studentId,
                stats: {
                    totalSessions: 0,
                    presentSessions: 0,
                    lateSessions: 0,
                    absentSessions: 0,
                    attendanceRate: 0,
                    subjects: []
                }
            };
        }
    }

    /**
     * Get today's attendance for student
     */
    async getTodayAttendance(studentId: string): Promise<{
        success: boolean;
        data?: AttendanceRecord[];
        message?: string;
    }> {
        try {
            console.log('🔍 AttendanceService.getTodayAttendance called for:', studentId);

            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/attendance/today/${studentId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Today attendance fetched:', data);

            return data;

        } catch (error) {
            console.error('❌ Error fetching today attendance:', error);
            return {
                success: false,
                message: 'Failed to fetch today attendance'
            };
        }
    }

    /**
     * Check session status for subject
     */
    async getSessionStatus(subjectId: string): Promise<{
        success: boolean;
        data?: {
            hasActiveSession: boolean;
            currentTimeSlot?: any;
            sessionInfo?: string;
        };
        message?: string;
    }> {
        try {
            console.log('🔍 AttendanceService.getSessionStatus called for:', subjectId);

            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/attendance/subject/${subjectId}/session-status`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Session status fetched:', data);

            return data;

        } catch (error) {
            console.error('❌ Error fetching session status:', error);
            return {
                success: false,
                message: 'Failed to fetch session status'
            };
        }
    }

    /**
     * Transform backend AttendanceRecord to HomeScreen format
     * For compatibility with existing HomeScreen code
     */
    transformToHomeFormat(records: AttendanceRecord[]): HomeAttendanceRecord[] {
        return records.map(record => ({
            id: record.AttendanceId,
            subject: `${record.subjectName} (${record.subjectCode})`,
            timestamp: new Date(record.checked_in_at).toLocaleString('vi-VN'),
            location: record.roomId || 'N/A',
            status: this.mapStatusToHomeFormat(record.status)
        }));
    }

    /**
     * Map backend status to HomeScreen status format
     */
    private mapStatusToHomeFormat(status: string): 'Present' | 'Late' | 'Absent' {
        switch (status) {
            case 'PRESENT': return 'Present';
            case 'LATE': return 'Late';
            case 'ABSENT': return 'Absent';
            case 'EXCUSED': return 'Absent'; // Treat excused as absent for UI
            default: return 'Absent';
        }
    }

    // ======================================
    // CLASS SESSION ENDPOINTS
    // ======================================

    /**
     * Get current active session for subject
     */
    async getCurrentSession(subjectId: string): Promise<{
        success: boolean;
        sessionId?: string;
        session?: any;
        message?: string;
    }> {
        try {
            console.log('🔍 AttendanceService.getCurrentSession called for:', subjectId);

            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/attendance/session/current/${subjectId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Current session fetched:', data);

            return data;

        } catch (error) {
            console.error('❌ Error fetching current session:', error);
            return {
                success: false,
                message: 'Failed to fetch current session'
            };
        }
    }

    /**
     * Get absent students for session (Admin only)
     */
    async getAbsentStudents(sessionId: string): Promise<{
        success: boolean;
        sessionId: string;
        session_date: string;
        count: number;
        absentStudents: {
            studentId: string;
            studentName: string;
            studentEmail: string;
        }[];
    }> {
        try {
            console.log('🔍 AttendanceService.getAbsentStudents called for:', sessionId);

            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/attendance/session/${sessionId}/absent`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Absent students fetched:', data);

            return data;

        } catch (error) {
            console.error('❌ Error fetching absent students:', error);
            return {
                success: false,
                sessionId: sessionId,
                session_date: '',
                count: 0,
                absentStudents: []
            };
        }
    }

    /**
     * Generate sessions for date (Admin only)
     */
    async generateSessions(date?: string): Promise<{
        success: boolean;
        message: string;
    }> {
        try {
            console.log('🔍 AttendanceService.generateSessions called for:', date || 'today');

            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/attendance/session/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ date })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Sessions generated:', data);

            return data;

        } catch (error) {
            console.error('❌ Error generating sessions:', error);
            return {
                success: false,
                message: 'Failed to generate sessions'
            };
        }
    }

    /**
     * Get daily dashboard for admin
     */
    async getDailyDashboard(date: string): Promise<{
        success: boolean;
        date: string;
        sessions: any[];
    }> {
        try {
            console.log('🔍 AttendanceService.getDailyDashboard called for:', date);

            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/attendance/dashboard/${date}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Daily dashboard fetched:', data);

            return data;

        } catch (error) {
            console.error('❌ Error fetching daily dashboard:', error);
            return {
                success: false,
                date: date,
                sessions: []
            };
        }
    }
}

// ======================================
// EXPORT
// ======================================

export const attendanceService = new AttendanceServiceClass();

// Export for backward compatibility
export default attendanceService;
