// Register Service Worker for PWA
// This file is imported in main.tsx

export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      console.log('🔧 Registering Service Worker...');
      
      const registration = await navigator.serviceWorker.register(
        '/service-worker.js',
        { scope: '/' }
      );
      
      console.log('✅ Service Worker registered:', registration.scope);
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('🆕 New Service Worker found, installing...');
        
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('🔄 New Service Worker installed, refresh to update');
            
            // Optionally show a notification to user
            if (confirm('Có phiên bản mới! Tải lại trang để cập nhật?')) {
              window.location.reload();
            }
          }
        });
      });
      
      // Check for updates every hour
      setInterval(() => {
        registration.update();
      }, 60 * 60 * 1000);
      
      return registration;
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  } else {
    console.warn('⚠️ Service Worker not supported in this browser');
  }
}

// Unregister Service Worker (for development/debugging)
export async function unregisterServiceWorker() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      await registration.unregister();
      console.log('🗑️ Service Worker unregistered');
    }
  }
}

// Check if app is running in standalone mode (installed as PWA)
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

// Request notification permission (for future features)
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if ('Notification' in window) {
    return await Notification.requestPermission();
  }
  return 'denied';
}
