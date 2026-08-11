import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Key, Eye, EyeOff } from 'lucide-react';
import PageTransition from '../components/PageTransition';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Determine mode from URL params
    const mode = searchParams.get('mode') || (searchParams.get('token') ? 'token' : 'otp');
    const uid = searchParams.get('uid');
    const token = searchParams.get('token');
    const phoneParam = searchParams.get('phone');

    const [formData, setFormData] = useState({
        otp: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');

        if (formData.newPassword !== formData.confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        if (formData.newPassword.length < 8) {
            setError("Password must be at least 8 characters");
            return;
        }

        setIsSubmitting(true);

        try {
            const payload = {
                mode: mode,
                new_password: formData.newPassword
            };

            if (mode === 'token') {
                payload.uid = uid;
                payload.token = token;
            } else {
                payload.otp = formData.otp;
                payload.phone = phoneParam; // In real app, might let user type phone again or get from state
            }

            const response = await axios.post('http://localhost:8000/api/users/password-reset/confirm/', payload);

            setMessage(response.data.message);
            setTimeout(() => {
                navigate('/login');
            }, 2000);

        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Reset failed. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <PageTransition>
            <div className="min-h-screen bg-gray-50 flex flex-col">
                <div className="p-4 flex items-center">
                    <button onClick={() => navigate('/login')} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <ArrowLeft size={24} className="text-gray-700" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-800 ml-4">Reset Password</h1>
                </div>

                <div className="flex-1 px-6 pt-10 pb-8 max-w-md mx-auto w-full">
                    <div className="bg-white p-6 rounded-2xl shadow-sm mb-6">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
                            <Key size={24} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Create new password</h2>
                        <p className="text-gray-500 text-sm">
                            {mode === 'otp'
                                ? `Enter the code we sent to ${phoneParam} and your new password.`
                                : "Enter your new password below."}
                        </p>
                    </div>

                    {message && (
                        <div className="bg-green-50 text-green-600 p-4 rounded-xl mb-6 text-sm text-center font-medium border border-green-100">
                            {message}
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 text-red-500 p-4 rounded-xl mb-6 text-sm text-center font-medium border border-red-100">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {mode === 'otp' && (
                            <div>
                                <label className="block text-sm font-bold text-gray-900 mb-2">OTP Code</label>
                                <input
                                    type="text"
                                    name="otp"
                                    value={formData.otp}
                                    onChange={handleChange}
                                    placeholder="Enter 6-digit code"
                                    className="w-full px-4 py-4 bg-white border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-green-100 outline-none transition-all shadow-sm text-center text-2xl tracking-widest font-mono"
                                    maxLength={6}
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">New Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="newPassword"
                                    value={formData.newPassword}
                                    onChange={handleChange}
                                    placeholder="Enter new password"
                                    className="w-full px-4 py-4 bg-white border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-green-100 outline-none transition-all shadow-sm"
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

                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">Confirm Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="confirmPassword"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Confirm new password"
                                    className="w-full px-4 py-4 bg-white border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-green-100 outline-none transition-all shadow-sm"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-primary text-white font-bold py-4 rounded-full hover:bg-green-600 transition-all duration-300 shadow-md flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed text-lg mt-4"
                        >
                            {isSubmitting ? "Resetting..." : "Reset Password"}
                        </button>
                    </form>
                </div>
            </div>
        </PageTransition>
    );
};

export default ResetPassword;
