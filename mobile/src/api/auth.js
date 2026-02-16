import apiClient from './client';

export const authApi = {
    login: async (username, password) => {
        const response = await apiClient.post('auth/login/', { username, password });
        return response.data;
    },

    register: async (userData) => {
        // Registration can be slow on Render (cold starts), so use longer timeout
        const isFormData = userData instanceof FormData;
        const headers = isFormData ? { 'Content-Type': 'multipart/form-data' } : {};

        const response = await apiClient.post('auth/register/', userData, {
            headers,
            timeout: 120000 // 120 seconds for registration
        });
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
        // Let Axios handle Content-Type for FormData (it needs to set the boundary)
        const headers = data instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : {};
        // actually, for React Native Axios, sometimes we DO need to let it set boundary automatically.
        // But in many RN versions, passing 'multipart/form-data' manually WITHOUT boundary fails.
        // Best practice: Don't set Content-Type header manually for FormData, let the instance handle it.

        const config = {};
        if (data instanceof FormData) {
            // In React Native, do NOT set Content-Type: null or undefined.
            // Just ensure there is NO Content-Type header in the request config
            // and Axios will automatically set it to multipart/form-data with the boundary.
            // However, since our instance has a default 'application/json', we must override/remove it.
            config.headers = {
                'Accept': 'application/json',
            };
            // delete config.headers['Content-Type']; // Not enough if merging defaults
            // Instead, we can use a fresh headers object without Content-Type
            // to let the FormData adapter handle it.
            config.transformRequest = (d) => d;
        }

        console.log('[AuthAPI] Updating profile...', { hasFormData: data instanceof FormData });
        const response = await apiClient.patch('users/profile/', data, config);
        return response.data;
    },

    changePassword: async (data) => {
        const response = await apiClient.post('users/change-password/', data);
        return response.data;
    },

    requestPasswordReset: async (email) => {
        const response = await apiClient.post('auth/password-reset/', { email });
        return response.data;
    }
};
