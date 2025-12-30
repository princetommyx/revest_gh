import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Detect environment based on release channel or simple manual switch
// For Android Emulator use 10.0.2.2, for iOS/Physical use your machine's IP
// For Android Emulator use 10.0.2.2, for Physical Device use your machine's LAN IP
const LOCAL_API_URL = 'http://192.168.5.79:8000/api/v1';

const PROD_API_URL = 'https://revesta-backend.onrender.com/api/v1';

// Set this to true when building for production
// Auto-detect environment
const IS_PROD = !__DEV__;

const baseURL = IS_PROD ? PROD_API_URL : LOCAL_API_URL;

const apiClient = axios.create({
    baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10s timeout
});

// Request Interceptor: Attach Token
apiClient.interceptors.request.use(
    async (config) => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.log('Error retrieving token:', error);
        }
        return config;
    },
    (error) => Promise.reject(error)
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
                const refresh = await SecureStore.getItemAsync('refresh_token');
                if (refresh) {
                    const response = await axios.post(`${baseURL}/auth/token/refresh/`, {
                        refresh,
                    });

                    const newAccess = response.data.access;
                    await SecureStore.setItemAsync('access_token', newAccess);

                    // Retry original request with new token
                    originalRequest.headers.Authorization = `Bearer ${newAccess}`;
                    return apiClient(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed, logout user
                await SecureStore.deleteItemAsync('access_token');
                await SecureStore.deleteItemAsync('refresh_token');
                console.log('Session expired, please login again');
                // Logic to redirect to login would trigger here (via event or state)
            }
        }

        return Promise.reject(error);
    }
);

export const BASE_URL = baseURL.replace('/api/v1', ''); // Remove /api/v1 for media files
export default apiClient;
