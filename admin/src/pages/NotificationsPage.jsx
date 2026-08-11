import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Bell, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { notificationsApi } from '../api/notifications';

export default function NotificationsPage() {
    const [filter, setFilter] = useState('all'); // all, unread, read
    const queryClient = useQueryClient();

    const { data: notificationsData = {}, isLoading } = useQuery({
        queryKey: ['all-notifications'],
        queryFn: notificationsApi.getNotifications,
    });

    // Handle both array (if no pagination) and paginated response
    const notifications = Array.isArray(notificationsData)
        ? notificationsData
        : (notificationsData.results || []);

    const markAsReadMutation = useMutation({
        mutationFn: notificationsApi.markAsRead,
        onMutate: async (notificationId) => {
            await queryClient.cancelQueries(['all-notifications']);
            const previousNotifications = queryClient.getQueryData(['all-notifications']);

            queryClient.setQueryData(['all-notifications'], (old) =>
                old ? old.map(n => n.id === notificationId ? { ...n, is_read: true } : n) : []
            );

            return { previousNotifications };
        },
        onError: (err, notificationId, context) => {
            queryClient.setQueryData(['all-notifications'], context.previousNotifications);
        },
        onSettled: () => {
            queryClient.invalidateQueries(['all-notifications']);
            queryClient.invalidateQueries(['notifications']);
        }
    });

    const markAllAsReadMutation = useMutation({
        mutationFn: notificationsApi.markAllAsRead,
        onMutate: async () => {
            await queryClient.cancelQueries(['all-notifications']);
            const previousNotifications = queryClient.getQueryData(['all-notifications']);

            queryClient.setQueryData(['all-notifications'], (old) =>
                old ? old.map(n => ({ ...n, is_read: true })) : []
            );

            return { previousNotifications };
        },
        onError: (err, variables, context) => {
            queryClient.setQueryData(['all-notifications'], context.previousNotifications);
        },
        onSettled: () => {
            queryClient.invalidateQueries(['all-notifications']);
            queryClient.invalidateQueries(['notifications']);
        }
    });

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

    const filteredNotifications = notifications.filter(n => {
        if (filter === 'unread') return !n.is_read;
        if (filter === 'read') return n.is_read;
        return true;
    });

    const unreadCount = notifications.filter(n => !n.is_read).length;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={() => markAllAsReadMutation.mutate()}
                        disabled={markAllAsReadMutation.isLoading}
                        className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition-all hover-scale shadow-lg disabled:opacity-50"
                    >
                        {markAllAsReadMutation.isLoading ? (
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        ) : (
                            <CheckCircle className="w-5 h-5 mr-2" />
                        )}
                        Mark All as Read
                    </button>
                )}
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${filter === 'all'
                            ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        All ({notifications.length})
                    </button>
                    <button
                        onClick={() => setFilter('unread')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${filter === 'unread'
                            ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Unread ({unreadCount})
                    </button>
                    <button
                        onClick={() => setFilter('read')}
                        className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${filter === 'read'
                            ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Read ({notifications.length - unreadCount})
                    </button>
                </div>
            </div>

            {/* Notifications List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                {isLoading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="w-8 h-8 mx-auto mb-3 animate-spin text-purple-500" />
                        <p className="text-sm text-gray-500">Loading notifications...</p>
                    </div>
                ) : filteredNotifications.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                        <p className="text-lg font-medium">No notifications</p>
                        <p className="text-sm text-gray-400 mt-1">
                            {filter === 'unread' ? "You're all caught up!" : 'No notifications to display'}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-100">
                        {filteredNotifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-5 hover:bg-gray-50 transition-colors ${!notification.is_read ? 'bg-purple-50/30' : ''
                                    }`}
                            >
                                <div className="flex items-start space-x-4">
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${getIconBg(notification.type)}`}>
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center space-x-2">
                                                    <h3 className="text-base font-semibold text-gray-900">
                                                        {notification.title}
                                                    </h3>
                                                    {!notification.is_read && (
                                                        <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                                                    )}
                                                </div>
                                                <p className="text-sm text-gray-600 mt-1">
                                                    {notification.message}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-2">
                                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                                                </p>
                                            </div>
                                            <div className="flex items-center space-x-2 ml-4">
                                                {!notification.is_read && (
                                                    <button
                                                        onClick={() => markAsReadMutation.mutate(notification.id)}
                                                        className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                                                        title="Mark as read"
                                                    >
                                                        <CheckCircle className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
