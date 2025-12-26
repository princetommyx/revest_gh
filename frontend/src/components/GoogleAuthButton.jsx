import React from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';

const GoogleAuthButton = ({ text = "Continue with Google", mode = "login" }) => {
    const navigate = useNavigate();
    const { setToken } = useAuth(); // We might need to access context directly or use a helper

    const handleSuccess = async (credentialResponse) => {
        try {
            // Send token to backend
            const res = await api.post('/users/google/', {
                token: credentialResponse.credential
            });

            // Handle success same as normal login
            const { access, refresh, user } = res.data;

            // Allow parent component or AuthContext to handle storage if possible, 
            // but since we are inside a component, we might need to manually update storage
            // or trigger the login function from useAuth if it supports taking data directly.
            // For now, we will manually save to localStorage and reload/redirect, or better yet,
            // we should expose a method in AuthContext to "set user data from external source".

            // Let's assume we can just store tokens and redirect, but updating AuthContext state is better.
            // A quick hack is to reload, but let's try to do it properly.
            // For now, I'll direct write to local storage and then navigate, 
            // but ideally we should call a context method. 
            // Let's update AuthContext to have a `socialLogin` method later if needed.
            // For now:
            localStorage.setItem('access_token', access);
            localStorage.setItem('refresh_token', refresh);
            localStorage.setItem('user', JSON.stringify(user));

            // Force a small delay or context refresh if needed, but navigate typically causes re-render 
            // if we are listening to storage, OR we reload the page to be safe.
            // Let's try direct navigation. If AuthContext doesn't pick it up, we might need window.location.reload()

            if (user.role === 'ADMIN' || user.is_staff) {
                window.location.href = '/admin-dashboard';
            } else {
                window.location.href = '/dashboard';
            }

        } catch (err) {
            console.error("Google Login Failed", err);
            // Optionally show error toast
        }
    };

    return (
        <div className="w-full flex justify-center">
            <GoogleLogin
                onSuccess={handleSuccess}
                onError={() => {
                    console.error('Login Failed');
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
