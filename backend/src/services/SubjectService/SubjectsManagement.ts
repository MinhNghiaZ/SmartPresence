// backend/src/services/SubjectService/SubjectsManagement.ts

import db from "../../database/connection"
import { 
    Subject, 
    SubjectWithSchedule, 
    TimeSlot, 
    Room, 
    Enrollment
} from '../../models/subject';

export class SubjectService {
    
    /**
     * Get all subjects for dropdown
     */
    static async getAllSubjects(): Promise<Subject[]> {
        try {
            console.log('🔍 SubjectService.getAllSubjects called');
            
            const [rows] = await db.execute(`
                SELECT subjectId, name, code, credit
                FROM Subject 
                ORDER BY code
            `);
            
            console.log(`✅ Found ${(rows as any[]).length} subjects`);
            return rows as Subject[];
            
        } catch (error) {
            console.error('❌ Error getting all subjects:', error);
            throw new Error('Failed to fetch subjects');
        }
    }
    
    /**
     * Get subjects enrolled by student - SIMPLIFIED & FIXED
     */
    static async getStudentSubjects(studentId: string): Promise<SubjectWithSchedule[]> {
        try {
            console.log(`🔍 SubjectService.getStudentSubjects called for: ${studentId}`);
            
            // ✅ Start with simple query that works
            const [rows] = await db.execute(`
                SELECT 
                    s.subjectId,
                    s.name as subjectName,
                    s.code as subjectCode,
                    s.credit,
                    ts.timeSlotId,
                    ts.day_of_week,
                    ts.start_time,
                    ts.end_time,
                    ts.roomId,
                    r.latitude,
                    r.longitude,
                    r.radius
                FROM Subject s
                INNER JOIN Enrollment e ON s.subjectId = e.subjectId
                INNER JOIN TimeSlot ts ON s.subjectId = ts.subjectId
                LEFT JOIN Room r ON ts.roomId = r.roomId
                WHERE e.studentId = ?
                ORDER BY s.code, ts.day_of_week, ts.start_time
            `, [studentId]);
            
            console.log(`✅ Found ${(rows as any[]).length} enrolled time slots for student ${studentId}`);
            
            // ✅ Format data for frontend - match interface exactly
            const formattedSubjects = (rows as any[]).map((row: any) => ({
                subjectId: row.subjectId,
                subjectName: row.subjectName,
                subjectCode: row.subjectCode,
                credit: row.credit,
                timeSlotId: row.timeSlotId,
                day_of_week: row.day_of_week,
                start_time: row.start_time,
                end_time: row.end_time,
                roomId: row.roomId,
                latitude: row.latitude ? parseFloat(row.latitude.toString()) : undefined,
                longitude: row.longitude ? parseFloat(row.longitude.toString()) : undefined,
                radius: row.radius ? parseInt(row.radius.toString()) : undefined
            }));
            
            return formattedSubjects;
            
        } catch (error) {
            console.error('❌ Error getting student subjects:', error);
            console.error('❌ Error details:', error instanceof Error ? error.message : error);
            throw new Error('Failed to fetch student subjects');
        }
    }
    
    /**
     * Get current active timeslot for subject
     */
    static async getCurrentTimeSlot(subjectId: string): Promise<(TimeSlot & { roomInfo?: Room }) | null> {
        try {
            console.log(`🔍 SubjectService.getCurrentTimeSlot called for: ${subjectId}`);
            
            const now = new Date();
            const currentDay = this.getDayName(now.getDay());
            const currentTime = now.toTimeString().slice(0, 8); // HH:MM:SS
            
            console.log(`🕐 Checking for day: ${currentDay}, time: ${currentTime}`);
            
            const [rows] = await db.execute(`
                SELECT 
                    ts.timeSlotId,
                    ts.subjectId,
                    ts.roomId,
                    ts.day_of_week,
                    ts.start_time,
                    ts.end_time,
                    r.latitude,
                    r.longitude,
                    r.radius
                FROM TimeSlot ts
                LEFT JOIN Room r ON ts.roomId = r.roomId
                WHERE ts.subjectId = ? 
                AND ts.day_of_week = ?
                AND ? BETWEEN ts.start_time AND ts.end_time
            `, [subjectId, currentDay, currentTime]);
            
            if ((rows as any[]).length === 0) {
                console.log(`⚠️ No active timeslot found for subject ${subjectId}`);
                return null;
            }
            
            const row = (rows as any[])[0];
            console.log(`✅ Found active timeslot for subject ${subjectId}`);
            
            return {
                timeSlotId: row.timeSlotId,
                subjectId: row.subjectId,
                roomId: row.roomId,
                day_of_week: row.day_of_week,
                start_time: row.start_time,
                end_time: row.end_time,
                roomInfo: row.roomId ? {
                    roomId: row.roomId,
                    latitude: parseFloat(row.latitude),
                    longitude: parseFloat(row.longitude),
                    radius: parseInt(row.radius)
                } : undefined
            };
            
        } catch (error) {
            console.error('❌ Error getting current timeslot:', error);
            return null;
        }
    }
    
    /**
     * Helper: Convert day number to database enum
     */
    private static getDayName(dayNumber: number): string {
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        return days[dayNumber];
    }
    
    /**
     * Check if student is enrolled in subject
     */
    static async isStudentEnrolled(studentId: string, subjectId: string): Promise<boolean> {
        try {
            const [rows] = await db.execute(`
                SELECT enrollmentId 
                FROM Enrollment 
                WHERE studentId = ? AND subjectId = ?
            `, [studentId, subjectId]);
            
            return (rows as any[]).length > 0;
        } catch (error) {
            console.error('❌ Error checking enrollment:', error);
            return false;
        }
    }
    
    /**
     * Get room info by roomId (for GPS validation)
     */
    static async getRoomInfo(roomId: string): Promise<Room | null> {
        try {
            const [rows] = await db.execute(`
                SELECT roomId, latitude, longitude, radius
                FROM Room
                WHERE roomId = ?
            `, [roomId]);
            
            if ((rows as any[]).length === 0) {
                return null;
            }
            
            const row = (rows as any[])[0];
            return {
                roomId: row.roomId,
                latitude: parseFloat(row.latitude),
                longitude: parseFloat(row.longitude),
                radius: parseInt(row.radius)
            };
        } catch (error) {
            console.error('❌ Error getting room info:', error);
            return null;
        }
    }

    /**
     * Get all students enrolled in a subject
     * For AdminScreen to display complete attendance list
     */
    static async getEnrolledStudents(subjectId: string): Promise<{ studentId: string; studentName: string; email: string; }[]> {
        try {
            console.log(`🔍 SubjectService.getEnrolledStudents called for: ${subjectId}`);
            
            const [rows] = await db.execute(`
                SELECT 
                    sa.studentId as studentId,
                    sa.name as studentName,
                    sa.email
                FROM Enrollment e
                INNER JOIN StudentAccount sa ON e.studentId = sa.studentId
                WHERE e.subjectId = ?
                ORDER BY sa.studentId
            `, [subjectId]);
            
            console.log(`✅ Found ${(rows as any[]).length} enrolled students for subject ${subjectId}`);
            return rows as { studentId: string; studentName: string; email: string; }[];
            
        } catch (error) {
            console.error('❌ Error getting enrolled students:', error);
            throw new Error('Failed to fetch enrolled students');
        }
    }
}