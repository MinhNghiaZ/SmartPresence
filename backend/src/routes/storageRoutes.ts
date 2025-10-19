import { Router } from 'express';
import { StorageController } from '../controllers/StorageController/storageController';
import { authenticateToken, requireAdmin, requireAuth, requireOwnershipOrAdmin } from '../middleware/jwtMiddleware/authmiddleware';

const router = Router();

/**
 * Storage API Routes - Captured Images Management
 */

// Get statistics first (before :imageId route) - Admin only
router.get('/captured-images/stats', authenticateToken, requireAdmin, StorageController.getCapturedImagesStats);

// Get images by date range - Admin only
router.get('/captured-images/date-range', authenticateToken, requireAdmin, StorageController.getCapturedImagesByDateRange);

// Get images for specific student - Ownership or Admin
router.get('/captured-images/student/:studentId', authenticateToken, requireOwnershipOrAdmin, StorageController.getStudentCapturedImages);

// Get all captured images - Admin only
router.get('/captured-images', authenticateToken, requireAdmin, StorageController.getAllCapturedImages);

// Get single captured image by ID - requires authentication (will need to check ownership in controller)
router.get('/captured-images/:imageId', authenticateToken, requireAuth, StorageController.getCapturedImageById);

// Delete specific captured image - Admin only
router.delete('/captured-images/:imageId', authenticateToken, requireAdmin, StorageController.deleteCapturedImage);

// Delete all captured images (admin only)
router.delete('/captured-images', authenticateToken, requireAdmin, StorageController.deleteAllCapturedImages);

// Clean up old images (admin only)
router.post('/cleanup', authenticateToken, requireAdmin, StorageController.cleanupOldImages);

export default router;