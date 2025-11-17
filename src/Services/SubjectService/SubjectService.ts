// src/Services/SubjectService/SubjectService.ts

import { authService } from '../AuthService/AuthService';
import type {
    SubjectInfo, 
    Subject, 
    SubjectWithSchedule, 
    StudentSubjectsResponse,
    TimeSlotResponse,
    EnrollmentResponse,
    RoomInfoResponse,
    EnrolledStudent
} from '../../models';

// ======================================
// SERVICE CLASS
// ======================================

class SubjectServiceClass {
    private baseURL: string;

    constructor() {
        this.baseURL = '/api';
    }

    /**
     * Get all subjects (for admin or general listing)
     */
    async getAllSubjects(): Promise<Subject[]> {
        try {
            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/subjects`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            return data.subjects || [];
        } catch (error) {
            console.error('❌ Error fetching all subjects:', error);
            throw new Error('Failed to fetch subjects');
        }
    }

    /**
     * Get subjects enrolled by student (raw backend data)
     */
    async getStudentSubjects(studentId: string): Promise<SubjectWithSchedule[]> {
        try {
            const token = authService.getToken();

            if (!token) {
                throw new Error('No authentication token available');
            }

            const url = `${this.baseURL}/subjects/student/${studentId}`;

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data: StudentSubjectsResponse = await response.json();

            return data.subjects || [];
        } catch (error) {
            console.error('❌ Error fetching student subjects:', error);
            return [];
        }
    }

    /**
     * Get student subjects formatted for HomeScreen
     * This is the main method HomeScreen will use
     * ✅ NOW INCLUDES TODAY'S CLASS SESSION TIMES
     */
    async getStudentSubjectsFormatted(studentId: string): Promise<SubjectInfo[]> {
        try {
            const rawSubjects = await this.getStudentSubjects(studentId);

            // Transform backend data to HomeScreen format WITH today's session times
            const formattedSubjects = await this.transformToSubjectInfoWithTodayTimes(rawSubjects);

            return formattedSubjects;

        } catch (error) {
            console.error('❌ Error getting formatted student subjects:', error);
            throw new Error('Failed to fetch student subjects');
        }
    }

    /**
     * Get list of subject codes that student is enrolled in
     * Used by authService.getStudentRegisteredSubjects()
     */
    async getStudentRegisteredSubjectCodes(studentId: string): Promise<string[]> {
        try {
            const subjects = await this.getStudentSubjects(studentId);
            return subjects.map(subject => subject.subjectCode);
        } catch (error) {
            console.error('❌ Error getting student registered subject codes:', error);
            return [];
        }
    }

    /**
     * Transform backend SubjectWithSchedule[] to HomeScreen SubjectInfo[] WITH TODAY'S CLASS SESSION TIMES
     */
    private async transformToSubjectInfoWithTodayTimes(rawSubjects: SubjectWithSchedule[]): Promise<SubjectInfo[]> {
        try {
            // Get today's class sessions for all subjects
            const todaySessionsResponse = await fetch(`/api/attendance/sessions/current`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${authService.getToken()}`,
                    'Content-Type': 'application/json'
                }
            });

            let todaySessions: any[] = [];
            if (todaySessionsResponse.ok) {
                const sessionsData = await todaySessionsResponse.json();
                todaySessions = sessionsData.sessions || [];
            }

            // Transform with today's session times
            return this.transformToSubjectInfoWithSessions(rawSubjects, todaySessions);

        } catch (error) {
            console.error('❌ Error loading today sessions, fallback to TimeSlot times:', error);
            // Fallback to original method if session loading fails
            return this.transformToSubjectInfo(rawSubjects);
        }
    }

    /**
     * Transform with session data (helper method)
     */
    private transformToSubjectInfoWithSessions(rawSubjects: SubjectWithSchedule[], todaySessions: any[]): SubjectInfo[] {
        // Group subjects by subjectId to handle multiple time slots
        const subjectMap = new Map<string, SubjectWithSchedule[]>();

        rawSubjects.forEach(subject => {
            if (!subjectMap.has(subject.subjectId)) {
                subjectMap.set(subject.subjectId, []);
            }
            subjectMap.get(subject.subjectId)!.push(subject);
        });

        // Transform each subject group to SubjectInfo
        return Array.from(subjectMap.entries()).map(([subjectId, timeSlots]) => {
            const firstSlot = timeSlots[0];

            // ✅ TRY TO GET TODAY'S SESSION TIME FIRST
            const todaySession = todaySessions.find(session => session.subjectId === subjectId);
            let formattedTime: string;

            if (todaySession) {
                // Use today's session time (may be different from TimeSlot)
                formattedTime = this.formatTimeRange(todaySession.start_time, todaySession.end_time);
            } else {
                // Fallback to TimeSlot time
                formattedTime = this.formatTimeRange(firstSlot.start_time, firstSlot.end_time);
            }

            // Format schedule (combine all days)
            const days = timeSlots.map(slot => this.formatDayName(slot.day_of_week));
            const uniqueDays = [...new Set(days)].sort();
            const schedule = uniqueDays.join(', ');

            // Format room - Get room for TODAY specifically
            const today = new Date();
            const currentDayName = today.toLocaleDateString('en-US', { weekday: 'short' }); // Sat, Sun, Mon, etc.

            // Find timeslot for today
            const todaySlot = timeSlots.find(slot => slot.day_of_week === currentDayName);
            const room = todaySlot ? (todaySlot.roomId || 'TBA') : (firstSlot.roomId || 'TBA');

            return {
                subjectId: firstSlot.subjectId,
                name: firstSlot.subjectName,
                code: firstSlot.subjectCode,
                time: formattedTime, // ✅ Now uses today's session time if available
                room: room,
                instructor: '', // ✅ Removed instructor field
                schedule: schedule
            };
        });
    }

    /**
     * Transform backend SubjectWithSchedule[] to HomeScreen SubjectInfo[] (FALLBACK METHOD)
     */
    private transformToSubjectInfo(rawSubjects: SubjectWithSchedule[]): SubjectInfo[] {
        // Group subjects by subjectId to handle multiple time slots
        const subjectMap = new Map<string, SubjectWithSchedule[]>();

        rawSubjects.forEach(subject => {
            if (!subjectMap.has(subject.subjectId)) {
                subjectMap.set(subject.subjectId, []);
            }
            subjectMap.get(subject.subjectId)!.push(subject);
        });

        // Transform each subject group to SubjectInfo
        return Array.from(subjectMap.entries()).map(([, timeSlots]) => {
            const firstSlot = timeSlots[0];

            // Format time (convert HH:MM:SS to HH:MM AM/PM)
            const formattedTime = this.formatTimeRange(firstSlot.start_time, firstSlot.end_time);

            // Format schedule (combine all days)
            const days = timeSlots.map(slot => this.formatDayName(slot.day_of_week));
            const uniqueDays = [...new Set(days)].sort();
            const schedule = uniqueDays.join(', ');

            // Format room - Get room for TODAY specifically
            const today = new Date();
            const currentDayName = today.toLocaleDateString('en-US', { weekday: 'short' }); // Sat, Sun, Mon, etc.

            // Find timeslot for today
            const todaySlot = timeSlots.find(slot => slot.day_of_week === currentDayName);
            const room = todaySlot ? (todaySlot.roomId || 'TBA') : (firstSlot.roomId || 'TBA');

            return {
                subjectId: firstSlot.subjectId,
                name: firstSlot.subjectName,
                code: firstSlot.subjectCode,
                time: formattedTime,
                room: room,
                instructor: '', // ✅ Removed instructor field  
                schedule: schedule
            };
        });
    }

    /**
     * Convert HH:MM:SS to HH:MM AM/PM format
     */
    private formatTime(timeStr: string): string {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
        return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }

    /**
     * Format time range
     */
    private formatTimeRange(startTime: string, endTime: string): string {
        return `${this.formatTime(startTime)} - ${this.formatTime(endTime)}`;
    }

    /**
     * Convert day abbreviation to Vietnamese
     */
    private formatDayName(day: string): string {
        const dayMap: Record<string, string> = {
            'Mon': 'Thứ 2',
            'Tue': 'Thứ 3',
            'Wed': 'Thứ 4',
            'Thu': 'Thứ 5',
            'Fri': 'Thứ 6',
            'Sat': 'Thứ 7',
            'Sun': 'Chủ Nhật'
        };
        return dayMap[day] || day;
    }

    /**
     * Get current active timeslot for subject
     */
    async getCurrentTimeSlot(subjectId: string): Promise<TimeSlotResponse> {
        try {
            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/subjects/${subjectId}/current-timeslot`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Current timeslot fetched:', data);

            return data;
        } catch (error) {
            console.error('❌ Error fetching current timeslot:', error);
            return { success: false, message: 'Failed to fetch timeslot' };
        }
    }

    /**
     * Check if student is enrolled in subject
     */
    async checkEnrollment(subjectId: string, studentId: string): Promise<EnrollmentResponse> {
        try {
            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/subjects/${subjectId}/enrollment/${studentId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Enrollment checked:', data);

            return data;
        } catch (error) {
            console.error('❌ Error checking enrollment:', error);
            return { success: false, enrolled: false, message: 'Failed to check enrollment' };
        }
    }

    /**
     * Get room info for GPS validation
     */
    async getRoomInfo(subjectId: string): Promise<RoomInfoResponse> {
        try {
            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/subjects/${subjectId}/room-info`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Room info fetched:', data);

            return data;
        } catch (error) {
            console.error('❌ Error fetching room info:', error);
            return { success: false, message: 'Failed to fetch room info' };
        }
    }

    /**
 * Get all enrolled students for a subject (Admin use)
 */
    async getEnrolledStudents(subjectId: string): Promise<EnrolledStudent[]> {
        try {
            const token = authService.getToken();
            const response = await fetch(`${this.baseURL}/subjects/${subjectId}/enrolled-students`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Enrolled students fetched:', data);

            return data.success ? data.students || [] : [];
        } catch (error) {
            console.error('❌ Error fetching enrolled students:', error);
            return [];
        }
    }
}

// ======================================
// EXPORT
// ======================================

export const subjectService = new SubjectServiceClass();

// Export for backward compatibility
export default subjectService;
