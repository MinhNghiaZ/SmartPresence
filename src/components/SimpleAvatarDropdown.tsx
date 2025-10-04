import React, { useState, useRef, useEffect } from 'react';
import './SimpleAvatarDropdown.css';

interface AvatarDropdownProps {
  userName: string;
  avatarUrl?: string; // Thêm prop để nhận avatar URL
  onProfile: () => void;
  onSettings?: () => void; // Làm optional
  onLogout: () => void;
}

const AvatarDropdown: React.FC<AvatarDropdownProps> = ({ 
  userName,
  avatarUrl,
  onProfile, 
  onSettings,
  onLogout 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMenuClick = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  return (
    <div className="simple-avatar-dropdown" ref={dropdownRef}>
      <button 
        className="simple-avatar-btn"
        onClick={() => setIsOpen(!isOpen)}
      >
        <img 
          src={avatarUrl || "/avatar.png"} 
          alt="Avatar" 
          className="simple-avatar-img" 
        />
      </button>

      {isOpen && (
        <div className="simple-dropdown-menu">
          <div className="simple-dropdown-header">
            {userName}
          </div>
          
          <button 
            className="simple-dropdown-item"
            onClick={() => handleMenuClick(onProfile)}
          >
            👤 Thông tin cá nhân
          </button>
          
          {onSettings && (
            <button 
              className="simple-dropdown-item"
              onClick={() => handleMenuClick(onSettings)}
            >
              ⚙️ Cài đặt
            </button>
          )}
          
          <hr className="simple-divider" />
          
          <button 
            className="simple-dropdown-item logout-item"
            onClick={() => handleMenuClick(onLogout)}
          >
            🚪 Đăng xuất
          </button>
        </div>
      )}
    </div>
  );
};

export default AvatarDropdown;
