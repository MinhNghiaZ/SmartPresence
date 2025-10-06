import React from 'react';
import SimpleCameraTest from '../../components/SimpleCameraTest';

const CameraDebugScreen: React.FC = () => {
  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#f8f9fa',
      padding: '20px'
    }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto',
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '20px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <h1>🔧 Camera Debug & Test</h1>
        <p>This is a simple camera test to help diagnose camera issues.</p>
        
        <div style={{ 
          backgroundColor: '#e3f2fd', 
          padding: '15px', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3>📋 Common Camera Issues & Solutions:</h3>
          <ul style={{ marginLeft: '20px' }}>
            <li><strong>HTTPS Required:</strong> Camera only works on HTTPS or localhost</li>
            <li><strong>Permission Denied:</strong> Click camera icon in address bar to allow</li>
            <li><strong>Camera in Use:</strong> Close other apps/tabs using camera</li>
            <li><strong>Browser Support:</strong> Use Chrome, Firefox, or Safari (latest version)</li>
            <li><strong>Mobile:</strong> Allow camera in browser settings</li>
          </ul>
        </div>

        <SimpleCameraTest />
        
        <div style={{ 
          marginTop: '30px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <h3>🚀 Next Steps:</h3>
          <ol>
            <li>If simple test works, the issue might be in the Face Recognition component</li>
            <li>If test fails, check the error message and environment info above</li>
            <li>Ensure you're using HTTPS or localhost</li>
            <li>Try different browsers (Chrome recommended)</li>
            <li>Check browser console (F12) for detailed error messages</li>
          </ol>
        </div>
      </div>
    </div>
  );
};

export default CameraDebugScreen;