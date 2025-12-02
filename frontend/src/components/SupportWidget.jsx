import { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Minimize2, Headphones } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import useWebSocket from 'react-use-websocket';
import api from '../api/axios';

const SupportWidget = () => {
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [supportUser, setSupportUser] = useState(null);
    const messagesEndRef = useRef(null);

    // Fetch Support User Info
    useEffect(() => {
        if (isOpen && !supportUser) {
            const initSupport = async () => {
                try {
                    const res = await api.post('messages/get_support_chat/');
                    setSupportUser(res.data);
                    // Fetch history
                    const history = await api.get(`messages/conversation/?user_id=${res.data.support_user_id}`);
                    setMessages(history.data);
                } catch (error) {
                    console.error("Failed to init support chat", error);
                }
            };
            initSupport();
        }
    }, [isOpen]);

    // WebSocket
    const getSocketUrl = () => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';
        const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
        const wsHost = apiUrl.replace(/^https?:\/\//, '').replace(/\/api\/$/, '');
        return `${wsProtocol}://${wsHost}/ws/chat/?token=${localStorage.getItem('access_token')}`;
    };

    const { sendMessage, lastJsonMessage } = useWebSocket(getSocketUrl(), {
        shouldReconnect: () => true,
    });

    useEffect(() => {
        if (lastJsonMessage) {
            const msg = lastJsonMessage.message;
            // Only add if relevant to support chat
            if (supportUser && (msg.sender_id === supportUser.support_user_id || msg.receiver_id === supportUser.support_user_id)) {
                setMessages(prev => [...prev, msg]);
            }
        }
    }, [lastJsonMessage, supportUser]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isOpen]);

    const handleSend = () => {
        if (newMessage.trim() && supportUser) {
            const messageData = {
                message: newMessage,
                receiver_id: supportUser.support_user_id
            };
            sendMessage(JSON.stringify(messageData));
            setNewMessage('');
        }
    };

    if (!user) return null; // Only for logged in users

    return (
        <div className="fixed bottom-6 right-6 z-[9999]">
            {/* Widget Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="bg-primary text-white p-4 rounded-full shadow-2xl hover:bg-green-600 transition-transform hover:scale-110 flex items-center gap-2"
                >
                    <Headphones size={24} />
                    <span className="font-bold hidden md:inline">Live Support</span>
                </button>
            )}

            {/* Chat Window */}
            {isOpen && (
                <div className={`bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 border border-gray-200 ${isMinimized ? 'w-72 h-14' : 'w-80 md:w-96 h-[500px]'}`}>
                    {/* Header */}
                    <div className="bg-gray-900 text-white p-4 flex justify-between items-center cursor-pointer" onClick={() => setIsMinimized(!isMinimized)}>
                        <div className="flex items-center gap-2">
                            <div className="relative">
                                <div className="w-2 h-2 bg-green-500 rounded-full absolute bottom-0 right-0 border border-gray-900"></div>
                                <Headphones size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">ReVesta Support</h3>
                                {!isMinimized && <p className="text-xs text-gray-400">We typically reply in minutes</p>}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setIsMinimized(!isMinimized); }} className="hover:text-gray-300">
                                <Minimize2 size={16} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setIsOpen(false); }} className="hover:text-gray-300">
                                <X size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Messages Area */}
                    {!isMinimized && (
                        <>
                            <div className="h-[380px] overflow-y-auto p-4 bg-gray-50 space-y-3">
                                {messages.length === 0 && (
                                    <div className="text-center text-gray-400 text-sm mt-10">
                                        <p>👋 Hi {user.username}!</p>
                                        <p>How can we help you today?</p>
                                    </div>
                                )}
                                {messages.map((msg, idx) => {
                                    const isMe = msg.sender === user.username || msg.sender_id === user.user_id;
                                    return (
                                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[80%] p-3 rounded-xl text-sm ${isMe ? 'bg-primary text-white rounded-br-none' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'}`}>
                                                {msg.content || msg.message}
                                            </div>
                                        </div>
                                    );
                                })}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Input Area */}
                            <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                                    placeholder="Type a message..."
                                    className="flex-1 bg-gray-100 border-none rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!newMessage.trim()}
                                    className="bg-primary text-white p-2 rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default SupportWidget;
