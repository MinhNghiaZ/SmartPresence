import db from "../../database/connection";
import { User, LoginRequest, LoginResult } from "../../models/student";
import { JWTUtils, JWTPayload } from "../../utils/jwt";
import { PasswordUtils } from "../../utils/passwordUtils";
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
            let isPasswordValid = false;
            
            // Kiểm tra xem password có được hash không
            if (PasswordUtils.isHashed(user.password)) {
                // Password đã được hash, sử dụng bcrypt để so sánh
                isPasswordValid = await PasswordUtils.comparePassword(password, user.password);
            } else {
                // Password chưa được hash (legacy), so sánh trực tiếp
                isPasswordValid = user.password === password;
            }

            if (!isPasswordValid) {
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

    static async changePassword(
        studentId: string, 
        currentPassword: string, 
        newPassword: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            // Validate input
            if (!studentId || !currentPassword || !newPassword) {
                return {
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin!'
                };
            }

            // Validate new password strength
            const passwordValidation = PasswordUtils.validatePasswordStrength(newPassword);
            if (!passwordValidation.isValid) {
                return {
                    success: false,
                    message: passwordValidation.errors.join(', ')
                };
            }

            // First, verify current password
            let user = null;
            let tableName = '';

            // Check if it's a student account
            try {
                const [studentRow] = await db.execute(
                    'SELECT * FROM StudentAccount WHERE studentId = ?',
                    [studentId]
                );

                if ((studentRow as any[]).length > 0) {
                    user = (studentRow as any[])[0];
                    tableName = 'StudentAccount';
                }
            } catch (error) {
                console.error('Error checking student table:', error);
            }

            // If not found in student table, check admin table
            if (!user) {
                try {
                    const [adminRow] = await db.execute(
                        'SELECT * FROM AdminAccount WHERE id = ?',
                        [studentId]
                    );

                    if ((adminRow as any[]).length > 0) {
                        user = (adminRow as any[])[0];
                        tableName = 'AdminAccount';
                    }
                } catch (error) {
                    console.error('Error checking admin table:', error);
                }
            }

            // User not found
            if (!user) {
                return {
                    success: false,
                    message: 'Tài khoản không tồn tại!'
                };
            }

            // Verify current password
            let isCurrentPasswordValid = false;
            
            if (PasswordUtils.isHashed(user.password)) {
                // Password đã được hash, sử dụng bcrypt để so sánh
                isCurrentPasswordValid = await PasswordUtils.comparePassword(currentPassword, user.password);
            } else {
                // Password chưa được hash (legacy), so sánh trực tiếp
                isCurrentPasswordValid = user.password === currentPassword;
            }

            if (!isCurrentPasswordValid) {
                return {
                    success: false,
                    message: 'Mật khẩu hiện tại không đúng!'
                };
            }

            // Hash new password
            const hashedNewPassword = await PasswordUtils.hashPassword(newPassword);

            // Update password
            const updateField = tableName === 'StudentAccount' ? 'studentId' : 'id';
            await db.execute(
                `UPDATE ${tableName} SET password = ? WHERE ${updateField} = ?`,
                [hashedNewPassword, studentId]
            );

            console.log(`Password updated for ${studentId} in ${tableName}`);
            
            return {
                success: true,
                message: 'Đổi mật khẩu thành công!'
            };

        } catch (error) {
            console.error('Change password service error:', error);
            return {
                success: false,
                message: 'Lỗi hệ thống khi đổi mật khẩu!'
            };
        }
    }
}