# Hướng dẫn thêm hình ảnh vào GPS Guide Modal

## Tổng quan
Component `GPSGuideModal` đã được tạo với các placeholder cho hình ảnh. Bạn cần thay thế các placeholder này bằng hình ảnh thực tế.

## Cấu trúc file
```
src/
  components/
    GPSGuide/
      GPSGuideModal.tsx      # Component chính
      GPSGuideModal.css      # Styling
      index.ts               # Export
```

## Vị trí placeholder hình ảnh

Trong file `GPSGuideModal.tsx`, tìm các phần có class `gps-guide-image-placeholder`:

### iOS (7 hình ảnh cần):
1. **Bước 1**: Biểu tượng Cài đặt iOS
2. **Bước 2**: Menu Privacy & Security
3. **Bước 3**: Location Services menu
4. **Bước 4**: Toggle Location Services ON
5. **Bước 5**: Chrome trong danh sách apps
6. **Bước 6**: While Using the App option
7. **Bước 7**: Precise Location toggle ON

### Android (8 hình ảnh cần):
1. **Bước 1**: Biểu tượng Cài đặt Android
2. **Bước 2**: Location menu Android
3. **Bước 3**: Use location toggle ON
4. **Bước 4**: App permissions menu
5. **Bước 5**: Chrome trong danh sách apps
6. **Bước 6**: Allow only while using option
7. **Bước 7**: Use precise location toggle ON
8. **Bước 8**: Google Location Accuracy

## Cách thêm hình ảnh

### Bước 1: Chuẩn bị hình ảnh
- Chụp screenshot các bước trên thiết bị iOS và Android thực tế
- Lưu hình ảnh với tên mô tả rõ ràng, ví dụ:
  - `ios-settings-icon.png`
  - `ios-privacy-security.png`
  - `android-location-menu.png`
  - v.v.

### Bước 2: Lưu hình ảnh vào thư mục
Tạo thư mục mới trong `public/` hoặc `src/assets/`:
```
public/
  gps-guide/
    ios/
      step1-settings.png
      step2-privacy.png
      ...
    android/
      step1-settings.png
      step2-location.png
      ...
```

### Bước 3: Thay thế placeholder

Tìm đoạn code:
```tsx
<div className="gps-guide-image-placeholder">
  <div className="placeholder-box">
    <span className="placeholder-icon">🖼️</span>
    <span className="placeholder-text">Hình ảnh: Biểu tượng Cài đặt iOS</span>
  </div>
</div>
```

Thay thế bằng:
```tsx
<div className="gps-guide-image-placeholder">
  <img 
    src="/gps-guide/ios/step1-settings.png" 
    alt="Biểu tượng Cài đặt iOS"
    className="gps-guide-step-image"
  />
</div>
```

### Bước 4: Thêm CSS cho hình ảnh

Thêm vào file `GPSGuideModal.css`:
```css
.gps-guide-step-image {
  width: 100%;
  max-width: 400px;
  height: auto;
  border-radius: 8px;
  border: 2px solid #e5e7eb;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  margin: 0 auto;
  display: block;
  transition: all 0.3s ease;
}

.gps-guide-step-image:hover {
  transform: scale(1.05);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
  border-color: #667eea;
}
```

## Ví dụ đầy đủ cho một bước:

### Trước khi thêm hình ảnh:
```tsx
<div className="gps-guide-step">
  <div className="gps-guide-step-number">1</div>
  <div className="gps-guide-step-content">
    <h4 className="gps-guide-step-title">Mở Cài đặt iPhone</h4>
    <p className="gps-guide-step-description">
      Tìm và mở ứng dụng <strong>"Cài đặt"</strong> (Settings) trên màn hình chính của iPhone.
    </p>
    <div className="gps-guide-image-placeholder">
      <div className="placeholder-box">
        <span className="placeholder-icon">🖼️</span>
        <span className="placeholder-text">Hình ảnh: Biểu tượng Cài đặt iOS</span>
      </div>
    </div>
  </div>
</div>
```

### Sau khi thêm hình ảnh:
```tsx
<div className="gps-guide-step">
  <div className="gps-guide-step-number">1</div>
  <div className="gps-guide-step-content">
    <h4 className="gps-guide-step-title">Mở Cài đặt iPhone</h4>
    <p className="gps-guide-step-description">
      Tìm và mở ứng dụng <strong>"Cài đặt"</strong> (Settings) trên màn hình chính của iPhone.
    </p>
    <div className="gps-guide-image-placeholder">
      <img 
        src="/gps-guide/ios/step1-settings.png" 
        alt="Biểu tượng Cài đặt iOS - Biểu tượng hình bánh răng màu xám trên màn hình iPhone"
        className="gps-guide-step-image"
        loading="lazy"
      />
    </div>
  </div>
</div>
```

## Tips tối ưu hình ảnh:

1. **Kích thước**: Giữ hình ảnh ở độ phân giải vừa phải (800-1200px chiều rộng)
2. **Định dạng**: Sử dụng WebP để file nhẹ hơn, fallback sang PNG/JPG
3. **Lazy loading**: Đã thêm `loading="lazy"` để tải hình ảnh khi cần
4. **Alt text**: Mô tả chi tiết để accessibility tốt hơn
5. **Tên file**: Đặt tên rõ ràng, không dấu, viết thường

## Kiểm tra sau khi thêm hình ảnh:

1. ✅ Tất cả hình ảnh đã được thêm vào
2. ✅ Hình ảnh hiển thị đúng với mô tả
3. ✅ Hình ảnh responsive trên mobile
4. ✅ Tốc độ tải trang vẫn nhanh
5. ✅ Alt text đầy đủ cho accessibility

## Tùy chỉnh nâng cao:

### Thêm chú thích cho hình ảnh:
```tsx
<div className="gps-guide-image-placeholder">
  <img 
    src="/gps-guide/ios/step7-precise-location.png" 
    alt="Bật Precise Location"
    className="gps-guide-step-image"
  />
  <p className="gps-guide-image-caption">
    ⚠️ Đảm bảo toggle "Precise Location" màu xanh
  </p>
</div>
```

Và thêm CSS:
```css
.gps-guide-image-caption {
  text-align: center;
  font-size: 0.875rem;
  color: #6b7280;
  font-style: italic;
  margin-top: 0.5rem;
}
```

## Liên hệ
Nếu cần hỗ trợ thêm, vui lòng tạo issue hoặc liên hệ team phát triển.
