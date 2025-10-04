// backend/src/routes/AttendenceRoutes.ts

import { Router } from 'express';
import { AttendanceController } from '../controllers/AttendenceController/AttendenceController';

const router = Router();

/**
 * @route POST /api/attendance/check-in
 * @desc Process student check-in with GPS and face recognition
 * @access Public
 */
router.post('/check-in', AttendanceController.checkIn);

/**
 * @route GET /api/attendance/history/:studentId
 * @desc Get attendance history for student
 * @query subjectId (optional) - filter by subject
 * @query page (optional) - page number (default: 1)
 * @query limit (optional) - items per page (default: 20, max: 100)
 * @access Public
 */
router.get('/history/:studentId', AttendanceController.getAttendanceHistory);

/**
 * @route GET /api/attendance/stats/:studentId
 * @desc Get attendance statistics for student
 * @query subjectId (optional) - filter by subject
 * @access Public
 */
router.get('/stats/:studentId', AttendanceController.getAttendanceStats);

/**
 * @route GET /api/attendance/today/:studentId
 * @desc Get today's attendance for student (all subjects)
 * @access Public
 */
router.get('/today/:studentId', AttendanceController.getTodayAttendance);

/**
 * @route GET /api/attendance/subject/:subjectId/session-status
 * @desc Check if there's an active session for subject
 * @access Public
 */
router.get('/subject/:subjectId/session-status', AttendanceController.getSessionStatus);

/**
 * @route DELETE /api/attendance/:attendanceId
 * @desc Cancel/delete attendance record (admin only)
 * @body reason (optional) - reason for cancellation
 * @access Admin
 */
router.delete('/:attendanceId', AttendanceController.cancelAttendance);

// ===============================================
// CLASS SESSION ROUTES
// ===============================================

/**
 * @route GET /api/attendance/session/current/:subjectId
 * @desc Get current active session for a subject
 * @access Public
 */
router.get('/session/current/:subjectId', AttendanceController.getCurrentSession);

/**
 * @route GET /api/attendance/session/:sessionId/absent
 * @desc Get absent students for specific session
 * @access Admin
 */
router.get('/session/:sessionId/absent', AttendanceController.getAbsentStudents);

/**
 * @route POST /api/attendance/session/generate
 * @desc Generate class sessions for date (admin only)
 * @body date (optional) - YYYY-MM-DD format, default today
 * @access Admin
 */
router.post('/session/generate', AttendanceController.generateSessions);

/**
 * @route POST /api/attendance/sessions/generate-today
 * @desc Generate class sessions for today specifically
 * @access Public (for debugging)
 */
router.post('/sessions/generate-today', AttendanceController.generateTodaySessions);

/**
 * @route GET /api/attendance/sessions/current
 * @desc Get current sessions for today
 * @access Public
 */
router.get('/sessions/current', AttendanceController.getCurrentSessions);

/**
 * @route GET /api/attendance/records/today
 * @desc Get all attendance records for today with image info
 * @access Public
 */
router.get('/records/today', AttendanceController.getTodayAttendanceRecords);

/**
 * @route GET /api/attendance/dashboard/:date
 * @desc Get daily attendance dashboard for admin
 * @param date - YYYY-MM-DD format
 * @access Admin
 */
router.get('/dashboard/:date', AttendanceController.getDailyDashboard);

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

/**
 * @route DELETE /api/attendance/debug/clear
 * @desc Clear test data from tables
 * @access Debug
 */
router.delete('/debug/clear', AttendanceController.clearTestData);

export default router;