import express from 'express';
import { MonitoringController } from '../controllers/MonitoringController/MonitoringController';
import { authenticateToken, requireAdmin } from '../middleware/jwtMiddleware/authmiddleware';

const router = express.Router();

/**
 * Monitoring Routes - Admin only
 * Giúp phát hiện và fix lỗi để đạt >90% success rate
 */

// Get today's success rate stats
router.get(
    '/today-stats',
    authenticateToken,
    requireAdmin,
    MonitoringController.getTodayStats
);

// Get students with low success rate (need support)
router.get(
    '/problematic-students',
    authenticateToken,
    requireAdmin,
    MonitoringController.getProblematicStudents
);

// Get hourly failure pattern
router.get(
    '/hourly-pattern',
    authenticateToken,
    requireAdmin,
    MonitoringController.getHourlyPattern
);

// Manual trigger success rate check
router.post(
    '/trigger-check',
    authenticateToken,
    requireAdmin,
    MonitoringController.triggerCheck
);

export default router;
