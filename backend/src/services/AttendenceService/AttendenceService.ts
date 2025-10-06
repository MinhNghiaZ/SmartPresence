// backend/src/services/AttendenceService/AttendenceService.ts

import db from "../../database/connection";
import { 
    Attendance, 
    CheckInRequest, 
    CheckInResponse, 
    AttendanceRecord,
    AttendanceHistoryResponse,
    AttendanceStats,
    AttendanceStatsResponse,
    ATTENDANCE_CONSTANTS,
    ATTENDANCE_STATUS 
} from '../../models/attendance';
import { SubjectService } from '../SubjectService/SubjectsManagement';
import { GPSService } from '../GpsService/gpsService';
import { ClassSessionService } from '../ClassSessionService/ClassSessionService';

export class AttendanceService {
    
    /**
     * Process check-in for student - Updated to use ClassSession
     */
    static async checkIn(request: CheckInRequest): Promise<CheckInResponse> {
        try {
            console.log('🔍 AttendanceService.checkIn called:', {
                studentId: request.studentId,
                subjectId: request.subjectId,
                hasLocation: !!request.location
            });
            
            const { studentId, subjectId, location } = request;
            
            // 1. ✅ Get current active session
            const sessionResponse = await ClassSessionService.getCurrentActiveSession(subjectId);
            
            if (!sessionResponse.success || !sessionResponse.session) {
                return {
                    success: false,
                    status: 'FAILED',
                    message: sessionResponse.message || 'No active class session',
                    timestamp: new Date()
                };
            }
            
            const activeSession = sessionResponse.session;
            
            // 2. ✅ Validate student enrollment
            const isEnrolled = await SubjectService.isStudentEnrolled(studentId, subjectId);
            if (!isEnrolled) {
                return {
                    success: false,
                    status: 'FAILED',
                    message: 'Student not enrolled in this subject',
                    timestamp: new Date()
                };
            }
            
            // 3. ✅ Check if already checked in for this session
            const existingAttendance = await this.getExistingAttendanceForSession(
                studentId, 
                activeSession.sessionId
            );
            
            if (existingAttendance) {
                return {
                    success: false,
                    status: 'FAILED',
                    message: 'Already checked in for this session',
                    timestamp: new Date(),
                    attendanceId: existingAttendance.AttendanceId,
                    sessionId: activeSession.sessionId
                };
            }
            
            // 4. ✅ Validate GPS location (if room has coordinates)
            let locationValid = true;
            if (activeSession.latitude && activeSession.longitude) {
                const distance = this.calculateDistance(
                    location.latitude,
                    location.longitude,
                    parseFloat(activeSession.latitude.toString()),
                    parseFloat(activeSession.longitude.toString())
                );
                
                const allowedRadius = activeSession.radius || ATTENDANCE_CONSTANTS.MAX_DISTANCE_METERS;
                locationValid = distance <= allowedRadius;
                
                if (!locationValid) {
                    return {
                        success: false,
                        status: 'FAILED',
                        message: `You are ${Math.round(distance)}m away. Must be within ${allowedRadius}m of classroom.`,
                        timestamp: new Date(),
                        locationValid: false
                    };
                }
            }
            
            // 5. ✅ Determine attendance status (PRESENT/LATE) or check if too late
            const attendanceStatus = this.determineAttendanceStatusFromSession(activeSession);
            
            // 5.1 ✅ Check if exceeded check-in time (30 minutes)
            if (attendanceStatus === null) {
                return {
                    success: false,
                    status: 'FAILED',
                    message: 'Quá thời gian check-in! Chỉ được phép check-in trong vòng 30 phút từ lúc bắt đầu môn học.',
                    timestamp: new Date(),
                    locationValid: true
                };
            }
            
            // 6. ✅ Create attendance record with sessionId FIRST (without imageId)
            const attendanceId = await this.createAttendanceRecordWithSession({
                studentId,
                subjectId,
                sessionId: activeSession.sessionId,
                status: attendanceStatus,
                imageId: undefined // Will be updated later if image is provided
            });
            
            // 7. ✅ Save image to captured_images table if provided (with attendanceId)
            let imageId = null;
            if (request.imageData) {
                imageId = await this.saveAttendanceImageWithAttendanceId({
                    studentId,
                    imageData: request.imageData,
                    subjectId,
                    attendanceId, // Now we have the attendanceId
                    confidence: request.confidence // Pass face recognition confidence
                });
                
                // Update attendance record with imageId
                await this.updateAttendanceImageId(attendanceId, imageId);
                console.log(`✅ Image saved with ID: ${imageId} and linked to attendance ${attendanceId} (confidence: ${request.confidence || 0}%)`);
            }
            
            console.log(`✅ Check-in successful: ${attendanceId} - Status: ${attendanceStatus}`);
            
            return {
                success: true,
                attendanceId: attendanceId,
                sessionId: activeSession.sessionId,
                status: attendanceStatus,
                message: `Check-in successful! Status: ${attendanceStatus}`,
                timestamp: new Date(),
                locationValid: locationValid,
                faceRecognitionSuccess: !!request.faceDescriptor
            };
            
        } catch (error) {
            console.error('❌ AttendanceService.checkIn error:', error);
            return {
                success: false,
                status: 'FAILED',
                message: 'Check-in system error',
                timestamp: new Date()
            };
        }
    }
    
    /**
     * Get attendance history for student
     */
    static async getAttendanceHistory(
        studentId: string, 
        subjectId?: string,
        page: number = 1,
        limit: number = 20
    ): Promise<AttendanceHistoryResponse> {
        try {
            console.log(`🔍 AttendanceService.getAttendanceHistory for ${studentId}`);
            
            const offset = (page - 1) * limit;
            
            // ✅ SIMPLIFIED QUERY - test step by step
            let query = `
                SELECT 
                    a.AttendanceId,
                    a.studentId,
                    a.subjectId,
                    a.sessionId,
                    a.checked_in_at,
                    a.status,
                    a.imageId
                FROM attendance a
                WHERE a.studentId = ?
            `;
            
            const params: any[] = [studentId];
            
            if (subjectId) {
                query += ` AND a.subjectId = ?`;
                params.push(subjectId);
            }
            
            query += ` ORDER BY a.checked_in_at DESC LIMIT ? OFFSET ?`;
            params.push(limit, offset);
            
            const [rows] = await db.execute(query, params);
            
            // Get total count
            let countQuery = `SELECT COUNT(*) as total FROM attendance WHERE studentId = ?`;
            const countParams: any[] = [studentId];
            if (subjectId) {
                countQuery += ` AND subjectId = ?`;
                countParams.push(subjectId);
            }
            
            const [countResult] = await db.execute(countQuery, countParams);
            const totalRecords = (countResult as any[])[0].total;
            
            const records = (rows as any[]).map(row => ({
                AttendanceId: row.AttendanceId,
                studentId: row.studentId,
                studentName: row.studentName,
                subjectId: row.subjectId,
                subjectName: row.subjectName,
                subjectCode: row.subjectCode,
                sessionId: row.sessionId,
                session_date: row.session_date,
                day_of_week: row.day_of_week,
                start_time: row.start_time,
                end_time: row.end_time,
                roomId: row.roomId,
                checked_in_at: new Date(row.checked_in_at),
                status: row.status,
                confidence: row.confidence,
                imageId: row.imageId
            })) as AttendanceRecord[];
            
            console.log(`✅ Found ${records.length} attendance records for ${studentId}`);
            
            return {
                success: true,
                studentId: studentId,
                count: records.length,
                totalRecords: totalRecords,
                page: page,
                limit: limit,
                records: records
            };
            
        } catch (error) {
            console.error('❌ Error getting attendance history:', error);
            console.error('❌ Query details:', { studentId, subjectId, page, limit });
            console.error('❌ Full error:', error);
            throw new Error('Failed to fetch attendance history');
        }
    }
    
    /**
     * Get attendance statistics for student
     */
    static async getAttendanceStats(
        studentId: string,
        subjectId?: string
    ): Promise<AttendanceStatsResponse> {
        try {
            console.log(`🔍 AttendanceService.getAttendanceStats for ${studentId}`);
            
            // Overall stats query
            let statsQuery = `
                SELECT 
                    COUNT(*) as totalSessions,
                    SUM(CASE WHEN status = 'PRESENT' THEN 1 ELSE 0 END) as presentSessions,
                    SUM(CASE WHEN status = 'LATE' THEN 1 ELSE 0 END) as lateSessions,
                    SUM(CASE WHEN status = 'ABSENT' THEN 1 ELSE 0 END) as absentSessions
                FROM attendance 
                WHERE studentId = ?
            `;
            
            const statsParams: any[] = [studentId];
            if (subjectId) {
                statsQuery += ` AND subjectId = ?`;
                statsParams.push(subjectId);
            }
            
            const [statsRows] = await db.execute(statsQuery, statsParams);
            const overallStats = (statsRows as any[])[0];
            
            // Per-subject stats
            let subjectStatsQuery = `
                SELECT 
                    s.subjectId,
                    s.name as subjectName,
                    COUNT(*) as totalSessions,
                    SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as presentSessions,
                    ROUND(
                        (SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 
                        2
                    ) as attendanceRate
                FROM attendance a
                INNER JOIN subject s ON a.subjectId = s.subjectId
                WHERE a.studentId = ?
            `;
            
            const subjectStatsParams: any[] = [studentId];
            if (subjectId) {
                subjectStatsQuery += ` AND a.subjectId = ?`;
                subjectStatsParams.push(subjectId);
            }
            
            subjectStatsQuery += ` GROUP BY s.subjectId, s.name ORDER BY s.name`;
            
            const [subjectStatsRows] = await db.execute(subjectStatsQuery, subjectStatsParams);
            
            const attendanceRate = overallStats.totalSessions > 0 
                ? Math.round((overallStats.presentSessions / overallStats.totalSessions) * 100 * 100) / 100
                : 0;
            
            const stats: AttendanceStats = {
                totalSessions: overallStats.totalSessions,
                presentSessions: overallStats.presentSessions,
                lateSessions: overallStats.lateSessions,
                absentSessions: overallStats.absentSessions,
                attendanceRate: attendanceRate,
                subjects: (subjectStatsRows as any[]).map(row => ({
                    subjectId: row.subjectId,
                    subjectName: row.subjectName,
                    totalSessions: row.totalSessions,
                    presentSessions: row.presentSessions,
                    attendanceRate: parseFloat(row.attendanceRate)
                }))
            };
            
            console.log(`✅ Generated attendance stats for ${studentId}: ${attendanceRate}% attendance rate`);
            
            return {
                success: true,
                studentId: studentId,
                stats: stats
            };
            
        } catch (error) {
            console.error('❌ Error getting attendance stats:', error);
            throw new Error('Failed to fetch attendance statistics');
        }
    }
    
    /**
     * Helper: Check for existing attendance record
     */
    private static async getExistingAttendance(
        studentId: string, 
        subjectId: string, 
        timeSlotId: string
    ): Promise<Attendance | null> {
        try {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            
            const [rows] = await db.execute(`
                SELECT AttendanceId, studentId, subjectId, timeSlotId, checked_in_at, status, imageId
                FROM attendance 
                WHERE studentId = ? 
                AND subjectId = ? 
                AND timeSlotId = ?
                AND DATE(checked_in_at) = ?
            `, [studentId, subjectId, timeSlotId, today]);
            
            return (rows as any[]).length > 0 ? (rows as any[])[0] : null;
        } catch (error) {
            console.error('❌ Error checking existing attendance:', error);
            return null;
        }
    }
    
    /**
     * Helper: Determine attendance status based on time
     */
    private static determineAttendanceStatus(timeSlot: any): 'PRESENT' | 'LATE' {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS
        
        // Parse start time and add late threshold
        const startTime = timeSlot.start_time;
        const [hours, minutes, seconds] = startTime.split(':').map(Number);
        const startDateTime = new Date();
        startDateTime.setHours(hours, minutes + ATTENDANCE_CONSTANTS.LATE_THRESHOLD_MINUTES, seconds);
        
        const lateThresholdTime = startDateTime.toTimeString().slice(0, 8);
        
        return currentTime <= lateThresholdTime ? 'PRESENT' : 'LATE';
    }
    
    /**
     * Helper: Get enrollment record
     */
    private static async getEnrollmentRecord(studentId: string, subjectId: string) {
        try {
            const [rows] = await db.execute(`
                SELECT enrollmentId, studentId, subjectId, semesterId
                FROM enrollment 
                WHERE studentId = ? AND subjectId = ?
            `, [studentId, subjectId]);
            
            return (rows as any[]).length > 0 ? (rows as any[])[0] : null;
        } catch (error) {
            console.error('❌ Error getting enrollment record:', error);
            return null;
        }
    }
    
    /**
     * Helper: Create attendance record in database
     */
    private static async createAttendanceRecord(data: {
        studentId: string;
        subjectId: string;
        timeSlotId: string;
        enrollmentId: string;
        status: 'PRESENT' | 'LATE';
        imageId?: string;
    }): Promise<string> {
        try {
            const attendanceId = `ATT_${Date.now()}_${data.studentId}_${Math.random().toString(36).substr(2, 9)}`;
            
            await db.execute(`
                INSERT INTO Attendance (
                    AttendanceId, 
                    studentId, 
                    subjectId, 
                    timeSlotId, 
                    enrollmentId, 
                    checked_in_at, 
                    status,
                    imageId
                ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)
            `, [
                attendanceId,
                data.studentId,
                data.subjectId,
                data.timeSlotId,
                data.enrollmentId,
                data.status,
                data.imageId || null
            ]);
            
            return attendanceId;
        } catch (error) {
            console.error('❌ Error creating attendance record:', error);
            throw error;
        }
    }
    
    /**
     * Get today's attendance for student across all subjects
     */
    static async getTodayAttendance(studentId: string): Promise<{
        success: boolean;
        data?: any[];
        message?: string;
    }> {
        try {
            console.log('🔍 AttendanceService.getTodayAttendance called for student:', studentId);
            
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            
            const [rows]: any = await db.execute(
                `SELECT 
                    a.*,
                    s.name as subject_name,
                    s.code as subject_code,
                    ts.start_time,
                    ts.end_time,
                    r.roomId
                FROM attendance a
                JOIN enrollment e ON a.enrollment_id = e.enrollmentId
                JOIN subject s ON e.subjectId = s.subjectId
                LEFT JOIN timeslot ts ON e.subjectId = ts.subjectId
                LEFT JOIN room r ON ts.roomId = r.roomId
                WHERE e.studentId = ? 
                AND DATE(a.check_in_time) = ?
                ORDER BY a.check_in_time DESC`,
                [studentId, today]
            );
            
            return {
                success: true,
                data: rows || []
            };
            
        } catch (error) {
            console.error('❌ AttendanceService.getTodayAttendance error:', error);
            return {
                success: false,
                message: 'Failed to get today attendance'
            };
        }
    }

    /**
     * Get session status for a subject (check if there's active timeslot)
     */
    static async getSessionStatus(subjectId: string): Promise<{
        success: boolean;
        data?: {
            hasActiveSession: boolean;
            currentTimeSlot?: any;
            sessionInfo?: string;
        };
        message?: string;
    }> {
        try {
            console.log('🔍 AttendanceService.getSessionStatus called for subject:', subjectId);
            
            // ✅ Get current timeslot for this subject
            const currentTimeSlot = await SubjectService.getCurrentTimeSlot(subjectId);
            
            const hasActiveSession = !!currentTimeSlot;
            
            return {
                success: true,
                data: {
                    hasActiveSession,
                    currentTimeSlot: currentTimeSlot || null,
                    sessionInfo: hasActiveSession ? 
                        `Active session found (${currentTimeSlot.start_time} - ${currentTimeSlot.end_time})` :
                        'No active session for this subject'
                }
            };
            
        } catch (error) {
            console.error('❌ AttendanceService.getSessionStatus error:', error);
            return {
                success: false,
                message: 'Failed to get session status'
            };
        }
    }
    
    /**
     * Cancel attendance record (admin function)
     */
    static async cancelAttendance(attendanceId: string, reason?: string): Promise<{
        success: boolean;
        message: string;
        data?: any;
    }> {
        try {
            console.log('🔍 AttendanceService.cancelAttendance called:', {
                attendanceId,
                reason
            });
            
            // ✅ Check if attendance exists
            const [rows]: any = await db.execute(
                `SELECT * FROM attendance WHERE id = ?`,
                [attendanceId]
            );
            
            if (rows.length === 0) {
                return {
                    success: false,
                    message: 'Attendance record not found'
                };
            }
            
            const attendance = rows[0];
            
            // ✅ Update attendance status to cancelled
            await db.execute(
                `UPDATE attendance 
                 SET status = 'cancelled', 
                     updated_at = NOW(),
                     notes = CONCAT(IFNULL(notes, ''), ' [CANCELLED: ', ?, ']')
                 WHERE id = ?`,
                [reason || 'No reason provided', attendanceId]
            );
            
            return {
                success: true,
                message: 'Attendance cancelled successfully',
                data: {
                    attendanceId,
                    previousStatus: attendance.status,
                    reason: reason || 'No reason provided',
                    cancelledAt: new Date()
                }
            };
            
        } catch (error) {
            console.error('❌ AttendanceService.cancelAttendance error:', error);
            return {
                success: false,
                message: 'Failed to cancel attendance'
            };
        }
    }

    // ======================================
    // NEW HELPER METHODS FOR CLASS SESSION
    // ======================================

    /**
     * Check if student already attended this session
     */
    private static async getExistingAttendanceForSession(
        studentId: string, 
        sessionId: string
    ): Promise<Attendance | null> {
        try {
            const [rows] = await db.execute(`
                SELECT AttendanceId, studentId, subjectId, sessionId, checked_in_at, status, imageId
                FROM attendance 
                WHERE studentId = ? AND sessionId = ?
            `, [studentId, sessionId]);
            
            return (rows as any[]).length > 0 ? (rows as any[])[0] : null;
        } catch (error) {
            console.error('❌ Error checking existing attendance:', error);
            return null;
        }
    }

    /**
     * Calculate distance between two GPS coordinates (in meters)
     */
    private static calculateDistance(
        lat1: number, 
        lon1: number, 
        lat2: number, 
        lon2: number
    ): number {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180; // φ, λ in radians
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    }

    /**
     * Determine attendance status from session data (PRESENT vs LATE) 
     * Returns null if check-in time is exceeded (>30 minutes from start)
     */
    private static determineAttendanceStatusFromSession(session: any): 'PRESENT' | 'LATE' | null {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS
        
        // Parse start time
        const startTime = session.start_time;
        const [hours, minutes, seconds] = startTime.split(':').map(Number);
        
        // Calculate late threshold (15 minutes)
        const lateThresholdTime = new Date();
        lateThresholdTime.setHours(hours, minutes + ATTENDANCE_CONSTANTS.LATE_THRESHOLD_MINUTES, seconds);
        const lateThreshold = lateThresholdTime.toTimeString().slice(0, 8);
        
        // Calculate check-in deadline (30 minutes from start)
        const checkInDeadlineTime = new Date();
        checkInDeadlineTime.setHours(hours, minutes + ATTENDANCE_CONSTANTS.CHECK_IN_DEADLINE_MINUTES, seconds);
        const checkInDeadline = checkInDeadlineTime.toTimeString().slice(0, 8);
        
        // Check if exceeded check-in time
        if (currentTime > checkInDeadline) {
            return null; // Too late to check in
        }
        
        return currentTime <= lateThreshold ? 'PRESENT' : 'LATE';
    }

    /**
     * Create attendance record with sessionId
     */
    private static async createAttendanceRecordWithSession(data: {
        studentId: string;
        subjectId: string;
        sessionId: string;
        status: 'PRESENT' | 'LATE';
        imageId?: string;
    }): Promise<string> {
        try {
            // Get enrollment record
            const [enrollmentRows] = await db.execute(`
                SELECT enrollmentId 
                FROM enrollment 
                WHERE studentId = ? AND subjectId = ?
            `, [data.studentId, data.subjectId]);
            
            if ((enrollmentRows as any[]).length === 0) {
                throw new Error('Enrollment record not found');
            }
            
            const enrollmentId = (enrollmentRows as any[])[0].enrollmentId;
            const attendanceId = `ATT_${Date.now()}_${data.studentId}_${Math.random().toString(36).substr(2, 9)}`;
            
            await db.execute(`
                INSERT INTO Attendance (
                    AttendanceId, 
                    studentId, 
                    subjectId, 
                    sessionId,        -- ✅ Use sessionId
                    enrollmentId, 
                    checked_in_at, 
                    status,
                    imageId
                ) VALUES (?, ?, ?, ?, ?, NOW(), ?, ?)
            `, [
                attendanceId,
                data.studentId,
                data.subjectId,
                data.sessionId,   // ✅ sessionId instead of timeSlotId
                enrollmentId,
                data.status,
                data.imageId || null
            ]);
            
            return attendanceId;
        } catch (error) {
            console.error('❌ Error creating attendance record:', error);
            throw error;
        }
    }

    /**
     * Save attendance image to captured_images table WITH attendanceId
     * Returns imageId to be stored in Attendance.imageId
     */
    private static async saveAttendanceImageWithAttendanceId(data: {
        studentId: string;
        imageData: string; // Base64 image
        subjectId: string;
        attendanceId: string; // ✅ Now we have attendanceId
        confidence?: number; // Face recognition confidence
    }): Promise<string> {
        try {
            // Generate unique imageId
            const imageId = `ATT_IMG_${Date.now()}_${data.studentId}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Convert base64 to buffer (remove data URL prefix if exists)
            const base64Data = data.imageData.replace(/^data:image\/[a-z]+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // Validate image size
            const maxSizeBytes = 5 * 1024 * 1024; // 5MB limit
            if (imageBuffer.length > maxSizeBytes) {
                throw new Error(`Image too large: ${imageBuffer.length} bytes (max: ${maxSizeBytes})`);
            }
            
            // ✅ Save to captured_images table WITH attendanceId from the start
            await db.execute(`
                INSERT INTO captured_images (
                    imageId, 
                    studentId, 
                    attendanceId,
                    imageData,
                    confidence,
                    recognition_result,
                    subjectId,
                    captured_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                imageId,
                data.studentId,
                data.attendanceId, // ✅ Now we have the real attendanceId
                imageBuffer,
                data.confidence || 0, // Default confidence if not provided
                'SUCCESS', // Assuming successful attendance check-in
                data.subjectId
            ]);
            
            console.log(`✅ Attendance image saved: ${imageId} (${imageBuffer.length} bytes) for attendance ${data.attendanceId}`);
            return imageId;
            
        } catch (error) {
            console.error('❌ Error saving attendance image:', error);
            throw error;
        }
    }

    /**
     * Update Attendance.imageId after image is saved
     */
    private static async updateAttendanceImageId(attendanceId: string, imageId: string): Promise<void> {
        try {
            await db.execute(`
                UPDATE Attendance 
                SET imageId = ? 
                WHERE AttendanceId = ?
            `, [imageId, attendanceId]);
            
            console.log(`✅ Updated attendance ${attendanceId} with imageId: ${imageId}`);
            
        } catch (error) {
            console.error('❌ Error updating attendance imageId:', error);
            throw error;
        }
    }

    /**
     * Update captured_images.attendanceId after attendance record is created
     */
    private static async updateImageAttendanceId(imageId: string, attendanceId: string): Promise<void> {
        try {
            await db.execute(`
                UPDATE captured_images 
                SET attendanceId = ? 
                WHERE imageId = ?
            `, [attendanceId, imageId]);
            
            console.log(`✅ Updated image ${imageId} with attendanceId: ${attendanceId}`);
            
        } catch (error) {
            console.error('❌ Error updating image attendanceId:', error);
            throw error;
        }
    }

    /**
     * Admin function: Update existing attendance status
     */
    static async adminUpdateAttendanceStatus(
        attendanceId: string, 
        newStatus: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED', 
        adminId: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            console.log(`🔍 AttendanceService.updateAttendanceStatus: ${attendanceId} → ${newStatus} by ${adminId}`);
            
            // Validate attendance exists
            const [existingRows] = await db.execute(`
                SELECT AttendanceId, studentId, subjectId, status 
                FROM attendance 
                WHERE AttendanceId = ?
            `, [attendanceId]);
            
            if ((existingRows as any[]).length === 0) {
                return { success: false, message: 'Attendance record not found' };
            }
            
            // Update status
            await db.execute(`
                UPDATE Attendance 
                SET status = ? 
                WHERE AttendanceId = ?
            `, [newStatus, attendanceId]);
            
            console.log(`✅ Updated attendance status: ${attendanceId} → ${newStatus}`);
            return { success: true, message: 'Attendance status updated successfully' };
            
        } catch (error) {
            console.error('❌ Error updating attendance status:', error);
            return { success: false, message: 'Failed to update attendance status' };
        }
    }

    /**
     * Admin function: Create new attendance record (when changing Absent → Present/Late)
     */
    static async adminCreateAttendanceRecord(
        studentId: string,
        subjectId: string, 
        status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED',
        adminId: string
    ): Promise<{ success: boolean; message: string; attendanceId?: string }> {
        try {
            console.log(`🔍 AttendanceService.createAttendanceRecord: ${studentId} in ${subjectId} → ${status} by admin ${adminId}`);
            
            // Check if already exists - commented out for admin override capability
            // const [existingRows] = await db.execute(`
            //     SELECT AttendanceId FROM attendance 
            //     WHERE studentId = ? AND subjectId = ? AND DATE(checked_in_at) = CURDATE()
            // `, [studentId, subjectId]);
            
            // if ((existingRows as any[]).length > 0) {
            //     return { success: false, message: 'Attendance record already exists for today' };
            // }
            
            // Generate attendance ID
            const timestamp = Date.now();
            const attendanceId = `ATT_${timestamp}_${studentId}_ADMIN`;
            
            // Get current active session for the subject
            const [sessionRows] = await db.execute(`
                SELECT sessionId FROM classsession 
                WHERE subjectId = ? AND session_status = 'ACTIVE' AND DATE(session_date) = CURDATE()
                LIMIT 1
            `, [subjectId]);
            
            if ((sessionRows as any[]).length === 0) {
                return { success: false, message: 'No active session found for this subject today' };
            }
            
            const sessionId = (sessionRows as any[])[0].sessionId;
            
            // Get real enrollment ID
            const [enrollmentRows] = await db.execute(`
                SELECT enrollmentId FROM enrollment 
                WHERE studentId = ? AND subjectId = ? 
                LIMIT 1
            `, [studentId, subjectId]);
            
            if ((enrollmentRows as any[]).length === 0) {
                return { success: false, message: 'Student is not enrolled in this subject' };
            }
            
            const enrollmentId = (enrollmentRows as any[])[0].enrollmentId;

            // Insert new attendance
            await db.execute(`
                INSERT INTO Attendance (AttendanceId, studentId, subjectId, sessionId, enrollmentId, status) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, [attendanceId, studentId, subjectId, sessionId, enrollmentId, status]);
            
            console.log(`✅ Created new attendance record: ${attendanceId}`);
            return { 
                success: true, 
                message: 'Attendance record created successfully',
                attendanceId: attendanceId
            };
            
        } catch (error) {
            console.error('❌ Error creating attendance record:', error);
            console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
            return { success: false, message: `Failed to create attendance record: ${error instanceof Error ? error.message : 'Unknown error'}` };
        }
    }

    /**
     * Get confidence score from captured_images table
     */
    static async getAttendanceConfidence(attendanceId: string): Promise<number | null> {
        try {
            const [rows] = await db.execute(`
                SELECT confidence 
                FROM captured_images 
                WHERE attendanceId = ? 
                LIMIT 1
            `, [attendanceId]);
            
            if ((rows as any[]).length === 0) {
                return null;
            }
            
            return (rows as any[])[0].confidence;
            
        } catch (error) {
            console.error('❌ Error getting attendance confidence:', error);
            return null;
        }
    }

    /**
     * Get all attendance records for a specific date
     */
    static async getAttendanceRecordsByDate(date: string): Promise<{
        success: boolean;
        records?: AttendanceRecord[];
        count?: number;
        message?: string;
    }> {
        try {
            console.log(`🔍 AttendanceService.getAttendanceRecordsByDate for: ${date}`);
            
            const [rows] = await db.execute(`
                SELECT 
                    a.AttendanceId,
                    a.studentId,
                    a.subjectId,
                    a.status,
                    a.checked_in_at,
                    a.imageId,
                    CASE WHEN a.imageId IS NOT NULL THEN true ELSE false END as hasImage
                FROM attendance a 
                WHERE DATE(a.checked_in_at) = ?
                ORDER BY a.checked_in_at DESC
            `, [date]);
            
            const records = rows as AttendanceRecord[];
            
            console.log(`✅ Found ${records.length} attendance records for ${date}`);
            
            return {
                success: true,
                records: records,
                count: records.length
            };
            
        } catch (error) {
            console.error(`❌ Error getting attendance records for ${date}:`, error);
            return {
                success: false,
                message: 'Failed to get attendance records'
            };
        }
    }

    /**
     * Get attendance history with captured images for admin (DemoHistory functionality)
     */
    static async getAttendanceHistoryWithImages(limit: number = 100): Promise<{
        success: boolean;
        records?: any[];
        count?: number;
        message?: string;
    }> {
        try {
            console.log(`🔍 AttendanceService.getAttendanceHistoryWithImages with limit: ${limit}`);
            
            // Check if db connection exists
            if (!db) {
                throw new Error('Database connection not available');
            }
            
            // Test simplest possible query first
            console.log('🔗 Executing simple captured_images count query...');
            const [countResult] = await db.execute('SELECT COUNT(*) as total FROM captured_images');
            console.log('📊 Total captured_images in DB:', countResult);
            
            console.log('🔗 Executing captured_images select query...');
            const [rows] = await db.execute(`
                SELECT 
                    imageId, 
                    studentId, 
                    subjectId, 
                    confidence, 
                    recognition_result, 
                    captured_at, 
                    ip_address
                FROM captured_images 
                ORDER BY captured_at DESC 
                LIMIT ?
            `, [limit]);
            
            console.log(`📋 Raw captured_images query returned ${(rows as any[]).length} rows`);
            
            if ((rows as any[]).length === 0) {
                console.log('⚠️ No captured images found in database');
                return {
                    success: true,
                    records: [],
                    count: 0,
                    message: 'No captured images found'
                };
            }
            
            const records = (rows as any[]).map(row => ({
                imageId: row.imageId,
                studentId: row.studentId,
                studentName: row.studentId || 'Unknown',
                subjectId: row.subjectId,
                subjectName: row.subjectId || 'Unknown',
                status: row.recognition_result || 'UNKNOWN',
                capturedAt: row.captured_at,
                confidence: row.confidence || 0,
                ipAddress: row.ip_address,
                imageStatus: 'SUCCESS',
                imageData: null // Temporarily exclude imageData to avoid BLOB issues
            }));
            
            console.log(`✅ Found ${records.length} captured image records`);
            
            return {
                success: true,
                records: records,
                count: records.length
            };
            
        } catch (error) {
            console.error('❌ Error getting attendance history with images:', error);
            return {
                success: false,
                message: 'Failed to get attendance history with images'
            };
        }
    }

    /**
     * Get attendance statistics for all students in a subject
     * Returns comprehensive stats: total sessions, present, late, absent days for each student
     * Note: absentEquivalent = absentDays + (lateDays / 2) [2 late = 1 absent]
     */
    static async getSubjectAttendanceStats(subjectId: string): Promise<{
        success: boolean;
        subjectId: string;
        students: {
            studentId: string;
            studentName: string;
            email: string;
            totalSessions: number;
            presentDays: number;
            lateDays: number;
            absentDays: number;
            absentEquivalent: number;
            attendanceRate: number;
        }[];
        totalSessions: number;
        message?: string;
    }> {
        try {
            console.log(`🔍 AttendanceService.getSubjectAttendanceStats for subject: ${subjectId}`);
            
            // First, get total number of sessions (ACTIVE or COMPLETED) for this subject
            const [totalSessionsResult] = await db.execute(`
                SELECT COUNT(DISTINCT sessionId) as totalSessions
                FROM classsession 
                WHERE subjectId = ? 
                AND session_status IN ('ACTIVE', 'COMPLETED')
            `, [subjectId]);
            
            const totalSessionsCount = (totalSessionsResult as any[])[0].totalSessions;
            
            // Get all enrolled students for this subject with their attendance stats
            const [rows] = await db.execute(`
                SELECT 
                    sa.studentId,
                    sa.name as studentName,
                    sa.email,
                    COUNT(a.AttendanceId) as totalAttendances,
                    SUM(CASE WHEN a.status = 'PRESENT' THEN 1 ELSE 0 END) as presentDays,
                    SUM(CASE WHEN a.status = 'LATE' THEN 1 ELSE 0 END) as lateDays,
                    SUM(CASE WHEN a.status = 'ABSENT' THEN 1 ELSE 0 END) as absentDays
                FROM enrollment e
                INNER JOIN studentaccount sa ON e.studentId = sa.studentId
                LEFT JOIN attendance a ON e.studentId = a.studentId 
                    AND e.subjectId = a.subjectId
                    AND a.sessionId IN (
                        SELECT sessionId 
                        FROM classsession 
                        WHERE subjectId = ? 
                        AND session_status IN ('ACTIVE', 'COMPLETED')
                    )
                WHERE e.subjectId = ?
                GROUP BY sa.studentId, sa.name, sa.email
                ORDER BY sa.name
            `, [subjectId, subjectId]);
            
            const students = (rows as any[]).map(row => {
                const presentDays = parseInt(row.presentDays) || 0;
                const lateDays = parseInt(row.lateDays) || 0;
                const absentDays = totalSessionsCount - (presentDays + lateDays);
                
                // Calculate absent equivalent: 2 late days = 1 absent day
                const absentEquivalent = Math.max(0, absentDays) + Math.floor(lateDays / 2);
                
                // Attendance rate = (Present + Late) / Total Sessions
                const attendanceRate = totalSessionsCount > 0 
                    ? Math.round(((presentDays + lateDays) / totalSessionsCount) * 100)
                    : 0;
                
                return {
                    studentId: row.studentId,
                    studentName: row.studentName,
                    email: row.email,
                    totalSessions: totalSessionsCount,
                    presentDays: presentDays,
                    lateDays: lateDays,
                    absentDays: Math.max(0, absentDays), // Ensure non-negative
                    absentEquivalent: absentEquivalent,
                    attendanceRate: attendanceRate
                };
            });
            
            console.log(`✅ Generated attendance stats for ${students.length} students in subject ${subjectId}, total sessions: ${totalSessionsCount}`);
            
            return {
                success: true,
                subjectId: subjectId,
                students: students,
                totalSessions: totalSessionsCount
            };
            
        } catch (error) {
            console.error('❌ Error getting subject attendance stats:', error);
            return {
                success: false,
                subjectId: subjectId,
                students: [],
                totalSessions: 0,
                message: 'Failed to fetch subject attendance statistics'
            };
        }
    }
}
