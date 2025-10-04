// AuthService.ts - Quản lý xác thực và thông tin sinh viên

export interface User {
    id: string; // MSSV (SV001, SV002, ...)
    studentId?: string; // Backend compatibility field
    name: string;
    email: string;
    password?: string;
    registeredSubjects?: string[]; // Mã môn học đã đăng ký ['CSE 107', 'CSE 201']
    cohort?: string; // Khóa học (23, 24, 25)
    phone?: string;
    avatar?: string;
    userType?: 'student' | 'admin';
}

export interface LoginResult {
    success: boolean;
    message: string;
    user?: User;
    token?: string;
}

export class AuthService {
    private static readonly API_BASE = 'http://localhost:3001/api';
    private static currentUser: User | null = null;

    /**
     * Đăng nhập với MSSV và mật khẩu
     */
    static async login(id: string, password: string): Promise<LoginResult> {
        try {
            const response = await fetch(`${this.API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: id,
                    password: password
                })
            });

            const result = await response.json();
            console.log('backend response', result);

            if (result.success && result.token) {
                // Login successful - save to localStorage and memory
                localStorage.setItem('token', result.token);
                
                // Map backend User structure to frontend User structure
                const mappedUser = {
                    ...result.User,
                    id: result.User.studentId || result.User.id // Map studentId to id
                };
                
                localStorage.setItem('currentUser', JSON.stringify(mappedUser));
                this.currentUser = mappedUser;
                
                console.log('current user from backend:', this.currentUser); // Debug log
                console.log('login successful');
                return {
                    success: true,
                    message: result.message,
                    user: result.User,
                    token: result.token
                };
            } else {
                // Login failed - clear any existing data
                this.currentUser = null;
                localStorage.removeItem('token');
                localStorage.removeItem('currentUser');
                
                console.log('login failed:', result.message);
                return {
                    success: false,
                    message: result.message || "Đăng nhập thất bại"
                };
            }

        } catch (error) {
            // Network/system error - clear any existing data
            this.currentUser = null;
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            
            console.error('API error: ', error);
            return {
                success: false,
                message: "Lỗi hệ thống. Vui lòng thử lại!"
            };
        }
    }

    /**
     * Đăng xuất
     */
    static async logout(): Promise<void> {
        try {
            const token = this.getToken();

            if (token) {
                await fetch(`${this.API_BASE}/auth/logout`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
            }
        } catch (error) {
            console.error('logout api error: ', error)
        } finally {
            this.currentUser = null;
            localStorage.removeItem('token');
            localStorage.removeItem('currentUser');
            console.log('logged out success');
        }
    }

    static getToken(): string | null {
        return localStorage.getItem('token');
    }
    /**
     * Lấy thông tin sinh viên hiện tại từ ram và localstorage
     */
    static getCurrentUser(): User | null {
        // Chỉ trả về currentStudent từ memory, không load từ localStorage
        if (this.currentUser) {
            return this.currentUser;
        }

        try {
            const userStr = localStorage.getItem('currentUser');

            if (userStr) {
                this.currentUser = JSON.parse(userStr);
                console.log('🔄 Restored user from localStorage:', this.currentUser);
                
                // Ensure id field exists (map from studentId if needed)
                if (this.currentUser && !this.currentUser.id && this.currentUser.studentId) {
                    this.currentUser.id = this.currentUser.studentId;
                    console.log('🔧 Mapped studentId to id:', this.currentUser.id);
                }
                
                return this.currentUser;
            }
        } catch (error) {
            console.error('parsing error', error);
            localStorage.removeItem('currentUser');
        }

        return null;

    }

    // lấy thông tin currentUser từ backend
    static async getMe(): Promise<{ success: boolean; user?: User; message: string }> {
        try {
            const token = this.getToken();
            if (!token) {
                return {
                    success: false,
                    message: 'no token found'
                };
            }

            const response = await fetch(`${this.API_BASE}/auth/me`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })
            const result = await response.json();

            if (result.success) {
                // Map backend User structure to frontend User structure
                const mappedUser = {
                    ...result.User,
                    id: result.User.studentId || result.User.id // Map studentId to id
                };
                
                localStorage.setItem('currentUser', JSON.stringify(mappedUser));
                this.currentUser = mappedUser;
            }
            return result;

        } catch (error) {
            console.error('get me API error', error);
            return {
                success: false,
                message: 'cannot get user info'
            };
        }
    }

    static async verifyToken(): Promise<boolean> {
        try {
            const result = await this.getMe();
            return result.success
        } catch (error) {
            console.error(error);
            return false;
        }
    }
    /**
     * Kiểm tra xem có sinh viên đăng nhập không
     */
    static isLoggedIn(): boolean {
        const token = this.getToken();
        const user = this.getCurrentUser();
        
        // Check if both token and user exist
        if (!token || !user) {
            // Clear any incomplete data
            if (!token) {
                localStorage.removeItem('currentUser');
                this.currentUser = null;
            }
            if (!user) {
                localStorage.removeItem('token');
            }
            return false;
        }
        
        return true;
    }

    /**
     * Clear all authentication data (for security/debugging)
     */
    static clearAuthData(): void {
        this.currentUser = null;
        localStorage.removeItem('token');
        localStorage.removeItem('currentUser');
        console.log('Auth data cleared');
    }

    /**
     * Kiểm tra quyền admin
     */
    static isAdmin(): boolean {
        const user = this.getCurrentUser();
        console.log('AuthService.isAdmin() - user:', user);
        console.log('AuthService.isAdmin() - userType:', user?.userType);
        const result = user?.userType === 'admin';
        console.log('AuthService.isAdmin() - result:', result);
        return result;
    }

    /**
     * Lấy danh sách môn học mà sinh viên đã đăng ký
     * Now uses SubjectService to get data from backend
     */
    static getStudentRegisteredSubjects(): string[] {
        const student = this.getCurrentUser();
        // Handle case where registeredSubjects might not exist in backend user object
        if (student && student.registeredSubjects && Array.isArray(student.registeredSubjects)) {
            return student.registeredSubjects;
        }
        
        // Return default subjects for now - HomeScreen will use SubjectService directly
        // This method is kept for backward compatibility
        return ['CSE 107', 'CSE 201']; // Default subjects for demo
    }

    /**
     * Kiểm tra xem sinh viên có đăng ký môn học cụ thể không
     */
    static isStudentRegisteredForSubject(subjectCode: string): boolean {
        const registeredSubjects = this.getStudentRegisteredSubjects();
        return registeredSubjects.includes(subjectCode);
    }

    /**
     * Đổi mật khẩu
     */
    static async changePassword(
        studentId: string, 
        currentPassword: string, 
        newPassword: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            const response = await fetch(`${this.API_BASE}/auth/change-password`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    studentId: studentId,
                    currentPassword: currentPassword,
                    newPassword: newPassword
                })
            });

            const result = await response.json();

            if (result.success) {
                return {
                    success: true,
                    message: result.message || 'Đổi mật khẩu thành công!'
                };
            } else {
                return {
                    success: false,
                    message: result.message || 'Đổi mật khẩu thất bại!'
                };
            }

        } catch (error) {
            console.error('Change password API error:', error);
            return {
                success: false,
                message: 'Lỗi kết nối. Vui lòng thử lại!'
            };
        }
    }


}

// Export singleton instance
export const authService = AuthService;