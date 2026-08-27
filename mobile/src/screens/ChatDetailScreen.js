import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput,
    TouchableOpacity, KeyboardAvoidingView, Platform,
    ActivityIndicator, Dimensions, StatusBar, Image
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { chatApi } from '../api/chat';
import { Send, User, ChevronLeft, Ellipsis, Phone, MessageSquare } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useChatSocket } from '../hooks/useChatSocket';

const { width } = Dimensions.get('window');

export default function ChatDetailScreen({ route, navigation }) {
    const insets = useSafeAreaInsets();
    const { contactId, contactName, contactImage } = route.params;
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef();

    useEffect(() => {
        fetchMessages();
    }, [contactId]);

    const handleIncomingMessage = useCallback((incoming) => {
        setMessages(prev => prev.some(m => m.id === incoming.id) ? prev : [...prev, incoming]);
    }, []);

    // Live push for the other person's messages; sending still goes
    // through REST below (fetchMessages() re-syncs our own send).
    useChatSocket(contactId, handleIncomingMessage);

    const fetchMessages = async () => {
        try {
            const data = await chatApi.getMessages(contactId);
            setMessages(data);
        } catch (error) {
            console.error("Messages Load Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim()) return;
        const text = newMessage;
        setNewMessage('');
        try {
            await chatApi.sendMessage(contactId, text);
            fetchMessages();
        } catch (error) {
            console.error("Send Message Error:", error);
        }
    };

    const renderMessage = ({ item }) => {
        const isMine = (item.sender?.id ?? item.sender) === user?.id;
        return (
            <View style={[styles.messageRow, isMine ? styles.myMessageRow : styles.theirMessageRow]}>
                <View style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}>
                    <Text style={[styles.messageText, isMine ? styles.myText : styles.theirText]}>
                        {item.content}
                    </Text>
                    <Text style={[styles.timeText, isMine ? styles.myTime : styles.theirTime]}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Minimalist Premium Header */}
            <SafeAreaView edges={['top']} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ChevronLeft size={28} color="#1A1A1A" />
                    </TouchableOpacity>

                    <View style={styles.headerMain}>
                        <View style={styles.avatarWrap}>
                            {contactImage ? (
                                <Image source={{ uri: contactImage }} style={styles.avatarImg} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <User size={18} color="#9BAA9B" />
                                </View>
                            )}
                            <View style={styles.onlineDot} />
                        </View>
                        <View style={styles.headerText}>
                            <Text style={styles.contactName} numberOfLines={1}>{contactName}</Text>
                            <Text style={styles.statusText}>Active now</Text>
                        </View>
                    </View>

                    <View style={styles.headerActions}>
                        <TouchableOpacity style={styles.headerIconBtn}>
                            <Phone size={20} color="#111" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.headerIconBtn}>
                            <Ellipsis size={20} color="#666" />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="small" color="#111" /></View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.messageList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                    showsVerticalScrollIndicator={false}
                />
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
                <View style={[styles.inputContainer, { paddingBottom: Platform.OS === 'ios' ? insets.bottom : 20 }]}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            value={newMessage}
                            onChangeText={setNewMessage}
                            multiline
                            placeholderTextColor="#999"
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
                            onPress={handleSend}
                            disabled={!newMessage.trim()}
                        >
                            <Send size={18} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F9FBFA' },
    header: {
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F3F1',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: 5,
    },
    avatarWrap: {
        position: 'relative',
    },
    avatarImg: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FAFAFA',
        justifyContent: 'center',
        alignItems: 'center',
    },
    onlineDot: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#111',
        borderWidth: 2,
        borderColor: '#fff',
    },
    headerText: {
        marginLeft: 12,
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    statusText: {
        fontSize: 12,
        color: '#111',
        fontWeight: '500',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 5,
    },
    headerIconBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    messageList: { padding: 20, paddingBottom: 30 },
    messageRow: { marginBottom: 12, width: '100%' },
    myMessageRow: { alignItems: 'flex-end' },
    theirMessageRow: { alignItems: 'flex-start' },
    bubble: {
        maxWidth: '80%',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 22
    },
    myBubble: {
        backgroundColor: '#111',
        borderBottomRightRadius: 4,
        shadowColor: '#111',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    theirBubble: {
        backgroundColor: '#fff',
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: '#F0F3F1'
    },
    messageText: { fontSize: 15, lineHeight: 20 },
    myText: { color: '#fff' },
    theirText: { color: '#1A1A1A' },
    timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end', opacity: 0.6 },
    myTime: { color: '#fff' },
    theirTime: { color: '#999' },
    inputContainer: {
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F3F1',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 25,
        paddingHorizontal: 15,
        minHeight: 50,
        maxHeight: 120,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#1A1A1A',
        paddingVertical: 10,
        marginRight: 10,
    },
    sendBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: '#D1D5DB',
    },
});
