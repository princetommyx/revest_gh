import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/users';
import { Users, Truck, Trash2, Recycle, Loader2, Info, Activity, Wallet, UserPlus } from 'lucide-react';
import { formatNumber } from '../utils/formatters';
import AddAdminModal from '../components/users/AddAdminModal';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';

function StatCard({ title, value, detail, icon: Icon, isPrimary, index }) {
    return (
        <div className={`rounded-3xl shadow-premium animate-slide-up p-6 relative overflow-hidden group border border-gray-100/50 ${isPrimary ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-white text-gray-900'
            }`} style={{ animationDelay: `${index * 100}ms` }}>
            <div className="relative z-10">
                <div className="flex items-center space-x-3 mb-4">
                    <div className={`p-2.5 rounded-xl ${isPrimary ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>
                        <Icon className="w-5 h-5" />
                    </div>
                    <p className={`text-xs font-bold uppercase tracking-wider ${isPrimary ? 'text-white/80' : 'text-gray-400'}`}>{title}</p>
                </div>
                <div className="flex items-end justify-between">
                    <div>
                        <h3 className="text-3xl font-extrabold mb-1 tracking-tight">{formatNumber(value)}</h3>
                        <p className={`text-[10px] font-bold ${isPrimary ? 'text-white/60' : 'text-gray-400'}`}>
                            {detail || 'TOTAL REGISTERED'}
                        </p>
                    </div>
                    {isPrimary && (
                        <div className="bg-white/20 p-1 rounded-lg">
                            <Info className="w-3 h-3 text-white" />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// One per slice the distribution can return (material_distribution caps at
// six). The legend indexes this directly, so a short list left later rows
// with an undefined colour and no dot at all.
const COLORS = ['#0047ff', '#1e293b', '#94a3b8', '#059669', '#f59e0b', '#7c3aed'];

export default function Dashboard() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const { data: stats, isLoading, error } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: usersApi.getStats,
        refetchInterval: 30000,
    });

    // Both of these were hardcoded: a Jan-Sep curve with a comment saying
    // it existed to match a mockup, and a fixed Paper 400 / Plastic 300 /
    // Metal 300 split. An admin reading this dashboard had no way to know
    // the numbers were invented. They now come from /admin/stats/.
    const trendData = (stats?.signup_trend || []).map((point) => ({
        name: point.label,
        value: point.value,
    }));
    const distributionData = stats?.material_distribution || [];

    // The chart header said "January 2025" no matter what it was showing.
    const trendRange = trendData.length
        ? `${trendData[0].name} – ${trendData[trendData.length - 1].name}`
        : 'No data yet';

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="p-8 space-y-8 animate-fade-in max-w-[1600px] mx-auto">
            {/* Header / Actions */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                <div>
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Dashboard Overview</h2>
                    <p className="text-sm text-gray-500 font-medium mt-1">Welcome back to the Revesta admin panel.</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center justify-center px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30 w-full sm:w-auto"
                >
                    <UserPlus className="w-5 h-5 mr-2" />
                    Create Admin
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <StatCard
                    title="Total Users"
                    value={stats?.total_users || 0}
                    icon={Users}
                    index={1}
                />
                <StatCard
                    title="Collectors"
                    value={stats?.collectors || 0}
                    icon={Truck}
                    index={2}
                />
                <StatCard
                    title="Disposers"
                    value={stats?.sellers || 0}
                    icon={Trash2}
                    index={3}
                />
                <StatCard
                    title="Recyclers"
                    value={stats?.recyclers || 0}
                    icon={Recycle}
                    index={4}
                />
                <StatCard
                    title="Active Pickups"
                    value={stats?.active_pickups || 0}
                    detail="CURRENTLY IN PROGRESS"
                    icon={Activity}
                    isPrimary={true}
                    index={5}
                />
            </div>

            {/* Main Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Registrations Chart */}
                <div className="lg:col-span-2 bg-white rounded-3xl sm:rounded-[32px] p-4 sm:p-8 shadow-premium border border-gray-100/50 overflow-hidden w-full max-w-full">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                        <div>
                            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">New sign-ups</h3>
                            <p className="text-sm text-gray-400 font-medium">{trendRange} · by month</p>
                        </div>
                    </div>

                    <div className="h-[250px] sm:h-[300px] w-full -ml-2 sm:ml-0">
                        {trendData.length === 0 ? (
                            <div className="flex h-full items-center justify-center text-sm text-gray-400">
                                No sign-ups recorded yet.
                            </div>
                        ) : (
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trendData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#0047ff" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#0047ff" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#0047ff"
                                    strokeWidth={4}
                                    fillOpacity={1}
                                    fill="url(#colorValue)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                        )}
                    </div>

                </div>

                {/* Right Side Widgets */}
                <div className="space-y-8">
                    {/* Top Sale Pie Chart */}
                    <div className="bg-white rounded-[32px] p-8 shadow-premium border border-gray-100/50">
                        <h3 className="text-lg font-extrabold text-gray-900 mb-6 tracking-tight">Top Material Source</h3>
                        {distributionData.length === 0 ? (
                            <p className="py-10 text-center text-sm text-gray-400">
                                No listings yet, so there is no material mix to show.
                            </p>
                        ) : (
                        <>
                        <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={distributionData}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {distributionData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="mt-4 space-y-3">
                            {distributionData.map((item, idx) => (
                                <div key={item.name} className="flex justify-between items-center">
                                    <div className="flex items-center space-x-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                                        <span className="text-sm font-bold text-gray-500">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-extrabold text-gray-900">{item.value}</span>
                                </div>
                            ))}
                        </div>
                        </>
                        )}
                    </div>

                    {/* This panel was "System Status": three bars for API
                        Server, Cloud Storage and Database, every one of them
                        reading 98% UP from a literal width: '98%'. There is no
                        uptime monitoring behind this dashboard, so it was
                        inventing reassurance. Replaced with counts that are
                        actually measured, each linking to the screen that
                        clears it. */}
                    <div className="bg-white rounded-[32px] p-8 shadow-premium border border-gray-100/50">
                        <h3 className="text-lg font-extrabold text-gray-900 mb-6 tracking-tight">Needs attention</h3>
                        <div className="space-y-1">
                            {[
                                { label: 'Open support tickets', value: stats?.open_tickets ?? 0, to: '/support' },
                                { label: 'Tickets in progress', value: stats?.in_progress_tickets ?? 0, to: '/support' },
                                { label: 'Pickups in progress', value: stats?.active_rides ?? 0, to: '/pickups' },
                                { label: 'New users today', value: stats?.new_users_today ?? 0, to: '/users' },
                            ].map(({ label, value, to }) => (
                                <Link
                                    key={label}
                                    to={to}
                                    className="flex items-center justify-between rounded-xl px-3 py-3 -mx-3 transition-colors hover:bg-gray-50"
                                >
                                    <span className="text-sm font-medium text-gray-600">{label}</span>
                                    <span className={`text-lg font-extrabold tabular-nums ${value > 0 ? 'text-gray-900' : 'text-gray-300'}`}>
                                        {value}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Modals */}
            <AddAdminModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />
        </div>
    );
}
