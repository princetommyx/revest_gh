import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/users';
import { Users, Truck, Trash2, Recycle, TrendingUp, Loader2 } from 'lucide-react';
import { formatNumber } from '../utils/formatters';

function StatCard({ title, value, icon: Icon, color, trend }) {
    return (
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
                    <p className="text-3xl font-bold text-gray-900">{formatNumber(value)}</p>
                    {trend && (
                        <p className={`text-sm mt-2 flex items-center ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            <TrendingUp className="w-4 h-4 mr-1" />
                            {trend >= 0 ? '+' : ''}{trend}% from last month
                        </p>
                    )}
                </div>
                <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center`}>
                    <Icon className="w-6 h-6 text-white" />
                </div>
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
                <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                    Error loading dashboard statistics. Please try again.
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Users"
                    value={stats?.total_users || 0}
                    icon={Users}
                    color="bg-primary-500"
                    trend={stats?.growth_percentage}
                />
                <StatCard
                    title="Collectors"
                    value={stats?.collectors || 0}
                    icon={Truck}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Disposers"
                    value={stats?.sellers || 0}
                    icon={Trash2}
                    color="bg-orange-500"
                />
                <StatCard
                    title="Recyclers"
                    value={stats?.recyclers || 0}
                    icon={Recycle}
                    color="bg-green-500"
                />
            </div>

            {/* Activity Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* New Registrations */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">New Registrations</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2">
                            <span className="text-gray-600">Today</span>
                            <span className="font-semibold text-gray-900">
                                {formatNumber(stats?.new_registrations?.today || 0)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-t border-gray-100">
                            <span className="text-gray-600">This Week</span>
                            <span className="font-semibold text-gray-900">
                                {formatNumber(stats?.new_registrations?.this_week || 0)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-t border-gray-100">
                            <span className="text-gray-600">This Month</span>
                            <span className="font-semibold text-gray-900">
                                {formatNumber(stats?.new_registrations?.this_month || 0)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Online Status */}
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Now</h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2">
                            <span className="text-gray-600">Active Users (24h)</span>
                            <span className="font-semibold text-gray-900">
                                {formatNumber(stats?.active_users || 0)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-t border-gray-100">
                            <span className="text-gray-600">Online Collectors</span>
                            <div className="flex items-center space-x-2">
                                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                <span className="font-semibold text-gray-900">
                                    {formatNumber(stats?.online_collectors || 0)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Users */}
            {recentUsers && recentUsers.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Users</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Name</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Email</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Role</th>
                                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-600">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {recentUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50">
                                        <td className="py-3 px-4 text-sm text-gray-900 font-medium">
                                            {user.first_name} {user.last_name}
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                                        <td className="py-3 px-4">
                                            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-primary-100 text-primary-800">
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-sm text-gray-600">
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
