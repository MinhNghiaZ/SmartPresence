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
import { authService } from '../../Services/AuthService';

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
  
  // Get current student from AuthService
  const currentStudent = authService.getCurrentStudent();
  
  // User data (convert from Student to User interface)
  const [user] = useState<User>({
    id: currentStudent?.id || 'SV001',
    name: currentStudent?.name || 'Unknown User',
    email: currentStudent?.email || 'unknown@eiu.edu.vn',
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

  // Configuration - All available subjects
  const allSubjects: SubjectInfo[] = [
    {
      name: 'Toán Tin Ứng Dụng',
      code: 'CSE 107',
      time: '7:30 AM - 9:30 AM',
      room: '211 - B.08',
      instructor: 'Dr. Nguyen Van A',
      schedule: 'Thứ 2, Thứ 5'
    },
    {
      name: 'Cấu Trúc Dữ Liệu Giải Thuật',
      code: 'CSE 201', 
      time: '9:30 AM - 11:30 AM',
      room: '212 - B.08',
      instructor: 'Dr. Tran Thi B',
      schedule: 'Thứ 2, Thứ 5'
    }
  ];

  // Filter subjects based on student registration
  const studentRegisteredSubjects = authService.getStudentRegisteredSubjects();
  const availableSubjects = allSubjects.filter(subject => 
    studentRegisteredSubjects.includes(subject.code)
  );

  const [selectedSubject, setSelectedSubject] = useState<SubjectInfo>(
    availableSubjects.length > 0 ? availableSubjects[0] : allSubjects[0]
  );

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
        selectedSubject,
        (progress) => {
          setGpsStatus(progress.status);
        }
      );
      
      // Save attendance history
      if (checkInResult.success) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const classStartTime = selectedSubject.time.split(' - ')[0];
        
        const status = isLateCheckIn(currentTime, classStartTime) ? 'Late' : 'Present';
        
        const newRecord: AttendanceRecord = {
          id: Date.now().toString(),
          subject: `${selectedSubject.name} (${selectedSubject.code})`,
          timestamp: new Date().toLocaleString('vi-VN'),
          location: selectedSubject.room,
          status: status
        };
        
        setAttendanceHistory(prev => [newRecord, ...prev]);
      }
      
      setGpsStatus('');
      // Chỉ hiển thị alert cho check-in trực tiếp, không phải sau face recognition
      if (!isRegisterMode) {
        alert(checkInResult.message);
      }
      
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
          // Gọi performCheckIn mà không hiển thị alert duplicate
          performCheckInSilent();
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

  // Check-in function - được gọi sau face registration để tránh duplicate alert
  const performCheckInSilent = async () => {
    if (isCheckingIn) return;
    
    try {
      setIsCheckingIn(true);
      setGpsStatus(`Chào mừng ${user.name}! Đang thực hiện check-in...`);
      
      const result = await CheckInService.performCheckIn(
        selectedSubject,
        (progress) => {
          setGpsStatus(progress.status);
        }
      );
      
      // Save attendance history on success
      if (result.success) {
        const now = new Date();
        const currentTime = now.toTimeString().slice(0, 5);
        const classStartTime = selectedSubject.time.split(' - ')[0];
        
        const status = isLateCheckIn(currentTime, classStartTime) ? 'Late' : 'Present';
        
        const newRecord: AttendanceRecord = {
          id: Date.now().toString(),
          subject: `${selectedSubject.name} (${selectedSubject.code})`,
          timestamp: new Date().toLocaleString('vi-VN'),
          location: selectedSubject.room,
          status: status
        };
        
        setAttendanceHistory(prev => [newRecord, ...prev]);
      }
      
      setGpsStatus('');
      // Không hiển thị alert để tránh duplicate
      
    } catch (error) {
      console.error('Check-in error:', error);
      setGpsStatus('');
      // Chỉ hiển thị alert nếu có lỗi thực sự
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

  const handleLogout = () => {
    authService.logout();
    if (onLogout) {
      onLogout();
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
            onLogout={handleLogout}
          />
        </div>

        {/* Welcome Section */}
        <div className="section">
          <h1 className="hi-text">Xin chào {user.name}</h1>
          <p className="sub-text">Chào mừng đến với EIU SmartPresence Dashboard</p>
          <p className="sub-text">MSSV: {user.id} | {user.email}</p>
          {currentStudent && (
            <p className="sub-text">Khóa: 20{currentStudent.cohort} | SĐT: {currentStudent.phone}</p>
          )}
          
          {/* Registered Subjects Info */}
          <div className="registered-subjects-info">
            <p className="sub-text">
              <strong>Môn học đã đăng ký:</strong> {studentRegisteredSubjects.join(', ') || 'Chưa đăng ký môn nào'}
            </p>
          </div>
          
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
          {availableSubjects.length === 0 ? (
            // No registered subjects
            <div className="no-subjects-card">
              <div className="no-subjects-content">
                <div className="no-subjects-icon">📚</div>
                <h3 className="no-subjects-title">Không có môn học để điểm danh</h3>
                <p className="no-subjects-description">
                  Bạn chưa đăng ký môn học nào hoặc không có môn nào khả dụng để điểm danh.
                  Vui lòng liên hệ phòng đào tạo để biết thêm chi tiết.
                </p>
                <div className="contact-info">
                  <p>📞 Phòng Đào tạo: (028) 3724 4271</p>
                  <p>📧 Email: training@eiu.edu.vn</p>
                </div>
              </div>
            </div>
          ) : (
            // Has registered subjects
            <div className="subject-card">
              <div className="subject-info">
                {/* Subject Selector */}
                <div className="subject-selector">
                  <label htmlFor="subject-select" className="selector-label">
                    Chọn môn học để điểm danh:
                  </label>
                  <select
                    id="subject-select"
                    className="subject-select"
                    value={selectedSubject.code}
                    onChange={(e) => {
                      const subject = availableSubjects.find(s => s.code === e.target.value);
                      if (subject) setSelectedSubject(subject);
                    }}
                  >
                    {availableSubjects.map((subject) => (
                      <option key={subject.code} value={subject.code}>
                        {subject.code} - {subject.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selected Subject Info */}
                <div className="subject-details">
                  <h3 className="title-text">{selectedSubject.name}</h3>
                  <p className="sub-line">Mã môn: {selectedSubject.code}</p>
                  <p className="sub-line">Thời gian: {selectedSubject.time}</p>
                  <p className="sub-line">Phòng: {selectedSubject.room}</p>
                  <p className="sub-line">Lịch học: {selectedSubject.schedule}</p>
                  <p className="sub-line">Giảng viên: {selectedSubject.instructor}</p>
                </div>
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
          )}
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
