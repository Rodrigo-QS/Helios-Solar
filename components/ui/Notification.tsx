import React, { useEffect } from 'react';
import { CheckCircle, Info, XCircle, X } from 'lucide-react';

export interface NotificationItem {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}

interface NotificationProps {
  notification: NotificationItem | null;
  onClose: () => void;
}

export const Notification: React.FC<NotificationProps> = ({ notification, onClose }) => {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        onClose();
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-primary" />,
    info: <Info className="w-5 h-5 text-blue-400" />,
    error: <XCircle className="w-5 h-5 text-red-400" />
  };

  const colors = {
    success: 'border-primary/20 bg-primary/10',
    info: 'border-blue-500/20 bg-blue-500/10',
    error: 'border-red-500/20 bg-red-500/10'
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 p-4 rounded-xl border backdrop-blur-xl shadow-2xl animate-bounce-in ${colors[notification.type]} min-w-[300px]`}>
      {icons[notification.type]}
      <div className="flex-1">
        <p className="text-sm font-medium text-white">{notification.message}</p>
      </div>
      <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
        <X size={16} />
      </button>
    </div>
  );
};