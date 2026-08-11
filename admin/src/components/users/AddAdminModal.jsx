import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../api/users';
import { X, Loader2, User, Mail, Lock, Phone } from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function AddAdminModal({ isOpen, onClose }) {
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        username: '',
        password: '',
        phone_number: '',
        role: 'ADMIN', // Hardcoded for this page
    });

    const createAdminMutation = useMutation({
        mutationFn: usersApi.createUser,
        onSuccess: () => {
            toast.success('Admin user created successfully');
            queryClient.invalidateQueries(['system-users']);
            onClose();
            // Reset form
            setFormData({
                first_name: '',
                last_name: '',
                email: '',
                username: '',
                password: '',
                phone_number: '',
                role: 'ADMIN',
            });
        },
        onError: (error) => {
            console.error('Failed to create admin:', error);
            const errData = error.response?.data;
            if (errData && typeof errData === 'object') {
                const messages = Object.values(errData).flat().join(', ');
                toast.error(`Error: ${messages}`);
            } else {
                toast.error('Failed to create admin user');
            }
        },
    });

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        createAdminMutation.mutate(formData);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
                <div
                    className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 backdrop-blur-sm"
                    onClick={onClose}
                />

                <div className="relative inline-block overflow-hidden text-left align-bottom transition-all transform bg-white rounded-2xl shadow-xl sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold text-gray-900">
                                Add System Administrator
                            </h3>
                            <button
                                onClick={onClose}
                                className="text-gray-400 hover:text-gray-500 focus:outline-none p-1 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    First Name
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        className="pl-10 w-full rounded-xl border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm py-2.5 bg-gray-50"
                                        value={formData.first_name}
                                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                        placeholder="John"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Last Name
                                </label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <User className="h-4 w-4 text-gray-400" />
                                    </div>
                                    <input
                                        type="text"
                                        required
                                        className="pl-10 w-full rounded-xl border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm py-2.5 bg-gray-50"
                                        value={formData.last_name}
                                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Username
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    className="pl-10 w-full rounded-xl border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm py-2.5 bg-gray-50"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                                    placeholder="johndoe"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Mail className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    required
                                    className="pl-10 w-full rounded-xl border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm py-2.5 bg-gray-50"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="john@revesta.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Phone Number <span className="text-gray-400 font-normal">(Optional)</span>
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="tel"
                                    className="pl-10 w-full rounded-xl border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm py-2.5 bg-gray-50"
                                    value={formData.phone_number}
                                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                    placeholder="+233..."
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Secure Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    required
                                    minLength="8"
                                    className="pl-10 w-full rounded-xl border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500 sm:text-sm py-2.5 bg-gray-50"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    placeholder="••••••••"
                                />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters long.</p>
                        </div>

                        {/* Footer */}
                        <div className="pt-4 mt-6 border-t border-gray-100 flex justify-end space-x-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={createAdminMutation.isLoading}
                                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={createAdminMutation.isLoading}
                                className="inline-flex items-center px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl hover:from-purple-600 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                            >
                                {createAdminMutation.isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Creating...
                                    </>
                                ) : (
                                    'Create Admin'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
