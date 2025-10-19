import type { 
    Location, 
    LocationSample, 
    LocationValidationResult, 
    AllowedArea, 
    GPSProgressCallback 
} from '../../models';

export class GPSService {
    private static readonly API_BASE = '/api';
    
    // Cấu hình lấy mẫu GPS
    private static readonly GPS_CONFIG = {
        SAMPLES_COUNT: 5,           // Lấy 5 mẫu chính thức
        SAMPLE_DELAY: 1000,         // Đợi 1s giữa các mẫu
        MIN_ACCURACY: 50,           // Độ chính xác tối thiểu (meters)
        MAX_ACCURACY_FOR_RETRY: 100, // Nếu > 100m thì retry
        OUTLIER_THRESHOLD: 0.001,   // Ngưỡng lọc outlier (~111m)
        
        // ✨ NEW: Warm-up configuration
        ENABLE_WARMUP: true,        // Bật/tắt warm-up phase
        WARMUP_DURATION: 3000,      // Warm-up 3 giây với watchPosition
        WARMUP_MIN_SAMPLES: 3,      // Tối thiểu 3 samples trong warm-up
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
     * 🔥 Force clear browser GPS cache bằng cách dùng watchPosition rồi clear ngay
     * Trick này buộc browser phải refresh GPS thay vì dùng cache
     */
    private static forceClearGPSCache(): Promise<void> {
        return new Promise((resolve) => {
            if (!navigator.geolocation) {
                resolve();
                return;
            }

            let watchId: number | null = null;
            const timeout = setTimeout(() => {
                if (watchId !== null) {
                    navigator.geolocation.clearWatch(watchId);
                }
                resolve();
            }, 100); // Clear sau 100ms

            try {
                watchId = navigator.geolocation.watchPosition(
                    () => {
                        if (watchId !== null) {
                            navigator.geolocation.clearWatch(watchId);
                        }
                        clearTimeout(timeout);
                        resolve();
                    },
                    () => {
                        if (watchId !== null) {
                            navigator.geolocation.clearWatch(watchId);
                        }
                        clearTimeout(timeout);
                        resolve();
                    },
                    { enableHighAccuracy: true, maximumAge: 0, timeout: 100 }
                );
            } catch (error) {
                clearTimeout(timeout);
                resolve();
            }
        });
    }

    /**
     * Lấy một mẫu GPS đơn lẻ
     * ✅ ENHANCED: Force clear cache trước khi lấy để đảm bảo GPS mới
     */
    private static async getSingleSample(options?: PositionOptions): Promise<LocationSample> {
        // 🔥 STEP 1: Force clear browser GPS cache
        await this.forceClearGPSCache();

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
            
            // 🔥 STEP 2: Đảm bảo maximumAge = 0
            const finalOptions = {
                ...gpsOptions,
                maximumAge: 0 // Force override
            };

            console.log('🔥 Getting fresh GPS position (cache cleared)...');

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    console.log(`✅ Got fresh GPS: timestamp=${position.timestamp}, age=${Date.now() - position.timestamp}ms`);
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
                finalOptions
            );
        });
    }

    /**
     * ✨ NEW: Warm-up GPS với watchPosition
     * Giúp GPS "khởi động" và ổn định trước khi lấy mẫu chính thức
     * 🔥 ENHANCED: Force clear cache trước warm-up
     * @param duration Thời gian warm-up (ms)
     * @param onProgress Callback để báo tiến độ
     * @returns Promise<LocationSample[]> - Mảng samples thu thập được trong warm-up
     */
    private static async warmupGPS(
        duration: number,
        onProgress?: (progress: { message: string; samplesCollected: number; avgAccuracy?: number }) => void
    ): Promise<LocationSample[]> {
        // 🔥 Force clear browser GPS cache trước khi warm-up
        await this.forceClearGPSCache();
        
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Trình duyệt không hỗ trợ GPS'));
                return;
            }

            const samples: LocationSample[] = [];
            const startTime = Date.now();
            let watchId: number | null = null;
            let timeoutId: ReturnType<typeof setTimeout> | null = null;

            console.log(`🔥 Starting GPS warm-up for ${duration}ms (cache cleared)...`);

            // Cấu hình watchPosition với high accuracy và NO CACHE
            const watchOptions: PositionOptions = {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0 // 🔥 Force no cache
            };

            // Watch GPS position
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const age = Date.now() - position.timestamp;
                    const sample: LocationSample = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy,
                        timestamp: position.timestamp
                    };

                    samples.push(sample);
                    
                    const elapsed = Date.now() - startTime;
                    const avgAccuracy = samples.reduce((sum, s) => sum + (s.accuracy || 0), 0) / samples.length;
                    
                    console.log(`🔥 Warm-up sample ${samples.length}: acc=${sample.accuracy?.toFixed(1)}m, age=${age}ms, elapsed=${elapsed}ms`);
                    
                    onProgress?.({
                        message: `Đang khởi động GPS... (${samples.length} mẫu, ${(elapsed/1000).toFixed(1)}s)`,
                        samplesCollected: samples.length,
                        avgAccuracy
                    });
                },
                (error) => {
                    console.warn('⚠️ Warm-up GPS error:', error.message);
                    // Không reject, tiếp tục với samples đã có
                },
                watchOptions
            );

            // Timeout để kết thúc warm-up
            timeoutId = setTimeout(() => {
                if (watchId !== null) {
                    navigator.geolocation.clearWatch(watchId);
                }
                
                console.log(`✅ GPS warm-up completed: ${samples.length} samples collected`);
                
                if (samples.length === 0) {
                    reject(new Error('Không thu thập được mẫu nào trong warm-up'));
                } else {
                    resolve(samples);
                }
            }, duration);

            // Cleanup nếu có lỗi
            const cleanup = () => {
                if (watchId !== null) {
                    navigator.geolocation.clearWatch(watchId);
                }
                if (timeoutId !== null) {
                    clearTimeout(timeoutId);
                }
            };

            // Handle reject với cleanup
            const originalReject = reject;
            reject = (error) => {
                cleanup();
                originalReject(error);
            };
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
     * ✨ NEW: Có thể bật warm-up để cải thiện độ chính xác
     * @param onProgress - Callback để báo tiến độ
     * @param options - GPS options
     * @returns Promise<Location>
     */
    static async getAccurateLocation(
        onProgress?: GPSProgressCallback,
        options?: PositionOptions
    ): Promise<Location> {
        const samples: LocationSample[] = [];
        const { 
            SAMPLES_COUNT, 
            SAMPLE_DELAY, 
            MAX_ACCURACY_FOR_RETRY,
            ENABLE_WARMUP,
            WARMUP_DURATION,
            WARMUP_MIN_SAMPLES
        } = this.GPS_CONFIG;

        console.log(`🎯 Starting accurate GPS sampling (warm-up: ${ENABLE_WARMUP}, samples: ${SAMPLES_COUNT})...`);

        // ✨ Phase 1: GPS Warm-up (nếu bật)
        let warmupSamples: LocationSample[] = [];
        if (ENABLE_WARMUP) {
            try {
                onProgress?.({
                    sample: 0,
                    total: SAMPLES_COUNT,
                    message: '🔥 Đang khởi động GPS...'
                });

                warmupSamples = await this.warmupGPS(WARMUP_DURATION, (warmupProgress) => {
                    onProgress?.({
                        sample: 0,
                        total: SAMPLES_COUNT,
                        accuracy: warmupProgress.avgAccuracy,
                        message: warmupProgress.message
                    });
                });

                console.log(`🔥 Warm-up collected ${warmupSamples.length} samples (avg acc: ${
                    warmupSamples.length > 0 
                        ? (warmupSamples.reduce((sum, s) => sum + (s.accuracy || 0), 0) / warmupSamples.length).toFixed(1) 
                        : 'N/A'
                }m)`);

                // Nếu warm-up thu thập đủ samples chất lượng cao, có thể sử dụng luôn
                if (warmupSamples.length >= WARMUP_MIN_SAMPLES) {
                    const warmupAvgAccuracy = warmupSamples.reduce((sum, s) => sum + (s.accuracy || 0), 0) / warmupSamples.length;
                    console.log(`✅ Warm-up quality check: ${warmupSamples.length} samples, avg ${warmupAvgAccuracy.toFixed(1)}m`);
                }
            } catch (warmupError) {
                console.warn('⚠️ GPS warm-up failed, proceeding with normal sampling:', warmupError);
                // Không throw error, tiếp tục với sampling bình thường
            }
        }

        // ✨ Phase 2: Accurate Sampling (lấy mẫu chính thức)
        onProgress?.({
            sample: 0,
            total: SAMPLES_COUNT,
            message: '📍 Bắt đầu lấy mẫu chính xác...'
        });

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

        // ✨ Combine warm-up samples với main samples (nếu có)
        const allSamples = [...warmupSamples, ...samples];
        
        if (allSamples.length === 0) {
            throw new Error('Không thể lấy được bất kỳ mẫu GPS nào');
        }

        console.log(`📊 Total samples collected: ${allSamples.length} (${warmupSamples.length} from warm-up + ${samples.length} from main)`);

        // Tính trung bình từ TẤT CẢ samples (warm-up + main)
        const avgLocation = this.calculateAverageLocation(allSamples);
        
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