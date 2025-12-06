import db from "../../database/connection";
import {
    FaceDescriptor,
    FaceRegistrationRequest,
    FaceRecognitionRequest,
    FaceRecognitionResponse,
    StudentFaceInfo,
    FACE_CONSTANTS
} from "../../models/face";

export class FaceRecognitionService {
    
    /**
     * Register face descriptor for student (only if faceEmbedding is NULL)
     */
    static async registerStudentFace(request: FaceRegistrationRequest): Promise<boolean> {
        try {
            const { studentId, descriptor, imageData } = request;

            console.log('🔍 Registering face for student:', studentId);

            // ✅ Validate descriptor thoroughly
            if (!Array.isArray(descriptor) || descriptor.length === 0) {
                throw new Error('Invalid face descriptor: must be non-empty array');
            }

            const hasValidNumbers = descriptor.every(val => typeof val === 'number' && !isNaN(val));
            if (!hasValidNumbers) {
                throw new Error('Invalid face descriptor: must contain valid numbers');
            }

            // Check if student exists
            const [studentRows] = await db.execute(`
                SELECT studentId, name, faceEmbedding FROM studentaccount WHERE studentId = ?
            `, [studentId]);

            if ((studentRows as any[]).length === 0) {
                console.error(`❌ Student ${studentId} not found`);
                throw new Error('Student not found');
            }

            const student = (studentRows as any[])[0];

            // ✅ BLOCK registration if face already exists
            if (student.faceEmbedding !== null && student.faceEmbedding !== '') {
                console.warn(`❌ Student ${studentId} already has face registered`);
                throw new Error('Face already registered. Contact admin to reset before re-registering.');
            }

            // ✅ Only allow registration when faceEmbedding is NULL
            await db.execute(`
                UPDATE studentaccount 
                SET faceEmbedding = ?
                WHERE studentId = ? AND faceEmbedding IS NULL
            `, [JSON.stringify(descriptor), studentId]);

            // ✅ Verify the update was successful
            const [verifyRows] = await db.execute(`
                SELECT faceEmbedding FROM studentaccount WHERE studentId = ?
            `, [studentId]);

            const updatedStudent = (verifyRows as any[])[0];
            if (!updatedStudent.faceEmbedding) {
                throw new Error('Failed to register face - database update failed');
            }

            // Log registration image if provided
            if (imageData) {
                await this.logRegistrationImage(studentId, imageData);
            }

            console.log(`✅ Face registered successfully for student: ${studentId}`);
            return true;

        } catch (error) {
            console.error('❌ Face registration error:', error);
            return false;
        }
    }

    /**
     * Get all students with registered faces
     */
    static async getAllStudentsWithFaces(): Promise<FaceDescriptor[]> {
        try {
            const [rows] = await db.execute(`
                SELECT studentId, name, faceEmbedding
                FROM studentaccount 
                WHERE faceEmbedding IS NOT NULL AND faceEmbedding != ''
            `);
            
            const students: FaceDescriptor[] = [];
            
            for (const row of (rows as any[])) {
                try {
                    let descriptor;
                    
                    // Handle different faceEmbedding data types
                    if (typeof row.faceEmbedding === 'string') {
                        // If it's a JSON string, parse it
                        descriptor = JSON.parse(row.faceEmbedding);
                    } else if (Array.isArray(row.faceEmbedding)) {
                        // If it's already an array (MySQL JSON type), use directly
                        descriptor = row.faceEmbedding;
                    } else if (Buffer.isBuffer(row.faceEmbedding)) {
                        // If it's a Buffer, convert to string then parse
                        descriptor = JSON.parse(row.faceEmbedding.toString());
                    } else {
                        // If it's an object, use directly
                        descriptor = row.faceEmbedding;
                    }
                    
                    // ✅ Validate descriptor is array with data
                    if (Array.isArray(descriptor) && descriptor.length > 0) {
                        students.push({
                            studentId: row.studentId,
                            name: row.name,
                            descriptor: descriptor
                        });
                    } else {
                        console.warn(`⚠️ Invalid descriptor for student ${row.studentId}`);
                    }
                } catch (parseError) {
                    console.warn(`⚠️ Failed to parse face data for student ${row.studentId}:`, parseError);
                }
            }
            
            console.log(`✅ Found ${students.length} students with valid face data`);
            return students;
            
        } catch (error) {
            console.error('❌ Error fetching student faces:', error);
            return [];
        }
    }

    /**
     * Recognize face from descriptor
     */
    static async recognizeFace(request: FaceRecognitionRequest): Promise<FaceRecognitionResponse> {
        try {
            const { descriptor, imageData, subjectId, timeSlotId, studentId } = request;
            
            console.log(`🔍 Processing face recognition for student: ${studentId}`);
            
            // Validate descriptor
            if (!Array.isArray(descriptor) || descriptor.length === 0) {
                return {
                    success: false,
                    isMatch: false,
                    confidence: 0,
                    message: 'Invalid face descriptor provided'
                };
            }
            
            // ✅ Validate descriptor contains numbers
            const hasValidNumbers = descriptor.every(val => typeof val === 'number' && !isNaN(val));
            if (!hasValidNumbers) {
                return {
                    success: false,
                    isMatch: false,
                    confidence: 0,
                    message: 'Invalid face descriptor: must contain valid numbers'
                };
            }
            
            // ✅ CHỈ KIỂM TRA FACE DATA CỦA USER HIỆN TẠI
            const studentFaceInfo = await this.getStudentFaceInfo(studentId);
            
            if (!studentFaceInfo.registered) {
                // Log attempt
                if (imageData) {
                    await this.logRecognitionAttempt(null, imageData, 0, false, subjectId, timeSlotId);
                }
                
                return {
                    success: true,
                    isMatch: false,
                    confidence: 0,
                    message: `Tài khoản ${studentId} chưa đăng ký khuôn mặt`
                };
            }

            // ✅ LẤY FACE DESCRIPTOR CỦA USER HIỆN TẠI
            let userDescriptor: number[];
            try {
                const [rows] = await db.execute(`
                    SELECT faceEmbedding FROM studentaccount WHERE studentId = ?
                `, [studentId]);
                
                const student = (rows as any[])[0];
                
                // Handle different faceEmbedding data types
                if (typeof student.faceEmbedding === 'string') {
                    userDescriptor = JSON.parse(student.faceEmbedding);
                } else if (Array.isArray(student.faceEmbedding)) {
                    userDescriptor = student.faceEmbedding;
                } else if (Buffer.isBuffer(student.faceEmbedding)) {
                    userDescriptor = JSON.parse(student.faceEmbedding.toString());
                } else {
                    userDescriptor = student.faceEmbedding;
                }
                
            } catch (parseError) {
                console.error(`❌ Error parsing face data for ${studentId}:`, parseError);
                return {
                    success: false,
                    isMatch: false,
                    confidence: 0,
                    message: 'Lỗi đọc dữ liệu khuôn mặt'
                };
            }
            
            // ✅ SO SÁNH CHỈ VỚI FACE CỦA USER HIỆN TẠI
            let distance: number;
            try {
                distance = this.calculateEuclideanDistance(descriptor, userDescriptor);
            } catch (distanceError) {
                console.error(`❌ Error calculating distance for ${studentId}:`, distanceError);
                return {
                    success: false,
                    isMatch: false,
                    confidence: 0,
                    message: 'Lỗi so sánh khuôn mặt'
                };
            }
            
            // Determine if it's a match
            const isMatch = distance < FACE_CONSTANTS.DEFAULT_MATCH_THRESHOLD;
            
            // ✨ CẢI TIẾN: Map distance [0, threshold] → confidence [100%, 60%]
            // Distance càng nhỏ → Confidence càng cao
            let confidence: number;
            if (distance <= 0) {
                confidence = 100; // Perfect match
            } else if (distance >= FACE_CONSTANTS.DEFAULT_MATCH_THRESHOLD) {
                // Distance >= threshold: confidence từ 60% trở xuống
                confidence = Math.max(0, 60 - (distance - FACE_CONSTANTS.DEFAULT_MATCH_THRESHOLD) * 100);
            } else {
                // Distance < threshold: map [0, threshold] → [100%, 60%]
                // Công thức: confidence = 100 - (distance / threshold) * 40
                confidence = 100 - (distance / FACE_CONSTANTS.DEFAULT_MATCH_THRESHOLD) * 40;
            }
            confidence = Math.round(confidence); // Làm tròn
            
            // ✅ Log the recognition attempt - IMPORTANT!
            if (imageData) {
                await this.logRecognitionAttempt(
                    isMatch ? studentId : null,
                    imageData,
                    confidence,
                    isMatch,
                    subjectId,
                    timeSlotId
                );
                console.log(`📝 Logged recognition attempt: ${isMatch ? 'SUCCESS' : 'FAILED'} for ${studentId} (${confidence.toFixed(1)}%)`);
            }
            
            const response: FaceRecognitionResponse = {
                success: true,
                isMatch,
                confidence: parseFloat(confidence.toFixed(2)),
                studentId: isMatch ? studentId : undefined,
                studentName: isMatch ? studentFaceInfo.name : undefined,
                message: isMatch ? 
                    `✅ Nhận diện thành công: ${studentFaceInfo.name} (${confidence.toFixed(1)}%)` : 
                    `❌ Khuôn mặt không khớp với tài khoản ${studentId} (${confidence.toFixed(1)}%)`
            };
            
            console.log(`✅ Face recognition completed for ${studentId}:`, {
                isMatch: response.isMatch,
                confidence: response.confidence
            });
            
            return response;
            
        } catch (error) {
            console.error('❌ Face recognition error:', error);
            return {
                success: false,
                isMatch: false,
                confidence: 0,
                message: 'Lỗi hệ thống khi nhận diện khuôn mặt'
            };
        }
    }

    /**
     * Check if student has registered face and can register
     */
    static async getStudentFaceInfo(studentId: string): Promise<StudentFaceInfo & { canRegister: boolean; reason?: string }> {
        try {
            console.log(`🔍 Checking face info for student: ${studentId}`);
            
            const [rows] = await db.execute(`
                SELECT studentId, name, faceEmbedding
                FROM studentaccount 
                WHERE studentId = ?
            `, [studentId]);
            
            console.log(`📊 Query result for ${studentId}:`, rows);
            const student = (rows as any[])[0];
            
            // Check if student exists
            if (!student) {
                return {
                    studentId,
                    registered: false,
                    canRegister: false,
                    reason: 'Student not found'
                };
            }
            
            // ✅ Check if faceEmbedding exists and is not null
            const hasFaceData = student.faceEmbedding !== null && student.faceEmbedding !== '';
            console.log(`📋 Student ${studentId} faceEmbedding:`, student.faceEmbedding ? 'EXISTS' : 'NULL/EMPTY');
            
            // ✅ Validate face data - handle different data types
            let validFaceData = false;
            if (hasFaceData) {
                try {
                    let descriptor;
                    
                    // Handle different faceEmbedding data types
                    if (typeof student.faceEmbedding === 'string') {
                        // If it's a JSON string, parse it
                        descriptor = JSON.parse(student.faceEmbedding);
                    } else if (Array.isArray(student.faceEmbedding)) {
                        // If it's already an array (MySQL JSON type), use directly
                        descriptor = student.faceEmbedding;
                    } else if (Buffer.isBuffer(student.faceEmbedding)) {
                        // If it's a Buffer, convert to string then parse
                        descriptor = JSON.parse(student.faceEmbedding.toString());
                    } else {
                        // If it's an object, use directly
                        descriptor = student.faceEmbedding;
                    }
                    
                    validFaceData = Array.isArray(descriptor) && descriptor.length > 0;
                    console.log(`✅ Valid face data for ${studentId}:`, validFaceData, `(${descriptor.length} descriptors)`);
                    
                } catch (parseError) {
                    console.warn(`⚠️ Invalid face data for student ${studentId}:`, parseError);
                    validFaceData = false;
                }
            }
            
            const result = {
                studentId: student.studentId,
                name: student.name,
                registered: validFaceData,
                canRegister: !validFaceData, // ✅ Can only register if no valid face data
                reason: validFaceData ? 'Face already registered. Contact admin to reset.' : undefined
            };
            
            console.log(`📤 Returning face info for ${studentId}:`, result);
            return result;
            
        } catch (error) {
            console.error('❌ Error getting student face info:', error);
            return {
                studentId,
                registered: false,
                canRegister: false,
                reason: 'System error'
            };
        }
    }

    /**
     * Admin-only method to reset student face (clear faceEmbedding)
     */
    static async adminResetStudentFace(studentId: string, adminId: string): Promise<boolean> {
        try {
            console.log(`🔍 Admin ${adminId} resetting face for student: ${studentId}`);

            // Check if student exists
            const [studentRows] = await db.execute(`
                SELECT studentId, name, faceEmbedding FROM studentaccount WHERE studentId = ?
            `, [studentId]);

            if ((studentRows as any[]).length === 0) {
                console.error(`❌ Student ${studentId} not found`);
                return false;
            }

            const student = (studentRows as any[])[0];

            if (!student.faceEmbedding) {
                console.warn(`⚠️ Student ${studentId} has no face data to reset`);
                return true; // No-op, but not an error
            }

            // Clear the faceEmbedding
            await db.execute(`
                UPDATE studentaccount 
                SET faceEmbedding = NULL
                WHERE studentId = ?
            `, [studentId]);

            // Log the admin action
            await this.logAdminFaceReset(studentId, adminId);

            console.log(`✅ Admin ${adminId} successfully reset face for student: ${studentId}`);
            return true;

        } catch (error) {
            console.error('❌ Admin face reset error:', error);
            return false;
        }
    }

    /**
     * Get total count of registered faces (for admin dashboard)
     */
    static async getRegisteredFaceCount(): Promise<number> {
        try {
            const [rows] = await db.execute(`
                SELECT COUNT(*) as count
                FROM studentaccount 
                WHERE faceEmbedding IS NOT NULL AND faceEmbedding != ''
            `);
            
            return (rows as any[])[0].count || 0;
        } catch (error) {
            console.error('❌ Error getting face count:', error);
            return 0;
        }
    }
    /**
     * Log recognition attempt to database
     */
    private static async logRecognitionAttempt(
        studentId: string | null,
        imageData: string,
        confidence: number,
        success: boolean,
        subjectId?: string,
        timeSlotId?: string
    ): Promise<void> {
        try {
            const imageId = `REC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Convert base64 to buffer
            const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // Check image size
            if (imageBuffer.length > FACE_CONSTANTS.MAX_IMAGE_SIZE) {
                console.warn(`⚠️ Image too large: ${imageBuffer.length} bytes`);
                return;
            }
            
            // ✅ Handle null/undefined values properly
            await db.execute(`
                INSERT INTO captured_images (
                    imageId, studentId, imageData, confidence, 
                    recognition_result, subjectId, timeSlotId, captured_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())
            `, [
                imageId,
                studentId || null, // Convert empty string to null
                imageBuffer,
                Math.round(confidence * 100) / 100, // Round to 2 decimal places
                success ? 'SUCCESS' : 'FAILED',
                subjectId || null, // Convert undefined to null
                timeSlotId || null // Convert undefined to null
            ]);
            
            console.log(`✅ Logged recognition attempt: ${success ? 'SUCCESS' : 'FAILED'} for student: ${studentId || 'UNKNOWN'} (${confidence.toFixed(1)}%)`);
            
        } catch (error) {
            console.error('❌ Error logging recognition attempt:', error);
            console.error('❌ Error details:', {
                studentId,
                confidence,
                success,
                subjectId,
                timeSlotId,
                imageDataLength: imageData ? imageData.length : 0
            });
        }
    }

    /**
     * Log face registration image
     */
    private static async logRegistrationImage(studentId: string, imageData: string): Promise<void> {
        try {
            // ✅ Tạo imageId unique hơn
            const imageId = `REG_${Date.now()}_${studentId}_${Math.random().toString(36).substr(2, 5)}`;
            
            const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            // Check image size
            if (imageBuffer.length > FACE_CONSTANTS.MAX_IMAGE_SIZE) {
                console.warn(`⚠️ Registration image too large: ${imageBuffer.length} bytes`);
                return;
            }
            
            await db.execute(`
                INSERT INTO captured_images (
                    imageId, studentId, imageData, confidence, 
                    recognition_result, captured_at
                ) VALUES (?, ?, ?, 100, 'SUCCESS', NOW())
            `, [imageId, studentId, imageBuffer]);
            
            console.log(`✅ Logged registration image for student: ${studentId}`);
            
        } catch (error) {
            console.error('❌ Error logging registration image:', error);
            console.error('❌ Registration details:', { studentId });
        }
    }

    /**
     * Log admin face reset action
     */
    private static async logAdminFaceReset(studentId: string, adminId: string): Promise<void> {
        try {
            const logId = `ADMIN_RESET_${Date.now()}_${studentId}`;
            
            await db.execute(`
                INSERT INTO captured_images (
                    imageId, studentId, confidence, 
                    recognition_result, captured_at, ip_address
                ) VALUES (?, ?, 0, 'ADMIN_RESET', NOW(), ?)
            `, [logId, studentId, `ADMIN:${adminId}`]);
            
            console.log(`✅ Logged admin reset action for student: ${studentId}`);
            
        } catch (error) {
            console.error('❌ Error logging admin reset:', error);
        }
    }

    /**
     * Calculate Euclidean distance between two descriptors
     */
    private static calculateEuclideanDistance(desc1: number[], desc2: number[]): number {
        if (desc1.length !== desc2.length) {
            throw new Error(`Descriptor lengths do not match: ${desc1.length} vs ${desc2.length}`);
        }
        
        let sum = 0;
        for (let i = 0; i < desc1.length; i++) {
            const diff = desc1[i] - desc2[i];
            sum += diff * diff;
        }
        
        return Math.sqrt(sum);
    }

    /**
     * Validate face descriptor format
     */
    static validateDescriptor(descriptor: any): { valid: boolean; error?: string } {
        if (!Array.isArray(descriptor)) {
            return { valid: false, error: 'Descriptor must be an array' };
        }
        
        if (descriptor.length === 0) {
            return { valid: false, error: 'Descriptor cannot be empty' };
        }
        
        const hasValidNumbers = descriptor.every(val => typeof val === 'number' && !isNaN(val));
        if (!hasValidNumbers) {
            return { valid: false, error: 'Descriptor must contain valid numbers only' };
        }
        
        return { valid: true };
    }
}
