import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import PageTransition from '../components/PageTransition';

const Intro = () => {
    const navigate = useNavigate();
    const [loadingTarget, setLoadingTarget] = useState(null);
    const [currentSlide, setCurrentSlide] = useState(0);

    // Carousel Data
    const slides = [
        {
            id: 0,
            image: "/intro_collection.png",
            title: "Revolutionizing Waste",
            text: "Join the future of smart waste management. Efficient collection for a cleaner, greener smart city.",
            buttonText: "Next",
            action: "next"
        },
        {
            id: 1,
            image: "/intro_rewards.png",
            title: "Turn Trash into Cash",
            text: "Recycle effectively and get paid instantly to your digital wallet. It pays to be green.",
            buttonText: "Get Started",
            action: "finish"
        }
    ];

    const handleNavigation = (path, target) => {
        setLoadingTarget(target);
        setTimeout(() => {
            navigate(path);
            setLoadingTarget(null);
        }, 400);
    };

    const nextSlide = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(curr => curr + 1);
        }
    };

    // If we are past the last slide (index 2), show the Auth UI
    const showAuth = currentSlide === slides.length;

    const handleSlideAction = (action) => {
        if (action === 'next') {
            nextSlide();
        } else {
            setCurrentSlide(slides.length); // Move to Auth View
        }
    };

    return (
        <PageTransition>
            <div className="min-h-screen flex flex-col items-center justify-center bg-white px-6 relative overflow-hidden font-sans">
                {/* Background Decor */}
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-green-50 via-white to-white -z-20"></div>
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-green-100 rounded-full blur-3xl opacity-50 -z-10 animate-pulse"></div>
                <div className="absolute top-40 -left-20 w-72 h-72 bg-blue-50 rounded-full blur-3xl opacity-40 -z-10"></div>

                {/* SLIDES VIEW */}
                {!showAuth && (
                    <div className="w-full max-w-md flex flex-col items-center text-center animate-fade-in-up">
                        {/* Image Container with Glow */}
                        <div className="relative mb-8 w-full aspect-square max-w-[320px] flex items-center justify-center">
                            <div className="absolute inset-0 bg-gradient-to-tr from-green-200 to-transparent rounded-full blur-2xl opacity-30 transform scale-90"></div>
                            <img
                                key={slides[currentSlide].image} // Force re-render for animation
                                src={slides[currentSlide].image}
                                alt={slides[currentSlide].title}
                                className="w-full h-full object-contain drop-shadow-2xl animate-float-slow z-10"
                            />
                        </div>

                        {/* Text Content */}
                        <div className="space-y-4 mb-10 px-4">
                            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight leading-tight">
                                {slides[currentSlide].title}
                            </h2>
                            <p className="text-gray-500 text-lg leading-relaxed">
                                {slides[currentSlide].text}
                            </p>
                        </div>

                        {/* Pagination Dots */}
                        <div className="flex space-x-2 mb-8">
                            {slides.map((_, idx) => (
                                <div
                                    key={idx}
                                    className={`h-2 rounded-full transition-all duration-300 ${idx === currentSlide ? 'w-8 bg-green-600' : 'w-2 bg-gray-300'}`}
                                />
                            ))}
                        </div>

                        {/* Action Button */}
                        <button
                            onClick={() => handleSlideAction(slides[currentSlide].action)}
                            className="w-full max-w-xs bg-gray-900 text-white py-4 rounded-2xl font-bold text-lg shadow-xl hover:bg-black hover:scale-105 transition-all active:scale-95"
                        >
                            {slides[currentSlide].buttonText}
                        </button>
                    </div>
                )}

                {/* LOGIN / REGISTER VIEW (Final Step) */}
                {showAuth && (
                    <div className="w-full max-w-md text-center space-y-8 z-10 animate-fade-in">
                        {/* Logo / Branding */}
                        <div className="mb-10 transform scale-110">
                            <img src="/logo.png" alt="ReVesta Logo" className="h-28 w-28 mx-auto mb-6 rounded-full shadow-2xl border-4 border-white" />
                            <h1 className="text-5xl font-extrabold text-gray-900 tracking-tighter">ReVesta</h1>
                            <p className="text-gray-500 mt-3 text-lg font-medium">Recycle. Reward. Repeat.</p>
                        </div>

                        {/* Actions */}
                        <div className="space-y-4 w-full px-2">
                            <button
                                onClick={() => handleNavigation('/login', 'login')}
                                disabled={loadingTarget !== null}
                                className="block w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-green-700 hover:shadow-green-500/30 transition-all transform hover:-translate-y-1 flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed group"
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
                                    <span className="group-hover:tracking-wider transition-all">Log in</span>
                                )}
                            </button>

                            <button
                                onClick={() => handleNavigation('/register', 'register')}
                                disabled={loadingTarget !== null}
                                className="block w-full bg-white text-gray-800 border-2 border-gray-100 py-4 rounded-2xl font-bold text-lg hover:bg-gray-50 hover:border-gray-200 transition-all flex items-center justify-center disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                            >
                                {loadingTarget === 'register' ? (
                                    <div className="flex items-center space-x-2">
                                        <svg className="animate-spin h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Loading...</span>
                                    </div>
                                ) : (
                                    "Create Account"
                                )}
                            </button>
                        </div>

                        {/* Footer / Terms */}
                        <p className="text-xs text-gray-400 mt-12 px-8 leading-relaxed">
                            By continuing, you agree to our <span className="text-gray-600 underline cursor-pointer">Terms of Service</span> and <span className="text-gray-600 underline cursor-pointer">Privacy Policy</span>.
                        </p>
                    </div>
                )}
            </div>
        </PageTransition>
    );
};

export default Intro;
