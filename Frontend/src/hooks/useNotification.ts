// src/hooks/useNotification.ts
// Custom hook for managing notifications across the app

import { useState, useCallback } from 'react';

export interface Notification {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  id: string;
  duration?: number;
}

interface UseNotificationReturn {
  notifications: Notification[];
  addNotification: (type: Notification['type'], message: string, duration?: number) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
}

/**
 * Custom hook for managing notifications
 * 
 * Usage in component:
 * const { notifications, addNotification, removeNotification } = useNotification();
 * 
 * addNotification('success', 'Operation completed successfully!');
 * addNotification('error', 'Something went wrong!', 5000);
 * 
 * Then in JSX:
 * <NotificationToast notifications={notifications} onRemove={removeNotification} />
 */
export function useNotification(): UseNotificationReturn {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = useCallback((
    type: Notification['type'],
    message: string,
    duration: number = 4000
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    const notification: Notification = { type, message, id, duration };
    
    setNotifications(prev => [...prev, notification]);

    // Auto-remove after duration
    if (duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    addNotification,
    removeNotification,
    clearAll
  };
}