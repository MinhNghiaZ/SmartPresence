import { Request, Response } from 'express';
import { AttendanceMonitoringService } from '../../services/FaceService/AttendanceMonitoringService';
import { SmartLogger } from '../../utils/smartLogger';

/**
 * Admin endpoints để monitor success rate và phát hiện vấn đề
 */
export class MonitoringController {
    
    /**
     * GET /api/monitoring/today-stats
     * Lấy thống kê hôm nay
     */
    static async getTodayStats(req: Request, res: Response) {
        try {
            const stats = await AttendanceMonitoringService.getTodayStats();
            
            return res.json({
                success: true,
                date: new Date().toISOString().split('T')[0],
                stats: {
                    successRate: `${(stats.successRate * 100).toFixed(2)}%`,
                    successRateDecimal: stats.successRate,
                    totalAttempts: stats.totalAttempts,
                    successfulAttempts: stats.successfulAttempts,
                    failures: stats.failures,
                    isHealthy: stats.successRate >= 0.90,
                    target: '90%',
                    gap: stats.successRate < 0.90 ? `${((0.90 - stats.successRate) * 100).toFixed(2)}%` : '0%'
                },
                failureReasons: Array.from(stats.failureReasons.entries()).map(([reason, count]) => ({
                    reason,
                    count,
                    percentage: `${((count / stats.failures) * 100).toFixed(1)}%`
                })).sort((a, b) => b.count - a.count),
                timestamp: new Date()
            });
            
        } catch (error) {
            SmartLogger.logCriticalError('MonitoringController.getTodayStats', error);
            return res.status(500).json({
                success: false,
                message: 'Error getting today stats'
            });
        }
    }
    
    /**
     * GET /api/monitoring/problematic-students?days=7&minAttempts=3
     * Lấy danh sách students có success rate thấp
     */
    static async getProblematicStudents(req: Request, res: Response) {
        try {
            const days = parseInt(req.query.days as string) || 7;
            const minAttempts = parseInt(req.query.minAttempts as string) || 3;
            
            const students = await AttendanceMonitoringService.getProblematicStudents(days, minAttempts);
            
            return res.json({
                success: true,
                period: `Last ${days} days`,
                minimumAttempts: minAttempts,
                count: students.length,
                students: students.map(s => ({
                    studentId: s.studentId,
                    successRate: `${(s.successRate * 100).toFixed(1)}%`,
                    successRateDecimal: s.successRate,
                    totalAttempts: s.totalAttempts,
                    failures: s.failures,
                    avgConfidence: `${s.avgConfidence.toFixed(1)}%`,
                    needsSupport: s.successRate < 0.70, // <70% = needs urgent support
                    status: s.successRate < 0.50 ? 'critical' :
                            s.successRate < 0.70 ? 'needs_support' :
                            s.successRate < 0.90 ? 'monitor' : 'ok'
                })),
                timestamp: new Date()
            });
            
        } catch (error) {
            SmartLogger.logCriticalError('MonitoringController.getProblematicStudents', error);
            return res.status(500).json({
                success: false,
                message: 'Error getting problematic students'
            });
        }
    }
    
    /**
     * GET /api/monitoring/hourly-pattern?days=7
     * Phân tích giờ nào hay lỗi nhất
     */
    static async getHourlyPattern(req: Request, res: Response) {
        try {
            const days = parseInt(req.query.days as string) || 7;
            
            const pattern = await AttendanceMonitoringService.getHourlyFailurePattern(days);
            
            // Find peak failure hours
            const peakFailureHours = pattern
                .filter(h => h.totalAttempts > 0)
                .sort((a, b) => b.failureRate - a.failureRate)
                .slice(0, 5);
            
            return res.json({
                success: true,
                period: `Last ${days} days`,
                hourlyData: pattern.map(h => ({
                    hour: `${h.hour.toString().padStart(2, '0')}:00`,
                    totalAttempts: h.totalAttempts,
                    failures: h.failures,
                    failureRate: `${(h.failureRate * 100).toFixed(1)}%`,
                    failureRateDecimal: h.failureRate,
                    status: h.failureRate > 0.20 ? 'high_failure' :
                            h.failureRate > 0.10 ? 'moderate' : 'ok'
                })),
                peakFailureHours: peakFailureHours.map(h => ({
                    hour: `${h.hour.toString().padStart(2, '0')}:00`,
                    failureRate: `${(h.failureRate * 100).toFixed(1)}%`,
                    totalAttempts: h.totalAttempts,
                    failures: h.failures
                })),
                recommendations: this.getRecommendations(peakFailureHours),
                timestamp: new Date()
            });
            
        } catch (error) {
            SmartLogger.logCriticalError('MonitoringController.getHourlyPattern', error);
            return res.status(500).json({
                success: false,
                message: 'Error getting hourly pattern'
            });
        }
    }
    
    /**
     * POST /api/monitoring/trigger-check
     * Manual trigger success rate check
     */
    static async triggerCheck(req: Request, res: Response) {
        try {
            SmartLogger.logAdminAction(
                'MANUAL_SUCCESS_RATE_CHECK',
                req.user?.userId || 'unknown',
                undefined,
                { triggeredAt: new Date() }
            );
            
            await AttendanceMonitoringService.checkAndAlertLowSuccessRate();
            
            const stats = await AttendanceMonitoringService.getTodayStats();
            
            return res.json({
                success: true,
                message: 'Success rate check completed',
                currentSuccessRate: `${(stats.successRate * 100).toFixed(2)}%`,
                isHealthy: stats.successRate >= 0.90,
                timestamp: new Date()
            });
            
        } catch (error) {
            SmartLogger.logCriticalError('MonitoringController.triggerCheck', error);
            return res.status(500).json({
                success: false,
                message: 'Error triggering check'
            });
        }
    }
    
    /**
     * Generate recommendations based on failure patterns
     */
    private static getRecommendations(peakHours: any[]): string[] {
        const recommendations: string[] = [];
        
        if (peakHours.length === 0) {
            recommendations.push('✅ No significant failure patterns detected');
            return recommendations;
        }
        
        const topHour = peakHours[0];
        if (topHour.failureRate > 0.25) {
            recommendations.push(`🚨 Critical: ${topHour.hour} has ${(topHour.failureRate * 100).toFixed(1)}% failure rate - investigate immediately`);
        }
        
        if (topHour.hour >= 7 && topHour.hour <= 9) {
            recommendations.push('☀️ Morning classes may have lighting issues - check camera positions');
        }
        
        if (topHour.hour >= 17 && topHour.hour <= 19) {
            recommendations.push('🌆 Evening classes may have poor lighting - consider additional lighting');
        }
        
        if (peakHours.length >= 3) {
            recommendations.push('📊 Multiple peak failure hours detected - consider system-wide improvements');
        }
        
        return recommendations;
    }
}
