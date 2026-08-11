import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Mail, Phone, Lock } from 'lucide-react';
import PageTransition from '../components/PageTransition';

const ForgotPassword = () => {
    const [identifier, setIdentifier] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError('');
        setMessage('');

        try {
            const response = await axios.post('http://localhost:8000/api/users/password-reset/', {
                identifier: identifier
            }); // Use configured axios instance in real app

            setMessage(response.data.message);
            // If it's phone OTP, redirect to reset page with mode parameter
            if (response.data.mode === 'otp') {
                setTimeout(() => {
                    navigate(`/reset-password?mode=otp&phone=${response.data.phone}`);
                }, 1500);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong. Please try again.');
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
                    <h1 className="text-xl font-bold text-gray-800 ml-4">Forgot Password</h1>
                </div>

                <div className="flex-1 px-6 pt-10 pb-8 max-w-md mx-auto w-full">
                    <div className="bg-white p-8 rounded-2xl shadow-sm mb-6 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-primary">
                            <Lock size={32} />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Trouble logging in?</h2>
                        <p className="text-gray-500">Enter your email or phone number and we'll send you a link or code to get back into your account.</p>
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
                        <div>
                            <label className="block text-sm font-bold text-gray-900 mb-2">Email or Phone</label>
                            <input
                                type="text"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                placeholder="Enter email or phone number"
                                className="w-full px-4 py-4 bg-white border border-gray-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-green-100 outline-none transition-all shadow-sm"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-primary text-white font-bold py-4 rounded-full hover:bg-green-600 transition-all duration-300 shadow-md flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed text-lg"
                        >
                            {isSubmitting ? (
                                <div className="flex items-center space-x-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Sending...</span>
                                </div>
                            ) : (
                                "Send Login Link"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </PageTransition>
    );
};

export default ForgotPassword;
