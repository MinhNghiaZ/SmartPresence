// Notification Models

export type NotificationType = 'info' | 'success' | 'error' | 'warning';

export interface NotificationItem {
    id: string;
    message: string;
    type: NotificationType;
    createdAt: number;
    ttl: number; // milliseconds
}
