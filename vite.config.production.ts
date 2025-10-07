import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import removeConsole from 'vite-plugin-remove-console'
import mkcert from 'vite-plugin-mkcert'

// Production configuration for deployment
export default defineConfig({
  plugins: [react(), removeConsole(), mkcert()],
  base: '/', // Adjust if deployed in subdirectory
  build: {
    outDir: 'dist',
    sourcemap: false, // Disable source maps for production
    minify: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@headlessui/react']
        }
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 443, // HTTPS port
    https: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // Local backend for testing
        changeOrigin: true,
        secure: false, // Disable for HTTP backend
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
  define: {
    __SECURE_CONTEXT__: true
  }
})