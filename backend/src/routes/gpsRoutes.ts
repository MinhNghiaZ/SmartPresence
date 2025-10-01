import { Router } from 'express';
import { GPSController } from '../controllers/GPSController/gpsController';

const router = Router();

/**
 * GPS Validation Routes
 */

// Validate location for attendance
router.post('/validate-location', GPSController.validateLocation);

// Future GPS endpoints can be added here:
// router.get('/rooms', GPSController.getAllRooms);
// router.get('/current-room/:subjectId', GPSController.getCurrentRoom);

export default router;