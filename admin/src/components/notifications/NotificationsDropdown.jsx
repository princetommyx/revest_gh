import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Bell, CheckCircle, AlertCircle, Info, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { notificationsApi } from '../../api/notifications';

export default function NotificationsDropdown({ isOpen, onClose }) {
    const dropdownRef = useRef(null);
    const queryClient = useQueryClient();

    const { data: notificationsData = {}, isLoading } = useQuery({
        queryKey: ['notifications'],
        queryFn: notificationsApi.getNotifications,
        enabled: isOpen,
    });

    const notifications = Array.isArray(notificationsData)
        ? notificationsData
        : (notificationsData.results || []);

    const markAsReadMutation = useMutation({
        mutationFn: notificationsApi.markAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
        }
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: notificationsApi.markAllAsRead,
        onSuccess: () => {
            queryClient.invalidateQueries(['notifications']);
        }
    });

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const getIcon = (type) => {
        switch (type) {
            case 'success':
                return <CheckCircle className="w-5 h-5 text-green-600" />;
            case 'warning':
            case 'error':
                return <AlertCircle className="w-5 h-5 text-orange-600" />;
            default:
                return <Info className="w-5 h-5 text-blue-600" />;
        }
    };

    const getIconBg = (type) => {
        switch (type) {
            case 'success':
                return 'bg-green-100';
            case 'warning':
            case 'error':
                return 'bg-orange-100';
            default:
                return 'bg-blue-100';
        }
    };

    return (
        <div
            ref={dropdownRef}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 animate-scale-in"
        >
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 rounded-t-xl">
                <div>
                    <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                        <p className="text-xs text-gray-600">{unreadCount} unread</p>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={() => markAllAsReadMutation.mutate()}
                        className="text-xs text-purple-600 hover:text-purple-700 font-medium"
                    >
                        Mark all read
                    </button>
                )}
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
                {isLoading ? (
                    <div className="p-8 text-center text-gray-500">
                        <Bell className="w-8 h-8 mx-auto mb-2 animate-pulse" />
                        <p className="text-sm">Loading notifications...</p>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p className="text-sm font-medium">No notifications</p>
                        <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
                    </div>
                ) : (
                    notifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.is_read ? 'bg-purple-50/30' : ''
                                }`}
                            onClick={() => {
                                if (!notification.is_read) {
                                    markAsReadMutation.mutate(notification.id);
                                }
                            }}
                        >
                            <div className="flex items-start space-x-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getIconBg(notification.type)}`}>
                                    {getIcon(notification.type)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between">
                                        <p className="text-sm font-medium text-gray-900 line-clamp-1">
                                            {notification.title}
                                        </p>
                                        {!notification.is_read && (
                                            <div className="w-2 h-2 bg-purple-600 rounded-full flex-shrink-0 ml-2 mt-1"></div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                        {notification.message}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                    <button
                        onClick={() => {
                            window.location.href = '/notifications';
                            onClose();
                        }}
                        className="text-xs text-purple-600 hover:text-purple-700 font-medium w-full text-center"
                    >
                        View all notifications
                    </button>
                </div>
            )}
        </div>
    );
}
