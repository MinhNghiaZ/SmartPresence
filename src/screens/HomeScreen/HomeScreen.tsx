import React, { useState, useRef } from 'react';
import './HomeScreen.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { CheckInService } from '../../Services/CheckInService';
import type { SubjectInfo } from '../../Services/CheckInService';
import { faceRecognizeService } from '../../Services/FaceRecognizeService/FaceRecognizeService';
import type { FaceRecognitionResult } from '../../Services/FaceRecognizeService/FaceRecognizeService';
import FaceRecognition, { type FaceRecognitionRef } from '../../components/CameraScreen/FaceRecognition';
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
  const [showFaceModal, setShowFaceModal] = useState<boolean>(false);
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const faceRecognitionRef = useRef<FaceRecognitionRef | null>(null);
  const [user] = useState<User>({
    id: 'SV001',
    name: 'Nguyen Van A',
    email: 'nguyenvana@eiu.edu.vn',
  });

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
    // Mở modal camera trước
    setShowFaceModal(true);
    setIsProcessing(false); // Reset trạng thái processing
    
    try {
      // Khởi tạo face recognition service chỉ một lần
      if (!faceRecognizeService.isReady()) {
        setGpsStatus('Đang tải AI models...');
        await faceRecognizeService.initializeModels();
      }
      
      // Load faces từ storage
      faceRecognizeService.loadFacesFromStorage();
      
      // Kiểm tra user đã đăng ký khuôn mặt chưa
      const isUserRegistered = faceRecognizeService.isUserRegistered(user.id);
      
      if (isUserRegistered) {
        // Đã đăng ký -> xác thực
        setIsRegisterMode(false);
        setGpsStatus(`Xin chào ${user.name}! Vui lòng nhìn vào camera để xác thực...`);
      } else {
        // Chưa đăng ký -> đăng ký
        setIsRegisterMode(true);
        setGpsStatus(`Xin chào ${user.name}! Bạn chưa đăng ký khuôn mặt. Vui lòng nhìn vào camera để đăng ký...`);
      }
      
    } catch (error) {
      console.error('Face recognition setup error:', error);
      setGpsStatus('');
      setShowFaceModal(false);
      alert('❌ Không thể khởi tạo nhận dạng khuôn mặt. Vui lòng thử lại.');
    }
  };

  // Xử lý khi nhận dạng/đăng ký thành công
  const handleFaceRecognitionSuccess = async (result: FaceRecognitionResult) => {
    if (isProcessing || isCheckingIn) return; // Ngăn gọi lặp lại
    
    // Tắt camera trước khi đóng modal
    if (faceRecognitionRef.current) {
      faceRecognitionRef.current.stopCamera();
    }
    setShowFaceModal(false);
    setIsCheckingIn(true);
    setGpsStatus(`Xác thực thành công! Chào ${result.person?.name || user.name}`);
    
    try {
      const checkInResult = await CheckInService.performCheckIn(
        currentSubject,
        (progress) => {
          setGpsStatus(progress.status);
        }
      );
      
      // Chỉ lưu lịch sử khi check-in thành công
      if (checkInResult.success) {
        // Xác định trạng thái dựa trên thời gian
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
        const classStartTime = currentSubject.time.split(' - ')[0]; // Lấy giờ bắt đầu
        
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
      
      setGpsStatus('');
      alert(checkInResult.message);
      
    } catch (error) {
      console.error('Check-in error:', error);
      setGpsStatus('');
      alert('❌ Check-in failed. Please try again.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Xử lý đăng ký khuôn mặt
  const handleFaceRegistration = async () => {
    if (isProcessing) return; // Ngăn gọi lặp lại
    
    try {
      setIsProcessing(true);
      setGpsStatus('Đang đăng ký khuôn mặt...');
      
      const video = document.querySelector('video') as HTMLVideoElement;
      if (video) {
        await faceRecognizeService.registerFace(video, user.id, user.name);
        faceRecognizeService.saveFacesToStorage();
        
        setGpsStatus(`✅ Đăng ký khuôn mặt thành công cho ${user.name}!`);
        
        // Tự động tiếp tục check-in sau khi đăng ký
        setTimeout(() => {
          // Tắt camera trước khi đóng modal
          if (faceRecognitionRef.current) {
            faceRecognitionRef.current.stopCamera();
          }
          setShowFaceModal(false);
          setIsCheckingIn(true);
          performCheckIn();
        }, 2000);
        
      } else {
        throw new Error('Không tìm thấy video element');
      }
    } catch (error) {
      console.error('Face registration error:', error);
      setGpsStatus('❌ Lỗi khi đăng ký: ' + (error as Error).message);
      setIsProcessing(false);
    }
  };

  // Thực hiện check-in sau khi đăng ký thành công
  const performCheckIn = async () => {
    if (isCheckingIn) return; // Ngăn gọi lặp lại
    
    try {
      setIsCheckingIn(true);
      setGpsStatus(`Chào mừng ${user.name}! Đang thực hiện check-in...`);
      
      const result = await CheckInService.performCheckIn(
        currentSubject,
        (progress) => {
          setGpsStatus(progress.status);
        }
      );
      
      // Chỉ lưu lịch sử khi check-in thành công
      if (result.success) {
        // Xác định trạng thái dựa trên thời gian
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5); // HH:MM format
        const classStartTime = currentSubject.time.split(' - ')[0]; // Lấy giờ bắt đầu
        
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
      
      setGpsStatus('');
      alert(result.message);
      
    } catch (error) {
      console.error('Check-in error:', error);
      setGpsStatus('');
      alert('❌ Check-in failed. Please try again.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  // Hủy face recognition
  const handleFaceRecognitionCancel = () => {
    // Tắt camera trước khi đóng modal
    if (faceRecognitionRef.current) {
      faceRecognitionRef.current.stopCamera();
    }
    setShowFaceModal(false);
    setGpsStatus('');
    setIsProcessing(false); // Reset trạng thái processing
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

      {/* Face Recognition Modal */}
      {showFaceModal && (
        <div className="face-modal-overlay">
          <div className="face-modal">
            <div className="face-modal-header">
              <h3>{isRegisterMode ? '📝 Đăng ký khuôn mặt' : '🔍 Xác thực khuôn mặt'}</h3>
              <button 
                className="close-btn"
                onClick={handleFaceRecognitionCancel}
              >
                ✕
              </button>
            </div>
            
            <div className="face-modal-content">
              <div className="face-recognition-area">
                <FaceRecognition 
                  ref={faceRecognitionRef} 
                  onRecognitionResult={(results) => {
                    if (isProcessing) return; // Ngăn xử lý khi đang processing
                    
                    if (isRegisterMode) {
                      // Chế độ đăng ký - tự động đăng ký khi phát hiện khuôn mặt
                      if (results.length > 0) {
                        handleFaceRegistration();
                      }
                    } else {
                      // Chế độ xác thực
                      if (results.length > 0 && results[0].isMatch) {
                        handleFaceRecognitionSuccess(results[0]);
                      }
                    }
                  }}
                  onError={(error) => {
                    console.error('Face recognition error:', error);
                    alert('❌ Lỗi nhận dạng khuôn mặt: ' + error);
                    handleFaceRecognitionCancel();
                  }}
                  autoRecognize={true}
                  recognizeInterval={3000}
                  autoStartCamera={true}
                />
              </div>
              
              <div className="status-display">
                {gpsStatus && <p className="status-text">{gpsStatus}</p>}
              </div>
              
              <div className="face-controls" style={{ marginTop: '20px' }}>
                <button 
                  className="face-btn cancel"
                  onClick={handleFaceRecognitionCancel}
                >
                  ❌ Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      <ProfileModal
        user={user}
        isOpen={showProfile}
        onClose={handleCloseProfile}
      />
    </div>
  );
};

export default HomeScreen;
