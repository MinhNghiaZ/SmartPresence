/**
 * Login Rate Limiter - USER-BASED (not IP-based)
 * 
 * Designed for environments where many users share the same network/IP:
 * - 200 users on same WiFi
 * - Rate limiting by userId instead of IP
 * - 10 login attempts per minute per user
 * - Prevents brute force attacks
 * - In-memory store (production-ready for single server)
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

interface RateLimitRecord {
    attempts: number;
    firstAttempt: number;
    blockedUntil?: number;
}

class LoginRateLimiter {
    private attempts: Map<string, RateLimitRecord>;
    private readonly maxAttempts: number = 10;
    private readonly windowMs: number = 60 * 1000; // 1 minute
    private readonly blockDurationMs: number = 5 * 60 * 1000; // 5 minutes block after exceeding
    private cleanupInterval: NodeJS.Timeout;

    constructor() {
        this.attempts = new Map();
        
        // Cleanup old records every 10 minutes to prevent memory leak
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 10 * 60 * 1000);
    }

    private cleanup(): void {
        const now = Date.now();
        let cleaned = 0;

        for (const [userId, record] of this.attempts.entries()) {
            // Remove records older than block duration
            if (now - record.firstAttempt > this.blockDurationMs) {
                this.attempts.delete(userId);
                cleaned++;
            }
        }

        if (cleaned > 0) {
            logger.debug(`Rate limiter cleanup: removed ${cleaned} old records`);
        }
    }

    /**
     * Check if user is allowed to attempt login
     */
    public checkLimit(userId: string): { allowed: boolean; retryAfter?: number; message?: string } {
        const now = Date.now();
        const record = this.attempts.get(userId);

        // No record - first attempt
        if (!record) {
            this.attempts.set(userId, {
                attempts: 1,
                firstAttempt: now
            });
            return { allowed: true };
        }

        // Check if user is currently blocked
        if (record.blockedUntil && now < record.blockedUntil) {
            const retryAfter = Math.ceil((record.blockedUntil - now) / 1000);
            return {
                allowed: false,
                retryAfter,
                message: `Too many login attempts. Please try again in ${retryAfter} seconds.`
            };
        }

        // Check if window has expired - reset counter
        if (now - record.firstAttempt > this.windowMs) {
            this.attempts.set(userId, {
                attempts: 1,
                firstAttempt: now
            });
            return { allowed: true };
        }

        // Within window - check limit
        if (record.attempts >= this.maxAttempts) {
            // Block user for 5 minutes
            record.blockedUntil = now + this.blockDurationMs;
            this.attempts.set(userId, record);
            
            logger.warn(`Rate limit exceeded for user`, { userId });
            
            return {
                allowed: false,
                retryAfter: Math.ceil(this.blockDurationMs / 1000),
                message: `Too many login attempts. Account temporarily locked for 5 minutes.`
            };
        }

        // Increment attempts
        record.attempts++;
        this.attempts.set(userId, record);

        // Warn if approaching limit
        if (record.attempts >= this.maxAttempts - 2) {
            logger.info(`User approaching rate limit`, { 
                userId, 
                attempts: record.attempts, 
                maxAttempts: this.maxAttempts 
            });
        }

        return { allowed: true };
    }

    /**
     * Reset attempts for a user (called after successful login)
     */
    public resetAttempts(userId: string): void {
        this.attempts.delete(userId);
    }

    /**
     * Get current stats (for monitoring)
     */
    public getStats(): { totalTracked: number; blocked: number } {
        const now = Date.now();
        let blocked = 0;

        for (const record of this.attempts.values()) {
            if (record.blockedUntil && now < record.blockedUntil) {
                blocked++;
            }
        }

        return {
            totalTracked: this.attempts.size,
            blocked
        };
    }

    /**
     * Cleanup on shutdown
     */
    public destroy(): void {
        clearInterval(this.cleanupInterval);
        this.attempts.clear();
    }
}

// Singleton instance
const rateLimiter = new LoginRateLimiter();

/**
 * Express middleware for login rate limiting
 * Use this BEFORE authentication logic
 */
export const loginRateLimitMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const userId = req.body.userId;

    // If no userId provided, let it through (will be caught by validation)
    if (!userId) {
        next();
        return;
    }

    const result = rateLimiter.checkLimit(userId);

    if (!result.allowed) {
        res.status(429).json({
            success: false,
            message: result.message,
            retryAfter: result.retryAfter
        });
        return;
    }

    // Store userId in res.locals for use after successful login
    res.locals.rateLimitUserId = userId;
    next();
};

/**
 * Call this after successful login to reset the rate limit counter
 */
export const resetLoginRateLimit = (userId: string): void => {
    rateLimiter.resetAttempts(userId);
};

/**
 * Get rate limiter stats (for admin monitoring)
 */
export const getRateLimiterStats = () => {
    return rateLimiter.getStats();
};

export default rateLimiter;
