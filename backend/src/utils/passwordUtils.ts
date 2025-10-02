import bcrypt from 'bcrypt';

export class PasswordUtils {
    private static readonly SALT_ROUNDS = 12; // Tăng độ bảo mật

    /**
     * Hash mật khẩu
     */
    static async hashPassword(password: string): Promise<string> {
        try {
            const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);
            return hashedPassword;
        } catch (error) {
            console.error('Error hashing password:', error);
            throw new Error('Không thể hash mật khẩu');
        }
    }

    /**
     * So sánh mật khẩu với hash
     */
    static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
        try {
            const isMatch = await bcrypt.compare(password, hashedPassword);
            return isMatch;
        } catch (error) {
            console.error('Error comparing password:', error);
            throw new Error('Không thể so sánh mật khẩu');
        }
    }

    /**
     * Kiểm tra xem password đã được hash chưa
     */
    static isHashed(password: string): boolean {
        // bcrypt hash luôn bắt đầu bằng $2a$, $2b$, hoặc $2y$
        return /^\$2[ayb]\$/.test(password);
    }

    /**
     * Validate password strength
     */
    static validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (password.length < 6) {
            errors.push('Mật khẩu phải có ít nhất 6 ký tự');
        }

        if (!/(?=.*[a-z])/.test(password)) {
            errors.push('Mật khẩu phải có ít nhất 1 chữ thường');
        }

        if (!/(?=.*[A-Z])/.test(password)) {
            errors.push('Mật khẩu phải có ít nhất 1 chữ hoa');
        }

        if (!/(?=.*\d)/.test(password)) {
            errors.push('Mật khẩu phải có ít nhất 1 số');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}