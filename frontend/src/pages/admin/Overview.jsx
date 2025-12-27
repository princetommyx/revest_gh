import { useAdmin } from '../../contexts/AdminContext';
import { Users, ShoppingCart, Truck, Ticket, TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ title, value, change, changeType, icon: Icon, color = 'blue' }) => {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        purple: 'bg-purple-100 text-purple-600',
        orange: 'bg-orange-100 text-orange-600',
    };

    return (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{value?.toLocaleString() || '0'}</p>
                    {change !== undefined && (
                        <div className={`flex items-center gap-1 mt-2 text-sm ${changeType === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                            {changeType === 'up' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                            <span>{change}</span>
                        </div>
                    )}
                </div>
                <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
                    <Icon size={24} />
                </div>
            </div>
        </div>
    );
};

const ActivityItem = ({ activity }) => {
    const getActionColor = (action) => {
        const colors = {
            USER_REGISTERED: 'bg-green-100 text-green-700',
            USER_LOGIN: 'bg-blue-100 text-blue-700',
            ORDER_CREATED: 'bg-purple-100 text-purple-700',
            RIDE_REQUESTED: 'bg-orange-100 text-orange-700',
            SUPPORT_TICKET_CREATED: 'bg-red-100 text-red-700',
        };
        return colors[activity.action] || 'bg-gray-100 text-gray-700';
    };

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = Math.floor((now - date) / 1000); // seconds

        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors">
            <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(activity.action)}`}>
                {activity.action_display}
            </span>
            <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate">
                    {activity.user_display?.username || 'System'}
                </p>
                <p className="text-xs text-gray-500">{formatTime(activity.timestamp)}</p>
            </div>
        </div>
    );
};

const AdminOverview = () => {
    const { stats, activities, loading } = useAdmin();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Total Users"
                    value={stats?.total_users}
                    change={`+${stats?.new_users_today || 0} today`}
                    changeType="up"
                    icon={Users}
                    color="blue"
                />
                <StatCard
                    title="Active Orders"
                    value={stats?.active_orders}
                    change={`${stats?.completed_orders_today || 0} completed today`}
                    changeType="up"
                    icon={ShoppingCart}
                    color="green"
                />
                <StatCard
                    title="Active Rides"
                    value={stats?.active_rides}
                    change={`${stats?.completed_rides_today || 0} completed today`}
                    changeType="up"
                    icon={Truck}
                    color="purple"
                />
                <StatCard
                    title="Active Time"
                    value={stats?.open_tickets}
                    change={`${stats?.resolved_tickets_today || 0} resolved today`}
                    changeType="down"
                    icon={Time}
                    color="orange"
                />
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-600 mb-4">Users by Role</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Collectors</span>
                            <span className="text-sm font-semibold text-gray-900">{stats?.total_collectors || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Disposers</span>
                            <span className="text-sm font-semibold text-gray-900">{stats?.total_sellers || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Recyclers</span>
                            <span className="text-sm font-semibold text-gray-900">{stats?.total_recyclers || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-600 mb-4">User Growth</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Today</span>
                            <span className="text-sm font-semibold text-green-600">+{stats?.new_users_today || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">This Week</span>
                            <span className="text-sm font-semibold text-green-600">+{stats?.new_users_this_week || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">This Month</span>
                            <span className="text-sm font-semibold text-green-600">+{stats?.new_users_this_month || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                    <h3 className="text-sm font-medium text-gray-600 mb-4">System Status</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Online Users</span>
                            <span className="text-sm font-semibold text-gray-900">{stats?.online_users || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Activities Today</span>
                            <span className="text-sm font-semibold text-gray-900">{stats?.activities_today || 0}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">Total Tickets</span>
                            <span className="text-sm font-semibold text-gray-900">{stats?.total_tickets || 0}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
                    <p className="text-sm text-gray-500 mt-1">Latest system events and user actions</p>
                </div>
                <div className="p-4 space-y-1">
                    {activities?.slice(0, 10).map((activity) => (
                        <ActivityItem key={activity.id} activity={activity} />
                    ))}
                    {(!activities || activities.length === 0) && (
                        <p className="text-center text-gray-500 py-8">No recent activity</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminOverview;
