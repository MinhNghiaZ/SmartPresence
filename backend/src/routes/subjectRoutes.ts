// backend/src/routes/subjectRoutes.ts

import { Router } from 'express';
import { SubjectController } from '../controllers/SubjectController/subjectController';
import { authenticateToken, requireAdmin, requireAuth, requireOwnershipOrAdmin } from '../middleware/jwtMiddleware/authmiddleware';

const router = Router();

// Get all subjects for dropdown - requires authentication
router.get('/', authenticateToken, requireAuth, SubjectController.getAllSubjects);

// Get subjects enrolled by student with full schedule info - requires ownership or admin
router.get('/student/:studentId', authenticateToken, requireOwnershipOrAdmin, SubjectController.getStudentSubjects);

// Get current active timeslot for subject - requires authentication
router.get('/:subjectId/current-timeslot', authenticateToken, requireAuth, SubjectController.getCurrentTimeSlot);

// Get room info for GPS validation - requires authentication
router.get('/room/:roomId/info', authenticateToken, requireAuth, SubjectController.getRoomInfo);

// Check if student is enrolled in subject - requires ownership or admin
router.get('/student/:studentId/enrollment/:subjectId', authenticateToken, requireOwnershipOrAdmin, SubjectController.checkEnrollment);

// Get all students enrolled in a subject (for AdminScreen) - ADMIN ONLY
router.get('/:subjectId/enrolled-students', authenticateToken, requireAdmin, SubjectController.getEnrolledStudents);

export default router;