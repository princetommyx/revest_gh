import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { chatApi } from '../api/chat';
import { authApi } from '../api/auth';
import {
    MessageSquare,
    User,
    Clock,
    CheckCircle,
    Circle,
    Loader2,
    Send,
    Bot,
    Headphones
} from 'lucide-react';
import { formatDate } from '../utils/formatters';
import { formatDistanceToNow } from 'date-fns';
import Toast from '../components/common/Toast';

export default function SupportPage() {
    const [searchParams] = useSearchParams();
    const sessionIdParam = searchParams.get('session');

    const [selectedSession, setSelectedSession] = useState(null);
    const [messageText, setMessageText] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [toast, setToast] = useState(null);
    const queryClient = useQueryClient();
    const chatEndRef = useRef(null);
    const pollInterval = useRef(null);

    // Fetch current admin profile
    useQuery({
        queryKey: ['profile'],
        queryFn: authApi.getCurrentUser,
    });

    // Fetch support sessions
    const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
        queryKey: ['support-sessions'],
        queryFn: chatApi.getSupportSessions,
        refetchInterval: 5000, // Poll sessions every 5s
        onSuccess: (data) => {
            const sessionList = data?.results || data || [];
            // If we have a sessionIdParam and no selectedSession, find and select it
            if (sessionIdParam && !selectedSession) {
                const session = sessionList.find(s => s.id.toString() === sessionIdParam);
                if (session) setSelectedSession(session);
            }
        }
    });

    const sessionsList = sessionsData?.results || sessionsData || [];

    // Claim session mutation
    const claimMutation = useMutation({
        mutationFn: (id) => chatApi.claimSession(id),
        onSuccess: (data) => {
            queryClient.invalidateQueries(['support-sessions']);
            // Update selected session with the claimed admin info from response or cache
            const currentProfile = queryClient.getQueryData(['profile']);
            setSelectedSession(prev => ({
                ...prev,
                admin: data.admin || currentProfile || { username: 'Admin' }
            }));
            setToast({ type: 'success', message: 'Session claimed successfully!' });
        },
        onError: (error) => {
            console.error('Claim error:', error);
            setToast({ type: 'error', message: 'Failed to claim session.' });
        }
    });

    // Resolve session mutation
    const resolveMutation = useMutation({
        mutationFn: (id) => chatApi.resolveSession(id),
        onSuccess: () => {
            queryClient.invalidateQueries(['support-sessions']);
            setSelectedSession(null);
            setToast({ type: 'success', message: 'Session resolved!' });
        }
    });

    // Send message mutation
    const sendMessageMutation = useMutation({
        mutationFn: ({ userId, text }) => chatApi.sendMessage(userId, text),
        onSuccess: (newMsg) => {
            setMessageText('');
            setChatMessages(prev => [...prev, newMsg]);
        },
        onError: (err) => {
            console.error('Send error:', err);
            setToast({ type: 'error', message: 'Failed to send message.' });
        }
    });

    // Scroll to bottom when messages change
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    // Poll messages for active session
    useEffect(() => {
        if (selectedSession) {
            fetchMessages();
            if (pollInterval.current) clearInterval(pollInterval.current);
            pollInterval.current = setInterval(fetchMessages, 3000);
        } else {
            if (pollInterval.current) clearInterval(pollInterval.current);
            setChatMessages([]);
        }
        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, [selectedSession]);

    const fetchMessages = async () => {
        try {
            const messages = await chatApi.getMessagesWithUser(selectedSession.user.id);
            // Handle both array and paginated response
            const msgList = Array.isArray(messages) ? messages : (messages.results || []);
            setChatMessages(msgList.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
        } catch (error) {
            console.error('Failed to fetch messages:', error);
        }
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (messageText.trim() && !sendMessageMutation.isLoading && selectedSession) {
            sendMessageMutation.mutate({
                userId: selectedSession.user.id,
                text: messageText
            });
        }
    };

    return (
        <div className="flex h-[calc(100vh-170px)] bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden m-6">
            {/* Sessions List */}
            <div className="w-1/3 border-r border-gray-100 flex flex-col">
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                        <MessageSquare className="w-5 h-5 text-purple-600" />
                        <span>Support Inbox</span>
                    </h2>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {sessionsLoading ? (
                        <div className="flex items-center justify-center p-8">
                            <Loader2 className="w-6 h-6 animate-spin text-purple-500" />
                        </div>
                    ) : sessionsList.length === 0 ? (
                        <div className="text-center p-12 text-gray-500">
                            <Headphones className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p className="text-sm">No active support sessions</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-50">
                            {sessionsList.map((session) => (
                                <button
                                    key={session.id}
                                    onClick={() => setSelectedSession(session)}
                                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-start space-x-3 ${selectedSession?.id === session.id ? 'bg-purple-50/50 border-l-4 border-purple-500' : ''
                                        }`}
                                >
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center flex-shrink-0">
                                        <span className="text-purple-600 font-bold text-sm">
                                            {session.user.first_name?.[0]}{session.user.last_name?.[0]}
                                        </span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <p className="font-semibold text-gray-900 truncate">
                                                {session.user.first_name} {session.user.last_name}
                                            </p>
                                            <span className="text-[10px] text-gray-400">
                                                {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-500 truncate">@{session.user.username} • {session.user.role}</p>
                                        <div className="flex items-center mt-2 space-x-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${session.status === 'ACTIVE'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-gray-100 text-gray-700'
                                                }`}>
                                                {session.status}
                                            </span>
                                            {session.admin && (
                                                <span className="text-[10px] text-purple-600 font-medium">
                                                    Assigned to: {session.admin.username === queryClient.getQueryData(['profile'])?.username ? 'Me' : session.admin.username}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col bg-gray-50/30">
                {selectedSession ? (
                    <>
                        {/* Chat Header */}
                        <div className="p-4 bg-white border-b border-gray-100 flex justify-between items-center shadow-sm">
                            <div className="flex items-center space-x-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                                    <User className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="font-bold text-gray-900">{selectedSession.user.first_name} {selectedSession.user.last_name}</p>
                                    <p className="text-xs text-green-600 flex items-center">
                                        <Circle className="w-2 h-2 fill-current mr-1" />
                                        Active Support Session
                                    </p>
                                </div>
                            </div>
                            <div className="flex space-x-2">
                                {!selectedSession.admin && (
                                    <button
                                        onClick={() => claimMutation.mutate(selectedSession.id)}
                                        disabled={claimMutation.isLoading}
                                        className="px-4 py-1.5 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-all flex items-center space-x-2"
                                    >
                                        {claimMutation.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Headphones className="w-4 h-4" />}
                                        <span>Claim Session</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => resolveMutation.mutate(selectedSession.id)}
                                    disabled={resolveMutation.isLoading}
                                    className="px-4 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all flex items-center space-x-2"
                                >
                                    {resolveMutation.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                                    <span>Resolve</span>
                                </button>
                            </div>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            {chatMessages.map((msg, index) => {
                                const isMe = msg.sender?.username === queryClient.getQueryData(['profile'])?.username;
                                const isBot = msg.sender?.role === 'AI' || msg.sender?.username === 'ai';

                                return (
                                    <div
                                        key={msg.id || index}
                                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div className={`max-w-[70%] group`}>
                                            <div className={`p-4 rounded-2xl shadow-sm ${isMe
                                                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-tr-none'
                                                : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                                }`}>
                                                <p className="text-sm leading-relaxed">{msg.content}</p>
                                            </div>
                                            <p className={`text-[10px] mt-1 text-gray-400 ${isMe ? 'text-right' : 'text-left'}`}>
                                                {formatDate(msg.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-white border-t border-gray-100">
                            <form onSubmit={handleSend} className="relative">
                                <textarea
                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 pr-16 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all resize-none text-sm"
                                    placeholder="Type your response..."
                                    rows="2"
                                    value={messageText}
                                    onChange={(e) => setMessageText(e.target.value)}
                                    disabled={!selectedSession.admin || sendMessageMutation.isLoading}
                                />
                                <button
                                    type="submit"
                                    disabled={!messageText.trim() || !selectedSession.admin || sendMessageMutation.isLoading}
                                    className="absolute right-3 bottom-3 p-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:shadow-none"
                                >
                                    {sendMessageMutation.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                                </button>
                            </form>
                            {!selectedSession.admin && (
                                <p className="text-[10px] text-center text-orange-600 font-medium mt-2">
                                    ⚠️ You must claim this session before you can respond.
                                </p>
                            )}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-gray-500">
                        <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center mb-6">
                            <MessageSquare className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Select a Session</h3>
                        <p className="max-w-xs text-sm">Choose a support request from the list to start chatting with the user.</p>
                    </div>
                )}
            </div>
            {/* Toast Notification */}
            {toast && (
                <Toast
                    type={toast.type}
                    message={toast.message}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
}
