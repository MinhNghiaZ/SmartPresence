// src/Services/AttendanceService/AttendanceServiceTest.ts

import { attendanceService } from './AttendanceService';

/**
 * Test functions for AttendanceService
 * Use in browser console to test API connections
 */
export class AttendanceServiceTest {
    
    /**
     * Test check-in functionality
     */
    static async testCheckIn(studentId: string, subjectId: string) {
        console.log('🧪 Testing AttendanceService.checkIn...');
        
        const mockLocation = {
            latitude: 10.8231,
            longitude: 106.6297
        };
        
        try {
            const result = await attendanceService.checkIn({
                studentId: studentId,
                subjectId: subjectId,
                location: mockLocation
            });
            
            console.log('✅ Check-in test result:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Check-in test error:', error);
            return { success: false, error: error };
        }
    }
    
    /**
     * Test attendance history
     */
    static async testGetHistory(studentId: string) {
        console.log('🧪 Testing AttendanceService.getAttendanceHistory...');
        
        try {
            const result = await attendanceService.getAttendanceHistory(studentId, {
                limit: 5
            });
            
            console.log('✅ History test result:', result);
            return result;
            
        } catch (error) {
            console.error('❌ History test error:', error);
            return { success: false, error: error };
        }
    }
    
    /**
     * Test attendance stats
     */
    static async testGetStats(studentId: string) {
        console.log('🧪 Testing AttendanceService.getAttendanceStats...');
        
        try {
            const result = await attendanceService.getAttendanceStats(studentId);
            
            console.log('✅ Stats test result:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Stats test error:', error);
            return { success: false, error: error };
        }
    }
    
    /**
     * Test current session
     */
    static async testGetCurrentSession(subjectId: string) {
        console.log('🧪 Testing AttendanceService.getCurrentSession...');
        
        try {
            const result = await attendanceService.getCurrentSession(subjectId);
            
            console.log('✅ Current session test result:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Current session test error:', error);
            return { success: false, error: error };
        }
    }
    
    /**
     * Run all tests
     */
    static async runAllTests() {
        console.log('🧪 Running all AttendanceService tests...');
        
        const testStudentId = 'SV001'; // Default test student
        const testSubjectId = 'CSE107'; // Default test subject
        
        console.group('AttendanceService Tests');
        
        // Test 1: Current Session
        await this.testGetCurrentSession(testSubjectId);
        
        // Test 2: Attendance History  
        await this.testGetHistory(testStudentId);
        
        // Test 3: Attendance Stats
        await this.testGetStats(testStudentId);
        
        // Test 4: Check-in (last to avoid affecting other tests)
        await this.testCheckIn(testStudentId, testSubjectId);
        
        console.groupEnd();
        console.log('🧪 All tests completed!');
    }
}

// Make available in global scope for testing in browser console
(window as any).AttendanceServiceTest = AttendanceServiceTest;