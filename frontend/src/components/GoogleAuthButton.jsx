import React, { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';

const GoogleAuthButton = ({ role = null, mode = "login" }) => {
    const navigate = useNavigate();
    const { checkUserLoggedIn } = useAuth();
    const { showSuccess, showError } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleGoogleLoginSuccess = async (credentialResponse) => {
        setIsLoading(true);
        try {
            console.log("Google Auth Success, mode:", mode, "role:", role);

            // baseURL already ends in /api/v1/
            const res = await api.post('auth/google/', {
                token: credentialResponse.credential,
                role: role // Pass role if registration
            });

            const { access, refresh, user } = res.data;

            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            localStorage.setItem('user', JSON.stringify(user));

            showSuccess(`Welcome, ${user.username || 'User'}!`);

            await checkUserLoggedIn();

            if (user.role === 'ADMIN' || user.is_staff) {
                navigate('/admin-dashboard');
            } else {
                navigate('/');
            }

        } catch (err) {
            console.error("Google Login Backend Error:", err);
            const errorMessage = err.response?.data?.error || "Google login failed. Please try again.";
            showError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleLoginError = () => {
        showError("Google Authentication Failed");
        setIsLoading(false);
    };

    return (
        <div className="w-full relative">
            {isLoading && (
                <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl border border-gray-100 shadow-sm">
                    <svg className="animate-spin h-8 w-8 text-primary mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-xs font-bold text-gray-900">Authenticating...</span>
                </div>
            )}

            <div className={`flex justify-center w-full transition-opacity duration-300 ${isLoading ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                <div className="w-full max-w-[350px]">
                    <GoogleLogin
                        onSuccess={handleGoogleLoginSuccess}
                        onError={handleGoogleLoginError}
                        useOneTap={false}
                        theme="outline"
                        shape="pill"
                        size="large"
                        width="350px"
                        text={mode === "register" ? "signup_with" : "signin_with"}
                    />
                </div>
            </div>

            {mode === "register" && role && !isLoading && (
                <p className="text-center text-[10px] text-gray-400 mt-2 uppercase tracking-widest font-bold">
                    Signing up as {role}
                </p>
            )}
        </div>
    );
};

export default GoogleAuthButton;
