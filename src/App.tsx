import { useState } from 'react';
import LoginScreen from './login/LoginScreen';
import UserDashBoard from './Pages/UserDashBoard/UserDashBoard';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'dashboard'>('login');

  const handleLoginSuccess = () => {
    setCurrentScreen('dashboard');
  };

  const handleLogout = () => {
    setCurrentScreen('login');
  };

  return (
    <div className="App">
      {currentScreen === 'login' ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <UserDashBoard onLogout={handleLogout} />
      )}
    </div>
  );
}

export default App;
