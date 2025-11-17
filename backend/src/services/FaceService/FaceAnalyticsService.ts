import db from "../../database/connection";
import { FACE_CONSTANTS } from "../../models/face";

export interface FaceAnalytics {
    totalAttempts: number;
    successfulRecognitions: number;
    successRate: number;
    averageConfidence: number;
    problematicUsers: Array<{
        studentId: string;
        studentName: string;
        attempts: number;
        successRate: number;
        lastFailureDate: Date;
    }>;
    qualityIssues: Array<{
        issue: string;
        count: number;
        percentage: number;
    }>;
    recommendations: string[];
}

export class FaceAnalyticsService {
    
    /**
     * Get comprehensive face recognition analytics
     */
    static async getAnalytics(days: number = 30): Promise<FaceAnalytics> {
        try {
            const dateThreshold = new Date();
            dateThreshold.setDate(dateThreshold.getDate() - days);
            
            // Get basic statistics
            const [statsRows] = await db.execute(`
                SELECT 
                    COUNT(*) as totalAttempts,
                    SUM(CASE WHEN recognition_result = 'SUCCESS' THEN 1 ELSE 0 END) as successfulRecognitions,
                    AVG(CASE WHEN recognition_result = 'SUCCESS' THEN confidence ELSE NULL END) as avgSuccessConfidence,
                    AVG(confidence) as avgOverallConfidence
                FROM captured_images 
                WHERE captured_at >= ?
                AND recognition_result IN ('SUCCESS', 'FAILED')
            `, [dateThreshold]);
            
            const stats = (statsRows as any[])[0];
            const successRate = stats.totalAttempts > 0 ? (stats.successfulRecognitions / stats.totalAttempts) * 100 : 0;
            
            // Get problematic users (low success rate)
            const [problematicRows] = await db.execute(`
                SELECT 
                    ci.studentId,
                    sa.name as studentName,
                    COUNT(*) as attempts,
                    SUM(CASE WHEN ci.recognition_result = 'SUCCESS' THEN 1 ELSE 0 END) as successes,
                    MAX(CASE WHEN ci.recognition_result = 'FAILED' THEN ci.captured_at ELSE NULL END) as lastFailureDate
                FROM captured_images ci
                LEFT JOIN studentaccount sa ON ci.studentId = sa.studentId
                WHERE ci.captured_at >= ?
                AND ci.recognition_result IN ('SUCCESS', 'FAILED')
                AND ci.studentId IS NOT NULL
                GROUP BY ci.studentId, sa.name
                HAVING attempts >= 5 -- At least 5 attempts
                AND (successes * 100.0 / attempts) < 70 -- Success rate < 70%
                ORDER BY (successes * 100.0 / attempts) ASC, attempts DESC
                LIMIT 10
            `, [dateThreshold]);
            
            // Analyze quality issues
            const qualityIssues = await this.analyzeQualityIssues(dateThreshold);
            
            // Generate recommendations
            const recommendations = this.generateRecommendations(stats, successRate, (problematicRows as any[]).length);
            
            return {
                totalAttempts: stats.totalAttempts,
                successfulRecognitions: stats.successfulRecognitions,
                successRate: Math.round(successRate * 100) / 100,
                averageConfidence: Math.round((stats.avgSuccessConfidence || 0) * 100) / 100,
                problematicUsers: (problematicRows as any[]).map(row => ({
                    studentId: row.studentId,
                    studentName: row.studentName || 'Unknown',
                    attempts: row.attempts,
                    successRate: Math.round((row.successes * 100.0 / row.attempts) * 100) / 100,
                    lastFailureDate: row.lastFailureDate ? new Date(row.lastFailureDate) : new Date()
                })),
                qualityIssues,
                recommendations
            };
            
        } catch (error) {
            console.error('❌ Error getting face analytics:', error);
            throw error;
        }
    }
    
    /**
     * Analyze common quality issues from failed attempts
     */
    private static async analyzeQualityIssues(dateThreshold: Date): Promise<Array<{
        issue: string;
        count: number;
        percentage: number;
    }>> {
        try {
            const [failedRows] = await db.execute(`
                SELECT COUNT(*) as failedCount
                FROM captured_images 
                WHERE captured_at >= ?
                AND recognition_result = 'FAILED'
            `, [dateThreshold]);
            
            const totalFailed = (failedRows as any[])[0].failedCount;
            
            if (totalFailed === 0) {
                return [];
            }
            
            // Analyze confidence patterns to infer quality issues
            const [lowConfidenceRows] = await db.execute(`
                SELECT COUNT(*) as count
                FROM captured_images 
                WHERE captured_at >= ?
                AND recognition_result = 'FAILED'
                AND confidence < 30
            `, [dateThreshold]);
            
            const [mediumConfidenceRows] = await db.execute(`
                SELECT COUNT(*) as count
                FROM captured_images 
                WHERE captured_at >= ?
                AND recognition_result = 'FAILED'
                AND confidence >= 30 AND confidence < 50
            `, [dateThreshold]);
            
            const issues = [];
            
            const lowConfidenceCount = (lowConfidenceRows as any[])[0].count;
            const mediumConfidenceCount = (mediumConfidenceRows as any[])[0].count;
            
            if (lowConfidenceCount > 0) {
                issues.push({
                    issue: 'Very low confidence (< 30%) - likely poor image quality or lighting',
                    count: lowConfidenceCount,
                    percentage: Math.round((lowConfidenceCount / totalFailed) * 10000) / 100
                });
            }
            
            if (mediumConfidenceCount > 0) {
                issues.push({
                    issue: 'Medium confidence (30-50%) - possible face changes or partial obstruction',
                    count: mediumConfidenceCount,
                    percentage: Math.round((mediumConfidenceCount / totalFailed) * 10000) / 100
                });
            }
            
            return issues;
            
        } catch (error) {
            console.error('❌ Error analyzing quality issues:', error);
            return [];
        }
    }
    
    /**
     * Generate intelligent recommendations based on analytics
     */
    private static generateRecommendations(
        stats: any, 
        successRate: number, 
        problematicUsersCount: number
    ): string[] {
        const recommendations = [];
        
        // Success rate recommendations
        if (successRate < 80) {
            recommendations.push('🚨 CRITICAL: Overall success rate is below 80%. Consider adjusting recognition thresholds.');
        } else if (successRate < 90) {
            recommendations.push('⚠️ WARNING: Success rate could be improved. Monitor problematic users closely.');
        }
        
        // Problematic users recommendations
        if (problematicUsersCount > 5) {
            recommendations.push('👥 HIGH: Many users with recognition issues. Consider implementing re-registration workflow.');
        } else if (problematicUsersCount > 0) {
            recommendations.push('👤 MEDIUM: Some users need attention. Review their face templates and consider updates.');
        }
        
        // Volume recommendations
        if (stats.totalAttempts > 1000) {
            recommendations.push('📊 INFO: High volume detected. Monitor system performance and consider scaling.');
        }
        
        // Confidence recommendations
        if (stats.avgSuccessConfidence < 75) {
            recommendations.push('🎯 OPTIMIZE: Average confidence is low. Review image quality requirements.');
        }
        
        // Default positive feedback
        if (successRate >= 90 && problematicUsersCount <= 2) {
            recommendations.push('✅ EXCELLENT: System performance is optimal. Continue monitoring.');
        }
        
        return recommendations;
    }
    
    /**
     * Get detailed user analytics
     */
    static async getUserAnalytics(studentId: string, days: number = 30): Promise<{
        totalAttempts: number;
        successRate: number;
        averageConfidence: number;
        recentTrend: 'improving' | 'stable' | 'declining';
        needsAttention: boolean;
        recommendations: string[];
    }> {
        try {
            const dateThreshold = new Date();
            dateThreshold.setDate(dateThreshold.getDate() - days);
            
            const [userStatsRows] = await db.execute(`
                SELECT 
                    COUNT(*) as totalAttempts,
                    SUM(CASE WHEN recognition_result = 'SUCCESS' THEN 1 ELSE 0 END) as successes,
                    AVG(CASE WHEN recognition_result = 'SUCCESS' THEN confidence ELSE NULL END) as avgConfidence
                FROM captured_images 
                WHERE studentId = ? 
                AND captured_at >= ?
                AND recognition_result IN ('SUCCESS', 'FAILED')
            `, [studentId, dateThreshold]);
            
            const userStats = (userStatsRows as any[])[0];
            const successRate = userStats.totalAttempts > 0 ? 
                Math.round((userStats.successes / userStats.totalAttempts) * 10000) / 100 : 0;
            
            // Analyze recent trend (last week vs previous weeks)
            const trend = await this.analyzeTrend(studentId, days);
            
            // Determine if user needs attention
            const needsAttention = successRate < 70 || userStats.totalAttempts > 10;
            
            // Generate user-specific recommendations
            const recommendations = [];
            if (successRate < 50) {
                recommendations.push('🚨 Critical: Very low success rate. Consider face re-registration.');
            } else if (successRate < 70) {
                recommendations.push('⚠️ Warning: Below average success rate. Monitor closely.');
            }
            
            if (userStats.avgConfidence < 70) {
                recommendations.push('📸 Suggestion: Image quality appears low. Check camera and lighting.');
            }
            
            return {
                totalAttempts: userStats.totalAttempts,
                successRate,
                averageConfidence: Math.round((userStats.avgConfidence || 0) * 100) / 100,
                recentTrend: trend,
                needsAttention,
                recommendations
            };
            
        } catch (error) {
            console.error('❌ Error getting user analytics:', error);
            throw error;
        }
    }
    
    /**
     * Analyze trend for a specific user
     */
    private static async analyzeTrend(studentId: string, days: number): Promise<'improving' | 'stable' | 'declining'> {
        try {
            const midPoint = Math.floor(days / 2);
            const dateThreshold = new Date();
            dateThreshold.setDate(dateThreshold.getDate() - days);
            
            const midDate = new Date();
            midDate.setDate(midDate.getDate() - midPoint);
            
            // Get recent performance (last half of period)
            const [recentRows] = await db.execute(`
                SELECT 
                    COUNT(*) as attempts,
                    SUM(CASE WHEN recognition_result = 'SUCCESS' THEN 1 ELSE 0 END) as successes
                FROM captured_images 
                WHERE studentId = ? 
                AND captured_at >= ?
                AND recognition_result IN ('SUCCESS', 'FAILED')
            `, [studentId, midDate]);
            
            // Get older performance (first half of period)
            const [olderRows] = await db.execute(`
                SELECT 
                    COUNT(*) as attempts,
                    SUM(CASE WHEN recognition_result = 'SUCCESS' THEN 1 ELSE 0 END) as successes
                FROM captured_images 
                WHERE studentId = ? 
                AND captured_at >= ? AND captured_at < ?
                AND recognition_result IN ('SUCCESS', 'FAILED')
            `, [studentId, dateThreshold, midDate]);
            
            const recentStats = (recentRows as any[])[0];
            const olderStats = (olderRows as any[])[0];
            
            if (recentStats.attempts < 3 || olderStats.attempts < 3) {
                return 'stable'; // Not enough data
            }
            
            const recentRate = recentStats.successes / recentStats.attempts;
            const olderRate = olderStats.successes / olderStats.attempts;
            
            const improvement = recentRate - olderRate;
            
            if (improvement > 0.1) return 'improving';
            if (improvement < -0.1) return 'declining';
            return 'stable';
            
        } catch (error) {
            console.error('❌ Error analyzing trend:', error);
            return 'stable';
        }
    }
}