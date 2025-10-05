import { Request, Response, NextFunction } from "express";
import { AuthService } from "../../services/AuthService/authService";

declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

// verifyToken
export const authenticateToken = async (req: Request, res: Response, next: NextFunction) => {
    try {
        console.log('🔑 authenticateToken middleware called');
        console.log('🔑 Request URL:', req.url);
        console.log('🔑 Request method:', req.method);
        
        const authHeader = req.headers['authorization'];
        console.log('🔑 Auth header:', authHeader ? 'Present' : 'Missing');
        
        const token = authHeader && authHeader.split(' ')[1];

        if(!token){
            console.log('❌ No token found');
            return res.status(401).json({
                success: false,
                message: 'cant get token'
            });
        }

        console.log('🔑 Token found, verifying...');
        const result = await AuthService.verifyUserToken(token);

        if(!result.success){
            console.log('❌ Token verification failed:', result.message);
            return res.status(403).json({
                success: false,
                message: result.message
            });
        }

        console.log('✅ Token verified, user:', result.user?.id, result.user?.userType);
        req.user = result.user;
        next();

    } catch (error) {
        console.error('❌ authenticateToken error:', error);
        res.status(500).json({
            success: false,
            message: 'token failed'
        });
    }
};

// Check if user is admin
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    console.log('🔒 requireAdmin middleware called');
    console.log('🔒 req.user:', req.user);
    
    if (!req.user) {
        console.log('❌ No user in request');
        return res.status(401).json({
            success: false,
            message: 'Please login!'
        });
    }

    console.log('🔒 User type:', req.user.userType);
    if (req.user.userType !== 'admin') {
        console.log('❌ User is not admin');
        return res.status(403).json({
            success: false,
            message: 'Only admin!'
        });
    }

    console.log('✅ Admin access granted');
    next();
};

// Check if user is student
export const requireStudent = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Login please!'
        });
    }

    if (req.user.userType !== 'student') {
        return res.status(403).json({
            success: false,
            message: 'Only Student!'
        });
    }

    next();
};