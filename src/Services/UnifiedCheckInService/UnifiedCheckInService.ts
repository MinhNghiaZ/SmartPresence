/**
 * Unified Check-In Service
 * 
 * Tích hợp tất cả các bước check-in thành một flow hoàn chỉnh:
 * 1. Time slot validation
 * 2. GPS location validation
 * 3. Face recognition
 * 4. Save to attendance table
 */

import { GPSService } from '../GPSService/GpsService';
import { faceRecognizeService } from '../FaceRecognizeService/FaceRecognizeService';
import { attendanceService } from '../AttendanceService/AttendanceService';
import { authService } from '../AuthService/AuthService';
import type {
    Location,
    LocationValidationResult,
    FaceRecognitionResult,
    AttendanceCheckInRequest,
    CheckInRequest,
    CheckInResult,
    CheckInStepResult
} from '../../models';

export class UnifiedCheckInService {
    /**
     * MAIN METHOD: Perform complete check-in process
     */
    static async performCompleteCheckIn(request: CheckInRequest): Promise<CheckInResult> {
        // console.log('🚀 Starting unified check-in process...');

        const result: CheckInResult = {
            success: false,
            message: '',
            steps: {
                timeValidation: { success: false, message: '' },
                locationValidation: { success: false, message: '' },
                faceRecognition: { success: false, message: '' },
                attendanceRecord: { success: false, message: '' }
            }
        };

        const currentUser = authService.getCurrentUser();
        if (!currentUser?.id) {
            result.message = 'Không tìm thấy thông tin người dùng. Vui lòng đăng nhập lại.';
            return result;
        }

        try {
            // STEP 1: TIME & LOCATION VALIDATION
            // console.log('📍 Step 1: Validating time slot and location...');
            const locationResult = await this.validateTimeAndLocation(request);
            result.steps.timeValidation = locationResult.timeValidation;
            result.steps.locationValidation = locationResult.locationValidation;

            if (!locationResult.overall.success) {
                result.message = locationResult.overall.message;
                return result;
            }

            // STEP 2: FACE RECOGNITION
            let faceResult: CheckInStepResult;
            
            if (request.faceResult) {
                // console.log('👤 Step 2: Using existing face recognition result...');
                faceResult = {
                    success: request.faceResult.isMatch,
                    message: request.faceResult.isMatch 
                        ? `✅ Nhận diện khuôn mặt thành công (${request.faceResult.confidence.toFixed(1)}%).`
                        : '❌ Nhận diện khuôn mặt không thành công.',
                    data: request.faceResult
                };
            } else {
                // console.log('👤 Step 2: Performing face recognition...');
                faceResult = await this.performFaceRecognition(request, currentUser.id);
            }
            
            result.steps.faceRecognition = faceResult;

            if (!faceResult.success) {
                result.message = faceResult.message;
                return result;
            }

            // STEP 3: SAVE ATTENDANCE RECORD
            // console.log('💾 Step 3: Saving attendance record...');
            const attendanceResult = await this.saveAttendanceRecord(request, currentUser.id, locationResult.roomInfo);
            result.steps.attendanceRecord = attendanceResult;

            if (!attendanceResult.success) {
                result.message = attendanceResult.message;
                return result;
            }

            // SUCCESS - All steps completed
            result.success = true;
            result.message = '✅ Check-in thành công!';
            result.attendanceId = attendanceResult.data?.attendanceId;
            result.timestamp = new Date().toISOString();
            result.status = attendanceResult.data?.status; // ✅ Pass status from backend

            // console.log('🎉 Unified check-in completed successfully!');
            return result;

        } catch (error) {
            console.error('❌ Unified check-in error:', error);
            result.message = 'Lỗi hệ thống khi thực hiện check-in. Vui lòng thử lại!';
            return result;
        }
    }

    /**
     * STEP 1: Validate time slot and GPS location
     */
    private static async validateTimeAndLocation(request: CheckInRequest): Promise<{
        overall: CheckInStepResult;
        timeValidation: CheckInStepResult;
        locationValidation: CheckInStepResult;
        roomInfo?: any;
    }> {
        try {
            const userLocation: Location = {
                latitude: request.latitude,
                longitude: request.longitude
            };

            // console.log('📞 Calling GPS validation service...');
            const gpsResult: LocationValidationResult = await GPSService.validateLocation(userLocation, request.subjectId);

            // Parse GPS result for time and location validation
            let timeValidation: CheckInStepResult;
            let locationValidation: CheckInStepResult;

            if (gpsResult.message === 'not time yet') {
                // Time validation failed
                timeValidation = {
                    success: false,
                    message: '⏰ Chưa tới giờ học. Vui lòng check-in trong khung thời gian của môn học.'
                };
                locationValidation = {
                    success: false,
                    message: 'Chưa kiểm tra do thời gian không hợp lệ.'
                };

                return {
                    overall: {
                        success: false,
                        message: timeValidation.message
                    },
                    timeValidation,
                    locationValidation
                };
            }

            // Time is valid, check location
            timeValidation = {
                success: true,
                message: '✅ Đúng thời gian học.'
            };

            if (gpsResult.allowed) {
                // Location validation passed
                locationValidation = {
                    success: true,
                    message: `✅ Vị trí hợp lệ tại ${gpsResult.roomName}.`,
                    data: {
                        roomId: gpsResult.roomId,
                        roomName: gpsResult.roomName
                    }
                };

                return {
                    overall: { success: true, message: 'Time and location validation passed' },
                    timeValidation,
                    locationValidation,
                    roomInfo: locationValidation.data
                };
            } else {
                // Location validation failed
                locationValidation = {
                    success: false,
                    message: `📍 ${gpsResult.message}`
                };

                return {
                    overall: {
                        success: false,
                        message: locationValidation.message
                    },
                    timeValidation,
                    locationValidation
                };
            }

        } catch (error) {
            console.error('❌ Time/Location validation error:', error);
            
            const errorResult: CheckInStepResult = {
                success: false,
                message: 'Lỗi khi kiểm tra thời gian và vị trí.'
            };

            return {
                overall: errorResult,
                timeValidation: errorResult,
                locationValidation: errorResult
            };
        }
    }

    /**
     * STEP 2: Perform face recognition
     */
    private static async performFaceRecognition(request: CheckInRequest, studentId: string): Promise<CheckInStepResult> {
        try {
            // console.log('👤 Performing face recognition...');

            // Check if face recognition service is ready
            if (!faceRecognizeService.isReady()) {
                await faceRecognizeService.initializeModels();
            }

            // Check if user has registered face
            const isRegistered = await faceRecognizeService.isUserRegistered(studentId);
            if (!isRegistered) {
                return {
                    success: false,
                    message: '👤 Chưa đăng ký khuôn mặt. Vui lòng đăng ký trước khi check-in.'
                };
            }

            // Perform face recognition
            const faceResult: FaceRecognitionResult = await faceRecognizeService.recognizeFace(
                request.videoElement,
                request.subjectId
            );

            if (faceResult.isMatch) {
                return {
                    success: true,
                    message: `✅ Nhận diện khuôn mặt thành công (${faceResult.confidence.toFixed(1)}%).`,
                    data: {
                        confidence: faceResult.confidence,
                        studentId: faceResult.person?.id,
                        studentName: faceResult.person?.name
                    }
                };
            } else {
                return {
                    success: false,
                    message: `❌ Khuôn mặt không khớp (${faceResult.confidence.toFixed(1)}%). Vui lòng thử lại.`
                };
            }

        } catch (error) {
            console.error('❌ Face recognition error:', error);
            return {
                success: false,
                message: 'Lỗi khi nhận diện khuôn mặt. Vui lòng thử lại!'
            };
        }
    }

    /**
     * STEP 3: Save attendance record to backend
     */
    private static async saveAttendanceRecord(
        request: CheckInRequest, 
        studentId: string, 
        _roomInfo?: any // Marked as unused for now
    ): Promise<CheckInStepResult> {
        try {
            // console.log('💾 Saving attendance record...');

            const checkInData: AttendanceCheckInRequest = {
                studentId: studentId,
                subjectId: request.subjectId,
                location: {
                    latitude: request.latitude,
                    longitude: request.longitude
                },
                imageData: request.faceResult?.imageData, // ✅ Pass imageData from face recognition
                confidence: request.faceResult?.confidence // ✅ Pass face recognition confidence
            };

            // console.log('📤 Sending check-in request:', {
            //     studentId,
            //     subjectId: request.subjectId,
            //     location: checkInData.location,
            //     hasImageData: !!checkInData.imageData
            // });

            // Use AttendanceService to save the record
            const attendanceResult = await attendanceService.checkIn(checkInData);
            
            // console.log('📥 AttendanceService response:', {
            //     success: attendanceResult.success,
            //     message: attendanceResult.message,
            //     attendanceId: attendanceResult.attendanceId,
            //     status: attendanceResult.status
            // });

            if (attendanceResult.success) {
                return {
                    success: true,
                    message: '✅ Đã lưu bản ghi điểm danh.',
                    data: {
                        attendanceId: attendanceResult.attendanceId,
                        timestamp: attendanceResult.timestamp,
                        status: attendanceResult.status // ✅ Pass status from backend
                    }
                };
            } else {
                return {
                    success: false,
                    message: `❌ Lỗi lưu điểm danh: ${attendanceResult.message}`
                };
            }

        } catch (error) {
            console.error('❌ Attendance save error:', error);
            return {
                success: false,
                message: 'Lỗi khi lưu bản ghi điểm danh. Vui lòng thử lại!'
            };
        }
    }

    /**
     * Quick method to check if student can perform check-in for a subject
     * Updated: Force TypeScript reload
     */
    static async canCheckIn(subjectId: string): Promise<{
        canCheckIn: boolean;
        reason?: string;
        timeSlotInfo?: any;
    }> {
        try {
            const currentUser = authService.getCurrentUser();
            if (!currentUser?.id) {
                return {
                    canCheckIn: false,
                    reason: 'Không tìm thấy thông tin người dùng.'
                };
            }

            // Check if user has registered face
            const isRegistered = await faceRecognizeService.isUserRegistered(currentUser.id);
            if (!isRegistered) {
                return {
                    canCheckIn: false,
                    reason: 'Chưa đăng ký khuôn mặt.'
                };
            }

            // Check if there's already attendance for today (basic check)
            const existingAttendance = await attendanceService.getAttendanceHistory(currentUser.id, {
                subjectId,
                limit: 5 // Check recent records
            });

            // Check if already checked in today (simple date check)
            const today = new Date().toDateString();
            const todayCheckIn = existingAttendance.records?.find(record => {
                const recordDate = new Date(record.checked_in_at).toDateString();
                return recordDate === today && record.subjectId === subjectId;
            });

            if (todayCheckIn) {
                return {
                    canCheckIn: false,
                    reason: 'Đã check-in cho môn học này hôm nay.'
                };
            }

            return {
                canCheckIn: true
            };

        } catch (error) {
            console.error('❌ Error checking check-in eligibility:', error);
            return {
                canCheckIn: false,
                reason: 'Lỗi hệ thống khi kiểm tra.'
            };
        }
    }
}

// Export singleton instance
export const unifiedCheckInService = new UnifiedCheckInService();
