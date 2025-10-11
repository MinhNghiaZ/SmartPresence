import { useState, useEffect, useMemo } from 'react';
import { useNotifications } from './context/NotificationContext';
import LoginScreen from './screens/LoginScreen/LoginScreen';
import HomeScreen from './screens/HomeScreen/HomeScreen';
import AdminScreen from './screens/AdminScreen/AdminScreen';
import CameraDebugScreen from './screens/CameraDebugScreen/CameraDebugScreen';
import ChangePasswordScreen from './screens/ChangePasswordScreen/ChangePasswordScreen';
import { InstallPWA } from './components/InstallPWA';
import { authService } from './Services/AuthService';
import './App.css';

function App() {
  const notify = useNotifications();
  // Configuration
  const LOADING_TIME = 1500; // Giảm từ 2000ms xuống 1500ms cho máy yếu
  
  // State
  const [currentScreen, setCurrentScreen] = useState<'login' | 'home' | 'camera-debug' | 'admin' | 'change-password'>('login');
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Effects
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        // Kiểm tra xem user có đang đăng nhập không
        const isLoggedIn = authService.isLoggedIn();
        
        if (isLoggedIn) {
          // Verify token với backend
          const isValidToken = await authService.verifyToken();
          
          if (isValidToken) {
            // Token hợp lệ, redirect đến trang phù hợp
            if (authService.isAdmin()) {
              setCurrentScreen('admin');
            } else {
              setCurrentScreen('home');
            }
            // Chỉ hiển thị thông báo khi lần đầu load app (page reload)
            if (isInitialLoad) {
              notify.push('Chào mừng trở lại!', 'success');
            }
          } else {
            // Token không hợp lệ, xóa session và về login
            authService.clearAuthData();
            setCurrentScreen('login');
          }
        } else {
          // Chưa đăng nhập, về trang login
          setCurrentScreen('login');
        }
      } catch (error) {
        console.error('Auth check error:', error);
        // Có lỗi, xóa session và về login để an toàn
        authService.clearAuthData();
        setCurrentScreen('login');
      }
    };

    const timer = setTimeout(async () => {
      await checkAuthStatus();
      setIsLoading(false);
      setIsInitialLoad(false); // Đánh dấu đã hoàn thành initial load
    }, LOADING_TIME);

    return () => clearTimeout(timer);
  }, [LOADING_TIME]); // Loại bỏ notify khỏi dependencies để tránh re-run

  // Handlers
  const handleLoginSuccess = () => {
    setIsInitialLoad(false); // Đánh dấu đây là fresh login, không phải reload
    if (authService.isAdmin()) {
      setCurrentScreen('admin');
    } else {
      setCurrentScreen('home');
    }
  };

  const handleLogout = () => {
    setCurrentScreen('login');
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

  // Memoize loading screen để tránh re-render không cần thiết
  const loadingScreen = useMemo(() => (
    <div className="loading-container" key="loading">
      <div className="loading-content">
        <div className="loading-logo">
          <img 
            src="/Logo2eiu.png" 
            alt="EIU Logo"
            loading="eager" 
            decoding="async"
          />
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
  ), [LOADING_TIME]);

  // Loading screen
  if (isLoading) {
    return loadingScreen;
  }

  // Main render
  return (
    <div className="App">
      {/* ✨ PWA Install Banner */}
      <InstallPWA />
      
      {currentScreen === 'login' && (
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess} 
          onNavigateToChangePassword={handleNavigateToChangePassword}
        />
      )}
      {currentScreen === 'home' && (
        <HomeScreen onLogout={handleLogout} />
      )}
      {currentScreen === 'admin' && (
        <AdminScreen onBackToHome={() => setCurrentScreen('login')} />
      )}
      {currentScreen === 'camera-debug' && (
        <CameraDebugScreen />
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
