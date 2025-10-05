import db from "../../database/connection";

export interface CapturedImageResponse {
    imageId: string;
    studentId: string | null;
    studentName?: string;
    imageData: string; // Base64 string for frontend
    confidence: number;
    status: string;
    subjectId?: string;
    subjectName?: string;
    capturedAt: string;
    ipAddress?: string;
}

export interface CapturedImageStats {
    totalImages: number;
    uniqueStudents: number;
    successfulRecognitions: number;
    avgConfidence: number;
    lastCapture: string | null;
}

export class StorageService {
    
    /**
     * Get all captured images (for admin/demo history)  
     */
    static async getAllCapturedImages(limit: number = 100): Promise<CapturedImageResponse[]> {
        try {
            console.log(`🔍 StorageService.getAllCapturedImages called with limit: ${limit}`);
            
            // ✅ Test với query đơn giản trước
            const [rows] = await db.execute(`SELECT * FROM captured_images ORDER BY captured_at DESC LIMIT 100`);
            
            if ((rows as any[]).length === 0) {
                console.log(`⚠️ No captured images found in database`);
                return [];
            }

            const images: CapturedImageResponse[] = [];

            for (const row of rows as any[]) {
                try {
                    console.log(`🔍 Processing image: ${row.imageId} for student: ${row.studentId}`);
                    
                    // ✅ Convert BLOB to base64
                    let imageDataBase64 = '';
                    if (row.imageData) {
                        if (Buffer.isBuffer(row.imageData)) {
                            imageDataBase64 = `data:image/jpeg;base64,${row.imageData.toString('base64')}`;
                        } else {
                            imageDataBase64 = row.imageData;
                        }
                    }

                    images.push({
                        imageId: row.imageId,
                        studentId: row.studentId,
                        studentName: row.studentId || 'Unknown', // ✅ Dùng studentId làm name tạm
                        imageData: imageDataBase64,
                        confidence: parseFloat(row.confidence) || 0,
                        status: row.recognition_result || 'UNKNOWN',
                        subjectId: row.subjectId,
                        subjectName: row.subjectId, // ✅ Dùng subjectId làm name tạm
                        capturedAt: row.captured_at,
                        ipAddress: row.ip_address
                    });

                    console.log(`✅ Successfully processed image: ${row.imageId}`);

                } catch (processError) {
                    console.error(`❌ Error processing image ${row.imageId}:`, processError);
                }
            }

            console.log(`✅ StorageService returning ${images.length} processed images`);
            return images;
            
        } catch (error) {
            console.error('❌ Error fetching captured images:', error);
            console.error('❌ Error details:', error);
            return [];
        }
    }

    /**
     * Get captured images for specific student
     */
    static async getStudentCapturedImages(studentId: string): Promise<CapturedImageResponse[]> {
        try {
            const [rows] = await db.execute(`
                SELECT 
                    ci.imageId,
                    ci.studentId,
                    sa.name as studentName,
                    ci.imageData,
                    ci.confidence,
                    ci.recognition_result,
                    ci.subjectId,
                    s.name as subjectName,
                    ci.captured_at,
                    ci.ip_address
                FROM captured_images ci
                LEFT JOIN StudentAccount sa ON ci.studentId = sa.studentId
                LEFT JOIN Subject s ON ci.subjectId = s.subjectId
                WHERE ci.studentId = ?
                ORDER BY ci.captured_at DESC
            `, [studentId]);

            return (rows as any[]).map(row => ({
                imageId: row.imageId,
                studentId: row.studentId,
                studentName: row.studentName,
                imageData: `data:image/jpeg;base64,${row.imageData.toString('base64')}`,
                confidence: row.confidence,
                status: row.recognition_result,
                subjectId: row.subjectId,
                subjectName: row.subjectName,
                capturedAt: row.captured_at.toISOString(),
                ipAddress: row.ip_address
            }));
            
        } catch (error) {
            console.error('❌ Error fetching student images:', error);
            return [];
        }
    }

    /**
     * Get single captured image by ID
     */
    static async getCapturedImageById(imageId: string): Promise<CapturedImageResponse | null> {
        try {
            const [rows] = await db.execute(`
                SELECT 
                    ci.imageId,
                    ci.studentId,
                    sa.name as studentName,
                    ci.imageData,
                    ci.confidence,
                    ci.recognition_result,
                    ci.subjectId,
                    s.name as subjectName,
                    ci.captured_at,
                    ci.ip_address
                FROM captured_images ci
                LEFT JOIN StudentAccount sa ON ci.studentId = sa.studentId
                LEFT JOIN Subject s ON ci.subjectId = s.subjectId
                WHERE ci.imageId = ?
            `, [imageId]);

            if ((rows as any[]).length === 0) {
                return null;
            }

            const row = (rows as any[])[0];
            return {
                imageId: row.imageId,
                studentId: row.studentId,
                studentName: row.studentName || 'Unknown',
                imageData: `data:image/jpeg;base64,${row.imageData.toString('base64')}`,
                confidence: row.confidence,
                status: row.recognition_result,
                subjectId: row.subjectId,
                subjectName: row.subjectName,
                capturedAt: row.captured_at.toISOString(),
                ipAddress: row.ip_address
            };
            
        } catch (error) {
            console.error('❌ Error fetching captured image by ID:', error);
            return null;
        }
    }

    /**
     * Delete captured image by ID
     */
    static async deleteCapturedImage(imageId: string): Promise<boolean> {
        try {
            const [result] = await db.execute(`
                DELETE FROM captured_images WHERE imageId = ?
            `, [imageId]);

            const affectedRows = (result as any).affectedRows;
            console.log(`✅ Deleted captured image: ${imageId}`);
            return affectedRows > 0;
            
        } catch (error) {
            console.error('❌ Error deleting captured image:', error);
            return false;
        }
    }

    /**
     * Delete all captured images (admin only)
     */
    static async deleteAllCapturedImages(): Promise<boolean> {
        try {
            const [result] = await db.execute(`DELETE FROM captured_images`);
            
            const affectedRows = (result as any).affectedRows;
            console.log(`✅ Deleted all captured images: ${affectedRows} rows`);
            return true;
            
        } catch (error) {
            console.error('❌ Error deleting all captured images:', error);
            return false;
        }
    }

    /**
     * Get captured images statistics
     */
    static async getCapturedImagesStats(): Promise<CapturedImageStats> {
        try {
            const [rows] = await db.execute(`
                SELECT 
                    COUNT(*) as total_images,
                    COUNT(DISTINCT studentId) as unique_students,
                    SUM(CASE WHEN recognition_result = 'SUCCESS' THEN 1 ELSE 0 END) as successful_recognitions,
                    AVG(confidence) as avg_confidence,
                    MAX(captured_at) as last_capture
                FROM captured_images
            `);

            const stats = (rows as any[])[0];
            return {
                totalImages: stats.total_images || 0,
                uniqueStudents: stats.unique_students || 0,
                successfulRecognitions: stats.successful_recognitions || 0,
                avgConfidence: parseFloat((stats.avg_confidence || 0).toFixed(2)),
                lastCapture: stats.last_capture ? stats.last_capture.toISOString() : null
            };
            
        } catch (error) {
            console.error('❌ Error getting captured images stats:', error);
            return {
                totalImages: 0,
                uniqueStudents: 0,
                successfulRecognitions: 0,
                avgConfidence: 0,
                lastCapture: null
            };
        }
    }

    /**
     * Clean up old captured images (keep only last N images per student)
     */
    static async cleanupOldImages(keepPerStudent: number = 10): Promise<number> {
        try {
            const [result] = await db.execute(`
                DELETE ci1 FROM captured_images ci1
                INNER JOIN (
                    SELECT imageId,
                           ROW_NUMBER() OVER (PARTITION BY studentId ORDER BY captured_at DESC) as row_num
                    FROM captured_images
                ) ci2 ON ci1.imageId = ci2.imageId
                WHERE ci2.row_num > ?
            `, [keepPerStudent]);

            const deletedRows = (result as any).affectedRows;
            console.log(`✅ Cleaned up ${deletedRows} old captured images`);
            return deletedRows;
            
        } catch (error) {
            console.error('❌ Error cleaning up old images:', error);
            return 0;
        }
    }

    /**
     * Get captured images by date range
     */
    static async getCapturedImagesByDateRange(
        startDate: string, 
        endDate: string, 
        limit: number = 100
    ): Promise<CapturedImageResponse[]> {
        try {
            const [rows] = await db.execute(`
                SELECT 
                    ci.imageId,
                    ci.studentId,
                    sa.name as studentName,
                    ci.imageData,
                    ci.confidence,
                    ci.recognition_result,
                    ci.subjectId,
                    s.name as subjectName,
                    ci.captured_at,
                    ci.ip_address
                FROM captured_images ci
                LEFT JOIN StudentAccount sa ON ci.studentId = sa.studentId
                LEFT JOIN Subject s ON ci.subjectId = s.subjectId
                WHERE ci.captured_at BETWEEN ? AND ?
                ORDER BY ci.captured_at DESC
                LIMIT ?
            `, [startDate, endDate, limit]);

            return (rows as any[]).map(row => ({
                imageId: row.imageId,
                studentId: row.studentId,
                studentName: row.studentName || 'Unknown',
                imageData: `data:image/jpeg;base64,${row.imageData.toString('base64')}`,
                confidence: row.confidence || 0,
                status: row.recognition_result || 'UNKNOWN',
                subjectId: row.subjectId,
                subjectName: row.subjectName,
                capturedAt: row.captured_at.toISOString(),
                ipAddress: row.ip_address
            }));
            
        } catch (error) {
            console.error('❌ Error fetching images by date range:', error);
            return [];
        }
    }
}