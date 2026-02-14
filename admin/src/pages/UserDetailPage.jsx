import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { usersApi } from '../api/users';
import {
    ArrowLeft, Mail, Phone, MapPin, Calendar, Shield,
    Trash2, CheckCircle, XCircle, Loader2, User as UserIcon,
    Package, Truck, Wallet
} from 'lucide-react';
import { formatDate, getRoleBadgeColor } from '../utils/formatters';
import Toast from '../components/common/Toast';

export default function UserDetailPage() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [toast, setToast] = useState(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showMsgModal, setShowMsgModal] = useState(false);
    const [msgSubject, setMsgSubject] = useState('');
    const [msgBody, setMsgBody] = useState('');
    const [isSending, setIsSending] = useState(false);

    const { data: user, isLoading, error } = useQuery({
        queryKey: ['user', userId],
        queryFn: () => usersApi.getUserById(userId),
    });

    const handleDelete = async () => {
        try {
            await usersApi.deleteUser(userId);
            setToast({ type: 'success', message: 'User deleted successfully' });
            setTimeout(() => navigate('/users'), 1500);
        } catch (error) {
            setToast({ type: 'error', message: 'Failed to delete user' });
        }
        setShowDeleteModal(false);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!msgSubject || !msgBody) return;

        setIsSending(true);
        try {
            await usersApi.sendMessage(userId, {
                title: msgSubject,
                message: msgBody
            });
            setToast({ type: 'success', message: 'Message sent successfully' });
            setShowMsgModal(false);
            setMsgSubject('');
            setMsgBody('');
        } catch (error) {
            setToast({ type: 'error', message: 'Failed to send message' });
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
            </div>
        );
    }

    if (error || !user) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
                    Error loading user details. Please try again.
                </div>
            </div>
        );
    }

    const roleColor = getRoleBadgeColor(user.role);

    return (
        <div className="p-6 space-y-6">
            {/* Toast */}
            {toast && (
                <div className="fixed top-4 right-4 z-50">
                    <Toast
                        type={toast.type}
                        message={toast.message}
                        onClose={() => setToast(null)}
                    />
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/users')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Details</h1>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            View and manage user information
                        </p>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={() => setShowMsgModal(true)}
                        className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition-all hover-scale shadow-lg"
                    >
                        <Mail className="w-5 h-5 mr-2" />
                        Send Message
                    </button>
                    <button
                        onClick={() => setShowDeleteModal(true)}
                        className="inline-flex items-center px-4 py-2.5 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-pink-700 transition-all hover-scale shadow-lg"
                    >
                        <Trash2 className="w-5 h-5 mr-2" />
                        Delete User
                    </button>
                </div>
            </div>

            {/* User Profile Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                {/* Gradient Header */}
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-8 text-center">
                    <div className="inline-block">
                        <div className="w-24 h-24 mx-auto bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-4xl font-bold bg-gradient-to-br from-purple-500 to-indigo-600 bg-clip-text text-transparent shadow-xl transition-colors">
                            {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mt-4">
                        {user.first_name} {user.last_name}
                    </h2>
                    <p className="text-purple-100 mt-1">@{user.username}</p>
                    <div className="flex items-center justify-center space-x-2 mt-3">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${roleColor.bg} ${roleColor.text}`}>
                            <Shield className="w-4 h-4 mr-1" />
                            {user.role}
                        </span>
                        {user.is_active ? (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Active
                            </span>
                        ) : (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                <XCircle className="w-4 h-4 mr-1" />
                                Inactive
                            </span>
                        )}
                    </div>
                </div>

                {/* User Information Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                    {/* Contact Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                            <UserIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            <span>Contact Information</span>
                        </h3>

                        <div className="space-y-3">
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex items-start space-x-3 transition-colors">
                                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Email
                                    </label>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                                        {user.email}
                                    </p>
                                </div>
                            </div>

                            {user.phone_number && (
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex items-start space-x-3 transition-colors">
                                    <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Phone
                                        </label>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                                            {user.phone_number}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {user.location && (
                                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex items-start space-x-3 transition-colors">
                                    <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                                    <div>
                                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                            Location
                                        </label>
                                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                                            {user.location}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 flex items-start space-x-3 transition-colors">
                                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div>
                                    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Member Since
                                    </label>
                                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                                        {formatDate(user.date_joined)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Activity Statistics */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity Statistics</h3>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-xl p-4 border border-purple-100 dark:border-purple-800/30">
                                <div className="flex items-center justify-between">
                                    <Package className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                                </div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">0</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Listings</p>
                            </div>

                            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4 border border-blue-100 dark:border-blue-800/30">
                                <div className="flex items-center justify-between">
                                    <Truck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                                </div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">0</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Pickups</p>
                            </div>

                            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-100 dark:border-green-800/30">
                                <div className="flex items-center justify-between">
                                    <Wallet className="w-8 h-8 text-green-600 dark:text-green-400" />
                                </div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">$0</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Balance</p>
                            </div>

                            <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl p-4 border border-orange-100 dark:border-orange-800/30">
                                <div className="flex items-center justify-between">
                                    <CheckCircle className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                                </div>
                                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">0</p>
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Completed</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in border border-gray-100 dark:border-gray-700">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Delete User?</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                                Are you sure you want to delete <strong>{user.first_name} {user.last_name}</strong>?
                                This action cannot be undone.
                            </p>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => setShowDeleteModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl font-medium hover:from-red-600 hover:to-pink-700 transition-all"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Send Message Modal */}
            {showMsgModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-scale-in border border-gray-100 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                                <Mail className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" />
                                Send Message
                            </h3>
                            <button
                                onClick={() => setShowMsgModal(false)}
                                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                            >
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSendMessage} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Subject
                                </label>
                                <input
                                    type="text"
                                    value={msgSubject}
                                    onChange={(e) => setMsgSubject(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                    placeholder="Enter message subject"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Message
                                </label>
                                <textarea
                                    value={msgBody}
                                    onChange={(e) => setMsgBody(e.target.value)}
                                    rows={5}
                                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                    placeholder="Type your message here..."
                                    required
                                />
                            </div>

                            <div className="flex space-x-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowMsgModal(false)}
                                    className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSending}
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition-all hover-scale shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                                >
                                    {isSending ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Mail className="w-5 h-5 mr-2" />
                                            Send Message
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
