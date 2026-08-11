import { Search, Bell, Mail, HelpCircle, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import NotificationsDropdown from '../notifications/NotificationsDropdown';

export default function Header() {
    const navigate = useNavigate();
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    const handleProfileClick = () => {
        navigate('/profile');
    };

    return (
        <header className="header-bg sticky top-0 z-20 shadow-lg">
            <div className="px-8 py-4 flex items-center justify-between gap-8">
                {/* Search Bar */}
                <div className="flex-1 max-w-xl relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Search className="w-5 h-5 text-white/60 group-focus-within:text-white transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search"
                        className="w-full h-11 bg-white/10 hover:bg-white/20 focus:bg-white/20 border border-white/20 rounded-full pl-12 pr-4 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 transition-all font-medium"
                    />
                </div>

                <div className="flex items-center space-x-8">
                    {/* Action Icons */}
                    <div className="flex items-center space-x-6 text-white/80">
                        <button className="hover:text-white transition-colors"><Mail className="w-5 h-5" /></button>
                        <div className="relative">
                            <button
                                className="hover:text-white transition-colors relative"
                                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                            >
                                <Bell className="w-5 h-5" />
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-blue-700"></span>
                            </button>
                            <NotificationsDropdown
                                isOpen={isNotificationsOpen}
                                onClose={() => setIsNotificationsOpen(false)}
                            />
                        </div>
                        <button className="hover:text-white transition-colors"><HelpCircle className="w-5 h-5" /></button>
                    </div>

                    {/* Vertical Divider */}
                    <div className="h-8 w-px bg-white/20"></div>

                    {/* Admin Profile */}
                    <button
                        onClick={handleProfileClick}
                        className="flex items-center space-x-3 group bg-white/5 hover:bg-white/10 p-1.5 pr-4 rounded-full transition-all"
                    >
                        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-blue-600 font-bold overflow-hidden border-2 border-white/30 group-hover:border-white/50 transition-all">
                            <span className="text-sm">AD</span>
                        </div>
                        <div className="text-left">
                            <p className="text-sm font-bold text-white leading-tight">ADMINISTRATOR</p>
                            <p className="text-[10px] font-medium text-white/60 tracking-wider">SUPER ADMIN</p>
                        </div>
                        <ChevronDown className="w-4 h-4 text-white/60 group-hover:text-white transition-colors" />
                    </button>
                </div>
            </div>
        </header>
    );
}
