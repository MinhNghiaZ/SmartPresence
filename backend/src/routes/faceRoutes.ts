import { Router } from 'express';
import { FaceController } from '../controllers/FaceController/faceController';
import { authenticateToken, requireAdmin } from '../middleware/jwtMiddleware/authmiddleware';

const router = Router();

/**
 * Face Recognition API Routes
 */

// Register student face
router.post('/register', FaceController.registerFace);

// Recognize face
router.post('/recognize', FaceController.recognizeFace);

// Check if student has registered face
router.get('/check/:studentId', FaceController.checkRegistration);

// Admin: Reset student face registration 
router.delete('/:studentId', authenticateToken, requireAdmin, FaceController.adminResetFace);

// Admin: Delete student face embedding (alternative endpoint)
router.delete('/delete-embedding/:studentId', authenticateToken, requireAdmin, FaceController.adminResetFace);

// Admin: Get face registration statistics
router.get('/stats', authenticateToken, requireAdmin, FaceController.getFaceStats);

// Utility: Validate descriptor format
router.post('/validate', FaceController.validateDescriptor);

export default router;