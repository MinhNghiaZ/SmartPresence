import React from 'react';

interface CameraRequirementsProps {
  onClose?: () => void;
}

const CameraRequirements: React.FC<CameraRequirementsProps> = ({ onClose }) => {
  const currentProtocol = window.location.protocol;
  const currentHost = window.location.hostname;
  const isHTTPS = currentProtocol === 'https:';
  const isLocalhost = currentHost === 'localhost' || currentHost === '127.0.0.1';
  
  const httpsUrl = `https://${currentHost}${window.location.port ? ':' + window.location.port : ''}${window.location.pathname}`;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ color: '#dc3545', margin: '0 0 10px 0' }}>
            🔒 Camera Cần HTTPS
          </h2>
          <p style={{ color: '#666', margin: 0 }}>
            Để sử dụng camera, bạn cần truy cập qua HTTPS
          </p>
        </div>

        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>📋 Yêu cầu:</h3>
          <ul style={{ margin: 0, paddingLeft: '20px' }}>
            <li><strong>HTTPS Protocol:</strong> https:// thay vì http://</li>
            <li><strong>Hoặc Localhost:</strong> localhost, 127.0.0.1</li>
            <li><strong>Browser mới:</strong> Chrome, Firefox, Safari</li>
            <li><strong>Camera permissions:</strong> Allow trong browser</li>
          </ul>
        </div>

        <div style={{
          backgroundColor: isHTTPS || isLocalhost ? '#d4edda' : '#f8d7da',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>🌐 Trạng thái hiện tại:</h4>
          <p style={{ margin: '5px 0' }}>
            <strong>Protocol:</strong> {currentProtocol} {isHTTPS ? '✅' : '❌'}
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>Host:</strong> {currentHost} {isLocalhost ? '✅' : '❌'}
          </p>
          <p style={{ margin: '5px 0' }}>
            <strong>Status:</strong> {(isHTTPS || isLocalhost) ? '✅ Camera có thể hoạt động' : '❌ Cần HTTPS'}
          </p>
        </div>

        {!isHTTPS && !isLocalhost && (
          <div style={{
            backgroundColor: '#e3f2fd',
            padding: '15px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            <h4 style={{ margin: '0 0 10px 0' }}>🚀 Giải pháp:</h4>
            <ol style={{ margin: 0, paddingLeft: '20px' }}>
              <li>
                <strong>Thử HTTPS:</strong>
                <br />
                <a 
                  href={httpsUrl}
                  style={{ 
                    color: '#007bff', 
                    textDecoration: 'underline',
                    wordBreak: 'break-all'
                  }}
                >
                  {httpsUrl}
                </a>
              </li>
              <li><strong>Hoặc sử dụng localhost:</strong> http://localhost:port</li>
              <li><strong>Hoặc deploy lên HTTPS server</strong></li>
            </ol>
          </div>
        )}

        <div style={{
          backgroundColor: '#fff3cd',
          padding: '15px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 10px 0' }}>💡 Ghi chú:</h4>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
            <li>Browser blocks camera access on HTTP for security</li>
            <li>Development: Use vite --host --https or localhost</li>
            <li>Production: Always use HTTPS</li>
            <li>Mobile: HTTPS required on all devices</li>
          </ul>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px'
            }}
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};

export default CameraRequirements;