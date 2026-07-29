import React from 'react';
import { CheckCircle2, XCircle, Info } from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export interface ToastNotificationProps {
  toasts: ToastItem[];
  onDismiss?: (id: string) => void;
}

export const ToastNotification: React.FC<ToastNotificationProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`toast toast-${toast.type}`}
          onClick={() => onDismiss && onDismiss(toast.id)}
          style={{ cursor: onDismiss ? 'pointer' : 'default' }}
        >
          {toast.type === 'success' && <CheckCircle2 className="text-success" size={18} />}
          {toast.type === 'error' && <XCircle className="text-danger" size={18} />}
          {toast.type === 'info' && <Info className="text-info" size={18} />}
          <span>{toast.message}</span>
        </div>
      ))}
    </div>
  );
};

export default ToastNotification;
