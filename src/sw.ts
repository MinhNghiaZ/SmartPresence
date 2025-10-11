/// <reference lib="webworker" />
declare const self: ServiceWorkerGlobalScope;

// Service Worker for Smart Presence PWA
self.addEventListener('install', () => {
  console.log('✅ Service Worker installing...');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
  event.waitUntil(self.clients.claim());
});

// Handle push notifications (for future features)
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'Smart Presence';
  const options = {
    body: data.body || 'Bạn có thông báo mới',
    icon: '/pwa-192x192.png',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  
  event.waitUntil(
    self.clients.openWindow(url)
  );
});

export {};
