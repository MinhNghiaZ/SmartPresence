// backend/src/services/ClassSessionService/ClassSessionService.ts

import db from "../../database/connection";
import { ClassSession, SessionResponse, AbsentStudentsResponse } from "../../models/attendance";

export class ClassSessionService {
    
    /**
     * Auto-generate class sessions for a specific date (default today)
     */
    static async generateSessionsForDate(date?: string): Promise<void> {
        try {
            const targetDate = date || new Date().toISOString().split('T')[0];
            const dayOfWeek = new Date(targetDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' });
            
            console.log(`🔄 Generating class sessions for ${dayOfWeek} (${targetDate})`);
            
            // Get all timeslots for this day
            const [timeslots] = await db.execute(`
                SELECT ts.timeSlotId, ts.subjectId, ts.start_time, ts.end_time, ts.roomId
                FROM TimeSlot ts
                WHERE ts.day_of_week = ?
            `, [dayOfWeek]);
            
            let generatedCount = 0;
            
            for (const timeslot of (timeslots as any[])) {
                const sessionId = `SESSION_${targetDate}_${timeslot.timeSlotId}`;
                
                // Check if session already exists
                const [existing] = await db.execute(`
                    SELECT sessionId FROM ClassSession 
                    WHERE sessionId = ?
                `, [sessionId]);
                
                if ((existing as any[]).length === 0) {
                    // Create new session with started_at and ended_at as NULL initially
                    await db.execute(`
                        INSERT INTO ClassSession (
                            sessionId, 
                            subjectId,
                            timeSlotId, 
                            session_date, 
                            session_status,
                            started_at,
                            ended_at
                        ) VALUES (?, ?, ?, ?, 'SCHEDULED', NULL, NULL)
                    `, [
                        sessionId,
                        timeslot.subjectId,
                        timeslot.timeSlotId,
                        targetDate
                    ]);
                    
                    generatedCount++;
                    console.log(`✅ Created session: ${sessionId}`);
                }
            }
            
            console.log(`✅ Generated ${generatedCount} new sessions for ${targetDate}`);
            
        } catch (error) {
            console.error('❌ Error generating sessions:', error);
            throw error;
        }
    }
    
    /**
     * Get active session for a subject right now
     */
    static async getCurrentActiveSession(subjectId: string): Promise<SessionResponse> {
        try {
            console.log(`🔍 Getting current active session for subject: ${subjectId}`);
            
            // Auto-generate today's sessions
            await this.generateSessionsForDate();
            
            // Auto-complete expired sessions
            await this.completeExpiredSessions();
            
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().slice(0, 8); // HH:MM:SS
            
            const [sessions] = await db.execute(`
                SELECT 
                    cs.sessionId,
                    cs.subjectId,
                    cs.timeSlotId,
                    cs.session_date,
                    cs.session_status,
                    s.name as subjectName,
                    s.code as subjectCode,
                    ts.start_time,
                    ts.end_time,
                    ts.roomId,
                    r.latitude,
                    r.longitude,
                    r.radius
                FROM ClassSession cs
                INNER JOIN Subject s ON cs.subjectId = s.subjectId
                INNER JOIN TimeSlot ts ON cs.timeSlotId = ts.timeSlotId
                LEFT JOIN Room r ON ts.roomId = r.roomId
                WHERE cs.subjectId = ?
                  AND cs.session_date = ?
                  AND ? BETWEEN ts.start_time AND ts.end_time
                  AND cs.session_status IN ('SCHEDULED', 'ACTIVE')
            `, [subjectId, dateStr, timeStr]);
            
            if ((sessions as any[]).length === 0) {
                return {
                    success: false,
                    message: 'No active class session at this time'
                };
            }
            
            const session = (sessions as any[])[0];
            
            // Auto-update status to ACTIVE if it's time
            if (session.session_status === 'SCHEDULED') {
                await this.updateSessionStatus(session.sessionId, 'ACTIVE');
                session.session_status = 'ACTIVE';
            }
            
            return {
                success: true,
                sessionId: session.sessionId,
                session: session,
                message: 'Active session found'
            };
            
        } catch (error) {
            console.error('❌ Error getting active session:', error);
            return {
                success: false,
                message: 'Error retrieving active session'
            };
        }
    }
    
    /**
     * Update session status
     */
    static async updateSessionStatus(
        sessionId: string, 
        status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
    ): Promise<void> {
        try {
            let updateQuery = `UPDATE ClassSession SET session_status = ?`;
            const params: any[] = [status];
            
            if (status === 'ACTIVE') {
                updateQuery += `, started_at = ?`;
                params.push(new Date());
            } else if (status === 'COMPLETED') {
                updateQuery += `, ended_at = ?`;
                params.push(new Date());
            }
            
            updateQuery += ` WHERE sessionId = ?`;
            params.push(sessionId);
            
            console.log('📝 Updating session with query:', updateQuery);
            console.log('📊 Parameters:', params);
            
            await db.execute(updateQuery, params);
            
            console.log(`✅ Session ${sessionId} status updated to ${status}`);
            
        } catch (error) {
            console.error('❌ Error updating session status:', error);
            throw error;
        }
    }
    
    /**
     * Get absent students for a specific session
     */
    static async getAbsentStudentsForSession(sessionId: string): Promise<AbsentStudentsResponse> {
        try {
            console.log(`🔍 Getting absent students for session: ${sessionId}`);
            
            const [absentStudents] = await db.execute(`
                SELECT 
                    e.studentId,
                    sa.name as studentName,
                    sa.email as studentEmail,
                    cs.session_date
                FROM ClassSession cs
                INNER JOIN Enrollment e ON cs.subjectId = e.subjectId
                INNER JOIN StudentAccount sa ON e.studentId = sa.studentId
                LEFT JOIN Attendance a ON (cs.sessionId = a.sessionId AND e.studentId = a.studentId)
                WHERE cs.sessionId = ?
                  AND a.AttendanceId IS NULL
                ORDER BY sa.name
            `, [sessionId]);
            
            const sessionDate = (absentStudents as any[]).length > 0 
                ? (absentStudents as any[])[0].session_date 
                : new Date().toISOString().split('T')[0];
            
            return {
                success: true,
                sessionId,
                session_date: sessionDate,
                count: (absentStudents as any[]).length,
                absentStudents: (absentStudents as any[]).map(student => ({
                    studentId: student.studentId,
                    studentName: student.studentName,
                    studentEmail: student.studentEmail
                }))
            };
            
        } catch (error) {
            console.error('❌ Error getting absent students:', error);
            throw error;
        }
    }
    
    /**
     * Get daily attendance dashboard for admin
     */
    static async getDailyAttendanceDashboard(date: string) {
        try {
            console.log(`🔍 Getting daily attendance dashboard for: ${date}`);
            
            const [sessions] = await db.execute(`
                SELECT 
                    cs.sessionId,
                    cs.subjectId,
                    s.name as subjectName,
                    s.code as subjectCode,
                    cs.session_status,
                    TIME_FORMAT(ts.start_time, '%H:%i') as start_time,
                    TIME_FORMAT(ts.end_time, '%H:%i') as end_time,
                    ts.roomId,
                    COUNT(DISTINCT e.studentId) as totalEnrolled,
                    COUNT(DISTINCT a.studentId) as totalPresent
                FROM ClassSession cs
                INNER JOIN Subject s ON cs.subjectId = s.subjectId
                INNER JOIN TimeSlot ts ON cs.timeSlotId = ts.timeSlotId
                INNER JOIN Enrollment e ON s.subjectId = e.subjectId
                LEFT JOIN Attendance a ON (cs.sessionId = a.sessionId AND a.status IN ('PRESENT', 'LATE'))
                WHERE cs.session_date = ?
                GROUP BY cs.sessionId, cs.subjectId, s.name, s.code, cs.session_status, ts.start_time, ts.end_time, ts.roomId
                ORDER BY ts.start_time
            `, [date]);
            
            // Calculate absent count and attendance rate for each session
            const dashboardData = (sessions as any[]).map(session => {
                const totalAbsent = session.totalEnrolled - session.totalPresent;
                const attendanceRate = session.totalEnrolled > 0 
                    ? Math.round((session.totalPresent / session.totalEnrolled) * 100)
                    : 0;
                
                return {
                    ...session,
                    totalAbsent,
                    attendanceRate
                };
            });
            
            return {
                success: true,
                date,
                sessions: dashboardData
            };
            
        } catch (error) {
            console.error('❌ Error getting daily attendance dashboard:', error);
            throw error;
        }
    }

    /**
     * Generate ClassSession records for today
     */
    static async generateTodaySessions(): Promise<{
        success: boolean;
        message: string;
        generated: number;
        date: string;
    }> {
        try {
            const today = new Date().toISOString().split('T')[0];
            console.log('🔄 Generating sessions for today:', today);

            // Get count before generation
            const [beforeCount] = await db.execute(`
                SELECT COUNT(*) as count FROM ClassSession 
                WHERE session_date = ?
            `, [today]);
            
            const beforeTotal = (beforeCount as any[])[0].count;

            // Generate sessions
            await this.generateSessionsForDate(today);
            
            // Get count after generation
            const [afterCount] = await db.execute(`
                SELECT COUNT(*) as count FROM ClassSession 
                WHERE session_date = ?
            `, [today]);
            
            const afterTotal = (afterCount as any[])[0].count;
            const generated = afterTotal - beforeTotal;

            console.log(`✅ Sessions generated: ${generated} new, ${afterTotal} total for ${today}`);

            return {
                success: true,
                message: `Generated ${generated} new sessions for ${today}`,
                generated: generated,
                date: today
            };
            
        } catch (error) {
            console.error('❌ Error generating today sessions:', error);
            return {
                success: false,
                message: 'Failed to generate sessions: ' + (error as Error).message,
                generated: 0,
                date: new Date().toISOString().split('T')[0]
            };
        }
    }

    /**
     * Get current sessions for today with details
     */
    static async getCurrentSessions(): Promise<{
        success: boolean;
        message: string;
        sessions: any[];
        date: string;
    }> {
        try {
            const today = new Date().toISOString().split('T')[0];
            console.log('🔍 Getting current sessions for:', today);

            // Get all sessions for today with details  
            const [sessions] = await db.execute(`
                SELECT 
                    cs.sessionId,
                    cs.subjectId,
                    cs.session_date,
                    cs.session_status,
                    cs.timeSlotId,
                    cs.started_at,
                    cs.ended_at,
                    ts.start_time,
                    ts.end_time,
                    ts.roomId,
                    r.roomId as room_name
                FROM ClassSession cs
                LEFT JOIN TimeSlot ts ON cs.timeSlotId = ts.timeSlotId
                LEFT JOIN Room r ON ts.roomId = r.roomId
                WHERE cs.session_date = ?
                ORDER BY ts.start_time ASC
            `, [today]);

            console.log(`✅ Found ${(sessions as any[]).length} sessions for ${today}`);

            return {
                success: true,
                message: `Found ${(sessions as any[]).length} sessions for ${today}`,
                sessions: sessions as any[],
                date: today
            };
            
        } catch (error) {
            console.error('❌ Error getting current sessions:', error);
            return {
                success: false,
                message: 'Failed to get sessions: ' + (error as Error).message,
                sessions: [],
                date: new Date().toISOString().split('T')[0]
            };
        }
    }

    /**
     * Auto-complete expired sessions
     */
    static async completeExpiredSessions(): Promise<void> {
        try {
            const now = new Date();
            const dateStr = now.toISOString().split('T')[0];
            const timeStr = now.toTimeString().slice(0, 8);
            
            console.log('🔄 Activating scheduled sessions and completing expired sessions...');
            
            // First, activate SCHEDULED sessions that should start now
            const [scheduledSessions] = await db.execute(`
                SELECT cs.sessionId, cs.session_date, ts.start_time
                FROM ClassSession cs
                INNER JOIN TimeSlot ts ON cs.timeSlotId = ts.timeSlotId  
                WHERE cs.session_status = 'SCHEDULED'
                  AND cs.session_date = ?
                  AND ? >= ts.start_time
            `, [dateStr, timeStr]);
            
            for (const session of (scheduledSessions as any[])) {
                console.log(`🟢 Activating scheduled session: ${session.sessionId} (Start: ${session.start_time})`);
                await this.updateSessionStatus(session.sessionId, 'ACTIVE');
            }
            
            if ((scheduledSessions as any[]).length > 0) {
                console.log(`✅ Activated ${(scheduledSessions as any[]).length} scheduled sessions`);
            }
            
            // Then, find ACTIVE sessions that are past end_time (including previous dates)
            const [expiredSessions] = await db.execute(`
                SELECT cs.sessionId, cs.session_date, ts.end_time,
                       CONCAT(cs.session_date, ' ', ts.end_time) as full_end_time
                FROM ClassSession cs
                INNER JOIN TimeSlot ts ON cs.timeSlotId = ts.timeSlotId  
                WHERE cs.session_status = 'ACTIVE'
                  AND (
                    -- Sessions from previous dates (automatically expired)
                    cs.session_date < ?
                    OR 
                    -- Sessions from today that passed end_time
                    (cs.session_date = ? AND ? > ts.end_time)
                  )
            `, [dateStr, dateStr, timeStr]);
            
            for (const session of (expiredSessions as any[])) {
                console.log(`⏰ Completing expired session: ${session.sessionId} (Date: ${session.session_date}, End: ${session.end_time})`);
                await this.updateSessionStatus(session.sessionId, 'COMPLETED');
            }
            
            if ((expiredSessions as any[]).length > 0) {
                console.log(`✅ Completed ${(expiredSessions as any[]).length} expired sessions`);
            }
            
        } catch (error) {
            console.error('❌ Error completing expired sessions:', error);
        }
    }
}