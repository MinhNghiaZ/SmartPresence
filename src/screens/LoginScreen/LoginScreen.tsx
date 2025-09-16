import React, { useState } from 'react';
import './LoginScreen.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { authService } from '../../Services/AuthService';

interface LoginScreenProps {
  onLoginSuccess: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  // State
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Handlers
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent double submission
    if (isLoading) return;
    
    // Validation
    if (!studentId || !password) {
      alert('Vui lòng nhập đầy đủ MSSV và mật khẩu!');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await authService.login(studentId, password);
      
      if (result.success) {
        // Chỉ chuyển màn hình, không cần alert
        onLoginSuccess();
      } else {
        alert(result.message);
      }
    } catch (error) {
      alert('Lỗi kết nối. Vui lòng thử lại!');
    } finally {
      setIsLoading(false);
    }
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
                    <img src="/Logo2eiu.png" alt="EIU Logo" height="150" />
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
                    <h5 className="text-primary">! 💕 Welcome Back 💕 !</h5>
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
                        <div className="float-end">
                          <a href="#" className="text-muted">
                            Quên mật khẩu?
                          </a>
                        </div>
                        <label className="form-label" htmlFor="password-input">
                          Mật khẩu
                        </label>
                        <div className="position-relative auth-pass-inputgroup mb-3">
                          <input
                            type="password"
                            className="form-control pe-5"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Nhập mật khẩu"
                            id="password"
                            required
                          />
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

                      {/* Demo Info */}
                      <div className="mt-3">
                        <div className="alert alert-info">
                          <small>
                            <strong>Thông tin demo:</strong><br/>
                            • MSSV: SV001 đến SV030<br/>
                            • Mật khẩu: 1<br/>
                            • VD: SV001 / 1
                          </small>
                        </div>
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
                      console.log('Chuyển đến màn hình đổi mật khẩu');
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
