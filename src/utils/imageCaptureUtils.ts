// Utility functions for capturing and managing face images

export interface CapturedImage {
  id: string;
  userId: string;
  userName: string;
  imageData: string; // base64 image data
  timestamp: string;
  confidence: number;
  checkInStatus: 'success' | 'failed';
}

/**
 * Capture image from video element and save to localStorage
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
      console.error('Cannot capture image: video not ready or no context');
      return null;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to base64 image data
    const imageData = canvas.toDataURL('image/png', 0.95);

    // Create captured image object
    const capturedImage: CapturedImage = {
      id: `capture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      userName,
      imageData,
      timestamp: new Date().toISOString(),
      confidence,
      checkInStatus
    };

    // Save to localStorage
    saveCapturedImage(capturedImage);

    console.log('✅ Face image captured successfully:', {
      userId,
      userName,
      confidence,
      imageSize: `${canvas.width}x${canvas.height}`
    });

    return capturedImage.id;

  } catch (error) {
    console.error('❌ Error capturing face image:', error);
    return null;
  }
};

/**
 * Save captured image to localStorage
 */
export const saveCapturedImage = (capturedImage: CapturedImage): void => {
  try {
    const existingImages = getCapturedImages();
    const updatedImages = [capturedImage, ...existingImages];
    
    // Keep only last 50 images to prevent storage overflow
    const limitedImages = updatedImages.slice(0, 50);
    
    localStorage.setItem('capturedFaceImages', JSON.stringify(limitedImages));
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('newFaceCapture', {
      detail: capturedImage
    }));
    
  } catch (error) {
    console.error('Error saving captured image:', error);
  }
};

/**
 * Get all captured images from localStorage
 */
export const getCapturedImages = (): CapturedImage[] => {
  try {
    const stored = localStorage.getItem('capturedFaceImages');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading captured images:', error);
    return [];
  }
};

/**
 * Clear all captured images
 */
export const clearCapturedImages = (): void => {
  try {
    localStorage.removeItem('capturedFaceImages');
    window.dispatchEvent(new CustomEvent('newFaceCapture', {
      detail: null
    }));
  } catch (error) {
    console.error('Error clearing captured images:', error);
  }
};

/**
 * Delete specific captured image
 */
export const deleteCapturedImage = (imageId: string): void => {
  try {
    const existingImages = getCapturedImages();
    const updatedImages = existingImages.filter(img => img.id !== imageId);
    localStorage.setItem('capturedFaceImages', JSON.stringify(updatedImages));
    
    window.dispatchEvent(new CustomEvent('newFaceCapture', {
      detail: null
    }));
  } catch (error) {
    console.error('Error deleting captured image:', error);
  }
};

/**
 * Get captured images for specific user
 */
export const getCapturedImagesByUser = (userId: string): CapturedImage[] => {
  return getCapturedImages().filter(img => img.userId === userId);
};

/**
 * Download captured image
 */
export const downloadCapturedImage = (image: CapturedImage): void => {
  try {
    const link = document.createElement('a');
    link.href = image.imageData;
    link.download = `face_capture_${image.userName}_${image.timestamp.replace(/[:\s]/g, '_')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading image:', error);
  }
};
