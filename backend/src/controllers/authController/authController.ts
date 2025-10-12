import { Request, Response } from "express";
import { AuthService } from "../../services/AuthService/authService";
import { logger } from "../../utils/logger";
import { resetLoginRateLimit } from "../../middleware/loginRateLimiter";

export class AuthController {
    //Handle login request

    static async login(req: Request, res: Response) {
        try {
            const result = await AuthService.login(req.body);
            if (result.success) {
                // Reset rate limit counter on successful login
                if (req.body.userId) {
                    resetLoginRateLimit(req.body.userId);
                }
                res.json(result);
            } else {
                res.status(401).json(result);
            }
        } catch (error) {
            logger.error('Login controller error', error);
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
            logger.error('Change password error', error);
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
            const { studentId, name, email, password, subjectIds } = req.body;

            // Detailed validation with specific error messages
            if (!studentId) {
                res.status(400).json({
                    success: false,
                    message: 'Thiếu mã số sinh viên (studentId)!'
                });
                return;
            }

            if (!name) {
                res.status(400).json({
                    success: false,
                    message: 'Thiếu tên sinh viên (name)!'
                });
                return;
            }

            if (!email) {
                res.status(400).json({
                    success: false,
                    message: 'Thiếu email!'
                });
                return;
            }

            if (!password) {
                res.status(400).json({
                    success: false,
                    message: 'Thiếu mật khẩu (password)!'
                });
                return;
            }

            // Validate data types
            if (typeof studentId !== 'string') {
                res.status(400).json({
                    success: false,
                    message: 'Mã số sinh viên phải là chuỗi ký tự!'
                });
                return;
            }

            if (typeof name !== 'string') {
                res.status(400).json({
                    success: false,
                    message: 'Tên sinh viên phải là chuỗi ký tự!'
                });
                return;
            }

            if (typeof password !== 'string') {
                res.status(400).json({
                    success: false,
                    message: 'Mật khẩu phải là chuỗi ký tự!'
                });
                return;
            }

            // Call service
            const result = await AuthService.adminCreateStudentAccount(
                studentId, 
                name,
                email,
                password, 
                subjectIds || []
            );
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            logger.error('AuthController.adminCreateStudent error', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi hệ thống khi tạo tài khoản!'
            });
        }
    }

    /**
     * Admin reset student password
     * POST /api/auth/admin/reset-password
     */
    static async adminResetPassword(req: Request, res: Response): Promise<void> {
        try {
            const { studentId, newPassword } = req.body;
            
            // Validate input
            if (!studentId || !newPassword) {
                res.status(400).json({
                    success: false,
                    message: 'Vui lòng cung cấp đầy đủ MSSV và mật khẩu mới!'
                });
                return;
            }
            
            // Validate password requirements
            if (newPassword.length < 6) {
                res.status(400).json({
                    success: false,
                    message: 'Mật khẩu phải có ít nhất 6 ký tự!'
                });
                return;
            }
            
            if (!/[a-z]/.test(newPassword)) {
                res.status(400).json({
                    success: false,
                    message: 'Mật khẩu phải chứa ít nhất 1 chữ cái thường!'
                });
                return;
            }
            
            if (!/[A-Z]/.test(newPassword)) {
                res.status(400).json({
                    success: false,
                    message: 'Mật khẩu phải chứa ít nhất 1 chữ cái HOA!'
                });
                return;
            }
            
            if (!/[0-9]/.test(newPassword)) {
                res.status(400).json({
                    success: false,
                    message: 'Mật khẩu phải chứa ít nhất 1 chữ số!'
                });
                return;
            }
            
            const result = await AuthService.adminResetStudentPassword(studentId, newPassword);
            
            if (result.success) {
                res.json(result);
            } else {
                res.status(400).json(result);
            }
        } catch (error) {
            logger.error('AuthController.adminResetPassword error', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi hệ thống khi reset mật khẩu!'
            });
        }
    }

}