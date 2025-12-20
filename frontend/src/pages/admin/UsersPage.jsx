import { useState } from 'react';
import { useAdmin } from '../../contexts/AdminContext';
import { Search, Filter, CheckCircle, XCircle, Eye, Edit } from 'lucide-react';

const UsersPage = () => {
    const { users, fetchUsers, updateUser } = useAdmin();
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);

    const handleSearch = (e) => {
        setSearchTerm(e.target.value);
        fetchUsers({ search: e.target.value, role: roleFilter });
    };

    const handleRoleFilter = (role) => {
        setRoleFilter(role);
        fetchUsers({ search: searchTerm, role });
    };

    const handleVerifyUser = async (userId) => {
        try {
            await updateUser(userId, { is_verified: true });
        } catch (err) {
            console.error('Failed to verify user:', err);
        }
    };

    const getRoleBadgeColor = (role) => {
        const colors = {
            COLLECTOR: 'bg-green-100 text-green-700',
            SELLER: 'bg-blue-100 text-blue-700',
            RECYCLER: 'bg-orange-100 text-orange-700',
        };
        return colors[role] || 'bg-gray-100 text-gray-700';
    };

    return (
        <div className="space-y-6">
            {/* Header & Filters */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Search by username, email, or phone..."
                            value={searchTerm}
                            onChange={handleSearch}
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                        />
                    </div>

                    {/* Role Filter */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleRoleFilter('')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${roleFilter === '' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => handleRoleFilter('COLLECTOR')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${roleFilter === 'COLLECTOR' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Collectors
                        </button>
                        <button
                            onClick={() => handleRoleFilter('SELLER')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${roleFilter === 'SELLER' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Disposers
                        </button>
                        <button
                            onClick={() => handleRoleFilter('RECYCLER')}
                            className={`px-4 py-2 rounded-lg font-medium transition-colors ${roleFilter === 'RECYCLER' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                }`}
                        >
                            Recyclers
                        </button>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {users?.map((user) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">{user.username}</div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                                            {user.role_display}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            {user.is_verified ? (
                                                <span className="flex items-center gap-1 text-green-600">
                                                    <CheckCircle size={16} />
                                                    <span className="text-xs">Verified</span>
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-1 text-gray-400">
                                                    <XCircle size={16} />
                                                    <span className="text-xs">Unverified</span>
                                                </span>
                                            )}
                                            {user.is_online && (
                                                <span className="ml-2 px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                                                    Online
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(user.date_joined).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => setSelectedUser(user)}
                                                className="p-1 hover:bg-gray-100 rounded transition-colors"
                                                title="View Details"
                                            >
                                                <Eye size={18} className="text-gray-600" />
                                            </button>
                                            {!user.is_verified && (
                                                <button
                                                    onClick={() => handleVerifyUser(user.id)}
                                                    className="px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-xs font-medium"
                                                >
                                                    Verify
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* User Details Modal */}
            {selectedUser && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setSelectedUser(null)}>
                    <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900">User Details</h3>
                            <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-gray-100 rounded">
                                <XCircle size={20} />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Username</p>
                                <p className="text-sm font-medium text-gray-900">{selectedUser.username}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Email</p>
                                <p className="text-sm font-medium text-gray-900">{selectedUser.email}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Role</p>
                                <p className="text-sm font-medium text-gray-900">{selectedUser.role_display}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Verified</p>
                                <p className="text-sm font-medium text-gray-900">{selectedUser.is_verified ? 'Yes' : 'No'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Status</p>
                                <p className="text-sm font-medium text-gray-900">{selectedUser.is_online ? 'Online' : 'Offline'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Joined</p>
                                <p className="text-sm font-medium text-gray-900">
                                    {new Date(selectedUser.date_joined).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            {!selectedUser.is_verified && (
                                <button
                                    onClick={() => {
                                        handleVerifyUser(selectedUser.id);
                                        setSelectedUser(null);
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    Verify User
                                </button>
                            )}
                            <button
                                onClick={() => setSelectedUser(null)}
                                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UsersPage;
