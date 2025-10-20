import React, { useState, useRef, useEffect, useCallback } from 'react';
import './HomeScreen_modern.css';
import type { SubjectInfo, FaceRecognitionResult, CheckInRequest, CheckInResult, HomeAttendanceRecord } from '../../models';
import { faceRecognizeService } from '../../Services/FaceRecognizeService/FaceRecognizeService.ts';
import FaceRecognition, { type FaceRecognitionRef } from '../../components/CameraScreen/FaceRecognition';
import SimpleAvatarDropdown from '../../components/SimpleAvatarDropdown';
import { GPSGuideModal } from '../../components/GPSGuide';

import { authService } from '../../Services/AuthService/AuthService';
import { useNotifications } from '../../context/NotificationContext';
import { subjectService } from '../../Services/SubjectService/SubjectService';
import { attendanceService } from '../../Services/AttendanceService';
import { UnifiedCheckInService } from '../../Services/UnifiedCheckInService/UnifiedCheckInService';
import { logger } from '../../utils/logger';
import { consoleLogger } from '../../utils/consoleLogger';
import { GPSService } from '../../Services/GPSService/GpsService';

interface HomeScreenProps {
  onLogout?: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onLogout }) => {
  const notify = useNotifications();
  
  // State Management | Quản lý trạng thái
  const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<string>('');
  const [showGPSGuide, setShowGPSGuide] = useState<boolean>(false);

  const [showFaceModal, setShowFaceModal] = useState<boolean>(false);
  const [isRegisterMode, setIsRegisterMode] = useState<boolean>(false);
  const [faceRegistrationStatus, setFaceRegistrationStatus] = useState<'unknown' | 'registered' | 'not_registered'>('unknown');

  // Loading state for modal
  const [modalLoadingState, setModalLoadingState] = useState({
    isLoading: false,
    message: '',
    progress: 0
  });

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [attendanceHistory, setAttendanceHistory] = useState<HomeAttendanceRecord[]>([]);
  const [userAvatar, setUserAvatar] = useState<string>('');
  const [availableSubjects, setAvailableSubjects] = useState<SubjectInfo[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState<boolean>(true);
  
  // References | Tham chiếu
  const faceRecognitionRef = useRef<FaceRecognitionRef | null>(null);
  const errorTimeoutRef = useRef<number | null>(null);
  
  const currentUser = authService.getCurrentUser();

  // Check face registration status on component mount | Kiểm tra trạng thái đăng ký khuôn mặt khi component load
  useEffect(() => {
    const checkFaceRegistrationStatus = async () => {
      if (!currentUser) return;
      
      try {
        logger.face.debug('Checking face registration status', { userId: currentUser.id });
        const isRegistered = await faceRecognizeService.isUserRegistered(currentUser.id);
        setFaceRegistrationStatus(isRegistered ? 'registered' : 'not_registered');
        logger.face.info('Face registration status', { userId: currentUser.id, isRegistered });
      } catch (error) {
        logger.face.error('Error checking face registration status', error);
        setFaceRegistrationStatus('unknown');
      }
    };

    checkFaceRegistrationStatus();
  }, [currentUser?.id]);

  // Redirect to login if no user is logged in | Chuyển hướng đến login nếu chưa đăng nhập
  useEffect(() => {
    if (!currentUser) {
      logger.auth.warn('No user logged in, should redirect to login');
      if (onLogout) {
        onLogout();
      }
    }
  }, [currentUser, onLogout]);

  const getUserRegisteredFaceImage = (): string => {
    if (!currentUser) return '';
    
    try {
      logger.api.info('Avatar functionality moved to backend. Consider implementing API call.');
      return '';
    } catch (error) {
      logger.api.error('Error getting user face image', error);
      return '';
    }
  };

  // Load user avatar and listen for face capture events | Tải avatar và lắng nghe sự kiện chụp ảnh
  useEffect(() => {
    const loadUserAvatar = () => {
      const faceImage = getUserRegisteredFaceImage();
      setUserAvatar(faceImage);
    };

    loadUserAvatar();

    const handleNewFaceCapture = () => {
      loadUserAvatar();
    };

    window.addEventListener('newFaceCapture', handleNewFaceCapture);
    
    return () => {
      window.removeEventListener('newFaceCapture', handleNewFaceCapture);
    };
  }, [currentUser?.id]);

  // Load student subjects from backend | Tải danh sách môn học của sinh viên
  useEffect(() => {
    const loadStudentSubjects = async () => {
      if (!currentUser) return;
      
      try {
        setIsLoadingSubjects(true);
        logger.api.debug('Loading student subjects', { userId: currentUser.id });

        let retries = 3;
        let subjects;
        
        while (retries > 0) {
          if (!authService.getToken()) {
            logger.auth.debug(`No token found, waiting... (${retries} retries left)`);
            await new Promise(resolve => setTimeout(resolve, 500));
            retries--;
            continue;
          }
          
          try {
            subjects = await subjectService.getStudentSubjectsFormatted(currentUser.id);
            break;
          } catch (error) {
            logger.api.warn(`Error loading subjects, retrying... (${retries} retries left)`, error);
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        if (!subjects) {
          throw new Error('Failed to load subjects after retries');
        }
        
        logger.api.info('Subjects loaded successfully', { count: subjects.length });
        setAvailableSubjects(subjects);
        
        if (subjects.length === 0) {
          notify.warning('Hiện tại chưa có môn học nào được phân công. Vui lòng liên hệ phòng đào tạo để được hỗ trợ.', {
            title: 'Chưa có môn học',
            ttl: 6000
          });
        }
        
      } catch (error) {
        logger.api.error('Error loading student subjects', error);
        notify.network.connectionError();
        setAvailableSubjects([]);
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    loadStudentSubjects();
  }, [currentUser]);

  const [selectedSubject, setSelectedSubject] = useState<SubjectInfo | null>(null);

  // Auto-select first subject when subjects are loaded | Tự động chọn môn học đầu tiên khi load xong
  useEffect(() => {
    if (availableSubjects.length > 0 && !selectedSubject) {
      setSelectedSubject(availableSubjects[0]);
    }
  }, [availableSubjects, selectedSubject]);

  // Load attendance history from backend | Tải lịch sử điểm danh từ backend
  useEffect(() => {
    const loadAttendanceHistory = async () => {
      if (!currentUser) return;
      
      try {
        logger.attendance.debug('Loading attendance history', { userId: currentUser.id });
        
        const historyData = await attendanceService.getSimpleHistory(currentUser.id);
        
        if (historyData.success && historyData.records.length > 0) {
          const transformedRecords: HomeAttendanceRecord[] = historyData.records.map((record: any) => ({
            id: record.AttendanceId,
            subject: record.subjectId,
            timestamp: new Date(record.checked_in_at).toLocaleString('vi-VN'),
            location: '',
            status: record.status as 'Present' | 'Late' | 'Absent'
          }));
            
          setAttendanceHistory(transformedRecords);
          logger.attendance.info('Loaded attendance history', { count: transformedRecords.length });
        }
        
      } catch (error) {
        logger.attendance.error('Error loading attendance history', error);
      }
    };

    loadAttendanceHistory();
  }, [currentUser]);

  // Cleanup on component unmount | Dọn dẹp khi component unmount
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
    };
  }, []);

  // Handlers

  const handleFaceRecognitionSuccess = async (result: FaceRecognitionResult) => {
    if (isProcessing || isCheckingIn || !currentUser || !selectedSubject) return;
    
    logger.face.info('Face recognition successful, proceeding to unified check-in', { 
      userId: currentUser.id, 
      subjectId: selectedSubject.subjectId 
    });
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
        
        // Stop camera and close modal after successful registration với smooth transition
        setTimeout(() => {
          // Stop camera first
          if (faceRecognitionRef.current) {
            faceRecognitionRef.current.stopCamera();
          }
          
          // Batch update states với requestAnimationFrame
          requestAnimationFrame(() => {
            setShowFaceModal(false);
            setGpsStatus('');
            setIsProcessing(false);
            setIsCheckingIn(false);
            
            // Show success notification
            notify.success(
              `Đăng ký khuôn mặt thành công! Bây giờ bạn có thể sử dụng tính năng điểm danh tự động.`,
              { title: `🎉 Chào ${currentUser.name}`, ttl: 5000 }
            );
          });
        }, 1200); // Giảm thời gian delay một chút
        
      } else {
        throw new Error('Không tìm thấy video element');
      }
    } catch (error) {
      logger.face.error('Face registration error during process', error);
      
      // Batch update states để tránh re-render liên tục
      const errorMessage = '❌ Lỗi khi đăng ký: ' + (error as Error).message;
      
      // Clear any existing timeout
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
      
      // Update multiple states at once using functional updates
      setGpsStatus(errorMessage);
      setIsProcessing(false);
      setIsCheckingIn(false);
      
      // Tự động clear error message sau 4 giây
      errorTimeoutRef.current = window.setTimeout(() => {
        setGpsStatus(prev => prev === errorMessage ? '' : prev); // Chỉ clear nếu vẫn là message cũ
        errorTimeoutRef.current = null;
      }, 4000);
    }
  };

  const handleFaceRecognitionCancel = useCallback(() => {
    // Stop camera before closing
    if (faceRecognitionRef.current) {
      faceRecognitionRef.current.stopCamera();
    }
    
    // Clear any pending timeout
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    
    // Batch update states để tránh multiple re-renders
    requestAnimationFrame(() => {
      setShowFaceModal(false);
      setModalLoadingState({ isLoading: false, message: '', progress: 0 });
      setGpsStatus('');
      setIsProcessing(false);
      setIsCheckingIn(false);
    });
  }, []);

  /**
   * � FACE REGISTRATION: Chỉ đăng ký khuôn mặt, không cần GPS/Time validation
   */
  const performFaceRegistration = async () => {
    if (!currentUser || isCheckingIn) {
      logger.face.error('Cannot register face - invalid state', { 
        hasUser: !!currentUser, 
        isCheckingIn 
      });
      return;
    }

    logger.face.info('Starting face registration', { userId: currentUser.id });
    setIsCheckingIn(true);

    try {
      // 🚀 PROGRESSIVE LOADING: Mở modal với loading overlay
      setShowFaceModal(true);
      setModalLoadingState({
        isLoading: true,
        message: '🔄 Đang khởi tạo hệ thống đăng ký...',
        progress: 0
      });

      // Step 1: Initialize face recognition models
      if (!faceRecognizeService.isReady()) {
        setModalLoadingState({
          isLoading: true,
          message: '🤖 Đang tải AI models nhận diện khuôn mặt... (1/2)',
          progress: 50
        });
        await faceRecognizeService.initializeModels();
        logger.face.info('Face recognition models loaded for registration');
      }

      // Step 2: Preparing camera
      setModalLoadingState({
        isLoading: true,
        message: '📹 Đang khởi động camera... (2/2)',
        progress: 100
      });

      // Set to registration mode
      setIsRegisterMode(true);
      setGpsStatus(`Xin chào ${currentUser.name}! Vui lòng nhìn vào camera để đăng ký khuôn mặt...`);
      logger.ui.debug('Opening camera modal for registration');
      setIsProcessing(false);

      // Hide loading overlay after a short delay
      setTimeout(() => {
        setModalLoadingState({ isLoading: false, message: '', progress: 0 });
      }, 800);

    } catch (error) {
      logger.face.error('Face registration error during modal operation', error);
      
      // Reset loading state
      setModalLoadingState({ isLoading: false, message: '', progress: 0 });
      
      // Batch update states để tránh re-render liên tục
      const resetStates = () => {
        setGpsStatus('');
        setIsCheckingIn(false);
        setShowFaceModal(false);
        setIsProcessing(false);
      };
      
      // Use requestAnimationFrame để smooth state updates
      requestAnimationFrame(() => {
        resetStates();
        // Determine specific camera error type
        const errorMsg = error instanceof Error ? error.message.toLowerCase() : '';
        if (errorMsg.includes('permission') || errorMsg.includes('denied') || errorMsg.includes('quyền')) {
          notify.camera.permissionDenied();
        } else if (errorMsg.includes('not found') || errorMsg.includes('không tìm thấy')) {
          notify.camera.notFound();
        } else if (errorMsg.includes('in use') || errorMsg.includes('đang được sử dụng')) {
          notify.camera.inUse();
        } else {
          notify.camera.error(error instanceof Error ? error.message : undefined);
        }
      });
    }
  };

  /**
   * �🚀 UNIFIED CHECK-IN: Kiểm tra GPS + Time trước, sau đó mới mở camera
   */
  const performUnifiedCheckIn = async (selectedSubject: SubjectInfo) => {
    logger.attendance.info('Starting unified check-in', { 
      subjectId: selectedSubject.subjectId, 
      userId: currentUser?.id 
    });
    
    if (!currentUser || isCheckingIn) {
      logger.attendance.warn('Cannot perform check-in - invalid state', { 
        hasUser: !!currentUser, 
        isCheckingIn 
      });
      return;
    }

    setIsCheckingIn(true);

    try {
      // BƯỚC 1: Kiểm tra eligibility (face registration, đã check-in chưa)
      setGpsStatus('🔍 Đang kiểm tra điều kiện thời gian và vị trí cho phép điểm danh...');
      logger.attendance.debug('Checking eligibility', { subjectId: selectedSubject.subjectId });
      const eligibility = await UnifiedCheckInService.canCheckIn(selectedSubject.subjectId);
      logger.attendance.debug('Eligibility result', eligibility);
      
      if (!eligibility.canCheckIn) {
        throw new Error(eligibility.reason || 'Không thể check-in');
      }

      // BƯỚC 2: Lấy GPS location (force clear cache trước)
      setGpsStatus('📍 Đang xác định vị trí hiện tại của bạn...');
      
      // 🔥 Force clear browser GPS cache trước
      await new Promise<void>((resolve) => {
        let watchId: number | null = null;
        const timeout = setTimeout(() => {
          if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
          }
          resolve();
        }, 100);
        
        try {
          watchId = navigator.geolocation.watchPosition(
            () => {
              if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
              }
              clearTimeout(timeout);
              resolve();
            },
            () => {
              if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
              }
              clearTimeout(timeout);
              resolve();
            },
            { enableHighAccuracy: true, maximumAge: 0, timeout: 100 }
          );
        } catch {
          clearTimeout(timeout);
          resolve();
        }
      });
      
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0 // ✅ FIXED: Không dùng cache - luôn lấy vị trí mới
        });
      });

      // 🔥 Log để verify GPS là mới (không phải cache)
      const gpsAge = Date.now() - position.timestamp;
      consoleLogger.log(`✅ Got GPS position: timestamp=${position.timestamp}, age=${gpsAge}ms, accuracy=${position.coords.accuracy}m`);
      if (gpsAge > 5000) {
        consoleLogger.warn(`⚠️ GPS data might be cached (age: ${gpsAge}ms)`);
      }

      // BƯỚC 3: Validate GPS + Time trước (không cần camera)
      setGpsStatus('⏰ Đang xác thực thời gian và địa điểm điểm danh...');
      
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
      setGpsStatus('✅ Thời gian và vị trí hợp lệ! Đang chuẩn bị camera...');
      setIsCheckingIn(false); // Reset flag để có thể tiếp tục với face recognition

      // Lưu location data để dùng sau
      (window as any).pendingCheckInData = {
        selectedSubject,
        location: userLocation,
        locationResult
      };

      // 🚀 PROGRESSIVE LOADING: Mở modal với loading overlay
      logger.ui.debug('Opening camera modal with progressive loading');
      setShowFaceModal(true);
      setModalLoadingState({
        isLoading: true,
        message: '🔄 Đang khởi tạo hệ thống...',
        progress: 0
      });
      
      // Step 1: Initialize face recognition models (33%)
      if (!faceRecognizeService.isReady()) {
        setModalLoadingState({
          isLoading: true,
          message: '🤖 Đang tải AI models nhận diện khuôn mặt... (1/3)',
          progress: 33
        });
        await faceRecognizeService.initializeModels();
        logger.face.info('Face recognition models loaded');
      }
      
      // Step 2: Check registration status (66%)
      setModalLoadingState({
        isLoading: true,
        message: '📋 Đang kiểm tra trạng thái đăng ký... (2/3)',
        progress: 66
      });
      
      let isUserRegistered = false;
      try {
        isUserRegistered = await faceRecognizeService.isUserRegistered(currentUser.id);
        logger.face.info('Registration check completed', { 
          userId: currentUser.id, 
          isRegistered: isUserRegistered 
        });
      } catch (registrationError) {
        logger.face.error('Error checking registration status', registrationError);
        setModalLoadingState({ isLoading: false, message: '', progress: 0 });
        setShowFaceModal(false);
        throw new Error('Không thể kiểm tra trạng thái đăng ký. Vui lòng thử lại.');
      }
      
      // CHẶN nếu user chưa đăng ký khuôn mặt
      if (!isUserRegistered) {
        setModalLoadingState({ isLoading: false, message: '', progress: 0 });
        setShowFaceModal(false);
        throw new Error('⚠️ Bạn chưa đăng ký khuôn mặt. Vui lòng bấm nút "Đăng Ký Khuôn Mặt" trước khi điểm danh.');
      }

      // Step 3: Preparing camera (100%)
      setModalLoadingState({
        isLoading: true,
        message: '📹 Đang khởi động camera... (3/3)',
        progress: 100
      });

      // User đã đăng ký -> chế độ xác thực
      logger.face.info('User is registered - switching to verification mode');
      setIsRegisterMode(false);
      setGpsStatus(`Xin chào ${currentUser.name}! Vui lòng nhìn vào camera để xác thực...`);
      setIsProcessing(false);

      // Hide loading overlay after a short delay to show camera
      setTimeout(() => {
        setModalLoadingState({ isLoading: false, message: '', progress: 0 });
      }, 800);
      
    } catch (error) {
      logger.face.error('Pre-validation error', error);
      setGpsStatus('');
      setIsCheckingIn(false);
      
      // Parse error to provide specific feedback
      const errorMsg = error instanceof Error ? error.message : '';
      if (errorMsg.includes('GPS') || errorMsg.includes('vị trí') || errorMsg.includes('location')) {
        // GPS/location error - let the specific error message through
        notify.error(errorMsg, { title: 'Lỗi kiểm tra vị trí', ttl: 6000 });
      } else if (errorMsg.includes('thời gian') || errorMsg.includes('time') || errorMsg.includes('chưa tới giờ')) {
        notify.warning(errorMsg, { title: 'Chưa tới giờ học', ttl: 6000 });
      } else {
        notify.error(errorMsg || 'Quá trình kiểm tra thất bại. Vui lòng thử lại sau.', { 
          title: 'Lỗi kiểm tra', 
          ttl: 5000 
        });
      }
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
      notify.error('Không tìm thấy dữ liệu xác thực. Vui lòng thực hiện lại quá trình kiểm tra.', {
        title: 'Lỗi dữ liệu',
        ttl: 5000
      });
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
      setGpsStatus('🎯 Đang thực hiện nhận diện khuôn mặt và lưu thông tin điểm danh...');
      const result: CheckInResult = await UnifiedCheckInService.performCompleteCheckIn(checkInRequest);

      // Display step-by-step results
      setGpsStatus('✅ Điều kiện thời gian và địa điểm đã được xác thực thành công');
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
        const newRecord: HomeAttendanceRecord = {
          id: result.attendanceId || Date.now().toString(),
          subject: `${selectedSubject.name} (${selectedSubject.code})`,
          timestamp: new Date(result.timestamp || Date.now()).toLocaleString('vi-VN'),
          location: '', // Location not shown in history
          status: result.status === 'PRESENT' ? 'Present' : 
                 result.status === 'LATE' ? 'Late' : 
                 result.status === 'ABSENT' ? 'Absent' : 'Present' // ✅ Map backend status to UI format
        };
        
        setAttendanceHistory(prev => [newRecord, ...prev]);
        
        // Use specialized attendance success notification
        const status = result.status === 'PRESENT' ? 'Present' : 'Late';
        notify.attendance.success(selectedSubject.name, status);
        
      } else {
        // Handle failure - determine specific error type
        if (!result.steps.faceRecognition.success) {
          const faceMsg = result.steps.faceRecognition.message || '';
          if (faceMsg.includes('chưa đăng ký') || faceMsg.includes('not registered')) {
            notify.attendance.faceNotRegistered();
          } else {
            notify.attendance.faceNotRecognized();
          }
        } else if (!result.steps.attendanceRecord.success) {
          const attendMsg = result.steps.attendanceRecord.message || '';
          if (attendMsg.includes('đã điểm danh') || attendMsg.includes('already')) {
            notify.attendance.alreadyCheckedIn();
          } else {
            notify.error(attendMsg, { title: 'Lỗi lưu điểm danh', ttl: 5000 });
          }
        }
        
        throw new Error('Check-in failed');
      }

    } catch (error) {
      logger.attendance.error('Face recognition + attendance save error', error);
      setGpsStatus('');
      
      // Only show error if not already shown above
      if (error instanceof Error && error.message !== 'Check-in failed') {
        notify.error(error.message, { title: 'Lỗi điểm danh', ttl: 5000 });
      }
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
                      logger.ui.debug('Check-in button clicked', { 
                        subjectId: selectedSubject?.subjectId, 
                        userId: currentUser?.id 
                      });
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

                  {/* GPS Guide Button */}
                  <button
                    className="w-full py-3 px-6 rounded-lg font-medium text-lg transition-all duration-300 bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:from-purple-600 hover:to-indigo-700 hover:shadow-lg transform hover:scale-105"
                    onClick={() => {
                      logger.ui.debug('GPS Guide button clicked');
                      setShowGPSGuide(true);
                    }}
                  >
                    <div className="flex items-center justify-center">
                      <span className="mr-2">📖</span>
                      Hướng dẫn sử dụng GPS
                    </div>
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
                          logger.ui.debug('Face registration button clicked', { 
                            userId: currentUser?.id, 
                            registrationStatus: faceRegistrationStatus 
                          });
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
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto relative">
            
            {/* 🚀 LOADING OVERLAY */}
            {modalLoadingState.isLoading && (
              <div className="absolute inset-0 bg-white bg-opacity-95 flex flex-col items-center justify-center z-50 rounded-lg">
                <div className="text-center space-y-6 p-8">
                  {/* Spinner */}
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600"></div>
                  </div>
                  
                  {/* Loading Message */}
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-gray-800">
                      {modalLoadingState.message}
                    </p>
                    <p className="text-sm text-gray-500">
                      Vui lòng đợi trong giây lát...
                    </p>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-64 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${modalLoadingState.progress}%` }}
                    ></div>
                  </div>
                  
                  {/* Progress Percentage */}
                  <p className="text-xs font-mono text-gray-600">
                    {modalLoadingState.progress}%
                  </p>
                </div>
              </div>
            )}

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
                    logger.face.error('Face recognition error', error);
                    
                    // Use specialized camera error notification
                    const errorMsg = error.toLowerCase();
                    if (errorMsg.includes('permission') || errorMsg.includes('denied') || errorMsg.includes('quyền')) {
                      notify.camera.permissionDenied();
                    } else if (errorMsg.includes('not found') || errorMsg.includes('không tìm thấy')) {
                      notify.camera.notFound();
                    } else if (errorMsg.includes('in use') || errorMsg.includes('đang được sử dụng')) {
                      notify.camera.inUse();
                    } else {
                      notify.camera.error(error);
                    }
                    
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


      {/* GPS Guide Modal */}
      <GPSGuideModal 
        isOpen={showGPSGuide}
        onClose={() => setShowGPSGuide(false)}
      />

    </div>
  );
};

export default HomeScreen;
