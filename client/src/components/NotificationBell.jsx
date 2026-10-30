import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2, Clock, CheckCircle2, User, LogOut, X, AlertTriangle } from 'lucide-react';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

export default function NotificationBell() {
  const { isWarden } = useAuth();
  const { showToast } = useToast();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const prevUnreadRef = useRef(0);
  const dropdownRef = useRef(null);

  const fetchNotifications = async (silent = true) => {
    if (!isWarden) return;
    try {
      if (!silent) setLoading(true);
      const res = await api.getWardenNotifications();
      if (res.success) {
        setNotifications(res.notifications || []);
        const newUnread = res.unreadCount || 0;

        // If unread count increased, alert the warden
        if (newUnread > prevUnreadRef.current && prevUnreadRef.current !== 0) {
          const latest = res.notifications?.[0];
          if (latest) {
            showToast(`🔔 ${latest.title}: ${latest.message}`, 'info', 5000);
          }
        }
        prevUnreadRef.current = newUnread;
        setUnreadCount(newUnread);
      }
    } catch (e) {
      console.warn('Notifications fetch error', e);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!isWarden) return;
    fetchNotifications(true);
    const interval = setInterval(() => fetchNotifications(true), 6000);
    return () => clearInterval(interval);
  }, [isWarden]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await api.markNotificationRead(id);
      fetchNotifications(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      showToast('All notifications marked as read', 'success');
      fetchNotifications(true);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearRead = async () => {
    try {
      await api.clearReadNotifications();
      showToast('Cleared read notifications', 'info');
      fetchNotifications(true);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isWarden) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications(false);
        }}
        className="relative p-2 text-slate-600 hover:text-amber-800 hover:bg-amber-50 rounded-xl transition-all border border-slate-200"
        title="Warden Live Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-black text-white shadow-sm ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Live Warden Alerts</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-amber-300 hover:text-white px-2 py-0.5 rounded hover:bg-white/10 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">Loading alerts...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                No notification alerts yet. Incoming bookings and vacates will appear here live.
              </div>
            ) : (
              notifications.map((n) => {
                let badgeBg = 'bg-slate-100 text-slate-700';
                let Icon = Bell;

                if (n.type === 'booking_confirmed') {
                  badgeBg = 'bg-emerald-100 text-emerald-800';
                  Icon = CheckCircle2;
                } else if (n.type === 'bed_reserved') {
                  badgeBg = 'bg-amber-100 text-amber-800';
                  Icon = Clock;
                } else if (n.type === 'room_vacated') {
                  badgeBg = 'bg-rose-100 text-rose-800';
                  Icon = LogOut;
                } else if (n.type === 'reservation_cancelled') {
                  badgeBg = 'bg-purple-100 text-purple-800';
                  Icon = X;
                }

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.is_read) handleMarkRead(n.id);
                    }}
                    className={`p-3.5 transition-colors cursor-pointer flex items-start gap-3 ${
                      n.is_read ? 'bg-white hover:bg-slate-50 opacity-75' : 'bg-amber-50/40 hover:bg-amber-50/80 font-medium'
                    }`}
                  >
                    <div className={`p-2 rounded-lg flex-shrink-0 mt-0.5 ${badgeBg}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {n.title}
                        </span>
                        {!n.is_read && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                        )}
                      </div>

                      <p className="text-xs text-slate-600 leading-snug">
                        {n.message}
                      </p>

                      <div className="text-[10px] text-slate-400 flex items-center justify-between pt-0.5">
                        <span>{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(n.created_at).toLocaleDateString()}</span>
                        {!n.is_read && (
                          <span className="text-indigo-600 hover:underline">Click to mark read</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.some(n => n.is_read) && (
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={handleClearRead}
                className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center justify-center gap-1 mx-auto font-medium"
              >
                <Trash2 className="w-3 h-3" /> Clear read alerts
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
