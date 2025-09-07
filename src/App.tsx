import { useState } from 'react';
import LoginScreen from './screens/LoginScreen/LoginScreen';
import HomeScreen from './screens/HomeScreen/HomeScreen';
import './App.css';

function App() {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'home'>('login');

  const handleLoginSuccess = () => {
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    setCurrentScreen('login');
  };

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
