import { useAdmin } from '../../contexts/AdminContext';

const ActivityPage = () => {
    const { activities } = useAdmin();

    const getActionColor = (action) => {
        const colors = {
            USER_REGISTERED: 'bg-green-100 text-green-700',
            USER_LOGIN: 'bg-blue-100 text-blue-700',
            ORDER_CREATED: 'bg-purple-100 text-purple-700',
            RIDE_REQUESTED: 'bg-orange-100 text-orange-700',
            SUPPORT_TICKET_CREATED: 'bg-red-100 text-red-700',
        };
        return colors[action] || 'bg-gray-100 text-gray-700';
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">System Activity Log</h3>
                    <p className="text-sm text-gray-500 mt-1">All system events  and user actions</p>
                </div>
                <div className="divide-y divide-gray-100">
                    {activities?.map((activity) => (
                        <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getActionColor(activity.action)}`}>
                                        {activity.action_display}
                                    </span>
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">
                                            {activity.user_display?.username || 'System'}
                                        </p>
                                        <p className="text-xs text-gray-500">{activity.user_display?.role || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-900">
                                        {new Date(activity.timestamp).toLocaleString()}
                                    </p>
                                    {activity.ip_address && (
                                        <p className="text-xs text-gray-500">{activity.ip_address}</p>
                                    )}
                                </div>
                            </div>
                            {activity.details && Object.keys(activity.details).length > 0 && (
                                <div className="mt-2 pl-4 text-xs text-gray-600">
                                    {JSON.stringify(activity.details)}
                                </div>
                            )}
                        </div>
                    ))}
                    {(!activities || activities.length === 0) && (
                        <p className="text-center text-gray-500 py-12">No activity logs found</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivityPage;
