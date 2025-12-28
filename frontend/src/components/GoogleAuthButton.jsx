import React, { useState } from 'react';
import { useGoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { Chrome } from 'lucide-react'; // Better icon for "Continue with Google"
import api from '../api/axios';
import useAuth from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';

const GoogleAuthButton = ({ role = null, mode = "login" }) => {
    const navigate = useNavigate();
    const { checkUserLoggedIn } = useAuth();
    const { showSuccess, showError } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    // useGoogleLogin provides a more robust flow than the iframe-based GoogleLogin button
    // It returns an access_token by default, which we now handle in the backend.
    const googleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setIsLoading(true);
            try {
                console.log("Google login response received, exchanging with backend...");

                // Use the access_token received from Google
                const res = await api.post('auth/google/', {
                    token: tokenResponse.access_token,
                    role: role
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
                console.error("Google Auth Backend Error:", err);
                const errorMessage = err.response?.data?.error || "Google login failed. Please try again.";
                showError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        },
        onError: (error) => {
            console.error("Google Login Flow Error:", error);
            showError("Google Authentication Failed");
            setIsLoading(false);
        },
        // Force a popup ux_mode to avoid redirection issues
        flow: 'implicit'
    });

    return (
        <div className="w-full max-w-[350px] mx-auto group">
            <button
                type="button"
                onClick={() => {
                    setIsLoading(true);
                    googleLogin();
                }}
                disabled={isLoading}
                className={`w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-full border-2 border-gray-100 bg-white hover:bg-gray-50 hover:border-gray-200 transition-all duration-300 shadow-sm active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed relative overflow-hidden`}
            >
                {isLoading ? (
                    <div className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-gray-900 font-bold">Authenticating...</span>
                    </div>
                ) : (
                    <>
                        {/* Standard Google "G" Icon SVG */}
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        <span className="text-gray-900 font-bold">
                            {mode === "register" ? "Sign up with Google" : "Sign in with Google"}
                        </span>
                    </>
                )}
            </button>

            {mode === "register" && role && !isLoading && (
                <p className="text-center text-[10px] text-gray-400 mt-2 uppercase tracking-widest font-bold animate-fade-in">
                    Signing up as {role}
                </p>
            )}
        </div>
    );
};

export default GoogleAuthButton;
