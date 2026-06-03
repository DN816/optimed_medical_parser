import React from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { formatIST, timeAgo } from '../services/dateUtils';
import {
  X, CheckCheck, Trash2, Bell, BellOff,
  CheckCircle2, AlertTriangle, XCircle, Info
} from 'lucide-react';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const typeConfig = {
  success: {
    icon: <CheckCircle2 className="w-4 h-4" />,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-100',
    dot: 'bg-green-500',
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4" />,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    dot: 'bg-amber-500',
  },
  error: {
    icon: <XCircle className="w-4 h-4" />,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-100',
    dot: 'bg-red-500',
  },
  info: {
    icon: <Info className="w-4 h-4" />,
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
    dot: 'bg-blue-500',
  },
};

export const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    removeNotification,
  } = useNotification();

  if (!isOpen) return null;

  // Group notifications: Today vs Earlier
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const todayNotifications = notifications.filter(
    n => new Date(n.timestamp).getTime() >= todayStart
  );
  const earlierNotifications = notifications.filter(
    n => new Date(n.timestamp).getTime() < todayStart
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute right-0 top-full mt-2 w-96 max-h-[32rem] bg-white rounded-xl shadow-2xl border border-slate-200 z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
        
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-800">Notifications</h3>
            {unreadCount > 0 && (
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={clearNotifications}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Clear all notifications"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center px-6">
              <BellOff className="w-10 h-10 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-slate-500">No notifications yet</p>
              <p className="text-xs text-slate-400 mt-1">
                You'll see bill processing updates, batch completions, and system alerts here.
              </p>
            </div>
          ) : (
            <>
              {/* Today */}
              {todayNotifications.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Today
                  </div>
                  {todayNotifications.map(n => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onMarkRead={() => markAsRead(n.id)}
                      onRemove={() => removeNotification(n.id)}
                    />
                  ))}
                </div>
              )}

              {/* Earlier */}
              {earlierNotifications.length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                    Earlier
                  </div>
                  {earlierNotifications.map(n => (
                    <NotificationItem
                      key={n.id}
                      notification={n}
                      onMarkRead={() => markAsRead(n.id)}
                      onRemove={() => removeNotification(n.id)}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

// Individual notification row
const NotificationItem: React.FC<{
  notification: import('../types').AppNotification;
  onMarkRead: () => void;
  onRemove: () => void;
}> = ({ notification, onMarkRead, onRemove }) => {
  const config = typeConfig[notification.type] || typeConfig.info;

  return (
    <div
      className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50/50 transition cursor-pointer group relative ${
        !notification.read ? 'bg-blue-50/30' : ''
      }`}
      onClick={() => {
        if (!notification.read) onMarkRead();
      }}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={`p-1.5 rounded-lg ${config.bg} ${config.color} shrink-0 mt-0.5`}>
          {config.icon}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-medium ${!notification.read ? 'text-slate-900' : 'text-slate-600'} leading-snug`}>
              {notification.title}
            </p>
            {/* Unread dot */}
            {!notification.read && (
              <div className={`w-2 h-2 rounded-full ${config.dot} shrink-0 mt-1.5`} />
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">
            {notification.description}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">
            {timeAgo(notification.timestamp)}
          </p>
        </div>

        {/* Remove button (on hover) */}
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
          title="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};
