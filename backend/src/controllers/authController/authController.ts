import { Request, Response } from "express";
import { AuthService } from "../../services/AuthService/authService";

export class AuthController {
    //Handle login request

    static async login(req: Request, res: Response) {
        try {
            const result = await AuthService.login(req.body);
            if (result.success) {
                console.log('login success');
                res.json(result);
            } else {
                res.status(401).json(result);
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({
                success: false,
                message: 'error occur when login!'
            });
        }
    }

    //Handle logout
    static async logout(req:Request,res:Response){
        res.json({
            success: true,
            message: 'logout success'
        });
    }

    //get user info
    static async me(req: Request, res: Response): Promise<void> {
        try {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    message: 'Login please'
                });
                return;
            }

            res.json({
                success: true,
                message: 'user info',
                User: req.user
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Không thể lấy thông tin user!'
            });
        }
    }

    // Handle change password request
    static async changePassword(req: Request, res: Response): Promise<void> {
        try {
            const { studentId, currentPassword, newPassword } = req.body;
            
            // Validation
            if (!studentId || !currentPassword || !newPassword) {
                res.status(400).json({
                    success: false,
                    message: 'Vui lòng điền đầy đủ thông tin!'
                });
                return;
            }

            if (currentPassword === newPassword) {
                res.status(400).json({
                    success: false,
                    message: 'Mật khẩu mới phải khác mật khẩu hiện tại!'
                });
                return;
            }

            // Password strength validation
            if (newPassword.length < 6) {
                res.status(400).json({
                    success: false,
                    message: 'Mật khẩu mới phải có ít nhất 6 ký tự!'
                });
                return;
            }

            const result = await AuthService.changePassword(studentId, currentPassword, newPassword);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('Change password error:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi hệ thống khi đổi mật khẩu!'
            });
        }
    }

    /**
     * POST /api/auth/admin/create-student
     * Admin create new student account
     */
    static async adminCreateStudent(req: Request, res: Response): Promise<void> {
        try {
            console.log('🔍 Raw request body:', JSON.stringify(req.body, null, 2));
            console.log('🔍 Request headers:', req.headers);
            
            const { studentId, name, email, password, subjectIds } = req.body;
            
            console.log('🚀 AuthController.adminCreateStudent called:', {
                studentId,
                name,
                password: password ? `[${password.length} chars]` : 'undefined',
                subjectIds: subjectIds || [],
                hasPassword: !!password,
                bodyType: typeof req.body,
                bodyKeys: Object.keys(req.body)
            });

            // Detailed validation with specific error messages
            if (!studentId) {
                console.log('❌ Missing studentId');
                res.status(400).json({
                    success: false,
                    message: 'Thiếu mã số sinh viên (studentId)!'
                });
                return;
            }

            if (!name) {
                console.log('❌ Missing name');
                res.status(400).json({
                    success: false,
                    message: 'Thiếu tên sinh viên (name)!'
                });
                return;
            }

            if (!email) {
                console.log('❌ Missing email');
                res.status(400).json({
                    success: false,
                    message: 'Thiếu email!'
                });
                return;
            }

            if (!password) {
                console.log('❌ Missing password');
                res.status(400).json({
                    success: false,
                    message: 'Thiếu mật khẩu (password)!'
                });
                return;
            }

            // Validate data types
            if (typeof studentId !== 'string') {
                console.log('❌ Invalid studentId type:', typeof studentId);
                res.status(400).json({
                    success: false,
                    message: 'Mã số sinh viên phải là chuỗi ký tự!'
                });
                return;
            }

            if (typeof name !== 'string') {
                console.log('❌ Invalid name type:', typeof name);
                res.status(400).json({
                    success: false,
                    message: 'Tên sinh viên phải là chuỗi ký tự!'
                });
                return;
            }

            if (typeof password !== 'string') {
                console.log('❌ Invalid password type:', typeof password);
                res.status(400).json({
                    success: false,
                    message: 'Mật khẩu phải là chuỗi ký tự!'
                });
                return;
            }

            console.log('✅ Input validation passed, calling service...');

            // Call service
            const result = await AuthService.adminCreateStudentAccount(
                studentId, 
                name,
                email,
                password, 
                subjectIds || []
            );
            
            console.log('📤 Service result:', result);
            
            if (result.success) {
                res.json(result);
            } else {
                console.log('❌ Service returned error:', result.message);
                res.status(400).json(result);
            }
        } catch (error) {
            console.error('❌ AuthController.adminCreateStudent error:', error);
            console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            res.status(500).json({
                success: false,
                message: 'Lỗi hệ thống khi tạo tài khoản!'
            });
        }
    }

}