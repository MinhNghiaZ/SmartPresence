import { Router } from 'express';
import { StorageController } from '../controllers/StorageController/storageController';

const router = Router();

/**
 * Storage API Routes - Captured Images Management
 */

// Get statistics first (before :imageId route)
router.get('/captured-images/stats', StorageController.getCapturedImagesStats);

// Get images by date range
router.get('/captured-images/date-range', StorageController.getCapturedImagesByDateRange);

// Get images for specific student
router.get('/captured-images/student/:studentId', StorageController.getStudentCapturedImages);

// Get all captured images
router.get('/captured-images', StorageController.getAllCapturedImages);

// Get single captured image by ID
router.get('/captured-images/:imageId', StorageController.getCapturedImageById);

// Delete specific captured image
router.delete('/captured-images/:imageId', StorageController.deleteCapturedImage);

// Delete all captured images (admin only)
router.delete('/captured-images', StorageController.deleteAllCapturedImages);

// Clean up old images (admin only)
router.post('/cleanup', StorageController.cleanupOldImages);

export default router;