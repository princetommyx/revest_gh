import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import logo from '../assets/logo.png';

export default function Login() {
    const [credentials, setCredentials] = useState({ username: '', password: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await authApi.login(credentials);
            if (!response.access) {
                // If there's no access token, it means the backend sent an OTP response
                // Admin accounts should bypass OTP. If they get OTP, they lack admin privileges.
                setError('You do not have admin privileges or your account is restricted.');
                return;
            }
            navigate('/');
        } catch (err) {
            setError(err.response?.data?.detail || 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#475569] flex items-center justify-center p-4 md:p-8 font-sans">
            {/* Main Card */}
            <div className="bg-[#cbd5e1] w-full max-w-4xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col items-center justify-between min-h-[700px] p-8 md:p-12 relative">
                
                {/* Logo Section */}
                <div className="w-full flex justify-center mt-6">
                    <img 
                        src={logo} 
                        alt="Revesta Logo" 
                        className="h-28 w-auto object-contain transform transition-transform hover:scale-105" 
                    />
                </div>

                {/* Form Section */}
                <div className="w-full max-w-sm flex flex-col items-center mt-10">
                    <h1 className="text-[40px] font-bold text-[#1e293b] mb-1 tracking-tight">Login</h1>
                    <p className="text-[#475569] text-[15px] font-medium mb-12">Welcome Back to Admin</p>

                    {error && (
                        <div className="mb-6 w-full p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-600 text-sm text-center font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="w-full space-y-8">
                        {/* Username */}
                        <div className="relative">
                            <input
                                type="text"
                                value={credentials.username}
                                onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                                className="w-full bg-transparent border-b border-[#94a3b8] py-2 px-1 text-[#1e293b] placeholder-[#64748b] focus:outline-none focus:border-[#1e293b] transition-colors text-[15px]"
                                placeholder="Email and username"
                                required
                            />
                        </div>

                        {/* Password */}
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={credentials.password}
                                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                className="w-full bg-transparent border-b border-[#94a3b8] py-2 px-1 pr-10 text-[#1e293b] placeholder-[#64748b] focus:outline-none focus:border-[#1e293b] transition-colors text-[15px]"
                                placeholder="Password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-1 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#1e293b] transition-colors p-1"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        {/* Login Button */}
                        <div className="pt-6 flex justify-center">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-[#1e293b] hover:bg-[#0f172a] text-[#f8fafc] px-16 py-3 rounded-[14px] font-medium transition-all shadow-lg disabled:opacity-70 flex items-center justify-center w-[220px]"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Login'}
                            </button>
                        </div>
                    </form>

                </div>
            </div>
        </div>
    );
}
