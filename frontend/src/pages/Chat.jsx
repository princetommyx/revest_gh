import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import api from '../api/axios';
import useWebSocket from 'react-use-websocket';
import { Send, User, ArrowLeft, MessageSquare } from 'lucide-react';

const Chat = () => {
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    // State
    const [conversations, setConversations] = useState([]);
    const [activeChat, setActiveChat] = useState(null); // { id, username, role }
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    // Initial load: Check if we were sent here with a specific user to chat with
    useEffect(() => {
        if (location.state?.startChatWith) {
            setActiveChat(location.state.startChatWith);
        }
        fetchConversations();
    }, [location.state]);

    // Fetch recent conversations
    const fetchConversations = async () => {
        try {
            const res = await api.get('messages/recent_conversations/');
            setConversations(res.data);
        } catch (err) {
            console.error("Failed to load conversations", err);
        }
    };

    // Fetch message history when active chat changes
    useEffect(() => {
        if (activeChat) {
            const fetchHistory = async () => {
                try {
                    const res = await api.get(`messages/conversation/?user_id=${activeChat.id}`);
                    setMessages(res.data);
                    scrollToBottom();
                } catch (err) {
                    console.error("Failed to load history", err);
                }
            };
            fetchHistory();
        }
    }, [activeChat]);

    // WebSocket for Active Chat
    const getSocketUrl = () => {
        if (!activeChat) return null;
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api/';
        const wsProtocol = apiUrl.startsWith('https') ? 'wss' : 'ws';
        const wsHost = apiUrl.replace(/^https?:\/\//, '').replace(/\/api\/$/, '');
        return `${wsProtocol}://${wsHost}/ws/chat/${activeChat.id}/?token=${localStorage.getItem('access_token')}`;
    };

    const { sendMessage, lastJsonMessage } = useWebSocket(getSocketUrl(), {
        share: false,
        shouldReconnect: () => true,
    });

    // Handle incoming messages
    useEffect(() => {
        if (lastJsonMessage) {
            if (lastJsonMessage.type === 'chat_message') {
                setMessages(prev => [...prev, lastJsonMessage]);
                scrollToBottom();
            }
        }
    }, [lastJsonMessage]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const handleSend = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !activeChat) return;

        const messageData = {
            message: newMessage
        };

        sendMessage(JSON.stringify(messageData));
        setNewMessage('');
    };

    // Render Conversation List
    if (!activeChat) {
        return (
            <div className="max-w-2xl mx-auto p-4">
                <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <MessageSquare className="text-primary" />
                    Messages
                </h1>

                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {conversations.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <p>No conversations yet.</p>
                            <p className="text-sm">Start chatting from the Marketplace or Logistics page!</p>
                        </div>
                    ) : (
                        conversations.map(conv => (
                            <div
                                key={conv.id}
                                onClick={() => setActiveChat(conv)}
                                className="p-4 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer flex items-center gap-4 transition-colors"
                            >
                                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-500">
                                    <User size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{conv.username}</h3>
                                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">
                                        {conv.role}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        );
    }

    // Render Chat Room
    return (
        <div className="flex flex-col h-[calc(100vh-80px)] max-w-2xl mx-auto bg-white shadow-xl md:rounded-xl overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b p-4 flex items-center gap-3 shadow-sm z-10">
                <button
                    onClick={() => setActiveChat(null)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                    <ArrowLeft size={20} />
                </button>
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                    <User size={20} />
                </div>
                <div>
                    <h2 className="font-bold text-gray-900">{activeChat.username}</h2>
                    <p className="text-xs text-green-600 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Online
                    </p>
                </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {messages.map((msg, idx) => {
                    const isMe = msg.sender === user.id || msg.sender_id === user.id;
                    return (
                        <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] p-3 rounded-2xl shadow-sm ${isMe
                                ? 'bg-primary text-white rounded-tr-none'
                                : 'bg-white text-gray-800 rounded-tl-none'
                                }`}>
                                <p>{msg.content || msg.message}</p>
                                <p className={`text-[10px] mt-1 ${isMe ? 'text-green-100' : 'text-gray-400'}`}>
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 bg-gray-100 rounded-full outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="p-3 bg-primary text-white rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md"
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
};

export default Chat;
