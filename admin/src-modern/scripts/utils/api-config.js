// ==========================================================================
// API Configuration and Client
// Handles all HTTP requests to the Django backend
// ==========================================================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Token Management
const TOKEN_KEY = 'admin_auth_token';
const REFRESH_TOKEN_KEY = 'admin_refresh_token';

export const tokenManager = {
    getToken() {
        return localStorage.getItem(TOKEN_KEY);
    },

    setToken(token) {
        localStorage.setItem(TOKEN_KEY, token);
    },

    getRefreshToken() {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    },

    setRefreshToken(token) {
        localStorage.setItem(REFRESH_TOKEN_KEY, token);
    },

    clearTokens() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
    },

    hasToken() {
        return !!this.getToken();
    }
};

// API Client Class
class ApiClient {
    constructor(baseURL = API_BASE_URL) {
        this.baseURL = baseURL;
    }

    // Build full URL
    buildUrl(endpoint) {
        // Remove leading slash from endpoint if present
        const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
        // Ensure baseURL ends with /
        const cleanBase = this.baseURL.endsWith('/') ? this.baseURL : `${this.baseURL}/`;
        return `${cleanBase}${cleanEndpoint}`;
    }

    // Get authorization headers
    getHeaders(customHeaders = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...customHeaders
        };

        const token = tokenManager.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return headers;
    }

    // Handle response
    async handleResponse(response) {
        // Check if response is ok
        if (!response.ok) {
            // Handle 401 Unauthorized
            if (response.status === 401) {
                // Handle 401 Unauthorized - redirect to login
                tokenManager.clearTokens();
                window.location.href = '/login.html';
                throw new Error('Unauthorized - redirecting to login');
            }

            // Handle 403 Forbidden
            if (response.status === 403) {
                throw new Error('Forbidden - You do not have permission to access this resource');
            }

            // Try to parse error message from response
            let errorMessage = `HTTP Error ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.detail || errorData.message || errorMessage;
            } catch (e) {
                // If JSON parsing fails, use status text
                errorMessage = response.statusText || errorMessage;
            }

            throw new Error(errorMessage);
        }

        // Parse JSON response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }

        // Return text for non-JSON responses
        return await response.text();
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = this.buildUrl(endpoint);
        const config = {
            ...options,
            headers: this.getHeaders(options.headers)
        };

        try {
            const response = await fetch(url, config);
            return await this.handleResponse(response);
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    }

    // GET request
    async get(endpoint, params = {}) {
        // Build query string from params
        const queryString = new URLSearchParams(params).toString();
        const url = queryString ? `${endpoint}?${queryString}` : endpoint;

        return this.request(url, {
            method: 'GET'
        });
    }

    // POST request
    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    // PUT request
    async put(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // PATCH request
    async patch(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data)
        });
    }

    // DELETE request
    async delete(endpoint) {
        return this.request(endpoint, {
            method: 'DELETE'
        });
    }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Admin API Endpoints
export const adminApi = {
    // Dashboard Statistics
    async getStats() {
        return apiClient.get('admin/stats/');
    },

    // User Management
    async getUsers(filters = {}) {
        return apiClient.get('admin/users/', filters);
    },

    async getUser(userId) {
        return apiClient.get(`admin/users/${userId}/`);
    },

    async updateUser(userId, data) {
        return apiClient.patch(`admin/users/${userId}/`, data);
    },

    async getUserActivity(userId) {
        return apiClient.get(`admin/users/${userId}/activity/`);
    },

    // Activity Logs
    async getActivityLogs(filters = {}) {
        return apiClient.get('admin/activity/', filters);
    },

    // Support Tickets
    async getTickets(filters = {}) {
        return apiClient.get('admin/support/tickets/', filters);
    },

    async getTicket(ticketId) {
        return apiClient.get(`admin/support/tickets/${ticketId}/`);
    },

    async updateTicket(ticketId, data) {
        return apiClient.patch(`admin/support/tickets/${ticketId}/`, data);
    },

    async createTicket(data) {
        return apiClient.post('admin/support/tickets/', data);
    },

    // Notifications
    async getNotifications() {
        return apiClient.get('admin/notifications/');
    },

    async markNotificationRead(notificationId) {
        return apiClient.post(`admin/notifications/${notificationId}/mark-read/`);
    },

    async markAllNotificationsRead() {
        return apiClient.post('admin/notifications/mark-all-read/');
    },

    // System Metrics
    async getMetrics() {
        return apiClient.get('admin/metrics/');
    }
};

// Export configuration
export const config = {
    API_BASE_URL,
    TOKEN_KEY,
    REFRESH_TOKEN_KEY
};

export default apiClient;
