/**
 * Smart Logger - Chỉ log khi CÓ LỖI hoặc cần phân tích
 * Giúp đạt mục tiêu >90% success rate bằng cách:
 * 1. Tự động phát hiện pattern lỗi
 * 2. Log chi tiết khi có failure
 * 3. Không spam log khi mọi thứ OK
 */

interface RecognitionFailureLog {
    studentId: string;
    studentName?: string;
    failureReason: string;
    confidence: number;
    threshold: number;
    imageQuality?: string;
    attemptCount: number;
    timestamp: Date;
    timeOfDay: number;
    deviceType?: string;
}

interface AttendanceFailureLog {
    studentId: string;
    subjectId: string;
    failureType: 'GPS' | 'FACE' | 'TIME' | 'ENROLLMENT' | 'OTHER';
    reason: string;
    details?: any;
    timestamp: Date;
}

interface DailyStatsAlert {
    date: string;
    successRate: number;
    totalAttempts: number;
    failures: number;
    topFailureReasons: Array<{ reason: string; count: number }>;
}

class SmartLogger {
    private static isDevelopment = process.env.NODE_ENV !== 'production';
    private static enableDebug = process.env.DEBUG === 'true';

    /**
     * Chỉ log khi có lỗi hoặc cần debug
     */
    static dev(message: string, data?: any) {
        if (this.isDevelopment || this.enableDebug) {
            console.log(message, data || '');
        }
    }

    /**
     * Luôn log errors
     */
    static error(message: string, error?: any) {
        console.error(message, error || '');
    }

    /**
     * Luôn log warnings
     */
    static warn(message: string, data?: any) {
        console.warn(message, data || '');
    }

    /**
     * Log khi success (chỉ trong dev)
     */
    static success(message: string, data?: any) {
        if (this.isDevelopment) {
            console.log(message, data || '');
        }
    }

    /**
     * Log CHI TIẾT khi face recognition THẤT BẠI
     * Giúp phân tích và fix để đạt >90% success rate
     */
    static logRecognitionFailure(log: RecognitionFailureLog) {
        console.error('❌ FACE_RECOGNITION_FAILURE', {
            studentId: log.studentId,
            studentName: log.studentName,
            reason: log.failureReason,
            confidence: `${log.confidence.toFixed(2)}%`,
            threshold: log.threshold,
            imageQuality: log.imageQuality,
            attemptNumber: log.attemptCount,
            timeOfDay: `${log.timeOfDay}:00`,
            device: log.deviceType,
            timestamp: log.timestamp.toISOString(),
            // Tag để dễ filter logs
            tags: ['failure', 'face-recognition', 'needs-analysis']
        });
    }

    /**
     * Log khi điểm danh THẤT BẠI (bất kỳ lý do gì)
     */
    static logAttendanceFailure(log: AttendanceFailureLog) {
        console.error('❌ ATTENDANCE_FAILURE', {
            studentId: log.studentId,
            subjectId: log.subjectId,
            failureType: log.failureType,
            reason: log.reason,
            details: log.details,
            timestamp: log.timestamp.toISOString(),
            tags: ['failure', 'attendance', log.failureType.toLowerCase()]
        });
    }

    /**
     * Log ALERT khi success rate < 90%
     */
    static logSuccessRateAlert(stats: DailyStatsAlert) {
        console.error('⚠️ SUCCESS_RATE_ALERT', {
            severity: 'HIGH',
            date: stats.date,
            successRate: `${(stats.successRate * 100).toFixed(2)}%`,
            target: '90%',
            gap: `${((0.90 - stats.successRate) * 100).toFixed(2)}%`,
            totalAttempts: stats.totalAttempts,
            totalFailures: stats.failures,
            topReasons: stats.topFailureReasons,
            recommendation: 'Check failure patterns and fix most common issues',
            tags: ['alert', 'low-success-rate', 'action-required']
        });
    }

    /**
     * Log summary cuối ngày (chỉ khi có vấn đề)
     */
    static logDailySummary(successRate: number, totalAttempts: number, failures: number) {
        if (successRate < 0.90) {
            this.warn('📊 DAILY_SUMMARY_WARNING', {
                successRate: `${(successRate * 100).toFixed(2)}%`,
                totalAttempts,
                failures,
                message: 'Success rate below target of 90%'
            });
        } else if (this.isDevelopment) {
            this.success('📊 DAILY_SUMMARY_OK', {
                successRate: `${(successRate * 100).toFixed(2)}%`,
                totalAttempts,
                failures
            });
        }
        // Không log gì cả nếu mọi thứ OK trong production
    }

    /**
     * Log admin actions (quan trọng cho audit)
     */
    static logAdminAction(action: string, adminId: string, targetId?: string, details?: any) {
        console.log('🔐 ADMIN_ACTION', {
            action,
            adminId,
            targetId,
            details,
            timestamp: new Date().toISOString(),
            tags: ['admin', 'audit']
        });
    }

    /**
     * Log critical errors (database, network, etc.)
     */
    static logCriticalError(source: string, error: any, context?: any) {
        console.error('🚨 CRITICAL_ERROR', {
            source,
            error: error.message || error,
            stack: error.stack,
            context,
            timestamp: new Date().toISOString(),
            tags: ['critical', 'error', 'immediate-action']
        });
    }
}

export { SmartLogger, RecognitionFailureLog, AttendanceFailureLog, DailyStatsAlert };
