import React from 'react';
import './GPSGuideModal.css';

interface GPSGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GPSGuideModal: React.FC<GPSGuideModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="gps-guide-modal-overlay"
      onClick={onClose}
    >
      <div 
        className="gps-guide-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="gps-guide-modal-header">
          <h2 className="gps-guide-modal-title">
            📍 Hướng dẫn bật GPS chính xác
          </h2>
          <button 
            className="gps-guide-modal-close"
            onClick={onClose}
            aria-label="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="gps-guide-modal-body">
          {/* Introduction */}
          <div className="gps-guide-section">
            <div className="gps-guide-intro">
              <p className="gps-guide-intro-text">
                Để hệ thống điểm danh hoạt động chính xác, bạn cần bật <strong>định vị chính xác (Precise Location)</strong> 
                cho trình duyệt Google Chrome trên thiết bị di động của mình.
              </p>
            </div>
          </div>

          {/* iOS Guide */}
          <div className="gps-guide-section">
            <h3 className="gps-guide-section-title">
              🍎 Hướng dẫn cho iPhone (iOS)
            </h3>
            
            <div className="gps-guide-steps">
              <div className="gps-guide-step">
                <div className="gps-guide-step-number">1</div>
                <div className="gps-guide-step-content">
                  <h4 className="gps-guide-step-title">Mở Cài đặt iPhone</h4>
                  <p className="gps-guide-step-description">
                    Tìm và mở ứng dụng <strong>"Cài đặt"</strong> (Settings) trên màn hình chính của iPhone.
                  </p>
                  <div className="gps-guide-image-placeholder">
                    {/* Placeholder cho hình ảnh - bạn sẽ chèn sau */}
                    <div className="placeholder-box">
                      <span className="placeholder-icon">🖼️</span>
                      <span className="placeholder-text">Hình ảnh: Biểu tượng Cài đặt iOS</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="gps-guide-step">
                <div className="gps-guide-step-number">2</div>
                <div className="gps-guide-step-content">
                  <h4 className="gps-guide-step-title">Tìm mục "Quyền riêng tư & Bảo mật"</h4>
                  <p className="gps-guide-step-description">
                    Cuộn xuống và chọn <strong>"Quyền riêng tư & Bảo mật"</strong> (Privacy & Security).
                  </p>
                  <div className="gps-guide-image-placeholder">
                    <div className="placeholder-box">
                      <span className="placeholder-icon">🖼️</span>
                      <span className="placeholder-text">Hình ảnh: Menu Privacy & Security</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="gps-guide-step">
                <div className="gps-guide-step-number">3</div>
                <div className="gps-guide-step-content">
                  <h4 className="gps-guide-step-title">Chọn "Dịch vụ định vị"</h4>
                  <p className="gps-guide-step-description">
                    Nhấn vào <strong>"Dịch vụ định vị"</strong> (Location Services) ở đầu danh sách.
                  </p>
                  <div className="gps-guide-image-placeholder">
                    <div className="placeholder-box">
                      <span className="placeholder-icon">🖼️</span>
                      <span className="placeholder-text">Hình ảnh: Location Services menu</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="gps-guide-step">
                <div className="gps-guide-step-number">4</div>
                <div className="gps-guide-step-content">
                  <h4 className="gps-guide-step-title">Bật Dịch vụ định vị</h4>
                  <p className="gps-guide-step-description">
                    Đảm bảo công tắc <strong>"Dịch vụ định vị"</strong> đã được bật (màu xanh lá).
                  </p>
                  <div className="gps-guide-image-placeholder">
                    <div className="placeholder-box">
                      <span className="placeholder-icon">🖼️</span>
                      <span className="placeholder-text">Hình ảnh: Toggle Location Services ON</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="gps-guide-step">
                <div className="gps-guide-step-number">5</div>
                <div className="gps-guide-step-content">
                  <h4 className="gps-guide-step-title">Tìm và chọn Chrome</h4>
                  <p className="gps-guide-step-description">
                    Cuộn xuống danh sách ứng dụng và tìm <strong>"Chrome"</strong>, sau đó nhấn vào.
                  </p>
                  <div className="gps-guide-image-placeholder">
                    <div className="placeholder-box">
                      <span className="placeholder-icon">🖼️</span>
                      <span className="placeholder-text">Hình ảnh: Chrome trong danh sách apps</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="gps-guide-step">
                <div className="gps-guide-step-number">6</div>
                <div className="gps-guide-step-content">
                  <h4 className="gps-guide-step-title">Chọn "Khi Dùng App"</h4>
                  <p className="gps-guide-step-description">
                    Chọn tùy chọn <strong>"Khi Dùng App"</strong> (While Using the App) để Chrome có thể truy cập vị trí khi bạn đang sử dụng.
                  </p>
                  <div className="gps-guide-image-placeholder">
                    <div className="placeholder-box">
                      <span className="placeholder-icon">🖼️</span>
                      <span className="placeholder-text">Hình ảnh: While Using the App option</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="gps-guide-step">
                <div className="gps-guide-step-number">7</div>
                <div className="gps-guide-step-content">
                  <h4 className="gps-guide-step-title">Bật "Vị trí chính xác"</h4>
                  <p className="gps-guide-step-description">
                    ⚠️ <strong>QUAN TRỌNG:</strong> Bật công tắc <strong>"Vị trí chính xác"</strong> (Precise Location) để hệ thống có thể xác định vị trí chính xác của bạn.
                  </p>
                  <div className="gps-guide-image-placeholder">
                    <div className="placeholder-box">
                      <span className="placeholder-icon">🖼️</span>
                      <span className="placeholder-text">Hình ảnh: Precise Location toggle ON</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Android Guide */}
          <div className="gps-guide-section">
            <h3 className="gps-guide-section-title">
              🤖 Hướng dẫn cho Android
            </h3>
            
            <div className="gps-guide-steps">
              <div className="gps-guide-step">
                <div className="gps-guide-step-number">1</div>
                <div className="gps-guide-step-content">
                  <h4 className="gps-guide-step-title">Mở Cài đặt Android</h4>
                  <p className="gps-guide-step-description">
                    Tìm và mở ứng dụng <strong>"Cài đặt"</strong> (Settings) trên thiết bị Android của bạn.
                  </p>
                  <div className="gps-guide-image-placeholder">
                    <div className="placeholder-box">
                      <span className="placeholder-icon">🖼️</span>
                      <span className="placeholder-text">Hình ảnh: Biểu tượng Cài đặt Android</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="gps-guide-step">
                <div className="gps-guide-step-number">2</div>
                <div className="gps-guide-step-content">
                  <h4 className="gps-guide-step-title">Chọn "Vị trí"</h4>
                  <p className="gps-guide-step-description">
                    Tìm và chọn mục <strong>"Vị trí"</strong> (Location) trong cài đặt.
                  </p>
                  <div className="gps-guide-image-placeholder">
                    <div className="placeholder-box">
                      <span className="placeholder-icon">🖼️</span>
                      <span className="placeholder-text">Hình ảnh: Location menu Android</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="gps-guide-step">
                <div className="gps-guide-step-number">3</div>
                <div className="gps-guide-step-content">
                  <h4 className="gps-guide-step-title">Bật dịch vụ Vị trí</h4>
                  <p className="gps-guide-step-description">
                    Đảm bảo công tắc <strong>"Sử dụng vị trí"</strong> (Use location) đã được bật.
                  </p>
                  <div className="gps-guide-image-placeholder">
                    <div className="placeholder-box">
                      <span className="placeholder-icon">🖼️</span>
                      <span className="placeholder-text">Hình ảnh: Use location toggle ON</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="gps-guide-step">
                <div className="gps-guide-step-number">4</div>
                <div className="gps-guide-step-content">
                  <h4 className="gps-guide-step-title">Chọn "Quyền truy cập ứng dụng"</h4>
                  <p className="gps-guide-step-description">
                    Nhấn vào <strong>"Quyền truy cập ứng dụng"</strong> (App location permissions) hoặc <strong>"App permissions"</strong>.
                  </p>
                  <div className="gps-guide-image-placeholder">
                    <div className="placeholder-box">
                      <span className="placeholder-icon">🖼️</span>
                      <span className="placeholder-text">Hình ảnh: App permissions menu</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="gps-guide-step">
                <div className="gps-guide-step-number">5</div>
                <div className="gps-guide-step-content">
                  <h4 className="gps-guide-step-title">Tìm và chọn Chrome</h4>
                  <p className="gps-guide-step-description">
                    Tìm <strong>"Chrome"</strong> trong danh sách ứng dụng và nhấn vào.
                  </p>
                  <div className="gps-guide-image-placeholder">
                    <div className="placeholder-box">
                      <span className="placeholder-icon">🖼️</span>
                      <span className="placeholder-text">Hình ảnh: Chrome trong danh sách apps</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="gps-guide-step">
                <div className="gps-guide-step-number">6</div>
                <div className="gps-guide-step-content">
                  <h4 className="gps-guide-step-title">Chọn "Cho phép chỉ khi sử dụng ứng dụng"</h4>
                  <p className="gps-guide-step-description">
                    Chọn <strong>"Cho phép chỉ khi sử dụng ứng dụng"</strong> (Allow only while using the app).
                  </p>
                  <div className="gps-guide-image-placeholder">
                    <div className="placeholder-box">
                      <span className="placeholder-icon">🖼️</span>
                      <span className="placeholder-text">Hình ảnh: Allow only while using option</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="gps-guide-step">
                <div className="gps-guide-step-number">7</div>
                <div className="gps-guide-step-content">
                  <h4 className="gps-guide-step-title">Bật "Sử dụng vị trí chính xác"</h4>
                  <p className="gps-guide-step-description">
                    ⚠️ <strong>QUAN TRỌNG:</strong> Bật công tắc <strong>"Sử dụng vị trí chính xác"</strong> (Use precise location) để đảm bảo độ chính xác cao nhất.
                  </p>
                  <div className="gps-guide-image-placeholder">
                    <div className="placeholder-box">
                      <span className="placeholder-icon">🖼️</span>
                      <span className="placeholder-text">Hình ảnh: Use precise location toggle ON</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="gps-guide-step">
                <div className="gps-guide-step-number">8</div>
                <div className="gps-guide-step-content">
                  <h4 className="gps-guide-step-title">Cải thiện độ chính xác vị trí</h4>
                  <p className="gps-guide-step-description">
                    Quay lại menu Vị trí chính, chọn <strong>"Độ chính xác vị trí của Google"</strong> (Google Location Accuracy) và bật <strong>"Cải thiện độ chính xác vị trí"</strong> (Improve Location Accuracy).
                  </p>
                  <div className="gps-guide-image-placeholder">
                    <div className="placeholder-box">
                      <span className="placeholder-icon">🖼️</span>
                      <span className="placeholder-text">Hình ảnh: Google Location Accuracy</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Tips */}
          <div className="gps-guide-section">
            <h3 className="gps-guide-section-title">
              💡 Lưu ý quan trọng
            </h3>
            
            <div className="gps-guide-tips">
              <div className="gps-guide-tip">
                <span className="gps-guide-tip-icon">📶</span>
                <div className="gps-guide-tip-content">
                  <h4>Đảm bảo tín hiệu tốt</h4>
                  <p>Sử dụng ở nơi có tín hiệu GPS và mạng tốt để có độ chính xác cao nhất.</p>
                </div>
              </div>

              <div className="gps-guide-tip">
                <span className="gps-guide-tip-icon">🔄</span>
                <div className="gps-guide-tip-content">
                  <h4>Khởi động lại Chrome</h4>
                  <p>Sau khi thay đổi cài đặt, đóng hoàn toàn Chrome và mở lại để cài đặt có hiệu lực.</p>
                </div>
              </div>

              <div className="gps-guide-tip">
                <span className="gps-guide-tip-icon">⚡</span>
                <div className="gps-guide-tip-content">
                  <h4>Chế độ tiết kiệm pin</h4>
                  <p>Tắt chế độ tiết kiệm pin vì nó có thể ảnh hưởng đến độ chính xác của GPS.</p>
                </div>
              </div>

              <div className="gps-guide-tip">
                <span className="gps-guide-tip-icon">🌐</span>
                <div className="gps-guide-tip-content">
                  <h4>Cho phép trình duyệt truy cập vị trí</h4>
                  <p>Khi Chrome yêu cầu quyền truy cập vị trí cho website, nhấn <strong>"Cho phép"</strong>.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Support Section */}
          <div className="gps-guide-section gps-guide-support">
            <h3 className="gps-guide-section-title">
              📞 Cần hỗ trợ?
            </h3>
            <p className="gps-guide-support-text">
              Nếu bạn gặp khó khăn trong việc cài đặt hoặc hệ thống vẫn không hoạt động sau khi làm theo hướng dẫn, 
              vui lòng liên hệ với bộ phận hỗ trợ kỹ thuật của trường.
            </p>
            <div className="gps-guide-support-info">
              <p><strong>📧 Email:</strong> support@eiu.edu.vn</p>
              <p><strong>📞 Hotline:</strong> (028) 3724 4271</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="gps-guide-modal-footer">
          <button 
            className="gps-guide-close-button"
            onClick={onClose}
          >
            Đã hiểu, đóng hướng dẫn
          </button>
        </div>
      </div>
    </div>
  );
};

export default GPSGuideModal;
