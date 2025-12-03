import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Home, ShoppingBag, MessageSquare, User, LogOut, Recycle, X, Menu } from 'lucide-react';
import useAuth from '../hooks/useAuth';

import SupportWidget from '../components/SupportWidget';

const Layout = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const isActive = (path) => location.pathname === path;

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
            {/* Navigation Bar */}
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
                                    <button onClick={logout} className="text-gray-400 hover:text-red-500 transition-colors">
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

                        {/* Mobile Menu Button */}
                        <button
                            className="md:hidden p-2 text-gray-600"
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        >
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden bg-white border-t border-gray-100 absolute w-full px-4 py-6 shadow-xl animate-fade-in-down">
                        <div className="flex flex-col gap-4">
                            <Link to="/" className="text-lg font-bold text-gray-800" onClick={() => setIsMobileMenuOpen(false)}>Logistics</Link>
                            {user?.role !== 'COLLECTOR' && (
                                <Link to="/marketplace" className="text-lg font-bold text-gray-800" onClick={() => setIsMobileMenuOpen(false)}>Marketplace</Link>
                            )}
                            <Link to="/chat" className="text-lg font-bold text-gray-800" onClick={() => setIsMobileMenuOpen(false)}>Messages</Link>
                            <hr className="border-gray-100" />
                            {user ? (
                                <>
                                    <Link to="/profile" className="text-lg font-bold text-gray-800" onClick={() => setIsMobileMenuOpen(false)}>My Profile</Link>
                                    <button onClick={logout} className="text-lg font-bold text-red-500 text-left">Log Out</button>
                                </>
                            ) : (
                                <>
                                    <Link to="/login" className="text-lg font-bold text-gray-800" onClick={() => setIsMobileMenuOpen(false)}>Log In</Link>
                                    <Link to="/register" className="text-lg font-bold text-primary" onClick={() => setIsMobileMenuOpen(false)}>Sign Up</Link>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            {/* Main Content */}
            <main className="pt-20 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <Outlet />
            </main>

            <SupportWidget />
        </div>
    );
};

export default Layout;
