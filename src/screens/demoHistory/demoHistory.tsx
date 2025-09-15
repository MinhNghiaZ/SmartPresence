import React, { useState, useEffect } from 'react';
import './demoHistory.css';

interface CapturedImage {
  id: string;
  userId: string;
  userName: string;
  imageData: string; // base64 image data
  timestamp: string;
  confidence: number;
  checkInStatus: 'success' | 'failed';
}

interface DemoHistoryProps {
  onBackToHome?: () => void;
}

const DemoHistory: React.FC<DemoHistoryProps> = ({ onBackToHome }) => {
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<CapturedImage | null>(null);

  // Load captured images from localStorage
  useEffect(() => {
    const loadImages = () => {
      try {
        const storedImages = localStorage.getItem('capturedFaceImages');
        if (storedImages) {
          const images = JSON.parse(storedImages);
          setCapturedImages(images);
        }
      } catch (error) {
        console.error('Error loading captured images:', error);
      }
    };

    loadImages();

    // Listen for new captured images
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'capturedFaceImages') {
        loadImages();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Also listen for custom events from same page
    const handleNewCapture = () => {
      loadImages();
    };
    
    window.addEventListener('newFaceCapture', handleNewCapture);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('newFaceCapture', handleNewCapture);
    };
  }, []);

  const clearAllImages = () => {
    if (window.confirm('Bạn có chắc muốn xóa tất cả ảnh đã capture?')) {
      localStorage.removeItem('capturedFaceImages');
      setCapturedImages([]);
      setSelectedImage(null);
    }
  };

  const downloadImage = (image: CapturedImage) => {
    const link = document.createElement('a');
    link.href = image.imageData;
    link.download = `face_capture_${image.userName}_${image.timestamp.replace(/[:\s]/g, '_')}.png`;
    link.click();
  };

  const deleteImage = (imageId: string) => {
    if (window.confirm('Bạn có chắc muốn xóa ảnh này?')) {
      const updatedImages = capturedImages.filter(img => img.id !== imageId);
      setCapturedImages(updatedImages);
      localStorage.setItem('capturedFaceImages', JSON.stringify(updatedImages));
      
      if (selectedImage?.id === imageId) {
        setSelectedImage(null);
      }
    }
  };

  return (
    <div className="demo-history-container">
      <header className="demo-header">
        <h1>📸 Face Capture History</h1>
        <p>Ảnh khuôn mặt được capture khi check-in thành công</p>
        
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
        {capturedImages.length === 0 ? (
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
                    key={image.id} 
                    className={`image-card ${selectedImage?.id === image.id ? 'selected' : ''}`}
                    onClick={() => setSelectedImage(image)}
                  >
                    <div className="image-wrapper">
                      <img 
                        src={image.imageData} 
                        alt={`${image.userName} - ${image.timestamp}`}
                        className="captured-image"
                      />
                      <div className="image-overlay">
                        <div className={`status-badge ${image.checkInStatus}`}>
                          {image.checkInStatus === 'success' ? '✅' : '❌'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="image-info">
                      <div className="user-name">{image.userName}</div>
                      <div className="timestamp">{new Date(image.timestamp).toLocaleString('vi-VN')}</div>
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
                    alt={`${selectedImage.userName} - ${selectedImage.timestamp}`}
                    className="detail-image"
                  />
                </div>
                
                <div className="detail-info">
                  <div className="info-row">
                    <span className="label">Người dùng:</span>
                    <span className="value">{selectedImage.userName}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">User ID:</span>
                    <span className="value">{selectedImage.userId}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Thời gian:</span>
                    <span className="value">{new Date(selectedImage.timestamp).toLocaleString('vi-VN')}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Confidence:</span>
                    <span className="value">{selectedImage.confidence.toFixed(1)}%</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Trạng thái:</span>
                    <span className={`value status ${selectedImage.checkInStatus}`}>
                      {selectedImage.checkInStatus === 'success' ? '✅ Thành công' : '❌ Thất bại'}
                    </span>
                  </div>
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
                    onClick={() => deleteImage(selectedImage.id)}
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
