import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authStorage } from '../utils/authStorage';
import { authApi } from '../api/auth';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStoredAuth();
    }, []);

    const loadStoredAuth = useCallback(async () => {
        try {
            // Run all SecureStore reads in PARALLEL for faster startup
            const [token, role, userData] = await Promise.all([
                authStorage.getAccessToken(),
                authStorage.getUserRole(),
                authStorage.getUserData()
            ]);

            if (token) {
                setUserRole(role);
                setUser(userData);
            }
        } catch (error) {
            console.error('Error loading auth state:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const signIn = useCallback(async (username, password) => {
        const data = await authApi.login(username, password);

        // If backend says verification is required, return data without signing in yet
        if (data.status === 'verification_required') {
            return data;
        }

        // Standard direct login (if enabled or for specific users)
        await authStorage.storeSession(
            data.access,
            data.refresh,
            data.user.role || 'SELLER',
            data.user
        );

        setUser(data.user);
        setUserRole(data.user.role || 'SELLER');
        return data;
    }, []);

    const verifyLogin = useCallback(async (userId, otp) => {
        const data = await authApi.verifyLoginOTP(userId, otp);

        // This endpoint returns tokens on success
        await authStorage.storeSession(
            data.access,
            data.refresh,
            data.user.role || 'SELLER',
            data.user
        );

        setUser(data.user);
        setUserRole(data.user.role || 'SELLER');
        return data;
    }, []);

    const signUp = useCallback(async (userData) => {
        const data = await authApi.register(userData);

        // If backend returns tokens on register, store them and log user in
        if (data.tokens) {
            await authStorage.storeSession(
                data.tokens.access,
                data.tokens.refresh,
                data.user.role || 'SELLER',
                data.user
            );

            setUser(data.user);
            setUserRole(data.user.role || 'SELLER');
        }
        return data;
    }, []);

    const googleSignIn = useCallback(async (token) => {
        const data = await authApi.googleLogin(token);

        let userForState = data.user;
        let roleForState = data.user?.role || 'SELLER';

        // Store what we have. If user checks fail later, we can refine.
        await authStorage.storeSession(
            data.access,
            data.refresh,
            roleForState,
            userForState
        );

        setUser(userForState);
        setUserRole(roleForState);
        return data;
    }, []);

    const signOut = useCallback(async () => {
        try {
            await authApi.logout();
        } catch (e) {
            console.log('Logout error (backend):', e);
        }
        await authStorage.clearSession();
        setUser(null);
        setUserRole(null);
    }, []);

    const updateUser = useCallback(async (updatedUserData) => {
        await authStorage.updateUserData(updatedUserData);
        setUser(updatedUserData);
    }, []);

    const value = useMemo(() => ({
        user,
        setUser,
        updateUser,
        userRole,
        loading,
        signIn,
        verifyLogin,
        signUp,
        googleSignIn,
        signOut,
        isAuthenticated: !!user
    }), [user, userRole, loading, signIn, verifyLogin, signUp, googleSignIn, signOut, updateUser]);

    return (
        <AuthContext.Provider value={value}>
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
