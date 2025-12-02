import { createContext, useState, useEffect } from 'react';
import api from '../api/axios';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    // const navigate = useNavigate(); // Can't use here if AuthProvider is outside Router

    useEffect(() => {
        checkUserLoggedIn();
    }, []);

    const checkUserLoggedIn = async () => {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const response = await api.get('users/me/');
                setUser(response.data);
            } catch (error) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                setUser(null);
            }
        }
        setLoading(false);
    };

    const login = async (username, password) => {
        const response = await api.post('users/token/', { username, password });
        localStorage.setItem('access_token', response.data.access);
        localStorage.setItem('refresh_token', response.data.refresh);
        await checkUserLoggedIn();
        return true;
    };

    const register = async (userData) => {
        await api.post('users/register/', userData);
        return true;
    };

    const logout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;
