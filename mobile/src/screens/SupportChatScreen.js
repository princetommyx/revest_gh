import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput,
    TouchableOpacity, KeyboardAvoidingView, Platform,
    ActivityIndicator, Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Send, Bot, ArrowLeft, User } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import apiClient from '../api/client';

export default function SupportChatScreen() {
    const navigation = useNavigation();
    const [messages, setMessages] = useState([
        {
            id: '1',
            text: "Hello! 👋 I'm ReVesta's AI Assistant. How can I help you today?",
            sender: 'ai',
            timestamp: new Date().toISOString()
        }
    ]);
    const [inputText, setInputText] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [handoffActive, setHandoffActive] = useState(false);
    const [sessionId, setSessionId] = useState(null);
    const [agent, setAgent] = useState(null);
    const flatListRef = useRef(null);
    const pollInterval = useRef(null);

    const quickReplies = [
        "Where is my pickup?",
        "How do I get paid?",
        "I need human support",
        "Cancel my order"
    ];

    const fetchAIResponse = async (userMsg) => {
        setIsTyping(true);
        try {
            const response = await apiClient.post('support/chat/', { message: userMsg });
            const { reply, handoff, session_id } = response.data;

            const aiMsg = {
                id: Date.now().toString(),
                text: reply,
                sender: 'ai',
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, aiMsg]);

            if (handoff) {
                setHandoffActive(true);
                setSessionId(session_id);
                startPolling(session_id);
            }
        } catch (error) {
            console.error('[Support Chat] AI Error:', error);
            const errorMsg = {
                id: Date.now().toString(),
                text: "I'm having trouble connecting to my brain right now. Please try again or email support@revesta.com!",
                sender: 'ai',
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsTyping(false);
        }
    };

    const startPolling = (id) => {
        if (pollInterval.current) clearInterval(pollInterval.current);
        pollInterval.current = setInterval(async () => {
            try {
                // Check if session has an agent now
                const res = await apiClient.get(`chat/support-sessions/${id}/`);
                if (res.data.admin) {
                    setAgent(res.data.admin);
                }

                // Also fetch messages - for now we use the general chat history
                // but usually we'd have a specific "Support Channel"
                const msgRes = await apiClient.get('chat/messages/');
                const latest = msgRes.data.results || msgRes.data;

                // Merge new messages from human agents (where sender isn't current user)
                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const newMsgs = latest
                        .filter(m => !existingIds.has(m.id.toString()) && m.sender.role === 'ADMIN')
                        .map(m => ({
                            id: m.id.toString(),
                            text: m.content,
                            sender: 'human',
                            timestamp: m.timestamp
                        }));
                    if (newMsgs.length > 0) return [...prev, ...newMsgs];
                    return prev;
                });
            } catch (e) {
                console.log("Polling error", e);
            }
        }, 3000); // Poll every 3 seconds
    };

    useEffect(() => {
        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, []);

    const sendMessage = async (text) => {
        if (!text.trim()) return;

        const newMsg = {
            id: Date.now().toString(),
            text: text,
            sender: 'user',
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, newMsg]);
        setInputText('');

        if (handoffActive) {
            // Send directly to admin/support
            try {
                // We need an admin ID to send to. If not claimed, we send to a system user or wait.
                // For Revesta, let's assume admins poll the SupportSession and reply using current user's ID.
                // So the user sends to 'admin' if known, otherwise just wait for agent.
                if (agent) {
                    await apiClient.post('chat/messages/', {
                        receiver: agent.id,
                        content: text
                    });
                } else {
                    // Still waiting for agent - maybe notify user?
                    const waitMsg = {
                        id: 'wait-' + Date.now(),
                        text: "An agent hasn't claimed this chat yet. Your message will be seen as soon as someone connects! ⏳",
                        sender: 'system',
                        timestamp: new Date().toISOString()
                    };
                    setMessages(prev => [...prev, waitMsg]);
                }
            } catch (e) {
                console.log("Failed to send human message", e);
            }
        } else {
            fetchAIResponse(text);
        }
    };

    const renderMessage = ({ item }) => {
        const isUser = item.sender === 'user';
        const isAi = item.sender === 'ai';
        const isSystem = item.sender === 'system';
        const isHuman = item.sender === 'human';

        return (
            <View style={[
                styles.msgRow,
                isUser ? styles.msgRowUser : (isSystem ? styles.msgRowSystem : styles.msgRowAi)
            ]}>
                {isAi && (
                    <View style={styles.botAvatar}>
                        <Bot size={20} color="#fff" />
                    </View>
                )}
                {isHuman && (
                    <View style={[styles.botAvatar, { backgroundColor: '#1976D2' }]}>
                        <User size={20} color="#fff" />
                    </View>
                )}
                <View style={[
                    styles.msgBubble,
                    isUser ? styles.bubbleUser : (isHuman ? styles.bubbleHuman : (isSystem ? styles.bubbleSystem : styles.bubbleAi))
                ]}>
                    <Text style={[
                        styles.msgText,
                        isUser ? styles.textUser : (isSystem ? styles.textSystem : styles.textAi)
                    ]}>
                        {item.text}
                    </Text>
                    {!isSystem && (
                        <Text style={[styles.msgTime, isUser ? styles.timeUser : styles.timeAi]}>
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1a1a1a" />
                </TouchableOpacity>
                <View style={styles.headerTitleBox}>
                    <Text style={styles.headerTitle}>
                        {handoffActive ? (agent ? `Agent ${agent.username}` : "Finding Agent...") : "ReVesta Support AI"}
                    </Text>
                    <View style={styles.onlineBadge}>
                        <View style={handoffActive && !agent ? styles.yellowDot : styles.greenDot} />
                        <Text style={[styles.onlineText, handoffActive && !agent && { color: '#F39C12' }]}>
                            {handoffActive ? (agent ? "Connected" : "Wait time: < 2m") : "Online"}
                        </Text>
                    </View>
                </View>
            </View>

            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                ListFooterComponent={
                    isTyping ? (
                        <View style={styles.typingBox}>
                            <ActivityIndicator size="small" color="#2E7D32" />
                            <Text style={styles.typingText}>{handoffActive ? "Agent is typing..." : "ReVesta AI is typing..."}</Text>
                        </View>
                    ) : (
                        !handoffActive && (
                            <View style={styles.quickReplies}>
                                {quickReplies.map((reply, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.quickReplyChip}
                                        onPress={() => sendMessage(reply)}
                                    >
                                        <Text style={styles.quickReplyText}>{reply}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        )
                    )
                }
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
                style={styles.inputContainer}
            >
                <TextInput
                    style={styles.input}
                    placeholder="Type a message..."
                    value={inputText}
                    onChangeText={setInputText}
                    multiline
                />
                <TouchableOpacity
                    style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
                    onPress={() => sendMessage(inputText)}
                    disabled={!inputText.trim()}
                >
                    <Send size={20} color="#fff" />
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: {
        flexDirection: 'row', alignItems: 'center', padding: 15,
        backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee'
    },
    backBtn: { padding: 5, marginRight: 10 },
    headerTitleBox: { justifyContent: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
    onlineBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2E7D32', marginRight: 5 },
    yellowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F39C12', marginRight: 5 },
    onlineText: { fontSize: 12, color: '#2E7D32', fontWeight: '500' },
    list: { padding: 15, paddingBottom: 20 },
    msgRow: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end' },
    msgRowUser: { justifyContent: 'flex-end' },
    msgRowAi: { justifyContent: 'flex-start' },
    msgRowSystem: { justifyContent: 'center' },
    botAvatar: {
        width: 32, height: 32, borderRadius: 16, backgroundColor: '#2E7D32',
        justifyContent: 'center', alignItems: 'center', marginRight: 8
    },
    msgBubble: {
        maxWidth: '80%', padding: 12, borderRadius: 16,
        elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1, shadowRadius: 2
    },
    bubbleUser: { backgroundColor: '#2E7D32', borderBottomRightRadius: 2 },
    bubbleAi: { backgroundColor: '#fff', borderBottomLeftRadius: 2 },
    bubbleHuman: { backgroundColor: '#E3F2FD', borderBottomLeftRadius: 2 },
    bubbleSystem: { backgroundColor: '#FFF3E0', alignSelf: 'center', borderRadius: 8, borderBottomWidth: 0 },
    msgText: { fontSize: 15, lineHeight: 22 },
    textUser: { color: '#fff' },
    textAi: { color: '#333' },
    textSystem: { color: '#E65100', fontSize: 12, fontWeight: '500' },
    msgTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
    timeUser: { color: 'rgba(255,255,255,0.7)' },
    timeAi: { color: '#999' },
    typingBox: { flexDirection: 'row', alignItems: 'center', marginLeft: 40, marginBottom: 10 },
    typingText: { fontSize: 12, color: '#666', marginLeft: 8, fontStyle: 'italic' },
    quickReplies: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginLeft: 40, marginTop: 10, marginBottom: 10 },
    quickReplyChip: {
        backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 20, borderWidth: 1, borderColor: '#C8E6C9'
    },
    quickReplyText: { fontSize: 12, color: '#2E7D32', fontWeight: '600' },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center', padding: 10,
        backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee'
    },
    input: {
        flex: 1, backgroundColor: '#f5f5f5', borderRadius: 24,
        paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100,
        fontSize: 16, color: '#333'
    },
    sendBtn: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#2E7D32',
        justifyContent: 'center', alignItems: 'center', marginLeft: 10
    },
    sendBtnDisabled: { backgroundColor: '#ccc' }
});
