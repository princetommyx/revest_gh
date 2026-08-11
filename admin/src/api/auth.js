import apiClient from './client';

export const authApi = {
    // Login admin user
    login: async (credentials) => {
        const response = await apiClient.post('auth/login/', credentials);
        if (response.data.access) {
            localStorage.setItem('admin_token', response.data.access);
        }
        return response.data;
    },

    // Verify OTP for login
    verifyOTP: async (userId, otp) => {
        const response = await apiClient.post('auth/login/verify/', { user_id: userId, otp });
        if (response.data.access) {
            localStorage.setItem('admin_token', response.data.access);
        }
        return response.data;
    },

    // Logout
    logout: () => {
        localStorage.removeItem('admin_token');
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        return !!localStorage.getItem('admin_token');
    },

    // Get current user info
    getCurrentUser: async () => {
        const response = await apiClient.get('users/me/');
        return response.data;
    },
};
