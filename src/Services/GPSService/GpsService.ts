export interface Location {
    latitude: number;
    longitude: number;
    accuracy?: number; // Độ chính xác (meters)
}

export interface LocationSample extends Location {
    timestamp: number;
}

export interface LocationValidationResult {
    allowed: boolean;
    message: string;
    roomId?: string;
    roomName?: string;
}

export interface AllowedArea {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
}

export interface GPSProgressCallback {
    (progress: {
        sample: number;
        total: number;
        accuracy?: number;
        message: string;
    }): void;
}

export class GPSService {
    private static readonly API_BASE = '/api';
    
    // Cấu hình lấy mẫu GPS
    private static readonly GPS_CONFIG = {
        SAMPLES_COUNT: 5,           // Lấy 5 mẫu
        SAMPLE_DELAY: 1000,         // Đợi 1s giữa các mẫu
        MIN_ACCURACY: 50,           // Độ chính xác tối thiểu (meters)
        MAX_ACCURACY_FOR_RETRY: 100, // Nếu > 100m thì retry
        OUTLIER_THRESHOLD: 0.001    // Ngưỡng lọc outlier (~111m)
    };

    // Removed calculateDistance - backend handles all calculations now

    /**
     * Tính khoảng cách giữa 2 điểm GPS (Haversine formula)
     * Chỉ dùng để lọc outliers
     */
    private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3; // Earth radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lon2 - lon1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c;
    }

    /**
     * Lấy một mẫu GPS đơn lẻ
     */
    private static getSingleSample(options?: PositionOptions): Promise<LocationSample> {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Trình duyệt không hỗ trợ GPS'));
                return;
            }

            const defaultOptions: PositionOptions = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0 // Không dùng cache
            };

            const gpsOptions = options || defaultOptions;

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    });
                },
                (error) => {
                    let errorMessage = '';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Người dùng từ chối chia sẻ vị trí';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Không thể xác định vị trí';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Timeout khi lấy vị trí';
                            break;
                        default:
                            errorMessage = 'Có lỗi xảy ra khi lấy vị trí';
                            break;
                    }
                    reject(new Error(errorMessage));
                },
                gpsOptions
            );
        });
    }

    /**
     * Lọc bỏ outliers (các điểm GPS lệch quá xa)
     */
    private static filterOutliers(samples: LocationSample[]): LocationSample[] {
        if (samples.length <= 2) return samples;

        // Tính trung bình sơ bộ
        const avgLat = samples.reduce((sum, s) => sum + s.latitude, 0) / samples.length;
        const avgLon = samples.reduce((sum, s) => sum + s.longitude, 0) / samples.length;

        // Lọc các điểm quá xa trung bình
        const filtered = samples.filter(sample => {
            const distance = this.calculateDistance(
                sample.latitude, sample.longitude,
                avgLat, avgLon
            );
            // Cho phép sai số tối đa ~111m (0.001 độ)
            return distance < 111;
        });

        return filtered.length > 0 ? filtered : samples; // Fallback nếu lọc hết
    }

    /**
     * Tính vị trí trung bình từ nhiều mẫu
     */
    private static calculateAverageLocation(samples: LocationSample[]): Location {
        const filtered = this.filterOutliers(samples);
        
        const avgLat = filtered.reduce((sum, s) => sum + s.latitude, 0) / filtered.length;
        const avgLon = filtered.reduce((sum, s) => sum + s.longitude, 0) / filtered.length;
        const avgAccuracy = filtered.reduce((sum, s) => sum + (s.accuracy || 0), 0) / filtered.length;

        console.log(`📍 Averaged ${filtered.length}/${samples.length} samples (filtered ${samples.length - filtered.length} outliers)`);
        
        return {
            latitude: avgLat,
            longitude: avgLon,
            accuracy: avgAccuracy
        };
    }

    /**
     * Lấy vị trí với độ chính xác cao (nhiều mẫu)
     * @param onProgress - Callback để báo tiến độ
     * @param options - GPS options
     * @returns Promise<Location>
     */
    static async getAccurateLocation(
        onProgress?: GPSProgressCallback,
        options?: PositionOptions
    ): Promise<Location> {
        const samples: LocationSample[] = [];
        const { SAMPLES_COUNT, SAMPLE_DELAY, MAX_ACCURACY_FOR_RETRY } = this.GPS_CONFIG;

        console.log(`🎯 Starting accurate GPS sampling (${SAMPLES_COUNT} samples)...`);

        for (let i = 0; i < SAMPLES_COUNT; i++) {
            try {
                onProgress?.({
                    sample: i + 1,
                    total: SAMPLES_COUNT,
                    message: `Đang lấy mẫu GPS ${i + 1}/${SAMPLES_COUNT}...`
                });

                const sample = await this.getSingleSample(options);
                samples.push(sample);

                console.log(`📍 Sample ${i + 1}: lat=${sample.latitude.toFixed(6)}, lon=${sample.longitude.toFixed(6)}, acc=${sample.accuracy?.toFixed(1)}m`);

                onProgress?.({
                    sample: i + 1,
                    total: SAMPLES_COUNT,
                    accuracy: sample.accuracy,
                    message: `Đã lấy ${i + 1}/${SAMPLES_COUNT} mẫu (độ chính xác: ${sample.accuracy?.toFixed(1)}m)`
                });

                // Đợi trước khi lấy mẫu tiếp theo
                if (i < SAMPLES_COUNT - 1) {
                    await new Promise(resolve => setTimeout(resolve, SAMPLE_DELAY));
                }
            } catch (error) {
                console.warn(`⚠️ Failed to get sample ${i + 1}:`, error);
                // Tiếp tục nếu có ít nhất 1 mẫu thành công
                if (samples.length === 0) throw error;
            }
        }

        if (samples.length === 0) {
            throw new Error('Không thể lấy được bất kỳ mẫu GPS nào');
        }

        // Tính trung bình
        const avgLocation = this.calculateAverageLocation(samples);
        
        console.log(`✅ Final averaged location: lat=${avgLocation.latitude.toFixed(6)}, lon=${avgLocation.longitude.toFixed(6)}, avg_acc=${avgLocation.accuracy?.toFixed(1)}m`);

        // Cảnh báo nếu độ chính xác thấp
        if (avgLocation.accuracy && avgLocation.accuracy > MAX_ACCURACY_FOR_RETRY) {
            console.warn(`⚠️ Low accuracy (${avgLocation.accuracy.toFixed(1)}m). Consider retrying.`);
        }

        return avgLocation;
    }

    /**
     * [DEPRECATED] Lấy vị trí hiện tại (chỉ 1 lần)
     * Khuyến nghị dùng getAccurateLocation() thay thế
     */
    static getCurrentLocation(options?: PositionOptions): Promise<Location> {
        console.warn('⚠️ getCurrentLocation() is deprecated. Use getAccurateLocation() for better accuracy.');
        return this.getSingleSample(options);
    }

    /**
     * MAIN METHOD: Validate location với backend (dùng subjectId)
     * @param userLocation - GPS coordinates của user
     * @param subjectId - ID của môn học (từ database)
     * @returns Promise<LocationValidationResult>
     */
    static async validateLocation(userLocation: Location, subjectId: string): Promise<LocationValidationResult> {
        try {
            console.log('🔍 Validating location with backend...', { userLocation, subjectId });
            
            const response = await fetch(`${this.API_BASE}/gps/validate-location`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    subjectId: subjectId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (result.success) {
                console.log('✅ Backend validation result:', result.validation);
                return result.validation;
            }
            
            throw new Error(result.message || 'Backend validation failed');
            
        } catch (error) {
            console.error('❌ Backend validation failed:', error);
            
            return {
                allowed: false,
                message: 'Lỗi kết nối backend. Vui lòng thử lại!'
            };
        }
    }

    // Removed fallback client-side validation - backend only now

    // Backward compatibility methods
    static getAllowedAreas(): AllowedArea[] {
        console.warn('getAllowedAreas() deprecated - use backend API instead');
        return [];
    }

    static getAllowedArea(): AllowedArea {
        console.warn('getAllowedArea() deprecated - use backend API instead');
        return {
            id: 'default',
            name: 'Default Area',
            latitude: 11.052845,
            longitude: 106.665911,
            radius: 500
        };
    }
}