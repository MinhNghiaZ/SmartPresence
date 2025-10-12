import db from "../../database/connection";
import { User, LoginRequest, LoginResult } from "../../models/student";
import { JWTUtils, JWTPayload } from "../../utils/jwt";
import { PasswordUtils } from "../../utils/passwordUtils";
import { logger } from "../../utils/logger";
import { RowDataPacket, ResultSetHeader } from 'mysql2';

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
                const [studentRow] = await db.execute(
                    'SELECT * FROM studentaccount WHERE studentId = ?',
                    [userId]
                );

                if ((studentRow as any[]).length > 0) {
                    user = (studentRow as any[])[0];
                    userType = 'student';
                }
            } catch (error) {
                logger.error('Error checking student table', error);
            }

            //find account in admin table
            if (!user) {
                try {
                    const [AdminRow] = await db.execute(
                        'SELECT * FROM adminaccount WHERE id = ?',
                        [userId]
                    );

                    if ((AdminRow as any[]).length > 0) {
                        user = (AdminRow as any[])[0];
                        userType = 'admin';
                    }
                } catch (error) {
                    logger.error('Error checking admin table', error);
                }
            }

            // cant find user
            if (!user) {
                // Don't log user not found - it's expected behavior for wrong credentials
                return {
                    success: false,
                    message: 'account not exist'
                };
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
                // Don't log invalid password - it's expected behavior for wrong credentials
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
                } as any, // Type assertion since admin and student have different schemas
                token: token
            };
        } catch (error) {
            logger.error('Auth Service Error', error);
            return {
                success: false,
                message: 'Error occur!'
            };
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
            }

            let user = null;

            //check database
            if (decoded.userType === 'student') {
                const [row] = await db.execute(
                    'SELECT * FROM studentaccount WHERE studentId = ?',
                    [decoded.userId]
                );
                user = (row as any[])[0];
            } else {
                const [row] = await db.execute(
                    'SELECT * FROM adminaccount WHERE id = ?',
                    [decoded.userId]
                );
                user = (row as any[])[0];
            }

            if (!user) {
                return {
                    success: false,
                    message: 'user not exist'
                };
            }

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
            logger.error('Token verification error', error);
            return {
                success: false,
                message: 'token failed'
            };
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
                    'SELECT * FROM studentaccount WHERE studentId = ?',
                    [studentId]
                );

                if ((studentRow as any[]).length > 0) {
                    user = (studentRow as any[])[0];
                    tableName = 'studentaccount';
                }
            } catch (error) {
                logger.error('Error checking student table', error);
            }

            // If not found in student table, check admin table
            if (!user) {
                try {
                    const [adminRow] = await db.execute(
                        'SELECT * FROM adminaccount WHERE id = ?',
                        [studentId]
                    );

                    if ((adminRow as any[]).length > 0) {
                        user = (adminRow as any[])[0];
                        tableName = 'adminaccount';
                    }
                } catch (error) {
                    logger.error('Error checking admin table', error);
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
            const updateField = tableName === 'studentaccount' ? 'studentId' : 'id';
            await db.execute(
                `UPDATE ${tableName} SET password = ? WHERE ${updateField} = ?`,
                [hashedNewPassword, studentId]
            );
            
            return {
                success: true,
                message: 'Đổi mật khẩu thành công!'
            };

        } catch (error) {
            logger.error('Change password service error', error);
            return {
                success: false,
                message: 'Lỗi hệ thống khi đổi mật khẩu!'
            };
        }
    }

    /**
     * Admin function: Create new student account
     */
    static async adminCreateStudentAccount(
        studentId: string,
        name: string,
        email: string,
        password: string,
        subjectIds: string[] = []
    ): Promise<{ success: boolean; message: string }> {
        try {
            // Validate input
            if (!studentId || !name || !password) {
                return {
                    success: false,
                    message: 'Vui lòng điền đầy đủ MSSV, tên và mật khẩu!'
                };
            }

            // Validate studentId format (chỉ cho phép alphanumeric)
            if (!/^[A-Za-z0-9]+$/.test(studentId)) {
                return {
                    success: false,
                    message: 'MSSV chỉ được chứa chữ cái và số!'
                };
            }

            // Validate name (không được chứa số và ký tự đặc biệt)
            if (!/^[A-Za-zÀ-ỹ\s]+$/.test(name)) {
                return {
                    success: false,
                    message: 'Tên sinh viên chỉ được chứa chữ cái và khoảng trắng!'
                };
            }

            // Validate password strength
            const passwordValidation = PasswordUtils.validatePasswordStrength(password);
            if (!passwordValidation.isValid) {
                return {
                    success: false,
                    message: `Mật khẩu không đủ mạnh: ${passwordValidation.errors.join(', ')}`
                };
            }

            // Check if studentId already exists
            const [existingStudent] = await db.execute(
                'SELECT studentId FROM studentaccount WHERE studentId = ?',
                [studentId]
            );

            if ((existingStudent as any[]).length > 0) {
                return {
                    success: false,
                    message: 'Mã số sinh viên đã tồn tại!'
                };
            }

            // Hash password
            const hashedPassword = await PasswordUtils.hashPassword(password);

            // Get connection for transaction
            const connection = await db.getConnection();
            
            try {
                // Start transaction
                await connection.beginTransaction();
                // Validate subjectIds if provided
                if (subjectIds.length > 0) {
                    const placeholders = subjectIds.map(() => '?').join(',');
                    const [validSubjects] = await connection.execute(
                        `SELECT subjectId FROM subject WHERE subjectId IN (${placeholders})`,
                        subjectIds
                    );
                    
                    const validSubjectIds = (validSubjects as any[]).map(row => row.subjectId);
                    const invalidSubjects = subjectIds.filter(id => !validSubjectIds.includes(id));
                    
                    if (invalidSubjects.length > 0) {
                        await connection.rollback();
                        connection.release();
                        return {
                            success: false,
                            message: `Các môn học không hợp lệ: ${invalidSubjects.join(', ')}`
                        };
                    }
                }

                // Create student account with provided email
                await connection.execute(
                    'INSERT INTO studentaccount (studentId, name, email, password) VALUES (?, ?, ?, ?)',
                    [studentId, name, email, hashedPassword]
                );

                // Enroll student in selected subjects
                if (subjectIds.length > 0) {
                    // Get current semester
                    const [semesterResult] = await connection.execute(
                        'SELECT semesterId FROM semester ORDER BY semesterId DESC LIMIT 1'
                    );
                    
                    let currentSemesterId;
                    if ((semesterResult as any[]).length > 0) {
                        currentSemesterId = (semesterResult as any[])[0].semesterId;
                    } else {
                        // Tạo semester mặc định nếu chưa có
                        const defaultSemesterId = `SEM_${new Date().getFullYear()}_1`;
                        await connection.execute(
                            'INSERT INTO semester (semesterId, name, start_date, end_date) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 4 MONTH))',
                            [defaultSemesterId, `Học kỳ ${new Date().getFullYear()}`]
                        );
                        currentSemesterId = defaultSemesterId;
                    }

                    for (const subjectId of subjectIds) {
                        // Generate enrollmentId
                        const enrollmentId = `ENR_${studentId}_${subjectId}_${Date.now()}`;
                        
                        await connection.execute(
                            'INSERT INTO enrollment (enrollmentId, studentId, subjectId, semesterId) VALUES (?, ?, ?, ?)',
                            [enrollmentId, studentId, subjectId, currentSemesterId]
                        );
                    }
                }

                await connection.commit();
                connection.release();

                const enrollmentMessage = subjectIds.length > 0 
                    ? ` và đã ghi danh vào ${subjectIds.length} môn học`
                    : '';
                
                return {
                    success: true,
                    message: `Tạo tài khoản sinh viên thành công${enrollmentMessage}!`
                };

            } catch (error) {
                await connection.rollback();
                connection.release();
                throw error;
            }

        } catch (error) {
            logger.error('Admin create student account error', error);
            return {
                success: false,
                message: 'Lỗi hệ thống khi tạo tài khoản!'
            };
        }
    }

    /**
     * Admin reset student password
     */
    static async adminResetStudentPassword(
        studentId: string,
        newPassword: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            const connection = await db.getConnection();
            
            try {
                // Check if student exists
                const [students] = await connection.query<RowDataPacket[]>(
                    'SELECT StudentId, Name FROM studentaccount WHERE StudentId = ?',
                    [studentId]
                );
                
                if (students.length === 0) {
                    connection.release();
                    return {
                        success: false,
                        message: 'Không tìm thấy sinh viên với MSSV này!'
                    };
                }
                
                const studentName = students[0].Name;
                
                // Hash the new password
                const hashedPassword = await PasswordUtils.hashPassword(newPassword);
                
                // Update password in database
                const [result] = await connection.query<ResultSetHeader>(
                    'UPDATE studentaccount SET Password = ? WHERE StudentId = ?',
                    [hashedPassword, studentId]
                );
                
                connection.release();
                
                if (result.affectedRows === 0) {
                    return {
                        success: false,
                        message: 'Không thể cập nhật mật khẩu!'
                    };
                }
                
                return {
                    success: true,
                    message: `Đã reset mật khẩu cho sinh viên ${studentName} (${studentId}) thành công!`
                };
                
            } catch (error) {
                connection.release();
                throw error;
            }
            
        } catch (error) {
            logger.error('Admin reset password error', error);
            return {
                success: false,
                message: 'Lỗi hệ thống khi reset mật khẩu!'
            };
        }
    }
}