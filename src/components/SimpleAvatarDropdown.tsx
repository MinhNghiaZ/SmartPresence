import React, { useState, useRef, useEffect } from 'react';
import './SimpleAvatarDropdown.css';

interface AvatarDropdownProps {
  userName: string;
  onProfile: () => void;
  onSettings: () => void;
  onDemo?: () => void;
  onLogout: () => void;
}

const AvatarDropdown: React.FC<AvatarDropdownProps> = ({ 
  userName,
  onProfile, 
  onSettings,
  onDemo, 
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
        <img src="/avatar.png" alt="Avatar" className="simple-avatar-img" />
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
          
          <button 
            className="simple-dropdown-item"
            onClick={() => handleMenuClick(onSettings)}
          >
            ⚙️ Cài đặt
          </button>
          
          {onDemo && (
            <button 
              className="simple-dropdown-item"
              onClick={() => handleMenuClick(onDemo)}
            >
              📸 Demo History
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
