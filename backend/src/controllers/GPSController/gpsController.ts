import { Request, Response } from "express";
import { GPSService } from "../../services/GpsService/gpsService";
import { LocationValidationRequest } from "../../models/gps";

export class GPSController {
    static async validateLocation(req: Request, res: Response) {
        try {
            const { latitude, longitude, subjectId } = req.body;
            if (!latitude || !longitude || !subjectId) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: latitude, longitude, subjectId'
                });
            }

            const lat = parseFloat(latitude);
            const long = parseFloat(longitude);

            if (lat < -90 || lat > 90 || long < -180 || long > 180) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid GPS coordinates!'
                });
            }

            const validationRequest: LocationValidationRequest = {
                latitude: lat,
                longitude: long,
                subjectId: subjectId
            }

            const result = await GPSService.validateLocation(validationRequest);

            return res.json({
                success: true,
                message: 'validate completed',
                validation: result
            })

        } catch (error) {
            console.error('location validation error: ',error);
            return res.status(500).json({
                success: false,
                message: 'System error during location validation'
            })
        }
    }
}