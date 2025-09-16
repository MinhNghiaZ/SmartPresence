import React, { useState, useRef, useEffect } from 'react';
import './HomeScreen.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { CheckInService } from '../../Services/CheckInService';
import type { SubjectInfo } from '../../Services/CheckInService';
import { faceRecognizeService } from '../../Services/FaceRecognizeService/FaceRecognizeService';
import type { FaceRecognitionResult } from '../../Services/FaceRecognizeService/FaceRecognizeService';
import FaceRecognition, { type FaceRecognitionRef } from '../../Components/CameraScreen/FaceRecognition';
import SimpleAvatarDropdown from '../../Components/SimpleAvatarDropdown';
import ProfileModal from '../../Components/ProfileModal';
import { captureFaceImage, getCapturedImagesByUser } from '../../utils/imageCaptureUtils';

// Interfaces
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
  onNavigateToDemo?: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onLogout, onNavigateToDemo }) => {
  // State
  const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<string>('');
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [showFaceModal, setShowFaceModal] = useState<boolean>(false);
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [userAvatar, setUserAvatar] = useState<string>('');
  
  // Refs
  const faceRecognitionRef = useRef<FaceRecognitionRef | null>(null);
  
  // User data
  const [user] = useState<User>({
    id: 'SV001',
    name: 'Nguyen Van A',
    email: 'nguyenvana@eiu.edu.vn',
  });

  // Get user's first registered face image
  const getUserRegisteredFaceImage = (): string => {
    try {
      // Lấy ảnh từ captured images (ảnh đăng ký thành công)
      const userImages = getCapturedImagesByUser(user.id);
      const successImages = userImages.filter(img => img.checkInStatus === 'success');
      
      if (successImages.length > 0) {
        // Trả về ảnh đầu tiên (mới nhất)
        return successImages[0].imageData;
      }
      
      return '';
    } catch (error) {
      console.error('Error getting user face image:', error);
      return '';
    }
  };

  // Load user avatar on component mount
  useEffect(() => {
    const loadUserAvatar = () => {
      const faceImage = getUserRegisteredFaceImage();
      setUserAvatar(faceImage);
    };

    loadUserAvatar();

    // Listen for new face captures
    const handleNewFaceCapture = () => {
      loadUserAvatar();
    };

    window.addEventListener('newFaceCapture', handleNewFaceCapture);
    
    return () => {
      window.removeEventListener('newFaceCapture', handleNewFaceCapture);
    };
  }, [user.id]);

  // Utils
  const isLateCheckIn = (currentTime: string, classStartTime: string): boolean => {
    const [currentHour, currentMin] = currentTime.split(':').map(Number);
    const [classHour, classMin] = classStartTime.split(':').map(Number);
    
    const currentMinutes = currentHour * 60 + currentMin;
    const classMinutes = classHour * 60 + classMin;
    
    return currentMinutes > classMinutes + 15;
  };

  // Configuration
  const currentSubject: SubjectInfo = {
    name: 'Mobile Development',
    code: 'CS401',
    time: '7:30 AM - 9:30 AM',
    room: '211 - B.08',
    instructor: 'Dr. Nguyen Van A'
  };

  // Handlers
  const handleCheckIn = async () => {
    // Open camera modal
    setShowFaceModal(true);
    setIsProcessing(false);
    
    try {
      // Initialize face recognition
      if (!faceRecognizeService.isReady()) {
        setGpsStatus('Đang tải AI models...');
        await faceRecognizeService.initializeModels();
      }
      
      faceRecognizeService.loadFacesFromStorage();
      
      // Check registration status
      const isUserRegistered = faceRecognizeService.isUserRegistered(user.id);
      
      if (isUserRegistered) {
        setIsRegisterMode(false);
        setGpsStatus(`Xin chào ${user.name}! Vui lòng nhìn vào camera để xác thực...`);
      } else {
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

  const handleFaceRecognitionSuccess = async (result: FaceRecognitionResult) => {
    if (isProcessing || isCheckingIn) return;
    
    // Capture face image before proceeding
    try {
      const video = document.querySelector('video') as HTMLVideoElement;
      if (video) {
        const captureId = captureFaceImage(
          video,
          user.id,
          user.name,
          result.confidence,
          'success'
        );
        console.log('📸 Face image captured with ID:', captureId);
      }
    } catch (error) {
      console.error('Error capturing face image:', error);
    }
    
    // Stop camera and close modal
    if (faceRecognitionRef.current) {
      faceRecognitionRef.current.stopCamera();
    }
    setShowFaceModal(false);
    setIsCheckingIn(true);
    setGpsStatus(`Xác thực thành công! Chào ${result.person?.name || user.name}`);
    
    try {
      // Perform check-in
      const checkInResult = await CheckInService.performCheckIn(
        currentSubject,
        (progress) => {
          setGpsStatus(progress.status);
        }
      );
      
      // Save attendance history
      if (checkInResult.success) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const classStartTime = currentSubject.time.split(' - ')[0];
        
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

  const handleFaceRegistration = async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      setGpsStatus('Đang đăng ký khuôn mặt...');
      
      const video = document.querySelector('video') as HTMLVideoElement;
      if (video) {
        await faceRecognizeService.registerFace(video, user.id, user.name);
        faceRecognizeService.saveFacesToStorage();
        
        setGpsStatus(`✅ Đăng ký khuôn mặt thành công cho ${user.name}!`);
        
        // Auto continue check-in after registration
        setTimeout(() => {
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

  const performCheckIn = async () => {
    if (isCheckingIn) return;
    
    try {
      setIsCheckingIn(true);
      setGpsStatus(`Chào mừng ${user.name}! Đang thực hiện check-in...`);
      
      const result = await CheckInService.performCheckIn(
        currentSubject,
        (progress) => {
          setGpsStatus(progress.status);
        }
      );
      
      // Save attendance history on success
      if (result.success) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const classStartTime = currentSubject.time.split(' - ')[0];
        
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

  const handleFaceRecognitionCancel = () => {
    // Stop camera before closing
    if (faceRecognitionRef.current) {
      faceRecognitionRef.current.stopCamera();
    }
    setShowFaceModal(false);
    setGpsStatus('');
    setIsProcessing(false);
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
      alert('Data cleared successfully!');
    }
  };

  const handleCheckLocation = async () => {
    try {
      const debugInfo = await CheckInService.getLocationDebugInfo();
      alert(debugInfo);
    } catch (error) {
      alert(`GPS Error: ${(error as Error).message}`);
    }
  };

  // Render
  return (
    <div className="home-container">
      <div className="home-content">
        {/* Header */}
        <div className="top-bar">
          <SimpleAvatarDropdown
            userName={user.name}
            avatarUrl={userAvatar}
            onProfile={handleProfile}
            onSettings={handleSettings}
            onDemo={onNavigateToDemo}
            onLogout={onLogout || (() => {})}
          />
        </div>

        {/* Welcome Section */}
        <div className="section">
          <h1 className="hi-text">Hi {user.name}</h1>
          <p className="sub-text">Welcome to EIU SmartPresence Dashboard</p>
          <p className="sub-text">You have 3 subjects left</p>
          <p className="user-info">MSSV: {user.id} | {user.email}</p>
          
          {/* Debug Controls */}
          <div className="debug-buttons">
            <button className="debug-button" onClick={handleClearData}>
              🗑️ Clear Data (Debug)
            </button>
            <button className="debug-button gps-debug" onClick={handleCheckLocation}>
              📍 Check GPS (Debug)
            </button>
          </div>
        </div>

        {/* Current Subject */}
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

        {/* Section Title */}
        <div className="section">
          <h2 className="hi-text">History Attendant</h2>
        </div>

        {/* Attendance History */}
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
            {/* Modal Header */}
            <div className="face-modal-header">
              <h3>{isRegisterMode ? '📝 Đăng ký khuôn mặt' : '🔍 Xác thực khuôn mặt'}</h3>
              <button 
                className="close-btn"
                onClick={handleFaceRecognitionCancel}
              >
                ✕
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="face-modal-content">
              <div className="face-recognition-area">
                <FaceRecognition 
                  ref={faceRecognitionRef} 
                  onRecognitionResult={(results) => {
                    if (isProcessing) return;
                    
                    if (isRegisterMode) {
                      // Registration mode
                      if (results.length > 0) {
                        handleFaceRegistration();
                      }
                    } else {
                      // Authentication mode
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
              
              {/* Status Display */}
              <div className="status-display">
                {gpsStatus && <p className="status-text">{gpsStatus}</p>}
              </div>
              
              {/* Modal Controls */}
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
