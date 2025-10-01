import { Request, Response } from 'express';
import { StorageService } from '../../services/StorageService/StorageService';

export class StorageController {
    
    /**
     * GET /api/storage/captured-images
     * Get all captured images
     */
    static async getAllCapturedImages(req: Request, res: Response) {
        try {
            console.log('🚀 StorageController.getAllCapturedImages called');
            
            const limit = parseInt(req.query.limit as string) || 100;
            console.log(`📊 Fetching captured images with limit: ${limit}`);
            
            const images = await StorageService.getAllCapturedImages(limit);
            console.log(`📊 Found ${images.length} images from database`);
            
            res.json({
                success: true,
                count: images.length,
                images: images
            });
            
            console.log('✅ StorageController response sent successfully');
            return;
            
        } catch (error) {
            console.error('❌ Get all captured images error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching captured images'
            });
        }
    }

    /**
     * GET /api/storage/captured-images/student/:studentId
     * Get captured images for specific student
     */
    static async getStudentCapturedImages(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            
            const images = await StorageService.getStudentCapturedImages(studentId);
            
            return res.json({
                success: true,
                studentId,
                count: images.length,
                images: images
            });
            
        } catch (error) {
            console.error('❌ Get student captured images error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching student images'
            });
        }
    }

    /**
     * GET /api/storage/captured-images/:imageId
     * Get single captured image
     */
    static async getCapturedImageById(req: Request, res: Response) {
        try {
            const { imageId } = req.params;
            
            const image = await StorageService.getCapturedImageById(imageId);
            
            if (image) {
                return res.json({
                    success: true,
                    image: image
                });
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'Image not found'
                });
            }
            
        } catch (error) {
            console.error('❌ Get captured image by ID error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching image'
            });
        }
    }

    /**
     * DELETE /api/storage/captured-images/:imageId
     * Delete captured image
     */
    static async deleteCapturedImage(req: Request, res: Response) {
        try {
            const { imageId } = req.params;
            
            const deleted = await StorageService.deleteCapturedImage(imageId);
            
            if (deleted) {
                return res.json({
                    success: true,
                    message: 'Image deleted successfully'
                });
            } else {
                return res.status(404).json({
                    success: false,
                    message: 'Image not found'
                });
            }
            
        } catch (error) {
            console.error('❌ Delete captured image error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error deleting image'
            });
        }
    }

    /**
     * DELETE /api/storage/captured-images
     * Delete all captured images (admin only)
     */
    static async deleteAllCapturedImages(req: Request, res: Response) {
        try {
            const deleted = await StorageService.deleteAllCapturedImages();
            
            return res.json({
                success: deleted,
                message: deleted ? 'All images deleted successfully' : 'Failed to delete images'
            });
            
        } catch (error) {
            console.error('❌ Delete all captured images error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error deleting all images'
            });
        }
    }

    /**
     * GET /api/storage/captured-images/stats
     * Get captured images statistics
     */
    static async getCapturedImagesStats(req: Request, res: Response) {
        try {
            const stats = await StorageService.getCapturedImagesStats();
            
            return res.json({
                success: true,
                stats: stats
            });
            
        } catch (error) {
            console.error('❌ Get captured images stats error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching statistics'
            });
        }
    }

    /**
     * GET /api/storage/captured-images/date-range
     * Get captured images by date range
     */
    static async getCapturedImagesByDateRange(req: Request, res: Response) {
        try {
            const { startDate, endDate } = req.query;
            const limit = parseInt(req.query.limit as string) || 100;
            
            if (!startDate || !endDate) {
                return res.status(400).json({
                    success: false,
                    message: 'Missing required parameters: startDate, endDate'
                });
            }
            
            const images = await StorageService.getCapturedImagesByDateRange(
                startDate as string, 
                endDate as string, 
                limit
            );
            
            return res.json({
                success: true,
                count: images.length,
                dateRange: { startDate, endDate },
                images: images
            });
            
        } catch (error) {
            console.error('❌ Get images by date range error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error fetching images by date range'
            });
        }
    }

    /**
     * POST /api/storage/cleanup
     * Clean up old captured images (admin only)
     */
    static async cleanupOldImages(req: Request, res: Response) {
        try {
            const keepPerStudent = parseInt(req.body.keepPerStudent) || 10;
            
            const deletedCount = await StorageService.cleanupOldImages(keepPerStudent);
            
            return res.json({
                success: true,
                message: `Cleaned up ${deletedCount} old images`,
                deletedCount: deletedCount
            });
            
        } catch (error) {
            console.error('❌ Cleanup old images error:', error);
            return res.status(500).json({
                success: false,
                message: 'Error cleaning up old images'
            });
        }
    }
}