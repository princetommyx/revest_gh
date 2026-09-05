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

    googleLogin: async (token, role) => {
        const response = await apiClient.post('auth/google/', role ? { token, role } : { token });
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

    deactivateAccount: async (password) => {
        const response = await apiClient.post('users/account/deactivate/', password ? { password } : {});
        return response.data;
    },

    deleteAccount: async (password) => {
        const response = await apiClient.post('users/account/delete/', password ? { password } : {});
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

    verifyPasswordResetOtp: async (identifier, otp) => {
        const response = await apiClient.post('auth/password-reset/verify/', { identifier, otp });
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
        // users/urls.py is mounted under /api/v1/auth/ and /api/v1/users/,
        // so the KYC routes live below one of those - not at /api/v1/kyc/.
        const response = await apiClient.get('auth/kyc/status/');
        return response.data;
    }
};
