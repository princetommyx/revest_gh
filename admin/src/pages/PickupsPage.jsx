import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { pickupsApi } from '../api/pickups';
import { Loader2, Truck, MapPin } from 'lucide-react';
import { formatDate, formatCurrency, formatDateTime } from '../utils/formatters';
import Pagination from '../components/common/Pagination';
import FilterDropdown from '../components/common/FilterDropdown';

const PICKUPS_PER_PAGE = 10;

const statusOptions = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'ACCEPTED', label: 'Accepted' },
    { value: 'ARRIVED', label: 'Arrived' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
];

const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
        case 'PENDING':
            return 'bg-yellow-100 text-yellow-800';
        case 'ACCEPTED':
            return 'bg-blue-100 text-blue-800';
        case 'ARRIVED':
            return 'bg-purple-100 text-purple-800';
        case 'COMPLETED':
            return 'bg-green-100 text-green-800';
        case 'CANCELLED':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

export default function PickupsPage() {
    const [currentPage, setCurrentPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState('');

    const { data, isLoading, error } = useQuery({
        queryKey: ['pickups', currentPage, statusFilter],
        queryFn: () => pickupsApi.getPickups({
            page: currentPage,
            page_size: PICKUPS_PER_PAGE,
            status: statusFilter,
        }),
        keepPreviousData: true,
    });

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleStatusFilter = (status) => {
        setStatusFilter(status);
        setCurrentPage(1);
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
                    Error loading pickup requests. Please try again.
                </div>
            </div>
        );
    }

    const pickups = data?.results || data || [];
    const totalPages = data?.count ? Math.ceil(data.count / PICKUPS_PER_PAGE) : 1;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pickup Requests</h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {data?.count ? `Total: ${data.count} requests` : `${pickups.length} requests`}
                    </p>
                </div>
                <div className="flex items-center space-x-2 text-primary-600 dark:text-primary-400 self-end sm:self-auto">
                    <Truck className="w-6 h-6" />
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <FilterDropdown
                        label="Status"
                        value={statusFilter}
                        options={statusOptions}
                        onChange={handleStatusFilter}
                        placeholder="All Statuses"
                    />
                </div>
            </div>

            {/* Pickups Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Request ID
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Disposer
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Collector
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Material
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Price
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Payment
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {pickups.length === 0 ? (
                                <tr>
                                    <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                                        No pickup requests found
                                    </td>
                                </tr>
                            ) : (
                                pickups.map((pickup) => (
                                    <tr key={pickup.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                #{pickup.id}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {pickup.provider?.first_name} {pickup.provider?.last_name}
                                            </div>
                                            {pickup.provider?.email && (
                                                <div className="text-xs text-gray-500">
                                                    {pickup.provider.email}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {pickup.collector ? (
                                                <>
                                                    <div className="text-sm text-gray-900">
                                                        {pickup.collector.first_name} {pickup.collector.last_name}
                                                    </div>
                                                    {pickup.collector.email && (
                                                        <div className="text-xs text-gray-500">
                                                            {pickup.collector.email}
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-sm text-gray-400">Not assigned</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{pickup.material_type}</div>
                                            <div className="text-xs text-gray-500">{pickup.quantity_estimate}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(pickup.status)}`}>
                                                {pickup.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {pickup.actual_price ? (
                                                <div className="text-sm font-medium text-gray-900">
                                                    {formatCurrency(pickup.actual_price)}
                                                </div>
                                            ) : pickup.estimated_price ? (
                                                <div className="text-sm text-gray-500">
                                                    Est: {formatCurrency(pickup.estimated_price)}
                                                </div>
                                            ) : (
                                                <span className="text-sm text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs rounded ${pickup.payment_method === 'DIGITAL'
                                                    ? 'bg-blue-100 text-blue-800'
                                                    : 'bg-gray-100 text-gray-800'
                                                }`}>
                                                {pickup.payment_method}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDateTime(pickup.created_at)}
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
                    <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
                </div>
            )}
        </div>
    );
}
