import { useState } from 'react';
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

const COLORS = ['#0047ff', '#1e293b', '#94a3b8'];

export default function Dashboard() {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    const { data: stats, isLoading, error } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: usersApi.getStats,
        refetchInterval: 30000,
    });

    // Mock trend data for the chart (alignment with the image)
    const trendData = [
        { name: 'Jan', value: 30 },
        { name: 'Feb', value: 45 },
        { name: 'Mar', value: 35 },
        { name: 'Apr', value: 50 },
        { name: 'May', value: 70 },
        { name: 'Jun', value: 65 },
        { name: 'Jul', value: 90 },
        { name: 'Aug', value: 85 },
        { name: 'Sep', value: 95 },
    ];

    const distributionData = [
        { name: 'Paper', value: 400 },
        { name: 'Plastic', value: 300 },
        { name: 'Metal', value: 300 },
    ];

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
                            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">January 2025</h3>
                            <p className="text-sm text-gray-400 font-medium">Platform Growth Analysis</p>
                        </div>
                        <div className="flex items-center space-x-2 bg-gray-50 p-1 rounded-xl self-stretch sm:self-auto justify-center">
                            <button className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg bg-white shadow-sm text-blue-600">Daily</button>
                            <button className="flex-1 sm:flex-none px-4 py-2 text-xs font-bold rounded-lg text-gray-400">Weekly</button>
                        </div>
                    </div>

                    <div className="h-[250px] sm:h-[300px] w-full -ml-2 sm:ml-0">
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
                    </div>

                    {/* Simple Date Selector as seen in image */}
                    <div className="mt-8 flex justify-between overflow-x-auto hide-scrollbar items-center px-2 sm:px-4 gap-2 sm:gap-4 pb-2">
                        {[5, 6, 7, 8, 9, 10, 11].map(day => (
                            <div key={day} className={`flex-shrink-0 flex flex-col items-center p-2 sm:p-3 rounded-2xl transition-all ${day === 7 ? 'bg-blue-600 text-white shadow-lg' : ''}`}>
                                <span className="text-[10px] font-bold uppercase opacity-60 mb-1">Mon</span>
                                <span className="text-lg font-extrabold min-w-[1.5rem] text-center">{day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right Side Widgets */}
                <div className="space-y-8">
                    {/* Top Sale Pie Chart */}
                    <div className="bg-white rounded-[32px] p-8 shadow-premium border border-gray-100/50">
                        <h3 className="text-lg font-extrabold text-gray-900 mb-6 tracking-tight">Top Material Source</h3>
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
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx] }}></div>
                                        <span className="text-sm font-bold text-gray-500">{item.name}</span>
                                    </div>
                                    <span className="text-sm font-extrabold text-gray-900">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Traffic Source / Mini List */}
                    <div className="bg-white rounded-[32px] p-8 shadow-premium border border-gray-100/50">
                        <h3 className="text-lg font-extrabold text-gray-900 mb-6 tracking-tight">System Status</h3>
                        <div className="space-y-6">
                            {['API Server', 'Cloud Storage', 'Database'].map(item => (
                                <div key={item}>
                                    <div className="flex justify-between text-xs font-bold mb-2">
                                        <span className="text-gray-400 uppercase">{item}</span>
                                        <span className="text-blue-600">98% UP</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-600 rounded-full" style={{ width: '98%' }}></div>
                                    </div>
                                </div>
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
