import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import db from './database/connection';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

console.log('run server');

// CORS - Allow frontend to call API
app.use(cors({
    origin: ['http://localhost:5173', 'https://localhost:5173'],
    credentials: true
}));

// JSON Parser
app.use(express.json());

console.log('middleware configured')

//sample routes
app.get('/', (req, res) => {
    res.json({
        message: 'back end run success',
        timeStamp: new Date().toISOString(),
        status: 'OK',
        port: PORT
    });
});

app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: 'API is working!',
        timestamp: new Date().toISOString()
    });
});

app.post('/api/echo', (req, res) => {
    res.json({
        success: true,
        message: 'Echo successful!',
        received: req.body,
        timestamp: new Date().toISOString()
    })
})

// route test query for database
app.get('/api/data', async (req, res) => {
    try {
        console.log('query StudentAccount table');
        const [rows] = await db.query("SELECT * FROM StudentAccount");
        res.json(rows);
    } catch (error) {
        console.log(error);
        res.status(500).json({
            success: false,
            message: 'fail to query table'
        })
    }
})

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
    console.log('Server is RUNNING!');
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Time: ${new Date().toLocaleString()}`);
    console.log('\n');

    console.log('Test endpoints:');
    console.log(`GET  http://localhost:${PORT}/`);
    console.log(`GET  http://localhost:${PORT}/api/test`);
    console.log(`POST http://localhost:${PORT}/api/echo`);
    console.log(`GET  http://localhost:${PORT}/api/data`);
});

export default app;