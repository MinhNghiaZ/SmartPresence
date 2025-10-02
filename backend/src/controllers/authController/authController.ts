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


}