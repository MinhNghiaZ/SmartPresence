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
    static async me(req:Request,res:Response){
        try {
            if(!req.user){
                return res.status(401).json({
                    success: false,
                    message: 'Login please'
                });
            }

            res.json({
                success: true,
                message: 'user info',
                user: req.user
            });

        } catch (error) {
            res.status(500).json({
                success: false,
                message: 'Không thể lấy thông tin user!'
            });
        }
    }


}