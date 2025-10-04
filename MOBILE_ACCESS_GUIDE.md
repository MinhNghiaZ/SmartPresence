# Hướng dẫn truy cập ứng dụng từ điện thoại

## Thông tin kết nối hiện tại
- **Địa chỉ IP máy tính**: `192.168.1.8`
- **Port ứng dụng**: `5173` (HTTPS)
- **URL truy cập**: `https://192.168.1.8:5173`

## Các bước để truy cập từ điện thoại

### Bước 1: Đảm bảo cùng mạng Wi-Fi
- Điện thoại và máy tính phải kết nối cùng một mạng Wi-Fi
- Kiểm tra IP của máy tính: `192.168.1.8`

### Bước 2: Truy cập từ trình duyệt điện thoại
1. Mở trình duyệt trên điện thoại (Chrome, Safari, Firefox...)
2. Nhập địa chỉ: `https://192.168.1.8:5173`
3. **QUAN TRỌNG**: Bạn sẽ gặp cảnh báo bảo mật vì chứng chỉ SSL tự tạo

### Bước 3: Xử lý cảnh báo bảo mật

#### Trên Chrome (Android):
1. Khi thấy "Your connection is not private"
2. Nhấn "Advanced" 
3. Nhấn "Proceed to 192.168.1.8 (unsafe)"

#### Trên Safari (iOS):
1. Khi thấy "This connection is not private"
2. Nhấn "Show Details"
3. Nhấn "visit this website"
4. Nhấn "Visit Website" trong popup

#### Trên Firefox (Mobile):
1. Khi thấy "Warning: Potential Security Risk"
2. Nhấn "Advanced..."
3. Nhấn "Accept the Risk and Continue"

## Kiểm tra kết nối

### Test 1: Ping từ điện thoại
- Cài ứng dụng "Network Analyzer" hoặc tương tự
- Ping địa chỉ `192.168.1.8` để đảm bảo kết nối mạng

### Test 2: Truy cập HTTP trước (nếu cần)
- Nếu không thể truy cập HTTPS, có thể tạm thời chuyển về HTTP để test
- Sửa `vite.config.ts`: `https: false`
- Truy cập: `http://192.168.1.8:5173`

## Lưu ý quan trọng

### Về HTTPS và điện thoại:
- ✅ Camera và GPS hoạt động tốt với HTTPS
- ⚠️ Chứng chỉ tự tạo sẽ có cảnh báo bảo mật
- 📱 Cần chấp nhận rủi ro bảo mật để truy cập

### Về hiệu năng:
- Kết nối qua Wi-Fi local sẽ rất nhanh
- Camera recognition có thể chậm hơn trên điện thoại
- GPS hoạt động chính xác hơn trên điện thoại

### Troubleshooting:

#### Không thể kết nối:
1. Kiểm tra Firewall Windows có chặn port 5173 không
2. Đảm bảo cùng mạng Wi-Fi
3. Thử tắt VPN nếu có

#### Chứng chỉ SSL bị từ chối:
1. Thử truy cập từ trình duyệt khác
2. Xóa cache/cookies trình duyệt
3. Restart ứng dụng và thử lại

#### Camera/GPS không hoạt động:
1. Cấp quyền camera/location cho trình duyệt
2. Đảm bảo sử dụng HTTPS (không phải HTTP)
3. Thử trình duyệt khác (Chrome thường hoạt động tốt nhất)

## Commands để restart server nếu cần:
```bash
# Stop server hiện tại (Ctrl+C)
# Restart với HTTPS
npm run dev:secure

# Hoặc restart full stack
npm run dev:fullstack:secure
```

## IP hiện tại của máy:
- Wi-Fi: `192.168.1.8`
- Cập nhật: Chạy `ipconfig` để kiểm tra IP mới nếu thay đổi