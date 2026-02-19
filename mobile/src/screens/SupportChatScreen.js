import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput,
    TouchableOpacity, KeyboardAvoidingView, Platform,
    ActivityIndicator, Image, Dimensions, StatusBar, ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Send, Bot, ArrowLeft, User, MessageCircle, HelpCircle, ChevronRight } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import apiClient from '../api/client';

const { width } = Dimensions.get('window');

export default function SupportChatScreen() {
    const navigation = useNavigation();
    const insets = useSafeAreaInsets();
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
        } finally {
            setIsTyping(false);
        }
    };

    const startPolling = (id) => {
        if (pollInterval.current) clearInterval(pollInterval.current);
        pollInterval.current = setInterval(async () => {
            try {
                const res = await apiClient.get(`chat/support-sessions/${id}/`);
                if (res.data.admin) setAgent(res.data.admin);

                const msgRes = await apiClient.get('chat/messages/');
                const latest = msgRes.data.results || msgRes.data;

                setMessages(prev => {
                    const existingIds = new Set(prev.map(m => m.id));
                    const newMsgs = latest
                        .filter(m => !existingIds.has(m.id.toString()) && (m.sender.role === 'ADMIN' || m.sender.is_staff || m.sender.is_support))
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
        }, 3000);
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
            try {
                if (agent) {
                    await apiClient.post('chat/messages/', { receiver: agent.id, content: text });
                } else {
                    const waitMsg = {
                        id: 'wait-' + Date.now(),
                        text: "Searching for an agent... Your message will be seen soon! ⏳",
                        sender: 'system',
                        timestamp: new Date().toISOString()
                    };
                    setMessages(prev => [...prev, waitMsg]);
                }
            } catch (e) { console.log(e); }
        } else {
            fetchAIResponse(text);
        }
    };

    const renderMessage = ({ item }) => {
        const isUser = item.sender === 'user';
        const isSystem = item.sender === 'system';
        const isAi = item.sender === 'ai';
        const isHuman = item.sender === 'human';

        return (
            <View style={[styles.msgRow, isUser ? styles.msgRowUser : (isSystem ? styles.msgRowSystem : styles.msgRowSupport)]}>
                {(isAi || isHuman) && (
                    <View style={[styles.supportAvatar, isHuman && { backgroundColor: '#F39C12' }]}>
                        {isAi ? <Bot size={14} color="#fff" /> : <User size={14} color="#fff" />}
                    </View>
                )}
                <View style={[styles.msgBubble, isUser ? styles.bubbleUser : (isSystem ? styles.bubbleSystem : styles.bubbleSupport)]}>
                    <Text style={[styles.msgText, isUser ? styles.textUser : (isSystem ? styles.textSystem : styles.textSupport)]}>
                        {item.text}
                    </Text>
                    {!isSystem && (
                        <Text style={[styles.msgTime, isUser ? styles.timeUser : styles.timeSupport]}>
                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />

            {/* Organic Curved Header */}
            <View style={styles.headerBackground}>
                <View style={styles.curvedShape} />
                <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerContent}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ArrowLeft size={24} color="#fff" />
                        </TouchableOpacity>
                        <View style={styles.headerCenter}>
                            <Text style={styles.headerTitle}>
                                {handoffActive ? (agent ? `Agent ${agent.username}` : "Finding Agent...") : "Support Assistant"}
                            </Text>
                            <View style={styles.statusRow}>
                                <View style={handoffActive && !agent ? styles.yellowDot : styles.greenDot} />
                                <Text style={styles.statusLabel}>{handoffActive ? (agent ? "Connected" : "Wait mode") : "AI Support Online"}</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.helpBtn}>
                            <HelpCircle size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>

            {/* Chat Content Overlap */}
            <View style={styles.contentContainer}>
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={
                        isTyping ? (
                            <View style={styles.typingBox}>
                                <ActivityIndicator size="small" color="#2E7D32" />
                                <Text style={styles.typingText}>Thinking...</Text>
                            </View>
                        ) : (
                            !handoffActive && (
                                <View style={styles.quickReplyContainer}>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickReplyList}>
                                        {quickReplies.map((reply, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={styles.quickReplyChip}
                                                onPress={() => sendMessage(reply)}
                                            >
                                                <Text style={styles.quickReplyText}>{reply}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )
                        )
                    }
                />

                <KeyboardAvoidingView
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
                >
                    <View style={[styles.inputArea, { paddingBottom: Platform.OS === 'ios' ? insets.bottom : 20 }]}>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                placeholder="How can we help?"
                                value={inputText}
                                onChangeText={setInputText}
                                multiline
                                placeholderTextColor="#9BAA9B"
                            />
                            <TouchableOpacity
                                style={[styles.sendBtn, !inputText.trim() && styles.sendDisabled]}
                                onPress={() => sendMessage(inputText)}
                                disabled={!inputText.trim()}
                            >
                                <Send size={18} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F7F4' },
    headerBackground: { height: 180, backgroundColor: '#2E7D32', overflow: 'hidden' },
    curvedShape: {
        position: 'absolute', bottom: -80, left: -width * 0.25,
        width: width * 1.5, height: width * 1.5, borderRadius: width * 0.75,
        backgroundColor: '#388E3C', opacity: 0.3
    },
    headerContent: { paddingHorizontal: 25, paddingTop: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerCenter: { flex: 1, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 6 },
    yellowDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F59E0B', marginRight: 6 },
    statusLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
    helpBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    contentContainer: { flex: 1, marginTop: -35, backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35 },
    listContent: { padding: 25, paddingBottom: 20 },
    msgRow: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end' },
    msgRowUser: { justifyContent: 'flex-end' },
    msgRowSupport: { justifyContent: 'flex-start' },
    msgRowSystem: { justifyContent: 'center', marginVertical: 10 },
    supportAvatar: { width: 32, height: 32, borderRadius: 12, backgroundColor: '#2E7D32', justifyContent: 'center', alignItems: 'center', marginRight: 10, marginBottom: 2 },
    msgBubble: { maxWidth: '80%', padding: 14, borderRadius: 22 },
    bubbleUser: { backgroundColor: '#2E7D32', borderBottomRightRadius: 4 },
    bubbleSupport: { backgroundColor: '#F3F4F6', borderBottomLeftRadius: 4 },
    bubbleSystem: { backgroundColor: '#FFFBEB', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 8, borderWidth: 1, borderColor: '#FEF3C7' },
    msgText: { fontSize: 15, lineHeight: 22 },
    textUser: { color: '#fff' },
    textSupport: { color: '#1A1A1A' },
    textSystem: { color: '#B45309', fontSize: 12, fontWeight: '600' },
    msgTime: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end', opacity: 0.6 },
    timeUser: { color: '#fff' },
    timeSupport: { color: '#999' },
    typingBox: { flexDirection: 'row', alignItems: 'center', marginLeft: 42, marginBottom: 15 },
    typingText: { fontSize: 13, color: '#999', marginLeft: 8, fontStyle: 'italic' },
    quickReplyContainer: { marginTop: 10, marginBottom: 5 },
    quickReplyList: { gap: 10 },
    quickReplyChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: '#F0F7F4', borderWidth: 1, borderColor: '#E8F5E9' },
    quickReplyText: { fontSize: 13, color: '#2E7D32', fontWeight: '600' },
    inputArea: { backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 25, paddingHorizontal: 15, minHeight: 50 },
    input: { flex: 1, fontSize: 15, color: '#1A1A1A', paddingVertical: 10, marginRight: 10 },
    sendBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2E7D32', justifyContent: 'center', alignItems: 'center' },
    sendDisabled: { backgroundColor: '#D1D5DB' },
});
