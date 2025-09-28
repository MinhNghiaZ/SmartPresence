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
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if(!token){
            return res.status(401).json({
                success: false,
                message: 'cant get token'
            });
        }

        console.log('verify token');
        const result = await AuthService.verifyUserToken(token);

        if(!result.success){
            return res.status(403).json({
                success: false,
                message: result.message
            });
        }

        req.user = result.user;
        next();

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'token failed'
        });
    }
};

// Check if user is admin
export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: 'Please login!'
        });
    }

    if (req.user.userType !== 'admin') {
        return res.status(403).json({
            success: false,
            message: 'Only admin!'
        });
    }

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