import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import { authRoutes, gpsRoutes, faceRoutes, storageRoutes, subjectRoutes, attendanceRoutes } from './routes';
import monitoringRoutes from './routes/monitoringRoutes';

// Import services
import { CronJobService } from './services/CronJobService';

// Load environment variables
dotenv.config();

// 🔇 Disable verbose logging in production mode
if (process.env.NODE_ENV === 'production') {
    console.log = () => {};
    console.info = () => {};
    console.debug = () => {};
    // Keep console.error and console.warn for important messages
}

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Starting SmartPresence Backend Server...');

// CORS - Allow frontend to call API (support both HTTP and HTTPS on multiple ports)
app.use(cors({
    origin: [
        'http://localhost:5173', 
        'https://localhost:5173',
        'http://localhost:5174', 
        'https://localhost:5174',
        'http://127.0.0.1:5173',
        'https://127.0.0.1:5173',
        'http://127.0.0.1:5174',
        'https://127.0.0.1:5174',
        'https://sas.eiu.com.vn'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// JSON Parser
app.use(express.json({ limit: '10mb' })); // Increased limit for face images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/face', faceRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/monitoring', monitoringRoutes); // ✨ NEW: Success rate monitoring

// Start Cron Jobs for automated tasks
console.log('🚀 Starting automated services...');
CronJobService.startAllJobs();

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'SmartPresence Backend is running!',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// 404 handler
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: `route ${req.method} ${req.path} not found`
    });
});

//Global error handler
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
    console.error('server error:', error);
    res.status(500).json({
        success: false,
        message: 'Internal server error!'
    });
});

//Start server
app.listen(PORT, () => {
    console.log('✅ SmartPresence Backend Server is RUNNING!');
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`⏰ Started at: ${new Date().toLocaleString()}`);
    console.log('✅ Health check: http://localhost:' + PORT + '/api/health');
});

// Global error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('🚨 Global error handler caught:', error);
    console.error('🚨 Error stack:', error.stack);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully...');
    CronJobService.stopAllJobs();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully...');
    CronJobService.stopAllJobs();
    process.exit(0);
});

export default app;