import db from "../../database/connection";
import { User, LoginRequest, LoginResult } from "../../models/student";
import { JWTUtils, JWTPayload } from "../../utils/jwt";
export class AuthService {
    static async login(credentials: LoginRequest): Promise<LoginResult> {

        try {
            const { userId, password } = credentials;
            if (!userId || !password) {
                return {
                    success: false,
                    message: 'enter userId and password'
                };
            }

            let user = null;
            let userType: 'student' | 'admin' = 'student';

            // find account in student table
            try {
                console.log('checking student Table');
                const [studentRow] = await db.execute(
                    'SELECT * FROM StudentAccount WHERE studentId = ?',
                    [userId]
                )

                if ((studentRow as any[]).length > 0) {
                    user = (studentRow as any[])[0];
                    userType = 'student';
                    console.log('found in student table');
                }
            } catch (error) {
                console.log(error);
            }

            //find account in admin table
            if (!user) {
                try {
                    console.log('checking admin Table');
                    const [AdminRow] = await db.execute(
                        'SELECT * FROM AdminAccount WHERE id = ?',
                        [userId]
                    )

                    if ((AdminRow as any[]).length > 0) {
                        user = (AdminRow as any[])[0];
                        userType = 'admin';
                        console.log('found in Admin table');
                    }
                } catch (error) {
                    console.log(error);
                }
            }

            // cant find user
            if (!user) {
                console.log('user not found');
                return {
                    success: false,
                    message: 'account not exist'
                }
            }

            //check password
            if (user.password !== password) {
                console.log('invalid password');
                return {
                    success: false,
                    message: 'wrong password'
                };
            }
            // Generate JWT token
            const tokenPayload: JWTPayload = {
                userId: user.studentId || user.id,
                userType: userType,
                name: user.name,
            };

            const token = JWTUtils.generateToken(tokenPayload);

            const { password: _, ...userWithoutPassword } = user;
            return {
                success: true,
                message: 'welcome',
                User: {
                    ...userWithoutPassword,
                    id: user.studentId || user.id, // Ensure 'id' field exists for both student and admin
                    userType: userType
                },
                token: token
            };
        } catch (error) {
            console.error('❌ Auth Service Error:', error);
            return {
                success: false,
                message: 'Error occur!'
            }
        }
    }

    static async verifyUserToken(token: string): Promise<{ success: boolean, user?: any, message: string }> {
        try {
            //check token
            const decoded = JWTUtils.verifyToken(token);
            if (!decoded) {
                return {
                    success: false,
                    message: 'token not exist or expired'
                };
            };

            let user = null;

            //check database
            if (decoded.userType === 'student') {
                const [row] = await db.execute(
                    'SELECT * FROM StudentAccount WHERE studentId = ?',
                    [decoded.userId]
                )
                user = (row as any[])[0];
            } else {
                const [row] = await db.execute(
                    'SELECT * FROM AdminAccount WHERE id = ?',
                    [decoded.userId]
                )
                user = (row as any[])[0];
            }

            if (!user) {
                return {
                    success: false,
                    message: 'user not exist'
                };
            };

            //return user
            const { password: _, ...userWithoutPassword } = user;
            return {
                success: true,
                message: 'token allow!',
                user: {
                    ...userWithoutPassword,
                    userType: decoded.userType
                }
            };

        } catch (error) {
            console.error(error);
            return {
                success: false,
                message: 'token failed'
            }
        }
    }
}