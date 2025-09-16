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

export class CheckInService {
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
      // Step 1: Get current location
      onProgress?.({ status: 'Getting location...', step: 'location' });
      
      let currentLocation: Location;
      try {
        currentLocation = await GPSService.getCurrentLocation();
        console.log('Current location:', currentLocation);
      } catch (locationError) {
        const errorMessage = `GPS Error: ${(locationError as Error).message}\n\nPlease enable location services and try again.`;
        onProgress?.({ status: 'Location error', step: 'error' });
        
        return {
          success: false,
          message: errorMessage,
          error: (locationError as Error).message
        };
      }

      // Step 2: Verify location
      onProgress?.({ status: 'Verifying location...', step: 'verification' });
      
      const locationCheck = GPSService.isLocationAllowed(currentLocation);
      console.log('Location check result:', locationCheck);

      if (!locationCheck.allowed) {
        const errorMessage = 
          `❌ Location Not Allowed!\n\n` +
          `You are ${locationCheck.distance}m away from the allowed area.\n` +
          `Please move closer to the campus to check in.\n\n` +
          `Maximum allowed distance: ${GPSService.getAllowedArea().radius}m`;
        
        onProgress?.({ status: 'Location not allowed', step: 'error' });
        
        return {
          success: false,
          message: errorMessage,
          error: 'Location not allowed'
        };
      }

      // Step 3: Process check-in
      onProgress?.({ status: 'Processing check-in...', step: 'processing' });
      
      // Simulate check-in processing
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Step 4: Complete check-in
      onProgress?.({ status: 'Check-in completed', step: 'complete' });
      
      const successMessage = 
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
      onProgress?.({ status: 'Unexpected error', step: 'error' });
      
      return {
        success: false,
        message: '❌ Check-in failed due to unexpected error. Please try again.',
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
      const location = await GPSService.getCurrentLocation();
      const check = GPSService.isLocationAllowed(location);
      const allowedArea = GPSService.getAllowedArea();
      
      return (
        `📍 Current Location Debug:\n\n` +
        `Latitude: ${location.latitude.toFixed(6)}\n` +
        `Longitude: ${location.longitude.toFixed(6)}\n\n` +
        `Allowed Area Center:\n` +
        `Lat: ${allowedArea.latitude.toFixed(6)}\n` +
        `Lng: ${allowedArea.longitude.toFixed(6)}\n` +
        `Radius: ${allowedArea.radius}m\n\n` +
        `Distance: ${check.distance}m\n` +
        `Status: ${check.allowed ? '✅ Allowed' : '❌ Not Allowed'}`
      );
    } catch (error) {
      return `GPS Error: ${(error as Error).message}`;
    }
  }
}
