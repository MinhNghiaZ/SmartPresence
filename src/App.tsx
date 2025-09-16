import { useState, useEffect } from 'react';
import LoginScreen from './screens/LoginScreen/LoginScreen';
import HomeScreen from './screens/HomeScreen/HomeScreen';
import DemoHistory from './screens/demoHistory/demoHistory';
import { authService } from './Services/AuthService';
import './App.css';

function App() {
  // Configuration
  const LOADING_TIME = 2000;
  
  // State
  const [currentScreen, setCurrentScreen] = useState<'login' | 'home' | 'demo-history'>('login');
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
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    setCurrentScreen('login');
  };

  const handleNavigateToDemo = () => {
    setCurrentScreen('demo-history');
  };

  const handleBackToHome = () => {
    setCurrentScreen('home');
  };

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
      {currentScreen === 'login' ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : currentScreen === 'home' ? (
        <HomeScreen onLogout={handleLogout} onNavigateToDemo={handleNavigateToDemo} />
      ) : (
        <DemoHistory onBackToHome={handleBackToHome} />
      )}
    </div>
  );
}

export default App;
