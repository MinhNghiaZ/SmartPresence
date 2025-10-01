export interface Location {
    latitude: number;
    longitude: number;
}

export interface Room {
    roomId: string,
    latitude: number;
    longitude: number;
    radius: number;
}

export interface AllowedArea {
    id: string;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
}

export interface LocationValidationRequest {
    latitude: number;
    longitude: number;
    subjectId?: string;
}

export interface LocationValidationResponse{
    allowed: boolean;
    message: string;
    roomId?: string;
    roomName?: string;
}

export const GPS_CONSTANTS = {
    EARTH_RADIUS: 6371e3,
} as const;