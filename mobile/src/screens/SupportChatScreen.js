import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput,
    TouchableOpacity, KeyboardAvoidingView, Platform,
    ActivityIndicator, Image, Dimensions, StatusBar, ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Send, Bot, ArrowLeft, User, Video, Phone, Smile, Paperclip, Mic, File, X } from 'lucide-react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
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
    const [attachment, setAttachment] = useState(null);
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
                text: reply.replace(/\*/g, ''),
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
                            text: m.content || '',
                            attachment: m.attachment,
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

    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });
            if (!result.canceled && result.assets && result.assets.length > 0) {
                setAttachment(result.assets[0]);
            }
        } catch (err) {
            console.error("Doc pick error:", err);
        }
    };

    const clearAttachment = () => {
        setAttachment(null);
    };

    const sendMessage = async (text) => {
        if (!text.trim() && !attachment) return;
        const newMsg = {
            id: Date.now().toString(),
            text: text,
            attachment: attachment ? attachment.name : null,
            sender: 'user',
            timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, newMsg]);
        setInputText('');
        const currentAttachment = attachment;
        setAttachment(null);
        
        if (handoffActive) {
            try {
                if (agent) {
                    if (currentAttachment) {
                        const formData = new FormData();
                        if (text.trim()) formData.append('content', text);
                        formData.append('receiver', agent.id);
                        formData.append('attachment', {
                            uri: currentAttachment.uri,
                            name: currentAttachment.name,
                            type: currentAttachment.mimeType || 'application/octet-stream'
                        });
                        await apiClient.post('chat/messages/', formData, {
                            headers: { 'Content-Type': 'multipart/form-data' }
                        });
                    } else {
                        await apiClient.post('chat/messages/', { receiver: agent.id, content: text });
                    }
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
            fetchAIResponse(text + (currentAttachment ? ` [Attached File: ${currentAttachment.name}]` : ''));
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
                    <View style={styles.supportAvatar}>
                        {isAi ? <Bot size={14} color="#fff" /> : <User size={14} color="#fff" />}
                    </View>
                )}
                <View style={[styles.msgBubble, isUser ? styles.bubbleUser : (isSystem ? styles.bubbleSystem : styles.bubbleSupport)]}>
                    {item.attachment && (
                        <View style={[styles.attachmentBubble, isUser ? styles.attachmentBubbleUser : styles.attachmentBubbleSupport]}>
                            <File size={16} color={isUser ? "#FFF" : "#111"} />
                            <Text style={[styles.attachmentText, isUser ? styles.textUser : styles.textSupport]} numberOfLines={1}>
                                {item.attachment.split('/').pop()}
                            </Text>
                        </View>
                    )}
                    {!!item.text && (
                        <Text style={[styles.msgText, isUser ? styles.textUser : (isSystem ? styles.textSystem : styles.textSupport)]}>
                            {item.text}
                        </Text>
                    )}
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
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Minimal Header */}
            <SafeAreaView edges={['top']} style={styles.headerArea}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ArrowLeft size={24} color="#111" />
                    </TouchableOpacity>
                    
                    <View style={styles.headerCenter}>
                        <View style={styles.headerAvatarWrap}>
                            <View style={styles.headerAvatar}>
                                {agent ? <User size={18} color="#fff" /> : <Bot size={18} color="#fff" />}
                            </View>
                            <View style={handoffActive && !agent ? styles.yellowDot : styles.greenDot} />
                        </View>
                        <View>
                            <Text style={styles.headerTitle}>
                                {handoffActive ? (agent ? `Agent ${agent.username}` : "Finding Agent...") : "ReVesta Support"}
                            </Text>
                            <Text style={styles.statusLabel}>
                                {handoffActive ? (agent ? "Online" : "Wait mode") : "Online"}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.headerActions}>
                        {/* Video and Phone icons removed as they are not supported yet */}
                    </View>
                </View>
            </SafeAreaView>

            {/* Chat Content */}
            <KeyboardAvoidingView 
                style={styles.contentContainer}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
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
                                <ActivityIndicator size="small" color="#111" />
                                <Text style={styles.typingText}>Typing...</Text>
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

                <View style={[styles.inputArea, { paddingBottom: Platform.OS === 'ios' ? insets.bottom : 20 }]}>
                    {attachment && (
                        <View style={styles.attachmentPreview}>
                            <View style={styles.attachmentPreviewLeft}>
                                <File size={16} color="#111" />
                                <Text style={styles.attachmentPreviewText} numberOfLines={1}>{attachment.name}</Text>
                            </View>
                            <TouchableOpacity onPress={clearAttachment}>
                                <X size={18} color="#ef4444" />
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.inputWrapper}>
                        <TouchableOpacity style={styles.inputActionBtn}>
                            <Smile size={22} color="#999" />
                        </TouchableOpacity>
                        
                        <TextInput
                            style={styles.input}
                            placeholder="Message"
                            value={inputText}
                            onChangeText={setInputText}
                            multiline
                            placeholderTextColor="#999"
                        />
                        
                        {!inputText.trim() && !attachment ? (
                            <View style={styles.rightActionsRow}>
                                <TouchableOpacity style={styles.inputActionBtn} onPress={pickDocument}>
                                    <Paperclip size={20} color="#999" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.inputActionBtn}>
                                    <Mic size={20} color="#999" />
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={styles.sendBtn}
                                onPress={() => sendMessage(inputText)}
                            >
                                <Send size={18} color="#fff" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    headerArea: { backgroundColor: '#FFF', paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, marginTop: 10 },
    backBtn: { width: 40, height: 40, justifyContent: 'center' },
    
    headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    headerAvatarWrap: { position: 'relative', marginRight: 12 },
    headerAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
    greenDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#FFF' },
    yellowDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#F59E0B', borderWidth: 2, borderColor: '#FFF' },
    
    headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#111' },
    statusLabel: { fontSize: 13, color: '#10B981', fontWeight: '500', marginTop: 2 },
    
    headerActions: { flexDirection: 'row', alignItems: 'center' },
    iconBtn: { padding: 4 },
    
    contentContainer: { flex: 1, backgroundColor: '#FAFAFA' },
    listContent: { padding: 20, paddingBottom: 20 },
    
    msgRow: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-end' },
    msgRowUser: { justifyContent: 'flex-end' },
    msgRowSupport: { justifyContent: 'flex-start' },
    msgRowSystem: { justifyContent: 'center', marginVertical: 10 },
    
    supportAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center', marginRight: 10, marginBottom: 2 },
    
    msgBubble: { maxWidth: '75%', padding: 16, borderRadius: 24 },
    bubbleUser: { backgroundColor: '#111', borderBottomRightRadius: 6 },
    bubbleSupport: { backgroundColor: '#FFF', borderBottomLeftRadius: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
    bubbleSystem: { backgroundColor: '#F3F4F6', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 8 },
    
    msgText: { fontSize: 15, lineHeight: 22 },
    textUser: { color: '#fff' },
    textSupport: { color: '#111' },
    textSystem: { color: '#666', fontSize: 12, fontWeight: '600' },
    
    msgTime: { fontSize: 11, marginTop: 6, alignSelf: 'flex-end' },
    timeUser: { color: 'rgba(255,255,255,0.7)' },
    timeSupport: { color: '#999' },
    
    typingBox: { flexDirection: 'row', alignItems: 'center', marginLeft: 42, marginBottom: 15 },
    typingText: { fontSize: 13, color: '#999', marginLeft: 8, fontStyle: 'italic' },
    
    quickReplyContainer: { marginTop: 10, marginBottom: 5 },
    quickReplyList: { gap: 10 },
    quickReplyChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16, backgroundColor: '#FFF', borderWidth: 1, borderColor: '#F3F4F6', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.02, shadowRadius: 2, elevation: 1 },
    quickReplyText: { fontSize: 13, color: '#111', fontWeight: '600' },
    
    inputArea: { backgroundColor: '#FAFAFA', paddingHorizontal: 16, paddingTop: 10 },
    inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: 30, paddingHorizontal: 10, minHeight: 56 },
    inputActionBtn: { padding: 6 },
    rightActionsRow: { flexDirection: 'row', gap: 4 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' },
    attachmentPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F3F4F6',
        marginHorizontal: 20,
        marginBottom: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    attachmentPreviewLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
    attachmentPreviewText: { marginLeft: 8, fontSize: 13, color: '#111', flex: 1 },
    attachmentBubble: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 8,
        marginBottom: 4,
    },
    attachmentBubbleUser: { backgroundColor: 'rgba(255,255,255,0.2)' },
    attachmentBubbleSupport: { backgroundColor: '#F3F4F6' },
    attachmentText: { marginLeft: 6, fontSize: 13, flex: 1 },
    
    input: { flex: 1, fontSize: 15, color: '#111', paddingVertical: 10, paddingHorizontal: 5, maxHeight: 100 },
});
