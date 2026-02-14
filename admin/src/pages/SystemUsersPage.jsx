import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { usersApi } from '../api/users';
import { Loader2, Shield, UserPlus, Mail, Calendar } from 'lucide-react';
import { formatDate, getRoleBadgeColor } from '../utils/formatters';
import Pagination from '../components/common/Pagination';
import SearchBar from '../components/common/SearchBar';

const USERS_PER_PAGE = 10;

export default function SystemUsersPage() {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    // Fetch only admin users (role=ADMIN)
    const { data, isLoading, error } = useQuery({
        queryKey: ['system-users', currentPage, searchTerm],
        queryFn: () => usersApi.getUsers({
            page: currentPage,
            page_size: USERS_PER_PAGE,
            search: searchTerm,
            role: 'ADMIN', // Only fetch admins
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

    if (isLoading && !data) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                    Error loading system users. Please try again.
                </div>
            </div>
        );
    }

    const admins = data?.results || data || [];
    const totalPages = data?.count ? Math.ceil(data.count / USERS_PER_PAGE) : 1;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Users</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Manage Revesta administrator accounts
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 text-purple-600">
                        <Shield className="w-6 h-6" />
                        <span className="text-sm font-medium">{data?.count || admins.length} Admins</span>
                    </div>
                    <button className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition-all hover-scale shadow-lg">
                        <UserPlus className="w-5 h-5 mr-2" />
                        Add Admin
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <SearchBar
                    placeholder="Search by name, email, or username..."
                    onSearch={handleSearch}
                />
            </div>

            {/* Admins Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    Administrator
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    Contact
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    Permissions
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    Joined
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {admins.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                                        <Shield className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                        <p className="font-medium">No administrators found</p>
                                        <p className="text-sm text-gray-400 mt-1">Add your first admin to get started</p>
                                    </td>
                                </tr>
                            ) : (
                                admins.map((admin) => (
                                    <tr key={admin.id} className="hover:bg-purple-50/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-12 w-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                                                    <span className="text-white font-bold text-base">
                                                        {admin.first_name?.[0]}{admin.last_name?.[0]}
                                                    </span>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-bold text-gray-900 flex items-center space-x-2">
                                                        <span>{admin.first_name} {admin.last_name}</span>
                                                        {admin.is_superuser && (
                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-100 to-amber-100 text-yellow-800 border border-yellow-200">
                                                                <Shield className="w-3 h-3 mr-1" />
                                                                Super Admin
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        @{admin.username}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-2 text-sm text-gray-900">
                                                <Mail className="w-4 h-4 text-gray-400" />
                                                <span>{admin.email}</span>
                                            </div>
                                            {admin.phone_number && (
                                                <div className="text-sm text-gray-500 mt-1">{admin.phone_number}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-wrap gap-1">
                                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                                                    Dashboard
                                                </span>
                                                <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
                                                    Users
                                                </span>
                                                {admin.is_superuser && (
                                                    <>
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-pink-100 text-pink-700">
                                                            System
                                                        </span>
                                                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                                                            All Access
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {admin.is_active ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <div className="w-1.5 h-1.5 bg-green-600 rounded-full mr-1.5 animate-pulse"></div>
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center space-x-2 text-sm text-gray-500">
                                                <Calendar className="w-4 h-4" />
                                                <span>{formatDate(admin.date_joined)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex items-center space-x-2">
                                                <button className="text-purple-600 hover:text-purple-700 font-medium">
                                                    Edit
                                                </button>
                                                <span className="text-gray-300">|</span>
                                                <button className="text-red-600 hover:text-red-700 font-medium">
                                                    Deactivate
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

            {/* Loading overlay */}
            {isLoading && data && (
                <div className="fixed inset-0 bg-black bg-opacity-10 flex items-center justify-center z-50">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
                </div>
            )}
        </div>
    );
}
