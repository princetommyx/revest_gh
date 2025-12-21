import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, User, AlertCircle, Mail } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import api from '../api/axios';

const AdminLogin = () => {
    const [mode, setMode] = useState('login'); // 'login' or 'register'
    const [credentials, setCredentials] = useState({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'register') {
                // Registration flow
                if (credentials.password !== credentials.confirmPassword) {
                    setError('Passwords do not match');
                    setLoading(false);
                    return;
                }

                // Register admin user
                await api.post('/users/register/', {
                    username: credentials.username,
                    email: credentials.email,
                    password: credentials.password,
                    role: 'COLLECTOR', // Default role, will be overridden
                    is_staff: true,
                    is_superuser: true
                });

                // Auto-login after registration
                const user = await login(credentials.username, credentials.password);

                if (!user.is_staff && !user.is_superuser) {
                    setError('Account created but admin privileges not granted. Contact support.');
                    setLoading(false);
                    return;
                }

                navigate('/admin-dashboard');
            } else {
                // Login flow
                const user = await login(credentials.username, credentials.password);

                if (!user.is_staff && !user.is_superuser) {
                    setError('Access denied. Admin privileges required.');
                    setLoading(false);
                    return;
                }

                navigate('/admin-dashboard');
            }
        } catch (err) {
            console.error('Admin auth error:', err);
            setError(mode === 'register' ? 'Registration failed. Username may already exist.' : 'Invalid credentials or insufficient permissions');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setCredentials({
            ...credentials,
            [e.target.name]: e.target.value
        });
    };

    const toggleMode = () => {
        setMode(mode === 'login' ? 'register' : 'login');
        setError('');
        setCredentials({
            username: '',
            email: '',
            password: '',
            confirmPassword: ''
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]"></div>

            <div className="w-full max-w-md relative z-10">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-2xl">
                        <Shield size={32} className="text-white" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
                    <p className="text-gray-400">ReVesta Administrative Access</p>
                </div>

                {/* Login/Register Card */}
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20">
                    {/* Mode Toggle */}
                    <div className="flex bg-white/5 rounded-lg p-1 mb-6">
                        <button
                            type="button"
                            onClick={() => mode !== 'login' && toggleMode()}
                            className={`flex-1 py-2 rounded-md font-medium transition-all ${mode === 'login'
                                    ? 'bg-primary text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Login
                        </button>
                        <button
                            type="button"
                            onClick={() => mode !== 'register' && toggleMode()}
                            className={`flex-1 py-2 rounded-md font-medium transition-all ${mode === 'register'
                                    ? 'bg-primary text-white shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            Create Account
                        </button>
                    </div>

                    {/* Warning Banner */}
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6 flex items-start gap-3">
                        <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-red-200">
                            <p className="font-semibold">Restricted Access</p>
                            <p className="text-xs text-red-300 mt-1">
                                {mode === 'register'
                                    ? 'Creating an admin account grants full system access. Use responsibly.'
                                    : 'This portal is for authorized administrators only. All access attempts are logged.'
                                }
                            </p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Username */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Admin Username
                            </label>
                            <div className="relative">
                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    name="username"
                                    value={credentials.username}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Enter admin username"
                                />
                            </div>
                        </div>

                        {/* Email (only for registration) */}
                        {mode === 'register' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Email Address
                                </label>
                                <div className="relative">
                                    <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="email"
                                        name="email"
                                        value={credentials.email}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="admin@revesta.com"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="password"
                                    name="password"
                                    value={credentials.password}
                                    onChange={handleChange}
                                    required
                                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                    placeholder="Enter password"
                                />
                            </div>
                        </div>

                        {/* Confirm Password (only for registration) */}
                        {mode === 'register' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Confirm Password
                                </label>
                                <div className="relative">
                                    <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={credentials.confirmPassword}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                        placeholder="Confirm password"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                                <AlertCircle size={18} className="text-red-400" />
                                <p className="text-sm text-red-200">{error}</p>
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                        >
                            {loading ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>{mode === 'register' ? 'Creating Account...' : 'Verifying...'}</span>
                                </>
                            ) : (
                                <>
                                    <Shield size={18} />
                                    <span>{mode === 'register' ? 'Create Admin Account' : 'Access Admin Portal'}</span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <div className="mt-6 pt-6 border-t border-white/10 text-center">
                        <p className="text-sm text-gray-400">
                            Not an admin?{' '}
                            <button
                                onClick={() => navigate('/login')}
                                className="text-primary hover:text-green-400 font-medium transition-colors"
                            >
                                User Login
                            </button>
                        </p>
                    </div>
                </div>

                {/* Security Note */}
                <div className="mt-6 text-center">
                    <p className="text-xs text-gray-500">
                        🔒 Secured with end-to-end encryption
                    </p>
                </div>
            </div>

            {/* Grid Background */}
            <style jsx>{`
                .bg-grid-white\/\[0\.02\] {
                    background-image: linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
                                      linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
                }
            `}</style>
        </div>
    );
};

export default AdminLogin;

const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
        const user = await login(credentials.username, credentials.password);

        // Check if user is actually an admin
        if (!user.is_staff && !user.is_superuser) {
            setError('Access denied. Admin privileges required.');
            setLoading(false);
            return;
        }

        // Success - redirect to admin dashboard
        navigate('/admin-dashboard');
    } catch (err) {
        console.error('Admin login error:', err);
        setError('Invalid credentials or insufficient permissions');
    } finally {
        setLoading(false);
    }
};

const handleChange = (e) => {
    setCredentials({
        ...credentials,
        [e.target.name]: e.target.value
    });
};

return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-4">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:50px_50px]"></div>

        <div className="w-full max-w-md relative z-10">
            {/* Header */}
            <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-2xl mb-4 shadow-2xl">
                    <Shield size={32} className="text-white" />
                </div>
                <h1 className="text-3xl font-bold text-white mb-2">Admin Portal</h1>
                <p className="text-gray-400">ReVesta Administrative Access</p>
            </div>

            {/* Login Card */}
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/20">
                {/* Warning Banner */}
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-6 flex items-start gap-3">
                    <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-200">
                        <p className="font-semibold">Restricted Access</p>
                        <p className="text-xs text-red-300 mt-1">This portal is for authorized administrators only. All access attempts are logged.</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Username */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Admin Username
                        </label>
                        <div className="relative">
                            <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                name="username"
                                value={credentials.username}
                                onChange={handleChange}
                                required
                                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="Enter admin username"
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="password"
                                name="password"
                                value={credentials.password}
                                onChange={handleChange}
                                required
                                className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                placeholder="Enter password"
                            />
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 flex items-center gap-2">
                            <AlertCircle size={18} className="text-red-400" />
                            <p className="text-sm text-red-200">{error}</p>
                        </div>
                    )}

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary hover:bg-green-600 text-white font-semibold py-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Verifying...</span>
                            </>
                        ) : (
                            <>
                                <Shield size={18} />
                                <span>Access Admin Portal</span>
                            </>
                        )}
                    </button>
                </form>

                {/* Footer */}
                <div className="mt-6 pt-6 border-t border-white/10 text-center">
                    <p className="text-sm text-gray-400">
                        Not an admin?{' '}
                        <button
                            onClick={() => navigate('/login')}
                            className="text-primary hover:text-green-400 font-medium transition-colors"
                        >
                            User Login
                        </button>
                    </p>
                </div>
            </div>

            {/* Security Note */}
            <div className="mt-6 text-center">
                <p className="text-xs text-gray-500">
                    🔒 Secured with end-to-end encryption
                </p>
            </div>
        </div>

        {/* Grid Background */}
        <style jsx>{`
                .bg-grid-white\/\[0\.02\] {
                    background-image: linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
                                      linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
                }
            `}</style>
    </div>
);
};

export default AdminLogin;
