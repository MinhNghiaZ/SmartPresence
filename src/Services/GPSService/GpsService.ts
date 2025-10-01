export interface Location {
    latitude: number;
    longitude: number;
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

export interface LocationValidationResult {
    allowed: boolean;
    message: string;
    roomId?: string;
    roomName?: string;
}

export class GPSService {
    private static readonly API_BASE = 'http://localhost:3001/api';

    // Removed calculateDistance - backend handles all calculations now

    // Lấy vị trí hiện tại (giữ nguyên)
    static getCurrentLocation(options?: PositionOptions): Promise<Location> {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Trình duyệt không hỗ trợ GPS'));
                return;
            }

            const defaultOptions: PositionOptions = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            };

            const gpsOptions = options || defaultOptions;

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
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