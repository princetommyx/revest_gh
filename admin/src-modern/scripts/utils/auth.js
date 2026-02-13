// ==========================================================================
// Authentication Utilities
// Handles user authentication and session management
// ==========================================================================

import { apiClient, tokenManager } from './api-config.js';

const USER_KEY = 'admin_user';

export const authManager = {
    // Login
    async login(credentials) {
        try {
            // Call auth/login endpoint
            const response = await apiClient.post('auth/login/', credentials);

            // Store tokens
            if (response.access) {
                tokenManager.setToken(response.access);
            }
            if (response.refresh) {
                tokenManager.setRefreshToken(response.refresh);
            }

            // Store user data
            if (response.user) {
                this.setUser(response.user);
            }

            return response;
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    },

    // Logout
    logout() {
        tokenManager.clearTokens();
        this.clearUser();
        window.location.href = '/login.html';
    },

    // Check if user is authenticated
    isAuthenticated() {
        return tokenManager.hasToken() && this.getUser() !== null;
    },

    // Check if user is admin
    isAdmin() {
        const user = this.getUser();
        return user && (user.is_staff || user.is_superuser);
    },

    // Get current user
    getUser() {
        const userData = localStorage.getItem(USER_KEY);
        return userData ? JSON.parse(userData) : null;
    },

    // Set current user
    setUser(user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    },

    // Clear user data
    clearUser() {
        localStorage.removeItem(USER_KEY);
    },

    // Get user profile from backend
    async fetchUserProfile() {
        try {
            const response = await apiClient.get('users/profile/');
            this.setUser(response);
            return response;
        } catch (error) {
            console.error('Failed to fetch user profile:', error);
            // If fetch fails due to auth, logout
            if (error.message.includes('Unauthorized')) {
                this.logout();
            }
            throw error;
        }
    },

    // Refresh authentication token
    async refreshToken() {
        try {
            const refreshToken = tokenManager.getRefreshToken();
            if (!refreshToken) {
                throw new Error('No refresh token available');
            }

            const response = await apiClient.post('auth/refresh/', {
                refresh: refreshToken
            });

            if (response.access) {
                tokenManager.setToken(response.access);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Token refresh failed:', error);
            this.logout();
            return false;
        }
    },

    // Initialize auth check (call on page load)
    async initAuth() {
        // If not authenticated, redirect to login
        if (!this.isAuthenticated()) {
            // Allow access to login page without auth
            if (!window.location.pathname.includes('login')) {
                window.location.href = '/login.html';
            }
            return false;
        }

        // Verify user is admin
        if (!this.isAdmin()) {
            // User is logged in but not an admin
            alert('Access denied. Admin privileges required.');
            this.logout();
            return false;
        }

        // Try to fetch fresh user data
        try {
            await this.fetchUserProfile();
            return true;
        } catch (error) {
            // If profile fetch fails, user might be logged out
            return false;
        }
    }
};

// Auto-redirect to login if not authenticated (except on login page)
export function requireAuth() {
    if (!window.location.pathname.includes('login')) {
        if (!authManager.isAuthenticated()) {
            window.location.href = '/login.html';
            return false;
        }

        if (!authManager.isAdmin()) {
            alert('Access denied. Admin privileges required.');
            authManager.logout();
            return false;
        }
    }
    return true;
}

export default authManager;
