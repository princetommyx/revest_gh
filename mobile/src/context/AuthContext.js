import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { authStorage } from '../utils/authStorage';
import { authApi } from '../api/auth';
import { stopCollectorLocationTracking } from '../utils/collectorTracking';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStoredAuth();
    }, []);

    /**
     * Pull the full profile from the server and adopt it.
     *
     * Login only returns {id, username, email, role, is_staff, is_superuser}.
     * Nothing in the app was calling getProfile(), so the client's idea of the
     * user never contained first_name, phone_number, city, profile_picture_url
     * or is_verified. Edit Profile initialised its form from those missing
     * fields and then POSTed empty strings back, so changing an avatar also
     * wiped the user's name, phone and city.
     */
    const hydrateProfile = useCallback(async () => {
        try {
            const full = await authApi.getProfile();
            if (full?.id) {
                setUser(full);
                if (full.role) setUserRole(full.role);
                await authStorage.updateUserData(full);
            }
            return full;
        } catch (error) {
            // Non-fatal: we keep whatever we already had rather than signing out.
            console.log('Could not refresh profile:', error?.message);
            return null;
        }
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
                // Show the cached user immediately, then reconcile in the
                // background so a stale avatar or city can't linger.
                hydrateProfile();
            }
        } catch (error) {
            console.error('Error loading auth state:', error);
        } finally {
            setLoading(false);
        }
    }, [hydrateProfile]);

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
        // The login payload is a thin subset; fetch the real profile.
        await hydrateProfile();
        return data;
    }, [hydrateProfile]);

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
        await hydrateProfile();
        return data;
    }, [hydrateProfile]);

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
            await hydrateProfile();
        }
        return data;
    }, [hydrateProfile]);

    const googleSignIn = useCallback(async (token, role) => {
        const data = await authApi.googleLogin(token, role);

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
        await hydrateProfile();
        return data;
    }, [hydrateProfile]);

    const signOut = useCallback(async () => {
        try {
            await authApi.logout();
        } catch (e) {
            console.log('Logout error (backend):', e);
        }
        try {
            await stopCollectorLocationTracking();
        } catch (e) {
            console.log('Failed to stop location tracking on logout:', e);
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
        refreshProfile: hydrateProfile,
        userRole,
        loading,
        signIn,
        verifyLogin,
        signUp,
        googleSignIn,
        signOut,
        isAuthenticated: !!user
    }), [user, userRole, loading, signIn, verifyLogin, signUp, googleSignIn, signOut, updateUser, hydrateProfile]);

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
