import db from "../../database/connection";
import { Location, Room, AllowedArea, LocationValidationRequest, GPS_CONSTANTS, LocationValidationResponse } from "../../models/gps";

export class GPSService {
    private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = GPS_CONSTANTS.EARTH_RADIUS;

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

    private static async getCurrentRoom(subjectId: string): Promise<Room | null> {
        try {
            const now = new Date();
            const currentTime = now.toTimeString().slice(0, 8) // HH:MM:SS format
            const currentDay = now.toLocaleDateString('en-US', { weekday: 'short' }); //Mon, Tue, ...

            const query = `
                SELECT 
                    r.roomId, 
                    r.latitude, 
                    r.longitude, 
                    r.radius,
                    ts.start_time,
                    ts.end_time,
                    ts.day_of_week
                FROM Room r
                INNER JOIN TimeSlot ts ON r.roomId = ts.roomId
                WHERE ts.subjectId = ? 
                  AND ts.day_of_week = ?
                  AND ts.start_time <= ?
                  AND ts.end_time >= ?
                ORDER BY ts.start_time ASC
                LIMIT 1
            `;
            const params = [subjectId, currentDay, currentTime, currentTime];
            const [rows] = await db.execute(query, params);

            if ((rows as any[]).length > 0) {
                const row = (rows as any)[0];
                const room: Room = {
                    roomId: row.roomId,
                    latitude: parseFloat(row.latitude),
                    longitude: parseFloat(row.longitude),
                    radius: parseInt(row.radius)
                };
                return room;
            }

            //DEVELOP ONLY: DELETE AFTER DEPLOY, Nếu không tìm thấy slot hiện tại-->SLOT MOCK
            console.log('⚠️ No current timeslot found, using MOCK slot...');
            const room: Room = {
                roomId: "201B8",
                latitude: 11.052845,
                longitude: 106.665911,
                radius: 500,
            }
            return room;

        } catch (error) {
            console.error('find room error: ', error);
            return null;
        }
    }

    private static convertRoomsToAllowedAreas(rooms: Room[]): AllowedArea[] {
        return rooms.map(room => ({
            id: room.roomId,
            name: `Phòng ${room.roomId}`,
            latitude: room.latitude,
            longitude: room.longitude,
            radius: room.radius
        }));
    }

    static async validateLocation(request: LocationValidationRequest): Promise<LocationValidationResponse> {
        try {
            const { latitude, longitude, subjectId } = request;
            if (!subjectId) {
                return {
                    allowed: false,
                    message: 'loss subjectId to find Room'
                };
            }

            const room = await this.getCurrentRoom(subjectId);
            if (!room) {
                return {
                    allowed: false,
                    message: 'not time yet'
                };
            }

            const distant = this.calculateDistance(latitude, longitude, room.latitude, room.longitude);
            if (distant <= room.radius) {
                return {
                    allowed: true,
                    message: 'Approve!',
                    roomId: room.roomId,
                    roomName: `Room ${room.roomId}`
                };
            } else {
                return {
                    allowed: false,
                    message: `validation false, move to Room ${room.roomId}`,
                };
            }
        } catch (error) {
            console.error('GPS validation error: ', error);
            return {
                allowed: false,
                message: 'validation system error'
            }
        }
    }


}