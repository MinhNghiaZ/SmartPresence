export interface Location {
    latitude: number;
    longitude: number;
}

export interface AllowedArea {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number; // bán kính tính bằng mét
}

export class GPSService {
    // Danh sách các khu vực cho phép
    private static allowedAreas: AllowedArea[] = [
        {
            id: 'eiu_campus',
            name: 'Eastern International University',
            latitude: 11.052845,
            longitude: 106.665911,
            radius: 500
        },
        {
            id: 'phuoc_hung_airport',
            name: 'Phòng vé máy bay Phước Hưng',
            latitude: 11.04558230, // Tọa độ thực tế từ GPS điện thoại
            longitude: 106.73588590, // Độ chính xác: 12.9 mét
            radius: 300 // Bán kính nhỏ hơn vì có tọa độ chính xác
        }
    ];

    // Tính khoảng cách giữa 2 điểm GPS (công thức Haversine)
    private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371e3; // Bán kính Trái Đất (mét)
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        return R * c; // Khoảng cách tính bằng mét
    }

    // Lấy vị trí hiện tại
    static getCurrentLocation(options?: PositionOptions): Promise<Location> {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Trình duyệt không hỗ trợ GPS'));
                return;
            }

            // Default options with mobile considerations
            const defaultOptions: PositionOptions = {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            };

            // Use provided options or defaults
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

    // Kiểm tra vị trí có trong khu vực cho phép không
    static isLocationAllowed(userLocation: Location): { allowed: boolean; distance: number; nearestArea?: AllowedArea } {
        let minDistance = Infinity;
        let nearestArea: AllowedArea | undefined;
        
        // Kiểm tra tất cả các khu vực cho phép
        for (const area of this.allowedAreas) {
            const distance = this.calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                area.latitude,
                area.longitude
            );
            
            // Nếu trong phạm vi cho phép của khu vực này
            if (distance <= area.radius) {
                return {
                    allowed: true,
                    distance: Math.round(distance),
                    nearestArea: area
                };
            }
            
            // Cập nhật khu vực gần nhất
            if (distance < minDistance) {
                minDistance = distance;
                nearestArea = area;
            }
        }

        return {
            allowed: false,
            distance: Math.round(minDistance),
            nearestArea
        };
    }

    // Lấy thông tin tất cả khu vực cho phép
    static getAllowedAreas(): AllowedArea[] {
        return [...this.allowedAreas];
    }

    // Phương thức cũ để tương thích ngược
    static getAllowedArea(): AllowedArea {
        // Trả về khu vực đầu tiên để tương thích với code cũ
        return this.allowedAreas[0] || {
            id: 'default',
            name: 'Default Area',
            latitude: 11.052845,
            longitude: 106.665911,
            radius: 500
        };
    }
}