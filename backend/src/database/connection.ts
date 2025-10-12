import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Optimized Database Connection Pool Configuration
 * 
 * Designed for 200 concurrent users scenario:
 * - Connection pool: 50 connections (5x more than before)
 * - Queue limit: 200 (handle peak load)
 * - Timeouts: Configured for production stability
 * 
 * Calculation:
 * - Peak concurrent requests: ~100-150 (50% of 200 users)
 * - Each request holds connection ~50-200ms
 * - 50 connections can handle ~250-500 req/sec
 * - Queue of 200 handles temporary spikes
 */

const dbConfig = {
    host: process.env.DB_HOST?.trim(),
    user: process.env.DB_USER?.trim(),
    password: process.env.DB_PASSWORD?.trim(),
    database: process.env.DB_NAME?.trim(),
    
    // Connection pool settings
    waitForConnections: true,
    connectionLimit: 50, // 🚀 Increased from 10 to 50 (5x improvement)
    queueLimit: 200, // 🚀 Allow 200 queued requests (was 0 = unlimited, now controlled)
    
    // Connection timeout settings
    connectTimeout: 10000, // 10 seconds to establish connection
    acquireTimeout: 15000, // 15 seconds to acquire connection from pool
    timeout: 60000, // 60 seconds query timeout
    
    // Connection health settings
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    
    // Character set
    charset: 'utf8mb4',
    
    // Performance settings
    multipleStatements: false, // Security: prevent SQL injection via multiple statements
    dateStrings: false, // Return dates as Date objects
};

export const db = mysql.createPool(dbConfig);

// Graceful shutdown handler
process.on('SIGTERM', async () => {
    console.log('SIGTERM signal received: closing database pool');
    await db.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT signal received: closing database pool');
    await db.end();
    process.exit(0);
});

export default db;
