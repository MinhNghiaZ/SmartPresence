import React, { useState } from 'react';
import './LoginScreen.css';
import { authService } from '../../Services/AuthService';
import { useNotifications } from '../../context/NotificationContext';

interface LoginScreenProps {
  onLoginSuccess: () => void;
  onNavigateToChangePassword: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess, onNavigateToChangePassword }) => {
  // State
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const notify = useNotifications();

  // Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isLoading) return;
    
    // Validation
    if (!studentId || !password) {
      notify.push('⚠️ Vui lòng nhập đầy đủ mã số sinh viên và mật khẩu để đăng nhập!', 'warning');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await authService.login(studentId, password);
      
      if (result.success) {
        onLoginSuccess();
        notify.push(result.message, 'success');
      } else {
        notify.push(result.message, 'error');
      }
    } catch (error) {
      notify.push('❌ Kết nối mạng không ổn định. Vui lòng kiểm tra đường truyền và thử lại!', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="auth-page-wrapper min-vh-100 d-flex flex-column">
      {/* Background */}
      <div className="auth-one-bg-position auth-one-bg" id="auth-particles">
        <canvas className="particles-js-canvas-el"></canvas>
      </div>
      
      {/* Main Content */}
      <div className="auth-page-content flex-grow-1 d-flex align-items-center">
        <div className="container">
          {/* Logo Section */}
          <div className="row">
            <div className="col-lg-12">
              <div className="text-center mt-sm-5 mb-4 text-white-50">
                <div>
                  <a href="#" className="d-inline-block auth-logo">
                    <img src="/Logo2eiu.png" alt="EIU Logo" height="110" />
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          {/* Login Form */}
          <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6 col-xl-5">
              <div className="card mt-4">
                <div className="card-body p-4">
                  {/* Header */}
                  <div className="text-center mt-2">
                    <h5 className="text-primary">🎓 Chào mừng bạn đến với SmartPresence! 🎓</h5>
                    <p className="text-muted">💕 Sign in to access your account 💕</p>
                  </div>
                  
                  {/* Form */}
                  <div className="p-2 mt-4">
                    <form onSubmit={handleLogin}>
                      {/* Student ID Field */}
                      <div className="mb-3">
                        <label htmlFor="studentId" className="form-label">
                          Mã số sinh viên (MSSV)
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="studentId"
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          placeholder="Nhập MSSV (VD: SV001)"
                          required
                        />
                      </div>
                      
                      {/* Password Field */}
                      <div className="mb-3">
                        <label className="form-label" htmlFor="password-input">
                          Mật khẩu
                        </label>
                        <div className="position-relative auth-pass-inputgroup mb-3">
                          <input
                            type={showPassword ? "text" : "password"}
                            className="form-control pe-5"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nhập mật khẩu"
                            id="password"
                            required
                          />
                          <button
                            className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted password-addon"
                            type="button"
                            onClick={togglePasswordVisibility}
                            title={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                            style={{
                              border: 'none',
                              background: 'none',
                              padding: '0.375rem 0.75rem',
                              height: '100%',
                              zIndex: 3
                            }}
                          >
                            {showPassword ? (
                              <i className="ri-eye-off-fill align-middle" aria-hidden="true"></i>
                            ) : (
                              <i className="ri-eye-fill align-middle" aria-hidden="true"></i>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Submit Button */}
                      <div className="mt-4">{/* Remove remember me section completely */}
                        <button 
                          className="btn btn-success w-100" 
                          type="submit"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Đang đăng nhập...
                            </>
                          ) : (
                            'Đăng nhập'
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>
              
              {/* Change Password Link */}
              <div className="mt-4 text-center">
                <p className="mb-0 mt-2">
                  <a 
                    href="#" 
                    className="change-password-link"
                    onClick={(e) => {
                      e.preventDefault();
                      onNavigateToChangePassword();
                    }}
                  >
                    🔑 Đổi mật khẩu 🔑
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <footer className="footer mt-auto">
        <div className="container">
          <div className="row">
            <div className="col-lg-12">
              <div className="text-center">
                <p className="mb-0 text-muted">
                  © {new Date().getFullYear()} EIU SmartPresence{' '}
                  <i className="text-danger">❤️</i>
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LoginScreen;
