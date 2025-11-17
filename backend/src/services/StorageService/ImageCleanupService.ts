/**
 * Image Cleanup Service
 * Tự động xóa ảnh cũ hơn 2 tuần từ database để tiết kiệm dung lượng
 */

import db from "../../database/connection";

export class ImageCleanupService {
    
    /**
     * Xóa tất cả ảnh cũ hơn số ngày chỉ định
     * @param daysOld - Số ngày cũ (mặc định: 14 ngày = 2 tuần)
     * @returns Số lượng ảnh đã xóa
     */
    static async cleanupOldImages(daysOld: number = 14): Promise<{
        success: boolean;
        deletedCount: number;
        message: string;
        details?: {
            cutoffDate: Date;
            totalSizeMB: number;
        };
    }> {
        try {
            console.log(`🧹 Starting image cleanup for images older than ${daysOld} days...`);
            
            // Tính ngày cutoff
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            
            console.log(`📅 Cutoff date: ${cutoffDate.toISOString()}`);
            
            // Đếm số lượng ảnh sẽ bị xóa và tính tổng dung lượng
            const [countRows] = await db.execute(`
                SELECT 
                    COUNT(*) as imageCount,
                    SUM(LENGTH(imageData)) as totalSize
                FROM captured_images 
                WHERE captured_at < ?
            `, [cutoffDate]);
            
            const stats = (countRows as any[])[0];
            const imageCount = stats.imageCount || 0;
            const totalSizeBytes = stats.totalSize || 0;
            const totalSizeMB = Math.round((totalSizeBytes / (1024 * 1024)) * 100) / 100;
            
            console.log(`📊 Found ${imageCount} images to delete (${totalSizeMB} MB)`);
            
            if (imageCount === 0) {
                return {
                    success: true,
                    deletedCount: 0,
                    message: `No images older than ${daysOld} days found`,
                    details: {
                        cutoffDate,
                        totalSizeMB: 0
                    }
                };
            }
            
            // Xóa ảnh cũ
            const [result] = await db.execute(`
                DELETE FROM captured_images 
                WHERE captured_at < ?
            `, [cutoffDate]);
            
            const affectedRows = (result as any).affectedRows || 0;
            
            console.log(`✅ Successfully deleted ${affectedRows} images (${totalSizeMB} MB freed)`);
            
            return {
                success: true,
                deletedCount: affectedRows,
                message: `Successfully deleted ${affectedRows} images older than ${daysOld} days`,
                details: {
                    cutoffDate,
                    totalSizeMB
                }
            };
            
        } catch (error) {
            console.error('❌ Error cleaning up old images:', error);
            return {
                success: false,
                deletedCount: 0,
                message: `Error cleaning up images: ${(error as Error).message}`
            };
        }
    }
    
    /**
     * Lấy thống kê về ảnh trong database
     */
    static async getImageStats(): Promise<{
        totalImages: number;
        totalSizeMB: number;
        oldestImageDate: Date | null;
        newestImageDate: Date | null;
        imagesOlderThan2Weeks: number;
        sizeOlderThan2WeeksMB: number;
    }> {
        try {
            // Lấy thống kê tổng quan
            const [statsRows] = await db.execute(`
                SELECT 
                    COUNT(*) as totalImages,
                    SUM(LENGTH(imageData)) as totalSize,
                    MIN(captured_at) as oldestDate,
                    MAX(captured_at) as newestDate
                FROM captured_images
            `);
            
            const stats = (statsRows as any[])[0];
            
            // Lấy thống kê ảnh cũ hơn 2 tuần
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            
            const [oldStatsRows] = await db.execute(`
                SELECT 
                    COUNT(*) as oldImages,
                    SUM(LENGTH(imageData)) as oldSize
                FROM captured_images 
                WHERE captured_at < ?
            `, [twoWeeksAgo]);
            
            const oldStats = (oldStatsRows as any[])[0];
            
            return {
                totalImages: stats.totalImages || 0,
                totalSizeMB: Math.round(((stats.totalSize || 0) / (1024 * 1024)) * 100) / 100,
                oldestImageDate: stats.oldestDate ? new Date(stats.oldestDate) : null,
                newestImageDate: stats.newestDate ? new Date(stats.newestDate) : null,
                imagesOlderThan2Weeks: oldStats.oldImages || 0,
                sizeOlderThan2WeeksMB: Math.round(((oldStats.oldSize || 0) / (1024 * 1024)) * 100) / 100
            };
            
        } catch (error) {
            console.error('❌ Error getting image stats:', error);
            throw error;
        }
    }
    
    /**
     * Xóa ảnh theo recognition result (ví dụ: chỉ xóa ảnh FAILED)
     */
    static async cleanupByResult(
        result: 'SUCCESS' | 'FAILED' | 'ADMIN_RESET',
        daysOld: number = 14
    ): Promise<{
        success: boolean;
        deletedCount: number;
        message: string;
    }> {
        try {
            console.log(`🧹 Cleaning up ${result} images older than ${daysOld} days...`);
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            
            const [result_delete] = await db.execute(`
                DELETE FROM captured_images 
                WHERE captured_at < ?
                AND recognition_result = ?
            `, [cutoffDate, result]);
            
            const affectedRows = (result_delete as any).affectedRows || 0;
            
            console.log(`✅ Deleted ${affectedRows} ${result} images`);
            
            return {
                success: true,
                deletedCount: affectedRows,
                message: `Successfully deleted ${affectedRows} ${result} images older than ${daysOld} days`
            };
            
        } catch (error) {
            console.error(`❌ Error cleaning up ${result} images:`, error);
            return {
                success: false,
                deletedCount: 0,
                message: `Error cleaning up images: ${(error as Error).message}`
            };
        }
    }
    
    /**
     * Xóa ảnh của một student cụ thể
     */
    static async cleanupUserImages(
        studentId: string,
        daysOld: number = 14
    ): Promise<{
        success: boolean;
        deletedCount: number;
        message: string;
    }> {
        try {
            console.log(`🧹 Cleaning up images for student ${studentId} older than ${daysOld} days...`);
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            
            const [result] = await db.execute(`
                DELETE FROM captured_images 
                WHERE captured_at < ?
                AND studentId = ?
            `, [cutoffDate, studentId]);
            
            const affectedRows = (result as any).affectedRows || 0;
            
            console.log(`✅ Deleted ${affectedRows} images for student ${studentId}`);
            
            return {
                success: true,
                deletedCount: affectedRows,
                message: `Successfully deleted ${affectedRows} images for student ${studentId}`
            };
            
        } catch (error) {
            console.error(`❌ Error cleaning up images for student ${studentId}:`, error);
            return {
                success: false,
                deletedCount: 0,
                message: `Error cleaning up images: ${(error as Error).message}`
            };
        }
    }
}
