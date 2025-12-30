import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput,
    TouchableOpacity, KeyboardAvoidingView, Platform,
    ActivityIndicator, Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Send, Bot, ArrowLeft, User } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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
    const flatListRef = useRef(null);

    const quickReplies = [
        "Where is my pickup?",
        "How do I get paid?",
        "I need human support",
        "Cancel my order"
    ];

    const simulateAIResponse = (userMsg) => {
        setIsTyping(true);
        let reply = "I'm not sure about that. Let me connect you to a human agent.";

        const lowerMsg = userMsg.toLowerCase();

        if (lowerMsg.includes('pickup') || lowerMsg.includes('order') || lowerMsg.includes('track')) {
            reply = "You can track your active pickups in the 'Pickups' tab. Select a job to see the driver's location on the map. 🚚";
        } else if (lowerMsg.includes('paid') || lowerMsg.includes('payment') || lowerMsg.includes('funds') || lowerMsg.includes('wallet')) {
            reply = "Payments are processed securely via your Wallet. You can withdraw funds to your Mobile Money account instantly. 💰";
        } else if (lowerMsg.includes('cancel')) {
            reply = "To cancel an order, go to the active pickup details and tap 'Cancel'. Note that cancellation fees may apply if the driver is already close.";
        } else if (lowerMsg.includes('human') || lowerMsg.includes('support') || lowerMsg.includes('agent')) {
            reply = "I've noted your request. You can reach our 24/7 human support team at support@revesta.com. Would you like me to open the Help center?";
        } else if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
            reply = "Hi there! How can I assist you with your recycling needs today? 🌱";
        }

        setTimeout(() => {
            const aiMsg = {
                id: Date.now().toString(),
                text: reply,
                sender: 'ai',
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, aiMsg]);
            setIsTyping(false);
        }, 1500); // 1.5s simulated delay
    };

    const sendMessage = (text) => {
        if (!text.trim()) return;

        const newMsg = {
            id: Date.now().toString(),
            text: text,
            sender: 'user',
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, newMsg]);
        setInputText('');
        simulateAIResponse(text);
    };

    const renderMessage = ({ item }) => {
        const isUser = item.sender === 'user';
        return (
            <View style={[styles.msgRow, isUser ? styles.msgRowUser : styles.msgRowAi]}>
                {!isUser && (
                    <View style={styles.botAvatar}>
                        <Bot size={20} color="#fff" />
                    </View>
                )}
                <View style={[styles.msgBubble, isUser ? styles.bubbleUser : styles.bubbleAi]}>
                    <Text style={[styles.msgText, isUser ? styles.textUser : styles.textAi]}>
                        {item.text}
                    </Text>
                    <Text style={[styles.msgTime, isUser ? styles.timeUser : styles.timeAi]}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
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
                    <Text style={styles.headerTitle}>ReVesta Support AI</Text>
                    <View style={styles.onlineBadge}>
                        <View style={styles.greenDot} />
                        <Text style={styles.onlineText}>Online</Text>
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
                            <Text style={styles.typingText}>ReVesta AI is typing...</Text>
                        </View>
                    ) : (
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
    onlineText: { fontSize: 12, color: '#2E7D32', fontWeight: '500' },
    list: { padding: 15, paddingBottom: 20 },
    msgRow: { flexDirection: 'row', marginBottom: 15, alignItems: 'flex-end' },
    msgRowUser: { justifyContent: 'flex-end' },
    msgRowAi: { justifyContent: 'flex-start' },
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
    msgText: { fontSize: 15, lineHeight: 22 },
    textUser: { color: '#fff' },
    textAi: { color: '#333' },
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
