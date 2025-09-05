export interface Location {
    latitude: number;
    longitude: number;
}

export interface AllowedArea {
    latitude: number;
    longitude: number;
    radius: number; // bán kính tính bằng mét
}

export class GPSService {
    // Tọa độ khu vực cho phép (ví dụ: khuôn viên trường đại học)
    private static allowedArea: AllowedArea = {
        latitude: 11.052845, // Thay đổi theo tọa độ thực tế
        longitude: 106.665911, // Thay đổi theo tọa độ thực tế
        radius: 500 // Bán kính cho phép (mét)
    };

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
    static getCurrentLocation(): Promise<Location> {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Trình duyệt không hỗ trợ GPS'));
                return;
            }

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
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }

    // Kiểm tra vị trí có trong khu vực cho phép không
    static isLocationAllowed(userLocation: Location): { allowed: boolean; distance: number } {
        const distance = this.calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            this.allowedArea.latitude,
            this.allowedArea.longitude
        );

        return {
            allowed: distance <= this.allowedArea.radius,
            distance: Math.round(distance)
        };
    }

    // Cập nhật khu vực cho phép
    static setAllowedArea(area: AllowedArea): void {
        this.allowedArea = area;
    }

    // Lấy thông tin khu vực cho phép
    static getAllowedArea(): AllowedArea {
        return { ...this.allowedArea };
    }
}