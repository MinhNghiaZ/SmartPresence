// backend/src/controllers/AttendanceController/attendanceController.ts

import { Request, Response } from 'express';
import { AttendanceService } from '../../services/AttendenceService/AttendenceService';
import { ClassSessionService } from '../../services/ClassSessionService/ClassSessionService';
import db from '../../database/connection';

export class AttendanceController {
    
    /**
     * POST /api/attendance/check-in
     * Process student check-in
     */
    static async checkIn(req: Request, res: Response) {
        try {
            const { studentId, subjectId, location, faceDescriptor, imageData, confidence } = req.body;
            
            console.log('🚀 AttendanceController.checkIn called:', {
                studentId,
                subjectId,
                hasLocation: !!location,
                hasFaceData: !!faceDescriptor,
                confidence: confidence
            });
            
            // ✅ Validation
            if (!studentId || !subjectId || !location) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: studentId, subjectId, location'
                });
            }
            
            if (!location.latitude || !location.longitude) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid location data'
                });
            }
            
            // ✅ Process check-in
            const result = await AttendanceService.checkIn({
                studentId,
                subjectId,
                location: {
                    latitude: parseFloat(location.latitude),
                    longitude: parseFloat(location.longitude)
                },
                faceDescriptor,
                imageData,
                confidence: confidence // ✅ Pass confidence to service
            });
            
            // ✅ Return appropriate status code
            const statusCode = result.success ? 200 : 400;
            
            return res.status(statusCode).json(result);
            
        } catch (error) {
            console.error('❌ AttendanceController.checkIn error:', error);
            return res.status(500).json({
                success: false,
                message: 'Check-in system error',
                timestamp: new Date()
            });
        }
    }
    
    /**
     * GET /api/attendance/history/:studentId
     * Get attendance history for student
     */
    static async getAttendanceHistory(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            const { subjectId, page = '1', limit = '20' } = req.query;
            
            console.log(`🚀 AttendanceController.getAttendanceHistory called for: ${studentId}`);
            
            // ✅ Validation
            if (!studentId) {
                return res.status(400).json({
                    success: false,
                    message: 'Student ID is required'
                });
            }
            
            // ✅ Parse pagination
            const pageNum = parseInt(page as string) || 1;
            const limitNum = parseInt(limit as string) || 20;
            
            if (pageNum < 1 || limitNum < 1 || limitNum > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid pagination parameters'
                });
            }
            
            // ✅ Get attendance history
            const result = await AttendanceService.getAttendanceHistory(
                studentId,
                subjectId as string,
                pageNum,
                limitNum
            );
            
            return res.json(result);
            
        } catch (error) {
            console.error('❌ AttendanceController.getAttendanceHistory error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch attendance history'
            });
        }
    }
    
    /**
     * GET /api/attendance/stats/:studentId
     * Get attendance statistics for student
     */
    static async getAttendanceStats(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            const { subjectId } = req.query;
            
            console.log(`🚀 AttendanceController.getAttendanceStats called for: ${studentId}`);
            
            // ✅ Validation
            if (!studentId) {
                return res.status(400).json({
                    success: false,
                    message: 'Student ID is required'
                });
            }
            
            // ✅ Get attendance statistics
            const result = await AttendanceService.getAttendanceStats(
                studentId,
                subjectId as string
            );
            
            return res.json(result);
            
        } catch (error) {
            console.error('❌ AttendanceController.getAttendanceStats error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch attendance statistics'
            });
        }
    }
    
    /**
     * GET /api/attendance/today/:studentId
     * Get today's attendance for student (all subjects)
     */
    static async getTodayAttendance(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            
            console.log(`🚀 AttendanceController.getTodayAttendance called for: ${studentId}`);
            
            // ✅ Validation
            if (!studentId) {
                return res.status(400).json({
                    success: false,
                    message: 'Student ID is required'
                });
            }
            
            // ✅ Get today's attendance (implement in service)
            const result = await AttendanceService.getTodayAttendance(studentId);
            
            return res.json(result);
            
        } catch (error) {
            console.error('❌ AttendanceController.getTodayAttendance error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch today attendance'
            });
        }
    }
    
    /**
     * GET /api/attendance/subject/:subjectId/session-status
     * Check if there's an active session for subject
     */
    static async getSessionStatus(req: Request, res: Response) {
        try {
            const { subjectId } = req.params;
            
            console.log(`🚀 AttendanceController.getSessionStatus called for: ${subjectId}`);
            
            // ✅ Validation
            if (!subjectId) {
                return res.status(400).json({
                    success: false,
                    message: 'Subject ID is required'
                });
            }
            
            // ✅ Get session status (implement in service)
            const result = await AttendanceService.getSessionStatus(subjectId);
            
            return res.json(result);
            
        } catch (error) {
            console.error('❌ AttendanceController.getSessionStatus error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch session status'
            });
        }
    }
    
    /**
     * DELETE /api/attendance/:attendanceId
     * Cancel/delete attendance record (admin only)
     */
    static async cancelAttendance(req: Request, res: Response) {
        try {
            const { attendanceId } = req.params;
            const { reason } = req.body;
            
            console.log(`🚀 AttendanceController.cancelAttendance called for: ${attendanceId}`);
            
            // ✅ Validation
            if (!attendanceId) {
                return res.status(400).json({
                    success: false,
                    message: 'Attendance ID is required'
                });
            }
            
            // TODO: Add admin authorization check here
            
            // ✅ Cancel attendance (implement in service)
            const result = await AttendanceService.cancelAttendance(attendanceId, reason);
            
            return res.json(result);
            
        } catch (error) {
            console.error('❌ AttendanceController.cancelAttendance error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to cancel attendance'
            });
        }
    }

    // ======================================
    // CLASS SESSION ENDPOINTS
    // ======================================

    /**
     * GET /api/attendance/session/current/:subjectId
     * Get current active session for a subject
     */
    static async getCurrentSession(req: Request, res: Response) {
        try {
            const { subjectId } = req.params;
            
            console.log(`🚀 AttendanceController.getCurrentSession called for: ${subjectId}`);
            
            if (!subjectId) {
                return res.status(400).json({
                    success: false,
                    message: 'Subject ID is required'
                });
            }
            
            const result = await ClassSessionService.getCurrentActiveSession(subjectId);
            
            return res.json(result);
            
        } catch (error) {
            console.error('❌ AttendanceController.getCurrentSession error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get current session'
            });
        }
    }

    /**
     * POST /api/attendance/complete-expired-sessions (Admin/Test only)
     * Manually trigger completion of expired sessions
     */
    static async completeExpiredSessions(req: Request, res: Response) {
        try {
            console.log('🧪 Manual trigger: completeExpiredSessions');
            await ClassSessionService.completeExpiredSessions();
            
            return res.json({
                success: true,
                message: 'Expired sessions completed successfully'
            });
            
        } catch (error) {
            console.error('❌ AttendanceController.completeExpiredSessions error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to complete expired sessions'
            });
        }
    }

    /**
     * GET /api/attendance/session/:sessionId/absent
     * Get absent students for a specific session
     */
    static async getAbsentStudents(req: Request, res: Response) {
        try {
            const { sessionId } = req.params;
            
            console.log(`🚀 AttendanceController.getAbsentStudents called for: ${sessionId}`);
            
            if (!sessionId) {
                return res.status(400).json({
                    success: false,
                    message: 'Session ID is required'
                });
            }
            
            const result = await ClassSessionService.getAbsentStudentsForSession(sessionId);
            
            return res.json(result);
            
        } catch (error) {
            console.error('❌ AttendanceController.getAbsentStudents error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get absent students'
            });
        }
    }

    /**
     * POST /api/attendance/session/generate
     * Generate sessions for a specific date (admin only)
     */
    static async generateSessions(req: Request, res: Response) {
        try {
            const { date } = req.body;
            
            console.log(`🚀 AttendanceController.generateSessions called for: ${date || 'today'}`);
            
            await ClassSessionService.generateSessionsForDate(date);
            
            return res.json({
                success: true,
                message: `Sessions generated successfully for ${date || 'today'}`
            });
            
        } catch (error) {
            console.error('❌ AttendanceController.generateSessions error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to generate sessions'
            });
        }
    }

    /**
     * GET /api/attendance/dashboard/:date
     * Get daily attendance dashboard for admin
     */
    static async getDailyDashboard(req: Request, res: Response) {
        try {
            const { date } = req.params;
            
            console.log(`🚀 AttendanceController.getDailyDashboard called for: ${date}`);
            
            if (!date) {
                return res.status(400).json({
                    success: false,
                    message: 'Date is required (YYYY-MM-DD format)'
                });
            }
            
            const result = await ClassSessionService.getDailyAttendanceDashboard(date);
            
            return res.json(result);
            
        } catch (error) {
            console.error('❌ AttendanceController.getDailyDashboard error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get daily dashboard'
            });
        }
    }

    /**
     * POST /api/attendance/sessions/generate
     * Generate ClassSession records for today based on TimeSlot
     */
    static async generateTodaySessions(req: Request, res: Response) {
        try {
            console.log('🚀 AttendanceController.generateTodaySessions called');

            const result = await ClassSessionService.generateTodaySessions();
            
            return res.json(result);
            
        } catch (error) {
            console.error('❌ AttendanceController.generateTodaySessions error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to generate today sessions'
            });
        }
    }

    /**
     * GET /api/attendance/sessions/current
     * Get current active sessions for today
     */
    static async getCurrentSessions(req: Request, res: Response) {
        try {
            console.log('🚀 AttendanceController.getCurrentSessions called');

            const result = await ClassSessionService.getCurrentSessions();
            
            return res.json(result);
            
        } catch (error) {
            console.error('❌ AttendanceController.getCurrentSessions error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get current sessions'
            });
        }
    }

    /**
     * GET /api/attendance/records/today
     * Get all attendance records for today with image info
     */
    static async getTodayAttendanceRecords(req: Request, res: Response) {
        try {
            console.log('🚀 AttendanceController.getTodayAttendanceRecords called');

            const today = new Date().toISOString().split('T')[0];
            
            const [records] = await db.execute(`
                SELECT 
                    a.AttendanceId,
                    a.studentId,
                    sa.name as studentName,
                    a.subjectId,
                    a.status,
                    a.checked_in_at,
                    a.imageId,
                    CASE 
                        WHEN ci.imageId IS NOT NULL THEN true 
                        ELSE false 
                    END as hasImage,
                    ci.attendanceId as linkedAttendanceId
                FROM Attendance a
                INNER JOIN StudentAccount sa ON a.studentId = sa.studentId
                LEFT JOIN captured_images ci ON a.imageId = ci.imageId
                WHERE DATE(a.checked_in_at) = ?
                ORDER BY a.checked_in_at DESC
            `, [today]);
            
            return res.json({
                success: true,
                message: `Found ${(records as any[]).length} attendance records for ${today}`,
                records: records,
                date: today
            });
            
        } catch (error) {
            console.error('❌ AttendanceController.getTodayAttendanceRecords error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get attendance records'
            });
        }
    }

    /**
     * GET /api/attendance/debug/schema
     * Debug database schema for captured_images table
     */
    static async debugSchema(req: Request, res: Response) {
        try {
            console.log('🔍 Checking captured_images table schema...');
            
            // Check table structure
            const [schema] = await db.execute(`DESCRIBE captured_images`);
            
            // Check if table has any data
            const [count] = await db.execute(`SELECT COUNT(*) as count FROM captured_images`);
            
            // Check attendance table structure
            const [attendanceSchema] = await db.execute(`DESCRIBE Attendance`);
            
            return res.json({
                success: true,
                capturedImagesSchema: schema,
                capturedImagesCount: (count as any[])[0].count,
                attendanceSchema: attendanceSchema
            });
            
        } catch (error) {
            console.error('❌ AttendanceController.debugSchema error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to debug schema',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * GET /api/attendance/debug/images
     * Debug captured_images table data
     */
    static async debugImages(req: Request, res: Response) {
        try {
            console.log('🔍 Checking captured_images table data...');
            
            const [images] = await db.execute(`
                SELECT 
                    imageId, 
                    studentId, 
                    attendanceId, 
                    confidence, 
                    recognition_result, 
                    subjectId, 
                    captured_at,
                    CHAR_LENGTH(imageData) as imageSizeBytes
                FROM captured_images 
                ORDER BY captured_at DESC 
                LIMIT 5
            `);
            
            return res.json({
                success: true,
                images: images
            });
            
        } catch (error) {
            console.error('❌ AttendanceController.debugImages error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to debug images',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * GET /api/attendance/debug/history/:studentId
     * Debug attendance history query
     */
    static async debugHistory(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            console.log('🔍 Debugging attendance history for:', studentId);
            
            // Simple query without complex JOINs first
            const [simpleRecords] = await db.execute(`
                SELECT * FROM Attendance WHERE studentId = ? ORDER BY checked_in_at DESC LIMIT 5
            `, [studentId]);
            
            return res.json({
                success: true,
                debug: {
                    simpleRecords: simpleRecords
                }
            });
            
        } catch (error) {
            console.error('❌ AttendanceController.debugHistory error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to debug history',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * GET /api/attendance/simple-history/:studentId
     * Simple attendance history without complex JOINs
     */
    static async getSimpleHistory(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            const limit = parseInt(req.query.limit as string) || 10;
            
            console.log('🔍 Getting simple attendance history for:', studentId);
            
            const [records] = await db.execute(`
                SELECT 
                    AttendanceId,
                    studentId,
                    subjectId,
                    sessionId,
                    checked_in_at,
                    status,
                    imageId
                FROM Attendance 
                WHERE studentId = ? 
                ORDER BY checked_in_at DESC 
                LIMIT 10
            `, [studentId]);
            
            return res.json({
                success: true,
                studentId: studentId,
                count: (records as any[]).length,
                records: records
            });
            
        } catch (error) {
            console.error('❌ AttendanceController.getSimpleHistory error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get simple history',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * DELETE /api/attendance/debug/clear
     * Clear test data from attendance and captured_images tables
     */
    static async clearTestData(req: Request, res: Response) {
        try {
            console.log('🧹 Clearing test data...');
            
            // Delete in correct order (foreign key constraints)
            await db.execute(`DELETE FROM captured_images`);
            await db.execute(`DELETE FROM Attendance`);
            
            return res.json({
                success: true,
                message: 'Test data cleared successfully'
            });
            
        } catch (error) {
            console.error('❌ AttendanceController.clearTestData error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to clear test data',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * PUT /api/attendance/admin/update-status
     * Admin update attendance status
     */
    static async adminUpdateStatus(req: Request, res: Response) {
        try {
            const { attendanceId, newStatus, adminId } = req.body;
            
            console.log('🚀 AttendanceController.adminUpdateStatus called:', {
                attendanceId, newStatus, adminId
            });
            
            // Validation
            if (!attendanceId || !newStatus || !adminId) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: attendanceId, newStatus, adminId'
                });
            }
            
            const validStatuses = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'];
            if (!validStatuses.includes(newStatus)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status. Must be: PRESENT, LATE, ABSENT, or EXCUSED'
                });
            }
            
            const result = await AttendanceService.adminUpdateAttendanceStatus(
                attendanceId, 
                newStatus as 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED', 
                adminId
            );
            
            return res.json(result);
            
        } catch (error) {
            console.error('❌ AttendanceController.adminUpdateStatus error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to update attendance status'
            });
        }
    }

    /**
     * POST /api/attendance/admin/create-record
     * Admin create new attendance record (Absent → Present/Late)
     */
    static async adminCreateRecord(req: Request, res: Response) {
        try {
            const { studentId, subjectId, status, adminId } = req.body;
            
            console.log('🚀 AttendanceController.adminCreateRecord called:', {
                studentId, subjectId, status, adminId
            });
            
            // Validation
            if (!studentId || !subjectId || !status || !adminId) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: studentId, subjectId, status, adminId'
                });
            }
            
            const validStatuses = ['PRESENT', 'LATE'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid status. Must be: PRESENT or LATE'
                });
            }
            
            const result = await AttendanceService.adminCreateAttendanceRecord(
                studentId,
                subjectId,
                status as 'PRESENT' | 'LATE',
                adminId
            );
            
            return res.json(result);
            
        } catch (error) {
            console.error('❌ AttendanceController.adminCreateRecord error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create attendance record'
            });
        }
    }

    /**
     * GET /api/attendance/:attendanceId/confidence
     * Get confidence score from captured_images
     */
    static async getAttendanceConfidence(req: Request, res: Response) {
        try {
            const { attendanceId } = req.params;
            
            const confidence = await AttendanceService.getAttendanceConfidence(attendanceId);
            
            return res.json({
                success: true,
                attendanceId: attendanceId,
                confidence: confidence
            });
            
        } catch (error) {
            console.error('❌ AttendanceController.getAttendanceConfidence error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get confidence score'
            });
        }
    }

    /**
     * GET /api/attendance/session-dates/:subjectId
     * Get all session dates for a subject (for navigation)
     */
    static async getSessionDates(req: Request, res: Response) {
        try {
            const { subjectId } = req.params;
            
            console.log(`🚀 AttendanceController.getSessionDates called for: ${subjectId}`);
            
            if (!subjectId) {
                return res.status(400).json({
                    success: false,
                    message: 'Subject ID is required'
                });
            }
            
            const [dates] = await db.execute(`
                SELECT DISTINCT cs.session_date
                FROM ClassSession cs
                WHERE cs.subjectId = ?
                ORDER BY cs.session_date DESC
            `, [subjectId]);
            
            const sessionDates = (dates as any[]).map(row => {
                if (row.session_date instanceof Date) {
                    // For MySQL Date objects, format directly to local date string
                    const year = row.session_date.getFullYear();
                    const month = String(row.session_date.getMonth() + 1).padStart(2, '0');
                    const day = String(row.session_date.getDate()).padStart(2, '0');
                    return `${year}-${month}-${day}`;
                } else {
                    // For string dates, extract YYYY-MM-DD part
                    const dateStr = String(row.session_date);
                    return dateStr.split('T')[0].split(' ')[0];
                }
            });
            
            return res.json({
                success: true,
                subjectId: subjectId,
                dates: sessionDates,
                count: sessionDates.length
            });
            
        } catch (error) {
            console.error('❌ AttendanceController.getSessionDates error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get session dates'
            });
        }
    }

    /**
     * POST /api/attendance/sessions/create-test
     * Create test ClassSession for development
     */
    static async createTestSession(req: Request, res: Response) {
        try {
            const { subjectId, timeSlotId, sessionDate } = req.body;
            
            console.log(`🚀 AttendanceController.createTestSession called for: ${subjectId}, ${timeSlotId}, ${sessionDate}`);
            
            if (!subjectId || !timeSlotId || !sessionDate) {
                return res.status(400).json({
                    success: false,
                    message: 'subjectId, timeSlotId, and sessionDate are required'
                });
            }
            
            // Generate sessionId
            const sessionId = `SESSION_${sessionDate}_${timeSlotId}`;
            
            // Insert new ClassSession
            await db.execute(`
                INSERT INTO ClassSession (sessionId, subjectId, timeSlotId, session_date, session_status, created_at, started_at)
                VALUES (?, ?, ?, ?, 'ACTIVE', NOW(), CONCAT(?, ' 09:30:00'))
            `, [sessionId, subjectId, timeSlotId, sessionDate, sessionDate]);
            
            console.log(`✅ Created test session: ${sessionId}`);
            
            return res.json({
                success: true,
                sessionId: sessionId,
                message: 'Test session created successfully'
            });
            
        } catch (error) {
            console.error('❌ AttendanceController.createTestSession error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to create test session'
            });
        }
    }

    /**
     * GET /api/attendance/records/:date
     * Get attendance records for specific date
     */
    static async getAttendanceRecordsByDate(req: Request, res: Response) {
        try {
            const { date } = req.params;
            
            console.log(`🚀 AttendanceController.getAttendanceRecordsByDate called for: ${date}`);
            
            if (!date) {
                return res.status(400).json({
                    success: false,
                    message: 'Date parameter is required (YYYY-MM-DD format)'
                });
            }

            // Validate date format
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(date)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid date format. Use YYYY-MM-DD'
                });
            }
            
            const result = await AttendanceService.getAttendanceRecordsByDate(date);
            
            return res.json(result);
            
        } catch (error) {
            console.error('❌ AttendanceController.getAttendanceRecordsByDate error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get attendance records'
            });
        }
    }

    /**
     * GET /api/attendance/history-with-images
     * Get attendance history with captured images for admin
     */
    static async getAttendanceHistoryWithImages(req: Request, res: Response) {
        try {
            const { limit } = req.query;
            
            console.log(`🚀 AttendanceController.getAttendanceHistoryWithImages called with limit: ${limit}`);
            
            const limitNum = limit ? parseInt(limit as string, 10) : 100;
            
            if (isNaN(limitNum) || limitNum < 1 || limitNum > 500) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid limit parameter (1-500)'
                });
            }
            
            const result = await AttendanceService.getAttendanceHistoryWithImages(limitNum);
            
            return res.json(result);
            
        } catch (error) {
            console.error('❌ AttendanceController.getAttendanceHistoryWithImages error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to get attendance history with images'
            });
        }
    }
}