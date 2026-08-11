import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { User, Mail, Shield, Lock, Save, Loader2 } from 'lucide-react';
import Toast from '../components/common/Toast';

export default function ProfilePage() {
    const [toast, setToast] = useState(null);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Placeholder admin data - will integrate with real API
    const adminData = {
        id: 1,
        first_name: 'Admin',
        last_name: 'User',
        username: 'admin',
        email: 'admin@revesta.com',
        role: 'ADMIN',
        is_superuser: true,
        last_login: new Date().toISOString(),
    };

    const handlePasswordChange = (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            setToast({ type: 'error', message: 'Passwords do not match' });
            return;
        }

        if (newPassword.length < 8) {
            setToast({ type: 'error', message: 'Password must be at least 8 characters' });
            return;
        }

        // TODO: Implement password change API call
        setToast({ type: 'success', message: 'Password changed successfully' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
    };

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
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile Settings</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Manage your account and preferences</p>
            </div>

            {/* Profile Section with Gradient Header */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden transition-colors">
                {/* Gradient Header */}
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-6 py-8 text-center">
                    <div className="inline-block">
                        <div className="w-24 h-24 mx-auto bg-white dark:bg-gray-800 rounded-2xl flex items-center justify-center text-4xl font-bold bg-gradient-to-br from-purple-500 to-indigo-600 bg-clip-text text-transparent shadow-xl transition-colors">
                            {adminData.first_name[0]}{adminData.last_name[0]}
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-white mt-4">
                        {adminData.first_name} {adminData.last_name}
                    </h2>
                    <div className="inline-flex items-center space-x-2 mt-2 px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full">
                        <Shield className="w-4 h-4 text-white" />
                        <span className="text-sm font-medium text-white">
                            {adminData.is_superuser ? 'Super Administrator' : 'Administrator'}
                        </span>
                    </div>
                </div>

                {/* Profile Info Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                    {/* Account Information */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                            <User className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            <span>Account Information</span>
                        </h3>

                        <div className="space-y-3">
                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 transition-colors">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Username
                                </label>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                                    @{adminData.username}
                                </p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 transition-colors">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Email Address
                                </label>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1 flex items-center space-x-2">
                                    <Mail className="w-4 h-4 text-gray-400" />
                                    <span>{adminData.email}</span>
                                </p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 transition-colors">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Role
                                </label>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                                    {adminData.role}
                                </p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 transition-colors">
                                <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Last Login
                                </label>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mt-1">
                                    {new Date(adminData.last_login).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Change Password */}
                    <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                            <Lock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            <span>Change Password</span>
                        </h3>

                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                    placeholder="Enter current password"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                    placeholder="Enter new password"
                                    required
                                    minLength={8}
                                />
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Minimum 8 characters
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Confirm New Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                    placeholder="Confirm new password"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl py-3 font-medium hover:from-purple-600 hover:to-indigo-700 transition-all hover-scale shadow-lg shadow-purple-500/25 flex items-center justify-center space-x-2"
                            >
                                <Save className="w-5 h-5" />
                                <span>Update Password</span>
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Additional Settings Card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 transition-colors">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Preferences</h3>
                <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl transition-colors">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Email Notifications</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Receive email alerts for important events</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-indigo-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl transition-colors">
                        <div>
                            <p className="font-medium text-gray-900 dark:text-white">Desktop Notifications</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Show browser notifications for updates</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 dark:peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-purple-500 peer-checked:to-indigo-600"></div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
}
