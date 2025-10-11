import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWA Install Prompt Component
 * Hiển thị nút cài đặt PWA khi browser hỗ trợ
 */
export const PWAInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    // Kiểm tra xem đang chạy như PWA hay không
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isIOSPWA = (window.navigator as any).standalone === true;
    setIsPWA(isStandalone || isIOSPWA);

    // Lắng nghe sự kiện beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallPrompt(true);
      console.log('📱 PWA install prompt ready');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Lắng nghe sự kiện app đã được cài đặt
    window.addEventListener('appinstalled', () => {
      console.log('✅ PWA installed successfully');
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Hiển thị prompt cài đặt
    deferredPrompt.prompt();

    // Đợi người dùng response
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response: ${outcome}`);

    if (outcome === 'accepted') {
      console.log('✅ User accepted PWA install');
    } else {
      console.log('❌ User dismissed PWA install');
    }

    // Reset prompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  const handleDismiss = () => {
    setShowInstallPrompt(false);
  };

  // Không hiển thị nếu đã chạy như PWA
  if (isPWA) {
    return (
      <div className="pwa-status" style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: '#4CAF50',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '12px',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      }}>
        <i className="ri-smartphone-line"></i>
        <span>Đang chạy như PWA ✅</span>
      </div>
    );
  }

  // Không hiển thị nếu không có prompt hoặc đã dismiss
  if (!showInstallPrompt) return null;

  return (
    <div className="pwa-install-prompt" style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: 'white',
      padding: '16px',
      borderRadius: '12px',
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      maxWidth: '320px',
      zIndex: 1000,
      animation: 'slideUp 0.3s ease-out'
    }}>
      <button
        onClick={handleDismiss}
        style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontSize: '20px',
          color: '#999'
        }}
      >
        ×
      </button>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <img src="/Logo_EIU.png" alt="Smart Presence" style={{ width: '48px', height: '48px', borderRadius: '8px' }} />
        <div>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Smart Presence</h3>
          <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>Cài đặt ứng dụng</p>
        </div>
      </div>

      <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#333' }}>
        📍 Cài đặt để có độ chính xác GPS tốt hơn (5-20m) và sử dụng như app native!
      </p>

      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleInstallClick}
          style={{
            flex: 1,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '14px'
          }}
        >
          <i className="ri-download-line"></i> Cài đặt
        </button>
        <button
          onClick={handleDismiss}
          style={{
            background: '#f5f5f5',
            color: '#666',
            border: 'none',
            padding: '10px 16px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Để sau
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default PWAInstallPrompt;
