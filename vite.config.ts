import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'
import removeConsole from 'vite-plugin-remove-console'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    mkcert(), // Auto-generate SSL certificates for HTTPS
    removeConsole(),
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
