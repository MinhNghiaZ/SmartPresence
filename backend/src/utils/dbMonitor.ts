/**
 * Database Connection Pool Monitor
 * 
 * Provides utilities to monitor the health and performance of the database connection pool.
 * Useful for debugging and performance optimization.
 */

import { db } from '../database/connection';
import { logger } from './logger';

interface PoolStats {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    queuedRequests: number;
    timestamp: string;
}

/**
 * Get current connection pool statistics
 */
export async function getPoolStats(): Promise<PoolStats> {
    try {
        const pool = db as any;
        
        // Access pool internals (mysql2 specific)
        const poolInfo = pool.pool;
        
        return {
            totalConnections: poolInfo._allConnections?.length || 0,
            activeConnections: poolInfo._acquiringConnections?.length || 0,
            idleConnections: poolInfo._freeConnections?.length || 0,
            queuedRequests: poolInfo._connectionQueue?.length || 0,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        logger.error('Failed to get pool stats', error);
        return {
            totalConnections: 0,
            activeConnections: 0,
            idleConnections: 0,
            queuedRequests: 0,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Log pool statistics (for debugging)
 */
export async function logPoolStats(): Promise<void> {
    const stats = await getPoolStats();
    logger.info('Database pool stats', stats);
}

/**
 * Check if pool is healthy
 * Returns warnings if pool is under stress
 */
export async function checkPoolHealth(): Promise<{
    healthy: boolean;
    warnings: string[];
    stats: PoolStats;
}> {
    const stats = await getPoolStats();
    const warnings: string[] = [];
    let healthy = true;

    // Check if too many connections are active (>80% of pool)
    const utilizationPercent = (stats.activeConnections / 50) * 100;
    if (utilizationPercent > 80) {
        warnings.push(`High pool utilization: ${utilizationPercent.toFixed(1)}%`);
        healthy = false;
    }

    // Check if requests are queuing up
    if (stats.queuedRequests > 20) {
        warnings.push(`High queue depth: ${stats.queuedRequests} requests waiting`);
        healthy = false;
    }

    // Check if very few idle connections
    if (stats.idleConnections < 5 && stats.totalConnections > 30) {
        warnings.push(`Low idle connections: only ${stats.idleConnections} available`);
    }

    if (warnings.length > 0) {
        logger.warn('Database pool health warnings', { stats, warnings });
    }

    return { healthy, warnings, stats };
}

/**
 * Start periodic health monitoring (optional, for production monitoring)
 * Call this from server startup if you want continuous monitoring
 */
export function startPoolMonitoring(intervalMs: number = 60000): NodeJS.Timeout {
    logger.info('Starting database pool monitoring', { intervalMs });
    
    return setInterval(async () => {
        const health = await checkPoolHealth();
        if (!health.healthy) {
            logger.warn('Database pool health check failed', health);
        }
    }, intervalMs);
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
    try {
        await db.query('SELECT 1');
        return true;
    } catch (error) {
        logger.error('Database connection test failed', error);
        return false;
    }
}
