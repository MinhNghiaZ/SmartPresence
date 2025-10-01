import React, { useState, useRef, useEffect } from 'react';
import './HomeScreen_modern.css';
import { CheckInService } from '../../Services/CheckInService';
import type { SubjectInfo } from '../../Services/CheckInService';
import { faceRecognizeService } from '../../Services/FaceRecognizeService/FaceRecognizeService.ts';
import type { FaceRecognitionResult } from '../../Services/FaceRecognizeService/FaceRecognizeService.ts';
import FaceRecognition, { type FaceRecognitionRef } from '../../Components/CameraScreen/FaceRecognition';
import SimpleAvatarDropdown from '../../Components/SimpleAvatarDropdown';
import ProfileModal from '../../Components/ProfileModal';
import { captureFaceImage } from '../../utils/imageCaptureUtils';
import { authService } from '../../Services/AuthService/AuthService';
import { useNotifications } from '../../context/NotificationContext';

// Interfaces

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
  const notify = useNotifications();
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
  const currentUser = authService.getCurrentUser();

  // If no user is logged in, redirect to login (this should be handled by app routing)
  useEffect(() => {
    if (!currentUser) {
      console.warn('No user logged in, should redirect to login');
      // In a real app, this would trigger a redirect to login
      if (onLogout) {
        onLogout();
      }
    }
  }, [currentUser, onLogout]);

  // Get user's first registered face image
  const getUserRegisteredFaceImage = (): string => {
    if (!currentUser) return '';
    
    try {
      // Note: User avatar functionality now requires backend API call
      // For now, return empty string. Could implement API call to get user's latest successful image
      console.log('📸 Avatar functionality moved to backend. Consider implementing API call.');
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
  }, [currentUser?.id]);

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
      subjectId: 'CSE107',
      name: 'Toán Tin Ứng Dụng',
      code: 'CSE 107',
      time: '7:30 AM - 9:30 AM',
      room: '211 - B.08',
      instructor: 'Dr. Nguyen Van A',
      schedule: 'Thứ 2, Thứ 5'
    },
    {
      subjectId: 'CSE201',
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
  const availableSubjects = allSubjects.filter(subject => {
    // Safety check to ensure studentRegisteredSubjects is an array
    if (!Array.isArray(studentRegisteredSubjects)) {
      return true; // Show all subjects if registration data is not available
    }
    return studentRegisteredSubjects.includes(subject.code);
  });

  const [selectedSubject, setSelectedSubject] = useState<SubjectInfo>(
    availableSubjects.length > 0 ? availableSubjects[0] : allSubjects[0]
  );

  // Handlers
  const handleCheckIn = async () => {
    if (!currentUser) {
      notify.push('❌ Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.', 'error');
      if (onLogout) onLogout();
      return;
    }

    // Open camera modal
    setShowFaceModal(true);
    setIsProcessing(false);
    
    try {
      // Initialize face recognition
      if (!faceRecognizeService.isReady()) {
        setGpsStatus('Đang tải AI models...');
        await faceRecognizeService.initializeModels();
      }
      
      // Check registration status from backend
      setGpsStatus('Đang kiểm tra trạng thái đăng ký...');
      const isUserRegistered = await faceRecognizeService.isUserRegistered(currentUser.id);
      
      if (isUserRegistered) {
        setIsRegisterMode(false);
        setGpsStatus(`Xin chào ${currentUser.name}! Vui lòng nhìn vào camera để xác thực...`);
      } else {
        setIsRegisterMode(true);
        setGpsStatus(`Xin chào ${currentUser.name}! Bạn chưa đăng ký khuôn mặt. Vui lòng nhìn vào camera để đăng ký...`);
      }
      
    } catch (error) {
      console.error('Face recognition setup error:', error);
      setGpsStatus('');
      setShowFaceModal(false);
      notify.push('❌ Không thể khởi tạo nhận dạng khuôn mặt. Vui lòng thử lại.', 'error');
    }
  };

  const handleFaceRecognitionSuccess = async (result: FaceRecognitionResult) => {
    if (isProcessing || isCheckingIn || !currentUser) return;
    
    // Capture face image before proceeding
    try {
      const video = document.querySelector('video') as HTMLVideoElement;
      if (video) {
        const captureId = captureFaceImage(
          video,
          currentUser.id,
          currentUser.name,
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
    setGpsStatus(`Xác thực thành công! Chào ${result.person?.name || currentUser.name}`);
    
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
    notify.push(checkInResult.message, checkInResult.success ? 'success' : 'error');
      }
      
    } catch (error) {
      console.error('Check-in error:', error);
      setGpsStatus('');
      notify.push('❌ Check-in failed. Please try again.', 'error');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleFaceRegistration = async () => {
    if (isProcessing || !currentUser) return;
    
    try {
      setIsProcessing(true);
      setGpsStatus('Đang đăng ký khuôn mặt...');
      
      const video = document.querySelector('video') as HTMLVideoElement;
      if (video) {
        await faceRecognizeService.registerFace(video, currentUser.id, currentUser.name);
        
        setGpsStatus(`✅ Đăng ký khuôn mặt thành công cho ${currentUser.name}!`);
        
        // Switch to authentication mode after successful registration
        setIsRegisterMode(false);
        
        // Update status for authentication mode
        setTimeout(() => {
          setGpsStatus(`Chuyển sang chế độ xác thực. Vui lòng nhìn vào camera để check-in...`);
        }, 1000);
        
        // Auto continue check-in after registration
        setTimeout(() => {
          if (faceRecognitionRef.current) {
            faceRecognitionRef.current.stopCamera();
          }
          setShowFaceModal(false);
          // Gọi performCheckIn mà không hiển thị alert duplicate
          performCheckInSilent();
        }, 3000);
        
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
    if (isCheckingIn || !currentUser) return;
    
    try {
      setIsCheckingIn(true);
      setGpsStatus(`Chào mừng ${currentUser.name}! Đang thực hiện check-in...`);
      
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
      notify.push('❌ Check-in failed. Please try again.', 'error');
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
    notify.push('Settings feature will be implemented here', 'info');
  };

  const handleCloseProfile = () => {
    setShowProfile(false);
  };

  const handleClearData = () => {
    if (window.confirm('This will clear all attendance records. Are you sure?')) {
      notify.push('Data cleared successfully!', 'success');
    }
  };

  const handleCheckLocation = async () => {
    try {
      const debugInfo = await CheckInService.getLocationDebugInfo();
      notify.push('GPS info copied to console/log.', 'info');
      console.log(debugInfo);
    } catch (error) {
      notify.push(`GPS Error: ${(error as Error).message}`, 'error');
    }
  };

  // Render with modern design based on the HTML template
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Modern Navigation Bar */}
      <nav className="bg-gradient-to-r from-gray-800 to-gray-900 shadow-lg border-b-2 border-gray-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-3 sm:py-4">
            {/* Title Section */}
            <div className="flex items-center">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white leading-tight">SmartPresence</h1>
                <p className="text-xs sm:text-sm text-gray-300 leading-tight">EIU Attendance System</p>
              </div>
            </div>

            {/* User Profile Dropdown */}
            <div className="flex items-center space-x-4">
              <SimpleAvatarDropdown
                userName={currentUser?.name || 'Unknown User'}
                avatarUrl={userAvatar}
                onProfile={handleProfile}
                onSettings={handleSettings}
                onDemo={onNavigateToDemo}
                onLogout={handleLogout}
              />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Welcome Banner Section */}
        <div className="bg-gradient-to-r from-blue-100 to-blue-200 p-6 rounded-lg shadow-lg mb-6 transition-all duration-500 hover:shadow-xl">
          <div className="grid grid-cols-1 gap-6">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-3 text-gray-800">
                Xin chào {currentUser?.name || 'Unknown User'}!
              </h2>
              <p className="text-gray-700 text-lg mb-2">
                Chào mừng đến với EIU SmartPresence Dashboard
              </p>
              <p className="text-gray-600 mb-4">
                MSSV: {currentUser?.id || 'N/A'} | {currentUser?.email || 'N/A'}
              </p>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <button 
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-300 flex items-center"
                  onClick={handleClearData}
                >
                  🗑️ Clear Data (Debug)
                </button>
                <button 
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg text-sm transition-colors duration-300 flex items-center"
                  onClick={handleCheckLocation}
                >
                  📍 Check GPS (Debug)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Check-in Section */}
          <div className="lg:col-span-2">
            {availableSubjects.length === 0 ? (
              /* No Subjects Card */
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📚</div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">
                    Không có môn học để điểm danh
                  </h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Bạn chưa đăng ký môn học nào hoặc không có môn nào khả dụng để điểm danh.
                    Vui lòng liên hệ phòng đào tạo để biết thêm chi tiết.
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-blue-800">📞 Phòng Đào tạo: (028) 3724 4271</p>
                    <p className="text-blue-800">📧 Email: training@eiu.edu.vn</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Subject Selection and Check-in Card */
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                  🎓 Điểm danh môn học
                </h3>
                
                {/* Subject Selector */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chọn môn học để điểm danh:
                  </label>
                  <select
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-300"
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

                {/* Subject Details */}
                <div className="bg-gray-50 p-4 rounded-lg mb-6">
                  <h4 className="font-semibold text-gray-800 mb-2">{selectedSubject.name}</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                    <p><strong>Mã môn:</strong> {selectedSubject.code}</p>
                    <p><strong>Thời gian:</strong> {selectedSubject.time}</p>
                    <p><strong>Phòng:</strong> {selectedSubject.room}</p>
                    <p><strong>Lịch học:</strong> {selectedSubject.schedule}</p>
                    <p className="sm:col-span-2"><strong>Giảng viên:</strong> {selectedSubject.instructor}</p>
                  </div>
                </div>

                {/* Check-in Button */}
                <button
                  className={`w-full py-4 px-6 rounded-lg text-white font-semibold text-lg transition-all duration-300 ${
                    isCheckingIn
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 hover:shadow-lg transform hover:scale-105'
                  }`}
                  onClick={handleCheckIn}
                  disabled={isCheckingIn}
                >
                  {isCheckingIn ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      <span>{gpsStatus || 'Checking...'}</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <span className="mr-2">📸</span>
                      Check In
                    </div>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Attendance History Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                📊 Lịch sử điểm danh
              </h3>
              
              {attendanceHistory.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">📚</div>
                  <h4 className="font-medium text-gray-600 mb-2">Chưa có lịch sử</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    Thực hiện điểm danh đầu tiên để bắt đầu ghi lại lịch sử của bạn.
                  </p>
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>💡 Điểm danh đúng giờ để tránh muộn</p>
                    <p>📍 Đảm bảo GPS được bật</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {attendanceHistory.map((record, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow duration-300">
                      <h4 className="font-medium text-gray-800 text-sm mb-1">
                        {record.subject}
                      </h4>
                      <p className="text-xs text-gray-600 mb-1">{record.timestamp}</p>
                      <p className="text-xs text-gray-600 mb-2">{record.location}</p>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                        record.status === 'Present' 
                          ? 'bg-green-100 text-green-800'
                          : record.status === 'Late'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {record.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Face Recognition Modal */}
      {showFaceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-xl font-semibold text-gray-800">
                {isRegisterMode ? '📝 Đăng ký khuôn mặt' : '🔍 Xác thực khuôn mặt'}
              </h3>
              <button 
                className="text-gray-400 hover:text-gray-600 text-2xl"
                onClick={handleFaceRecognitionCancel}
              >
                ✕
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6">
              <div className="mb-4">
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
                    notify.push('❌ Lỗi nhận dạng khuôn mặt: ' + error, 'error');
                    // Không đóng modal khi có lỗi để người dùng có thể thử lại
                    setGpsStatus('❌ Lỗi camera: ' + error);
                    setIsProcessing(false);
                  }}
                  autoRecognize={true}
                  recognizeInterval={3000}
                  autoStartCamera={true}
                />
              </div>
              
              {/* Status Display */}
              {gpsStatus && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <p className="text-blue-800">{gpsStatus}</p>
                </div>
              )}
              
              {/* Modal Controls */}
              <div className="flex justify-end">
                <button 
                  className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg transition-colors duration-300"
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
      {currentUser && (
        <ProfileModal
          user={{
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email
          }}
          isOpen={showProfile}
          onClose={handleCloseProfile}
        />
      )}
    </div>
  );
};

export default HomeScreen;