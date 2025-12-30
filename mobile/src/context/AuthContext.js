import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authApi } from '../api/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStoredAuth();
    }, []);

    const loadStoredAuth = async () => {
        try {
            const token = await SecureStore.getItemAsync('access_token');
            const role = await SecureStore.getItemAsync('user_role');
            const userData = await SecureStore.getItemAsync('user_data');

            if (token) {
                setUserRole(role);
                if (userData) setUser(JSON.parse(userData));
                // Optionally verify token here
            }
        } catch (error) {
            console.error('Error loading auth state:', error);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (username, password) => {
        const data = await authApi.login(username, password);
        await SecureStore.setItemAsync('access_token', data.access);
        await SecureStore.setItemAsync('refresh_token', data.refresh);
        await SecureStore.setItemAsync('user_role', data.user.role || 'SELLER');
        await SecureStore.setItemAsync('user_data', JSON.stringify(data.user));

        setUser(data.user);
        setUserRole(data.user.role || 'SELLER');
        return data;
    };

    const signOut = async () => {
        try {
            await authApi.logout();
        } catch (e) {
            console.log('Logout error (backend):', e);
        }
        await SecureStore.deleteItemAsync('access_token');
        await SecureStore.deleteItemAsync('refresh_token');
        await SecureStore.deleteItemAsync('user_role');
        await SecureStore.deleteItemAsync('user_data');
        setUser(null);
        setUserRole(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            userRole,
            loading,
            signIn,
            signOut,
            isAuthenticated: !!user
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
