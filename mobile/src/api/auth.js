import apiClient from './client';

export const authApi = {
    login: async (username, password) => {
        const response = await apiClient.post('auth/login/', { username, password });
        return response.data;
    },

    verifyLoginOTP: async (userId, otp) => {
        const response = await apiClient.post('auth/login/verify/', { user_id: userId, otp });
        return response.data;
    },

    register: async (userData) => {
        // Registration can be slow on Render (cold starts), so use longer timeout
        const config = {
            timeout: 120000 // 120 seconds for registration
        };

        const response = await apiClient.post('auth/register/', userData, config);
        return response.data;
    },

    validateRegistration: async (userData) => {
        const response = await apiClient.post('auth/register/?validate_only=true', userData);
        return response.data;
    },

    googleLogin: async (token) => {
        const response = await apiClient.post('auth/google/', { token });
        return response.data;
    },

    logout: async () => {
        // Backend logout only (blacklist token if applicable)
        // Client-side cleanup is handled by authStorage
    },

    getProfile: async () => {
        const response = await apiClient.get('users/profile/');
        return response.data;
    },

    updateProfile: async (data) => {
        console.log('[AuthAPI] Updating profile...', { hasFormData: data instanceof FormData });
        const response = await apiClient.patch('users/profile/', data);
        return response.data;
    },

    changePassword: async (data) => {
        const response = await apiClient.post('users/change-password/', data);
        return response.data;
    },

    updateMyLocation: async ({ latitude, longitude, is_online }) => {
        const response = await apiClient.patch('users/location/', { latitude, longitude, is_online });
        return response.data;
    },

    requestPasswordReset: async (identifier) => {
        const response = await apiClient.post('auth/password-reset/', { identifier });
        return response.data;
    },

    confirmPasswordReset: async (data) => {
        const response = await apiClient.post('auth/password-reset/confirm/', data);
        return response.data;
    },

    submitFeedback: async (content, category = 'Improvement') => {
        const response = await apiClient.post('users/feedback/', { content, category });
        return response.data;
    },

    getKycStatus: async () => {
        const response = await apiClient.get('kyc/status/');
        return response.data;
    }
};
