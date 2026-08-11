import axios from 'axios';
import { authStorage } from '../utils/authStorage';
import { Platform } from 'react-native';

import * as Device from 'expo-device';

// Detect environment based on release channel or simple manual switch
// For Android Emulator use 10.0.2.2, for Physical Device use your machine's LAN IP
const LOCAL_IP = '192.168.100.81';
const EMULATOR_IP = '10.0.2.2';

const getLocalURL = () => {
    // If it's a physical device, always use the LAN IP
    if (Device.isDevice) {
        return `http://${LOCAL_IP}:8000/api/v1/`;
    }

    // For emulators, Android needs 10.0.2.2, iOS can use localhost
    return Platform.OS === 'android' ? `http://${EMULATOR_IP}:8000/api/v1/` : `http://${LOCAL_IP}:8000/api/v1/`;
};

const PROD_API_URL = 'https://revesta-backend.onrender.com/api/v1/';
const IS_PROD = !__DEV__;

// Use explicit environment variable if set, otherwise default to Production URL for APK testing
// If you want to develop locally, you can set EXPO_PUBLIC_API_URL=http://... in your .env
const baseURL = process.env.EXPO_PUBLIC_API_URL || PROD_API_URL;

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
            // Let Axios handle the Content-Type automatically for FormData so it includes the boundary
            if (config.data instanceof FormData) {
                delete config.headers['Content-Type'];
            }

            const token = await authStorage.getAccessToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            const fullUrl = `${config.baseURL}${config.url}`;
            console.log(`[API] Request: ${config.method?.toUpperCase()} ${fullUrl}`, config.headers['Content-Type']);
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
            console.log(`[API] 401 detected for ${originalRequest.url}. Attempting token refresh...`);
            originalRequest._retry = true;

            try {
                const refresh = await authStorage.getRefreshToken();
                if (refresh) {
                    console.log('[API] Refresh token found, calling refresh endpoint...');
                    const response = await axios.post(`${baseURL}auth/token/refresh/`, {
                        refresh,
                    });

                    const newAccess = response.data.access;
                    const newRefresh = response.data.refresh || refresh; // Use new refresh token if provided
                    console.log('[API] Token refreshed successfully!');

                    // Fetch existing data to re-store securely
                    const role = await authStorage.getUserRole();
                    const user = await authStorage.getUserData();

                    await authStorage.storeSession(newAccess, newRefresh, role, user);

                    // Retry original request with new token
                    originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                    return apiClient(originalRequest);
                } else {
                    console.log('[API] No refresh token available in storage.');
                }
            } catch (refreshError) {
                // Refresh failed, logout user
                console.error('[API] Token refresh failed:', refreshError.response?.data || refreshError.message);
                await authStorage.clearSession();
                console.warn('Session expired - Please login again');
            }
        }

        return Promise.reject(error);
    }
);

export const BASE_URL = baseURL.replace('/api/v1', ''); // Remove /api/v1 for media files
export default apiClient;
