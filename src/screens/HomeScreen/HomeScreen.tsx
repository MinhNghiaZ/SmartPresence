import React, { useState } from 'react';
import './HomeScreen.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import { GPSService } from '../../Services/GPSService/GpsService';
import type { Location } from '../../Services/GPSService/GpsService';
import SimpleAvatarDropdown from '../../components/SimpleAvatarDropdown';
import ProfileModal from '../../components/ProfileModal';

interface User {
  id: string;
  name: string;
  email: string;
  faceEmbedding?: any;
}

interface CurrentSubjectInfo {
  name: string;
  code: string;
  time: string;
  room: string;
  instructor: string;
}

interface WeeklyStats {
  present: number;
  absent: number;
  late: number;
  remain: number;
}

interface HomeScreenProps {
  onLogout?: () => void;
}

const HomeScreen: React.FC<HomeScreenProps> = ({ onLogout }) => {
  const [isCheckingIn, setIsCheckingIn] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<string>('');
  const [showProfile, setShowProfile] = useState<boolean>(false);
  const [user] = useState<User>({
    id: 'SV001',
    name: 'Nguyen Van A',
    email: 'nguyenvana@eiu.edu.vn',
  });

  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats>({
    present: 12,
    absent: 2,
    late: 1,
    remain: 3
  });

  const currentSubject: CurrentSubjectInfo = {
    name: 'Mobile Development',
    code: 'CS401',
    time: '7:30 AM - 9:30 AM',
    room: '211 - B.08',
    instructor: 'Dr. Nguyen Van A'
  };

  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    setGpsStatus('Getting location...');
    
    try {
      // Step 1: Get current location using GPS service
      console.log('Getting current location...');
      
      let currentLocation: Location;
      try {
        currentLocation = await GPSService.getCurrentLocation();
        console.log('Current location:', currentLocation);
        setGpsStatus('Verifying location...');
      } catch (locationError) {
        console.error('Location error:', locationError);
        setGpsStatus('');
        alert(`GPS Error: ${(locationError as Error).message}\n\nPlease enable location services and try again.`);
        return;
      }

      // Step 2: Check if location is within allowed area
      const locationCheck = GPSService.isLocationAllowed(currentLocation);
      console.log('Location check result:', locationCheck);

      if (!locationCheck.allowed) {
        setGpsStatus('');
        alert(
          `❌ Location Not Allowed!\n\n` +
          `You are ${locationCheck.distance}m away from the allowed area.\n` +
          `Please move closer to the campus to check in.\n\n` +
          `Maximum allowed distance: ${GPSService.getAllowedArea().radius}m`
        );
        return;
      }

      // Step 3: If location is valid, proceed with check-in
      console.log('Location verified successfully!');
      setGpsStatus('Processing check-in...');
      
      // Simulate additional check-in processing
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Show success message with location info
      alert(
        `✅ Check-in Successful!\n\n` +
        `Subject: ${currentSubject.name}\n` +
        `Time: ${new Date().toLocaleTimeString()}\n` +
        `Location: Verified (${locationCheck.distance}m from center)\n` +
        `Status: Present`
      );
      
      // Update stats
      setWeeklyStats(prev => ({
        ...prev,
        present: prev.present + 1,
        remain: prev.remain - 1
      }));
      
      setGpsStatus('');
      
    } catch (error) {
      console.error('Check-in error:', error);
      setGpsStatus('');
      alert('❌ Check-in failed due to unexpected error. Please try again.');
    } finally {
      setIsCheckingIn(false);
    }
  };

  const handleCalendar = () => {
    // Navigate to calendar page
    console.log('Navigate to Calendar');
  };

  const handleHistory = () => {
    // Navigate to history page
    console.log('Navigate to History');
  };

  const handleProfile = () => {
    setShowProfile(true);
  };

  const handleSettings = () => {
    alert('Settings feature will be implemented here');
  };

  const handleCloseProfile = () => {
    setShowProfile(false);
  };

  const handleClearData = () => {
    if (window.confirm('This will clear all attendance records. Are you sure?')) {
      setWeeklyStats({
        present: 0,
        absent: 0,
        late: 0,
        remain: 18
      });
      alert('Data cleared successfully!');
    }
  };

  // Debug function to check current GPS location
  const handleCheckLocation = async () => {
    try {
      const location = await GPSService.getCurrentLocation();
      const check = GPSService.isLocationAllowed(location);
      const allowedArea = GPSService.getAllowedArea();
      
      alert(
        `📍 Current Location Debug:\n\n` +
        `Latitude: ${location.latitude.toFixed(6)}\n` +
        `Longitude: ${location.longitude.toFixed(6)}\n\n` +
        `Allowed Area Center:\n` +
        `Lat: ${allowedArea.latitude.toFixed(6)}\n` +
        `Lng: ${allowedArea.longitude.toFixed(6)}\n` +
        `Radius: ${allowedArea.radius}m\n\n` +
        `Distance: ${check.distance}m\n` +
        `Status: ${check.allowed ? '✅ Allowed' : '❌ Not Allowed'}`
      );
    } catch (error) {
      alert(`GPS Error: ${(error as Error).message}`);
    }
  };

  return (
    <div className="home-container">
      <div className="home-content">
        {/* Top Bar */}
        <div className="top-bar">
          <SimpleAvatarDropdown
            userName={user.name}
            onProfile={handleProfile}
            onSettings={handleSettings}
            onLogout={onLogout || (() => {})}
          />
        </div>

        {/* Welcome Section */}
        <div className="section">
          <h1 className="hi-text">Hi {user.name}</h1>
          <p className="sub-text">Welcome to EIU SmartPresence Dashboard</p>
          <p className="sub-text">You have 3 subjects left</p>
          <p className="user-info">MSSV: {user.id} | {user.email}</p>
          
          {/* Debug button - Remove in production */}
          <div className="debug-buttons">
            <button className="debug-button" onClick={handleClearData}>
              🗑️ Clear Data (Debug)
            </button>
            <button className="debug-button gps-debug" onClick={handleCheckLocation}>
              📍 Check GPS (Debug)
            </button>
          </div>
        </div>

        {/* Current Subject Section */}
        <div className="section">
          <div className="subject-card">
            <div className="subject-info">
              <h3 className="title-text">{currentSubject.name}</h3>
              <p className="sub-line">{currentSubject.time}</p>
              <p className="sub-line">Room: {currentSubject.room}</p>
            </div>

            <button
              className={`check-in-btn ${isCheckingIn ? 'checking-in' : ''}`}
              onClick={handleCheckIn}
              disabled={isCheckingIn}
            >
              {isCheckingIn ? (
                <div className="checking-container">
                  <div className="spinner"></div>
                  <span>{gpsStatus || 'Checking...'}</span>
                </div>
              ) : (
                'Check In'
              )}
            </button>
          </div>
        </div>

        {/* Weekly Review Section */}
        <div className="section">
          <h2 className="hi-text">Weekly Review</h2>
        </div>

        {/* Stats Section */}
        <div className="section">
          <div className="status-container">
            <div className="col">
              <div className="status-card present-card">
                <h3 className="title-text">{weeklyStats.present}</h3>
                <p className="sub-line">Present</p>
              </div>

              <div className="status-card absent-card">
                <h3 className="title-text">{weeklyStats.absent}</h3>
                <p className="sub-line">Absent</p>
              </div>
            </div>

            <div className="col">
              <div className="status-card late-card">
                <h3 className="title-text">{weeklyStats.late}</h3>
                <p className="sub-line">Late</p>
              </div>

              <div className="status-card remain-card">
                <h3 className="title-text">{weeklyStats.remain}</h3>
                <p className="sub-line">Remain</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Navigation Bar */}
      <div className="fixed-navigation">
        <div className="navigation-divider"></div>
        <div className="navigation-bar">
          <button className="nav-button calendar-button" onClick={handleCalendar}>
            <div className="nav-icon">📅</div>
            <span className="nav-label">Calendar</span>
          </button>
          <button className="nav-button history-button" onClick={handleHistory}>
            <div className="nav-icon">📋</div>
            <span className="nav-label">History</span>
          </button>
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        user={user}
        isOpen={showProfile}
        onClose={handleCloseProfile}
      />
    </div>
  );
};

export default HomeScreen;
