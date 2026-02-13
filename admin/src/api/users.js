import apiClient from './client';

export const usersApi = {
    // Get admin dashboard stats
    getStats: async () => {
        const response = await apiClient.get('/users/admin/stats/');
        return response.data;
    },

    // Get all users with filters
    getUsers: async (params = {}) => {
        const response = await apiClient.get('/users/', { params });
        return response.data;
    },

    // Get recent users
    getRecentUsers: async () => {
        const response = await apiClient.get('/users/admin/recent-users/');
        return response.data;
    },

    // Get user by ID
    getUserById: async (id) => {
        const response = await apiClient.get(`/users/${id}/`);
        return response.data;
    },
};
