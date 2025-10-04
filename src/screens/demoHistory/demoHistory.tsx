import React, { useState, useEffect } from 'react';
import './demoHistory.css';

interface CapturedImage {
  imageId: string;
  studentId: string | null;
  studentName?: string;
  imageData: string; // base64 image data
  confidence: number;
  status: string;
  subjectId?: string;
  subjectName?: string;
  capturedAt: string;
  ipAddress?: string;
}

interface DemoHistoryProps {
  onBackToHome?: () => void;
}

const DemoHistory: React.FC<DemoHistoryProps> = ({ onBackToHome }) => {
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<CapturedImage | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const API_BASE = '/api/storage';

  // Load captured images from backend API
  useEffect(() => {
    const loadImages = async () => {
      try {
        setLoading(true);
        setError('');
        
        const response = await fetch(`${API_BASE}/captured-images?limit=100`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
          setCapturedImages(data.images);
          console.log(`✅ Loaded ${data.count} captured images from database`);
        } else {
          throw new Error(data.message || 'Failed to load images');
        }
        
      } catch (error) {
        console.error('Error loading captured images:', error);
        setError(error instanceof Error ? error.message : 'Failed to load images');
      } finally {
        setLoading(false);
      }
    };

    loadImages();

    // Listen for new captured images (custom events from same page)
    const handleNewCapture = () => {
      loadImages();
    };
    
    window.addEventListener('newFaceCapture', handleNewCapture);

    return () => {
      window.removeEventListener('newFaceCapture', handleNewCapture);
    };
  }, []);

  const clearAllImages = async () => {
    if (window.confirm('Bạn có chắc muốn xóa tất cả ảnh đã capture?')) {
      try {
        const response = await fetch(`${API_BASE}/captured-images`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          setCapturedImages([]);
          setSelectedImage(null);
          console.log('✅ All images cleared successfully');
        } else {
          alert('Không thể xóa tất cả ảnh. Vui lòng thử lại.');
        }
      } catch (error) {
        console.error('Error deleting all images:', error);
        alert('Lỗi khi xóa ảnh. Vui lòng thử lại.');
      }
    }
  };

  const downloadImage = (image: CapturedImage) => {
    const link = document.createElement('a');
    link.href = image.imageData;
    link.download = `face_capture_${image.studentName || 'unknown'}_${image.capturedAt.replace(/[:\s]/g, '_')}.png`;
    link.click();
  };

  const deleteImage = async (imageId: string) => {
    if (window.confirm('Bạn có chắc muốn xóa ảnh này?')) {
      try {
        const response = await fetch(`${API_BASE}/captured-images/${imageId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          const updatedImages = capturedImages.filter(img => img.imageId !== imageId);
          setCapturedImages(updatedImages);
          
          if (selectedImage?.imageId === imageId) {
            setSelectedImage(null);
          }
          console.log('✅ Image deleted successfully');
        } else {
          alert('Không thể xóa ảnh. Vui lòng thử lại.');
        }
      } catch (error) {
        console.error('Error deleting image:', error);
        alert('Lỗi khi xóa ảnh. Vui lòng thử lại.');
      }
    }
  };

  return (
    <div className="demo-history-container">
      <header className="demo-header">
        <h1>📸 Face Capture History</h1>
        <p>Tất cả ảnh khuôn mặt được lưu trong database ({capturedImages.length} ảnh)</p>
        
        <div className="demo-actions">
          <button 
            className="action-btn back"
            onClick={onBackToHome}
          >
            🏠 Back to Home
          </button>
          <button 
            className="action-btn refresh"
            onClick={() => window.location.reload()}
          >
            🔄 Refresh
          </button>
          <button 
            className="action-btn clear"
            onClick={clearAllImages}
            disabled={capturedImages.length === 0}
          >
            🗑️ Clear All
          </button>
        </div>
      </header>

      <div className="demo-content">
        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">⏳</div>
            <h3>Đang tải dữ liệu...</h3>
            <p>Vui lòng chờ trong giây lát</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-icon">❌</div>
            <h3>Lỗi tải dữ liệu</h3>
            <p>{error}</p>
            <button 
              className="action-btn refresh"
              onClick={() => window.location.reload()}
            >
              🔄 Thử lại
            </button>
          </div>
        ) : capturedImages.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📷</div>
            <h3>Chưa có ảnh nào được capture</h3>
            <p>Thực hiện check-in với face recognition để capture ảnh</p>
          </div>
        ) : (
          <div className="images-layout">
            {/* Images Grid */}
            <div className="images-grid">
              <h3>Captured Images ({capturedImages.length})</h3>
              <div className="grid-container">
                {capturedImages.map((image) => (
                  <div 
                    key={image.imageId} 
                    className={`image-card ${selectedImage?.imageId === image.imageId ? 'selected' : ''}`}
                    onClick={() => setSelectedImage(image)}
                  >
                    <div className="image-wrapper">
                      <img 
                        src={image.imageData} 
                        alt={`${image.studentName || 'Unknown'} - ${image.capturedAt}`}
                        className="captured-image"
                      />
                      <div className="image-overlay">
                        <div className={`status-badge ${image.status.toLowerCase()}`}>
                          {image.status === 'SUCCESS' ? '✅' : '❌'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="image-info">
                      <div className="user-name">{image.studentName || 'Unknown'}</div>
                      <div className="timestamp">{new Date(image.capturedAt).toLocaleString('vi-VN')}</div>
                      <div className="confidence">Confidence: {image.confidence.toFixed(1)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Image Detail */}
            {selectedImage && (
              <div className="image-detail">
                <h3>Chi tiết ảnh</h3>
                <div className="detail-image-wrapper">
                  <img 
                    src={selectedImage.imageData} 
                    alt={`${selectedImage.studentName || 'Unknown'} - ${selectedImage.capturedAt}`}
                    className="detail-image"
                  />
                </div>
                
                <div className="detail-info">
                  <div className="info-row">
                    <span className="label">Người dùng:</span>
                    <span className="value">{selectedImage.studentName || 'Unknown'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Student ID:</span>
                    <span className="value">{selectedImage.studentId || 'N/A'}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Thời gian:</span>
                    <span className="value">{new Date(selectedImage.capturedAt).toLocaleString('vi-VN')}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Confidence:</span>
                    <span className="value">{selectedImage.confidence.toFixed(1)}%</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Trạng thái:</span>
                    <span className={`value status ${selectedImage.status.toLowerCase()}`}>
                      {selectedImage.status === 'SUCCESS' ? '✅ Thành công' : '❌ Thất bại'}
                    </span>
                  </div>
                  {selectedImage.subjectName && (
                    <div className="info-row">
                      <span className="label">Môn học:</span>
                      <span className="value">{selectedImage.subjectName}</span>
                    </div>
                  )}
                  {selectedImage.ipAddress && (
                    <div className="info-row">
                      <span className="label">IP Address:</span>
                      <span className="value">{selectedImage.ipAddress}</span>
                    </div>
                  )}
                </div>

                <div className="detail-actions">
                  <button 
                    className="action-btn download"
                    onClick={() => downloadImage(selectedImage)}
                  >
                    💾 Download
                  </button>
                  <button 
                    className="action-btn delete"
                    onClick={() => deleteImage(selectedImage.imageId)}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DemoHistory;
