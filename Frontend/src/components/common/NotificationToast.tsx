// src/components/common/NotificationToast.tsx
// Reusable notification system for all HR pages

import { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export interface Notification {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  id: string;
  duration?: number;
}

interface NotificationToastProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

export default function NotificationToast({ notifications, onRemove }: NotificationToastProps) {
  return (
    <div className="fixed top-6 right-6 z-[200] space-y-2 max-w-sm pointer-events-none">
      {notifications.map(notif => (
        <NotificationItem
          key={notif.id}
          notification={notif}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onRemove: (id: string) => void;
}

function NotificationItem({ notification, onRemove }: NotificationItemProps) {
  useEffect(() => {
    const duration = notification.duration || 4000;
    const timer = setTimeout(() => {
      onRemove(notification.id);
    }, duration);

    return () => clearTimeout(timer);
  }, [notification.id, notification.duration, onRemove]);

  const getIcon = () => {
    switch (notification.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5" />;
      case 'error':
        return <AlertCircle className="w-5 h-5" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Info className="w-5 h-5" />;
    }
  };

  const getStyles = () => {
    const baseStyles = 'px-4 py-3 rounded-lg shadow-lg border font-medium text-sm animate-slide-in-right flex items-center gap-3 pointer-events-auto';
    
    switch (notification.type) {
      case 'success':
        return `${baseStyles} bg-emerald-50 border-emerald-200 text-emerald-800`;
      case 'error':
        return `${baseStyles} bg-red-50 border-red-200 text-red-800`;
      case 'warning':
        return `${baseStyles} bg-amber-50 border-amber-200 text-amber-800`;
      case 'info':
      default:
        return `${baseStyles} bg-blue-50 border-blue-200 text-blue-800`;
    }
  };

  return (
    <div className={getStyles()}>
      <span className="shrink-0">{getIcon()}</span>
      <span className="flex-1">{notification.message}</span>
      <button
        onClick={() => onRemove(notification.id)}
        className="shrink-0 p-0.5 hover:bg-black/10 rounded transition-colors"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}