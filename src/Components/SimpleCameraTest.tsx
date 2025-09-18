import React, { useRef, useState, useEffect } from 'react';
import { CameraPolyfill } from '../Services/CameraPolyfill';

const SimpleCameraTest: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [diagnostics, setDiagnostics] = useState<any>(null);

  useEffect(() => {
    // Get diagnostics on mount
    const diag = CameraPolyfill.getDiagnostics();
    setDiagnostics(diag);
    
    if (!diag.isHTTPS && !diag.isLocalhost) {
      setError('⚠️ HTTPS Required: Camera cần HTTPS để hoạt động');
    } else if (!diag.modernAPI && !diag.legacyAPI) {
      setError('❌ Browser không hỗ trợ camera API');
    }
  }, []);

  const testBasicCamera = async () => {
    try {
      setError('');
      setInfo('🔄 Testing camera...');

      const result = await CameraPolyfill.testCamera();
      
      if (result.success && result.stream) {
        if (videoRef.current) {
          videoRef.current.srcObject = result.stream;
          videoRef.current.play();
          setIsActive(true);
          setInfo(`✅ Camera working! (${result.details})`);
        }
      } else {
        setError(`❌ Camera test failed: ${result.details}`);
        setInfo('');
      }
    } catch (err: any) {
      setError(`❌ Unexpected error: ${err.message}`);
      setInfo('');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsActive(false);
      setInfo('Camera stopped');
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h3>🔧 Simple Camera Test</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={testBasicCamera} 
          disabled={isActive}
          style={{ 
            padding: '10px 20px', 
            marginRight: '10px',
            backgroundColor: isActive ? '#gray' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isActive ? 'not-allowed' : 'pointer'
          }}
        >
          📹 Test Camera
        </button>
        
        <button 
          onClick={stopCamera} 
          disabled={!isActive}
          style={{ 
            padding: '10px 20px',
            backgroundColor: !isActive ? '#gray' : '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: !isActive ? 'not-allowed' : 'pointer'
          }}
        >
          ⏹️ Stop
        </button>
      </div>

      {info && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#d4edda', 
          border: '1px solid #c3e6cb',
          borderRadius: '4px',
          marginBottom: '10px',
          color: '#155724'
        }}>
          {info}
        </div>
      )}

      {error && (
        <div style={{ 
          padding: '10px', 
          backgroundColor: '#f8d7da', 
          border: '1px solid #f5c6cb',
          borderRadius: '4px',
          marginBottom: '10px',
          color: '#721c24'
        }}>
          {error}
        </div>
      )}

      <div style={{ 
        width: '100%', 
        height: '300px', 
        backgroundColor: '#000',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        <video
          ref={videoRef}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '8px'
          }}
          playsInline
          muted
        />
        {!isActive && (
          <div style={{
            position: 'absolute',
            color: 'white',
            fontSize: '48px'
          }}>
            📷
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
        <p><strong>Environment Diagnostics:</strong></p>
        {diagnostics && (
          <>
            <p>Protocol: {diagnostics.protocol} {diagnostics.isHTTPS ? '✅' : '❌'}</p>
            <p>Host: {window.location.hostname} {diagnostics.isLocalhost ? '(localhost)' : ''}</p>
            <p>Modern API: {diagnostics.modernAPI ? '✅ Available' : '❌ Not Available'}</p>
            <p>Legacy API: {diagnostics.legacyAPI ? '✅ Available' : '❌ Not Available'}</p>
            <p><strong>Recommendation:</strong> {diagnostics.recommendation}</p>
          </>
        )}
        <p>User Agent: {navigator.userAgent.slice(0, 80)}...</p>
      </div>
    </div>
  );
};

export default SimpleCameraTest;