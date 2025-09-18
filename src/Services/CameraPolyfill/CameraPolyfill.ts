// Camera polyfill and fallback for older browsers or HTTP environments
export class CameraPolyfill {
  
  // Check if modern MediaDevices API is available
  static isModernAPIAvailable(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  // Check if legacy getUserMedia is available
  static isLegacyAPIAvailable(): boolean {
    return !!(
      (navigator as any).getUserMedia ||
      (navigator as any).webkitGetUserMedia ||
      (navigator as any).mozGetUserMedia ||
      (navigator as any).msGetUserMedia
    );
  }

  // Get user media with polyfill support
  static async getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream> {
    // Try modern API first
    if (this.isModernAPIAvailable()) {
      return navigator.mediaDevices.getUserMedia(constraints);
    }

    // Fallback to legacy API
    if (this.isLegacyAPIAvailable()) {
      return new Promise((resolve, reject) => {
        const getUserMedia = 
          (navigator as any).getUserMedia ||
          (navigator as any).webkitGetUserMedia ||
          (navigator as any).mozGetUserMedia ||
          (navigator as any).msGetUserMedia;

        getUserMedia.call(navigator, constraints, resolve, reject);
      });
    }

    // No camera API available
    throw new Error('Camera API không được hỗ trợ trên browser này');
  }

  // Get environment diagnostics
  static getDiagnostics(): {
    protocol: string;
    isHTTPS: boolean;
    isLocalhost: boolean;
    userAgent: string;
    modernAPI: boolean;
    legacyAPI: boolean;
    recommendation: string;
  } {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    const isHTTPS = protocol === 'https:';
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.includes('192.168.');
    
    const modernAPI = this.isModernAPIAvailable();
    const legacyAPI = this.isLegacyAPIAvailable();

    let recommendation = '';
    
    if (!modernAPI && !legacyAPI) {
      recommendation = 'Browser không hỗ trợ camera. Vui lòng cập nhật browser.';
    } else if (!isHTTPS && !isLocalhost) {
      recommendation = 'Cần HTTPS để sử dụng camera. Truy cập qua https:// hoặc localhost.';
    } else if (!modernAPI && legacyAPI) {
      recommendation = 'Browser cũ được phát hiện. Khuyến khích cập nhật browser.';
    } else {
      recommendation = 'Môi trường hỗ trợ camera.';
    }

    return {
      protocol,
      isHTTPS,
      isLocalhost,
      userAgent: navigator.userAgent,
      modernAPI,
      legacyAPI,
      recommendation
    };
  }

  // Check camera permission status
  static async checkPermissions(): Promise<{
    state: string;
    canRequest: boolean;
    message: string;
  }> {
    try {
      if (navigator.permissions) {
        const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
        return {
          state: permission.state,
          canRequest: permission.state !== 'denied',
          message: permission.state === 'granted' ? 'Camera permission granted' :
                   permission.state === 'denied' ? 'Camera permission denied' :
                   'Camera permission not yet requested'
        };
      }
      
      return {
        state: 'unknown',
        canRequest: true,
        message: 'Permission API không có sẵn, sẽ thử request camera'
      };
    } catch (error) {
      return {
        state: 'error',
        canRequest: true,
        message: 'Không thể kiểm tra permission: ' + (error as Error).message
      };
    }
  }

  // Test camera access with comprehensive error handling
  static async testCamera(): Promise<{
    success: boolean;
    stream?: MediaStream;
    error?: string;
    details: string;
  }> {
    const diagnostics = this.getDiagnostics();
    
    // Check environment first
    if (!diagnostics.isHTTPS && !diagnostics.isLocalhost) {
      return {
        success: false,
        error: 'HTTPS_REQUIRED',
        details: `Camera cần HTTPS. Hiện tại: ${diagnostics.protocol}//${window.location.hostname}`
      };
    }

    if (!diagnostics.modernAPI && !diagnostics.legacyAPI) {
      return {
        success: false,
        error: 'API_NOT_SUPPORTED',
        details: 'Browser không hỗ trợ camera API. Vui lòng cập nhật browser.'
      };
    }

    // Check permissions
    const permissionCheck = await this.checkPermissions();
    console.log('📹 Permission check:', permissionCheck);

    // Try to access camera
    try {
      const stream = await this.getUserMedia({ 
        video: true, 
        audio: false 
      });
      
      // Validate stream
      if (!stream || stream.getVideoTracks().length === 0) {
        return {
          success: false,
          error: 'NO_VIDEO_TRACK',
          details: 'Stream không chứa video track'
        };
      }

      return {
        success: true,
        stream,
        details: `Camera test thành công. API: ${diagnostics.modernAPI ? 'Modern' : 'Legacy'}`
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.name || 'UNKNOWN_ERROR',
        details: error.message || 'Unknown camera error'
      };
    }
  }
}