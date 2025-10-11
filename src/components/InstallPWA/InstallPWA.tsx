import { useState, useEffect } from 'react';
import './InstallPWA.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                      (window.navigator as any).standalone === true;
    
    setIsStandalone(standalone);

    if (standalone) {
      console.log('✅ App đang chạy ở chế độ PWA (standalone)');
      return;
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      console.log('💾 PWA install prompt available');
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      console.warn('⚠️ Install prompt not available');
      // Show manual instructions
      alert(
        'Để cài đặt app:\n\n' +
        '📱 Android (Chrome):\n' +
        '1. Menu (⋮) → "Thêm vào màn hình chính"\n\n' +
        '🍎 iOS (Safari):\n' +
        '1. Share (↑) → "Add to Home Screen"'
      );
      return;
    }

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User choice: ${outcome}`);
      
      if (outcome === 'accepted') {
        console.log('✅ PWA installed successfully!');
        setShowPrompt(false);
      }
      
      // Clear the prompt
      setDeferredPrompt(null);
    } catch (error) {
      console.error('❌ Install error:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Save to localStorage to not show again today
    localStorage.setItem('pwa-prompt-dismissed', new Date().toDateString());
  };

  // Don't show if already installed
  if (isStandalone) {
    return null;
  }

  // Check if dismissed today
  const dismissedDate = localStorage.getItem('pwa-prompt-dismissed');
  if (dismissedDate === new Date().toDateString()) {
    return null;
  }

  // Don't show if not available
  if (!showPrompt) {
    return null;
  }

  return (
    <div className="install-pwa-banner">
      <div className="install-pwa-content">
        <div className="install-pwa-icon">
          <img src="/Logo_EIU.png" alt="SmartPresence" />
        </div>
        <div className="install-pwa-text">
          <h3>📱 Cài đặt SmartPresence</h3>
          <p>
            Cài app để có GPS chính xác cao hơn!<br />
            <small>⚡ Nhanh hơn • 📍 Chính xác hơn • 🎯 Không bị lệch vị trí</small>
          </p>
        </div>
        <div className="install-pwa-actions">
          <button onClick={handleInstallClick} className="install-btn">
            <i className="ri-download-line"></i> Cài đặt
          </button>
          <button onClick={handleDismiss} className="dismiss-btn">
            <i className="ri-close-line"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstallPWA;
