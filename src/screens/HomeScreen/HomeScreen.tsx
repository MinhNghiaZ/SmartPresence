import React, { useState, useEffect } from 'react';
import './HomeScreen.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { CheckInService } from '../../Services/CheckInService';
import { AuthService } from '../../Services/AuthService';
import type { SubjectInfo } from '../../Services/CheckInService';
import SimpleAvatarDropdown from '../../components/SimpleAvatarDropdown';
import ProfileModal from '../../components/ProfileModal';

interface User {
  id: string;
  name: string;
  email: string;
  faceEmbedding?: any;
}

interface AttendanceRecord {
  id: string;
  subject: string;
  timestamp: string;
  location: string;
  status: 'Present' | 'Late' | 'Absent';
}

interface HomeScreenProps {
  onLogout?: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onLogout }) => {
  const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<string>('');
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);

  // Load user data from AuthService
  useEffect(() => {
    const currentUser = AuthService.getCurrentUser();
    if (currentUser) {
      setUser({
        id: currentUser.id,
        name: currentUser.name,
        email: currentUser.email,
        faceEmbedding: undefined
      });
      
      // Extend session if remember me is enabled
      AuthService.extendSession();
    }
  }, []);

  // Helper function để xác định có muộn không
  const isLateCheckIn = (currentTime: string, classStartTime: string): boolean => {
    const [currentHour, currentMin] = currentTime.split(':').map(Number);
    const [classHour, classMin] = classStartTime.split(':').map(Number);
    
    const currentMinutes = currentHour * 60 + currentMin;
    const classMinutes = classHour * 60 + classMin;
    
    // Muộn nếu check-in sau 15 phút so với giờ bắt đầu
    return currentMinutes > classMinutes + 15;
  };

  const currentSubject: SubjectInfo = {
    name: 'Mobile Development',
    code: 'CS401',
    time: '7:30 AM - 9:30 AM',
    room: '211 - B.08',
    instructor: 'Dr. Nguyen Van A'
  };

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    
    try {
      const result = await CheckInService.performCheckIn(
        currentSubject,
        (progress) => {
          setGpsStatus(progress.status);
        }
      );
      
      setGpsStatus('');
      
      // Chỉ lưu lịch sử khi check-in thành công
      if (result.success) {
        // Xác định trạng thái dựa trên thời gian
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
        const classStartTime = currentSubject.time.split(' - ')[0]; // Lấy giờ bắt đầu
        
        // Logic đơn giản: nếu check-in sau 15 phút thì coi là muộn
        const status = isLateCheckIn(currentTime, classStartTime) ? 'Late' : 'Present';
        
        const newRecord: AttendanceRecord = {
          id: Date.now().toString(),
          subject: `${currentSubject.name} (${currentSubject.code})`,
          timestamp: new Date().toLocaleString('vi-VN'),
          location: currentSubject.room,
          status: status
        };
        
        setAttendanceHistory(prev => [newRecord, ...prev]);
      }
      
      alert(result.message);
      
    } catch (error) {
      console.error('Check-in error:', error);
      setGpsStatus('');
      alert('❌ Check-in failed due to unexpected error. Please try again.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleProfile = () => {
    setShowProfile(true);
  };

  const handleSettings = () => {
    alert('Settings feature will be implemented here');
  };

  const handleCloseProfile = () => {
    setShowProfile(false);
  };

  const handleClearData = () => {
    if (window.confirm('This will clear all attendance records. Are you sure?')) {
      // TODO: Clear data via API call here
      alert('Data cleared successfully!');
    }
  };

  // Debug function to check current GPS location
  const handleCheckLocation = async () => {
    try {
      const debugInfo = await CheckInService.getLocationDebugInfo();
      alert(debugInfo);
    } catch (error) {
      alert(`GPS Error: ${(error as Error).message}`);
    }
  };

  // Show loading if user data is not yet loaded
  if (!user) {
    return (
      <div className="home-container d-flex justify-content-center align-items-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-muted">Đang tải thông tin người dùng...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="home-container">
      <div className="home-content">
        {/* Top Bar */}
        <div className="top-bar">
          <SimpleAvatarDropdown
            userName={user.name}
            onProfile={handleProfile}
            onSettings={handleSettings}
            onLogout={onLogout || (() => {})}
          />
        </div>

        {/* Welcome Section */}
        <div className="section">
          <h1 className="hi-text">Hi {user.name}</h1>
          <p className="sub-text">Welcome to EIU SmartPresence Dashboard</p>
          <p className="sub-text">You have 3 subjects left</p>
          <p className="user-info">MSSV: {user.id} | {user.email}</p>
          
          {/* Debug button - Remove in production */}
          <div className="debug-buttons">
            <button className="debug-button" onClick={handleClearData}>
              🗑️ Clear Data (Debug)
            </button>
            <button className="debug-button gps-debug" onClick={handleCheckLocation}>
              📍 Check GPS (Debug)
            </button>
          </div>
        </div>

        {/* Current Subject Section */}
        <div className="section">
          <div className="subject-card">
            <div className="subject-info">
              <h3 className="title-text">{currentSubject.name}</h3>
              <p className="sub-line">{currentSubject.time}</p>
              <p className="sub-line">Room: {currentSubject.room}</p>
            </div>

            <button
              className={`check-in-btn ${isCheckingIn ? 'checking-in' : ''}`}
              onClick={handleCheckIn}
              disabled={isCheckingIn}
            >
              {isCheckingIn ? (
                <div className="checking-container">
                  <div className="spinner"></div>
                  <span>{gpsStatus || 'Checking...'}</span>
                </div>
              ) : (
                'Check In'
              )}
            </button>
          </div>
        </div>

        {/* History Attendant Section */}
        <div className="section">
          <h2 className="hi-text">History Attendant</h2>
        </div>

        {/* Attendance History Section */}
        <div className="section">
          <div className="history-container">
            <h3 className="title-text">Lịch sử điểm danh</h3>
            {attendanceHistory.length === 0 ? (
              <div className="no-history">
                <div className="empty-state">
                  <div className="empty-icon">📚</div>
                  <h4 className="empty-title">Chưa có lịch sử điểm danh</h4>
                  <p className="empty-description">
                    Hãy thực hiện điểm danh đầu tiên để bắt đầu ghi lại lịch sử của bạn.
                    Lịch sử sẽ giúp bạn theo dõi quá trình học tập một cách chi tiết.
                  </p>
                  <div className="empty-tips">
                    <p className="tip-item">💡 Mẹo: Điểm danh đúng giờ để tránh bị đánh dấu muộn</p>
                    <p className="tip-item">📍 Đảm bảo GPS được bật và ở trong khuôn viên trường</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="history-list">
                {attendanceHistory.map((record: AttendanceRecord, index: number) => (
                  <div key={index} className="history-item">
                    <div className="history-info">
                      <h4 className="history-subject">{record.subject}</h4>
                      <p className="history-time">{record.timestamp}</p>
                      <p className="history-location">{record.location}</p>
                    </div>
                    <div className={`history-status ${record.status.toLowerCase()}`}>
                      {record.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Profile Modal */}
      {user && (
        <ProfileModal
          user={user}
          isOpen={showProfile}
          onClose={handleCloseProfile}
        />
      )}
    </div>
  );
};

export default HomeScreen;
