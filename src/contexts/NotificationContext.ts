import { createContext, useContext } from 'react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
  createdAt: Date;
}

export interface NotificationOptions {
  type?: NotificationType;
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible?: boolean;
}

export interface NotificationContextType {
  notifications: Notification[];
  addNotification: (options: NotificationOptions) => string;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  success: (title: string, message?: string, options?: Partial<NotificationOptions>) => string;
  error: (title: string, message?: string, options?: Partial<NotificationOptions>) => string;
  warning: (title: string, message?: string, options?: Partial<NotificationOptions>) => string;
  info: (title: string, message?: string, options?: Partial<NotificationOptions>) => string;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Hook to use notification context
export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Re-export NotificationProvider for convenience
export { NotificationProvider } from './NotificationProvider';
