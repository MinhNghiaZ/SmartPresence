import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import removeConsole from 'vite-plugin-remove-console'

// Production configuration for deployment
export default defineConfig({
  plugins: [react(), removeConsole()],
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
        target: 'https://sas.eiu.com.vn', // Production backend URL
        changeOrigin: true,
        secure: true, // Enable for HTTPS backend
        rewrite: (path) => path.replace(/^\/api/, '/api')
      }
    }
  },
  define: {
    __SECURE_CONTEXT__: true
  }
})