import * as faceapi from 'face-api.js';

export interface FaceDescriptor {
  id: string;
  name: string;
  descriptor: Float32Array;
}

export interface FaceRecognitionResult {
  isMatch: boolean;
  confidence: number;
  person?: FaceDescriptor;
  box?: faceapi.Box;
}

export class FaceRecognizeService {
  private isModelsLoaded = false;
  private knownFaces: FaceDescriptor[] = [];
  private readonly MODEL_URL = '/models';
  private readonly FACE_MATCH_THRESHOLD = 0.6; // Ngưỡng nhận dạng khuôn mặt

  /**
   * Khởi tạo và tải các model cần thiết cho face-api.js
   */
  async initializeModels(): Promise<void> {
    try {
      if (this.isModelsLoaded) {
        console.log('Models đã được tải trước đó');
        return;
      }

      console.log('Đang tải models...');
      
      // Tải các model cần thiết
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(this.MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(this.MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(this.MODEL_URL),
      ]);

      this.isModelsLoaded = true;
      console.log('Tất cả models đã được tải thành công');
    } catch (error) {
      console.error('Lỗi khi tải models:', error);
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
   * Đăng ký khuôn mặt mới vào hệ thống
   */
  async registerFace(
    imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
    personId: string,
    personName: string
  ): Promise<boolean> {
    try {
      const detections = await this.detectFace(imageElement);
      
      if (detections.length === 0) {
        throw new Error('Không tìm thấy khuôn mặt nào trong ảnh');
      }

      if (detections.length > 1) {
        throw new Error('Phát hiện nhiều hơn 1 khuôn mặt. Vui lòng sử dụng ảnh chỉ có 1 người');
      }

      const faceDescriptor: FaceDescriptor = {
        id: personId,
        name: personName,
        descriptor: detections[0].descriptor
      };

      // Kiểm tra xem người này đã được đăng ký chưa
      const existingIndex = this.knownFaces.findIndex(face => face.id === personId);
      if (existingIndex !== -1) {
        // Cập nhật descriptor mới
        this.knownFaces[existingIndex] = faceDescriptor;
        console.log(`Cập nhật khuôn mặt cho ${personName}`);
      } else {
        // Thêm mới
        this.knownFaces.push(faceDescriptor);
        console.log(`Đăng ký khuôn mặt mới cho ${personName}`);
      }

      return true;
    } catch (error) {
      console.error('Lỗi khi đăng ký khuôn mặt:', error);
      throw error;
    }
  }

  /**
   * Nhận dạng khuôn mặt từ ảnh so với database đã lưu
   */
  async recognizeFace(imageElement: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement): Promise<FaceRecognitionResult[]> {
    try {
      const detections = await this.detectFace(imageElement);
      const results: FaceRecognitionResult[] = [];

      if (detections.length === 0) {
        return results;
      }

      for (const detection of detections) {
        let bestMatch: FaceDescriptor | undefined;
        let bestDistance = Infinity;

        // So sánh với tất cả khuôn mặt đã lưu
        for (const knownFace of this.knownFaces) {
          const distance = faceapi.euclideanDistance(detection.descriptor, knownFace.descriptor);
          
          if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = knownFace;
          }
        }

        const isMatch = bestDistance < this.FACE_MATCH_THRESHOLD;
        const confidence = Math.max(0, (1 - bestDistance) * 100); // Chuyển đổi khoảng cách thành % tin cậy

        results.push({
          isMatch,
          confidence: parseFloat(confidence.toFixed(2)),
          person: isMatch ? bestMatch : undefined,
          box: detection.detection.box
        });
      }

      return results;
    } catch (error) {
      console.error('Lỗi khi nhận dạng khuôn mặt:', error);
      throw error;
    }
  }

  /**
   * Lấy danh sách khuôn mặt đã đăng ký
   */
  getRegisteredFaces(): FaceDescriptor[] {
    return [...this.knownFaces];
  }

  /**
   * Kiểm tra xem user có ID cụ thể đã đăng ký khuôn mặt chưa
   */
  isUserRegistered(userId: string): boolean {
    return this.knownFaces.some(face => face.id === userId);
  }

  /**
   * Xóa khuôn mặt đã đăng ký
   */
  removeFace(personId: string): boolean {
    const index = this.knownFaces.findIndex(face => face.id === personId);
    if (index !== -1) {
      this.knownFaces.splice(index, 1);
      console.log(`Đã xóa khuôn mặt có ID: ${personId}`);
      return true;
    }
    return false;
  }

  /**
   * Xóa tất cả khuôn mặt đã đăng ký
   */
  clearAllFaces(): void {
    this.knownFaces = [];
    console.log('Đã xóa tất cả khuôn mặt đã đăng ký');
  }

  /**
   * Lưu dữ liệu khuôn mặt vào localStorage
   */
  saveFacesToStorage(): void {
    try {
      const facesData = this.knownFaces.map(face => ({
        id: face.id,
        name: face.name,
        descriptor: Array.from(face.descriptor) // Chuyển Float32Array thành Array thường để JSON hóa
      }));
      
      localStorage.setItem('registeredFaces', JSON.stringify(facesData));
      console.log('Đã lưu dữ liệu khuôn mặt vào localStorage');
    } catch (error) {
      console.error('Lỗi khi lưu dữ liệu khuôn mặt:', error);
    }
  }

  /**
   * Tải dữ liệu khuôn mặt từ localStorage
   */
  loadFacesFromStorage(): void {
    try {
      const storedData = localStorage.getItem('registeredFaces');
      if (storedData) {
        const facesData = JSON.parse(storedData);
        this.knownFaces = facesData.map((face: any) => ({
          id: face.id,
          name: face.name,
          descriptor: new Float32Array(face.descriptor) // Chuyển Array thường thành Float32Array
        }));
        console.log(`Đã tải ${this.knownFaces.length} khuôn mặt từ localStorage`);
      }
    } catch (error) {
      console.error('Lỗi khi tải dữ liệu khuôn mặt:', error);
    }
  }

  /**
   * Thiết lập ngưỡng nhận dạng khuôn mặt
   */
  setMatchThreshold(threshold: number): void {
    if (threshold >= 0 && threshold <= 1) {
      (this as any).FACE_MATCH_THRESHOLD = threshold;
      console.log(`Đã thiết lập ngưỡng nhận dạng: ${threshold}`);
    } else {
      throw new Error('Ngưỡng phải nằm trong khoảng 0-1');
    }
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
}

// Export singleton instance
export const faceRecognizeService = new FaceRecognizeService();
