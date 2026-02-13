import { LogOut, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api/auth';

export default function Header() {
    const navigate = useNavigate();

    const handleLogout = () => {
        authApi.logout();
        navigate('/login');
    };

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
            <div className="px-6 py-4 flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Welcome back</h2>
                    <p className="text-sm text-gray-500">Here's what's happening today</p>
                </div>

                <div className="flex items-center space-x-4">
                    {/* Notifications */}
                    <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition relative">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                    </button>

                    {/* Admin Info & Logout */}
                    <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">Admin</p>
                            <p className="text-xs text-gray-500">Administrator</p>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
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
