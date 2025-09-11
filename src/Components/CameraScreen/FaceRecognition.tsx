import { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { faceRecognizeService } from '../../Services/FaceRecognizeService/FaceRecognizeService';
import type { FaceRecognitionResult } from '../../Services/FaceRecognizeService/FaceRecognizeService';
import './FaceRecognition.css';

interface FaceRecognitionProps {
  onRecognitionResult?: (results: FaceRecognitionResult[]) => void;
  onError?: (error: string) => void;
  autoRecognize?: boolean; // Tự động nhận dạng liên tục
  recognizeInterval?: number; // Khoảng thời gian giữa các lần nhận dạng (ms)
  autoStartCamera?: boolean; // Tự động khởi động camera khi mount
}

export interface FaceRecognitionRef {
  stopCamera: () => void;
  startCamera: () => void;
}

const FaceRecognition = forwardRef<FaceRecognitionRef, FaceRecognitionProps>(({
  onRecognitionResult,
  onError,
  autoRecognize = false,
  recognizeInterval = 1000,
  autoStartCamera = false
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<number | null>(null);
  
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [lastResults, setLastResults] = useState<FaceRecognitionResult[]>([]);

  // Khởi tạo models khi component mount
  useEffect(() => {
    initializeService();
    return () => {
      stopCamera();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    stopCamera,
    startCamera
  }));

  // Auto recognize effect
  useEffect(() => {
    if (autoRecognize && isCameraActive && isModelLoaded) {
      startAutoRecognition();
    } else {
      stopAutoRecognition();
    }
    
    return () => stopAutoRecognition();
  }, [autoRecognize, isCameraActive, isModelLoaded, recognizeInterval]);

  const initializeService = async () => {
    try {
      setLoading(true);
      setError('');
      
      if (!faceRecognizeService.isReady()) {
        await faceRecognizeService.initializeModels();
      }
      
      faceRecognizeService.loadFacesFromStorage();
      setIsModelLoaded(true);
      console.log('Face recognition service đã sẵn sàng');
      
      // Tự động khởi động camera nếu được yêu cầu
      if (autoStartCamera) {
        setTimeout(() => {
          startCamera();
        }, 500); // Delay một chút để đảm bảo UI đã render
      }
    } catch (err) {
      const errorMsg = 'Không thể khởi tạo face recognition service: ' + (err as Error).message;
      setError(errorMsg);
      onError?.(errorMsg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 640 }, 
          height: { ideal: 480 },
          facingMode: 'user'
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setupCanvas();
          setIsCameraActive(true);
        };
      }
    } catch (err) {
      const errorMsg = 'Không thể truy cập camera: ' + (err as Error).message;
      setError(errorMsg);
      onError?.(errorMsg);
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
    stopAutoRecognition();
  };

  const setupCanvas = () => {
    if (videoRef.current && canvasRef.current && overlayCanvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const overlayCanvas = overlayCanvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      overlayCanvas.width = video.videoWidth;
      overlayCanvas.height = video.videoHeight;
    }
  };

  const startAutoRecognition = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    intervalRef.current = setInterval(() => {
      recognizeFromVideo();
    }, recognizeInterval);
  };

  const stopAutoRecognition = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const recognizeFromVideo = useCallback(async () => {
    if (!videoRef.current || !overlayCanvasRef.current || !isModelLoaded || isRecognizing) {
      return;
    }

    try {
      setIsRecognizing(true);
      setError('');
      
      const results = await faceRecognizeService.recognizeFace(videoRef.current);
      
      // Vẽ kết quả lên overlay canvas
      const overlayCanvas = overlayCanvasRef.current;
      overlayCanvas.width = videoRef.current.videoWidth;
      overlayCanvas.height = videoRef.current.videoHeight;
      
      faceRecognizeService.drawRecognitionResults(overlayCanvas, results);
      
      setLastResults(results);
      onRecognitionResult?.(results);
      
    } catch (err) {
      const errorMsg = 'Lỗi khi nhận dạng: ' + (err as Error).message;
      setError(errorMsg);
      onError?.(errorMsg);
      console.error(err);
    } finally {
      setIsRecognizing(false);
    }
  }, [isModelLoaded, isRecognizing, onRecognitionResult, onError]);

  const captureAndRegister = async () => {
    if (!videoRef.current || !isModelLoaded) return;

    const personName = prompt('Nhập tên người cần đăng ký:');
    if (!personName) return;

    const personId = Date.now().toString();

    try {
      setError('');
      await faceRecognizeService.registerFace(videoRef.current, personId, personName);
      faceRecognizeService.saveFacesToStorage();
      alert(`Đã đăng ký thành công khuôn mặt cho ${personName}`);
    } catch (err) {
      const errorMsg = 'Lỗi khi đăng ký: ' + (err as Error).message;
      setError(errorMsg);
      onError?.(errorMsg);
      console.error(err);
    }
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    }
  };

  const registeredFaces = faceRecognizeService.getRegisteredFaces();

  return (
    <div className="face-recognition">
      {/* Status Bar */}
      <div className="status-bar">
        <div className="status-indicators">
          <div className={`status-indicator ${loading ? 'loading' : isModelLoaded ? 'ready' : 'error'}`}>
            <span className="status-icon">
              {loading ? '⏳' : isModelLoaded ? '✅' : '❌'}
            </span>
            <span className="status-text">
              {loading ? 'Đang tải...' : isModelLoaded ? 'Models sẵn sàng' : 'Models chưa sẵn sàng'}
            </span>
          </div>
          
          <div className={`status-indicator ${isCameraActive ? 'active' : 'inactive'}`}>
            <span className="status-icon">📹</span>
            <span className="status-text">
              Camera: {isCameraActive ? 'Hoạt động' : 'Tắt'}
            </span>
          </div>

          <div className={`status-indicator ${isRecognizing ? 'active' : 'inactive'}`}>
            <span className="status-icon">🔍</span>
            <span className="status-text">
              {isRecognizing ? 'Đang nhận dạng...' : 'Sẵn sàng'}
            </span>
          </div>
        </div>

        <div className="registered-count">
          <span className="count-icon">👥</span>
          <span className="count-text">{registeredFaces.length} người đã đăng ký</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}

      {/* Camera View */}
      <div className="camera-container">
        <div className="video-wrapper">
          <video
            ref={videoRef}
            className="video-stream"
            muted
            playsInline
            style={{ display: isCameraActive ? 'block' : 'none' }}
          />
          
          {/* Overlay Canvas for face detection */}
          <canvas
            ref={overlayCanvasRef}
            className="overlay-canvas"
            style={{ display: isCameraActive ? 'block' : 'none' }}
          />
          
          {/* Hidden canvas for image capture */}
          <canvas
            ref={canvasRef}
            className="capture-canvas"
            style={{ display: 'none' }}
          />

          {/* Camera Placeholder */}
          {!isCameraActive && (
            <div className="camera-placeholder">
              <div className="placeholder-icon">📷</div>
              <div className="placeholder-text">Camera chưa khởi động</div>
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="controls">
        <div className="control-group">
          <button 
            className="control-btn primary"
            onClick={startCamera}
            disabled={!isModelLoaded || isCameraActive}
          >
            <span className="btn-icon">📹</span>
            Bật Camera
          </button>

          <button 
            className="control-btn secondary"
            onClick={stopCamera}
            disabled={!isCameraActive}
          >
            <span className="btn-icon">⏹️</span>
            Tắt Camera
          </button>
        </div>

        <div className="control-group">
          <button 
            className="control-btn success"
            onClick={recognizeFromVideo}
            disabled={!isModelLoaded || !isCameraActive || isRecognizing}
          >
            <span className="btn-icon">🔍</span>
            {isRecognizing ? 'Đang nhận dạng...' : 'Nhận dạng'}
          </button>

          <button 
            className="control-btn info"
            onClick={captureAndRegister}
            disabled={!isModelLoaded || !isCameraActive}
          >
            <span className="btn-icon">➕</span>
            Đăng ký khuôn mặt
          </button>

          <button 
            className="control-btn warning"
            onClick={captureImage}
            disabled={!isCameraActive}
          >
            <span className="btn-icon">📸</span>
            Chụp ảnh
          </button>
        </div>
      </div>

      {/* Recognition Results */}
      {lastResults.length > 0 && (
        <div className="results-panel">
          <h3 className="results-title">Kết quả nhận dạng:</h3>
          <div className="results-list">
            {lastResults.map((result, index) => (
              <div 
                key={index} 
                className={`result-item ${result.isMatch ? 'match' : 'no-match'}`}
              >
                <div className="result-avatar">
                  {result.isMatch ? '✅' : '❓'}
                </div>
                <div className="result-info">
                  <div className="result-name">
                    {result.isMatch && result.person ? result.person.name : 'Không xác định'}
                  </div>
                  <div className="result-confidence">
                    Độ tin cậy: {result.confidence}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Registered Faces List */}
      {registeredFaces.length > 0 && (
        <div className="registered-panel">
          <h3 className="panel-title">Danh sách đã đăng ký:</h3>
          <div className="registered-list">
            {registeredFaces.map((face) => (
              <div key={face.id} className="registered-item">
                <div className="registered-avatar">👤</div>
                <div className="registered-name">{face.name}</div>
                <button
                  className="remove-btn"
                  onClick={() => {
                    if (confirm(`Xóa ${face.name}?`)) {
                      faceRecognizeService.removeFace(face.id);
                      faceRecognizeService.saveFacesToStorage();
                      // Force re-render
                      setLastResults([...lastResults]);
                    }
                  }}
                >
                  ❌
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

FaceRecognition.displayName = 'FaceRecognition';

export default FaceRecognition;
