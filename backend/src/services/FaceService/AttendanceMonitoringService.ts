import db from "../../database/connection";
import { SmartLogger, DailyStatsAlert } from "../../utils/smartLogger";

/**
 * Service giám sát success rate hàng ngày
 * Tự động phát hiện khi success rate < 90% và alert admin
 */
export class AttendanceMonitoringService {
    
    /**
     * Lấy thống kê hôm nay
     */
    static async getTodayStats(): Promise<{
        successRate: number;
        totalAttempts: number;
        successfulAttempts: number;
        failures: number;
        failureReasons: Map<string, number>;
    }> {
        try {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            // Get all recognition attempts today
            const [attempts] = await db.execute(`
                SELECT 
                    recognition_result,
                    confidence,
                    COUNT(*) as count
                FROM captured_images
                WHERE DATE(captured_at) = CURDATE()
                GROUP BY recognition_result, 
                         CASE 
                            WHEN confidence < 60 THEN 'low_confidence'
                            WHEN confidence < 80 THEN 'medium_confidence'
                            ELSE 'high_confidence'
                         END
            `);
            
            let totalAttempts = 0;
            let successfulAttempts = 0;
            const failureReasons = new Map<string, number>();
            
            (attempts as any[]).forEach(row => {
                const count = parseInt(row.count);
                totalAttempts += count;
                
                if (row.recognition_result === 'SUCCESS') {
                    successfulAttempts += count;
                } else {
                    const reason = this.categorizeFailure(row.recognition_result, row.confidence);
                    failureReasons.set(reason, (failureReasons.get(reason) || 0) + count);
                }
            });
            
            const successRate = totalAttempts > 0 ? successfulAttempts / totalAttempts : 0;
            
            return {
                successRate,
                totalAttempts,
                successfulAttempts,
                failures: totalAttempts - successfulAttempts,
                failureReasons
            };
            
        } catch (error) {
            SmartLogger.logCriticalError('AttendanceMonitoringService.getTodayStats', error);
            throw error;
        }
    }
    
    /**
     * Phân loại lý do thất bại
     */
    private static categorizeFailure(result: string, confidence: number): string {
        if (result === 'FAILED' && confidence < 40) {
            return 'Very Low Confidence (<40%)';
        } else if (result === 'FAILED' && confidence < 60) {
            return 'Low Confidence (40-60%)';
        } else if (result === 'FAILED' && confidence < 80) {
            return 'Medium Confidence (60-80%) - Near Miss';
        } else if (result === 'FAILED') {
            return 'High Confidence But Failed (>80%) - Need Investigation';
        } else if (result === 'ADMIN_RESET') {
            return 'Admin Reset - User Re-registration';
        }
        return 'Unknown Failure';
    }
    
    /**
     * Kiểm tra và alert nếu success rate < 90%
     */
    static async checkAndAlertLowSuccessRate(): Promise<void> {
        try {
            const stats = await this.getTodayStats();
            
            // Chỉ alert nếu có đủ data (>= 10 attempts) và success rate < 90%
            if (stats.totalAttempts >= 10 && stats.successRate < 0.90) {
                
                // Convert failureReasons Map to array
                const topFailureReasons = Array.from(stats.failureReasons.entries())
                    .map(([reason, count]) => ({ reason, count }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5); // Top 5 lý do
                
                const alertData: DailyStatsAlert = {
                    date: new Date().toISOString().split('T')[0],
                    successRate: stats.successRate,
                    totalAttempts: stats.totalAttempts,
                    failures: stats.failures,
                    topFailureReasons
                };
                
                SmartLogger.logSuccessRateAlert(alertData);
                
                // TODO: Send notification to admin (email, Slack, etc.)
                // await this.sendAdminNotification(alertData);
            } else if (stats.totalAttempts >= 10) {
                SmartLogger.logDailySummary(stats.successRate, stats.totalAttempts, stats.failures);
            }
            
        } catch (error) {
            SmartLogger.logCriticalError('AttendanceMonitoringService.checkAndAlertLowSuccessRate', error);
        }
    }
    
    /**
     * Lấy students có success rate thấp nhất (cần hỗ trợ)
     */
    static async getProblematicStudents(days: number = 7, minAttempts: number = 3): Promise<Array<{
        studentId: string;
        successRate: number;
        totalAttempts: number;
        failures: number;
        avgConfidence: number;
    }>> {
        try {
            const [rows] = await db.execute(`
                SELECT 
                    studentId,
                    COUNT(*) as totalAttempts,
                    SUM(CASE WHEN recognition_result = 'SUCCESS' THEN 1 ELSE 0 END) as successes,
                    COUNT(*) - SUM(CASE WHEN recognition_result = 'SUCCESS' THEN 1 ELSE 0 END) as failures,
                    AVG(confidence) as avgConfidence
                FROM captured_images
                WHERE captured_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                    AND studentId IS NOT NULL
                GROUP BY studentId
                HAVING totalAttempts >= ?
                ORDER BY (successes / totalAttempts) ASC, totalAttempts DESC
                LIMIT 20
            `, [days, minAttempts]);
            
            return (rows as any[]).map(row => ({
                studentId: row.studentId,
                successRate: row.successes / row.totalAttempts,
                totalAttempts: row.totalAttempts,
                failures: row.failures,
                avgConfidence: parseFloat(row.avgConfidence)
            }));
            
        } catch (error) {
            SmartLogger.logCriticalError('AttendanceMonitoringService.getProblematicStudents', error);
            return [];
        }
    }
    
    /**
     * Lấy hourly pattern - Phát hiện giờ nào hay lỗi nhất
     */
    static async getHourlyFailurePattern(days: number = 7): Promise<Array<{
        hour: number;
        totalAttempts: number;
        failures: number;
        failureRate: number;
    }>> {
        try {
            const [rows] = await db.execute(`
                SELECT 
                    HOUR(captured_at) as hour,
                    COUNT(*) as totalAttempts,
                    SUM(CASE WHEN recognition_result != 'SUCCESS' THEN 1 ELSE 0 END) as failures
                FROM captured_images
                WHERE captured_at >= DATE_SUB(NOW(), INTERVAL ? DAY)
                GROUP BY HOUR(captured_at)
                ORDER BY hour
            `, [days]);
            
            return (rows as any[]).map(row => ({
                hour: row.hour,
                totalAttempts: row.totalAttempts,
                failures: row.failures,
                failureRate: row.failures / row.totalAttempts
            }));
            
        } catch (error) {
            SmartLogger.logCriticalError('AttendanceMonitoringService.getHourlyFailurePattern', error);
            return [];
        }
    }
}
