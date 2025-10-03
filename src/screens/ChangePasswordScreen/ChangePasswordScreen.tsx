import React, { useState } from 'react';
import './ChangePasswordScreen.css';
import { authService } from '../../Services/AuthService';
import { useNotifications } from '../../context/NotificationContext';

interface ChangePasswordScreenProps {
  onBack: () => void;
  onSuccess?: () => void;
}

const ChangePasswordScreen: React.FC<ChangePasswordScreenProps> = ({ onBack, onSuccess }) => {
  // State
  const [studentId, setStudentId] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const notify = useNotifications();

  // Password validation
  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    if (password.length < 6) {
      errors.push('Mật khẩu phải có ít nhất 6 ký tự');
    }
    return errors;
  };

  // Handlers
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;
    
    // Validation
    if (!studentId || !currentPassword || !newPassword || !confirmPassword) {
      notify.push('Vui lòng điền đầy đủ thông tin!', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      notify.push('Mật khẩu mới và xác nhận mật khẩu không khớp!', 'error');
      return;
    }

    if (currentPassword === newPassword) {
      notify.push('Mật khẩu mới phải khác mật khẩu hiện tại!', 'warning');
      return;
    }

    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      notify.push(passwordErrors.join(', '), 'error');
      return;
    }

    setIsLoading(true);
    
    try {
      // Simulate API call - replace with actual service
      const result = await authService.changePassword(studentId, currentPassword, newPassword);
      
      if (result.success) {
        notify.push('Đổi mật khẩu thành công!', 'success');
        // Clear form
        setStudentId('');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        // Navigate back or call success callback
        setTimeout(() => {
          onSuccess ? onSuccess() : onBack();
        }, 1500);
      } else {
        notify.push(result.message || 'Đổi mật khẩu thất bại!', 'error');
      }
    } catch (error) {
      notify.push('Lỗi kết nối. Vui lòng thử lại!', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
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
          
          {/* Change Password Form */}
          <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6 col-xl-5">
              <div className="card mt-4">
                <div className="card-body p-4">
                  {/* Header */}
                  <div className="text-center mt-2">
                    <h5 className="text-primary">🔐 Đổi Mật Khẩu 🔐</h5>
                    <p className="text-muted">💕 Cập nhật mật khẩu của bạn 💕</p>
                  </div>
                  
                  {/* Form */}
                  <div className="p-2 mt-4">
                    <form onSubmit={handleChangePassword}>
                      {/* Student ID Field */}
                      <div className="mb-3">
                        <label htmlFor="studentId" className="form-label">
                          Mã số sinh viên (MSSV) <span className="text-danger">*</span>
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
                      
                      {/* Current Password Field */}
                      <div className="mb-3">
                        <label className="form-label" htmlFor="currentPassword">
                          Mật khẩu hiện tại <span className="text-danger">*</span>
                        </label>
                        <div className="position-relative auth-pass-inputgroup">
                          <input
                            type={showPasswords.current ? "text" : "password"}
                            className="form-control pe-5"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Nhập mật khẩu hiện tại"
                            id="currentPassword"
                            required
                          />
                          <button
                            type="button"
                            className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted password-addon"
                            onClick={() => togglePasswordVisibility('current')}
                            title={showPasswords.current ? "Ẩn mật khẩu hiện tại" : "Hiện mật khẩu hiện tại"}
                            aria-label={showPasswords.current ? "Ẩn mật khẩu hiện tại" : "Hiện mật khẩu hiện tại"}
                          >
                            <i className={`ri-${showPasswords.current ? 'eye-off' : 'eye'}-fill align-middle`} aria-hidden="true">
                            </i>
                          </button>
                        </div>
                      </div>

                      {/* New Password Field */}
                      <div className="mb-3">
                        <label className="form-label" htmlFor="newPassword">
                          Mật khẩu mới <span className="text-danger">*</span>
                        </label>
                        <div className="position-relative auth-pass-inputgroup">
                          <input
                            type={showPasswords.new ? "text" : "password"}
                            className="form-control pe-5"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Nhập mật khẩu mới"
                            id="newPassword"
                            required
                          />
                          <button
                            type="button"
                            className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted password-addon"
                            onClick={() => togglePasswordVisibility('new')}
                            title={showPasswords.new ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"}
                            aria-label={showPasswords.new ? "Ẩn mật khẩu mới" : "Hiện mật khẩu mới"}
                          >
                            <i className={`ri-${showPasswords.new ? 'eye-off' : 'eye'}-fill align-middle`} aria-hidden="true">
                            </i>
                          </button>
                        </div>
                        {/* Password strength indicator */}
                        {newPassword && (
                          <div className="mt-2">
                            <small className="text-muted">
                              Yêu cầu: Ít nhất 6 ký tự
                            </small>
                          </div>
                        )}
                      </div>

                      {/* Confirm Password Field */}
                      <div className="mb-3">
                        <label className="form-label" htmlFor="confirmPassword">
                          Xác nhận mật khẩu mới <span className="text-danger">*</span>
                        </label>
                        <div className="position-relative auth-pass-inputgroup">
                          <input
                            type={showPasswords.confirm ? "text" : "password"}
                            className="form-control pe-5"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Nhập lại mật khẩu mới"
                            id="confirmPassword"
                            required
                          />
                          <button
                            type="button"
                            className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted password-addon"
                            onClick={() => togglePasswordVisibility('confirm')}
                            title={showPasswords.confirm ? "Ẩn xác nhận mật khẩu" : "Hiện xác nhận mật khẩu"}
                            aria-label={showPasswords.confirm ? "Ẩn xác nhận mật khẩu" : "Hiện xác nhận mật khẩu"}
                          >
                            <i className={`ri-${showPasswords.confirm ? 'eye-off' : 'eye'}-fill align-middle`} aria-hidden="true">
                            </i>
                          </button>
                        </div>
                        {/* Password match indicator */}
                        {confirmPassword && (
                          <div className="mt-2">
                            <small className={newPassword === confirmPassword ? 'text-success' : 'text-danger'}>
                              {newPassword === confirmPassword ? '✓ Mật khẩu khớp' : '✗ Mật khẩu không khớp'}
                            </small>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 d-grid gap-2">
                        <button 
                          className="btn btn-success" 
                          type="submit"
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Đang xử lý...
                            </>
                          ) : (
                            '🔐 Đổi Mật Khẩu'
                          )}
                        </button>
                        
                        <button 
                          type="button" 
                          className="btn btn-outline-secondary"
                          onClick={onBack}
                          disabled={isLoading}
                        >
                          ← Quay lại đăng nhập
                        </button>
                      </div>

                      {/* Security Tips */}
                      <div className="mt-3">
                        <div className="alert alert-info">
                          <small>
                            <strong>💡 Lưu ý bảo mật:</strong><br/>
                            • Nhập đúng MSSV và mật khẩu hiện tại để xác thực<br/>
                            • Sử dụng mật khẩu mạnh và duy nhất<br/>
                            • Không chia sẻ mật khẩu với ai khác<br/>
                            • Thay đổi mật khẩu định kỳ để đảm bảo an toàn
                          </small>
                        </div>
                      </div>
                    </form>
                  </div>
                </div>
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

export default ChangePasswordScreen;