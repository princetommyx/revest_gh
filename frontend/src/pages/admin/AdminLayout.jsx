import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, Activity, MessageSquare, Settings, ShieldCheck,
    LogOut, Bell, ChevronLeft, Menu, X
} from 'lucide-react';
import useAuth from '../../hooks/useAuth';
import { useAdmin } from '../../contexts/AdminContext';

const AdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [showNotifications, setShowNotifications] = useState(false); // UI State
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { notifications, markNotificationRead } = useAdmin(); // Get function from context

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const unreadNotifications = notifications?.filter(n => !n.is_read).length || 0;

    const navigation = [
        { name: 'Overview', href: '/admin-dashboard', icon: LayoutDashboard },
        { name: 'Users', href: '/admin-dashboard/users', icon: Users },
        { name: 'Activity', href: '/admin-dashboard/activity', icon: Activity },
        { name: 'Support', href: '/admin-dashboard/support', icon: MessageSquare },
        { name: 'Admins', href: '/admin-dashboard/admins', icon: ShieldCheck },
        { name: 'Settings', href: '/admin-dashboard/settings', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className={`bg-white border-r border-gray-200 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                        {sidebarOpen ? (
                            <>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                                        <span className="text-white font-bold">R</span>
                                    </div>
                                    <span className="font-bold text-gray-900">ReVesta Admin</span>
                                </div>
                                <button
                                    onClick={() => setSidebarOpen(false)}
                                    className="p-1 hover:bg-gray-100 rounded"
                                >
                                    <ChevronLeft size={20} className="text-gray-600" />
                                </button>
                            </>
                        ) : (
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="p-1 hover:bg-gray-100 rounded mx-auto"
                            >
                                <Menu size={20} className="text-gray-600" />
                            </button>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1">
                        {navigation.map((item) => {
                            const isActive = location.pathname === item.href;
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive
                                        ? 'bg-primary text-white'
                                        : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                >
                                    <item.icon size={20} />
                                    {sidebarOpen && <span className="font-medium">{item.name}</span>}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Profile */}
                    <div className="p-4 border-t border-gray-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                                <span className="text-white font-bold">
                                    {user?.username?.[0]?.toUpperCase() || 'A'}
                                </span>
                            </div>
                            {sidebarOpen && (
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                        {user?.username || 'Admin'}
                                    </p>
                                    <p className="text-xs text-gray-500">Administrator</p>
                                </div>
                            )}
                        </div>
                        {sidebarOpen && (
                            <button
                                onClick={handleLogout}
                                className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <LogOut size={16} />
                                <span>Logout</span>
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <header className="bg-white border-b border-gray-200 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {navigation.find(n => n.href === location.pathname)?.name || 'Dashboard'}
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Notifications */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowNotifications(!showNotifications)}
                                    className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <Bell size={20} className="text-gray-600" />
                                    {unreadNotifications > 0 && (
                                        <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                            {unreadNotifications}
                                        </span>
                                    )}
                                </button>

                                {/* Notification Dropdown */}
                                {showNotifications && (
                                    <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-100 z-50">
                                        <div className="p-3 border-b border-gray-100 flex justify-between items-center">
                                            <h3 className="font-semibold text-gray-900">Notifications</h3>
                                            <span className="text-xs text-gray-500">{unreadNotifications} new</span>
                                        </div>
                                        <div className="max-h-96 overflow-y-auto">
                                            {notifications?.length > 0 ? (
                                                notifications.map((notification, index) => (
                                                    <div
                                                        key={notification.id || index}
                                                        className={`p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.is_read ? 'bg-blue-50/50' : ''}`}
                                                        onClick={() => {
                                                            if (notification.id) markNotificationRead(notification.id);
                                                            setShowNotifications(false);
                                                            if (notification.link) navigate(notification.link);
                                                        }}
                                                    >
                                                        <div className="flex justify-between items-start mb-1">
                                                            <p className="text-sm font-medium text-gray-900">{notification.title || 'Notification'}</p>
                                                            <span className="text-xs text-gray-400">
                                                                {new Date(notification.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-600 line-clamp-2">{notification.message}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 text-center text-gray-500 text-sm">
                                                    No notifications
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Quick Actions */}
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm text-gray-600">System Online</span>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
