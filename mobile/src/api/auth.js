import apiClient from './client';
import * as SecureStore from 'expo-secure-store';

export const authApi = {
    login: async (username, password) => {
        const response = await apiClient.post('/auth/login/', { username, password });
        const { access, refresh } = response.data;
        const { user } = response.data; // Assuming backend sends user object

        await SecureStore.setItemAsync('access_token', access);
        await SecureStore.setItemAsync('refresh_token', refresh);

        return response.data;
    },

    register: async (userData) => {
        const response = await apiClient.post('/auth/register/', userData);
        // If backend logs in automatically:
        if (response.data.tokens) {
            await SecureStore.setItemAsync('access_token', response.data.tokens.access);
            await SecureStore.setItemAsync('refresh_token', response.data.tokens.refresh);
        }
        return response.data;
    },

    googleLogin: async (token) => {
        const response = await apiClient.post('/auth/google/', { token });
        const { access, refresh } = response.data;

        await SecureStore.setItemAsync('access_token', access);
        await SecureStore.setItemAsync('refresh_token', refresh);

        return response.data;
    },

    logout: async () => {
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
    },

    getProfile: async () => {
        const response = await apiClient.get('/users/profile/');
        return response.data;
    }
};
