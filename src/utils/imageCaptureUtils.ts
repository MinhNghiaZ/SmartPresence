// Utility functions for capturing and managing face images

import { logger } from './logger';

export interface CapturedImage {
  imageId: string;
  studentId: string | null;
  studentName?: string;
  imageData: string; // base64 image data
  confidence: number;
  status: string;
  subjectId?: string;
  subjectName?: string;
  capturedAt: string;
  ipAddress?: string;
}

// Legacy interface for backward compatibility
export interface LegacyCapturedImage {
  id: string;
  userId: string;
  userName: string;
  imageData: string;
  timestamp: string;
  confidence: number;
  checkInStatus: 'success' | 'failed';
}

/**
 * Capture image from video element - now just captures but doesn't save (backend handles saving)
 * Returns imageId for tracking purposes
 */
export const captureFaceImage = (
  video: HTMLVideoElement,
  userId: string,
  userName: string,
  confidence: number = 0,
  checkInStatus: 'success' | 'failed' = 'success'
): string | null => {
  try {
    // Create canvas to capture frame
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx || !video.videoWidth || !video.videoHeight) {
      logger.api.error('Cannot capture image - video not ready or no context');
      return null;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Generate unique ID for tracking
    const imageId = `capture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    logger.api.info('Face image captured successfully', {
      imageId,
      userId,
      userName,
      confidence,
      imageSize: `${canvas.width}x${canvas.height}`,
      note: 'Image data is handled by backend'
    });

    // Dispatch event to notify other components
    window.dispatchEvent(new CustomEvent('newFaceCapture', {
      detail: { imageId, userId, userName, confidence, status: checkInStatus }
    }));

    return imageId;

  } catch (error) {
    logger.api.error('Error capturing face image', error);
    return null;
  }
};

// Single deprecation warning function to avoid duplication
const warnDeprecated = (functionName: string) => {
  console.warn(`⚠️ ${functionName}() is deprecated. Images are now managed by backend API.`);
};

/**
 * @deprecated Images are now managed by backend. Use backend API instead.
 */
export const saveCapturedImage = (_capturedImage: LegacyCapturedImage): void => {
  warnDeprecated('saveCapturedImage');
};

/**
 * @deprecated Images are now loaded from backend API. Use frontend components to fetch data.
 */
export const getCapturedImages = (): LegacyCapturedImage[] => {
  warnDeprecated('getCapturedImages');
  return [];
};

/**
 * @deprecated Images are now managed by backend. Use backend API instead.
 */
export const clearCapturedImages = (): void => {
  warnDeprecated('clearCapturedImages');
};

/**
 * @deprecated Images are now managed by backend. Use backend API instead.
 */
export const deleteCapturedImage = (_imageId: string): void => {
  warnDeprecated('deleteCapturedImage');
};

/**
 * @deprecated Images are now managed by backend. Use backend API instead.
 */
export const getCapturedImagesByUser = (_userId: string): LegacyCapturedImage[] => {
  warnDeprecated('getCapturedImagesByUser');
  return [];
};

/**
 * Download captured image - Updated for new interface
 */
export const downloadCapturedImage = (image: CapturedImage): void => {
  try {
    const link = document.createElement('a');
    link.href = image.imageData;
    link.download = `face_capture_${image.studentName || 'unknown'}_${image.capturedAt.replace(/[:\s]/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    logger.api.error('Error downloading image', error);
  }
};

/**
 * Legacy function for backward compatibility
 */
export const downloadLegacyCapturedImage = (image: LegacyCapturedImage): void => {
  try {
    const link = document.createElement('a');
    link.href = image.imageData;
    link.download = `face_capture_${image.userName}_${image.timestamp.replace(/[:\s]/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    logger.api.error('Error downloading image', error);
  }
};
