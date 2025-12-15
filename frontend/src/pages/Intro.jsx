import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';

import PageTransition from '../components/PageTransition';

const Intro = () => {
    const navigate = useNavigate();
    const [loadingTarget, setLoadingTarget] = useState(null);

    const handleNavigation = (path, target) => {
        setLoadingTarget(target);
        setTimeout(() => {
            navigate(path);
            setLoadingTarget(null);
        }, 800);
    };

    return (
        <PageTransition>
            <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 relative overflow-hidden">
                {/* Background Elements (Optional for visual flair) */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-green-50 to-white -z-10"></div>

                <div className="w-full max-w-md text-center space-y-8 z-10">
                    {/* Logo / Branding */}
                    <div className="mb-12">
                        <h1 className="text-5xl font-extrabold text-primary tracking-tight">ReVesta</h1>
                        <p className="text-gray-500 mt-2 text-lg">Recycle. Reward. Repeat.</p>
                    </div>

                    {/* Actions */}
                    <div className="space-y-4 w-full">
                        <button
                            onClick={() => handleNavigation('/login', 'login')}
                            disabled={loadingTarget !== null}
                            className="block w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-green-600 hover:shadow-xl transition-all transform hover:-translate-y-1 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loadingTarget === 'login' ? (
                                <div className="flex items-center space-x-2">
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Opening...</span>
                                </div>
                            ) : (
                                "Log in"
                            )}
                        </button>

                        <button
                            onClick={() => handleNavigation('/register', 'register')}
                            disabled={loadingTarget !== null}
                            className="block w-full bg-gray-100 text-gray-800 py-4 rounded-xl font-bold text-lg hover:bg-gray-200 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                            {loadingTarget === 'register' ? (
                                <div className="flex items-center space-x-2">
                                    <svg className="animate-spin h-5 w-5 text-gray-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    <span>Loading...</span>
                                </div>
                            ) : (
                                "Register"
                            )}
                        </button>
                    </div>

                    {/* Footer / Terms */}
                    <p className="text-xs text-gray-400 mt-8">
                        By continuing, you agree to our Terms of Service and Privacy Policy.
                    </p>
                </div>
            </div>
        </PageTransition>
    );
};

export default Intro;
