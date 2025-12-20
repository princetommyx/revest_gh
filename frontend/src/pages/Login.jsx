import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { Eye, EyeOff, Phone, Mail, ArrowLeft } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useToast } from '../contexts/ToastContext';

const Login = () => {
    const [loginMethod, setLoginMethod] = useState('phone'); // 'phone' or 'email'
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        phoneNumber: '',
        countryCode: '+233'
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const { showSuccess, showError } = useToast();
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);
        try {
            // For now, we'll assume the backend handles "username" as the identifier
            // In a real app, you might need to format the phone number or send a different field
            // Send raw phone number to match registration data format
            const identifier = loginMethod === 'phone'
                ? formData.phoneNumber
                : formData.username;

            // Note: If backend expects 'username' field, we send identifier as username
            await login(identifier, formData.password);
            showSuccess('Login successful!');
            navigate('/');
        } catch (err) {
            console.error(err);
            showError('Invalid credentials');
            setError('Invalid credentials');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <PageTransition>
            <div className="min-h-screen bg-gray-50 flex flex-col">
                {/* Header */}
                <div className="p-4 flex items-center">
                    <button onClick={() => navigate('/intro')} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                        <ArrowLeft size={24} className="text-gray-700" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-800 ml-4">Login</h1>
                </div>

                <div className="flex-1 px-6 pt-4 pb-8 max-w-md mx-auto w-full">
                    {/* Tabs */}
                    <div className="bg-gray-200 p-1 rounded-xl flex mb-8">
                        <button
                            onClick={() => setLoginMethod('phone')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${loginMethod === 'phone'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Phone number
                        </button>
                        <button
                            onClick={() => setLoginMethod('email')}
                            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${loginMethod === 'email'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            Email or username
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-6 text-sm text-center">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {loginMethod === 'phone' ? (
                            <div className="flex gap-3">
                                <div className="w-1/3 bg-gray-100 rounded-xl border border-transparent flex items-center justify-center gap-2 px-3">
                                    {/* Placeholder flag - in real app use a library or image */}
                                    <span className="text-lg">🇬🇭</span>
                                    <span className="text-gray-700 font-medium">+233</span>
                                </div>
                                <div className="flex-1">
                                    <input
                                        type="tel"
                                        name="phoneNumber"
                                        value={formData.phoneNumber}
                                        onChange={handleChange}
                                        placeholder="Phone number"
                                        className="w-full px-4 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-primary rounded-xl outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    placeholder="Email or username"
                                    className="w-full px-4 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-primary rounded-xl outline-none transition-all"
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <div className="relative">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Password"
                                    className="w-full px-4 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-primary rounded-xl outline-none transition-all pr-10"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            <div className="flex justify-end mt-2">
                                <Link to="/forgot-password" className="text-sm font-medium text-primary hover:text-green-700 transition-colors">
                                    Forgot password?
                                </Link>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-primary text-white font-bold py-4 rounded-full mt-8 hover:bg-green-600 transition-all duration-300 shadow-md flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center space-x-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Continue...</span>
                                </div>
                            ) : (
                                "Continue"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </PageTransition>
    );
};

export default Login;
