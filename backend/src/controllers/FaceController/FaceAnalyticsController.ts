import { Request, Response } from 'express';
import { FaceAnalyticsService } from '../../services/FaceService/FaceAnalyticsService';

export class FaceAnalyticsController {
    
    /**
     * GET /api/face/analytics
     * Get overall face recognition analytics (Admin only)
     */
    static async getOverallAnalytics(req: Request, res: Response) {
        try {
            const days = parseInt(req.query.days as string) || 30;
            
            if (days < 1 || days > 365) {
                return res.status(400).json({
                    success: false,
                    message: 'Days parameter must be between 1 and 365'
                });
            }
            
            console.log(`📊 Getting face analytics for last ${days} days`);
            const analytics = await FaceAnalyticsService.getAnalytics(days);
            
            return res.json({
                success: true,
                analytics,
                period: {
                    days,
                    startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
                    endDate: new Date()
                }
            });
            
        } catch (error) {
            console.error('❌ Analytics API error:', error);
            return res.status(500).json({
                success: false,
                message: 'System error getting analytics'
            });
        }
    }
    
    /**
     * GET /api/face/analytics/user/:studentId
     * Get user-specific analytics (Admin only)
     */
    static async getUserAnalytics(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            const days = parseInt(req.query.days as string) || 30;
            
            if (!studentId) {
                return res.status(400).json({
                    success: false,
                    message: 'Student ID is required'
                });
            }
            
            console.log(`👤 Getting analytics for user ${studentId} (${days} days)`);
            const userAnalytics = await FaceAnalyticsService.getUserAnalytics(studentId, days);
            
            return res.json({
                success: true,
                studentId,
                analytics: userAnalytics,
                period: {
                    days,
                    startDate: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
                    endDate: new Date()
                }
            });
            
        } catch (error) {
            console.error('❌ User analytics API error:', error);
            return res.status(500).json({
                success: false,
                message: 'System error getting user analytics'
            });
        }
    }
    
    /**
     * GET /api/face/analytics/health
     * Get system health status
     */
    static async getSystemHealth(req: Request, res: Response) {
        try {
            // Get recent analytics (last 7 days)
            const analytics = await FaceAnalyticsService.getAnalytics(7);
            
            // Determine health status
            const healthStatus = {
                status: 'healthy' as 'healthy' | 'warning' | 'critical',
                score: 0,
                issues: [] as string[],
                metrics: {
                    successRate: analytics.successRate,
                    totalAttempts: analytics.totalAttempts,
                    problematicUsersCount: analytics.problematicUsers.length,
                    averageConfidence: analytics.averageConfidence
                }
            };
            
            // Calculate health score (0-100)
            let score = 100;
            
            // Success rate impact (0-40 points)
            if (analytics.successRate >= 95) score += 0; // Perfect
            else if (analytics.successRate >= 90) score -= 5; // Good
            else if (analytics.successRate >= 80) score -= 15; // Warning
            else if (analytics.successRate >= 70) score -= 25; // Poor
            else score -= 40; // Critical
            
            // Problematic users impact (0-20 points)
            const problematicRate = analytics.totalAttempts > 0 ? 
                (analytics.problematicUsers.length / analytics.totalAttempts) * 100 : 0;
            if (problematicRate > 10) score -= 20;
            else if (problematicRate > 5) score -= 10;
            else if (problematicRate > 2) score -= 5;
            
            // Confidence impact (0-20 points)
            if (analytics.averageConfidence < 60) score -= 20;
            else if (analytics.averageConfidence < 70) score -= 10;
            else if (analytics.averageConfidence < 80) score -= 5;
            
            // Volume impact (0-20 points bonus for active usage)
            if (analytics.totalAttempts > 100) score += 10; // Active system
            else if (analytics.totalAttempts < 10) score -= 10; // Too low usage
            
            healthStatus.score = Math.max(0, Math.min(100, score));
            
            // Determine status and issues
            if (healthStatus.score >= 90) {
                healthStatus.status = 'healthy';
            } else if (healthStatus.score >= 70) {
                healthStatus.status = 'warning';
                if (analytics.successRate < 90) {
                    healthStatus.issues.push('Success rate below optimal (90%)');
                }
                if (analytics.problematicUsers.length > 5) {
                    healthStatus.issues.push('High number of problematic users');
                }
            } else {
                healthStatus.status = 'critical';
                if (analytics.successRate < 80) {
                    healthStatus.issues.push('Critical: Success rate below 80%');
                }
                if (analytics.problematicUsers.length > 10) {
                    healthStatus.issues.push('Critical: Too many problematic users');
                }
                if (analytics.averageConfidence < 70) {
                    healthStatus.issues.push('Critical: Low average confidence');
                }
            }
            
            res.json({
                success: true,
                health: healthStatus,
                timestamp: new Date(),
                period: 'Last 7 days'
            });
            
        } catch (error) {
            console.error('❌ Health check API error:', error);
            res.status(500).json({
                success: false,
                message: 'System error checking health',
                health: {
                    status: 'critical',
                    score: 0,
                    issues: ['System error - unable to determine health'],
                    metrics: {}
                }
            });
        }
    }
    
    /**
     * POST /api/face/analytics/recommendations
     * Get intelligent recommendations for improving system performance
     */
    static async getRecommendations(req: Request, res: Response) {
        try {
            const { targetSuccessRate = 95, days = 30 } = req.body;
            
            const analytics = await FaceAnalyticsService.getAnalytics(days);
            const recommendations = [];
            
            // Analyze current performance vs target
            const performanceGap = targetSuccessRate - analytics.successRate;
            
            if (performanceGap > 0) {
                recommendations.push({
                    type: 'improvement',
                    priority: 'high',
                    title: 'Increase Recognition Success Rate',
                    description: `Current rate (${analytics.successRate}%) is ${performanceGap.toFixed(1)}% below target (${targetSuccessRate}%)`,
                    actions: [
                        'Review and adjust recognition thresholds',
                        'Implement multi-template face storage',
                        'Add image quality validation',
                        'Provide better user guidance for face positioning'
                    ]
                });
            }
            
            // Problematic users recommendations
            if (analytics.problematicUsers.length > 0) {
                recommendations.push({
                    type: 'user_management',
                    priority: analytics.problematicUsers.length > 5 ? 'high' : 'medium',
                    title: 'Address Problematic Users',
                    description: `${analytics.problematicUsers.length} users have success rates below 70%`,
                    actions: [
                        'Contact affected users for face re-registration',
                        'Provide lighting and camera positioning guidance',
                        'Consider manual verification for persistent cases',
                        'Update face templates with better quality images'
                    ]
                });
            }
            
            // Quality issues recommendations
            if (analytics.qualityIssues.length > 0) {
                recommendations.push({
                    type: 'quality',
                    priority: 'medium',
                    title: 'Improve Image Quality',
                    description: 'Quality issues detected in failed recognition attempts',
                    actions: [
                        'Add real-time image quality feedback',
                        'Implement automatic lighting adjustment guidance',
                        'Provide camera positioning tutorials',
                        'Add quality pre-check before recognition attempts'
                    ]
                });
            }
            
            // System optimization
            if (analytics.totalAttempts > 500) {
                recommendations.push({
                    type: 'optimization',
                    priority: 'low',
                    title: 'Performance Optimization',
                    description: 'System is processing high volume - optimize for scale',
                    actions: [
                        'Monitor response times and system load',
                        'Consider caching frequently accessed face templates',
                        'Optimize database queries for analytics',
                        'Implement async processing for non-critical operations'
                    ]
                });
            }
            
            res.json({
                success: true,
                recommendations,
                currentPerformance: {
                    successRate: analytics.successRate,
                    targetSuccessRate,
                    performanceGap: Math.max(0, performanceGap)
                },
                generatedAt: new Date()
            });
            
        } catch (error) {
            console.error('❌ Recommendations API error:', error);
            res.status(500).json({
                success: false,
                message: 'System error generating recommendations'
            });
        }
    }
}