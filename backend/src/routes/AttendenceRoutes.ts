// backend/src/routes/AttendenceRoutes.ts

import { Router } from 'express';
import { AttendanceController } from '../controllers/AttendenceController/AttendenceController';
import { authenticateToken, requireAdmin, requireAuth, requireOwnershipOrAdmin } from '../middleware/jwtMiddleware/authmiddleware';

const router = Router();

/**
 * @route POST /api/attendance/check-in
 * @desc Process student check-in with GPS and face recognition
 * @access Authenticated users only
 */
router.post('/check-in', authenticateToken, requireAuth, AttendanceController.checkIn);

/**
 * @route GET /api/attendance/history/:studentId
 * @desc Get attendance history for student
 * @query subjectId (optional) - filter by subject
 * @query page (optional) - page number (default: 1)
 * @query limit (optional) - items per page (default: 20, max: 100)
 * @access Student (own data) or Admin
 */
router.get('/history/:studentId', authenticateToken, requireOwnershipOrAdmin, AttendanceController.getAttendanceHistory);

/**
 * @route GET /api/attendance/stats/:studentId
 * @desc Get attendance statistics for student
 * @query subjectId (optional) - filter by subject
 * @access Student (own data) or Admin
 */
router.get('/stats/:studentId', authenticateToken, requireOwnershipOrAdmin, AttendanceController.getAttendanceStats);

/**
 * @route GET /api/attendance/today/:studentId
 * @desc Get today's attendance for student (all subjects)
 * @access Student (own data) or Admin
 */
router.get('/today/:studentId', authenticateToken, requireOwnershipOrAdmin, AttendanceController.getTodayAttendance);

/**
 * @route GET /api/attendance/subject/:subjectId/session-status
 * @desc Check if there's an active session for subject
 * @access Authenticated users only
 */
router.get('/subject/:subjectId/session-status', authenticateToken, requireAuth, AttendanceController.getSessionStatus);

/**
 * @route DELETE /api/attendance/:attendanceId
 * @desc Cancel/delete attendance record (admin only)
 * @body reason (optional) - reason for cancellation
 * @access Admin
 */
router.delete('/:attendanceId', authenticateToken, requireAdmin, AttendanceController.cancelAttendance);

// ===============================================
// CLASS SESSION ROUTES
// ===============================================

/**
 * @route GET /api/attendance/session/current/:subjectId
 * @desc Get current active session for a subject
 * @access Authenticated users only
 */
router.get('/session/current/:subjectId', authenticateToken, requireAuth, AttendanceController.getCurrentSession);

/**
 * @route GET /api/attendance/session/:sessionId/absent
 * @desc Get absent students for specific session
 * @access Admin
 */
router.get('/session/:sessionId/absent', authenticateToken, requireAdmin, AttendanceController.getAbsentStudents);

/**
 * @route POST /api/attendance/session/generate
 * @desc Generate class sessions for date (admin only)
 * @body date (optional) - YYYY-MM-DD format, default today
 * @access Admin
 */
router.post('/session/generate', authenticateToken, requireAdmin, AttendanceController.generateSessions);

/**
 * @route POST /api/attendance/sessions/generate-today
 * @desc Generate class sessions for today specifically
 * @access Admin only
 */
router.post('/sessions/generate-today', authenticateToken, requireAdmin, AttendanceController.generateTodaySessions);

/**
 * @route GET /api/attendance/sessions/current
 * @desc Get current sessions for today
 * @access Authenticated users only
 */
router.get('/sessions/current', authenticateToken, requireAuth, AttendanceController.getCurrentSessions);

/**
 * @route GET /api/attendance/records/today
 * @desc Get all attendance records for today with image info
 * @access Admin only
 */
router.get('/records/today', authenticateToken, requireAdmin, AttendanceController.getTodayAttendanceRecords);

/**
 * @route GET /api/attendance/records/:date
 * @desc Get all attendance records for specific date with image info
 * @param date - Date in YYYY-MM-DD format
 * @access Public
 */
router.get('/records/:date', AttendanceController.getAttendanceRecordsByDate);

/**
 * @route GET /api/attendance/dashboard/:date
 * @desc Get daily attendance dashboard for admin
 * @param date - YYYY-MM-DD format
 * @access Admin
 */
router.get('/dashboard/:date', authenticateToken, requireAdmin, AttendanceController.getDailyDashboard);

// ===============================================
// DEBUG ROUTES
// ===============================================

/**
 * @route GET /api/attendance/debug/schema
 * @desc Check database schema for debugging
 * @access Debug
 */
router.get('/debug/schema', AttendanceController.debugSchema);

/**
 * @route GET /api/attendance/debug/images
 * @desc Check captured_images table data
 * @access Debug
 */
router.get('/debug/images', AttendanceController.debugImages);

/**
 * @route GET /api/attendance/debug/history/:studentId
 * @desc Debug attendance history query
 * @access Debug
 */
router.get('/debug/history/:studentId', AttendanceController.debugHistory);

/**
 * @route GET /api/attendance/simple-history/:studentId
 * @desc Get simple attendance history
 * @access Public
 */
router.get('/simple-history/:studentId', AttendanceController.getSimpleHistory);

// ===============================================
// ADMIN ROUTES
// ===============================================

/**
 * @route PUT /api/attendance/admin/update-status
 * @desc Admin update attendance status
 * @access Admin
 */
router.put('/admin/update-status', AttendanceController.adminUpdateStatus);

/**
 * @route POST /api/attendance/admin/create-record
 * @desc Admin create new attendance record (Absent → Present/Late)
 * @access Admin
 */
router.post('/admin/create-record', AttendanceController.adminCreateRecord);

/**
 * @route GET /api/attendance/:attendanceId/confidence
 * @desc Get confidence score from captured_images
 * @access Public
 */
router.get('/:attendanceId/confidence', AttendanceController.getAttendanceConfidence);

/**
 * @route GET /api/attendance/session-dates/:subjectId
 * @desc Get all session dates for a subject (for navigation)
 * @access Public
 */
router.get('/session-dates/:subjectId', AttendanceController.getSessionDates);

/**
 * @route GET /api/attendance/subject/:subjectId/students-stats
 * @desc Get attendance statistics for all students in a subject
 * @access Public
 */
router.get('/subject/:subjectId/students-stats', authenticateToken, requireAdmin, AttendanceController.getSubjectAttendanceStats);

/**
 * @route GET /api/attendance/history-with-images
 * @desc Get attendance history with captured images for admin (DemoHistory)
 * @query limit - Number of records to return (default: 100, max: 500)
 * @access Public
 */
router.get('/history-with-images', AttendanceController.getAttendanceHistoryWithImages);

export default router;