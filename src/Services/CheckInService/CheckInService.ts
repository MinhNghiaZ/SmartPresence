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
  error?: string;
}

export interface CheckInProgress {
  status: string;
  step: 'location' | 'verification' | 'processing' | 'complete' | 'error';
}

export interface SubjectInfo {
  name: string;
  code: string;
  time: string;
  room: string;
  instructor: string;
  schedule?: string; // Thêm schedule field
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
      maximumAge: 300000 // 5 minutes cache for mobile
    };
  } else {
    return {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // 1 minute cache for desktop
    };
  }
};

export class CheckInService {
  /**
   * Get location with mobile-optimized settings
   * @returns Promise<Location>
   */
  static async getLocationWithMobileSupport(): Promise<Location> {
    const options = getGPSOptions();
    return await GPSService.getCurrentLocation(options);
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

      // Step 2: Get current location
      onProgress?.({ status: mobile ? 'Đang lấy vị trí GPS...' : 'Getting location...', step: 'location' });
      
      let currentLocation: Location;
      try {
        currentLocation = await this.getLocationWithMobileSupport();
        console.log('📍 GPS Success:', currentLocation);
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

      // Step 3: Verify location
      onProgress?.({ status: mobile ? 'Kiểm tra vị trí...' : 'Verifying location...', step: 'verification' });
      
      const locationCheck = GPSService.isLocationAllowed(currentLocation);
      console.log('Location check result:', locationCheck);

      if (!locationCheck.allowed) {
        const errorMessage = mobile ?
          `❌ Vị trí không được phép!\n\n` +
          `Bạn đang cách khu vực cho phép ${locationCheck.distance}m.\n` +
          `Vui lòng di chuyển gần trường hơn để điểm danh.\n\n` +
          `Khoảng cách tối đa: ${GPSService.getAllowedArea().radius}m` :
          `❌ Location Not Allowed!\n\n` +
          `You are ${locationCheck.distance}m away from the allowed area.\n` +
          `Please move closer to the campus to check in.\n\n` +
          `Maximum allowed distance: ${GPSService.getAllowedArea().radius}m`;
        
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
        `Vị trí: Đã xác minh (${locationCheck.distance}m từ trung tâm)\n` +
        `Trạng thái: Có mặt` :
        `✅ Check-in Successful!\n\n` +
        `Subject: ${subject.name}\n` +
        `Time: ${new Date().toLocaleTimeString()}\n` +
        `Location: Verified (${locationCheck.distance}m from center)\n` +
        `Status: Present`;

      // TODO: Send check-in data to API here
      
      return {
        success: true,
        message: successMessage,
        data: {
          subject: subject.name,
          time: new Date().toLocaleTimeString(),
          location: `${locationCheck.distance}m from center`,
          status: 'Present'
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
      const check = GPSService.isLocationAllowed(location);
      const allowedArea = GPSService.getAllowedArea();
      
      return (
        `📍 Current Location Debug (${mobile ? 'Mobile' : 'Desktop'}):\n\n` +
        `Latitude: ${location.latitude.toFixed(6)}\n` +
        `Longitude: ${location.longitude.toFixed(6)}\n\n` +
        `Allowed Area Center:\n` +
        `Lat: ${allowedArea.latitude.toFixed(6)}\n` +
        `Lng: ${allowedArea.longitude.toFixed(6)}\n` +
        `Radius: ${allowedArea.radius}m\n\n` +
        `Distance: ${check.distance}m\n` +
        `Status: ${check.allowed ? '✅ Allowed' : '❌ Not Allowed'}\n\n` +
        `GPS Options: ${JSON.stringify(getGPSOptions(), null, 2)}`
      );
    } catch (error) {
      return `GPS Error: ${(error as Error).message}`;
    }
  }
}
