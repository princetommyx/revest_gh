import { NavLink, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard, Users, Package, Truck, Wallet,
    Settings, Recycle, Shield, MessageSquare, Megaphone, LogOut
} from 'lucide-react';
import { authApi } from '../../api/auth';
import LogoImg from '../../assets/logo.png';

const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/users', icon: Users, label: 'App Users' },
    { to: '/system-users', icon: Shield, label: 'System Users' },
    { to: '/listings', icon: Package, label: 'Listings' },
    { to: '/pickups', icon: Truck, label: 'Pickups' },
    { to: '/wallet', icon: Wallet, label: 'Transactions' },
    { to: '/support', icon: MessageSquare, label: 'Support Inbox' },
    { to: '/kyc-review', icon: Shield, label: 'KYC Verification' },
    { to: '/promos', icon: Megaphone, label: 'Promo Cards' },
    { to: '/onboarding', icon: Recycle, label: 'Onboarding' },
    { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ isOpen, onClose }) {
    const navigate = useNavigate();

    const handleLogout = () => {
        authApi.logout();
        navigate('/login');
    };

    return (
        <aside className={`
            w-64 sidebar-bg text-white h-screen flex flex-col transition-transform duration-300
            fixed z-40 top-0 left-0
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
            md:relative md:translate-x-0
        `}>
            {/* Logo */}
            <div className="p-6 pb-8">
                <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden bg-white/10 p-2 flex items-center justify-center border border-white/5 shadow-inner">
                        <img src={LogoImg} alt="Revesta" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black tracking-tight text-white leading-none">Revesta</h1>
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Admin</span>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        end={item.to === '/'}
                        onClick={onClose}
                        className={({ isActive }) =>
                            `flex items-center space-x-4 px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`
                        }
                    >
                        <item.icon className="w-5 h-5" />
                        <span className="text-sm font-medium">{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* Logout Button */}
            <div className="p-6 mt-auto">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center space-x-3 px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold transition-all duration-200 shadow-lg shadow-blue-500/20 group"
                >
                    <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    <span className="text-sm tracking-wide">LOGOUT</span>
                </button>
            </div>
        </aside>
    );
}
