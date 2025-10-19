import jwt, { SignOptions } from 'jsonwebtoken'

export interface JWTPayload {
    userId: string;
    userType: 'student' | 'admin';
    name: string;
    // Thêm các field để tăng cường bảo mật
    iat?: number; // issued at time
    authHash?: string; // hash để verify tính toàn vẹn của payload
}

export class JWTUtils {
    // ⚠️ NO FALLBACK - JWT_SECRET must be set in environment variables
    private static readonly SECRET = (() => {
        if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'YOUR_SECURE_JWT_SECRET_HERE_REPLACE_THIS_VALUE') {
            throw new Error(
                '🔴 CRITICAL: JWT_SECRET is not set or using default value!\n' +
                'Generate a secure secret with: node -e "console.log(require(\'crypto\').randomBytes(64).toString(\'hex\'))"'
            );
        }
        return process.env.JWT_SECRET;
    })();
    
    private static readonly EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

    //generate JWT token
    static generateToken(payload: JWTPayload): string {
        try {
            const option: SignOptions = {
                expiresIn: this.EXPIRES_IN as any,
                issuer: 'smartpresence'
            }
            const token = jwt.sign(payload, this.SECRET, option);
            return token;
        } catch (error) {
            console.error(error);
            throw new Error('cant generate token');
        }
    }

    static verifyToken(token: string): JWTPayload | null {
        try {
            const decoded = jwt.verify(token, this.SECRET) as JWTPayload;
            return decoded;
        } catch (error) {
            console.error(error);
            return null;
        }
    }
}