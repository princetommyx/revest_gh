import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    Package,
    Truck,
    Wallet,
    Settings,
    Recycle,
    Shield,
    MessageSquare
} from 'lucide-react';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/users', icon: Users, label: 'App Users' },
    { to: '/system-users', icon: Shield, label: 'System Users' },
    { to: '/listings', icon: Package, label: 'Listings' },
    { to: '/pickups', icon: Truck, label: 'Pickups' },
    { to: '/wallet', icon: Wallet, label: 'Transactions' },
    { to: '/support', icon: MessageSquare, label: 'Support Inbox' },
    { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar() {
    return (
        <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen sticky top-0 flex flex-col shadow-lg transition-colors duration-200">
            {/* Logo */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
                <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow hover-scale">
                        <Recycle className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold gradient-text">Revesta</h1>
                        <p className="text-xs text-gray-500 font-medium">Admin Dashboard</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map((item, index) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        className={({ isActive }) =>
                            `flex items-center space-x-3 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 group animate-slide-up ${isActive
                                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg shadow-purple-500/30'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 dark:hover:from-gray-700 dark:hover:to-gray-600 hover:text-purple-700 dark:hover:text-purple-400'
                            }`
                        }
                        style={{ animationDelay: `${index * 50}ms` }}
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'
                                    }`} />
                                <span className="text-sm">{item.label}</span>
                                {isActive && (
                                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse-slow"></div>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gradient-to-br from-gray-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
                <div className="text-center">
                    <p className="text-xs text-gray-500 font-medium">
                        © 2026 Revesta
                    </p>
                    <div className="mt-2 flex items-center justify-center space-x-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 animate-pulse"></div>
                        <span className="text-xs text-gray-400">System Online</span>
                    </div>
                </div>
            </div>
        </aside>
    );
}
