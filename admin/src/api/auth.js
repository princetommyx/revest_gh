import apiClient from './client';

// The login response carries both tokens. Only the access token used to be
// kept, which left nothing to refresh with - so the session died with that
// token an hour later. See the refresh interceptor in client.js.
function storeTokens(data) {
    if (data?.access) localStorage.setItem('admin_token', data.access);
    if (data?.refresh) localStorage.setItem('admin_refresh_token', data.refresh);
}

export const authApi = {
    // Login admin user
    login: async (credentials) => {
        const response = await apiClient.post('auth/login/', credentials);
        storeTokens(response.data);
        return response.data;
    },

    // Verify OTP for login
    verifyOTP: async (userId, otp) => {
        const response = await apiClient.post('auth/login/verify/', { user_id: userId, otp });
        storeTokens(response.data);
        return response.data;
    },

    // Logout
    logout: () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_refresh_token');
    },

    // Check if user is authenticated
    isAuthenticated: () => {
        return !!localStorage.getItem('admin_token');
    },

    // Change the signed-in admin's password.
    changePassword: async ({ oldPassword, newPassword }) => {
        const response = await apiClient.post('users/change-password/', {
            old_password: oldPassword,
            new_password: newPassword,
            new_password2: newPassword,
        });
        return response.data;
    },

    // Get current user info
    getCurrentUser: async () => {
        const response = await apiClient.get('users/me/');
        return response.data;
    },
};
