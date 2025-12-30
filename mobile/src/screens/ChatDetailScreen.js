import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput,
    TouchableOpacity, KeyboardAvoidingView, Platform,
    ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { chatApi } from '../api/chat';
import { Send, User, ChevronLeft } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-root-toast';

export default function ChatDetailScreen({ route, navigation }) {
    const { contactId, contactName } = route.params;
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef();

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000); // Polling as fallback for WS
        return () => clearInterval(interval);
    }, [contactId]);

    const fetchMessages = async () => {
        try {
            const data = await chatApi.getMessages(contactId);
            setMessages(data);
        } catch (error) {
            console.error("Messages Load Error:", error);
            Toast.show("Failed to load messages", { backgroundColor: '#E74C3C' });
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
        const isMine = item.sender === user?.id;
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
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <ChevronLeft size={24} color="#1a1a1a" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>{contactName}</Text>
                    <Text style={styles.headerSub}>Online</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}><ActivityIndicator size="small" color="#2E7D32" /></View>
            ) : (
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    renderItem={renderMessage}
                    keyExtractor={item => item.id.toString()}
                    contentContainerStyle={styles.messageList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
                />
            )}

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
            >
                <View style={styles.inputArea}>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message..."
                        value={newMessage}
                        onChangeText={setNewMessage}
                        multiline
                    />
                    <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
                        <Send size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fcfcfc' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    headerInfo: { marginLeft: 15 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
    headerSub: { fontSize: 12, color: '#27AE60' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    messageList: { padding: 15, paddingBottom: 20 },
    messageRow: { marginBottom: 15, width: '100%' },
    myMessageRow: { alignItems: 'flex-end' },
    theirMessageRow: { alignItems: 'flex-start' },
    bubble: { maxWidth: '80%', padding: 12, borderRadius: 18 },
    myBubble: { backgroundColor: '#2E7D32', borderBottomRightRadius: 4 },
    theirBubble: { backgroundColor: '#fff', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#eee' },
    messageText: { fontSize: 15 },
    myText: { color: '#fff' },
    theirText: { color: '#1a1a1a' },
    timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
    myTime: { color: 'rgba(255,255,255,0.7)' },
    theirTime: { color: '#999' },
    inputArea: {
        flexDirection: 'row',
        padding: 15,
        backgroundColor: '#fff',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#eee'
    },
    input: {
        flex: 1,
        backgroundColor: '#f1f3f5',
        borderRadius: 20,
        paddingHorizontal: 15,
        paddingVertical: 10,
        maxHeight: 100,
        fontSize: 16
    },
    sendBtn: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        backgroundColor: '#2E7D32',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10
    },
});
