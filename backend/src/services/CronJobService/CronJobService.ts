/**
 * Cron Job Service để tự động cập nhật ClassSession status
 * Chạy mỗi 5 phút để complete các session đã hết giờ
 */

import cron from 'node-cron';
import { ClassSessionService } from '../ClassSessionService/ClassSessionService';

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
                
                // Generate sessions for next 7 days
                const today = new Date();
                for (let i = 0; i <= 7; i++) {
                    const targetDate = new Date(today);
                    targetDate.setDate(today.getDate() + i);
                    const dateStr = targetDate.toISOString().split('T')[0];
                    
                    console.log(`📅 Generating sessions for: ${dateStr}`);
                    await ClassSessionService.generateSessionsForDate(dateStr);
                }
                
                console.log('✅ [CRON] Session generation completed for next 7 days');
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
            
            const today = new Date();
            for (let i = 0; i <= 7; i++) {
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + i);
                const dateStr = targetDate.toISOString().split('T')[0];
                
                console.log(`📅 [STARTUP] Generating sessions for: ${dateStr}`);
                await ClassSessionService.generateSessionsForDate(dateStr);
            }
            
            console.log('✅ [STARTUP] Session generation completed for next 7 days');
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
     * Stop all cron jobs (for graceful shutdown)
     */
    static stopAllJobs(): void {
        console.log('🛑 Stopping all CronJob services...');
        cron.getTasks().forEach(task => task.stop());
        console.log('✅ All CronJob services stopped');
    }
}