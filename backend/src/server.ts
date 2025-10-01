import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Import routes
import { authRoutes, gpsRoutes, faceRoutes, storageRoutes } from './routes';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

console.log('🚀 Starting SmartPresence Backend Server...');

// CORS - Allow frontend to call API
app.use(cors({
    origin: ['http://localhost:5173', 'https://localhost:5173'],
    credentials: true
}));

// JSON Parser
app.use(express.json({ limit: '10mb' })); // Increased limit for face images
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/gps', gpsRoutes);
app.use('/api/face', faceRoutes);
app.use('/api/storage', storageRoutes);

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
    
    console.log('\n🏥 Health Check:');
    console.log(`   GET  http://localhost:${PORT}/api/health`);
    
    console.log('\n🎯 Ready for frontend connections!');
});

export default app;