import { GPSService } from '../GPSService/GpsService';
import type { Location } from '../GPSService/GpsService';

export interface CheckInResult {
  success: boolean;
  message: string;
  data?: {
    subject: string;
    time: string;
    location: string;
    status: string;
  };
  // ✅ ADD: Location data for AttendanceService
  locationData?: {
    latitude: number;
    longitude: number;
  };
  error?: string;
}

export interface CheckInProgress {
  status: string;
  step: 'location' | 'verification' | 'processing' | 'complete' | 'error';
}

export interface SubjectInfo {
  name: string;
  code: string;
  subjectId: string; // ✅ ADD: Required for backend GPS validation
  time: string;
  room: string;
  instructor: string;
  schedule?: string;
}

// Mobile detection utility
const isMobile = () => {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Get GPS options optimized for mobile
const getGPSOptions = (): PositionOptions => {
  const mobile = isMobile();
  
  if (mobile) {
    return {
      enableHighAccuracy: true,
      timeout: 15000, // Longer timeout for mobile
      maximumAge: 0 // ✅ FIXED: Không dùng cache - luôn lấy vị trí mới
    };
  } else {
    return {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0 // ✅ FIXED: Không dùng cache - luôn lấy vị trí mới
    };
  }
};

export class CheckInService {
  /**
   * Get location with mobile-optimized settings and multiple samples
   * @param onProgress Callback to report GPS sampling progress
   * @returns Promise<Location>
   */
  static async getLocationWithMobileSupport(
    onProgress?: (progress: { sample: number; total: number; message: string }) => void
  ): Promise<Location> {
    const options = getGPSOptions();
    
    // Sử dụng getAccurateLocation với nhiều mẫu để tăng độ chính xác
    return await GPSService.getAccurateLocation(onProgress, options);
  }

  /**
   * Perform check-in process with GPS verification
   * @param subject Current subject information
   * @param onProgress Callback to report progress updates
   * @returns Promise<CheckInResult>
   */
  static async performCheckIn(
    subject: SubjectInfo,
    onProgress?: (progress: CheckInProgress) => void
  ): Promise<CheckInResult> {
    try {
      // Step 1: Check GPS support and permissions for mobile
      const mobile = isMobile();
      console.log('📍 GPS check for', mobile ? 'mobile' : 'desktop');
      
      if (!navigator.geolocation) {
        throw new Error(mobile ? 
          'GPS không được hỗ trợ trên thiết bị này' : 
          'Geolocation không được hỗ trợ'
        );
      }

      // Request permission on mobile first
      if (mobile && navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          console.log('📍 GPS Permission status:', permission.state);
          
          if (permission.state === 'denied') {
            throw new Error('GPS permission bị từ chối. Vào Settings > Privacy > Location Services để cấp quyền.');
          }
        } catch (permError) {
          console.log('Permission check not available, proceeding...');
        }
      }

      // Step 2: Get current location with accurate sampling
      onProgress?.({ 
        status: mobile ? 'Đang lấy vị trí GPS (nhiều mẫu)...' : 'Getting accurate GPS location...', 
        step: 'location' 
      });
      
      let currentLocation: Location;
      try {
        // Callback để cập nhật progress trong quá trình lấy GPS
        const gpsProgressCallback = (gpsProgress: { sample: number; total: number; accuracy?: number; message: string }) => {
          onProgress?.({ 
            status: gpsProgress.message, 
            step: 'location' 
          });
        };

        currentLocation = await this.getLocationWithMobileSupport(gpsProgressCallback);
        console.log('📍 GPS Success:', currentLocation);
        
        // Hiển thị độ chính xác nếu có
        if (currentLocation.accuracy) {
          const accuracyMsg = mobile ? 
            `GPS: ${currentLocation.accuracy.toFixed(1)}m độ chính xác` :
            `GPS accuracy: ${currentLocation.accuracy.toFixed(1)}m`;
          console.log(`✅ ${accuracyMsg}`);
        }
      } catch (locationError) {
        const errorMessage = mobile ?
          `Lỗi GPS: ${(locationError as Error).message}\n\nVui lòng bật GPS và thử lại.` :
          `GPS Error: ${(locationError as Error).message}\n\nPlease enable location services and try again.`;
        
        onProgress?.({ status: mobile ? 'Lỗi GPS' : 'Location error', step: 'error' });
        
        return {
          success: false,
          message: errorMessage,
          error: 'GPS_ERROR'
        };
      }

      // Step 3: Verify location với backend
      onProgress?.({ status: mobile ? 'Kiểm tra vị trí...' : 'Verifying location...', step: 'verification' });
      
      if (!subject.subjectId) {
        return {
          success: false,
          message: 'Thiếu thông tin môn học để kiểm tra vị trí!',
          error: 'MISSING_SUBJECT_ID'
        };
      }

      let locationCheck;
      try {
        locationCheck = await GPSService.validateLocation(currentLocation, subject.subjectId);
        console.log('Backend location validation result:', locationCheck);
      } catch (validationError) {
        const errorMessage = mobile ?
          `❌ Lỗi kiểm tra vị trí!\n\n${(validationError as Error).message}\n\nVui lòng thử lại.` :
          `❌ Location validation error!\n\n${(validationError as Error).message}\n\nPlease try again.`;
        
        onProgress?.({ status: mobile ? 'Lỗi kiểm tra vị trí' : 'Location validation error', step: 'error' });
        
        return {
          success: false,
          message: errorMessage,
          error: 'LOCATION_VALIDATION_ERROR'
        };
      }

      if (!locationCheck.allowed) {
        const errorMessage = mobile ?
          `❌ ${locationCheck.message}\n\nVui lòng di chuyển đến đúng phòng học để điểm danh.` :
          `❌ ${locationCheck.message}\n\nPlease move to the correct classroom to check in.`;
        
        onProgress?.({ status: mobile ? 'Vị trí không được phép' : 'Location not allowed', step: 'error' });
        
        return {
          success: false,
          message: errorMessage,
          error: 'LOCATION_NOT_ALLOWED'
        };
      }

      // Step 4: Process check-in
      onProgress?.({ status: mobile ? 'Đang xử lý điểm danh...' : 'Processing check-in...', step: 'processing' });
      
      // Simulate check-in processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 5: Complete check-in
      onProgress?.({ status: mobile ? 'Điểm danh thành công' : 'Check-in completed', step: 'complete' });
      
      const successMessage = mobile ?
        `✅ Điểm danh thành công!\n\n` +
        `Môn học: ${subject.name}\n` +
        `Thời gian: ${new Date().toLocaleTimeString()}\n` +
        `Vị trí: Đã xác minh\n` +
        `Trạng thái: Có mặt` :
        `✅ Check-in Successful!\n\n` +
        `Subject: ${subject.name}\n` +
        `Time: ${new Date().toLocaleTimeString()}\n` +
        `Location: Verified\n` +
        `Status: Present`;

      // ✅ UPDATED: Return location data for AttendanceService to handle API call
      
      return {
        success: true,
        message: successMessage,
        data: {
          subject: subject.name,
          time: new Date().toLocaleTimeString(),
          location: 'Verified',
          status: 'Present'
        },
        locationData: {
          latitude: currentLocation.latitude,
          longitude: currentLocation.longitude
        }
      };

    } catch (error) {
      console.error('Check-in error:', error);
      const mobile = isMobile();
      onProgress?.({ status: mobile ? 'Lỗi không mong muốn' : 'Unexpected error', step: 'error' });
      
      return {
        success: false,
        message: mobile ? 
          '❌ Điểm danh thất bại do lỗi không mong muốn. Vui lòng thử lại.' :
          '❌ Check-in failed due to unexpected error. Please try again.',
        error: (error as Error).message
      };
    }
  }

  /**
   * Get current location for debugging purposes
   * @returns Promise<string> Debug information
   */
  static async getLocationDebugInfo(): Promise<string> {
    try {
      const mobile = isMobile();
      const location = await this.getLocationWithMobileSupport();
      
      return (
        `📍 Current Location Debug (${mobile ? 'Mobile' : 'Desktop'}):\n\n` +
        `Latitude: ${location.latitude.toFixed(6)}\n` +
        `Longitude: ${location.longitude.toFixed(6)}\n\n` +
        `Status: Location retrieved successfully\n\n` +
        `Note: Location validation now handled by backend\n` +
        `GPS Options: ${JSON.stringify(getGPSOptions(), null, 2)}`
      );
    } catch (error) {
      return `GPS Error: ${(error as Error).message}`;
    }
  }
}
