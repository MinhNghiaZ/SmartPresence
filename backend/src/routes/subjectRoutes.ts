// backend/src/routes/subjectRoutes.ts

import { Router } from 'express';
import { SubjectController } from '../controllers/SubjectController/subjectController';

const router = Router();

// Get all subjects for dropdown
router.get('/', SubjectController.getAllSubjects);

// Get subjects enrolled by student with full schedule info
router.get('/student/:studentId', SubjectController.getStudentSubjects);

// Get current active timeslot for subject
router.get('/:subjectId/current-timeslot', SubjectController.getCurrentTimeSlot);

// Get room info for GPS validation
router.get('/room/:roomId/info', SubjectController.getRoomInfo);

// Check if student is enrolled in subject
router.get('/student/:studentId/enrollment/:subjectId', SubjectController.checkEnrollment);

// Get all students enrolled in a subject (for AdminScreen)
router.get('/:subjectId/enrolled-students', SubjectController.getEnrolledStudents);

export default router;