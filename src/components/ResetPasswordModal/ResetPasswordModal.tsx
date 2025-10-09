import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import './ResetPasswordModal.css';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetPassword: (studentId: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
}

const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ 
  isOpen, 
  onClose, 
  onResetPassword
}) => {
  const { push } = useNotifications();
  const [formData, setFormData] = useState({
    studentId: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.studentId || !formData.newPassword || !formData.confirmPassword) {
      push('⚠️ Vui lòng điền đầy đủ thông tin!', 'warning');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      push('⚠️ Mật khẩu xác nhận không khớp!', 'warning');
      return;
    }

    // Validate password requirements
    if (formData.newPassword.length < 6) {
      push('⚠️ Mật khẩu phải có ít nhất 6 ký tự!', 'warning');
      return;
    }

    if (!/[a-z]/.test(formData.newPassword)) {
      push('⚠️ Mật khẩu phải chứa ít nhất 1 chữ cái thường!', 'warning');
      return;
    }

    if (!/[A-Z]/.test(formData.newPassword)) {
      push('⚠️ Mật khẩu phải chứa ít nhất 1 chữ cái HOA!', 'warning');
      return;
    }

    if (!/[0-9]/.test(formData.newPassword)) {
      push('⚠️ Mật khẩu phải chứa ít nhất 1 chữ số!', 'warning');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await onResetPassword(
        formData.studentId,
        formData.newPassword
      );
      
      if (result.success) {
        push('✅ Reset mật khẩu thành công!', 'success');
        setFormData({ studentId: '', newPassword: '', confirmPassword: '' });
        onClose();
      } else {
        push(`❌ ${result.message}`, 'error');
      }
    } catch (error) {
      push('❌ Lỗi kết nối. Vui lòng thử lại!', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({ studentId: '', newPassword: '', confirmPassword: '' });
    setShowPassword(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        <div className="modal-header">
          <h2 className="modal-title">🔑 Reset Mật khẩu Sinh viên</h2>
          <button className="modal-close-btn" onClick={handleClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="studentId" className="form-label">
              Mã số sinh viên (MSSV) <span className="required">*</span>
            </label>
            <input
              type="text"
              id="studentId"
              name="studentId"
              value={formData.studentId}
              onChange={handleChange}
              className="form-input"
              placeholder="VD: 22312000xx"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="newPassword" className="form-label">
              Mật khẩu mới <span className="required">*</span>
            </label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="newPassword"
                name="newPassword"
                value={formData.newPassword}
                onChange={handleChange}
                className="form-input"
                placeholder="Nhập mật khẩu mới"
                required
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <p className="form-hint">
              Mật khẩu phải có ít nhất 6 ký tự, bao gồm chữ HOA, chữ thường và số
            </p>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword" className="form-label">
              Xác nhận mật khẩu <span className="required">*</span>
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="form-input"
              placeholder="Nhập lại mật khẩu mới"
              required
            />
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleClose}
              disabled={isLoading}
            >
              ❌ Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? '⏳ Đang xử lý...' : '🔑 Reset mật khẩu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordModal;
