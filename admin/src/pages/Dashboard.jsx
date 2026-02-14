import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/users';
import { Users, Truck, Trash2, Recycle, TrendingUp, TrendingDown, Loader2, Activity, UserPlus } from 'lucide-react';
import { formatNumber } from '../utils/formatters';

function StatCard({ title, value, icon: Icon, gradient, trend, index }) {
    return (
        <div className={`bg-gradient-to-br ${gradient} rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 hover-scale p-6 overflow-hidden relative animate-slide-up animate-stagger-${index}`}>
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>

            <div className="relative flex items-center justify-between">
                <div className="flex-1">
                    <p className="text-sm font-medium text-white/80 mb-2">{title}</p>
                    <p className="text-4xl font-bold text-white mb-3 animate-scale-in">
                        {formatNumber(value)}
                    </p>
                    {trend !== undefined && (
                        <div className={`flex items-center text-sm font-medium ${trend >= 0 ? 'text-white/90' : 'text-white/90'}`}>
                            {trend >= 0 ? (
                                <TrendingUp className="w-4 h-4 mr-1" />
                            ) : (
                                <TrendingDown className="w-4 h-4 mr-1" />
                            )}
                            <span>{trend >= 0 ? '+' : ''}{trend}% this month</span>
                        </div>
                    )}
                </div>
                <div className="ml-4">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                        <Icon className="w-8 h-8 text-white" />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ActivityCard({ title, items, icon: Icon }) {
    return (
        <div className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 p-6 border border-gray-100 animate-slide-up animate-stagger-2">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">{title}</h3>
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Icon className="w-5 h-5 text-white" />
                </div>
            </div>
            <div className="space-y-4">
                {items.map((item, index) => (
                    <div
                        key={index}
                        className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition-colors"
                    >
                        <span className="text-gray-600 font-medium">{item.label}</span>
                        <div className="flex items-center space-x-2">
                            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                {formatNumber(item.value)}
                            </span>
                            {item.trend && (
                                <span className={`text-xs px-2 py-1 rounded-full ${item.trend > 0
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-red-100 text-red-700'
                                    }`}>
                                    {item.trend > 0 ? '+' : ''}{item.trend}%
                                </span>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { data: stats, isLoading, error } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: usersApi.getStats,
        refetchInterval: 30000, // Auto-refresh every 30 seconds
    });

    const { data: recentUsers } = useQuery({
        queryKey: ['recent-users'],
        queryFn: usersApi.getRecentUsers,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 animate-spin text-purple-600 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Loading dashboard...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-gradient-to-r from-red-50 to-red-100 border border-red-200 rounded-2xl p-6 text-red-800 animate-slide-down">
                    <h3 className="font-bold text-lg mb-2">Error Loading Dashboard</h3>
                    <p>Unable to load dashboard statistics. Please try again.</p>
                </div>
            </div>
        );
    }

    const registrationItems = [
        { label: 'Today', value: stats?.new_registrations?.today || 0 },
        { label: 'This Week', value: stats?.new_registrations?.this_week || 0 },
        { label: 'This Month', value: stats?.new_registrations?.this_month || 0 },
    ];

    const activityItems = [
        { label: 'Active Users (24h)', value: stats?.active_users || 0 },
        { label: 'Online Collectors', value: stats?.online_collectors || 0 },
    ];

    return (
        <div className="p-6 space-y-8 animate-fade-in">
            {/* Welcome Header */}
            <div className="animate-slide-down">
                <h1 className="text-3xl font-bold mb-2">
                    <span className="gradient-text">Welcome to Revesta</span>
                </h1>
                <p className="text-gray-600">Here's what's happening with your platform today</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Users"
                    value={stats?.total_users || 0}
                    icon={Users}
                    gradient="from-purple-500 via-purple-600 to-indigo-600"
                    trend={stats?.growth_percentage}
                    index={1}
                />
                <StatCard
                    title="Collectors"
                    value={stats?.collectors || 0}
                    icon={Truck}
                    gradient="from-blue-500 via-blue-600 to-cyan-500"
                    index={2}
                />
                <StatCard
                    title="Disposers"
                    value={stats?.sellers || 0}
                    icon={Trash2}
                    gradient="from-orange-500 via-orange-600 to-pink-500"
                    index={3}
                />
                <StatCard
                    title="Recyclers"
                    value={stats?.recyclers || 0}
                    icon={Recycle}
                    gradient="from-green-500 via-emerald-600 to-teal-500"
                    index={4}
                />
            </div>

            {/* Activity Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ActivityCard
                    title="New Registrations"
                    items={registrationItems}
                    icon={UserPlus}
                />
                <ActivityCard
                    title="Platform Activity"
                    items={activityItems}
                    icon={Activity}
                />
            </div>

            {/* Recent Users */}
            {recentUsers && recentUsers.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100 animate-slide-up animate-stagger-3">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Recent Users</h3>
                        <span className="px-3 py-1 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700 rounded-full text-sm font-medium">
                            {recentUsers.length} new
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-gray-200">
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Name</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Email</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Role</th>
                                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recentUsers.map((user, index) => (
                                    <tr
                                        key={user.id}
                                        className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-transparent transition-all duration-200"
                                        style={{ animationDelay: `${index * 100}ms` }}
                                    >
                                        <td className="py-4 px-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                                                    {user.first_name?.[0]}{user.last_name?.[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">
                                                        {user.first_name} {user.last_name}
                                                    </p>
                                                    <p className="text-xs text-gray-500">@{user.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-600">{user.email}</td>
                                        <td className="py-4 px-4">
                                            <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-700">
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-sm text-gray-500">
                                            {new Date(user.date_joined).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
