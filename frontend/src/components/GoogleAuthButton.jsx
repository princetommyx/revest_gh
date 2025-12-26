import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';

const GoogleAuthButton = ({ text = "Continue with Google", mode = "login" }) => {
    const navigate = useNavigate();
    const { setToken } = useAuth();
    const { showSuccess, showError } = useToast();

    const handleSuccess = async (credentialResponse) => {
        try {
            // Send token to backend
            const res = await api.post('/users/google/', {
                token: credentialResponse.credential
            });

            // Handle success same as normal login
            const { access, refresh, user } = res.data;

            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            localStorage.setItem('user', JSON.stringify(user));

            showSuccess(`Welcome back, ${user.username || 'User'}!`);

            // Delay to allow toast to be seen? No, navigation is fine.
            if (user.role === 'ADMIN' || user.is_staff) {
                window.location.href = '/admin-dashboard';
            } else {
                window.location.href = '/dashboard';
            }

        } catch (err) {
            console.error("Google Login Failed", err);
            const errorMessage = err.response?.data?.error || "Google Login processing failed";
            showError(errorMessage);
        }
    };

    return (
        <div className="w-full flex justify-center">
            <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => {
                    console.error('Login Failed');
                    showError("Google Authentication Failed");
                }}
                useOneTap
                theme="filled_blue"
                shape="pill"
                text={mode === "register" ? "signup_with" : "signin_with"}
                width="350" // Try to match full width of other buttons
            />
        </div>
    );
};


export default GoogleAuthButton;
