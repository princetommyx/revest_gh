import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { Recycle, Loader2 } from 'lucide-react';

export default function Login() {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await authApi.login(credentials);
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-white flex flex-col md:flex-row overflow-hidden font-sans">
            {/* Left Side: Branding */}
            <div className="flex-1 md:flex-[0.8] flex flex-col items-center justify-center p-12 bg-white relative z-10">
                <div className="text-center max-w-sm animate-fade-in">
                    <div className="mb-8 flex justify-center">
                        <div className="relative">
                            <Recycle size={120} className="text-primary-600 transform -rotate-12" />
                            <div className="absolute -bottom-2 -right-2 bg-primary-100 rounded-full p-2 animate-bounce">
                                <Recycle size={24} className="text-primary-600" />
                            </div>
                        </div>
                    </div>
                    <h1 className="text-5xl font-black text-primary-900 tracking-tighter mb-4 uppercase">
                        Revesta <br /> Dashboard
                    </h1>
                    <p className="text-slate-500 font-medium text-lg leading-relaxed">
                        Menuju Masa Depan Lingkungan <br />
                        <span className="text-primary-600 italic">"Clean & Sustainable Solution"</span>
                    </p>
                </div>
            </div>

            {/* Right Side: Form with Diagonal Divider */}
            <div className="flex-1 md:flex-[1.2] bg-primary-900 relative flex items-center justify-center p-8 md:p-16">
                {/* Diagonal Divider Overlay */}
                <div
                    className="absolute top-0 left-0 bottom-0 w-32 bg-primary-900 hidden md:block"
                    style={{
                        transform: 'translateX(-50%) skewX(-10deg)',
                        transformOrigin: 'top'
                    }}
                ></div>

                <div className="w-full max-w-md relative z-10 animate-slide-up">
                    <div className="mb-10 text-white md:text-left text-center">
                        <h2 className="text-3xl font-bold mb-2">Welcome Back</h2>
                        <p className="text-primary-200/60 font-medium">Please enter your credentials to access the admin portal.</p>
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm animate-shake">
                            <p className="flex items-center">
                                <span className="mr-2">🚨</span> {error}
                            </p>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Username Field */}
                        <div className="space-y-3">
                            <label htmlFor="username" className="block text-sm font-bold text-primary-200 uppercase tracking-widest ml-1">
                                Your Username
                            </label>
                            <input
                                type="text"
                                id="username"
                                value={credentials.username}
                                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                                className="w-full bg-white text-primary-900 px-6 py-4 rounded-xl focus:ring-4 focus:ring-primary-500/30 transition-all outline-none text-lg font-medium placeholder:text-slate-400"
                                placeholder="Enter your username"
                                required
                            />
                        </div>

                        {/* Password Field */}
                        <div className="space-y-3">
                            <label htmlFor="password" className="block text-sm font-bold text-primary-200 uppercase tracking-widest ml-1">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                value={credentials.password}
                                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                className="w-full bg-white text-primary-900 px-6 py-4 rounded-xl focus:ring-4 focus:ring-primary-500/30 transition-all outline-none text-lg font-medium placeholder:text-slate-400"
                                placeholder="Enter your password"
                                required
                            />
                        </div>

                        {/* Remember Me Only */}
                        <div className="flex items-center justify-between px-1">
                            <label className="flex items-center space-x-3 cursor-pointer group text-primary-100/80 hover:text-white transition-colors">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded border-transparent bg-primary-800 text-primary-500 focus:ring-offset-primary-900 focus:ring-primary-500 transition-all"
                                />
                                <span className="text-sm font-semibold tracking-tight">Remember me</span>
                            </label>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary-500 hover:bg-primary-400 active:bg-primary-600 text-white font-black py-5 px-8 rounded-xl transition-all duration-300 transform active:scale-[0.98] shadow-2xl flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed text-xl uppercase tracking-widest"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                                    Sign In...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-12 text-center">
                        <p className="text-primary-200/30 text-xs font-bold uppercase tracking-[0.2em]">
                            Authorized Personnel Only
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
