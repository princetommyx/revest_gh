import apiClient from './client';

export const usersApi = {
    // Get admin dashboard stats
    getStats: async () => {
        const response = await apiClient.get('/users/admin/stats/');
        return response.data;
    },

    // Get all users with filters
    getUsers: async (params = {}) => {
        const response = await apiClient.get('/admin/users/', { params });
        return response.data;
    },

    // Get recent users
    getRecentUsers: async () => {
        const response = await apiClient.get('/users/admin/recent-users/');
        return response.data;
    },

    // Get user by ID
    getUserById: async (id) => {
        const response = await apiClient.get(`/admin/users/${id}/`);
        return response.data;
    },

    // Delete user
    deleteUser: async (id) => {
        await apiClient.delete(`/admin/users/${id}/`);
    },

    // Send message to user
    sendMessage: async (id, data) => {
        const response = await apiClient.post(`/admin/users/${id}/send-message/`, data);
        return response.data;
    },
};
