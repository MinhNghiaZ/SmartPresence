export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role?: string;
  faceEmbedding?: any;
}

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe: boolean;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  message: string;
  error?: string;
}

export interface StoredAuth {
  user: User;
  token: string;
  rememberMe: boolean;
  loginTime: number;
  expiresAt: number;
}

export class AuthService {
  private static readonly STORAGE_KEY = 'smartpresence_auth';
  private static readonly TOKEN_EXPIRY_DAYS = 7; // Token hết hạn sau 7 ngày
  private static readonly SESSION_EXPIRY_HOURS = 24; // Session hết hạn sau 24 giờ nếu không remember me

  /**
   * Perform login with username/password
   * @param credentials Login credentials
   * @returns Promise<AuthResult>
   */
  static async login(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      console.log('Login attempt:', { 
        username: credentials.username, 
        rememberMe: credentials.rememberMe 
      });

      // TODO: Replace with actual API call
      // const response = await fetch('/api/auth/login', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(credentials)
      // });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Demo validation - replace with actual API validation
      if (credentials.username && credentials.password) {
        // Mock user data - replace with API response
        const user: User = {
          id: 'SV001',
          username: credentials.username,
          email: `${credentials.username}@eiu.edu.vn`,
          name: 'Nguyen Van A',
          role: 'student'
        };

        // Mock token - replace with actual JWT from API
        const token = `mock_token_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Save auth data if login successful
        await this.saveAuthData(user, token, credentials.rememberMe);

        return {
          success: true,
          user,
          token,
          message: 'Đăng nhập thành công! 🎉'
        };
      } else {
        return {
          success: false,
          message: 'Tên đăng nhập hoặc mật khẩu không đúng!',
          error: 'Invalid credentials'
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Lỗi kết nối. Vui lòng thử lại!',
        error: (error as Error).message
      };
    }
  }

  /**
   * Save authentication data to localStorage/sessionStorage
   * @param user User data
   * @param token Auth token
   * @param rememberMe Whether to remember login
   */
  private static async saveAuthData(user: User, token: string, rememberMe: boolean): Promise<void> {
    const now = Date.now();
    const expiresAt = rememberMe 
      ? now + (this.TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000) // 7 ngày
      : now + (this.SESSION_EXPIRY_HOURS * 60 * 60 * 1000); // 24 giờ

    const authData: StoredAuth = {
      user,
      token,
      rememberMe,
      loginTime: now,
      expiresAt
    };

    try {
      if (rememberMe) {
        // Lưu vào localStorage để persistent qua các session
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(authData));
      } else {
        // Lưu vào sessionStorage, sẽ mất khi đóng browser
        sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(authData));
      }
      console.log('Auth data saved successfully', { rememberMe, expiresAt: new Date(expiresAt) });
    } catch (error) {
      console.error('Failed to save auth data:', error);
    }
  }

  /**
   * Check if user is currently authenticated
   * @returns StoredAuth | null
   */
  static getStoredAuth(): StoredAuth | null {
    try {
      // Kiểm tra localStorage trước (remember me)
      let authDataStr = localStorage.getItem(this.STORAGE_KEY);
      let storage: 'localStorage' | 'sessionStorage' = 'localStorage';
      
      // Nếu không có trong localStorage, kiểm tra sessionStorage
      if (!authDataStr) {
        authDataStr = sessionStorage.getItem(this.STORAGE_KEY);
        storage = 'sessionStorage';
      }

      if (!authDataStr) {
        return null;
      }

      const authData: StoredAuth = JSON.parse(authDataStr);
      const now = Date.now();

      // Kiểm tra xem token có hết hạn không
      if (now > authData.expiresAt) {
        console.log('Auth token expired, clearing stored data');
        this.logout();
        return null;
      }

      console.log(`Found valid auth data in ${storage}`, {
        user: authData.user.username,
        rememberMe: authData.rememberMe,
        expiresIn: Math.round((authData.expiresAt - now) / (1000 * 60 * 60)) + ' hours'
      });

      return authData;
    } catch (error) {
      console.error('Failed to retrieve auth data:', error);
      this.logout(); // Clear corrupted data
      return null;
    }
  }

  /**
   * Get current authenticated user
   * @returns User | null
   */
  static getCurrentUser(): User | null {
    const authData = this.getStoredAuth();
    return authData?.user || null;
  }

  /**
   * Check if user is authenticated
   * @returns boolean
   */
  static isAuthenticated(): boolean {
    return this.getStoredAuth() !== null;
  }

  /**
   * Get auth token
   * @returns string | null
   */
  static getToken(): string | null {
    const authData = this.getStoredAuth();
    return authData?.token || null;
  }

  /**
   * Logout user and clear stored data
   */
  static logout(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      sessionStorage.removeItem(this.STORAGE_KEY);
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  }

  /**
   * Extend session if remember me is enabled
   */
  static extendSession(): void {
    const authData = this.getStoredAuth();
    if (authData && authData.rememberMe) {
      // Gia hạn thêm 7 ngày
      const newExpiresAt = Date.now() + (this.TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      const updatedAuthData: StoredAuth = {
        ...authData,
        expiresAt: newExpiresAt
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedAuthData));
      console.log('Session extended for remember me user');
    }
  }

  /**
   * Get saved username for auto-fill (if remember me was used)
   * @returns string | null
   */
  static getSavedUsername(): string | null {
    const authData = this.getStoredAuth();
    return authData?.user.username || null;
  }

  /**
   * Check if remember me was previously enabled
   * @returns boolean
   */
  static wasRememberMeEnabled(): boolean {
    const authData = this.getStoredAuth();
    return authData?.rememberMe || false;
  }
}
