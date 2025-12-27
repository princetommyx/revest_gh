import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, User, AlertCircle, Mail, ArrowLeft, Eye, EyeOff, CheckCircle } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import api from '../api/axios';
import PageTransition from '../components/PageTransition';

const AdminLogin = () => {
    const [mode, setMode] = useState('login'); // 'login' or 'register'
    const [credentials, setCredentials] = useState({
        username: '',
        password: '',
        email: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, user } = useAuth();
    const navigate = useNavigate();

    // Auto-redirect if already logged in as admin
    useEffect(() => {
        if (user?.is_staff || user?.is_superuser) {
            navigate('/admin-dashboard');
        }
    }, [user, navigate]);

    const handleChange = (e) => {
        setCredentials({
            ...credentials,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setLoading(true);

        try {
            if (mode === 'register') {
                // Registration flow
                if (credentials.password !== credentials.confirmPassword) {
                    setError('Passwords do not match');
                    setLoading(false);
                    return;
                }

                // Register admin user via dedicated endpoint
                await api.post('users/admin-register/', {
                    username: credentials.username,
                    email: credentials.email,
                    password: credentials.password,
                    role: 'COLLECTOR'
                });

                setSuccessMsg('Admin account created successfully! Redirecting...');

                // Auto-login after registration
                const user = await login(credentials.username, credentials.password);

                if (!user.is_staff && !user.is_superuser) {
                    setError('Account created but admin privileges not granted. Contact support.');
                    setLoading(false);
                    return;
                }

                // Slight delay to show success message
                setTimeout(() => {
                    navigate('/admin-dashboard');
                }, 1500);

            } else {
                // Login flow
                const user = await login(credentials.username, credentials.password);

                // Check if user is actually an admin
                if (!user.is_staff && !user.is_superuser) {
                    setError('Access denied. Admin privileges required.');
                    setLoading(false);
                    return;
                }

                setSuccessMsg('Login successful! Welcome back.');

                // Slight delay to show success message
                setTimeout(() => {
                    navigate('/admin-dashboard');
                }, 1000);
            }
        } catch (err) {
            console.error('Admin login error:', err);

            // Extract specific error message from backend
            let errorMessage = 'Invalid credentials or insufficient permissions';

            if (err.response && err.response.data) {
                const data = err.response.data;

                // Handle Django REST Framework validation errors
                if (typeof data === 'object') {
                    // If it's a simple key-value pair like { "detail": "Error message" }
                    if (data.detail) {
                        errorMessage = data.detail;
                    } else {
                        // If it's field-specific errors like { "username": ["Already exists"] }
                        const firstKey = Object.keys(data)[0];
                        const firstError = Array.isArray(data[firstKey]) ? data[firstKey][0] : data[firstKey];
                        errorMessage = `${firstKey.charAt(0).toUpperCase() + firstKey.slice(1)}: ${firstError}`;
                    }
                } else if (typeof data === 'string') {
                    errorMessage = data;
                }
            }

            setError(errorMessage);
            setLoading(false);
        }
    };

    return (
        <PageTransition>
            <div className="min-h-screen bg-gray-50 flex flex-col">
                {/* Header */}
                <div className="p-4 flex items-center">
                    <button onClick={() => navigate('/')} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <ArrowLeft size={24} className="text-gray-700" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-800 ml-4 flex items-center gap-2">
                        <Shield size={20} className="text-primary" />
                        Admin Portal
                    </h1>
                </div>

                <div className="flex-1 px-6 pt-4 pb-8 max-w-md mx-auto w-full relative">

                    {/* Success Popup Overlay */}
                    {successMsg && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm rounded-xl">
                            <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center text-center border border-green-100 animate-in fade-in zoom-in duration-300">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4 text-green-600">
                                    <CheckCircle size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Success!</h3>
                                <p className="text-gray-600 font-medium">{successMsg}</p>
                            </div>
                        </div>
                    )}

                    {/* Security Notice */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-8 flex gap-3 text-amber-800">
                        <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-semibold">Restricted Access</p>
                            <p className="opacity-90 mt-1">Authorized personnel only. All access attempts are logged for security purposes.</p>
                        </div>
                    </div>

                    {/* Tabs */}
                    <div className="bg-gray-200 p-1 rounded-xl flex mb-8">
                        <button
                            onClick={() => { setMode('login'); setError(''); setSuccessMsg(''); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'login'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Admin Login
                        </button>
                        <button
                            onClick={() => { setMode('register'); setError(''); setSuccessMsg(''); }}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === 'register'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            New Admin
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-6 text-sm text-center border border-red-100 flex items-center justify-center gap-2">
                            <AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Username */}
                        <div>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    <User size={20} />
                                </span>
                                <input
                                    type="text"
                                    name="username"
                                    value={credentials.username}
                                    onChange={handleChange}
                                    placeholder="Admin Username"
                                    className="w-full pl-12 pr-4 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-primary rounded-xl outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {mode === 'register' && (
                            <div>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                        <Mail size={20} />
                                    </span>
                                    <input
                                        type="email"
                                        name="email"
                                        value={credentials.email}
                                        onChange={handleChange}
                                        placeholder="Admin Email"
                                        className="w-full pl-12 pr-4 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-primary rounded-xl outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        {/* Password */}
                        <div>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                    <Lock size={20} />
                                </span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={credentials.password}
                                    onChange={handleChange}
                                    placeholder="Password"
                                    className="w-full pl-12 pr-12 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-primary rounded-xl outline-none transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {mode === 'register' && (
                            <div>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                                        <Lock size={20} />
                                    </span>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        name="confirmPassword"
                                        value={credentials.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="Confirm Password"
                                        className="w-full pl-12 pr-12 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-primary rounded-xl outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading || successMsg}
                            className="w-full bg-primary text-white font-bold py-4 rounded-full mt-8 hover:bg-green-600 transition-all duration-300 shadow-md flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed gap-2"
                        >
                            {loading ? (
                                <div className="flex items-center space-x-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Processing...</span>
                                </div>
                            ) : (
                                <>
                                    <span>{mode === 'login' ? 'Access Dashboard' : 'Create Admin Account'}</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-8 text-center">
                        <p className="text-sm text-gray-400">
                            Secure • Encrypted • Logged
                        </p>
                    </div>
                </div>
            </div>
        </PageTransition>
    );
};

export default AdminLogin;
