import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import { authRoutes, gpsRoutes, faceRoutes, storageRoutes, subjectRoutes, attendanceRoutes } from './routes';

// Import services
import { CronJobService } from './services/CronJobService';

// Load environment variables
dotenv.config();

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
        'https://127.0.0.1:5174'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// JSON Parser
app.use(express.json({ limit: '10mb' })); // Increased limit for face images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
    console.log(`📝 ${new Date().toISOString()} - ${req.method} ${req.url}`);
    console.log('📝 Headers:', JSON.stringify(req.headers, null, 2));
    console.log('📝 Body:', JSON.stringify(req.body, null, 2));
    next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/face', faceRoutes);
app.use('/api/storage', storageRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/attendance', attendanceRoutes);

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
    console.log('\n📋 Available API Endpoints:\n');

    console.log('🔐 Authentication:');
    console.log(`   POST http://localhost:${PORT}/api/auth/login`);
    console.log(`   POST http://localhost:${PORT}/api/auth/logout`);
    console.log(`   GET  http://localhost:${PORT}/api/auth/me (Protected)`);
    console.log(`   GET  http://localhost:${PORT}/api/auth/admin/dashboard (Admin only)`);
    console.log(`   GET  http://localhost:${PORT}/api/auth/student/profile (Student only)`);
    console.log(`   POST http://localhost:${PORT}/api/auth/admin/create-student (Admin only)`);
    
    console.log('\n📍 GPS Validation:');
    console.log(`   POST http://localhost:${PORT}/api/gps/validate-location`);
    
    console.log('\n👤 Face Recognition:');
    console.log(`   POST http://localhost:${PORT}/api/face/register`);
    console.log(`   POST http://localhost:${PORT}/api/face/recognize`);
    console.log(`   GET  http://localhost:${PORT}/api/face/check/:studentId`);
    console.log(`   POST http://localhost:${PORT}/api/face/validate`);
    console.log(`   GET  http://localhost:${PORT}/api/face/stats (Admin)`);
    console.log(`   DELETE http://localhost:${PORT}/api/face/:studentId (Admin)`);
    
    console.log('\n📦 Storage - Captured Images:');
    console.log(`   GET  http://localhost:${PORT}/api/storage/captured-images`);
    console.log(`   GET  http://localhost:${PORT}/api/storage/captured-images/stats`);
    console.log(`   GET  http://localhost:${PORT}/api/storage/captured-images/student/:studentId`);
    console.log(`   GET  http://localhost:${PORT}/api/storage/captured-images/:imageId`);
    console.log(`   DELETE http://localhost:${PORT}/api/storage/captured-images/:imageId`);
    console.log(`   DELETE http://localhost:${PORT}/api/storage/captured-images (Admin)`);
    console.log(`   GET  http://localhost:${PORT}/api/storage/captured-images/date-range`);
    console.log(`   POST http://localhost:${PORT}/api/storage/cleanup (Admin)`);
    
    console.log('\n📚 Subject Management:');
    console.log(`   GET  http://localhost:${PORT}/api/subjects`);
    console.log(`   GET  http://localhost:${PORT}/api/subjects/student/:studentId`);
    console.log(`   GET  http://localhost:${PORT}/api/subjects/:subjectId/current-timeslot`);
    console.log(`   GET  http://localhost:${PORT}/api/subjects/:subjectId/room-info`);
    console.log(`   GET  http://localhost:${PORT}/api/subjects/:subjectId/enrollment/:studentId`);
    
    console.log('\n✅ Attendance System:');
    console.log(`   POST http://localhost:${PORT}/api/attendance/check-in`);
    console.log(`   GET  http://localhost:${PORT}/api/attendance/history/:studentId`);
    console.log(`   GET  http://localhost:${PORT}/api/attendance/stats/:studentId`);
    console.log(`   GET  http://localhost:${PORT}/api/attendance/today/:studentId`);
    console.log(`   GET  http://localhost:${PORT}/api/attendance/subject/:subjectId/session-status`);
    console.log(`   GET  http://localhost:${PORT}/api/attendance/subject/:subjectId/students-stats`);
    console.log(`   DELETE http://localhost:${PORT}/api/attendance/:attendanceId (Admin)`);
    
    console.log('\n🏥 Health Check:');
    console.log(`   GET  http://localhost:${PORT}/api/health`);
    
    console.log('\n🎯 Ready for frontend connections!');
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