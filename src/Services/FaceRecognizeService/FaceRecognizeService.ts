import * as faceapi from 'face-api.js';
import { authService } from '../AuthService/AuthService';
import { StorageHelper } from '../../utils/storageHelper';
import { ErrorTracker, ErrorCategory, ErrorSeverity } from '../../utils/ErrorTracker';
import type {
  FaceRegistrationRequest,
  FaceRecognitionRequest,
  FaceRecognitionResponse,
  StudentFaceInfo,
  FaceDescriptor,
  FaceRecognitionResult
} from '../../models';

export class FaceRecognizeService {
  private isModelsLoaded = false;
  private readonly MODEL_URL = '/models';
  private readonly API_BASE = '/api/face';

  /**
   * Khởi tạo và tải các model cần thiết cho face-api.js
   */
  async initializeModels(): Promise<void> {
    try {
      if (this.isModelsLoaded) {
        console.log('✅ Models đã được tải trước đó');
        return;
      }

      console.log('🔄 Đang tải Face Recognition models...');

      // Tải các model cần thiết
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(this.MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(this.MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(this.MODEL_URL),
      ]);

      this.isModelsLoaded = true;
      console.log('✅ Tất cả Face Recognition models đã được tải thành công');
    } catch (error) {
      ErrorTracker.trackError({
        category: ErrorCategory.FACE_RECOGNITION,
        severity: ErrorSeverity.CRITICAL,
        message: 'Failed to load face recognition models',
        error: error as Error,
        context: {
          service: 'FaceRecognizeService',
          method: 'initializeModels',
          modelUrl: this.MODEL_URL
        }
      });
      console.error('❌ Lỗi khi tải models:', error);
      throw new Error('Không thể tải models cho face recognition');
    }
  }

  /**
   * Kiểm tra xem models đã được tải chưa
   */
  isReady(): boolean {
    return this.isModelsLoaded;
  }

  /**
   * Convert image element to base64 string
   */
  private imageToBase64(imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    if (imageElement instanceof HTMLVideoElement) {
      canvas.width = imageElement.videoWidth;
      canvas.height = imageElement.videoHeight;
    } else {
      canvas.width = imageElement.width;
      canvas.height = imageElement.height;
    }

    ctx.drawImage(imageElement, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
  }

  /**
   * Phát hiện khuôn mặt trong ảnh và trích xuất descriptor
   */
  async detectFace(imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<faceapi.WithFaceDetection<{}>>>[]> {
    if (!this.isModelsLoaded) {
      throw new Error('Models chưa được tải. Hãy gọi initializeModels() trước');
    }

    try {
      const detections = await faceapi
        .detectAllFaces(imageElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true)
        .withFaceDescriptors();

      return detections;
    } catch (error) {
      console.error('Lỗi khi phát hiện khuôn mặt:', error);
      throw error;
    }
  }

  /**
   * Đăng ký khuôn mặt mới vào hệ thống (Backend API)
   */
  async registerFace(
    imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    studentId: string,
    studentName: string
  ): Promise<boolean> {
    try {
      console.log(`🔍 Registering face for student: ${studentId} (${studentName})`);

      // Kiểm tra token trước khi làm gì
      const token = authService.getToken();
      if (!token) {
        ErrorTracker.trackError({
          category: ErrorCategory.AUTHENTICATION,
          severity: ErrorSeverity.HIGH,
          message: 'Token not found during face registration',
          context: {
            service: 'FaceRecognizeService',
            method: 'registerFace',
            studentId
          }
        });
        throw new Error('Không tìm thấy token đăng nhập. Vui lòng đăng nhập lại.');
      }

      const detections = await this.detectFace(imageElement);

      if (detections.length === 0) {
        throw new Error('Không tìm thấy khuôn mặt nào trong ảnh');
      }

      if (detections.length > 1) {
        throw new Error('Phát hiện nhiều hơn 1 khuôn mặt. Vui lòng sử dụng ảnh chỉ có 1 người');
      }

      // Convert Float32Array to regular array for JSON
      const descriptor: number[] = Array.from(detections[0].descriptor);

      // Get image data as base64
      const imageData = this.imageToBase64(imageElement);

      const request: FaceRegistrationRequest = {
        studentId,
        descriptor,
        imageData
      };

      const response = await fetch(`${this.API_BASE}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.');
        }
        throw new Error(`Lỗi server: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        console.log(`✅ Face registered successfully for ${studentName}`);
        return true;
      } else {
        console.error(`❌ Face registration failed: ${result.message}`);
        throw new Error(result.message || 'Face registration failed');
      }

    } catch (error) {
      ErrorTracker.trackError({
        category: ErrorCategory.FACE_RECOGNITION,
        severity: ErrorSeverity.HIGH,
        message: 'Face registration failed',
        error: error as Error,
        context: {
          service: 'FaceRecognizeService',
          method: 'registerFace',
          studentId,
          studentName
        }
      });
      console.error('❌ Error registering face:', error);
      throw error;
    }
  }

  /**
   * Nhận dạng khuôn mặt từ ảnh (Backend API)
   */
  async recognizeFace(
    imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    subjectId?: string,
    timeSlotId?: string
  ): Promise<FaceRecognitionResult> {
    try {
      console.log('🔍 Starting face recognition...');

      const detections = await this.detectFace(imageElement);

      if (detections.length === 0) {
        return {
          isMatch: false,
          confidence: 0
        };
      }

      // Convert Float32Array to regular array for JSON
      const descriptor: number[] = Array.from(detections[0].descriptor);

      // Get image data as base64
      const imageData = this.imageToBase64(imageElement);

      // ✅ LẤY CURRENT USER ID từ authService thay vì trực tiếp localStorage
      const currentUser = authService.getCurrentUser();
      const studentId = currentUser?.id;

      if (!studentId) {
        console.error('❌ No current user found');
        return {
          isMatch: false,
          confidence: 0
        };
      }

      const request: FaceRecognitionRequest = {
        descriptor,
        imageData,
        subjectId,
        timeSlotId,
        studentId // ✅ TRUYỀN STUDENT ID
      };

      const token = authService.getToken();
      const response = await fetch(`${this.API_BASE}/recognize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(request)
      });

      const result: FaceRecognitionResponse = await response.json();

      if (result.success) {
        console.log(`✅ Face recognition completed: ${result.message}`);

        // Convert backend response to legacy format for compatibility
        return {
          isMatch: result.isMatch,
          confidence: result.confidence,
          person: result.isMatch ? {
            id: result.studentId!,
            name: result.studentName!,
            descriptor: new Float32Array(descriptor) // Convert back for legacy compatibility
          } : undefined,
          box: detections[0].detection.box,
          imageData: imageData, // ✅ Include captured image data
          descriptor: descriptor // ✅ Include face descriptor
        };
      } else {
        console.error(`❌ Face recognition failed: ${result.message}`);
        return {
          isMatch: false,
          confidence: 0
        };
      }

    } catch (error) {
      console.error('❌ Error recognizing face:', error);
      return {
        isMatch: false,
        confidence: 0
      };
    }
  }

  /**
   * Kiểm tra sinh viên đã đăng ký khuôn mặt chưa (Backend API)
   */
  async isUserRegistered(studentId: string): Promise<boolean> {
    try {
      const token = authService.getToken();
      
      if (!token) {
        console.error('❌ No token found - user may need to re-login');
        throw new Error('Authentication token not found. Please login again.');
      }

      const response = await fetch(`${this.API_BASE}/check/${studentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('❌ API error:', response.status, response.statusText);
        if (response.status === 401) {
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      return result.success && result.registered;
    } catch (error) {
      console.error('❌ Error checking registration:', error);
      throw error; // Re-throw để UI có thể handle
    }
  }

  /**
   * Lấy thông tin face registration của sinh viên (Backend API)
   */
  async getStudentFaceInfo(studentId: string): Promise<StudentFaceInfo> {
    try {
      const token = authService.getToken();
      
      if (!token) {
        console.error('❌ No token found - user may need to re-login');
        throw new Error('Authentication token not found. Please login again.');
      }
      
      const response = await fetch(`${this.API_BASE}/check/${studentId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('❌ API error:', response.status, response.statusText);
        if (response.status === 401) {
          throw new Error('Session expired. Please login again.');
        }
        throw new Error(`API error: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        return {
          studentId: result.studentId,
          registered: result.registered,
          name: result.name,
          canRegister: result.canRegister,
          reason: result.reason
        };
      } else {
        return {
          studentId,
          registered: false,
          canRegister: false,
          reason: 'Error checking registration status'
        };
      }
    } catch (error) {
      console.error('❌ Error getting student face info:', error);
      return {
        studentId,
        registered: false,
        canRegister: false,
        reason: 'System error'
      };
    }
  }

  // Legacy methods for backward compatibility - deprecated

  /**
   * @deprecated Use getStudentFaceInfo instead
   */
  getAllKnownFaces(): FaceDescriptor[] {
    console.warn('⚠️ getAllKnownFaces() is deprecated. Face data is now stored in backend.');
    return [];
  }

  /**
   * @deprecated Use registerFace instead  
   */
  removeFace(_personId: string): boolean {
    console.warn('⚠️ removeFace() is deprecated. Contact admin to reset face registration.');
    return false;
  }

  /**
   * @deprecated Face data is now stored in backend
   */
  clearAllFaces(): void {
    console.warn('⚠️ clearAllFaces() is deprecated. Face data is now stored in backend.');
  }

  /**
   * @deprecated Face data is now stored in backend
   */
  saveFacesToStorage(): void {
    console.warn('⚠️ saveFacesToStorage() is deprecated. Face data is automatically saved to backend.');
  }

  /**
   * @deprecated Face data is now stored in backend
   */
  loadFacesFromStorage(): void {
    console.warn('⚠️ loadFacesFromStorage() is deprecated. Face data is loaded from backend.');
  }

  /**
   * @deprecated Match threshold is now configured in backend
   */
  setMatchThreshold(threshold: number): void {
    console.warn('⚠️ setMatchThreshold() is deprecated. Match threshold is now configured in backend.');
    console.log(`Requested threshold: ${threshold} (ignored)`);
  }

  /**
   * Vẽ khung bao quanh khuôn mặt được phát hiện
   */
  drawFaceDetections(
    canvas: HTMLCanvasElement,
    detections: faceapi.WithFaceDetection<{}>[]
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    detections.forEach(detection => {
      const box = detection.detection.box;
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(box.x, box.y, box.width, box.height);
    });
  }

  /**
   * Vẽ kết quả nhận dạng khuôn mặt với tên và độ tin cậy
   */
  drawRecognitionResults(
    canvas: HTMLCanvasElement,
    results: FaceRecognitionResult[]
  ): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    results.forEach(result => {
      if (result.box) {
        const box = result.box;

        // Vẽ khung
        ctx.strokeStyle = result.isMatch ? '#00ff00' : '#ff0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(box.x, box.y, box.width, box.height);

        // Vẽ text
        ctx.fillStyle = result.isMatch ? '#00ff00' : '#ff0000';
        ctx.font = '16px Arial';

        const label = result.isMatch && result.person
          ? `${result.person.name} (${result.confidence}%)`
          : `Unknown (${result.confidence}%)`;

        ctx.fillText(label, box.x, box.y - 10);
      }
    });
  }

  /**
   * Lấy ảnh từ video stream
   */
  captureImageFromVideo(video: HTMLVideoElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    return canvas;
  }

  /**
   * Resize ảnh về kích thước chuẩn để cải thiện performance
   */
  resizeImage(imageElement: HTMLImageElement | HTMLCanvasElement, maxWidth: number = 640, maxHeight: number = 480): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('Không thể tạo canvas context');
    }

    // Tính toán kích thước mới giữ nguyên tỷ lệ
    const originalWidth = imageElement instanceof HTMLImageElement ? imageElement.naturalWidth : imageElement.width;
    const originalHeight = imageElement instanceof HTMLImageElement ? imageElement.naturalHeight : imageElement.height;

    const ratio = Math.min(maxWidth / originalWidth, maxHeight / originalHeight);

    canvas.width = originalWidth * ratio;
    canvas.height = originalHeight * ratio;

    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);

    return canvas;
  }

  /**
   * Delete face embedding for a student (Admin only)
   */
  async deleteFaceEmbedding(
    studentId: string,
    adminId: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const token = StorageHelper.getItem('token');
      const response = await fetch(
        `${this.API_BASE}/delete-embedding/${studentId}`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ adminId })
        }
      );
      return await response.json();
    } catch (error) {
      console.error('Error deleting face embedding:', error);
      return { success: false, message: 'Network error' };
    }
  }
}

// Export singleton instance
export const faceRecognizeService = new FaceRecognizeService();
