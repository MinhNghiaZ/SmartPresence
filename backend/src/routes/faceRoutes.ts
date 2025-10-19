import { Router } from 'express';
import { FaceController } from '../controllers/FaceController/faceController';
import { authenticateToken, requireAdmin, requireAuth, requireOwnershipOrAdmin } from '../middleware/jwtMiddleware/authmiddleware';

const router = Router();

/**
 * Face Recognition API Routes
 */

// Register student face - requires authentication
router.post('/register', authenticateToken, requireAuth, FaceController.registerFace);

// Recognize face - requires authentication
router.post('/recognize', authenticateToken, requireAuth, FaceController.recognizeFace);

// Check if student has registered face - requires ownership or admin
router.get('/check/:studentId', authenticateToken, requireOwnershipOrAdmin, FaceController.checkRegistration);

// Admin: Reset student face registration 
router.delete('/:studentId', authenticateToken, requireAdmin, FaceController.adminResetFace);

// Admin: Delete student face embedding (alternative endpoint)
router.delete('/delete-embedding/:studentId', authenticateToken, requireAdmin, FaceController.adminResetFace);

// Admin: Get face registration statistics
router.get('/stats', authenticateToken, requireAdmin, FaceController.getFaceStats);

// Utility: Validate descriptor format - requires authentication
router.post('/validate', authenticateToken, requireAuth, FaceController.validateDescriptor);

export default router;