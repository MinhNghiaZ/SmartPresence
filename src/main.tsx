import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.tsx'
import { NotificationProvider } from './context/NotificationContext'
import './styles/notifications.css'

// Register PWA Service Worker
import { registerSW } from 'virtual:pwa-register'

// Auto-update service worker
registerSW({
  onNeedRefresh() {
    console.log('🔄 New content available, updating...');
  },
  onOfflineReady() {
    console.log('✅ App ready to work offline');
  },
  immediate: true
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </StrictMode>,
)
