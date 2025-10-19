import { Router } from 'express';
import { GPSController } from '../controllers/GPSController/gpsController';
import { authenticateToken, requireAuth } from '../middleware/jwtMiddleware/authmiddleware';

const router = Router();

/**
 * GPS Validation Routes
 */

// Validate location for attendance - requires authentication
router.post('/validate-location', authenticateToken, requireAuth, GPSController.validateLocation);

// Future GPS endpoints can be added here:
// router.get('/rooms', GPSController.getAllRooms);
// router.get('/current-room/:subjectId', GPSController.getCurrentRoom);

export default router;