import apiClient from './client';

export const notificationsApi = {
    // Register the expo push token with backend
    registerToken: async (token) => {
        try {
            const response = await apiClient.post('users/push-token/', { push_token: token });
            return response.data;
        } catch (error) {
            console.log('Error registering token:', error);
            throw error;
        }
    },

    // Get list of notifications
    getNotifications: async () => {
        const response = await apiClient.get('users/notifications/');
        return response.data;
    },

    // Mark single notification as read
    markAsRead: async (id) => {
        const response = await apiClient.patch(`users/notifications/${id}/`);
        return response.data;
    },

    // Mark all as read
    markAllAsRead: async () => {
        const response = await apiClient.patch('users/notifications/');
        return response.data;
    }
};
