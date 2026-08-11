import { useState } from 'react';
import { X, Send, MessageSquare, Loader2 } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { chatApi } from '../../api/chat';

export default function MessageModal({ isOpen, onClose, user, onMessageSent }) {
    const [message, setMessage] = useState('');

    const sendMessageMutation = useMutation({
        mutationFn: () => chatApi.sendMessage(user.id, message),
        onSuccess: () => {
            onMessageSent({
                type: 'success',
                message: `Message sent successfully to ${user.first_name} ${user.last_name}`
            });
            setMessage('');
            onClose();
        },
        onError: (error) => {
            onMessageSent({
                type: 'error',
                message: error.response?.data?.message || 'Failed to send message. Please try again.'
            });
        }
    });

    const handleSend = () => {
        if (message.trim()) {
            sendMessageMutation.mutate();
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && e.ctrlKey) {
            handleSend();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            ></div>

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-scale-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-t-2xl p-6 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                                <MessageSquare className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold">Send Message</h2>
                                <p className="text-sm text-white/80">Direct message to user</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                            disabled={sendMessageMutation.isLoading}
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* User Info */}
                    <div className="flex items-center space-x-3 bg-white/10 backdrop-blur-sm rounded-xl p-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                            <span className="text-purple-600 font-bold text-sm">
                                {user.first_name?.[0]}{user.last_name?.[0]}
                            </span>
                        </div>
                        <div className="flex-1">
                            <p className="font-semibold">{user.first_name} {user.last_name}</p>
                            <p className="text-sm text-white/70">@{user.username} • {user.role}</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6">
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Message
                        </label>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyPress}
                            placeholder="Type your message here... (Ctrl+Enter to send)"
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none transition-all"
                            rows="6"
                            disabled={sendMessageMutation.isLoading}
                            autoFocus
                        />
                        <div className="mt-2 flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                                {message.length} characters
                            </p>
                            <p className="text-xs text-gray-400">
                                Tip: Press Ctrl+Enter to send
                            </p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors"
                            disabled={sendMessageMutation.isLoading}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSend}
                            disabled={!message.trim() || sendMessageMutation.isLoading}
                            className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover-scale shadow-lg flex items-center space-x-2"
                        >
                            {sendMessageMutation.isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Sending...</span>
                                </>
                            ) : (
                                <>
                                    <Send className="w-4 h-4" />
                                    <span>Send Message</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
