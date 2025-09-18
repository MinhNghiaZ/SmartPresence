import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Cho phép truy cập từ mạng ngoài
    port: 5173, // Cổng mặc định
    strictPort: false, // Tự động chọn cổng khác nếu 5173 bị chiếm
  }
})
