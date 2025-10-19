// GPS and Location Models

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
