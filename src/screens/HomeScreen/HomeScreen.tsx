import React, { useState, useRef, useEffect } from 'react';
import './HomeScreen_modern.css';
import { CheckInService } from '../../Services/CheckInService';
import type { SubjectInfo } from '../../Services/CheckInService';
import { faceRecognizeService } from '../../Services/FaceRecognizeService/FaceRecognizeService.ts';
import type { FaceRecognitionResult } from '../../Services/FaceRecognizeService/FaceRecognizeService.ts';
import FaceRecognition, { type FaceRecognitionRef } from '../../Components/CameraScreen/FaceRecognition';
import SimpleAvatarDropdown from '../../Components/SimpleAvatarDropdown';
import ProfileModal from '../../Components/ProfileModal';

import { authService } from '../../Services/AuthService/AuthService';
import { useNotifications } from '../../context/NotificationContext';
import { subjectService } from '../../Services/SubjectService/SubjectService';
import { UnifiedCheckInService } from '../../Services/UnifiedCheckInService';
import type { CheckInRequest, CheckInResult } from '../../Services/UnifiedCheckInService/UnifiedCheckInService';
import { GPSService } from '../../Services/GPSService/GpsService';

// Interfaces

interface AttendanceRecord {
  id: string;
  subject: string;
  timestamp: string;
  location?: string; // ✅ Make location optional
  status: 'Present' | 'Late' | 'Absent';
}

interface HomeScreenProps {
  onLogout?: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onLogout }) => {
  const notify = useNotifications();
  // State
  const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<string>('');
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [showFaceModal, setShowFaceModal] = useState<boolean>(false);
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [faceRegistrationStatus, setFaceRegistrationStatus] = useState<'unknown' | 'registered' | 'not_registered'>('unknown');

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceRecord[]>([]);
  const [userAvatar, setUserAvatar] = useState<string>('');
  const [availableSubjects, setAvailableSubjects] = useState<SubjectInfo[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState<boolean>(true);
  
  // Refs
  const faceRecognitionRef = useRef<FaceRecognitionRef | null>(null);
  
  // Get current student from AuthService
  const currentUser = authService.getCurrentUser();

  // Debug state changes
  useEffect(() => {
    console.log('🔄 State changed:', { showFaceModal, isRegisterMode, gpsStatus, isCheckingIn });
  }, [showFaceModal, isRegisterMode, gpsStatus, isCheckingIn]);

  // Check face registration status when component loads
  useEffect(() => {
    const checkFaceRegistrationStatus = async () => {
      if (!currentUser) return;
      
      try {
        console.log('🔍 Checking face registration status for user:', currentUser.id);
        const isRegistered = await faceRecognizeService.isUserRegistered(currentUser.id);
        setFaceRegistrationStatus(isRegistered ? 'registered' : 'not_registered');
        console.log('✅ Face registration status:', isRegistered ? 'registered' : 'not_registered');
      } catch (error) {
        console.error('❌ Error checking face registration status:', error);
        setFaceRegistrationStatus('unknown');
      }
    };

    checkFaceRegistrationStatus();
  }, [currentUser?.id]);

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

  // Utils removed - isLateCheckIn logic now handled by backend

  // Load student subjects from backend
  useEffect(() => {
    const loadStudentSubjects = async () => {
      if (!currentUser) return;
      
      try {
        setIsLoadingSubjects(true);
        console.log('🔄 Loading student subjects from backend...');
        console.log('📋 Current user ID:', currentUser.id);
        
        // Retry logic for token availability
        let retries = 3;
        let subjects;
        
        while (retries > 0) {
          console.log('🔑 Current token exists:', !!authService.getToken());
          console.log('🔑 Token value:', authService.getToken()?.substring(0, 50) + '...');
          
          if (!authService.getToken()) {
            console.log(`⏳ No token found, waiting... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, 500));
            retries--;
            continue;
          }
          
          try {
            subjects = await subjectService.getStudentSubjectsFormatted(currentUser.id);
            break; // Success, exit retry loop
          } catch (error) {
            console.log(`❌ Error loading subjects, retrying... (${retries} retries left)`, error);
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        if (!subjects) {
          throw new Error('Failed to load subjects after retries');
        }
        
        console.log('✅ Subjects loaded:', subjects);
        setAvailableSubjects(subjects);
        
        if (subjects.length === 0) {
          notify.push('⚠️ Không tìm thấy môn học nào. Vui lòng liên hệ phòng đào tạo.', 'warning');
        }
        
      } catch (error) {
        console.error('❌ Error loading student subjects:', error);
        notify.push('❌ Không thể tải danh sách môn học. Vui lòng kiểm tra kết nối mạng.', 'error');
        setAvailableSubjects([]);
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    loadStudentSubjects();
  }, [currentUser, notify]);

  const [selectedSubject, setSelectedSubject] = useState<SubjectInfo | null>(null);

  // Set default selected subject when available subjects are loaded
  useEffect(() => {
    if (availableSubjects.length > 0 && !selectedSubject) {
      setSelectedSubject(availableSubjects[0]);
    }
  }, [availableSubjects, selectedSubject]);

  // Load attendance history from backend
  useEffect(() => {
    const loadAttendanceHistory = async () => {
      if (!currentUser) return;
      
      try {
        console.log('🔄 Loading attendance history from backend...');
        
        // ✅ USE SIMPLE HISTORY API TEMPORARILY
        const response = await fetch(`/api/attendance/simple-history/${currentUser.id}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const historyData = await response.json();
          if (historyData.success && historyData.records.length > 0) {
            // Transform simple records to HomeScreen format
            const transformedRecords: AttendanceRecord[] = historyData.records.map((record: any) => ({
              id: record.AttendanceId,
              subject: record.subjectId, // Will show subject ID for now
              timestamp: new Date(record.checked_in_at).toLocaleString('vi-VN'),
              status: record.status as 'Present' | 'Late' | 'Absent'
            }));
            
            setAttendanceHistory(transformedRecords);
            console.log('✅ Loaded simple attendance history:', transformedRecords);
          }
        }
        
      } catch (error) {
        console.error('❌ Error loading attendance history:', error);
        // Don't show error to user, just use local storage fallback
      }
    };

    loadAttendanceHistory();
  }, [currentUser]);

  // Handlers

  const handleFaceRecognitionSuccess = async (result: FaceRecognitionResult) => {
    if (isProcessing || isCheckingIn || !currentUser || !selectedSubject) return;
    
    console.log('✅ Face recognition thành công, chuyển sang unified check-in...');
    setGpsStatus(`Xác thực thành công! Chào ${result.person?.name || currentUser.name}`);
    
    // Gọi unified check-in completion
    await completeUnifiedCheckIn(result);
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
        
        // Update registration status
        setFaceRegistrationStatus('registered');
        
        // Stop camera and close modal after successful registration
        setTimeout(() => {
          // Stop camera first
          if (faceRecognitionRef.current) {
            faceRecognitionRef.current.stopCamera();
          }
          
          // Close modal
          setShowFaceModal(false);
          setGpsStatus('');
          setIsProcessing(false);
          setIsCheckingIn(false);
          
          notify.push(`🎉 Đăng ký khuôn mặt thành công! Bây giờ bạn có thể sử dụng nút "Điểm Danh" để check-in.`, 'success');
        }, 1500);
        
      } else {
        throw new Error('Không tìm thấy video element');
      }
    } catch (error) {
      console.error('Face registration error:', error);
      setGpsStatus('❌ Lỗi khi đăng ký: ' + (error as Error).message);
      setIsProcessing(false);
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

  /**
   * � FACE REGISTRATION: Chỉ đăng ký khuôn mặt, không cần GPS/Time validation
   */
  const performFaceRegistration = async () => {
    if (!currentUser || isCheckingIn) {
      console.log('❌ Cannot register face:', { currentUser: !!currentUser, isCheckingIn });
      return;
    }

    console.log('🚀 Starting face registration...', { currentUser });
    setIsCheckingIn(true);

    try {
      // Initialize face recognition models
      if (!faceRecognizeService.isReady()) {
        setGpsStatus('Đang tải AI models...');
        await faceRecognizeService.initializeModels();
      }

      // Set to registration mode and open camera modal
      setIsRegisterMode(true);
      setGpsStatus(`Xin chào ${currentUser.name}! Vui lòng nhìn vào camera để đăng ký khuôn mặt...`);
      console.log('📱 Opening camera modal for registration...');
      setShowFaceModal(true);
      setIsProcessing(false);

    } catch (error) {
      console.error('❌ Face registration error:', error);
      setGpsStatus('');
      setIsCheckingIn(false);
      notify.push(`❌ ${error instanceof Error ? error.message : 'Không thể khởi tạo camera. Vui lòng thử lại.'}`, 'error');
    }
  };

  /**
   * �🚀 UNIFIED CHECK-IN: Kiểm tra GPS + Time trước, sau đó mới mở camera
   */
  const performUnifiedCheckIn = async (selectedSubject: SubjectInfo) => {
    console.log('🚀 Starting performUnifiedCheckIn...', { selectedSubject, currentUser, isCheckingIn });
    
    if (!currentUser || isCheckingIn) {
      console.log('❌ Early return:', { currentUser: !!currentUser, isCheckingIn });
      return;
    }

    setIsCheckingIn(true);

    try {
      // BƯỚC 1: Kiểm tra eligibility (face registration, đã check-in chưa)
      setGpsStatus('🔍 Kiểm tra điều kiện check-in...');
      console.log('📋 Checking eligibility for subjectId:', selectedSubject.subjectId);
      const eligibility = await UnifiedCheckInService.canCheckIn(selectedSubject.subjectId);
      console.log('📋 Eligibility result:', eligibility);
      
      if (!eligibility.canCheckIn) {
        throw new Error(eligibility.reason || 'Không thể check-in');
      }

      // BƯỚC 2: Lấy GPS location
      setGpsStatus('📍 Đang lấy vị trí GPS...');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000
        });
      });

      // BƯỚC 3: Validate GPS + Time trước (không cần camera)
      setGpsStatus('⏰ Kiểm tra thời gian và vị trí...');
      
      const userLocation = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude
      };

      const locationResult = await GPSService.validateLocation(userLocation, selectedSubject.subjectId);
      
      // Kiểm tra time validation trước
      if (locationResult.message === 'not time yet') {
        throw new Error('⏰ Chưa tới giờ học. Vui lòng check-in trong khung thời gian của môn học.');
      }

      // Kiểm tra location validation
      if (!locationResult.allowed) {
        throw new Error(`📍 ${locationResult.message}`);
      }

      // BƯỚC 4: GPS + Time validation passed → Mở camera modal
      setGpsStatus('✅ Thời gian và vị trí hợp lệ! Mở camera để nhận diện khuôn mặt...');
      setIsCheckingIn(false); // Reset flag để có thể tiếp tục với face recognition

      // Lưu location data để dùng sau
      (window as any).pendingCheckInData = {
        selectedSubject,
        location: userLocation,
        locationResult
      };

      // Mở camera modal
      console.log('📱 Opening camera modal...');
      setShowFaceModal(true);
      setIsProcessing(false);
      
      // Initialize face recognition
      if (!faceRecognizeService.isReady()) {
        setGpsStatus('Đang tải AI models...');
        await faceRecognizeService.initializeModels();
      }
      
      // Check registration status from backend
      setGpsStatus('Đang kiểm tra trạng thái đăng ký...');
      let isUserRegistered = false;
      
      try {
        isUserRegistered = await faceRecognizeService.isUserRegistered(currentUser.id);
        console.log('✅ Registration check completed:', { userId: currentUser.id, isRegistered: isUserRegistered });
      } catch (registrationError) {
        console.error('❌ Error checking registration status:', registrationError);
        throw new Error('Không thể kiểm tra trạng thái đăng ký. Vui lòng thử lại.');
      }
      
      // CHẶN nếu user chưa đăng ký khuôn mặt
      if (!isUserRegistered) {
        throw new Error('⚠️ Bạn chưa đăng ký khuôn mặt. Vui lòng bấm nút "Đăng Ký Khuôn Mặt" trước khi điểm danh.');
      }

      // User đã đăng ký -> chế độ xác thực
      console.log('👤 User is registered - switching to verification mode');
      setIsRegisterMode(false);
      setGpsStatus(`Xin chào ${currentUser.name}! Vui lòng nhìn vào camera để xác thực...`);
      
    } catch (error) {
      console.error('❌ Pre-validation error:', error);
      setGpsStatus('');
      setIsCheckingIn(false);
      notify.push(`❌ ${error instanceof Error ? error.message : 'Kiểm tra thất bại. Vui lòng thử lại.'}`, 'error');
    }
  };

  /**
   * 🎯 UNIFIED CHECK-IN COMPLETION: Thực hiện sau khi face recognition thành công
   */
  const completeUnifiedCheckIn = async (_faceResult: FaceRecognitionResult) => {
    if (!currentUser) return;

    // Lấy data đã validate từ bước trước
    const pendingData = (window as any).pendingCheckInData;
    if (!pendingData) {
      notify.push('❌ Không tìm thấy dữ liệu validation. Vui lòng thử lại.', 'error');
      return;
    }

    const { selectedSubject, location } = pendingData;
    setIsCheckingIn(true);
    
    try {
      // Close modal first
      if (faceRecognitionRef.current) {
        faceRecognitionRef.current.stopCamera();
      }
      setShowFaceModal(false);

      // Get video element (should be available now)
      const video = document.querySelector('video') as HTMLVideoElement;
      if (!video) {
        throw new Error('Không tìm thấy camera.');
      }

      // Prepare unified check-in request với data đã validate
      const checkInRequest: CheckInRequest = {
        subjectId: selectedSubject.subjectId,
        subjectCode: selectedSubject.code,
        latitude: location.latitude,
        longitude: location.longitude,
        videoElement: video,
        faceResult: _faceResult // Truyền face result đã có
      };

      // Perform unified check-in (chỉ cần face recognition + save attendance)
      setGpsStatus('� Đang nhận diện khuôn mặt và lưu điểm danh...');
      const result: CheckInResult = await UnifiedCheckInService.performCompleteCheckIn(checkInRequest);

      // Display step-by-step results
      setGpsStatus('✅ Thời gian hợp lệ (đã kiểm tra)');
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setGpsStatus('✅ Vị trí hợp lệ (đã kiểm tra)');
      await new Promise(resolve => setTimeout(resolve, 500));

      if (result.steps.faceRecognition.success) {
        setGpsStatus('✅ Nhận diện khuôn mặt thành công');
        await new Promise(resolve => setTimeout(resolve, 800));
      }

      if (result.success) {
        setGpsStatus('🎉 Check-in thành công!');
        
        // Add to attendance history for immediate UI update
        const newRecord: AttendanceRecord = {
          id: result.attendanceId || Date.now().toString(),
          subject: `${selectedSubject.name} (${selectedSubject.code})`,
          timestamp: new Date(result.timestamp || Date.now()).toLocaleString('vi-VN'),
          status: result.status === 'PRESENT' ? 'Present' : 
                 result.status === 'LATE' ? 'Late' : 
                 result.status === 'ABSENT' ? 'Absent' : 'Present' // ✅ Map backend status to UI format
        };
        
        setAttendanceHistory(prev => [newRecord, ...prev]);
        notify.push('✅ ' + result.message, 'success');
        
      } else {
        // Handle failure
        let errorMessage = '❌ Check-in thất bại:\n';
        
        if (!result.steps.faceRecognition.success) {
          errorMessage += `• ${result.steps.faceRecognition.message}\n`;
        }
        if (!result.steps.attendanceRecord.success) {
          errorMessage += `• ${result.steps.attendanceRecord.message}\n`;
        }
        
        throw new Error(errorMessage.trim());
      }

    } catch (error) {
      console.error('❌ Face recognition + attendance save error:', error);
      setGpsStatus('');
      notify.push(`❌ ${error instanceof Error ? error.message : 'Check-in thất bại. Vui lòng thử lại.'}`, 'error');
    } finally {
      setIsCheckingIn(false);
      setTimeout(() => setGpsStatus(''), 3000);
      
      // Clear pending data
      (window as any).pendingCheckInData = null;
    }
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
            {isLoadingSubjects ? (
              /* Loading Card */
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">
                    Đang tải danh sách môn học...
                  </h3>
                  <p className="text-gray-600">
                    Vui lòng chờ trong giây lát.
                  </p>
                </div>
              </div>
            ) : availableSubjects.length === 0 ? (
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
            ) : selectedSubject ? (
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
                  </div>
                </div>

                {/* Check-in Button */}
                <div className="space-y-3">
                  <button
                    className={`w-full py-4 px-6 rounded-lg text-white font-semibold text-lg transition-all duration-300 ${
                      isCheckingIn
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 hover:shadow-lg transform hover:scale-105'
                    }`}
                    onClick={() => {
                      console.log('🔵 Button clicked:', { selectedSubject, currentUser });
                      performUnifiedCheckIn(selectedSubject);
                    }}
                    disabled={isCheckingIn}
                  >
                    {isCheckingIn ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                        <span>{gpsStatus || 'Checking...'}</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <span className="mr-2">✅</span>
                        Điểm Danh
                        <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded">GPS + Face</span>
                      </div>
                    )}
                  </button>

                  {/* Face Registration Status & Button */}
                  <div className="space-y-2">
                    {/* Status Display */}
                    <div className="flex items-center justify-center p-3 rounded-lg bg-gray-50">
                      {faceRegistrationStatus === 'registered' ? (
                        <div className="flex items-center text-green-600">
                          <span className="mr-2">✅</span>
                          <span className="font-medium">Đã đăng ký khuôn mặt</span>
                        </div>
                      ) : faceRegistrationStatus === 'not_registered' ? (
                        <div className="flex items-center text-orange-600">
                          <span className="mr-2">⚠️</span>
                          <span className="font-medium">Chưa đăng ký khuôn mặt</span>
                        </div>
                      ) : (
                        <div className="flex items-center text-gray-500">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500 mr-2"></div>
                          <span>Đang kiểm tra...</span>
                        </div>
                      )}
                    </div>

                    {/* Registration Button - Chỉ hiển thị khi chưa đăng ký */}
                    {faceRegistrationStatus !== 'registered' && (
                      <button
                        className={`w-full py-3 px-6 rounded-lg font-medium text-lg transition-all duration-300 ${
                          isCheckingIn
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 hover:shadow-lg transform hover:scale-105'
                        }`}
                        onClick={() => {
                          console.log('🔵 Face registration button clicked:', { currentUser, faceRegistrationStatus });
                          performFaceRegistration();
                        }}
                        disabled={isCheckingIn || faceRegistrationStatus === 'unknown'}
                      >
                        <div className="flex items-center justify-center">
                          <span className="mr-2">👤</span>
                          Đăng Ký Khuôn Mặt
                          <span className="ml-2 text-xs bg-white/20 px-2 py-1 rounded">Face Only</span>
                        </div>
                      </button>
                    )}
                  </div>

                </div>
              </div>
            ) : (
              /* No Subject Selected */
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">⏳</div>
                  <h3 className="text-xl font-semibold text-gray-800 mb-3">
                    Chưa chọn môn học
                  </h3>
                  <p className="text-gray-600">
                    Đang tải dữ liệu môn học...
                  </p>
                </div>
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
                      <p className="text-xs text-gray-600 mb-2">{record.timestamp}</p>
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onKeyDown={(e) => {
            // ESC key to close
            if (e.key === 'Escape') {
              handleFaceRecognitionCancel();
            }
          }}
          tabIndex={0}
        >
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