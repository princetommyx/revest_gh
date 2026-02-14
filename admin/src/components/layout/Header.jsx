import { useState, useEffect } from 'react';
import { LogOut, Bell, Clock, Sun, Moon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';
import NotificationsDropdown from '../notifications/NotificationsDropdown';
import { useTheme } from '../../context/ThemeContext';

export default function Header() {
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const formatTime = (date) => {
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true
        });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const handleLogout = () => {
        authApi.logout();
        navigate('/login');
    };

    const handleProfileClick = () => {
        navigate('/profile');
    };

    return (
        <header className="glass sticky top-0 z-20 border-b border-white/20 dark:border-gray-700 shadow-lg animate-slide-down dark:bg-gray-800/80">
            <div className="px-6 py-4 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold gradient-text">Welcome back</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Here's what's happening today</p>
                </div>

                <div className="flex items-center space-x-4">
                    {/* Theme Toggle */}
                    <button
                        onClick={toggleTheme}
                        className="p-2.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 dark:text-gray-300 dark:hover:text-purple-400 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 hover-scale"
                        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {theme === 'dark' ? (
                            <Sun className="w-5 h-5" />
                        ) : (
                            <Moon className="w-5 h-5" />
                        )}
                    </button>

                    {/* Real-Time Clock */}
                    <div className="hidden md:flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100">
                        <Clock className="w-4 h-4 text-purple-600" />
                        <div className="text-right">
                            <p className="text-sm font-bold text-gray-900">{formatTime(currentTime)}</p>
                            <p className="text-xs text-gray-500">{formatDate(currentTime)}</p>
                        </div>
                    </div>
                    {/* Notifications */}
                    <div className="relative">
                        <button
                            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                            className="relative p-2.5 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all duration-200 hover-scale group"
                        >
                            <Bell className="w-5 h-5" />
                            {/* Notification Badge */}
                            <span className="absolute top-2 right-2 w-2 h-2 bg-gradient-to-r from-red-500 to-pink-500 rounded-full animate-pulse-slow"></span>
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                        </button>

                        {/* Notifications Dropdown */}
                        <NotificationsDropdown
                            isOpen={isNotificationsOpen}
                            onClose={() => setIsNotificationsOpen(false)}
                        />
                    </div>

                    {/* Admin Info & Profile - Now Clickable */}
                    <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                        <div
                            onClick={handleProfileClick}
                            className="flex items-center space-x-3 cursor-pointer hover:opacity-80 transition-opacity group"
                        >
                            <div className="text-right">
                                <p className="text-sm font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                                    Admin
                                </p>
                                <p className="text-xs text-gray-500">Administrator</p>
                            </div>
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-lg hover:shadow-xl transition-shadow">
                                A
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 hover-scale"
                            title="Logout"
                        >
                            <LogOut className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
