import apiClient from './client';

export const authApi = {
    login: async (username, password) => {
        const response = await apiClient.post('/auth/login/', { username, password });
        return response.data;
    },

    register: async (userData) => {
        const response = await apiClient.post('/auth/register/', userData);
        return response.data;
    },

    googleLogin: async (token) => {
        const response = await apiClient.post('/auth/google/', { token });
        return response.data;
    },

    logout: async () => {
        // Backend logout only (blacklist token if applicable)
        // Client-side cleanup is handled by authStorage
    },

    getProfile: async () => {
        const response = await apiClient.get('/users/profile/');
        return response.data;
    },

    updateProfile: async (data) => {
        // data can be FormData for image upload
        const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
        const response = await apiClient.patch('/users/profile/', data, { headers });
        return response.data;
    },

    changePassword: async (data) => {
        const response = await apiClient.post('/users/change-password/', data);
        return response.data;
    }
};
