// Notification Models

export type NotificationType = 'info' | 'success' | 'error' | 'warning';

export interface NotificationItem {
    id: string;
    message: string;
    type: NotificationType;
    createdAt: number;
    ttl: number; // milliseconds
    title?: string; // Optional title for notification
    action?: NotificationAction; // Optional action button
}

export interface NotificationAction {
    label: string;
    onClick: () => void;
}

// Pre-defined notification templates for common scenarios
export interface NotificationTemplate {
  message: string;
  type: NotificationType;
  ttl?: number;
  title?: string;
}

export interface NotificationOptions {
  ttl?: number;
  title?: string;
  action?: NotificationAction;
}