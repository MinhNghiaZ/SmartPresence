# 🎯 SmartPresence - Hệ thống Điểm danh Thông minh

Ứng dụng điểm danh thông minh sử dụng công nghệ nhận dạng khuôn mặt và định vị GPS, được phát triển với React + TypeScript.

## ✨ Tính năng chính

- 🔍 **Nhận dạng khuôn mặt**: Sử dụng AI để xác thực danh tính
- 📍 **Xác thực vị trí**: Kiểm tra GPS để đảm bảo điểm danh đúng địa điểm
- 📱 **Responsive Design**: Tối ưu cho cả desktop và mobile
- 🔐 **Xác thực an toàn**: Hệ thống đăng nhập bảo mật
- 📊 **Lịch sử điểm danh**: Theo dõi và quản lý thời gian làm việc

## 🛠️ Công nghệ sử dụng

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Custom CSS
- **AI/ML**: face-api.js + TensorFlow.js
- **Camera**: MediaDevices API
- **GPS**: Geolocation API
- **Storage**: localStorage (client-side)

## 🚀 Cài đặt và chạy dự án

### Yêu cầu hệ thống
- Node.js >= 18.0.0
- npm hoặc yarn
- Browser hỗ trợ WebRTC (Camera access)
- HTTPS (cho production - yêu cầu camera access)

### Các bước cài đặt

1. **Clone repository**
```bash
git clone <repository-url>
cd SmartPresence
```

2. **Cài đặt dependencies**
```bash
npm install
```

3. **Chạy ứng dụng**

**Khuyến nghị: Sử dụng HTTPS để camera hoạt động tốt nhất**
```bash
# Chạy với HTTPS (khuyến nghị)
npm run dev:fullstack:secure

# Hoặc chạy riêng lẻ:
npm run dev:https        # Frontend với HTTPS
npm run dev:backend      # Backend với HTTP
```

**Hoặc chạy HTTP (cho development đơn giản):**
```bash
npm run dev:fullstack    # Cả frontend và backend
npm run dev              # Chỉ frontend
```

4. **Truy cập ứng dụng**
- **HTTPS**: https://localhost:5173 (hoặc port khác nếu 5173 đã dùng)
- **HTTP**: http://localhost:5173
- **Backend API**: http://localhost:3001 (được proxy qua frontend)

## 📱 Hướng dẫn sử dụng

### Đăng nhập
1. Nhập thông tin đăng nhập tại màn hình Login
2. Hệ thống sẽ chuyển hướng đến màn hình chính

### Điểm danh lần đầu (Đăng ký khuôn mặt)
1. Chọn "Điểm danh" tại màn hình chính
2. Cho phép truy cập camera
3. Thực hiện quét khuôn mặt để đăng ký
4. Hệ thống sẽ lưu thông tin nhận dạng

### Điểm danh hàng ngày
1. Chọn "Điểm danh" 
2. Camera sẽ tự động nhận dạng khuôn mặt
3. Hệ thống xác thực vị trí GPS
4. Hoàn tất điểm danh thành công

## 🔐 Cấu hình HTTPS

### Tại sao cần HTTPS?
- **Camera/Microphone**: Trình duyệt hiện đại yêu cầu HTTPS để truy cập camera
- **GPS/Geolocation**: Dịch vụ định vị hoạt động tốt hơn với HTTPS
- **Security**: Bảo mật thông tin truyền tải
- **PWA Features**: Service Workers yêu cầu HTTPS

### Tự động tạo SSL Certificate
Ứng dụng sử dụng `vite-plugin-mkcert` để tự động tạo SSL certificates:
- Certificates được tạo tự động khi chạy lần đầu
- Không cần cài đặt thủ công
- Hoạt động với localhost và 127.0.0.1

### Troubleshooting HTTPS
1. **Cảnh báo Certificate**: Nhấn "Advanced" → "Continue anyway" (an toàn cho development)
2. **Camera không hoạt động**: Đảm bảo đang dùng HTTPS URL
3. **CORS Issues**: Backend đã cấu hình hỗ trợ nhiều ports và protocols

### Commands HTTPS
| Command | Mô tả |
|---------|-------|
| `npm run dev:https` | Frontend với HTTPS |
| `npm run dev:fullstack:secure` | Full app với HTTPS |
| `npm run preview:https` | Production preview với HTTPS |

## 🏗️ Cấu trúc dự án

```
src/
├── components/          # Shared components
│   ├── CameraScreen/   # Camera và Face Recognition
│   └── ProfileModal/   # Modal thông tin user
├── screens/            # Các màn hình chính
│   ├── HomeScreen/     # Màn hình chính
│   ├── LoginScreen/    # Màn hình đăng nhập
│   └── CameraDebugScreen/ # Debug camera
├── Services/           # Business logic services
│   ├── AuthService/    # Xác thực người dùng
│   ├── FaceRecognizeService/ # Nhận dạng khuôn mặt
│   ├── CheckInService/ # Logic điểm danh
│   └── GPSService/     # Định vị GPS
├── contexts/           # React contexts
└── utils/             # Utility functions
```

## 🔧 Scripts

```bash
npm run dev          # Chạy development server
npm run build        # Build cho production
npm run preview      # Preview production build
npm run lint         # Chạy ESLint
```

## 🌐 Deployment

### Development
- Sử dụng `npm run dev` cho local development
- Camera access yêu cầu HTTPS trên production

### Production
1. Build project: `npm run build`
2. Deploy folder `dist/` lên web server
3. Đảm bảo HTTPS để camera hoạt động
4. Cấu hình GPS permissions cho domain

## 📋 Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

**Lưu ý**: Camera access yêu cầu HTTPS trên production environment.

## 🤝 Đóng góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Mở Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
