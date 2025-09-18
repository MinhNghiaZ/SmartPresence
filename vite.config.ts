import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    mkcert() // Auto-generate SSL certificates
  ],
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 5173,
    https: true, // Enable HTTPS with mkcert certificates
    open: true,
    strictPort: false,
  }
})
