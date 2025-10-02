import { Router } from 'express';
import { AuthController } from '../controllers/authController/authController';
import { authenticateToken, requireAdmin, requireStudent } from '../middleware/jwtMiddleware/authmiddleware';

const router = Router();

/**
 * Authentication Routes
 */

// Public routes
router.post('/login', AuthController.login);
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