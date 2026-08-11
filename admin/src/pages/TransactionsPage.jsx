import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { walletApi } from '../api/wallet';
import { Loader2, Wallet, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { formatDateTime, formatCurrency } from '../utils/formatters';
import Pagination from '../components/common/Pagination';
import FilterDropdown from '../components/common/FilterDropdown';

const TRANSACTIONS_PER_PAGE = 15;

const typeOptions = [
    { value: 'DEPOSIT', label: 'Deposit' },
    { value: 'WITHDRAWAL', label: 'Withdrawal' },
    { value: 'JOB_EARNING', label: 'Job Earning' },
    { value: 'COMMISSION_DEDUCTION', label: 'Commission' },
    { value: 'PENALTY', label: 'Penalty' },
    { value: 'REFUND', label: 'Refund' },
];

const statusOptions = [
    { value: 'PENDING', label: 'Pending' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'FAILED', label: 'Failed' },
    { value: 'CANCELLED', label: 'Cancelled' },
];

const getTypeColor = (type) => {
    switch (type?.toUpperCase()) {
        case 'DEPOSIT':
            return 'bg-green-100 text-green-800';
        case 'WITHDRAWAL':
            return 'bg-orange-100 text-orange-800';
        case 'JOB_EARNING':
            return 'bg-blue-100 text-blue-800';
        case 'COMMISSION_DEDUCTION':
            return 'bg-purple-100 text-purple-800';
        case 'PENALTY':
            return 'bg-red-100 text-red-800';
        case 'REFUND':
            return 'bg-yellow-100 text-yellow-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

const getStatusColor = (status) => {
    switch (status?.toUpperCase()) {
        case 'COMPLETED':
            return 'bg-green-100 text-green-800';
        case 'PENDING':
            return 'bg-yellow-100 text-yellow-800';
        case 'FAILED':
        case 'CANCELLED':
            return 'bg-red-100 text-red-800';
        default:
            return 'bg-gray-100 text-gray-800';
    }
};

export default function TransactionsPage() {
    const [currentPage, setCurrentPage] = useState(1);
    const [typeFilter, setTypeFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    const { data, isLoading, error } = useQuery({
        queryKey: ['transactions', currentPage, typeFilter, statusFilter],
        queryFn: () => walletApi.getTransactions({
            page: currentPage,
            page_size: TRANSACTIONS_PER_PAGE,
            transaction_type: typeFilter,
            status: statusFilter,
        }),
        keepPreviousData: true,
    });

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleTypeFilter = (type) => {
        setTypeFilter(type);
        setCurrentPage(1);
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
                    Error loading transactions. Please try again.
                </div>
            </div>
        );
    }

    const transactions = data?.results || data || [];
    const totalPages = data?.count ? Math.ceil(data.count / TRANSACTIONS_PER_PAGE) : 1;

    // Calculate summary statistics
    const completedTransactions = transactions.filter(t => t.status === 'COMPLETED');
    const totalDeposits = completedTransactions
        .filter(t => t.transaction_type === 'DEPOSIT')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalWithdrawals = completedTransactions
        .filter(t => t.transaction_type === 'WITHDRAWAL')
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount)), 0);
    const totalEarnings = completedTransactions
        .filter(t => t.transaction_type === 'JOB_EARNING')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        {data?.count ? `Total: ${data.count} transactions` : `${transactions.length} transactions`}
                    </p>
                </div>
                <div className="flex items-center space-x-2 text-primary-600">
                    <Wallet className="w-6 h-6" />
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Deposits</p>
                            <p className="text-2xl font-bold text-green-600 mt-1">
                                {formatCurrency(totalDeposits)}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Total Withdrawals</p>
                            <p className="text-2xl font-bold text-orange-600 mt-1">
                                {formatCurrency(totalWithdrawals)}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                            <TrendingDown className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-gray-600">Job Earnings</p>
                            <p className="text-2xl font-bold text-blue-600 mt-1">
                                {formatCurrency(totalEarnings)}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FilterDropdown
                        label="Transaction Type"
                        value={typeFilter}
                        options={typeOptions}
                        onChange={handleTypeFilter}
                        placeholder="All Types"
                    />
                    <FilterDropdown
                        label="Status"
                        value={statusFilter}
                        options={statusOptions}
                        onChange={handleStatusFilter}
                        placeholder="All Statuses"
                    />
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Reference
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    User
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Type
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Description
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                        No transactions found
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((transaction) => (
                                    <tr key={transaction.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-xs font-mono text-gray-600">
                                                {transaction.reference?.substring(0, 15)}...
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {transaction.wallet?.user ? (
                                                <>
                                                    <div className="text-sm text-gray-900">
                                                        {transaction.wallet.user.first_name} {transaction.wallet.user.last_name}
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {transaction.wallet.user.email}
                                                    </div>
                                                </>
                                            ) : (
                                                <span className="text-sm text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(transaction.transaction_type)}`}>
                                                {transaction.transaction_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className={`text-sm font-semibold ${parseFloat(transaction.amount) >= 0
                                                    ? 'text-green-600'
                                                    : 'text-red-600'
                                                }`}>
                                                {parseFloat(transaction.amount) >= 0 ? '+' : ''}
                                                {formatCurrency(transaction.amount)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                                                {transaction.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-600 max-w-xs truncate">
                                                {transaction.description || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDateTime(transaction.created_at)}
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
