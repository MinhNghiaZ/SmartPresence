# 🚀 SmartPresence - Server Deployment Guide

## 📋 Tổng quan

Hướng dẫn triển khai các service của SmartPresence lên server, chuyển từ client-side processing sang server-side processing cho Face Recognition và GPS Verification.

## 🏗️ Kiến trúc hệ thống mới

```
CLIENT (Browser)                    SERVER (Backend)
┌─────────────────┐                ┌──────────────────────┐
│ Camera Capture  │────────────────→│ Face Recognition API │
│ GPS Coordinates │────────────────→│ GPS Verification API │
│ UI/UX           │←────────────────│ Attendance API      │
└─────────────────┘                └──────────────────────┘
```

## ✅ Tính khả thi

**HOÀN TOÀN KHẢ THI** - Có thể triển khai được với những ưu điểm:

### 🎯 Ưu điểm
- ✅ **Centralized Processing**: Tất cả logic xử lý tập trung ở server
- ✅ **Better Security**: Face data không lưu trên client
- ✅ **Consistent Performance**: Không phụ thuộc device của user
- ✅ **Scalability**: Có thể scale theo demand
- ✅ **Analytics**: Dễ dàng tracking và reporting

### ⚠️ Thách thức
- ⚠️ **Bandwidth**: Images có thể lớn
- ⚠️ **Latency**: Network delay
- ⚠️ **Privacy**: Face data qua internet
- ⚠️ **Cost**: Server processing đắt hơn client-side

---

## 🛠️ Technology Stack đề xuất

### Backend Options

#### Option 1: Python Stack
```
- FastAPI (API Framework)
- face_recognition library (Face processing)
- PostgreSQL (Database)
- Redis (Caching)
- Docker (Containerization)
```

#### Option 2: Node.js Stack
```
- Express.js (API Framework) 
- @vladmandic/face-api (Face processing)
- PostgreSQL (Database)
- Redis (Caching)
- Docker (Containerization)
```

---

## 🎯 1. Face Recognition Service (Server-side)

### A. Python Implementation (FastAPI)

```python
# main.py
from fastapi import FastAPI, UploadFile, HTTPException
import face_recognition
import numpy as np
import io
from database import save_face_encoding, get_face_encoding

app = FastAPI()

@app.post("/face/register")
async def register_face(user_id: str, image: UploadFile):
    """Đăng ký khuôn mặt người dùng"""
    try:
        # Load image từ client
        image_data = await image.read()
        image_array = face_recognition.load_image_file(io.BytesIO(image_data))
        
        # Extract face encoding
        face_encodings = face_recognition.face_encodings(image_array)
        
        if len(face_encodings) == 0:
            return {"success": False, "error": "No face detected"}
        
        if len(face_encodings) > 1:
            return {"success": False, "error": "Multiple faces detected"}
        
        # Save to database
        await save_face_encoding(user_id, face_encodings[0])
        
        return {
            "success": True,
            "message": f"Face registered successfully for user {user_id}"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/face/verify")
async def verify_face(user_id: str, image: UploadFile):
    """Xác thực khuôn mặt người dùng"""
    try:
        # Load known face từ database
        known_encoding = await get_face_encoding(user_id)
        if known_encoding is None:
            return {"success": False, "error": "User not registered"}
        
        # Load image từ client
        image_data = await image.read()
        unknown_image = face_recognition.load_image_file(io.BytesIO(image_data))
        unknown_encodings = face_recognition.face_encodings(unknown_image)
        
        if len(unknown_encodings) == 0:
            return {"success": False, "error": "No face detected"}
        
        # Compare faces
        results = face_recognition.compare_faces([known_encoding], unknown_encodings[0])
        distance = face_recognition.face_distance([known_encoding], unknown_encodings[0])
        
        confidence = 1 - distance[0]
        is_match = results[0] and confidence > 0.6  # Threshold 60%
        
        return {
            "success": True,
            "is_match": is_match,
            "confidence": round(confidence, 3),
            "user_id": user_id if is_match else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### B. Node.js Implementation (Express)

```javascript
// face-service.js
const express = require('express');
const faceapi = require('@vladmandic/face-api');
const multer = require('multer');
const canvas = require('canvas');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Initialize face-api models
async function initializeModels() {
  await faceapi.nets.ssdMobilenetv1.loadFromDisk('./models');
  await faceapi.nets.faceRecognitionNet.loadFromDisk('./models');
  await faceapi.nets.faceLandmark68Net.loadFromDisk('./models');
}

app.post('/face/register', upload.single('image'), async (req, res) => {
  try {
    const { userId } = req.body;
    const imageBuffer = req.file.buffer;
    
    // Process image
    const img = await canvas.loadImage(imageBuffer);
    const detections = await faceapi.detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    if (!detections) {
      return res.json({ success: false, error: 'No face detected' });
    }
    
    // Save descriptor to database
    await saveFaceDescriptor(userId, detections.descriptor);
    
    res.json({ 
      success: true, 
      message: `Face registered for user ${userId}` 
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/face/verify', upload.single('image'), async (req, res) => {
  try {
    const { userId } = req.body;
    const imageBuffer = req.file.buffer;
    
    // Load known descriptor from database
    const knownDescriptor = await getFaceDescriptor(userId);
    if (!knownDescriptor) {
      return res.json({ success: false, error: 'User not registered' });
    }
    
    // Process unknown image
    const img = await canvas.loadImage(imageBuffer);
    const detections = await faceapi.detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    if (!detections) {
      return res.json({ success: false, error: 'No face detected' });
    }
    
    // Compare descriptors
    const distance = faceapi.euclideanDistance(knownDescriptor, detections.descriptor);
    const confidence = 1 - distance;
    const isMatch = confidence > 0.6;
    
    res.json({
      success: true,
      is_match: isMatch,
      confidence: Math.round(confidence * 1000) / 1000,
      user_id: isMatch ? userId : null
    });
    
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
initializeModels().then(() => {
  app.listen(8001, () => {
    console.log('Face Recognition Service running on port 8001');
  });
});
```

---

## 📍 2. GPS Verification Service

### Python Implementation

```python
# gps_service.py
from fastapi import FastAPI
from geopy.distance import geodesic
from pydantic import BaseModel

app = FastAPI()

class LocationRequest(BaseModel):
    latitude: float
    longitude: float

class CampusConfig:
    # Tọa độ khuôn viên trường (có thể config từ database)
    CENTER = (11.052845, 106.665911)  # EIU coordinates
    ALLOWED_RADIUS = 500  # meters

@app.post("/gps/verify")
async def verify_location(location: LocationRequest):
    """Xác thực vị trí GPS người dùng"""
    try:
        # Campus coordinates
        campus_center = CampusConfig.CENTER
        user_location = (location.latitude, location.longitude)
        
        # Calculate distance using Haversine formula
        distance = geodesic(campus_center, user_location).meters
        
        # Check if within allowed radius
        is_allowed = distance <= CampusConfig.ALLOWED_RADIUS
        
        return {
            "success": True,
            "allowed": is_allowed,
            "distance": round(distance, 2),
            "max_distance": CampusConfig.ALLOWED_RADIUS,
            "coordinates": {
                "lat": location.latitude,
                "lng": location.longitude
            },
            "campus_center": {
                "lat": campus_center[0],
                "lng": campus_center[1]
            }
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }

@app.get("/gps/config")
async def get_gps_config():
    """Lấy cấu hình GPS (cho debug)"""
    return {
        "campus_center": CampusConfig.CENTER,
        "allowed_radius": CampusConfig.ALLOWED_RADIUS
    }

@app.post("/gps/update-config")
async def update_gps_config(
    latitude: float, 
    longitude: float, 
    radius: int = 500
):
    """Cập nhật cấu hình GPS (admin only)"""
    CampusConfig.CENTER = (latitude, longitude)
    CampusConfig.ALLOWED_RADIUS = radius
    
    return {
        "success": True,
        "message": "GPS config updated",
        "new_config": {
            "center": CampusConfig.CENTER,
            "radius": CampusConfig.ALLOWED_RADIUS
        }
    }
```

---

## 📊 3. Complete Attendance API

### Unified Check-in Service

```python
# attendance_service.py
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from datetime import datetime, timedelta
import httpx
from database import save_attendance_record, get_subject_info

app = FastAPI()

class CheckInRequest(BaseModel):
    user_id: str
    subject_code: str
    face_image: str  # Base64 encoded image
    coordinates: dict  # {"lat": float, "lng": float}

class AttendanceRecord(BaseModel):
    id: int
    user_id: str
    subject_code: str
    check_in_time: datetime
    status: str  # Present, Late, Absent
    location_lat: float
    location_lng: float
    face_confidence: float

@app.post("/attendance/checkin")
async def check_in(request: CheckInRequest):
    """
    Complete check-in process:
    1. Verify face recognition
    2. Verify GPS location
    3. Determine attendance status
    4. Save attendance record
    """
    try:
        # Step 1: Verify face recognition
        async with httpx.AsyncClient() as client:
            face_response = await client.post(
                "http://face-service:8001/face/verify",
                files={
                    "image": request.face_image,
                },
                data={"userId": request.user_id}
            )
            face_result = face_response.json()
        
        if not face_result.get("success") or not face_result.get("is_match"):
            return {
                "success": False,
                "error": "Face verification failed",
                "details": face_result
            }
        
        # Step 2: Verify GPS location
        async with httpx.AsyncClient() as client:
            gps_response = await client.post(
                "http://gps-service:8002/gps/verify",
                json=request.coordinates
            )
            gps_result = gps_response.json()
        
        if not gps_result.get("success") or not gps_result.get("allowed"):
            return {
                "success": False,
                "error": f"Location not allowed. You are {gps_result.get('distance', 'unknown')}m away from campus",
                "details": gps_result
            }
        
        # Step 3: Determine attendance status
        current_time = datetime.now()
        subject_info = await get_subject_info(request.subject_code)
        
        if not subject_info:
            return {"success": False, "error": "Subject not found"}
        
        # Parse class start time (assuming format "7:30 AM - 9:30 AM")
        class_start_str = subject_info["time"].split(" - ")[0]
        class_start_time = datetime.strptime(
            f"{current_time.date()} {class_start_str}", 
            "%Y-%m-%d %I:%M %p"
        )
        
        # Determine status (15 minutes grace period)
        if current_time <= class_start_time + timedelta(minutes=15):
            status = "Present"
        else:
            status = "Late"
        
        # Step 4: Save attendance record
        record_data = {
            "user_id": request.user_id,
            "subject_code": request.subject_code,
            "check_in_time": current_time,
            "status": status,
            "location_lat": request.coordinates["lat"],
            "location_lng": request.coordinates["lng"],
            "face_confidence": face_result["confidence"]
        }
        
        record = await save_attendance_record(record_data)
        
        return {
            "success": True,
            "message": f"✅ Check-in successful! Status: {status}",
            "record": {
                "id": record.id,
                "subject": f"{subject_info['name']} ({request.subject_code})",
                "timestamp": current_time.strftime("%d/%m/%Y, %H:%M:%S"),
                "location": subject_info["room"],
                "status": status
            },
            "details": {
                "face_confidence": face_result["confidence"],
                "gps_distance": gps_result["distance"]
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/attendance/history/{user_id}")
async def get_attendance_history(user_id: str):
    """Lấy lịch sử điểm danh của user"""
    try:
        records = await get_user_attendance_history(user_id)
        return {
            "success": True,
            "records": records
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
```

---

## 🗄️ 4. Database Schema

### PostgreSQL Schema

```sql
-- Database: smartpresence

-- Users table
CREATE TABLE users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Face descriptors table
CREATE TABLE face_descriptors (
    user_id VARCHAR(50) PRIMARY KEY REFERENCES users(id),
    descriptor BYTEA NOT NULL, -- Serialized Float32Array
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Subjects table
CREATE TABLE subjects (
    code VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    instructor VARCHAR(100),
    room VARCHAR(50),
    time_slot VARCHAR(50), -- "7:30 AM - 9:30 AM"
    created_at TIMESTAMP DEFAULT NOW()
);

-- Attendance records table
CREATE TABLE attendance_records (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(id),
    subject_code VARCHAR(20) REFERENCES subjects(code),
    check_in_time TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL, -- Present, Late, Absent
    location_lat DECIMAL(10,8),
    location_lng DECIMAL(11,8),
    face_confidence DECIMAL(3,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_attendance_user_date ON attendance_records(user_id, DATE(check_in_time));
CREATE INDEX idx_attendance_subject_date ON attendance_records(subject_code, DATE(check_in_time));
CREATE INDEX idx_face_descriptors_user ON face_descriptors(user_id);
```

---

## 🔄 5. Client-Side Updates

### Updated React Components

```javascript
// services/AttendanceService.js
class AttendanceService {
  static async registerFace(userId, imageBlob) {
    const formData = new FormData();
    formData.append('image', imageBlob);
    formData.append('userId', userId);
    
    const response = await fetch('/api/face/register', {
      method: 'POST',
      body: formData
    });
    
    return response.json();
  }
  
  static async performCheckIn(userId, subjectCode, imageBlob, coordinates) {
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('subject_code', subjectCode);
    formData.append('face_image', imageBlob);
    formData.append('coordinates', JSON.stringify(coordinates));
    
    const response = await fetch('/api/attendance/checkin', {
      method: 'POST',
      body: formData
    });
    
    return response.json();
  }
  
  static async getAttendanceHistory(userId) {
    const response = await fetch(`/api/attendance/history/${userId}`);
    return response.json();
  }
}

// Updated HomeScreen component
const handleFaceRecognitionSuccess = async () => {
  try {
    // Capture image from camera
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const video = videoRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);
    
    // Convert to blob
    const imageBlob = await new Promise(resolve => 
      canvas.toBlob(resolve, 'image/jpeg', 0.8)
    );
    
    // Get GPS coordinates
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
    
    const coordinates = {
      lat: position.coords.latitude,
      lng: position.coords.longitude
    };
    
    // Send to server
    const result = await AttendanceService.performCheckIn(
      user.id,
      currentSubject.code,
      imageBlob,
      coordinates
    );
    
    if (result.success) {
      // Update attendance history
      setAttendanceHistory(prev => [result.record, ...prev]);
      alert(result.message);
    } else {
      alert(`❌ ${result.error}`);
    }
    
  } catch (error) {
    console.error('Check-in error:', error);
    alert('❌ Check-in failed. Please try again.');
  }
};
```

---

## 🐳 6. Docker Deployment

### Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Database
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: smartpresence
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: password123
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./database/init.sql:/docker-entrypoint-initdb.d/init.sql
    ports:
      - "5432:5432"
  
  # Redis for caching
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
  
  # Face Recognition Service
  face-service:
    build: ./services/face-recognition
    ports:
      - "8001:8000"
    environment:
      - DATABASE_URL=postgresql://admin:password123@postgres:5432/smartpresence
      - REDIS_URL=redis://redis:6379
    volumes:
      - ./models:/app/models
    depends_on:
      - postgres
      - redis
  
  # GPS Verification Service
  gps-service:
    build: ./services/gps-verification
    ports:
      - "8002:8000"
    environment:
      - DATABASE_URL=postgresql://admin:password123@postgres:5432/smartpresence
    depends_on:
      - postgres
  
  # Main Attendance Service
  attendance-service:
    build: ./services/attendance
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://admin:password123@postgres:5432/smartpresence
      - FACE_SERVICE_URL=http://face-service:8000
      - GPS_SERVICE_URL=http://gps-service:8000
    depends_on:
      - postgres
      - face-service
      - gps-service
  
  # Frontend (React app)
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - REACT_APP_API_URL=http://localhost:8000
    depends_on:
      - attendance-service
  
  # Nginx Load Balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - attendance-service

volumes:
  postgres_data:
```

### Individual Dockerfiles

```dockerfile
# services/face-recognition/Dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    cmake \
    libopenblas-dev \
    liblapack-dev \
    libx11-dev \
    libgtk-3-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Download face recognition models
RUN python download_models.py

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```dockerfile
# frontend/Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Use nginx to serve static files
FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 3000

CMD ["nginx", "-g", "daemon off;"]
```

---

## 🔒 7. Security Implementation

### API Security

```python
# security.py
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from datetime import datetime, timedelta

security = HTTPBearer()

def create_access_token(user_id: str):
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, "SECRET_KEY", algorithm="HS256")

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, "SECRET_KEY", algorithms=["HS256"])
        return payload["user_id"]
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid token")

# Rate limiting
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)

@app.post("/face/verify")
@limiter.limit("10/minute")
async def verify_face(request: Request, user_id: str = Depends(verify_token)):
    # Implementation with rate limiting and authentication
    pass
```

### Data Encryption

```python
# encryption.py
from cryptography.fernet import Fernet
import base64
import numpy as np

class FaceDataEncryption:
    def __init__(self, key: bytes = None):
        if key is None:
            key = Fernet.generate_key()
        self.cipher = Fernet(key)
    
    def encrypt_descriptor(self, descriptor: np.ndarray) -> str:
        """Encrypt face descriptor array"""
        descriptor_bytes = descriptor.tobytes()
        encrypted_bytes = self.cipher.encrypt(descriptor_bytes)
        return base64.b64encode(encrypted_bytes).decode()
    
    def decrypt_descriptor(self, encrypted_descriptor: str) -> np.ndarray:
        """Decrypt face descriptor array"""
        encrypted_bytes = base64.b64decode(encrypted_descriptor.encode())
        descriptor_bytes = self.cipher.decrypt(encrypted_bytes)
        return np.frombuffer(descriptor_bytes, dtype=np.float64)
```

---

## 📊 8. Monitoring & Analytics

### Prometheus Metrics

```python
# metrics.py
from prometheus_client import Counter, Histogram, Gauge
import time

# Metrics
face_recognition_requests = Counter('face_recognition_requests_total', 'Total face recognition requests')
face_recognition_success = Counter('face_recognition_success_total', 'Successful face recognitions')
face_recognition_duration = Histogram('face_recognition_duration_seconds', 'Face recognition duration')
gps_verification_requests = Counter('gps_verification_requests_total', 'Total GPS verification requests')
active_check_ins = Gauge('active_check_ins', 'Number of active check-ins')

@app.middleware("http")
async def metrics_middleware(request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    # Record metrics
    duration = time.time() - start_time
    if "/face/" in request.url.path:
        face_recognition_requests.inc()
        face_recognition_duration.observe(duration)
        if response.status_code == 200:
            face_recognition_success.inc()
    
    return response
```

### Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "title": "SmartPresence Analytics",
    "panels": [
      {
        "title": "Check-in Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(face_recognition_success_total[5m]) / rate(face_recognition_requests_total[5m]) * 100"
          }
        ]
      },
      {
        "title": "Response Time",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, face_recognition_duration_seconds_bucket)"
          }
        ]
      },
      {
        "title": "Daily Attendance",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(increase(attendance_records_total[1d])) by (status)"
          }
        ]
      }
    ]
  }
}
```

---

## 🚀 9. Production Deployment

### Kubernetes Configuration

```yaml
# kubernetes/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: smartpresence-face-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: face-service
  template:
    metadata:
      labels:
        app: face-service
    spec:
      containers:
      - name: face-service
        image: smartpresence/face-service:latest
        ports:
        - containerPort: 8000
        resources:
          requests:
            memory: "1Gi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "1000m"
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: database-secret
              key: url
---
apiVersion: v1
kind: Service
metadata:
  name: face-service
spec:
  selector:
    app: face-service
  ports:
  - port: 80
    targetPort: 8000
  type: ClusterIP
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Build Docker images
      run: |
        docker build -t smartpresence/face-service:${{ github.sha }} ./services/face-recognition
        docker build -t smartpresence/gps-service:${{ github.sha }} ./services/gps-verification
        docker build -t smartpresence/attendance-service:${{ github.sha }} ./services/attendance
        docker build -t smartpresence/frontend:${{ github.sha }} ./frontend
    
    - name: Push to registry
      run: |
        echo ${{ secrets.DOCKER_PASSWORD }} | docker login -u ${{ secrets.DOCKER_USERNAME }} --password-stdin
        docker push smartpresence/face-service:${{ github.sha }}
        docker push smartpresence/gps-service:${{ github.sha }}
        docker push smartpresence/attendance-service:${{ github.sha }}
        docker push smartpresence/frontend:${{ github.sha }}
    
    - name: Deploy to Kubernetes
      run: |
        kubectl set image deployment/face-service face-service=smartpresence/face-service:${{ github.sha }}
        kubectl set image deployment/gps-service gps-service=smartpresence/gps-service:${{ github.sha }}
        kubectl set image deployment/attendance-service attendance-service=smartpresence/attendance-service:${{ github.sha }}
        kubectl set image deployment/frontend frontend=smartpresence/frontend:${{ github.sha }}
```

---

## 📋 10. Migration Plan

### Phase 1: Infrastructure Setup
1. ✅ Setup PostgreSQL database
2. ✅ Deploy face recognition service
3. ✅ Deploy GPS verification service
4. ✅ Setup monitoring (Prometheus + Grafana)

### Phase 2: API Development
1. ✅ Implement face registration API
2. ✅ Implement face verification API
3. ✅ Implement GPS verification API
4. ✅ Implement unified attendance API

### Phase 3: Client Integration
1. ✅ Update React components
2. ✅ Implement image capture & upload
3. ✅ Update attendance flow
4. ✅ Testing & validation

### Phase 4: Production Deployment
1. ✅ Docker containerization
2. ✅ Kubernetes orchestration
3. ✅ Load balancing & scaling
4. ✅ Security hardening

---

## 📈 Performance Optimization

### Image Processing Optimization

```javascript
// client-side image optimization
function optimizeImageForUpload(imageBlob, maxWidth = 640, quality = 0.8) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Calculate optimal dimensions
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      canvas.width = img.width * ratio;
      canvas.height = img.height * ratio;
      
      // Draw and compress
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(resolve, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(imageBlob);
  });
}
```

### Caching Strategy

```python
# server-side caching
import redis
import pickle

redis_client = redis.Redis(host='redis', port=6379, db=0)

async def get_cached_face_descriptor(user_id: str):
    cached = redis_client.get(f"face_descriptor:{user_id}")
    if cached:
        return pickle.loads(cached)
    
    # Load from database
    descriptor = await get_face_encoding(user_id)
    if descriptor:
        # Cache for 24 hours
        redis_client.setex(f"face_descriptor:{user_id}", 86400, pickle.dumps(descriptor))
    
    return descriptor
```

---

## 🎯 Kết luận

### ✅ Khả năng triển khai
**HOÀN TOÀN KHẢ THI** - Việc chuyển từ client-side sang server-side processing cho SmartPresence là khả thi và mang lại nhiều lợi ích.

### 🚀 Lộ trình triển khai
1. **Phase 1**: Setup infrastructure (Database, Docker, Monitoring)
2. **Phase 2**: Develop & test APIs (Face, GPS, Attendance)
3. **Phase 3**: Update client-side integration
4. **Phase 4**: Production deployment & optimization

### 💡 Khuyến nghị
- **Start small**: Triển khai từng service một cách độc lập
- **Test thoroughly**: Đảm bảo accuracy của face recognition
- **Monitor closely**: Theo dõi performance và error rates
- **Scale gradually**: Tăng resources theo demand thực tế

### 📞 Next Steps
1. Chọn technology stack (Python/FastAPI recommended)
2. Setup development environment
3. Implement MVP của face recognition service
4. Test integration với existing React app
5. Plan production deployment strategy

---

**📝 Document này cung cấp roadmap đầy đủ để triển khai SmartPresence lên server architecture với khả năng scale và bảo mật cao.**
