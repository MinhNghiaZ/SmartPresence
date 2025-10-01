import { Request, Response } from 'express';
import { FaceRecognitionService } from '../../services/FaceService/FaceRecognitionService';
import { 
    FaceRegistrationRequest, 
    FaceRecognitionRequest,
    FACE_CONSTANTS
} from '../../models/face';

export class FaceController {
    
    /**
     * POST /api/face/register
     * Register student face descriptor
     */
    static async registerFace(req: Request, res: Response) {
        try {
            const { studentId, descriptor, imageData }: FaceRegistrationRequest = req.body;
            
            console.log('� API /register called for student:', studentId);
            console.log('�🔍 Face registration request for student:', studentId);
            
            // Validate required fields
            if (!studentId || !descriptor) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: studentId, descriptor'
                });
            }

            // Validate descriptor format
            const validation = FaceRecognitionService.validateDescriptor(descriptor);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: validation.error
                });
            }

            // Check if image size is within limits (if provided)
            if (imageData) {
                const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
                const imageSize = Buffer.from(base64Data, 'base64').length;
                
                if (imageSize > FACE_CONSTANTS.MAX_IMAGE_SIZE) {
                    return res.status(400).json({
                        success: false,
                        message: `Image too large. Maximum size: ${FACE_CONSTANTS.MAX_IMAGE_SIZE / 1024 / 1024}MB`
                    });
                }
            }

            const request: FaceRegistrationRequest = {
                studentId,
                descriptor,
                imageData
            };

            const result = await FaceRecognitionService.registerStudentFace(request);

            if (result) {
                res.json({
                    success: true,
                    message: 'Face registered successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Face registration failed. Student may already have face registered or not found.'
                });
            }

        } catch (error) {
            console.error('❌ Face registration API error:', error);
            res.status(500).json({
                success: false,
                message: 'System error during face registration'
            });
        }
    }

    /**
     * POST /api/face/recognize
     * Recognize face from descriptor
     */
    static async recognizeFace(req: Request, res: Response) {
        try {
            const { descriptor, imageData, subjectId, timeSlotId, studentId }: FaceRecognitionRequest = req.body;
            
            console.log(`🔍 Face recognition request received for student: ${studentId}`);
            
            // Validate required fields
            if (!descriptor || !studentId) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required fields: descriptor, studentId'
                });
            }

            // Validate descriptor format
            const validation = FaceRecognitionService.validateDescriptor(descriptor);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: validation.error
                });
            }

            const request: FaceRecognitionRequest = {
                descriptor,
                imageData,
                subjectId,
                timeSlotId,
                studentId
            };

            const result = await FaceRecognitionService.recognizeFace(request);
            
            res.json(result);

        } catch (error) {
            console.error('❌ Face recognition API error:', error);
            res.status(500).json({
                success: false,
                isMatch: false,
                confidence: 0,
                message: 'System error during face recognition'
            });
        }
    }

    /**
     * GET /api/face/check/:studentId
     * Check if student has registered face
     */
    static async checkRegistration(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            console.log(`🚀 API /check/${studentId} called`);
            
            if (!studentId) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing studentId parameter'
                });
            }
            
            const faceInfo = await FaceRecognitionService.getStudentFaceInfo(studentId);
            console.log(`📡 API returning faceInfo:`, faceInfo);
            
            res.json({
                success: true,
                ...faceInfo
            });

        } catch (error) {
            console.error('❌ Check registration API error:', error);
            res.status(500).json({
                success: false,
                message: 'System error checking registration'
            });
        }
    }

    /**
     * DELETE /api/face/:studentId
     * Admin-only: Reset student face registration  
     */
    static async adminResetFace(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            const { adminId } = req.body;
            
            if (!studentId || !adminId) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required parameters: studentId, adminId'
                });
            }

            // TODO: Add admin authentication check here
            // For now, just validate adminId format
            if (typeof adminId !== 'string' || adminId.length < 3) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid adminId format'
                });
            }
            
            const result = await FaceRecognitionService.adminResetStudentFace(studentId, adminId);
            
            if (result) {
                res.json({
                    success: true,
                    message: 'Student face registration reset successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    message: 'Failed to reset face registration. Student may not exist.'
                });
            }

        } catch (error) {
            console.error('❌ Admin reset face API error:', error);
            res.status(500).json({
                success: false,
                message: 'System error resetting face registration'
            });
        }
    }

    /**
     * GET /api/face/stats
     * Admin-only: Get face registration statistics
     */
    static async getFaceStats(req: Request, res: Response) {
        try {
            // TODO: Add admin authentication check here
            
            const totalRegistered = await FaceRecognitionService.getRegisteredFaceCount();
            
            res.json({
                success: true,
                stats: {
                    totalRegisteredFaces: totalRegistered,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error) {
            console.error('❌ Face stats API error:', error);
            res.status(500).json({
                success: false,
                message: 'System error getting face statistics'
            });
        }
    }

    /**
     * POST /api/face/validate
     * Validate descriptor format (utility endpoint)
     */
    static async validateDescriptor(req: Request, res: Response) {
        try {
            const { descriptor } = req.body;
            
            const validation = FaceRecognitionService.validateDescriptor(descriptor);
            
            res.json({
                success: true,
                validation
            });

        } catch (error) {
            console.error('❌ Descriptor validation API error:', error);
            res.status(500).json({
                success: false,
                message: 'System error validating descriptor'
            });
        }
    }
}