import axios from 'axios';

const getBaseURL = () => {
    const url = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    // Remove trailing slash if present, then add /api/v1/
    const cleanUrl = url.endsWith('/') ? url.slice(0, -1) : url;
    return `${cleanUrl}/api/v1/`;
};

const api = axios.create({
    baseURL: getBaseURL(),
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
