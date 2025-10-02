import { useState, useEffect } from 'react';
import { useNotifications } from './context/NotificationContext';
import LoginScreen from './screens/LoginScreen/LoginScreen';
import HomeScreen from './screens/HomeScreen/HomeScreen';
import AdminScreen from './screens/AdminScreen/AdminScreen';
import DemoHistory from './screens/demoHistory/demoHistory';
import CameraDebugScreen from './screens/CameraDebugScreen/CameraDebugScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen/ChangePasswordScreen';
import { authService } from './Services/AuthService';
import './App.css';

function App() {
  const notify = useNotifications();
  // Configuration
  const LOADING_TIME = 2000;
  
  // State
  const [currentScreen, setCurrentScreen] = useState<'login' | 'home' | 'demo-history' | 'camera-debug' | 'admin' | 'change-password'>('login');
  const [isLoading, setIsLoading] = useState(true);

  // Effects
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      // Luôn bắt đầu với trang đăng nhập
      // Xóa session cũ để đảm bảo user phải đăng nhập lại
      authService.logout();
    }, LOADING_TIME);

    return () => clearTimeout(timer);
  }, [LOADING_TIME]);

  // Handlers
  const handleLoginSuccess = () => {
    if (authService.isAdmin()) {
      setCurrentScreen('admin');
    } else {
      setCurrentScreen('home');
    }
  };

  const handleLogout = () => {
    setCurrentScreen('login');
  };

  const handleNavigateToDemo = () => {
    setCurrentScreen('demo-history');
  };

  const handleBackToHome = () => {
    if (authService.isAdmin()) {
      setCurrentScreen('admin');
    } else {
      setCurrentScreen('home');
    }
  };

  const handleNavigateToChangePassword = () => {
    setCurrentScreen('change-password');
  };

  const handleBackToLogin = () => {
    setCurrentScreen('login');
  };

  // Check for camera debug URL parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debug') === 'camera') {
      setCurrentScreen('camera-debug');
    }
    
    // Reset localStorage nếu có parameter reset=face
    if (urlParams.get('reset') === 'face') {
      localStorage.removeItem('registeredFaces');
      localStorage.removeItem('capturedFaceImages');
      console.log('🗑️ Đã reset localStorage registeredFaces và capturedFaceImages');
      notify.push('✅ Đã reset dữ liệu khuôn mặt! Bạn có thể đăng ký lại từ đầu.', 'success');
      
      // Xóa parameter khỏi URL sau khi reset
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('reset');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, []);

  // Loading screen
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-content">
          <div className="loading-logo">
            <img src="/Logo2eiu.png" alt="EIU Logo" />
          </div>
          <div className="loading-spinner">
            <div className="spinner"></div>
          </div>
          <div className="loading-text">
            <h2>SmartPresence</h2>
            <p>Đang khởi tạo ứng dụng...</p>
          </div>
          <div className="loading-progress">
            <div 
              className="progress-bar" 
              style={{ 
                animationDuration: `${LOADING_TIME}ms` 
              }}
            ></div>
          </div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className="App">
      {currentScreen === 'login' && (
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess} 
          onNavigateToChangePassword={handleNavigateToChangePassword}
        />
      )}
      {currentScreen === 'home' && (
        <HomeScreen onLogout={handleLogout} onNavigateToDemo={handleNavigateToDemo} />
      )}
      {currentScreen === 'admin' && (
        <AdminScreen onBackToHome={() => setCurrentScreen('login')} />
      )}
      {currentScreen === 'camera-debug' && (
        <CameraDebugScreen />
      )}
      {currentScreen === 'demo-history' && (
        <DemoHistory onBackToHome={handleBackToHome} />
      )}
      {currentScreen === 'change-password' && (
        <ChangePasswordScreen 
          onBack={handleBackToLogin}
          onSuccess={handleBackToLogin}
        />
      )}
    </div>
  );
}

export default App;
