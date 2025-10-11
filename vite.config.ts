import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'
import removeConsole from 'vite-plugin-remove-console'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    mkcert(), // Auto-generate SSL certificates for HTTPS
    removeConsole(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'Logo_EIU.png', 'Logo2eiu.png'],
      manifest: {
        name: 'Smart Presence - EIU',
        short_name: 'SmartPresence',
        description: 'Ứng dụng điểm danh thông minh - EIU',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/sas\.eiu\.com\.vn\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 5173,
    https: true, // Enable HTTPS with auto-generated certificates
    open: true,
    strictPort: false,
    proxy: {
      // Proxy all API requests to backend (keeping HTTP for backend)
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false, // Allow proxy to insecure backend
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    https: true, // Enable HTTPS for preview mode
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },
  // Optimizations for HTTPS development
  define: {
    // Ensure camera/microphone APIs work with HTTPS
    __SECURE_CONTEXT__: true
  }
})
