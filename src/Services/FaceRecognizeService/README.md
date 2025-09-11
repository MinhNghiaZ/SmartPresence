# FaceRecognizeService - Service Nhận Dạng Khuôn Mặt

Service nhận dạng khuôn mặt sử dụng thư viện face-api.js cho ứng dụng SmartPresence.

## 📋 Mục đích

Service này được thiết kế để:
- Phát hiện khuôn mặt trong ảnh/video real-time
- Đăng ký và lưu trữ thông tin khuôn mặt của người dùng
- Nhận dạng và xác thực khuôn mặt cho việc điểm danh
- Quản lý database khuôn mặt trong localStorage

## 🔧 Công nghệ sử dụng

- **face-api.js**: Thư viện machine learning cho face detection và recognition
- **TensorFlow.js**: Engine chạy models AI trong browser
- **HTML5 Canvas**: Vẽ bounding box và overlay graphics
- **MediaDevices API**: Truy cập camera của thiết bị

## 📦 Models được sử dụng

Service sử dụng 3 models AI từ face-api.js:

1. **Tiny Face Detector** (`tiny_face_detector_model`)
   - Phát hiện vị trí khuôn mặt trong ảnh
   - Tối ưu cho performance real-time
   - Kích thước nhỏ, tốc độ nhanh

2. **Face Landmark 68 Tiny** (`face_landmark_68_tiny_model`)
   - Xác định 68 điểm mốc trên khuôn mặt
   - Giúp căn chỉnh và chuẩn hóa khuôn mặt
   - Version nhỹ gọn cho mobile

3. **Face Recognition** (`face_recognition_model`)
   - Trích xuất đặc trưng khuôn mặt (face descriptors)
   - Tạo vector 128 chiều đại diện cho khuôn mặt
   - So sánh và nhận dạng identity

## 🏗️ Cấu trúc Code

### Interfaces

```typescript
// Mô tả thông tin khuôn mặt đã đăng ký
interface FaceDescriptor {
  id: string;              // ID duy nhất
  name: string;            // Tên người dùng
  descriptor: Float32Array; // Vector đặc trưng 128 chiều
}

// Kết quả nhận dạng khuôn mặt
interface FaceRecognitionResult {
  isMatch: boolean;        // Có khớp với ai đã đăng ký không
  confidence: number;      // Độ tin cậy (0-100%)
  person?: FaceDescriptor; // Thông tin người được nhận dạng
  box?: faceapi.Box;      // Tọa độ khung bao khuôn mặt
}
```

### Class FaceRecognizeService

#### Properties
- `isModelsLoaded`: Trạng thái đã tải models
- `knownFaces`: Mảng chứa khuôn mặt đã đăng ký
- `MODEL_URL`: Đường dẫn folder chứa models
- `FACE_MATCH_THRESHOLD`: Ngưỡng nhận dạng (mặc định 0.6)

#### Methods chính

**1. Khởi tạo**
```typescript
async initializeModels(): Promise<void>
```
- Tải 3 models AI từ folder `/public/models/`
- Chỉ tải 1 lần, các lần sau sẽ skip
- Throw error nếu không tải được

**2. Phát hiện khuôn mặt**
```typescript
async detectFace(imageElement): Promise<Detection[]>
```
- Input: HTMLImageElement, HTMLVideoElement, hoặc HTMLCanvasElement
- Output: Mảng các khuôn mặt được phát hiện với descriptors
- Sử dụng TinyFaceDetector + FaceLandmarks + FaceDescriptors

**3. Đăng ký khuôn mặt**
```typescript
async registerFace(imageElement, personId, personName): Promise<boolean>
```
- Phát hiện khuôn mặt trong ảnh
- Kiểm tra chỉ có 1 khuôn mặt
- Lưu vào mảng `knownFaces`
- Cập nhật nếu ID đã tồn tại

**4. Nhận dạng khuôn mặt**
```typescript
async recognizeFace(imageElement): Promise<FaceRecognitionResult[]>
```
- Phát hiện tất cả khuôn mặt trong ảnh
- So sánh với database đã lưu
- Tính khoảng cách Euclidean
- Trả về kết quả với độ tin cậy

**5. Lưu trữ dữ liệu**
```typescript
saveFacesToStorage(): void
loadFacesFromStorage(): void
```
- Lưu/tải từ localStorage
- Chuyển đổi Float32Array ↔ Array để JSON serialize

**6. Vẽ kết quả**
```typescript
drawRecognitionResults(canvas, results): void
```
- Vẽ khung bao màu xanh (match) / đỏ (không match)
- Hiển thị tên và độ tin cậy

## 🔄 Luồng hoạt động

### 1. Khởi tạo lần đầu
```
App Start → Load Models → Load Saved Faces → Ready
```

### 2. Đăng ký khuôn mặt mới
```
Camera/Image → Detect Face → Extract Descriptor → Save to Array → Save to LocalStorage
```

### 3. Nhận dạng khuôn mặt
```
Camera/Image → Detect Faces → Extract Descriptors → Compare with Database → Return Results
```

## 📊 Thuật toán nhận dạng

### 1. Face Detection
- Sử dụng SSD (Single Shot Detector) architecture
- Phát hiện bounding box của khuôn mặt
- Confidence score cho mỗi detection

### 2. Face Landmarks
- Phát hiện 68 điểm mốc trên khuôn mặt
- Căn chỉnh khuôn mặt theo pose chuẩn
- Cải thiện độ chính xác recognition

### 3. Face Descriptors
- Sử dụng ResNet architecture
- Trích xuất vector 128 chiều
- Bất biến với lighting, pose, expression

### 4. Face Matching
- Tính khoảng cách Euclidean giữa descriptors
- Threshold 0.6 (có thể điều chỉnh)
- Distance càng nhỏ = độ tương đồng càng cao

## ⚙️ Cấu hình

### Ngưỡng nhận dạng
```typescript
faceRecognizeService.setMatchThreshold(0.7); // Tăng độ chính xác
```
- 0.5: Loose (dễ nhận dạng nhầm)
- 0.6: Balanced (mặc định)
- 0.7: Strict (ít nhận dạng nhầm)

### Performance tối ưu
```typescript
// Resize ảnh trước khi xử lý
const resizedCanvas = faceRecognizeService.resizeImage(image, 640, 480);
const results = await faceRecognizeService.recognizeFace(resizedCanvas);
```

## 💾 Lưu trữ dữ liệu

### LocalStorage Structure
```json
{
  "registeredFaces": [
    {
      "id": "1694434567890",
      "name": "Nguyễn Văn A",
      "descriptor": [0.1, 0.2, 0.3, ..., 0.128] // Array 128 số
    }
  ]
}
```

### Dung lượng
- Mỗi face descriptor: ~500 bytes
- 100 người: ~50KB
- Không giới hạn về mặt kỹ thuật

## 🔍 Debugging

### Kiểm tra Models
```typescript
console.log('Models loaded:', faceRecognizeService.isReady());
```

### Kiểm tra Detection
```typescript
const detections = await faceRecognizeService.detectFace(imageElement);
console.log(`Found ${detections.length} faces`);
```

### Kiểm tra Database
```typescript
const faces = faceRecognizeService.getRegisteredFaces();
console.log(`${faces.length} registered faces:`, faces.map(f => f.name));
```

## ⚠️ Lưu ý quan trọng

### Chất lượng ảnh
- **Độ phân giải**: Tối thiểu 320x240, tối ưu 640x480
- **Lighting**: Ánh sáng đều, tránh backlight
- **Góc chụp**: Thẳng mặt, tránh nghiêng quá 30°
- **Khoảng cách**: Khuôn mặt chiếm 20-80% ảnh

### Performance
- Models load ~3-5MB, chỉ tải 1 lần
- Detection: ~100-300ms/frame
- Chạy trên CPU, không cần GPU

### Privacy & Security
- Tất cả xử lý local, không gửi data lên server
- Face descriptors không thể reverse thành ảnh
- LocalStorage có thể bị xóa khi clear browser

### Browser Support
- Chrome/Edge: Full support
- Firefox: Full support  
- Safari: Cần enable camera permissions
- Mobile: Hoạt động tốt trên device mạnh

## 🚀 Cách sử dụng cơ bản

```typescript
// 1. Khởi tạo
await faceRecognizeService.initializeModels();
faceRecognizeService.loadFacesFromStorage();

// 2. Đăng ký khuôn mặt
const video = document.getElementById('video') as HTMLVideoElement;
await faceRecognizeService.registerFace(video, 'user123', 'John Doe');
faceRecognizeService.saveFacesToStorage();

// 3. Nhận dạng
const results = await faceRecognizeService.recognizeFace(video);
results.forEach(result => {
  if (result.isMatch && result.person) {
    console.log(`Hello ${result.person.name}! (${result.confidence}%)`);
  }
});

// 4. Vẽ kết quả
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
faceRecognizeService.drawRecognitionResults(canvas, results);
```

## 🔧 Troubleshooting

### Models không load
- Kiểm tra folder `/public/models/` có đủ files
- Kiểm tra Network tab có lỗi 404
- Thử reload page

### Camera không hoạt động
- Kiểm tra HTTPS (required cho camera)
- Allow camera permission
- Thử browser khác

### Nhận dạng không chính xác
- Cải thiện chất lượng ảnh đăng ký
- Đăng ký nhiều góc độ cho 1 người
- Tăng threshold recognition
- Kiểm tra lighting conditions
