import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'bootstrap/dist/css/bootstrap.min.css'
import './index.css'
import App from './App.tsx'
import { NotificationProvider } from './context/NotificationContext'
import './styles/notifications.css'
import { registerServiceWorker } from './utils/serviceWorkerRegistration'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </StrictMode>,
)

// 🚀 Register Service Worker for PWA
// - Enables offline support
// - Enables "Add to Home Screen"
// - Improves GPS accuracy on mobile devices
if (import.meta.env.PROD) {
  // Only register in production
  registerServiceWorker();
} else {
  console.log('⚠️ Service Worker disabled in development mode');
}
