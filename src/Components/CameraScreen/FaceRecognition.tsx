import { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import { useNotifications } from '../../context/NotificationContext';
import { faceRecognizeService } from '../../Services/FaceRecognizeService/FaceRecognizeService';
import { CameraPolyfill } from '../../Services/CameraPolyfill';
import CameraRequirements from '../CameraRequirements';
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

// Mobile detection utility
const isMobile = () => {
  return /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

// Get camera constraints optimized for mobile with fallbacks
const getCameraConstraints = (fallback = false): MediaStreamConstraints => {
  const mobile = isMobile();
  
  if (fallback) {
    // Minimal constraints for maximum compatibility
    return {
      video: true,
      audio: false
    };
  }
  
  if (mobile) {
    return {
      video: {
        width: { ideal: 480, max: 640 },
        height: { ideal: 360, max: 480 },
        facingMode: 'user', // Front camera for mobile
        frameRate: { ideal: 15, max: 24 } // Lower framerate for mobile performance
      },
      audio: false
    };
  } else {
    return {
      video: {
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 }
      },
      audio: false
    };
  }
};

// Check if camera is available with comprehensive diagnostics using polyfill
const checkCameraSupport = async (): Promise<{
  supported: boolean;
  details: string;
  cameras: MediaDeviceInfo[];
  diagnostics: any;
}> => {
  const result = {
    supported: false,
    details: '',
    cameras: [] as MediaDeviceInfo[],
    diagnostics: null as any
  };

  try {
    // Get comprehensive diagnostics
    const diagnostics = CameraPolyfill.getDiagnostics();
    result.diagnostics = diagnostics;

    // Check environment requirements
    if (!diagnostics.isHTTPS && !diagnostics.isLocalhost) {
      result.details = `HTTPS Required: Camera cần HTTPS. Hiện tại: ${diagnostics.protocol}//${location.hostname}`;
      return result;
    }

    // Check API availability
    if (!diagnostics.modernAPI && !diagnostics.legacyAPI) {
      result.details = 'Browser không hỗ trợ camera API. Vui lòng cập nhật browser.';
      return result;
    }

    // Try to enumerate devices (if modern API available)
    if (diagnostics.modernAPI && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        result.cameras = devices.filter(device => device.kind === 'videoinput');
        
        if (result.cameras.length === 0) {
          result.details = 'Không tìm thấy camera nào trên thiết bị';
          return result;
        }
      } catch (enumError) {
        result.details = 'Không thể liệt kê devices: ' + (enumError as Error).message;
        return result;
      }
    }

    // Test actual camera access using polyfill
    const cameraTest = await CameraPolyfill.testCamera();
    
    if (cameraTest.success) {
      result.supported = true;
      result.details = cameraTest.details;
      
      // Clean up test stream
      if (cameraTest.stream) {
        cameraTest.stream.getTracks().forEach(track => track.stop());
      }
    } else {
      result.details = cameraTest.details;
    }

    return result;

  } catch (error) {
    result.details = 'Lỗi kiểm tra camera: ' + (error as Error).message;
    return result;
  }
};

const FaceRecognition = forwardRef<FaceRecognitionRef, FaceRecognitionProps>(({
  onRecognitionResult,
  onError,
  autoRecognize = false,
  recognizeInterval = 1000,
  autoStartCamera = false
}, ref) => {
  const notify = useNotifications();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const intervalRef = useRef<number | null>(null);
  // Prevent duplicate side-effects (React StrictMode double-invoke in dev) & error spam
  const autoStartTimeoutRef = useRef<number | null>(null);
  const isStartingCameraRef = useRef(false);
  const lastErrorRef = useRef<{ msg: string; ts: number } | null>(null);

  // Centralized error emitter with de-duplication (2s window)
  const emitError = useCallback((rawMsg: string) => {
    const msg = rawMsg.trim();
    const now = Date.now();
    const last = lastErrorRef.current;
    if (last && last.msg === msg && now - last.ts < 2000) {
      // Skip duplicate
      return;
    }
    lastErrorRef.current = { msg, ts: now };
    setError(msg);
    onError?.(msg);
  }, [onError]);
  
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isRecognizing, setIsRecognizing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [lastResults, setLastResults] = useState<FaceRecognitionResult[]>([]);
  const [showRequirements, setShowRequirements] = useState(false);

  // Khởi tạo models khi component mount
  useEffect(() => {
    initializeService();
    return () => {
      stopCamera();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (autoStartTimeoutRef.current) {
        clearTimeout(autoStartTimeoutRef.current);
        autoStartTimeoutRef.current = null;
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
        if (autoStartTimeoutRef.current) {
          clearTimeout(autoStartTimeoutRef.current);
        }
        autoStartTimeoutRef.current = window.setTimeout(() => {
          startCamera();
        }, 500);
      }
    } catch (err) {
      // Error propagation contract:
      //  - This component sets local error state & calls onError
      //  - Parent (e.g. HomeScreen) is solely responsible for user-facing notifications
      //  - Do NOT push notifications here to avoid duplicate toasts
  const errorMsg = 'Không thể khởi tạo face recognition service: ' + (err as Error).message;
  emitError(errorMsg);
  console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startCamera = async () => {
    if (isStartingCameraRef.current || isCameraActive) {
      return; // Guard against re-entry / duplicate start
    }
    isStartingCameraRef.current = true;
    try {
      setError('');
      
      // Comprehensive camera check first
      console.log('📹 Starting comprehensive camera check...');
      const cameraCheck = await checkCameraSupport();
      
      if (!cameraCheck.supported) {
        // Check if it's an HTTPS issue
        if (cameraCheck.details.includes('HTTPS') || cameraCheck.details.includes('https')) {
          setShowRequirements(true);
          return;
        }
        throw new Error(cameraCheck.details);
      }
      
      console.log('📹 Camera check passed:', cameraCheck.details);
      console.log('📹 Available cameras:', cameraCheck.cameras.length);

      let stream: MediaStream | null = null;
      
      // Try multiple camera access strategies using polyfill
      const strategies = [
        // Strategy 1: Mobile optimized with polyfill
        () => CameraPolyfill.getUserMedia(getCameraConstraints(false)),
        // Strategy 2: Basic fallback with polyfill
        () => CameraPolyfill.getUserMedia(getCameraConstraints(true)),
        // Strategy 3: Minimal constraints with polyfill
        () => CameraPolyfill.getUserMedia({ video: true, audio: false }),
        // Strategy 4: No constraints with polyfill
        () => CameraPolyfill.getUserMedia({ video: {} })
      ];
      
      for (let i = 0; i < strategies.length; i++) {
        try {
          console.log(`📹 Trying camera strategy ${i + 1}/${strategies.length}`);
          stream = await strategies[i]();
          console.log(`📹 Strategy ${i + 1} succeeded!`);
          break;
        } catch (strategyError) {
          console.warn(`📹 Strategy ${i + 1} failed:`, strategyError);
          if (i === strategies.length - 1) {
            throw strategyError; // Last strategy failed, throw error
          }
        }
      }
      
      if (!stream) {
        throw new Error('Tất cả camera strategies đã thất bại');
      }
      
      // Validate stream
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length === 0) {
        stream.getTracks().forEach(track => track.stop());
        throw new Error('Stream không chứa video track');
      }
      
      const videoTrack = videoTracks[0];
      console.log('📹 Video track info:', {
        label: videoTrack.label,
        kind: videoTrack.kind,
        readyState: videoTrack.readyState,
        settings: videoTrack.getSettings?.()
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.playsInline = true;
        videoRef.current.muted = true;
        videoRef.current.autoplay = true;
        
        // Wait for video to be ready
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!;
          const timeout = setTimeout(() => {
            reject(new Error('Video load timeout - Camera có thể bị khóa hoặc đang được sử dụng'));
          }, 20000); // Even longer timeout
          
          const onLoadedMetadata = () => {
            clearTimeout(timeout);
            cleanup();
            
            console.log('📹 Video metadata loaded:', {
              videoWidth: video.videoWidth,
              videoHeight: video.videoHeight,
              duration: video.duration,
              readyState: video.readyState
            });
            
            // Force play
            video.play()
              .then(() => {
                setupCanvas();
                setIsCameraActive(true);
                console.log('📹 Camera started successfully');
                resolve();
              })
              .catch((playError) => {
                console.error('Video play failed:', playError);
                reject(new Error('Không thể phát video từ camera: ' + playError.message));
              });
          };
          
          const onError = (event: Event) => {
            cleanup();
            console.error('Video element error:', event);
            reject(new Error('Lỗi video element'));
          };
          
          const cleanup = () => {
            clearTimeout(timeout);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('error', onError);
          };
          
          video.addEventListener('loadedmetadata', onLoadedMetadata);
          video.addEventListener('error', onError);
        });
      }
    } catch (err) {
    console.error('📹 Camera Error:', err);
      let errorMsg = 'Không thể truy cập camera';
      
      if (err instanceof Error) {
        const errorName = (err as any).name || '';
        
        if (errorName === 'NotAllowedError') {
          errorMsg = isMobile() ? 
            '🚫 Camera Permission Required\n\n' +
            'Các bước cấp quyền:\n' +
            '• Chrome: Nhấn biểu tượng 🔒 trong thanh địa chỉ\n' +
            '• Safari: Settings > Safari > Camera > Allow\n' +
            '• Reload trang sau khi cấp quyền' :
            '🚫 Camera Permission Denied\n\n' +
            'Click the camera icon 📷 in the address bar\n' +
            'and allow camera access.';
        } else if (errorName === 'NotFoundError') {
          errorMsg = '📷 No Camera Found\n\n' +
            'Kiểm tra:\n' +
            '• Camera có được kết nối không?\n' +
            '• Đóng apps khác đang dùng camera\n' +
            '• Thử camera khác nếu có';
        } else if (errorName === 'NotSupportedError') {
          errorMsg = '🚫 Camera Not Supported\n\n' +
            (isMobile() ? 
              'Yêu cầu:\n• Chrome hoặc Safari mới nhất\n• Kết nối HTTPS\n• Permissions đầy đủ' :
              'Requirements:\n• Modern browser (Chrome/Firefox/Safari)\n• HTTPS connection\n• Camera permissions');
        } else if (errorName === 'NotReadableError') {
          errorMsg = '🔒 Camera In Use\n\n' +
            'Camera đang được sử dụng bởi:\n' +
            '• Tab browser khác\n' +
            '• Ứng dụng khác (Zoom, Teams, etc.)\n' +
            '• Đóng chúng và thử lại';
        } else if (errorName === 'SecurityError') {
          errorMsg = '🔐 Security Error\n\n' +
            'Yêu cầu:\n' +
            '• HTTPS connection (hiện tại: ' + location.protocol + ')\n' +
            '• Proper camera permissions\n' +
            '• Trusted domain';
        } else {
          errorMsg = '❌ Camera Error\n\n' + err.message;
        }
      }
      
  // Avoid double notification: rely on onError callback for parent UI
  emitError(errorMsg);
    }
    finally {
      isStartingCameraRef.current = false;
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
    
    // Use longer interval for mobile to improve performance
    const interval = isMobile() ? Math.max(recognizeInterval * 2, 3000) : recognizeInterval;
    console.log('🔄 Starting auto recognition with interval:', interval, 'ms for', isMobile() ? 'mobile' : 'desktop');
    
    intervalRef.current = setInterval(() => {
      recognizeFromVideo();
    }, interval);
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
  emitError(errorMsg);
  console.error(err);
    } finally {
      setIsRecognizing(false);
    }
  }, [isModelLoaded, isRecognizing, onRecognitionResult, onError]);

  // Test camera function for debugging
  const testCamera = async () => {
    console.log('🔧 Testing camera support...');
    setError(''); // Clear previous errors
    
    try {
      const cameraCheck = await checkCameraSupport();
      
      console.log('📹 Camera Check Result:', cameraCheck);
      
      let message = `📹 Camera Test Results:\n\n`;
      message += `✅ Supported: ${cameraCheck.supported ? 'YES' : 'NO'}\n`;
      message += `📋 Details: ${cameraCheck.details}\n\n`;
      
      if (cameraCheck.cameras.length > 0) {
        message += `� Available Cameras (${cameraCheck.cameras.length}):\n`;
        cameraCheck.cameras.forEach((camera, index) => {
          message += `${index + 1}. ${camera.label || 'Unknown Camera'}\n`;
        });
      } else {
        message += `📷 No cameras detected\n`;
      }
      
      message += `\n🌐 Environment:\n`;
      message += `• Protocol: ${location.protocol}\n`;
      message += `• Host: ${location.hostname}\n`;
      message += `• User Agent: ${navigator.userAgent.slice(0, 50)}...\n`;
      message += `• Mobile: ${isMobile() ? 'YES' : 'NO'}`;
      
      notify.push('Camera test complete – check console for details', cameraCheck.supported ? 'success' : 'error');
      
      // Also set error message if camera not supported
      if (!cameraCheck.supported) {
        setError(`❌ Camera Test Failed: ${cameraCheck.details}`);
      } else {
        setError(`✅ Camera Test Passed: ${cameraCheck.details}`);
      }
      
    } catch (error) {
      console.error('🔧 Camera test failed:', error);
      const errorMsg = `Camera test failed: ${(error as Error).message}`;
      emitError(errorMsg);
    }
  };

  const captureAndRegister = async () => {
    if (!videoRef.current || !isModelLoaded) return;

    const personName = prompt('Nhập tên người cần đăng ký:');
    if (!personName) return;

    const personId = Date.now().toString();

    try {
      setError('');
      await faceRecognizeService.registerFace(videoRef.current, personId, personName);
      faceRecognizeService.saveFacesToStorage();
      notify.push(`Đã đăng ký thành công khuôn mặt cho ${personName}`, 'success');
    } catch (err) {
      const errorMsg = 'Lỗi khi đăng ký: ' + (err as Error).message;
      emitError(errorMsg);
      console.error(err);
      // Parent will surface error; avoid duplicate notification
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
      </div>

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <span className="error-text" style={{ whiteSpace: 'pre-line' }}>{error}</span>
        </div>
      )}

      {/* HTTPS Warning */}
      {location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1' && (
        <div className="warning-message">
          <span className="warning-icon">🔒</span>
          <span className="warning-text">
            ⚠️ HTTPS Required: Camera needs HTTPS to work. 
            Current: {location.protocol}//{location.hostname}
            {location.hostname.includes('192.168') && ' (Try using HTTPS or localhost instead)'}
          </span>
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

          <button 
            className="control-btn debug"
            onClick={testCamera}
            disabled={loading}
            title="Test camera support and permissions"
          >
            <span className="btn-icon">🔧</span>
            Test Camera
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

      {/* Camera Requirements Modal */}
      {showRequirements && (
        <CameraRequirements onClose={() => setShowRequirements(false)} />
      )}
    </div>
  );
});

FaceRecognition.displayName = 'FaceRecognition';

export default FaceRecognition;
