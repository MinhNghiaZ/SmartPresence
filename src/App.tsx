import { useState, useEffect } from 'react';
import LoginScreen from './screens/LoginScreen/LoginScreen';
import HomeScreen from './screens/HomeScreen/HomeScreen';
import { AuthService } from './Services/AuthService';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'home'>('login');
  const [isLoading, setIsLoading] = useState(true);

  // Kiểm tra trạng thái đăng nhập khi app khởi động
  useEffect(() => {
    const checkAuthStatus = () => {
      try {
        const isAuthenticated = AuthService.isAuthenticated();
        
        if (isAuthenticated) {
          const user = AuthService.getCurrentUser();
          console.log('User already authenticated:', user?.username);
          setCurrentScreen('home');
        } else {
          console.log('User not authenticated, showing login');
          setCurrentScreen('login');
        }
      } catch (error) {
        console.error('Error checking auth status:', error);
        setCurrentScreen('login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, []);

  const handleLoginSuccess = () => {
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    AuthService.logout();
    setCurrentScreen('login');
  };

  // Show loading screen while checking auth status
  if (isLoading) {
    return (
      <div className="App d-flex justify-content-center align-items-center min-vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="mt-2 text-muted">Đang kiểm tra đăng nhập...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {currentScreen === 'login' ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <HomeScreen onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
