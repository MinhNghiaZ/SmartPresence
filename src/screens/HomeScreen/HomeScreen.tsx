import React, { useState, useRef } from 'react';
import './HomeScreen.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { CheckInService } from '../../Services/CheckInService';
import type { SubjectInfo } from '../../Services/CheckInService';
import { faceRecognizeService } from '../../Services/FaceRecognizeService/FaceRecognizeService';
import type { FaceRecognitionResult } from '../../Services/FaceRecognizeService/FaceRecognizeService';
import FaceRecognition, { type FaceRecognitionRef } from '../../Components/CameraScreen/FaceRecognition';
import SimpleAvatarDropdown from '../../Components/SimpleAvatarDropdown';
import ProfileModal from '../../Components/ProfileModal';

interface User {
  id: string;
  name: string;
  email: string;
  faceEmbedding?: any;
}

interface WeeklyStats {
  present: number;
  absent: number;
  late: number;
  remain: number;
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
  const faceRecognitionRef = useRef<FaceRecognitionRef | null>(null);
  const [user] = useState<User>({
    id: 'SV001',
    name: 'Nguyen Van A',
    email: 'nguyenvana@eiu.edu.vn',
  });

  const [weeklyStats] = useState<WeeklyStats>({
    present: 12,
    absent: 2,
    late: 1,
    remain: 3
  });

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

  const handleCalendar = () => {
    // Navigate to calendar page
    console.log('Navigate to Calendar');
  };

  const handleHistory = () => {
    // Navigate to history page
    console.log('Navigate to History');
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

        {/* Weekly Review Section */}
        <div className="section">
          <h2 className="hi-text">Weekly Review</h2>
        </div>

        {/* Stats Section */}
        <div className="section">
          <div className="status-container">
            <div className="col">
              <div className="status-card present-card">
                <h3 className="title-text">{weeklyStats.present}</h3>
                <p className="sub-line">Present</p>
              </div>

              <div className="status-card absent-card">
                <h3 className="title-text">{weeklyStats.absent}</h3>
                <p className="sub-line">Absent</p>
              </div>
            </div>

            <div className="col">
              <div className="status-card late-card">
                <h3 className="title-text">{weeklyStats.late}</h3>
                <p className="sub-line">Late</p>
              </div>

              <div className="status-card remain-card">
                <h3 className="title-text">{weeklyStats.remain}</h3>
                <p className="sub-line">Remain</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Navigation Bar */}
      <div className="fixed-navigation">
        <div className="navigation-divider"></div>
        <div className="navigation-bar">
          <button className="nav-button calendar-button" onClick={handleCalendar}>
            <div className="nav-icon">📅</div>
            <span className="nav-label">Calendar</span>
          </button>
          <button className="nav-button history-button" onClick={handleHistory}>
            <div className="nav-icon">📋</div>
            <span className="nav-label">History</span>
          </button>
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
