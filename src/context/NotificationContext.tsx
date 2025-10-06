import React, { createContext, useContext, useState, useCallback, useRef, useEffect, useMemo } from 'react';

export type NotificationType = 'info' | 'success' | 'error' | 'warning';

export interface NotificationItem {
  id: string;
  message: string;
  type: NotificationType;
  createdAt: number;
  ttl: number; // milliseconds
}

interface NotificationContextValue {
  push: (message: string, type?: NotificationType, ttl?: number) => string;
  remove: (id: string) => void;
  clear: () => void;
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

  const push = useCallback((message: string, type: NotificationType = 'info', ttl: number = 4000) => {
    // Check for duplicate notifications using ref to avoid dependency issues
    const isDuplicate = itemsRef.current.some(item => item.message === message && item.type === type);
    if (isDuplicate) {
      return ''; // Return empty string for duplicate
    }
    
    const id = crypto.randomUUID();
    const item: NotificationItem = { id, message, type, createdAt: Date.now(), ttl };
    setItems(prev => [...prev, item]);
    if (ttl > 0) {
      timersRef.current[id] = window.setTimeout(() => remove(id), ttl);
    }
    return id;
  }, [remove]);

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
    clear
  }), [push, remove, clear]);

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
