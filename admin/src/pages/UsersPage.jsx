import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersApi } from '../api/users';
import { Loader2, Users as UsersIcon, CheckCircle, XCircle, MessageSquare, Eye, Trash2, RefreshCw } from 'lucide-react';
import { formatDate, getRoleBadgeColor } from '../utils/formatters';
import Pagination from '../components/common/Pagination';
import SearchBar from '../components/common/SearchBar';
import FilterDropdown from '../components/common/FilterDropdown';
import MessageModal from '../components/users/MessageModal';
import Toast from '../components/common/Toast';

const USERS_PER_PAGE = 10;

const roleOptions = [
    { value: 'COLLECTOR', label: 'Collector' },
    { value: 'SELLER', label: 'Disposer' },
    { value: 'RECYCLER', label: 'Recycler' },
    { value: 'ADMIN', label: 'Admin' },
];

export default function UsersPage() {
    const navigate = useNavigate();
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
    const [toast, setToast] = useState(null);

    // Fetch users but exclude ADMIN role (those are in System Users page)
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['users', currentPage, searchTerm, roleFilter],
        queryFn: () => usersApi.getUsers({
            page: currentPage,
            page_size: USERS_PER_PAGE,
            search: searchTerm,
            role: roleFilter,
            exclude_role: 'ADMIN', // Exclude admins from app users list
        }),
        keepPreviousData: true,
    });

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleSearch = (term) => {
        setSearchTerm(term);
        setCurrentPage(1);
    };

    const handleRoleFilter = (role) => {
        setRoleFilter(role);
        setCurrentPage(1);
    };

    const handleOpenMessageModal = (user) => {
        setSelectedUser(user);
        setIsMessageModalOpen(true);
    };

    const handleCloseMessageModal = () => {
        setIsMessageModalOpen(false);
        setSelectedUser(null);
    };

    const handleMessageSent = (toastData) => {
        setToast(toastData);
    };

    const handleDeleteUser = (user) => {
        if (window.confirm(`Are you sure you want to delete ${user.first_name} ${user.last_name}?`)) {
            // TODO: Implement delete API call
            setToast({ type: 'success', message: `User ${user.first_name} ${user.last_name} deleted` });
        }
    };

    const handleCloseToast = () => {
        setToast(null);
    };

    if (isLoading && !data) {
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
                    Error loading users. Please try again.
                </div>
            </div>
        );
    }

    const users = data?.results || data || [];
    const totalPages = data?.count ? Math.ceil(data.count / USERS_PER_PAGE) : 1;

    return (
        <div className="p-6 space-y-6">
            {/* Toast Notification */}
            {toast && (
                <div className="fixed top-4 right-4 z-50">
                    <Toast
                        type={toast.type}
                        message={toast.message}
                        onClose={handleCloseToast}
                    />
                </div>
            )}

            {/* Message Modal */}
            {selectedUser && (
                <MessageModal
                    isOpen={isMessageModalOpen}
                    onClose={handleCloseMessageModal}
                    user={selectedUser}
                    onMessageSent={handleMessageSent}
                />
            )}

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users Management</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {data?.count ? `Total: ${data.count} users` : `${users.length} users`}
                    </p>
                </div>
                <div className="flex items-center space-x-3 self-end sm:self-auto">
                    <button
                        onClick={() => refetch()}
                        className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition-all"
                        title="Refresh List"
                    >
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="flex items-center space-x-2 text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/30 px-3 py-1.5 rounded-lg whitespace-nowrap">
                        <UsersIcon className="w-5 h-5" />
                        <span className="font-medium">All Users</span>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-100 dark:border-slate-800 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-2">
                        <SearchBar
                            placeholder="Search by name, email, or phone..."
                            onSearch={handleSearch}
                        />
                    </div>
                    <div>
                        <FilterDropdown
                            label="Role"
                            value={roleFilter}
                            options={roleOptions}
                            onChange={handleRoleFilter}
                            placeholder="All Roles"
                        />
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-slate-900 rounded-lg shadow-sm border border-gray-100 dark:border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                        <thead className="bg-gray-50 dark:bg-slate-800/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Contact
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Role
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Location
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Joined
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                            {users.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                        No users found
                                    </td>
                                </tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center">
                                                    <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent font-bold text-sm">
                                                        {user.first_name?.[0]}{user.last_name?.[0]}
                                                    </span>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {user.first_name} {user.last_name}
                                                    </div>
                                                    <div className="text-sm text-gray-500 dark:text-gray-400">
                                                        @{user.username}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{user.email}</div>
                                            {user.phone_number && (
                                                <div className="text-sm text-gray-500">{user.phone_number}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getRoleBadgeColor(user.role)}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {user.city || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                {user.is_verified ? (
                                                    <>
                                                        <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                                                        <span className="text-sm text-green-700">Verified</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <XCircle className="w-4 h-4 text-gray-400 mr-1" />
                                                        <span className="text-sm text-gray-500">Not Verified</span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(user.date_joined)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex items-center space-x-2">
                                                <button
                                                    onClick={() => navigate(`/users/${user.id}`)}
                                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-purple-600 bg-purple-50 rounded-lg hover:bg-purple-100 transition-all"
                                                >
                                                    <Eye className="w-4 h-4 mr-1.5" />
                                                    View
                                                </button>
                                                <button
                                                    onClick={() => handleOpenMessageModal(user)}
                                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg hover:from-purple-600 hover:to-indigo-700 transition-all hover-scale shadow-sm"
                                                >
                                                    <MessageSquare className="w-4 h-4 mr-1.5" />
                                                    Message
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteUser(user)}
                                                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-all"
                                                >
                                                    <Trash2 className="w-4 h-4 mr-1.5" />
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={handlePageChange}
                    />
                )}
            </div>

            {/* Loading overlay for page transitions */}
            {isLoading && data && (
                <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
            )}

            {/* Message Modal */}
            {selectedUser && (
                <MessageModal
                    isOpen={isMessageModalOpen}
                    onClose={handleCloseMessageModal}
                    user={selectedUser}
                    onMessageSent={handleMessageSent}
                />
            )}

            {/* Toast Notification */}
            {toast && (
                <Toast
                    type={toast.type}
                    message={toast.message}
                    onClose={handleCloseToast}
                />
            )}
        </div>
    );
}
