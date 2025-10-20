import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';
import type { NotificationType, NotificationItem, NotificationAction, NotificationOptions } from '../models';

interface NotificationContextValue {
  push: (message: string, type?: NotificationType, ttl?: number, title?: string, action?: NotificationAction) => string;
  remove: (id: string) => void;
  clear: () => void;
  // Enhanced notification methods with better context
  success: (message: string, options?: NotificationOptions) => string;
  error: (message: string, options?: NotificationOptions) => string;
  warning: (message: string, options?: NotificationOptions) => string;
  info: (message: string, options?: NotificationOptions) => string;
  // Specialized notifications for common scenarios
  attendance: {
    success: (subjectName: string, status: 'Present' | 'Late') => string;
    alreadyCheckedIn: () => string;
    notTimeYet: (startTime: string) => string;
    locationInvalid: (distance: number) => string;
    faceNotRegistered: () => string;
    faceNotRecognized: () => string;
  };
  auth: {
    loginSuccess: (userName: string) => string;
    loginFailed: () => string;
    sessionExpired: () => string;
    passwordChanged: () => string;
    invalidCredentials: () => string;
  };
  network: {
    offline: () => string;
    connectionError: () => string;
    slowConnection: () => string;
  };
  camera: {
    permissionDenied: () => string;
    notFound: () => string;
    inUse: () => string;
    error: (details?: string) => string;
  };
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
};

interface ProviderProps { children: React.ReactNode }

export const NotificationProvider: React.FC<ProviderProps> = ({ children }) => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const timersRef = useRef<Record<string, number>>({});
  const itemsRef = useRef<NotificationItem[]>([]);

  // Keep itemsRef in sync with items state
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const remove = useCallback((id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
    const timers = timersRef.current;
    if (timers[id]) {
      window.clearTimeout(timers[id]);
      delete timers[id];
    }
  }, []);

  const push = useCallback((
    message: string, 
    type: NotificationType = 'info', 
    ttl: number = 4000,
    title?: string,
    action?: NotificationAction
  ) => {
    // Check for duplicate notifications using ref to avoid dependency issues
    const isDuplicate = itemsRef.current.some(item => item.message === message && item.type === type);
    if (isDuplicate) {
      return ''; // Return empty string for duplicate
    }
    
    const id = crypto.randomUUID();
    const item: NotificationItem = { id, message, type, createdAt: Date.now(), ttl, title, action };
    setItems(prev => [...prev, item]);
    if (ttl > 0) {
      timersRef.current[id] = window.setTimeout(() => remove(id), ttl);
    }
    return id;
  }, [remove]);

  // Enhanced notification methods
  const success = useCallback((message: string, options?: NotificationOptions) => {
    return push(message, 'success', options?.ttl, options?.title, options?.action);
  }, [push]);

  const error = useCallback((message: string, options?: NotificationOptions) => {
    return push(message, 'error', options?.ttl || 5000, options?.title, options?.action);
  }, [push]);

  const warning = useCallback((message: string, options?: NotificationOptions) => {
    return push(message, 'warning', options?.ttl, options?.title, options?.action);
  }, [push]);

  const info = useCallback((message: string, options?: NotificationOptions) => {
    return push(message, 'info', options?.ttl, options?.title, options?.action);
  }, [push]);

  // Specialized attendance notifications
  const attendance = useMemo(() => ({
    success: (subjectName: string, status: 'Present' | 'Late') => {
      const icon = status === 'Present' ? '✅' : '⏰';
      const statusText = status === 'Present' ? 'Điểm danh thành công' : 'Điểm danh muộn';
      return success(
        `${icon} ${statusText} cho môn "${subjectName}"`,
        { title: 'Điểm danh thành công', ttl: 5000 }
      );
    },
    alreadyCheckedIn: () => {
      return warning(
        '⚠️ Bạn đã điểm danh cho môn học này rồi. Mỗi buổi học chỉ được điểm danh một lần.',
        { title: 'Đã điểm danh', ttl: 5000 }
      );
    },
    notTimeYet: (startTime: string) => {
      return warning(
        `⏰ Chưa tới giờ học. Thời gian bắt đầu: ${startTime}. Vui lòng quay lại vào đúng giờ học.`,
        { title: 'Chưa tới giờ', ttl: 6000 }
      );
    },
    locationInvalid: (distance: number) => {
      return error(
        `📍 Vị trí không hợp lệ. Bạn cách phòng học ${distance.toFixed(0)}m. Vui lòng đến lớp để điểm danh.`,
        { title: 'Vị trí không hợp lệ', ttl: 6000 }
      );
    },
    faceNotRegistered: () => {
      return warning(
        '👤 Bạn chưa đăng ký khuôn mặt. Vui lòng bấm nút "Đăng Ký Khuôn Mặt" trước khi điểm danh.',
        { title: 'Chưa đăng ký khuôn mặt', ttl: 6000 }
      );
    },
    faceNotRecognized: () => {
      return error(
        '❌ Không nhận diện được khuôn mặt. Vui lòng thử lại và đảm bảo khuôn mặt nằm trong khung hình.',
        { title: 'Nhận diện thất bại', ttl: 5000 }
      );
    }
  }), [success, warning, error]);

  // Auth notifications
  const auth = useMemo(() => ({
    loginSuccess: (userName: string) => {
      return success(
        `👋 Chào mừng ${userName}! Đăng nhập thành công.`,
        { title: 'Đăng nhập thành công', ttl: 3000 }
      );
    },
    loginFailed: () => {
      return error(
        '❌ Mã sinh viên hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.',
        { title: 'Đăng nhập thất bại', ttl: 5000 }
      );
    },
    sessionExpired: () => {
      return warning(
        '⏰ Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.',
        { title: 'Phiên hết hạn', ttl: 5000 }
      );
    },
    passwordChanged: () => {
      return success(
        '✅ Đổi mật khẩu thành công! Vui lòng đăng nhập lại với mật khẩu mới.',
        { title: 'Đổi mật khẩu', ttl: 4000 }
      );
    },
    invalidCredentials: () => {
      return error(
        '🔒 Thông tin đăng nhập không hợp lệ. Vui lòng kiểm tra lại mã sinh viên và mật khẩu.',
        { title: 'Thông tin không hợp lệ', ttl: 5000 }
      );
    }
  }), [success, warning, error]);

  // Network notifications
  const network = useMemo(() => ({
    offline: () => {
      return error(
        '📡 Không có kết nối mạng. Vui lòng kiểm tra kết nối Internet của bạn.',
        { title: 'Mất kết nối', ttl: 6000 }
      );
    },
    connectionError: () => {
      return error(
        '⚠️ Lỗi kết nối đến máy chủ. Vui lòng thử lại sau.',
        { title: 'Lỗi kết nối', ttl: 5000 }
      );
    },
    slowConnection: () => {
      return warning(
        '🐌 Kết nối mạng chậm. Một số tính năng có thể mất nhiều thời gian hơn bình thường.',
        { title: 'Mạng chậm', ttl: 4000 }
      );
    }
  }), [warning, error]);

  // Camera notifications
  const camera = useMemo(() => ({
    permissionDenied: () => {
      return error(
        '📷 Quyền truy cập camera bị từ chối. Vui lòng cấp quyền camera trong cài đặt trình duyệt.',
        { title: 'Cần quyền camera', ttl: 6000 }
      );
    },
    notFound: () => {
      return error(
        '📷 Không tìm thấy camera. Vui lòng kiểm tra camera có được kết nối không.',
        { title: 'Không có camera', ttl: 5000 }
      );
    },
    inUse: () => {
      return error(
        '🔒 Camera đang được sử dụng bởi ứng dụng khác. Vui lòng đóng các ứng dụng khác và thử lại.',
        { title: 'Camera bận', ttl: 6000 }
      );
    },
    error: (details?: string) => {
      const message = details 
        ? `❌ Lỗi camera: ${details}. Vui lòng thử lại.`
        : '❌ Lỗi camera. Vui lòng kiểm tra camera và thử lại.';
      return error(message, { title: 'Lỗi camera', ttl: 5000 });
    }
  }), [error]);

  const clear = useCallback(() => {
    Object.values(timersRef.current).forEach(t => window.clearTimeout(t));
    timersRef.current = {};
    setItems([]);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => clear(), [clear]);

  const contextValue = useMemo(() => ({
    push,
    remove,
    clear,
    success,
    error,
    warning,
    info,
    attendance,
    auth,
    network,
    camera
  }), [push, remove, clear, success, error, warning, info, attendance, auth, network, camera]);

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <div className="notification-portal" aria-live="polite" aria-atomic="true">
        {items.map(item => (
          <div
            key={item.id}
            className={`notification toast-${item.type}`}
            role="status"
          >
            <div className="notification-content">
              <span className="notification-message">{item.message}</span>
            </div>
            <button
              className="notification-close"
              aria-label="Đóng thông báo"
              onClick={() => remove(item.id)}
            >✕</button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
};

// Re-export types for convenience
export type { NotificationType, NotificationItem } from '../models';
