import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, CheckCircle, XCircle, Search, Eye, AlertCircle, ChevronDown, AlignLeft, CreditCard } from 'lucide-react';
import { kycApi } from '../api/kyc';

const baseUrl = import.meta.env.VITE_API_URL?.replace('/api/v1', '') || 'http://localhost:8000';

const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return `${baseUrl}${path}`;
};

export default function KYCReviewPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('PENDING'); // PENDING, ALL, VERIFIED, REJECTED
    const [selectedKyc, setSelectedKyc] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [showRejectModal, setShowRejectModal] = useState(false);

    const { data: kycs = [], isLoading } = useQuery({
        queryKey: ['kycs'],
        queryFn: async () => {
            const { data } = await kycApi.getAllSubmissions();
            return data.results || data;
        }
    });

    const approveMutation = useMutation({
        mutationFn: (id) => kycApi.approve(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['kycs']);
            setSelectedKyc(null);
        }
    });

    const rejectMutation = useMutation({
        mutationFn: ({ id, reason }) => kycApi.reject(id, reason),
        onSuccess: () => {
            queryClient.invalidateQueries(['kycs']);
            setShowRejectModal(false);
            setRejectReason('');
            setSelectedKyc(null);
        }
    });

    const filteredKycs = kycs.filter(kyc => {
        const matchesSearch = (kyc.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            kyc.email?.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'ALL' || kyc.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">KYC Verification</h1>
                    <p className="text-sm text-gray-500 mt-1">Review and approve identity documents for Collectors and Recyclers.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex space-x-2">
                    {['PENDING', 'VERIFIED', 'REJECTED', 'ALL'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${statusFilter === status
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                                }`}
                        >
                            {status === 'ALL' ? 'All' : status.charAt(0) + status.slice(1).toLowerCase()}
                        </button>
                    ))}
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-64"
                    />
                </div>
            </div>

            {/* List & Details View */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Applications List */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hidden lg:block h-[calc(100vh-250px)] overflow-y-auto">
                    {filteredKycs.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No {statusFilter.toLowerCase()} applications found.
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filteredKycs.map(kyc => (
                                <div
                                    key={kyc.id}
                                    onClick={() => setSelectedKyc(kyc)}
                                    className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${selectedKyc?.id === kyc.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-medium text-gray-900">{kyc.username}</div>
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${kyc.status === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                                                kyc.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                            }`}>
                                            {kyc.status}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-500 flex justify-between">
                                        <span>{kyc.role}</span>
                                        <span>{new Date(kyc.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Mobile Dropdown for List */}
                <div className="lg:hidden">
                    <select
                        className="w-full p-3 border border-gray-200 rounded-lg bg-white"
                        onChange={(e) => {
                            const found = filteredKycs.find(k => k.id.toString() === e.target.value);
                            setSelectedKyc(found || null);
                        }}
                        value={selectedKyc?.id || ''}
                    >
                        <option value="">Select an application to review...</option>
                        {filteredKycs.map(k => (
                            <option key={k.id} value={k.id}>{k.username} - {k.status}</option>
                        ))}
                    </select>
                </div>

                {/* Detail View */}
                <div className="lg:col-span-2 space-y-6">
                    {selectedKyc ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            {/* Detail Header */}
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">Reviewing: {selectedKyc.username}</h2>
                                    <div className="flex space-x-4 mt-1 text-sm text-gray-500">
                                        <span>Email: {selectedKyc.email}</span>
                                        <span>Role: {selectedKyc.role}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${selectedKyc.status === 'VERIFIED' ? 'bg-green-100 text-green-800' :
                                            selectedKyc.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                'bg-yellow-100 text-yellow-800'
                                        }`}>
                                        {selectedKyc.status === 'VERIFIED' && <CheckCircle className="w-4 h-4 mr-1" />}
                                        {selectedKyc.status === 'REJECTED' && <XCircle className="w-4 h-4 mr-1" />}
                                        {selectedKyc.status === 'PENDING' && <AlertCircle className="w-4 h-4 mr-1" />}
                                        {selectedKyc.status}
                                    </div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        Submitted: {new Date(selectedKyc.created_at).toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            {/* ID Number Section */}
                            <div className="p-6 border-b border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-3 flex items-center">
                                    <CreditCard className="w-4 h-4 mr-2 text-gray-500" />
                                    Decrypted ID Number
                                </h3>
                                <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg font-mono text-lg tracking-widest text-center text-blue-900 font-bold">
                                    {selectedKyc.id_number || "Not provided / Decryption Failed"}
                                </div>
                            </div>

                            {/* Images Section */}
                            <div className="p-6">
                                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider mb-4 flex items-center">
                                    <Eye className="w-4 h-4 mr-2 text-gray-500" />
                                    Document Images
                                </h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Front */}
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700">ID Front</p>
                                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 h-48">
                                            <a href={getImageUrl(selectedKyc.id_front_image)} target="_blank" rel="noreferrer">
                                                <img
                                                    src={getImageUrl(selectedKyc.id_front_image)}
                                                    alt="ID Front"
                                                    className="w-full h-full object-contain hover:scale-105 transition-transform"
                                                />
                                            </a>
                                        </div>
                                    </div>

                                    {/* Back */}
                                    <div className="space-y-2">
                                        <p className="text-sm font-medium text-gray-700">ID Back</p>
                                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 h-48">
                                            <a href={getImageUrl(selectedKyc.id_back_image)} target="_blank" rel="noreferrer">
                                                <img
                                                    src={getImageUrl(selectedKyc.id_back_image)}
                                                    alt="ID Back"
                                                    className="w-full h-full object-contain hover:scale-105 transition-transform"
                                                />
                                            </a>
                                        </div>
                                    </div>

                                    {/* Selfie */}
                                    <div className="space-y-2 md:col-span-2">
                                        <p className="text-sm font-medium text-gray-700">Live Selfie (Face Match)</p>
                                        <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50 h-64 flex justify-center">
                                            <a href={getImageUrl(selectedKyc.selfie_image)} target="_blank" rel="noreferrer">
                                                <img
                                                    src={getImageUrl(selectedKyc.selfie_image)}
                                                    alt="Selfie"
                                                    className="h-full object-contain hover:scale-105 transition-transform"
                                                />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {selectedKyc.status === 'REJECTED' && selectedKyc.rejection_reason && (
                                <div className="p-6 bg-red-50 border-t border-red-100">
                                    <h3 className="text-red-800 font-semibold mb-1">Rejection Reason</h3>
                                    <p className="text-red-700 text-sm">{selectedKyc.rejection_reason}</p>
                                </div>
                            )}

                            {/* Actions */}
                            {selectedKyc.status === 'PENDING' && (
                                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end space-x-4">
                                    <button
                                        onClick={() => setShowRejectModal(true)}
                                        disabled={approveMutation.isPending || rejectMutation.isPending}
                                        className="px-6 py-2.5 bg-white border border-red-200 text-red-600 font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                                    >
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm('Are you sure you want to approve this KYC application? This will allow the user to withdraw funds and accept jobs.')) {
                                                approveMutation.mutate(selectedKyc.id);
                                            }
                                        }}
                                        disabled={approveMutation.isPending || rejectMutation.isPending}
                                        className="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors shadow-sm disabled:opacity-50 flex items-center"
                                    >
                                        {approveMutation.isPending ? 'Processing...' : (
                                            <>
                                                <CheckCircle className="w-4 h-4 mr-2" />
                                                Approve Verification
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-64 flex flex-col justify-center items-center text-gray-500">
                            <Shield className="w-12 h-12 text-gray-300 mb-4" />
                            <p>Select a KYC application from the list to review</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                            <AlertCircle className="w-5 h-5 mr-2 text-red-500" />
                            Reject Application
                        </h2>
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Reason for Rejection
                            </label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                                rows="4"
                                placeholder="E.g., ID document is highly blurred and unreadable. Please upload a clear photo."
                            ></textarea>
                            <p className="text-xs text-gray-500 mt-2">The user will see this message and be prompted to resubmit.</p>
                        </div>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => rejectMutation.mutate({ id: selectedKyc.id, reason: rejectReason })}
                                disabled={!rejectReason.trim() || rejectMutation.isPending}
                                className="px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                                {rejectMutation.isPending ? 'Rejecting...' : 'Confirm Rejection'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
