import { useAdmin } from '../../contexts/AdminContext';

const SupportPage = () => {
    const { tickets, updateTicket } = useAdmin();

    const getStatusColor = (status) => {
        const colors = {
            OPEN: 'bg-yellow-100 text-yellow-700',
            IN_PROGRESS: 'bg-blue-100 text-blue-700',
            RESOLVED: 'bg-green-100 text-green-700',
            CLOSED: 'bg-gray-100 text-gray-700',
        };
        return colors[status] || 'bg-gray-100 text-gray-700';
    };

    const getPriorityColor = (priority) => {
        const colors = {
            LOW: 'text-gray-600',
            MEDIUM: 'text-blue-600',
            HIGH: 'text-orange-600',
            URGENT: 'text-red-600',
        };
        return colors[priority] || 'text-gray-600';
    };

    const handleStatusChange = async (ticketId, newStatus) => {
        try {
            await updateTicket(ticketId, { status: newStatus });
        } catch (err) {
            console.error('Failed to update ticket:', err);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Support Tickets</h3>
                    <p className="text-sm text-gray-500 mt-1">Manage customer support requests</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ticket #</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {tickets?.map((ticket) => (
                                <tr key={ticket.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {ticket.ticket_number}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{ticket.subject}</div>
                                        <div className="text-sm text-gray-500 truncate max-w-xs">{ticket.description}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {ticket.user_details?.username}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`text-sm font-semibold ${getPriorityColor(ticket.priority)}`}>
                                            {ticket.priority_display}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(ticket.status)}`}>
                                            {ticket.status_display}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(ticket.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        {ticket.status === 'OPEN' && (
                                            <button
                                                onClick={() => handleStatusChange(ticket.id, 'IN_PROGRESS')}
                                                className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                            >
                                                Start
                                            </button>
                                        )}
                                        {ticket.status === 'IN_PROGRESS' && (
                                            <button
                                                onClick={() => handleStatusChange(ticket.id, 'RESOLVED')}
                                                className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                                            >
                                                Resolve
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(!tickets || tickets.length === 0) && (
                        <p className="text-center text-gray-500 py-12">No support tickets found</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupportPage;
