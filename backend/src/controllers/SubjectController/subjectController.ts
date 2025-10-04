// backend/src/controllers/SubjectController/subjectController.ts

import { Request, Response } from 'express';
import { SubjectService } from '../../services/SubjectService/SubjectsManagement';

export class SubjectController {
    
    /**
     * GET /api/subjects
     * Get all subjects for dropdown
     */
    static async getAllSubjects(req: Request, res: Response) {
        try {
            console.log('🚀 SubjectController.getAllSubjects called');
            
            const subjects = await SubjectService.getAllSubjects();
            
            res.json({
                success: true,
                count: subjects.length,
                subjects: subjects
            });
            
        } catch (error) {
            console.error('❌ SubjectController.getAllSubjects error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch subjects'
            });
        }
    }
    
    /**
     * GET /api/subjects/student/:studentId
     * Get subjects enrolled by student with schedule info
     */
    static async getStudentSubjects(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            
            console.log(`🚀 SubjectController.getStudentSubjects called for: ${studentId}`);
            
            // ✅ Validation
            if (!studentId) {
                console.log('❌ Missing studentId parameter');
                return res.status(400).json({
                    success: false,
                    message: 'Student ID is required'
                });
            }
            
            console.log('🔍 Calling SubjectService.getStudentSubjects...');
            const subjects = await SubjectService.getStudentSubjects(studentId);
            console.log(`✅ SubjectService returned ${subjects.length} subjects`);
            
            res.json({
                success: true,
                studentId: studentId,
                count: subjects.length,
                subjects: subjects
            });
            
        } catch (error) {
            console.error('❌ SubjectController.getStudentSubjects error:', error);
            console.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack trace');
            res.status(500).json({
                success: false,
                message: 'Failed to fetch student subjects',
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
    
    /**
     * GET /api/subjects/:subjectId/current-timeslot
     * Get current active timeslot for subject
     */
    static async getCurrentTimeSlot(req: Request, res: Response) {
        try {
            const { subjectId } = req.params;
            
            console.log(`🚀 SubjectController.getCurrentTimeSlot called for: ${subjectId}`);
            
            if (!subjectId) {
                return res.status(400).json({
                    success: false,
                    message: 'Subject ID is required'
                });
            }
            
            const timeSlot = await SubjectService.getCurrentTimeSlot(subjectId);
            
            if (!timeSlot) {
                return res.json({
                    success: true,
                    hasActiveTimeSlot: false,
                    message: 'No active timeslot for this subject at current time'
                });
            }
            
            res.json({
                success: true,
                hasActiveTimeSlot: true,
                timeSlot: timeSlot,
                message: 'Active timeslot found'
            });
            
        } catch (error) {
            console.error('❌ SubjectController.getCurrentTimeSlot error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch current timeslot'
            });
        }
    }
    
    /**
     * GET /api/subjects/:subjectId/room-info
     * Get room coordinates for GPS validation
     */
    static async getRoomInfo(req: Request, res: Response) {
        try {
            const { roomId } = req.params;
            
            console.log(`🚀 SubjectController.getRoomInfo called for: ${roomId}`);
            
            if (!roomId) {
                return res.status(400).json({
                    success: false,
                    message: 'Room ID is required'
                });
            }
            
            const room = await SubjectService.getRoomInfo(roomId);
            
            if (!room) {
                return res.status(404).json({
                    success: false,
                    message: 'Room not found'
                });
            }
            
            res.json({
                success: true,
                room: room
            });
            
        } catch (error) {
            console.error('❌ SubjectController.getRoomInfo error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch room info'
            });
        }
    }
    
    /**
     * GET /api/subjects/student/:studentId/enrollment/:subjectId
     * Check if student is enrolled in subject
     */
    static async checkEnrollment(req: Request, res: Response) {
        try {
            const { studentId, subjectId } = req.params;
            
            console.log(`🚀 SubjectController.checkEnrollment called for student: ${studentId}, subject: ${subjectId}`);
            
            if (!studentId || !subjectId) {
                return res.status(400).json({
                    success: false,
                    message: 'Student ID and Subject ID are required'
                });
            }
            
            const isEnrolled = await SubjectService.isStudentEnrolled(studentId, subjectId);
            
            res.json({
                success: true,
                studentId: studentId,
                subjectId: subjectId,
                isEnrolled: isEnrolled,
                message: isEnrolled ? 'Student is enrolled' : 'Student is not enrolled'
            });
            
        } catch (error) {
            console.error('❌ SubjectController.checkEnrollment error:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to check enrollment'
            });
        }
    }
}