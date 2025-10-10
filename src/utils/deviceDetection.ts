/**
 * Utility functions for device detection
 */

/**
 * Check if the current device is a mobile device
 * @returns true if device is mobile, false otherwise
 */
export const isMobileDevice = (): boolean => {
  // Check user agent
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // Mobile device patterns
  const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  
  // Check screen size (mobile typically < 768px width)
  const isMobileScreen = window.innerWidth < 768;
  
  // Check touch capability
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Return true if matches mobile pattern or has mobile characteristics
  return mobileRegex.test(userAgent) || (isMobileScreen && isTouchDevice);
};

/**
 * Check if the current device is a desktop/PC
 * @returns true if device is desktop/PC, false otherwise
 */
export const isDesktopDevice = (): boolean => {
  return !isMobileDevice();
};

/**
 * Get device type as string
 * @returns 'mobile' or 'desktop'
 */
export const getDeviceType = (): 'mobile' | 'desktop' => {
  return isMobileDevice() ? 'mobile' : 'desktop';
};
