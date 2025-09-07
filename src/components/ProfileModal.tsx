import React from 'react';
import './ProfileModal.css';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  birthDate?: string;
  gender?: string;
  phone?: string;
  studentCode?: string;
  birthPlace?: string;
  ethnicity?: string;
  status?: string;
  address?: string;
  class?: string;
  major?: string;
  faculty?: string;
  program?: string;
  academicYear?: string;
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, user }) => {
  if (!isOpen) return null;

  // Create extended profile with default values
  const profile = {
    ...user,
    birthDate: '15/03/2002',
    gender: 'Nam',
    phone: '+84 123 456 789',
    studentCode: user.id,
    birthPlace: 'TP. Hồ Chí Minh',
    ethnicity: 'Kinh',
    status: 'Đang học',
    address: '123 Nguyễn Trãi, Quận 1, TP.HCM',
    class: 'SE2024A',
    major: 'Software Engineering',
    faculty: 'Information Technology',
    program: 'Đại học',
    academicYear: '2024-2025'
  };

  const InfoRow = ({ label, value, isLast = false }: { label: string; value: string; isLast?: boolean }) => (
    <div className={`info-row ${!isLast ? 'info-row-border' : ''}`}>
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  );

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="profile-header">
          <h2 className="profile-title">Thông tin sinh viên</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {/* Profile Image */}
        <div className="profile-image-section">
          <img
            src="/avatar.png"
            alt="Profile"
            className="profile-avatar"
          />
        </div>

        {/* Personal Information */}
        <div className="info-section">
          <h3 className="section-title">Thông tin sinh viên</h3>
          <div className="info-grid">
            <InfoRow label="Mã SV" value={profile.id} />
            <InfoRow label="Họ và tên" value={profile.name} />
            <InfoRow label="Ngày sinh" value={profile.birthDate} />
            <InfoRow label="Giới tính" value={profile.gender} />
            <InfoRow label="Điện thoại" value={profile.phone} />
            <InfoRow label="Số CMND/ CCCD" value={profile.studentCode} />
            <InfoRow label="Email" value={profile.email} />
            <InfoRow label="Nơi sinh" value={profile.birthPlace} />
            <InfoRow label="Dân tộc" value={profile.ethnicity} />
            <InfoRow label="Hiện diện" value={profile.status} />
            <InfoRow label="Hộ khẩu" value={profile.address} isLast={true} />
          </div>
        </div>

        {/* Academic Information */}
        <div className="info-section">
          <h3 className="section-title">Thông tin khóa học</h3>
          <div className="info-grid">
            <InfoRow label="Lớp" value={profile.class} />
            <InfoRow label="Ngành" value={profile.major} />
            <InfoRow label="Khoa" value={profile.faculty} />
            <InfoRow label="Bậc hệ đào tạo" value={profile.program} />
            <InfoRow label="Niên khóa" value={profile.academicYear} isLast={true} />
          </div>
        </div>

        {/* Action Button */}
        <div className="action-section">
          <button className="action-button" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
