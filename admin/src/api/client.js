import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const apiClient = axios.create({
    baseURL: API_URL,
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('admin_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Refresh handling.
//
// Access tokens last 60 minutes (SIMPLE_JWT.ACCESS_TOKEN_LIFETIME) while
// refresh tokens last 7 days. Login used to keep only the access token and
// this interceptor logged the admin out on the first 401, so anyone working
// in the dashboard was thrown back to the sign-in screen every hour, losing
// whatever they were in the middle of. Now a 401 spends the refresh token
// once and replays the original request.
//
// Rotation is on with BLACKLIST_AFTER_ROTATION, so each refresh returns a
// NEW refresh token and immediately invalidates the old one. Storing the
// replacement is mandatory - dropping it would make the next refresh fail
// and log the admin out anyway.
let refreshPromise = null;

function clearSessionAndRedirect() {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_refresh_token');
    if (window.location.pathname !== '/login') {
        window.location.href = '/login';
    }
}

// One refresh at a time. A dashboard page fires several queries at once, so
// without this each of them would spend the refresh token separately and
// all but the first would fail against the blacklist.
function refreshAccessToken() {
    if (refreshPromise) return refreshPromise;

    const refresh = localStorage.getItem('admin_refresh_token');
    if (!refresh) return Promise.reject(new Error('no refresh token'));

    // A bare axios call, not apiClient: going back through this instance
    // would re-enter the interceptor if the refresh itself 401s.
    refreshPromise = axios
        .post(`${API_URL}/users/token/refresh/`, { refresh })
        .then(({ data }) => {
            localStorage.setItem('admin_token', data.access);
            if (data.refresh) {
                localStorage.setItem('admin_refresh_token', data.refresh);
            }
            return data.access;
        })
        .finally(() => {
            refreshPromise = null;
        });

    return refreshPromise;
}

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;
        const url = originalRequest?.url || '';

        const isAuthCall = url.includes('/auth/login/') || url.includes('/token/refresh/');

        if (error.response?.status === 401 && originalRequest && !isAuthCall && !originalRequest._retried) {
            originalRequest._retried = true;
            try {
                const token = await refreshAccessToken();
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return apiClient(originalRequest);
            } catch {
                clearSessionAndRedirect();
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
