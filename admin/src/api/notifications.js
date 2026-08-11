import apiClient from './client';

export const notificationsApi = {
    // Get all notifications
    getNotifications: async () => {
        const response = await apiClient.get('/admin/notifications/');
        return response.data;
    },

    // Mark notification as read
    markAsRead: async (id) => {
        const response = await apiClient.post(`/admin/notifications/${id}/mark-read/`);
        return response.data;
    },

    // Mark all notifications as read
    markAllAsRead: async () => {
        const response = await apiClient.post('/admin/notifications/mark-all-read/');
        return response.data;
    }
};
