# 📱 Hướng dẫn cài đặt PWA - SmartPresence

**Date**: October 11, 2025  
**Purpose**: Cài đặt ứng dụng lên điện thoại để có GPS chính xác cao

---

## 🎯 Lợi ích khi cài PWA

✅ **GPS chính xác cao**: Chrome sẽ sử dụng GPS chip thay vì WiFi  
✅ **Không bị lệch vị trí**: Accuracy < 20m thay vì 1-2km  
✅ **Sử dụng như app native**: Icon trên màn hình chính  
✅ **Không cần App Store/Play Store**: Cài trực tiếp từ web  
✅ **Tự động cập nhật**: Không cần cài lại khi có phiên bản mới

---

## 📋 Yêu cầu trước khi cài

- [x] App đã deploy lên server (production)
- [x] HTTPS enabled (bắt buộc cho PWA)
- [x] `manifest.json` đã có trong root
- [x] `service-worker.js` đã có trong `/public`
- [x] Service worker đã được register trong `main.tsx`

---

## 🔧 Bước 1: Build và Deploy

### 1.1. Build Frontend

```bash
cd c:\Users\Maytinh\Desktop\SmartPresence
npm run build
```

### 1.2. Build Backend

```bash
cd backend
npm run build
```

### 1.3. Deploy lên server

**Option A: Deploy lên VPS**
```bash
# Scp files lên server
scp -r dist/ user@your-server.com:/var/www/smartpresence
scp -r backend/dist/ user@your-server.com:/var/www/smartpresence/backend
```

**Option B: Deploy lên Vercel/Netlify**
```bash
npm install -g vercel
vercel --prod
```

---

## 📱 Bước 2: Cài đặt trên Android (Chrome)

### 2.1. Mở Chrome trên điện thoại

1. Mở **Chrome Browser** (không phải trình duyệt khác)
2. Truy cập: `https://your-domain.com` (URL production của bạn)

### 2.2. Cài đặt PWA

**Cách 1: Prompt tự động**
- Chrome sẽ hiện banner "Thêm SmartPresence vào màn hình chính"
- Nhấn **"Thêm"** hoặc **"Install"**

**Cách 2: Menu Chrome**
1. Nhấn menu 3 chấm ở góc trên bên phải
2. Chọn **"Thêm vào màn hình chính"** hoặc **"Add to Home screen"**
3. Đặt tên: **"SmartPresence"**
4. Nhấn **"Thêm"**

### 2.3. Cấp quyền GPS chính xác cao

**QUAN TRỌNG**: Phải làm bước này để có GPS chính xác!

1. Mở app vừa cài (icon trên màn hình chính)
2. Khi app yêu cầu quyền GPS, chọn **"Allow"** hoặc **"Cho phép"**
3. **Android 12+**: Chọn **"Precise location"** (Vị trí chính xác)

**Kiểm tra quyền GPS**:
```
Settings → Apps → SmartPresence → Permissions → Location
→ Chọn "Allow all the time" hoặc "Allow only while using the app"
→ Bật "Use precise location" ✅
```

---

## 🍎 Bước 3: Cài đặt trên iOS (Safari)

### 3.1. Mở Safari trên iPhone

1. Mở **Safari** (không phải Chrome trên iOS)
2. Truy cập: `https://your-domain.com`

### 3.2. Cài đặt PWA

1. Nhấn nút **Share** (icon mũi tên lên ↑) ở thanh dưới
2. Scroll xuống, chọn **"Add to Home Screen"**
3. Đặt tên: **"SmartPresence"**
4. Nhấn **"Add"**

### 3.3. Cấp quyền GPS

1. Mở app từ Home Screen
2. Khi app yêu cầu GPS, chọn **"Allow While Using App"**
3. **iOS 14+**: Chọn **"Precise: ON"**

**Kiểm tra quyền GPS**:
```
Settings → Privacy & Security → Location Services
→ SmartPresence
→ Chọn "While Using the App"
→ Bật "Precise Location" ✅
```

---

## 🔍 Bước 4: Kiểm tra cài đặt thành công

### 4.1. Kiểm tra PWA Mode

Mở app và mở **Console** (dev tools):

```javascript
// Check if running as PWA
console.log('Display mode:', 
  window.matchMedia('(display-mode: standalone)').matches ? 'PWA' : 'Browser'
);

// Expected output: "Display mode: PWA" ✅
```

### 4.2. Kiểm tra GPS Accuracy

Trong app, mở màn hình điểm danh và xem Console:

```
📍 Requesting NEW GPS sample with options: {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 0,
  timestamp: "2025-10-11T..."
}

✅ GPS sample received: {
  accuracy: 12.5,  // ✅ Should be < 20m when installed as PWA
  age: "245ms",    // ✅ Should be < 1000ms (fresh data)
  timestamp: "..."
}
```

**Thành công nếu**:
- ✅ Accuracy < 20m (thay vì 50-2000m khi dùng browser)
- ✅ Age < 1000ms (GPS mới, không cache)
- ✅ Display mode: PWA

---

## 🐛 Troubleshooting

### Vấn đề 1: Không hiện prompt "Add to Home Screen"

**Nguyên nhân**:
- Chưa có HTTPS
- manifest.json bị lỗi
- Service Worker chưa register

**Giải pháp**:
```bash
# Check manifest
curl https://your-domain.com/manifest.json

# Check service worker
curl https://your-domain.com/service-worker.js

# Check Chrome DevTools → Application → Manifest
# Phải thấy all fields valid ✅
```

### Vấn đề 2: GPS vẫn không chính xác

**Nguyên nhân**:
- Chưa cấp quyền "Precise Location"
- Đang dùng browser thay vì PWA installed
- Device không hỗ trợ GPS chip

**Giải pháp**:
```
1. Uninstall app cũ
2. Clear browser cache
3. Reinstall và cấp quyền lại
4. Check Settings → Location → App permissions → Precise ON ✅
```

### Vấn đề 3: App không update sau khi deploy

**Nguyên nhân**:
- Service Worker cache cũ
- Browser cache

**Giải pháp**:
```javascript
// In serviceWorkerRegistration.ts, version phải tăng:
const CACHE_NAME = 'smart-presence-v2'; // Tăng từ v1 → v2

// Hoặc force reload:
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    registrations.forEach(reg => reg.unregister());
  });
  location.reload(true);
}
```

---

## 📊 So sánh: Browser vs PWA

| Feature | Browser (Chrome) | PWA Installed |
|---------|------------------|---------------|
| GPS Accuracy | 50-2000m (WiFi) | 5-20m (GPS chip) ✅ |
| GPS maximumAge | Có thể cache | Bắt buộc = 0 ✅ |
| Permissions | Hỏi mỗi lần | Nhớ lâu dài ✅ |
| Icon màn hình | ❌ Không | ✅ Có |
| Fullscreen | ❌ Không | ✅ Có |
| Offline support | ❌ Không | ✅ Có (basic) |
| Auto-update | ❌ Không | ✅ Có |

---

## ✅ Checklist hoàn thành

### Frontend
- [x] `manifest.json` with proper icons and permissions
- [x] `service-worker.js` in `/public`
- [x] Service worker registration in `main.tsx`
- [x] `<link rel="manifest">` in `index.html`
- [x] PWA meta tags (theme-color, apple-mobile-web-app, etc.)
- [x] HTTPS enabled

### Backend
- [x] Serving manifest.json at root
- [x] Serving service-worker.js
- [x] CORS configured
- [x] HTTPS enabled

### GPS Service
- [x] `enableHighAccuracy: true`
- [x] `maximumAge: 0` (no cache)
- [x] `timeout: 15000` (enough time for GPS)
- [x] Age validation (warning if > 1000ms)
- [x] Accuracy logging for debugging

### Testing
- [ ] Install on Android device
- [ ] Grant "Precise location" permission
- [ ] Test GPS accuracy < 20m
- [ ] Install on iOS device
- [ ] Grant location permission with "Precise ON"
- [ ] Test GPS accuracy < 20m

---

## 🚀 Next Steps

1. **Build và deploy** code mới lên production
2. **Test trên 1 device**: Cài PWA và test GPS
3. **Nếu GPS chính xác < 20m**: Deploy cho tất cả users
4. **Hướng dẫn users**: Gửi link và guide cài đặt PWA

---

## 📚 References

- [Web.dev - Add a web app manifest](https://web.dev/add-manifest/)
- [MDN - Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Geolocation API - High Accuracy](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)
- [Chrome - Install criteria](https://web.dev/install-criteria/)

---

**Author**: AI Assistant  
**Status**: ✅ Ready to deploy  
**Version**: 1.0
