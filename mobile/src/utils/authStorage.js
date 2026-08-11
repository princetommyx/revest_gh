import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const ACCESS_TOKEN = 'access_token';
const REFRESH_TOKEN = 'refresh_token';
const USER_ROLE = 'user_role';
const USER_DATA = 'user_data';

// SecureStore is not supported on Web, handle gracefully if needed (though project is mobile)
const isSecureSupported = Platform.OS !== 'web';

export const authStorage = {
    /**
     * Store auth session data securely
     */
    async storeSession(access, refresh, role, userData) {
        try {
            if (isSecureSupported) {
                await SecureStore.setItemAsync(ACCESS_TOKEN, access);
                await SecureStore.setItemAsync(REFRESH_TOKEN, refresh);
                await SecureStore.setItemAsync(USER_ROLE, role);
                if (userData) {
                    await SecureStore.setItemAsync(USER_DATA, JSON.stringify(userData));
                }
            } else {
                // Fallback for web (not recommended for production but keeps app running)
                await AsyncStorage.setItem(ACCESS_TOKEN, access);
                await AsyncStorage.setItem(REFRESH_TOKEN, refresh);
                await AsyncStorage.setItem(USER_ROLE, role);
                if (userData) await AsyncStorage.setItem(USER_DATA, JSON.stringify(userData));
            }
        } catch (error) {
            console.error('Error storing session:', error);
        }
    },

    /**
     * Retrieve access token
     */
    async getAccessToken() {
        try {
            return isSecureSupported
                ? await SecureStore.getItemAsync(ACCESS_TOKEN)
                : await AsyncStorage.getItem(ACCESS_TOKEN);
        } catch (error) {
            console.error('Error getting access token:', error);
            return null;
        }
    },

    /**
     * Retrieve refresh token
     */
    async getRefreshToken() {
        try {
            return isSecureSupported
                ? await SecureStore.getItemAsync(REFRESH_TOKEN)
                : await AsyncStorage.getItem(REFRESH_TOKEN);
        } catch (error) {
            return null;
        }
    },

    /**
     * Retrieve user role
     */
    async getUserRole() {
        try {
            return isSecureSupported
                ? await SecureStore.getItemAsync(USER_ROLE)
                : await AsyncStorage.getItem(USER_ROLE);
        } catch (error) {
            return null;
        }
    },

    /**
     * Retrieve full user object
     */
    async getUserData() {
        try {
            const json = isSecureSupported
                ? await SecureStore.getItemAsync(USER_DATA)
                : await AsyncStorage.getItem(USER_DATA);
            return json ? JSON.parse(json) : null;
        } catch (error) {
            return null;
        }
    },

    /**
     * Clear all auth data (Logout)
     */
    async clearSession() {
        try {
            if (isSecureSupported) {
                await SecureStore.deleteItemAsync(ACCESS_TOKEN);
                await SecureStore.deleteItemAsync(REFRESH_TOKEN);
                await SecureStore.deleteItemAsync(USER_ROLE);
                await SecureStore.deleteItemAsync(USER_DATA);
            } else {
                await AsyncStorage.removeItem(ACCESS_TOKEN);
                await AsyncStorage.removeItem(REFRESH_TOKEN);
                await AsyncStorage.removeItem(USER_ROLE);
                await AsyncStorage.removeItem(USER_DATA);
            }
        } catch (error) {
            console.error('Error clearing session:', error);
        }
    },

    /**
     * Migrate data from AsyncStorage to SecureStore (One-time run)
     */
    async migrateFromAsyncStorage() {
        if (!isSecureSupported) return; // Nothing to migrate if we can't use SecureStore

        try {
            // Check if Legacy AsyncStorage has data
            const legacyAccess = await AsyncStorage.getItem(ACCESS_TOKEN);
            const legacyRefresh = await AsyncStorage.getItem(REFRESH_TOKEN);

            // If found, move it
            if (legacyAccess) {
                console.log('Migrating auth tokens to SecureStore...');

                // 1. Move to SecureStore
                await SecureStore.setItemAsync(ACCESS_TOKEN, legacyAccess);
                if (legacyRefresh) await SecureStore.setItemAsync(REFRESH_TOKEN, legacyRefresh);

                const role = await AsyncStorage.getItem(USER_ROLE);
                if (role) await SecureStore.setItemAsync(USER_ROLE, role);

                const data = await AsyncStorage.getItem(USER_DATA);
                if (data) await SecureStore.setItemAsync(USER_DATA, data);

                // 2. Wipe from AsyncStorage
                await AsyncStorage.multiRemove([ACCESS_TOKEN, REFRESH_TOKEN, USER_ROLE, USER_DATA]);

                console.log('Migration complete.');
            }
        } catch (error) {
            console.error('Migration failed:', error);
            // Do NOT wipe data if migration fails, so user isn't logged out
        }
    }
};
