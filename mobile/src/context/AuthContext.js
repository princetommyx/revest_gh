import React, { createContext, useContext, useState, useEffect } from 'react';
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

    const loadStoredAuth = async () => {
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
    };

    const signIn = async (username, password) => {
        const data = await authApi.login(username, password);

        await authStorage.storeSession(
            data.access,
            data.refresh,
            data.user.role || 'SELLER',
            data.user
        );

        setUser(data.user);
        setUserRole(data.user.role || 'SELLER');
        return data;
    };

    const signUp = async (userData) => {
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
    };

    const googleSignIn = async (token) => {
        const data = await authApi.googleLogin(token);

        // Ensure backend returns user object, otherwise fetch it
        // Assuming data contains { access, refresh, user } like login
        // If not, we might need: const user = await authApi.getProfile();

        // For now, let's assume standard auth response. 
        // If googleLogin endpoint doesn't return user, we should fetch it.

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
    };

    const signOut = async () => {
        try {
            await authApi.logout();
        } catch (e) {
            console.log('Logout error (backend):', e);
        }
        await authStorage.clearSession();
        setUser(null);
        setUserRole(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            setUser,
            userRole,
            loading,
            signIn,
            signUp,
            googleSignIn,
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
