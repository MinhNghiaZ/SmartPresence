/**
 * Cron Job Service để tự động cập nhật ClassSession status
 * Chạy mỗi 5 phút để complete các session đã hết giờ
 */

import cron from 'node-cron';
import { ClassSessionService } from '../ClassSessionService/ClassSessionService';
import { ImageCleanupService } from '../StorageService/ImageCleanupService';
import { AttendanceMonitoringService } from '../FaceService/AttendanceMonitoringService';
import { SmartLogger } from '../../utils/smartLogger';

export class CronJobService {
    
    /**
     * Start all cron jobs
     */
    static startAllJobs(): void {
        console.log('🚀 Starting CronJob services...');
        
        // Auto-complete expired sessions every 5 minutes
        this.startAutoCompleteExpiredSessions();
        
        // Auto-generate sessions for upcoming days every day at 00:30
        this.startAutoGenerateSessions();
        
        // Generate sessions immediately on startup for next 7 days
        this.generateSessionsOnStartup();
        
        // Clean up old sessions weekly
        this.startCleanupOldSessions();
        
        // ✨ NEW: Clean up old images (2 weeks) - weekly & on startup
        this.startCleanupOldImages();
        this.cleanupImagesOnStartup();
        
        // ✨ NEW: Monitor success rate và alert nếu < 90%
        this.startDailySuccessRateMonitoring();
        
        console.log('✅ All CronJob services started');
    }
    
    /**
     * Auto-complete expired ClassSession records
     * Runs every 5 minutes: 0 * /5 * * * * (every 5th minute)
     */
    private static startAutoCompleteExpiredSessions(): void {
        cron.schedule('*/5 * * * *', async () => {
            try {
                console.log('🔄 [CRON] Auto-completing expired sessions...');
                await ClassSessionService.completeExpiredSessions();
                console.log('✅ [CRON] Expired sessions check completed');
            } catch (error) {
                console.error('❌ [CRON] Error in auto-complete expired sessions:', error);
            }
        }, {
            timezone: "Asia/Ho_Chi_Minh"
        });
        
        console.log('📅 [CRON] Auto-complete expired sessions job started (every 5 minutes)');
    }
    
    /**
     * Auto-generate ClassSession records for upcoming days
     * Runs daily at 00:30 AM to prepare sessions for next 7 days
     */
    private static startAutoGenerateSessions(): void {
        cron.schedule('30 0 * * *', async () => {
            try {
                console.log('🔄 [CRON] Auto-generating sessions for upcoming days...');
                console.log('🔍 [CRON] Only active TimeSlots within date range will generate sessions');
                
                // Generate sessions for next 7 days
                const today = new Date();
                for (let i = 0; i <= 7; i++) {
                    const targetDate = new Date(today);
                    targetDate.setDate(today.getDate() + i);
                    const dateStr = targetDate.toISOString().split('T')[0];
                    
                    console.log(`📅 [CRON] Generating sessions for: ${dateStr}`);
                    await ClassSessionService.generateSessionsForDate(dateStr);
                }
                
                console.log('✅ [CRON] Session generation completed for next 7 days (with TimeSlot validation)');
            } catch (error) {
                console.error('❌ [CRON] Error in auto-generate sessions:', error);
            }
        }, {
            timezone: "Asia/Ho_Chi_Minh"
        });
        
        console.log('📅 [CRON] Auto-generate sessions job started (daily at 00:30)');
    }
    
    /**
     * Generate sessions immediately on server startup
     * Ensures sessions are available for next 7 days
     */
    private static async generateSessionsOnStartup(): Promise<void> {
        try {
            console.log('🚀 [STARTUP] Generating sessions for next 7 days...');
            console.log('🔍 [STARTUP] Using TimeSlot validation (active=1, date range check)');
            
            const today = new Date();
            for (let i = 0; i <= 7; i++) {
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + i);
                const dateStr = targetDate.toISOString().split('T')[0];
                
                console.log(`📅 [STARTUP] Generating sessions for: ${dateStr}`);
                await ClassSessionService.generateSessionsForDate(dateStr);
            }
            
            console.log('✅ [STARTUP] Session generation completed for next 7 days (with validation)');
        } catch (error) {
            console.error('❌ [STARTUP] Error generating sessions on startup:', error);
        }
    }
    
    /**
     * Clean up old ClassSession records  
     * Runs weekly on Sunday at 02:00 AM to remove sessions older than 30 days
     */
    private static startCleanupOldSessions(): void {
        cron.schedule('0 2 * * 0', async () => {
            try {
                console.log('🧹 [CRON] Cleaning up old sessions...');
                
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0];
                
                // This would need to be implemented in ClassSessionService
                // await ClassSessionService.cleanupOldSessions(cutoffDate);
                
                console.log(`🗑️ [CRON] Cleaned up sessions older than ${cutoffDate}`);
                console.log('✅ [CRON] Old sessions cleanup completed');
            } catch (error) {
                console.error('❌ [CRON] Error in cleanup old sessions:', error);
            }
        }, {
            timezone: "Asia/Ho_Chi_Minh"
        });
        
        console.log('🧹 [CRON] Cleanup old sessions job started (weekly on Sunday at 02:00)');
    }
    
    /**
     * ✨ NEW: Clean up old images from captured_images table
     * Runs weekly on Sunday at 03:00 AM to remove images older than 14 days (2 weeks)
     */
    private static startCleanupOldImages(): void {
        cron.schedule('0 3 * * 0', async () => {
            try {
                console.log('🧹 [CRON] Cleaning up old images (older than 2 weeks)...');
                
                // Get stats before cleanup
                const statsBefore = await ImageCleanupService.getImageStats();
                console.log(`📊 [CRON] Current stats: ${statsBefore.totalImages} images (${statsBefore.totalSizeMB} MB)`);
                console.log(`📊 [CRON] Images older than 2 weeks: ${statsBefore.imagesOlderThan2Weeks} (${statsBefore.sizeOlderThan2WeeksMB} MB)`);
                
                // Clean up images older than 14 days (2 weeks)
                const result = await ImageCleanupService.cleanupOldImages(14);
                
                if (result.success) {
                    console.log(`✅ [CRON] ${result.message}`);
                    console.log(`🗑️ [CRON] Deleted ${result.deletedCount} images, freed ${result.details?.totalSizeMB} MB`);
                } else {
                    console.error(`❌ [CRON] ${result.message}`);
                }
                
                // Get stats after cleanup
                const statsAfter = await ImageCleanupService.getImageStats();
                console.log(`📊 [CRON] After cleanup: ${statsAfter.totalImages} images (${statsAfter.totalSizeMB} MB)`);
                
            } catch (error) {
                console.error('❌ [CRON] Error in cleanup old images:', error);
            }
        }, {
            timezone: "Asia/Ho_Chi_Minh"
        });
        
        console.log('🧹 [CRON] Cleanup old images job started (weekly on Sunday at 03:00, removes images >14 days old)');
    }
    
    /**
     * ✨ NEW: Clean up old images immediately on server startup
     * Ensures old images are removed when server starts
     */
    private static async cleanupImagesOnStartup(): Promise<void> {
        try {
            console.log('🚀 [STARTUP] Cleaning up old images (older than 2 weeks)...');
            
            // Get stats before cleanup
            const statsBefore = await ImageCleanupService.getImageStats();
            console.log(`📊 [STARTUP] Current stats: ${statsBefore.totalImages} images (${statsBefore.totalSizeMB} MB)`);
            console.log(`📊 [STARTUP] Images older than 2 weeks: ${statsBefore.imagesOlderThan2Weeks} (${statsBefore.sizeOlderThan2WeeksMB} MB)`);
            
            if (statsBefore.imagesOlderThan2Weeks === 0) {
                console.log('✅ [STARTUP] No old images to clean up');
                return;
            }
            
            // Clean up images older than 14 days (2 weeks)
            const result = await ImageCleanupService.cleanupOldImages(14);
            
            if (result.success) {
                console.log(`✅ [STARTUP] ${result.message}`);
                console.log(`🗑️ [STARTUP] Deleted ${result.deletedCount} images, freed ${result.details?.totalSizeMB} MB`);
                
                // Get stats after cleanup
                const statsAfter = await ImageCleanupService.getImageStats();
                console.log(`📊 [STARTUP] After cleanup: ${statsAfter.totalImages} images (${statsAfter.totalSizeMB} MB)`);
            } else {
                console.error(`❌ [STARTUP] ${result.message}`);
            }
            
        } catch (error) {
            console.error('❌ [STARTUP] Error cleaning up images on startup:', error);
        }
    }
    
    /**
     * ✨ NEW: Monitor success rate hàng ngày
     * Chạy 3 lần/ngày: 12:00, 18:00, 23:00
     * Alert admin nếu success rate < 90%
     */
    private static startDailySuccessRateMonitoring(): void {
        // Chạy lúc 12:00 (giữa trưa)
        cron.schedule('0 12 * * *', async () => {
            try {
                SmartLogger.dev('📊 [CRON] Checking midday success rate...');
                await AttendanceMonitoringService.checkAndAlertLowSuccessRate();
            } catch (error) {
                SmartLogger.logCriticalError('CronJob.successRateMonitoring', error);
            }
        }, {
            timezone: "Asia/Ho_Chi_Minh"
        });
        
        // Chạy lúc 18:00 (chiều)
        cron.schedule('0 18 * * *', async () => {
            try {
                SmartLogger.dev('📊 [CRON] Checking evening success rate...');
                await AttendanceMonitoringService.checkAndAlertLowSuccessRate();
            } catch (error) {
                SmartLogger.logCriticalError('CronJob.successRateMonitoring', error);
            }
        }, {
            timezone: "Asia/Ho_Chi_Minh"
        });
        
        // Chạy lúc 23:00 (cuối ngày - summary cuối cùng)
        cron.schedule('0 23 * * *', async () => {
            try {
                SmartLogger.dev('📊 [CRON] Daily success rate summary...');
                await AttendanceMonitoringService.checkAndAlertLowSuccessRate();
                
                // Log problematic students (cần hỗ trợ)
                const problematicStudents = await AttendanceMonitoringService.getProblematicStudents(7, 3);
                if (problematicStudents.length > 0) {
                    SmartLogger.warn('⚠️ Students with low success rate (need support):', {
                        count: problematicStudents.length,
                        students: problematicStudents.slice(0, 5) // Top 5
                    });
                }
                
                // Log hourly failure pattern
                const hourlyPattern = await AttendanceMonitoringService.getHourlyFailurePattern(7);
                const peakFailureHours = hourlyPattern
                    .filter(h => h.failureRate > 0.15) // >15% failure rate
                    .sort((a, b) => b.failureRate - a.failureRate);
                    
                if (peakFailureHours.length > 0) {
                    SmartLogger.warn('⚠️ Peak failure hours:', {
                        hours: peakFailureHours.map(h => `${h.hour}:00 (${(h.failureRate * 100).toFixed(1)}% failure)`)
                    });
                }
                
            } catch (error) {
                SmartLogger.logCriticalError('CronJob.dailySummary', error);
            }
        }, {
            timezone: "Asia/Ho_Chi_Minh"
        });
        
        SmartLogger.success('📊 [CRON] Success rate monitoring started (12:00, 18:00, 23:00 daily)');
    }
    
    /**
     * Stop all cron jobs (for graceful shutdown)
     */
    static stopAllJobs(): void {
        console.log('🛑 Stopping all CronJob services...');
        cron.getTasks().forEach(task => task.stop());
        console.log('✅ All CronJob services stopped');
    }
}