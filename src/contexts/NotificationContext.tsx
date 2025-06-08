import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

// Inline type definitions to avoid import issues
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

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number;
  defaultDuration?: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  maxNotifications = 5,
  defaultDuration = 5000
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const generateId = useCallback(() => {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const addNotification = useCallback((options: NotificationOptions): string => {
    const id = generateId();
    const notification: Notification = {
      id,
      type: options.type || 'info',
      title: options.title,
      message: options.message,
      duration: options.duration !== undefined ? options.duration : defaultDuration,
      action: options.action,
      dismissible: options.dismissible !== false, // default to true
      createdAt: new Date()
    };

    setNotifications(prev => {
      const newNotifications = [notification, ...prev];
      
      // Limit the number of notifications
      if (newNotifications.length > maxNotifications) {
        return newNotifications.slice(0, maxNotifications);
      }
      
      return newNotifications;
    });

    // Auto-remove notification after duration (if not persistent)
    if (notification.duration && notification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, notification.duration);
    }

    return id;
  }, [generateId, defaultDuration, maxNotifications]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Convenience methods
  const success = useCallback((title: string, message?: string, options?: Partial<NotificationOptions>) => {
    return addNotification({
      ...options,
      type: 'success',
      title,
      message
    });
  }, [addNotification]);

  const error = useCallback((title: string, message?: string, options?: Partial<NotificationOptions>) => {
    return addNotification({
      ...options,
      type: 'error',
      title,
      message,
      duration: options?.duration !== undefined ? options.duration : 8000 // Longer for errors
    });
  }, [addNotification]);

  const warning = useCallback((title: string, message?: string, options?: Partial<NotificationOptions>) => {
    return addNotification({
      ...options,
      type: 'warning',
      title,
      message,
      duration: options?.duration !== undefined ? options.duration : 6000
    });
  }, [addNotification]);

  const info = useCallback((title: string, message?: string, options?: Partial<NotificationOptions>) => {
    return addNotification({
      ...options,
      type: 'info',
      title,
      message
    });
  }, [addNotification]);

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export default NotificationProvider;
