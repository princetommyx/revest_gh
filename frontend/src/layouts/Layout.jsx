import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, MessageSquare, User, LogOut, Recycle, X, Menu, History } from 'lucide-react';
import useAuth from '../hooks/useAuth';

import SupportWidget from '../components/SupportWidget';
import { useToast } from '../contexts/ToastContext';

const Layout = () => {
    const { user, logout } = useAuth();
    const { showSuccess } = useToast();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isHomePage = location.pathname === '/';
    const isActive = (path) => location.pathname === path;


    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            {/* Standard Navigation Bar - Hidden on Home */}
            {!isHomePage && (
                <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-200 z-50">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex justify-between h-16 items-center">
                            {/* Logo */}
                            <Link to="/" className="flex items-center gap-2 group">
                                <div className="bg-primary p-2 rounded-xl group-hover:rotate-12 transition-transform">
                                    <Recycle size={24} className="text-white" />
                                </div>
                                <span className="text-2xl font-black tracking-tight text-gray-900">
                                    Re<span className="text-primary">Vesta</span>
                                </span>
                            </Link>

                            {/* Desktop Menu */}
                            <div className="hidden md:flex items-center gap-8">
                                <Link to="/" className={`text-sm font-bold hover:text-primary transition-colors ${isActive('/') ? 'text-primary' : 'text-gray-600'}`}>
                                    Logistics
                                </Link>
                                {user?.role !== 'COLLECTOR' && (
                                    <Link to="/marketplace" className={`text-sm font-bold hover:text-primary transition-colors ${isActive('/marketplace') ? 'text-primary' : 'text-gray-600'}`}>
                                        Marketplace
                                    </Link>
                                )}
                                <Link to="/chat" className={`text-sm font-bold hover:text-primary transition-colors ${isActive('/chat') ? 'text-primary' : 'text-gray-600'}`}>
                                    Messages
                                </Link>

                                {user ? (
                                    <div className="flex items-center gap-4 pl-4 border-l border-gray-200">
                                        <Link to="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                                            <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                                {user.username[0].toUpperCase()}
                                            </div>
                                            <span className="text-sm font-bold">{user.username}</span>
                                        </Link>
                                        <button
                                            onClick={() => {
                                                logout();
                                                showSuccess('Logged out successfully!');
                                            }}
                                            className="text-gray-400 hover:text-red-500 transition-colors"
                                        >
                                            <LogOut size={20} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4">
                                        <Link to="/login" className="text-sm font-bold text-gray-600 hover:text-primary">Log In</Link>
                                        <Link to="/register" className="bg-primary text-white px-5 py-2.5 rounded-full text-sm font-bold hover:bg-green-600 transition-all shadow-lg shadow-green-200 hover:shadow-green-300">
                                            Get Started
                                        </Link>
                                    </div>
                                )}
                            </div>

                            {/* Mobile Menu Button (Standard) */}
                            <button
                                className="md:hidden p-2 text-gray-600"
                                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            >
                                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </nav>
            )}

            {/* Floating Menu Button for Home Page */}
            {isHomePage && (
                <button
                    className="fixed top-4 left-4 z-[2000] p-3 bg-white rounded-full shadow-lg text-gray-800 hover:bg-gray-50 transition-all"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    <Menu size={24} />
                </button>
            )}

            {/* Global Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div className="fixed inset-0 z-[3000] bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}>
                    <div className="absolute top-0 left-0 w-3/4 max-w-xs h-full bg-white shadow-2xl p-6 animate-slide-right" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-8">
                            <Link to="/" className="flex items-center gap-2">
                                <div className="bg-primary p-1.5 rounded-lg">
                                    <Recycle size={20} className="text-white" />
                                </div>
                                { /* Logo Image */}
                                <img src="/logo.png" alt="ReVesta Logo" className="h-8 w-8 mr-2 rounded-full" />
                                <span className="text-xl font-black text-gray-900">ReVesta</span>
                            </Link>
                            <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-500 hover:text-gray-900">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-6">
                            <Link to="/" className="text-lg font-bold text-gray-800 flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                                <Home size={20} /> Home
                            </Link>
                            {user?.role !== 'COLLECTOR' && (
                                <Link to="/marketplace" className="text-lg font-bold text-gray-800 flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                                    <ShoppingBag size={20} /> Marketplace
                                </Link>
                            )}
                            <Link to="/chat" className="text-lg font-bold text-gray-800 flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                                <MessageSquare size={20} /> Messages
                            </Link>
                            <Link to="/ride-history" className="text-lg font-bold text-gray-800 flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                                <History size={20} /> Ride History
                            </Link>
                            <hr className="border-gray-100" />
                            {user ? (
                                <>
                                    <Link to="/profile" className="text-lg font-bold text-gray-800 flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                                        <User size={20} /> My Profile
                                    </Link>
                                    <button
                                        onClick={() => {
                                            logout();
                                            showSuccess('Logged out successfully!');
                                        }}
                                        className="text-lg font-bold text-red-500 flex items-center gap-3 text-left"
                                    >
                                        <LogOut size={20} /> Log Out
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link to="/login" className="text-lg font-bold text-gray-800" onClick={() => setIsMobileMenuOpen(false)}>Log In</Link>
                                    <Link to="/register" className="text-lg font-bold text-primary" onClick={() => setIsMobileMenuOpen(false)}>Sign Up</Link>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className={`${isHomePage ? 'h-screen w-full relative' : 'pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto'}`}>
                <Outlet />
            </main>

            {!isHomePage && <SupportWidget />}
        </div>
    );
};

export default Layout;
