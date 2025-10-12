import { Router } from 'express';
import { AuthController } from '../controllers/authController/authController';
import { authenticateToken, requireAdmin, requireStudent } from '../middleware/jwtMiddleware/authmiddleware';
import { loginRateLimitMiddleware, getRateLimiterStats } from '../middleware/loginRateLimiter';
import { getPoolStats, checkPoolHealth } from '../utils/dbMonitor';

const router = Router();

/**
 * Authentication Routes
 */

// Public routes
// Apply rate limiting to login endpoint (10 attempts per minute per user)
router.post('/login', loginRateLimitMiddleware, AuthController.login);
router.post('/logout', AuthController.logout);
router.post('/change-password', AuthController.changePassword);

// Protected routes
router.get('/me', authenticateToken, AuthController.me);

// Admin routes
router.get('/admin/dashboard', authenticateToken, requireAdmin, (req, res) => {
    res.json({
        success: true,
        message: 'Admin dashboard access granted',
        user: req.user,
        timestamp: new Date().toISOString()
    });
});

/**
 * @route POST /api/auth/admin/create-student
 * @desc Admin create new student account
 * @access Admin only
 */
router.post('/admin/create-student', authenticateToken, requireAdmin, AuthController.adminCreateStudent);

/**
 * @route POST /api/auth/admin/reset-password
 * @desc Admin reset student password
 * @access Admin only
 */
router.post('/admin/reset-password', authenticateToken, requireAdmin, AuthController.adminResetPassword);

/**
 * @route GET /api/auth/admin/rate-limit-stats
 * @desc Get rate limiter statistics (for monitoring)
 * @access Admin only
 */
router.get('/admin/rate-limit-stats', authenticateToken, requireAdmin, (req, res) => {
    const stats = getRateLimiterStats();
    res.json({
        success: true,
        message: 'Rate limiter statistics',
        stats: {
            ...stats,
            maxAttemptsPerMinute: 10,
            blockDurationSeconds: 30
        }
    });
});

/**
 * @route GET /api/auth/admin/db-pool-stats
 * @desc Get database connection pool statistics (for monitoring)
 * @access Admin only
 */
router.get('/admin/db-pool-stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const stats = await getPoolStats();
        res.json({
            success: true,
            message: 'Database pool statistics',
            stats: {
                ...stats,
                poolSize: 50,
                queueLimit: 200
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get pool stats'
        });
    }
});

/**
 * @route GET /api/auth/admin/db-pool-health
 * @desc Check database pool health (for monitoring)
 * @access Admin only
 */
router.get('/admin/db-pool-health', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const health = await checkPoolHealth();
        res.json({
            success: true,
            message: health.healthy ? 'Pool is healthy' : 'Pool has warnings',
            ...health
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to check pool health'
        });
    }
});

// Student routes  
router.get('/student/profile', authenticateToken, requireStudent, (req, res) => {
    res.json({
        success: true,
        message: 'Student profile access granted',
        user: req.user,
        timestamp: new Date().toISOString()
    });
});

export default router;