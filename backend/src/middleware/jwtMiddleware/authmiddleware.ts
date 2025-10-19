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
        return;

    } catch (error) {
        console.error('❌ authenticateToken error:', error);
        return res.status(500).json({
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
        res.status(401).json({
            success: false,
            message: 'Please login!'
        });
        return;
    }

    console.log('🔒 User type:', req.user.userType);
    if (req.user.userType !== 'admin') {
        console.log('❌ User is not admin');
        res.status(403).json({
            success: false,
            message: 'Only admin!'
        });
        return;
    }

    console.log('✅ Admin access granted');
    next();
};

// Check if user is student
export const requireStudent = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        res.status(401).json({
            success: false,
            message: 'Login please!'
        });
        return;
    }

    if (req.user.userType !== 'student') {
        res.status(403).json({
            success: false,
            message: 'Only Student!'
        });
        return;
    }
    
    next();
};

// Check if user can access their own data or if admin
export const requireOwnershipOrAdmin = (req: Request, res: Response, next: NextFunction) => {
    console.log('🔒 requireOwnershipOrAdmin middleware called');
    
    if (!req.user) {
        console.log('❌ No user in request');
        res.status(401).json({
            success: false,
            message: 'Please login!'
        });
        return;
    }

    // Admin can access all data
    if (req.user.userType === 'admin') {
        console.log('✅ Admin access granted');
        next();
        return;
    }

    // Student can only access their own data
    if (req.user.userType === 'student') {
        const targetStudentId = req.params.studentId || req.body.studentId || req.query.studentId;
        const currentUserId = req.user.id || req.user.studentId;
        
        console.log('🔒 Checking ownership - Current user:', currentUserId, 'Target:', targetStudentId);
        
        if (!targetStudentId) {
            console.log('❌ No target student ID found');
            res.status(400).json({
                success: false,
                message: 'Student ID required!'
            });
            return;
        }

        if (currentUserId.toString() !== targetStudentId.toString()) {
            console.log('❌ Ownership mismatch');
            res.status(403).json({
                success: false,
                message: 'You can only access your own data!'
            });
            return;
        }

        console.log('✅ Ownership verified');
        next();
        return;
    }

    console.log('❌ Invalid user type');
    res.status(403).json({
        success: false,
        message: 'Access denied!'
    });
};

// Check if user is authenticated (either admin or student)
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    console.log('🔒 requireAuth middleware called');
    
    if (!req.user) {
        console.log('❌ No user in request');
        res.status(401).json({
            success: false,
            message: 'Please login!'
        });
        return;
    }

    if (!['admin', 'student'].includes(req.user.userType)) {
        console.log('❌ Invalid user type:', req.user.userType);
        res.status(403).json({
            success: false,
            message: 'Invalid user type!'
        });
        return;
    }

    console.log('✅ Auth verified for user type:', req.user.userType);
    next();
};