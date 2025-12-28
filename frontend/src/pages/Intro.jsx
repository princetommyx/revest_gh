import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import PageTransition from '../components/PageTransition';

const Intro = () => {
    const navigate = useNavigate();
    const [loadingTarget, setLoadingTarget] = useState(null);
    const [currentSlide, setCurrentSlide] = useState(0);

    // Carousel Data - Using lifestyle background images
    const slides = [
        {
            id: 0,
            image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&q=80&w=1600", // Clean city street/recycling theme
            title: "Revolutionizing Waste",
            text: "Join the future of smart waste management in Ghana. Fast, efficient, and green.",
            buttonText: "Next",
            action: "next"
        },
        {
            id: 1,
            image: "https://images.unsplash.com/photo-1512428559087-560fa5ceab42?auto=format&fit=crop&q=80&w=1600", // Communicating/Rewards theme
            title: "Earn Every Time you Recycle",
            text: "Turn your waste into instant rewards. Get paid directly to your mobile wallet.",
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

    const showAuth = currentSlide === slides.length;

    const handleSlideAction = (action) => {
        if (action === 'next') {
            nextSlide();
        } else {
            setCurrentSlide(slides.length);
        }
    };

    // Preload images for smooth transition
    useEffect(() => {
        slides.forEach(slide => {
            const img = new Image();
            img.src = slide.image;
        });
    }, []);

    return (
        <PageTransition>
            <div className="relative min-h-screen w-full overflow-hidden bg-black font-sans">

                {/* BACKGROUND IMAGES (Full Page) */}
                {slides.map((slide, index) => (
                    <div
                        key={slide.id}
                        className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${!showAuth && currentSlide === index ? 'opacity-100' : 'opacity-0'
                            }`}
                    >
                        <div className="absolute inset-0 bg-black/40 z-10" /> {/* Dark overlay for readability */}
                        <img
                            src={slide.image}
                            alt={slide.title}
                            className="h-full w-full object-cover"
                        />
                    </div>
                ))}

                {/* FINAL AUTH BACKGROUND (Slightly blurred or static) */}
                <div className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${showAuth ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute inset-0 bg-green-900/40 z-10 backdrop-blur-sm" />
                    <img
                        src={slides[1].image}
                        className="h-full w-full object-cover scale-110"
                        alt="Auth Background"
                    />
                </div>

                {/* CONTENT OVERLAY */}
                <div className="relative z-20 flex min-h-screen flex-col items-center justify-end pb-16 px-6">

                    {/* SLIDES VIEW */}
                    {!showAuth && (
                        <div className="w-full max-w-md animate-fade-in-up">
                            {/* Text Content */}
                            <div className="mb-10 text-left">
                                <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3 drop-shadow-lg">
                                    {slides[currentSlide].title}
                                </h1>
                                <p className="text-gray-200 text-lg font-medium leading-relaxed drop-shadow-md">
                                    {slides[currentSlide].text}
                                </p>
                            </div>

                            {/* Pagination Indicators */}
                            <div className="flex space-x-2 mb-8">
                                {slides.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentSlide ? 'w-10 bg-primary' : 'w-4 bg-white/30'}`}
                                    />
                                ))}
                            </div>

                            {/* Action Button - Bolt Style */}
                            <button
                                onClick={() => handleSlideAction(slides[currentSlide].action)}
                                className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-2xl hover:bg-green-600 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                {slides[currentSlide].buttonText}
                                <span className="text-xl">→</span>
                            </button>
                        </div>
                    )}

                    {/* AUTH VIEW */}
                    {showAuth && (
                        <div className="w-full max-w-md text-center animate-fade-in space-y-8">
                            {/* Logo */}
                            <div className="mb-8">
                                <img src="/logo.png" alt="ReVesta Logo" className="h-24 w-24 mx-auto mb-4 rounded-full border-2 border-white/50 shadow-2xl" />
                                <h2 className="text-4xl font-black text-white tracking-tight">ReVesta</h2>
                                <p className="text-green-100 font-medium tracking-wide">Recycle. Reward. Repeat.</p>
                            </div>

                            <div className="space-y-4 w-full">
                                <button
                                    onClick={() => handleNavigation('/login', 'login')}
                                    disabled={loadingTarget !== null}
                                    className="w-full bg-primary text-white py-4 rounded-xl font-bold text-lg shadow-xl hover:bg-green-600 transition-all active:scale-95 flex items-center justify-center disabled:opacity-70"
                                >
                                    {loadingTarget === 'login' ? 'Opening...' : 'Login'}
                                </button>

                                <button
                                    onClick={() => handleNavigation('/register', 'register')}
                                    disabled={loadingTarget !== null}
                                    className="w-full bg-white/10 backdrop-blur-md border border-white/20 text-white py-4 rounded-xl font-bold text-lg hover:bg-white/20 transition-all active:scale-95 flex items-center justify-center disabled:opacity-70"
                                >
                                    {loadingTarget === 'register' ? 'Loading...' : 'Create Account'}
                                </button>
                            </div>

                            <p className="text-[10px] text-gray-300 uppercase tracking-widest pt-4">
                                Join the movement for a cleaner Ghana
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </PageTransition>
    );
};

export default Intro;
