import jwt, { SignOptions } from 'jsonwebtoken'

export interface JWTPayload {
    userId: string;
    userType: 'student' | 'admin';
    name: string;
}

export class JWTUtils {
    private static readonly SECRET = process.env.JWT_SECRET || 'default_secret_key';
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