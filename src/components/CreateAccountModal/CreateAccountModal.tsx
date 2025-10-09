import React, { useState } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import './CreateAccountModal.css';

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateAccount: (studentId: string, name: string, email: string, password: string, subjectIds: string[]) => Promise<{ success: boolean; message: string }>;
  subjects: Array<{ subjectId: string; name: string; code: string }>;
}

const CreateAccountModal: React.FC<CreateAccountModalProps> = ({ 
  isOpen, 
  onClose, 
  onCreateAccount,
  subjects 
}) => {
  const { push } = useNotifications();
  const [formData, setFormData] = useState({
    studentId: '',
    name: '',
    email: '',
    password: ''
  });
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubjectToggle = (subjectId: string) => {
    setSelectedSubjects(prev => {
      if (prev.includes(subjectId)) {
        return prev.filter(id => id !== subjectId);
      } else {
        return [...prev, subjectId];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.studentId || !formData.name || !formData.email || !formData.password) {
      push('⚠️ Vui lòng điền đầy đủ MSSV, tên, email và mật khẩu!', 'warning');
      return;
    }

    // Validate password requirements
    if (formData.password.length < 6) {
      push('⚠️ Mật khẩu phải có ít nhất 6 ký tự!', 'warning');
      return;
    }

    if (!/[a-z]/.test(formData.password)) {
      push('⚠️ Mật khẩu phải chứa ít nhất 1 chữ cái thường!', 'warning');
      return;
    }

    if (!/[A-Z]/.test(formData.password)) {
      push('⚠️ Mật khẩu phải chứa ít nhất 1 chữ cái HOA!', 'warning');
      return;
    }

    if (!/[0-9]/.test(formData.password)) {
      push('⚠️ Mật khẩu phải chứa ít nhất 1 chữ số!', 'warning');
      return;
    }

    setIsLoading(true);
    
    try {
      const result = await onCreateAccount(
        formData.studentId,
        formData.name,
        formData.email,
        formData.password,
        selectedSubjects
      );
      
      if (result.success) {
        push('✅ Tạo tài khoản thành công!', 'success');
        setFormData({ studentId: '', name: '', email: '', password: '' });
        setSelectedSubjects([]);
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
    if (!isLoading) {
      setFormData({ studentId: '', name: '', email: '', password: '' });
      setSelectedSubjects([]);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="create-account-modal-overlay">
      <div className="create-account-modal" onClick={(e) => e.stopPropagation()}>
        <div className="create-account-modal-header">
          <h3>➕ Tạo tài khoản sinh viên mới</h3>
          <button 
            className="create-account-modal-close"
            onClick={handleClose}
            disabled={isLoading}
          >
            ✕
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="create-account-form">
          <div className="form-group">
            <label htmlFor="studentId">
              Mã số sinh viên (MSSV) <span className="required">*</span>
            </label>
            <input
              type="text"
              id="studentId"
              name="studentId"
              value={formData.studentId}
              onChange={handleChange}
              placeholder="VD: 22312000xx"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">
              Tên sinh viên <span className="required">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="VD: Nguyễn Văn A"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">
              Email <span className="required">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="VD: 22312000xx@eiu.edu.vn"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label>
              Môn học (chọn môn học cho sinh viên)
            </label>
            <div className="subjects-list">
              {subjects.length === 0 ? (
                <p className="no-subjects">Không có môn học nào.</p>
              ) : (
                subjects.map(subject => (
                  <label key={subject.subjectId} className="subject-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedSubjects.includes(subject.subjectId)}
                      onChange={() => handleSubjectToggle(subject.subjectId)}
                      disabled={isLoading}
                    />
                    <span className="subject-info">
                      <strong>{subject.code}</strong> - {subject.name}
                    </span>
                    {selectedSubjects.includes(subject.subjectId) && (
                      <span className="selected-badge">Đã chọn</span>
                    )}
                  </label>
                ))
              )}
            </div>
            <small className="subjects-hint">
              Sinh viên sẽ được ghi danh tự động vào các môn học đã chọn
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="password">
              Mật khẩu <span className="required">*</span>
            </label>
            <div className="password-input-group position-relative">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Nhập mật khẩu"
                required
                disabled={isLoading}
                minLength={6}
                className="form-control pe-5"
              />
              <button
                type="button"
                className="btn btn-link position-absolute end-0 top-0 text-decoration-none text-muted password-addon"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
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
                <i className={`ri-${showPassword ? 'eye-off' : 'eye'}-fill align-middle`} aria-hidden="true"></i>
              </button>
            </div>
            <div className="password-requirements">
              <small className="text-muted">
                <strong>Yêu cầu mật khẩu:</strong>
              </small>
              <ul className="password-rules">
                <li className={formData.password.length >= 6 ? 'valid' : 'invalid'}>
                  Ít nhất 6 ký tự
                </li>
                <li className={/[a-z]/.test(formData.password) ? 'valid' : 'invalid'}>
                  Chứa ít nhất 1 chữ cái thường
                </li>
                <li className={/[A-Z]/.test(formData.password) ? 'valid' : 'invalid'}>
                  Chứa ít nhất 1 chữ cái HOA
                </li>
                <li className={/[0-9]/.test(formData.password) ? 'valid' : 'invalid'}>
                  Chứa ít nhất 1 chữ số
                </li>
              </ul>
            </div>
            <small className="password-hint">
              Mật khẩu sẽ được mã hóa tự động trước khi lưu vào database
            </small>
          </div>

          <div className="form-actions">
            <button 
              type="button" 
              className="btn-cancel"
              onClick={handleClose}
              disabled={isLoading}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="btn-create"
              disabled={isLoading || !formData.studentId || !formData.name || !formData.password}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  Đang tạo...
                </>
              ) : (
                'Tạo tài khoản'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAccountModal;