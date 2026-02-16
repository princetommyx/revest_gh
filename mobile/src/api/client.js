import axios from 'axios';
import { authStorage } from '../utils/authStorage';
import { Platform } from 'react-native';

// Detect environment based on release channel or simple manual switch
// For Android Emulator use 10.0.2.2, for iOS/Physical use your machine's IP
// For Android Emulator use 10.0.2.2, for Physical Device use your machine's LAN IP
const LOCAL_API_URL = 'http://10.52.16.79:8000/api/v1/';

const PROD_API_URL = 'https://revesta-backend.onrender.com/api/v1/';

// Set this to true when building for production
// Auto-detect environment
const IS_PROD = !__DEV__; // Automatically true in release builds

const baseURL = IS_PROD ? PROD_API_URL : LOCAL_API_URL;

const apiClient = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30s timeout - fail fast with retry logic
});

// Request Interceptor: Attach Token
apiClient.interceptors.request.use(
    async (config) => {
        try {
            const token = await authStorage.getAccessToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            console.log(`[API] Request: ${config.method.toUpperCase()} ${config.url}`, config.headers['Content-Type']);
        } catch (error) {
            console.error('[API] Error in request interceptor:', error);
        }
        return config;
    },
    (error) => {
        console.error('[API] Request failed before sending:', error);
        Promise.reject(error);
    }
);

// Response Interceptor: Handle Token Refresh & Errors
apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 (Unauthorized) and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refresh = await authStorage.getRefreshToken();
                if (refresh) {
                    const response = await axios.post(`${baseURL}/auth/token/refresh/`, {
                        refresh,
                    });

                    const newAccess = response.data.access;

                    // Note: We need the full user/role data to use storeSession fully, 
                    // but here we only have the new access token.
                    // Ideally we'd fetch the user again or just patch the access token. 
                    // For now, we'll expose a helper or just manually use SecureStore via the util if needed, 
                    // BUT authStorage has `storeSession` which expects all args.
                    // Let's assume we can grab the existing role/user and re-save, OR
                    // better yet, we can add a specific method to authStorage for updating just the token,
                    // or just use storeSession with existing data.

                    // Fetch existing data to re-store securely
                    const role = await authStorage.getUserRole();
                    const user = await authStorage.getUserData();

                    await authStorage.storeSession(newAccess, refresh, role, user);

                    // Retry original request with new token
                    originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed, logout user
                await authStorage.clearSession();
                console.log('Session expired, please login again');
                // Logic to redirect to login would trigger here (via event or state)
            }
        }

        return Promise.reject(error);
    }
);

export const BASE_URL = baseURL.replace('/api/v1', ''); // Remove /api/v1 for media files
export default apiClient;
