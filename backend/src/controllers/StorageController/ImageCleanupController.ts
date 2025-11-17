import { Request, Response } from 'express';
import { ImageCleanupService } from '../../services/StorageService/ImageCleanupService';

export class ImageCleanupController {
    
    /**
     * POST /api/storage/cleanup/images
     * Manually trigger image cleanup (Admin only)
     */
    static async cleanupOldImages(req: Request, res: Response) {
        try {
            const { daysOld = 14 } = req.body;
            
            // Validate daysOld parameter
            if (daysOld < 1 || daysOld > 365) {
                return res.status(400).json({
                    success: false,
                    message: 'daysOld must be between 1 and 365'
                });
            }
            
            console.log(`🧹 Manual cleanup triggered for images older than ${daysOld} days`);
            
            // Get stats before cleanup
            const statsBefore = await ImageCleanupService.getImageStats();
            
            // Perform cleanup
            const result = await ImageCleanupService.cleanupOldImages(daysOld);
            
            // Get stats after cleanup
            const statsAfter = await ImageCleanupService.getImageStats();
            
            return res.json({
                success: result.success,
                message: result.message,
                deletedCount: result.deletedCount,
                freedSpaceMB: result.details?.totalSizeMB || 0,
                cutoffDate: result.details?.cutoffDate,
                statsBefore: {
                    totalImages: statsBefore.totalImages,
                    totalSizeMB: statsBefore.totalSizeMB
                },
                statsAfter: {
                    totalImages: statsAfter.totalImages,
                    totalSizeMB: statsAfter.totalSizeMB
                },
                timestamp: new Date()
            });
            
        } catch (error) {
            console.error('❌ Error in cleanup API:', error);
            return res.status(500).json({
                success: false,
                message: 'System error during cleanup'
            });
        }
    }
    
    /**
     * GET /api/storage/cleanup/stats
     * Get image cleanup statistics (Admin only)
     */
    static async getCleanupStats(req: Request, res: Response) {
        try {
            console.log('📊 Getting image cleanup statistics...');
            
            const stats = await ImageCleanupService.getImageStats();
            
            return res.json({
                success: true,
                stats: {
                    totalImages: stats.totalImages,
                    totalSizeMB: stats.totalSizeMB,
                    oldestImageDate: stats.oldestImageDate,
                    newestImageDate: stats.newestImageDate,
                    cleanupRecommendation: {
                        imagesOlderThan2Weeks: stats.imagesOlderThan2Weeks,
                        potentialSpaceFreedMB: stats.sizeOlderThan2WeeksMB,
                        shouldCleanup: stats.imagesOlderThan2Weeks > 0
                    }
                },
                timestamp: new Date()
            });
            
        } catch (error) {
            console.error('❌ Error getting cleanup stats:', error);
            return res.status(500).json({
                success: false,
                message: 'System error getting statistics'
            });
        }
    }
    
    /**
     * POST /api/storage/cleanup/by-result
     * Cleanup images by recognition result (Admin only)
     */
    static async cleanupByResult(req: Request, res: Response) {
        try {
            const { result, daysOld = 14 } = req.body;
            
            // Validate result parameter
            if (!['SUCCESS', 'FAILED', 'ADMIN_RESET'].includes(result)) {
                return res.status(400).json({
                    success: false,
                    message: 'result must be one of: SUCCESS, FAILED, ADMIN_RESET'
                });
            }
            
            console.log(`🧹 Cleaning up ${result} images older than ${daysOld} days`);
            
            const cleanupResult = await ImageCleanupService.cleanupByResult(result, daysOld);
            
            return res.json({
                success: cleanupResult.success,
                message: cleanupResult.message,
                deletedCount: cleanupResult.deletedCount,
                timestamp: new Date()
            });
            
        } catch (error) {
            console.error('❌ Error in cleanup by result:', error);
            return res.status(500).json({
                success: false,
                message: 'System error during cleanup'
            });
        }
    }
    
    /**
     * POST /api/storage/cleanup/user/:studentId
     * Cleanup images for specific user (Admin only)
     */
    static async cleanupUserImages(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            const { daysOld = 14 } = req.body;
            
            if (!studentId) {
                return res.status(400).json({
                    success: false,
                    message: 'studentId is required'
                });
            }
            
            console.log(`🧹 Cleaning up images for student ${studentId} older than ${daysOld} days`);
            
            const result = await ImageCleanupService.cleanupUserImages(studentId, daysOld);
            
            return res.json({
                success: result.success,
                message: result.message,
                deletedCount: result.deletedCount,
                studentId,
                timestamp: new Date()
            });
            
        } catch (error) {
            console.error('❌ Error in cleanup user images:', error);
            return res.status(500).json({
                success: false,
                message: 'System error during cleanup'
            });
        }
    }
}
