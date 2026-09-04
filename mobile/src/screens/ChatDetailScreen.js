import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput,
    TouchableOpacity, KeyboardAvoidingView, Platform,
    ActivityIndicator, Dimensions, StatusBar, Image, Modal, Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { chatApi } from '../api/chat';
import { moderationApi } from '../api/moderation';
import ReportSheet from '../components/ReportSheet';
import { Send, User, ChevronLeft, MoreVertical, Flag, Ban } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useChatSocket } from '../hooks/useChatSocket';
import { useTheme, makeStyles } from '../theme/ThemeContext';

const { width } = Dimensions.get('window');

export default function ChatDetailScreen({ route, navigation }) {
    const styles = useStyles();
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { contactId, contactName, contactImage, contactIsOnline } = route.params;
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const flatListRef = useRef();

    const [menuVisible, setMenuVisible] = useState(false);
    // { type: 'USER' | 'MESSAGE', id, label } - null when the sheet is closed.
    const [reportTarget, setReportTarget] = useState(null);

    const confirmBlock = () => {
        setMenuVisible(false);
        Alert.alert(
            `Block ${contactName}?`,
            "They won't be able to message you, and you won't see their listings or pickup requests. You can unblock them from your profile.",
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Block',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await moderationApi.blockUser(contactId);
                            Toast.show({ type: 'success', text1: `${contactName} blocked` });
                            navigation.goBack();
                        } catch (error) {
                            Toast.show({ type: 'error', text1: 'Could not block', text2: 'Please try again.' });
                        }
                    },
                },
            ]
        );
    };

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
                <TouchableOpacity
                    activeOpacity={isMine ? 1 : 0.7}
                    // Reporting has to be reachable from the offending content
                    // itself, not just the person - long-press any message the
                    // other party sent. Your own messages aren't reportable.
                    onLongPress={isMine ? undefined : () => setReportTarget({
                        type: 'MESSAGE', id: item.id, label: 'this message',
                    })}
                    style={[styles.bubble, isMine ? styles.myBubble : styles.theirBubble]}
                >
                    <Text style={[styles.messageText, isMine ? styles.myText : styles.theirText]}>
                        {item.content}
                    </Text>
                    <Text style={[styles.timeText, isMine ? styles.myTime : styles.theirTime]}>
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

            {/* Minimalist Premium Header */}
            <SafeAreaView edges={['top']} style={styles.header}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <ChevronLeft size={28} color={colors.text} />
                    </TouchableOpacity>

                    <View style={styles.headerMain}>
                        <View style={styles.avatarWrap}>
                            {contactImage ? (
                                <Image source={{ uri: contactImage }} style={styles.avatarImg} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <User size={18} color={colors.textMuted} />
                                </View>
                            )}
                            {/* Presence was hardcoded here - a green dot and
                                "Active now" showed for everyone, always. Now
                                driven by the contact's real is_online, and
                                omitted entirely when we weren't told. */}
                            {contactIsOnline && <View style={styles.onlineDot} />}
                        </View>
                        <View style={styles.headerText}>
                            <Text style={styles.contactName} numberOfLines={1}>{contactName}</Text>
                            {contactIsOnline !== undefined && (
                                <Text style={styles.statusText}>
                                    {contactIsOnline ? 'Active now' : 'Offline'}
                                </Text>
                            )}
                        </View>
                    </View>

                    <View style={styles.headerActions}>
                        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
                            <MoreVertical size={22} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            {/* Report / block menu */}
            <Modal visible={menuVisible} transparent animationType="fade" onRequestClose={() => setMenuVisible(false)}>
                <TouchableOpacity style={styles.menuOverlay} activeOpacity={1} onPress={() => setMenuVisible(false)}>
                    <View style={styles.menuCard}>
                        <TouchableOpacity
                            style={styles.menuItem}
                            onPress={() => {
                                setMenuVisible(false);
                                setReportTarget({ type: 'USER', id: contactId, label: contactName });
                            }}
                        >
                            <Flag size={18} color={colors.text} />
                            <Text style={styles.menuItemText}>Report {contactName}</Text>
                        </TouchableOpacity>
                        <View style={styles.menuDivider} />
                        <TouchableOpacity style={styles.menuItem} onPress={confirmBlock}>
                            <Ban size={18} color={colors.danger} />
                            <Text style={[styles.menuItemText, { color: colors.danger }]}>Block {contactName}</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            <ReportSheet
                visible={!!reportTarget}
                onClose={() => setReportTarget(null)}
                targetType={reportTarget?.type}
                targetId={reportTarget?.id}
                targetLabel={reportTarget?.label}
            />

            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
            >
                {loading ? (
                    <View style={styles.center}><ActivityIndicator size="small" color={colors.text} /></View>
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

                <View style={[styles.inputContainer, { paddingBottom: Platform.OS === 'ios' ? insets.bottom : 20 }]}>
                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message..."
                            value={newMessage}
                            onChangeText={setNewMessage}
                            multiline
                            placeholderTextColor={colors.textMuted}
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
                            onPress={handleSend}
                            disabled={!newMessage.trim()}
                        >
                            <Send size={18} color={colors.onPrimary} />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const useStyles = makeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.surfaceAlt },
    header: {
        backgroundColor: c.surface,
        borderBottomWidth: 1,
        borderBottomColor: c.borderSubtle,
        shadowColor: c.shadow,
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
        backgroundColor: c.bg,
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
        backgroundColor: c.primary,
        borderWidth: 2,
        borderColor: c.border,
    },
    headerText: {
        marginLeft: 12,
        flex: 1,
    },
    contactName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: c.text,
    },
    statusText: {
        fontSize: 12,
        color: c.text,
        fontWeight: '500',
    },
    headerActions: {
        flexDirection: 'row',
        gap: 5,
    },
    menuBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.25)',
        justifyContent: 'flex-start',
        alignItems: 'flex-end',
        paddingTop: Platform.OS === 'ios' ? 100 : 70,
        paddingRight: 16,
    },
    menuCard: {
        backgroundColor: c.surface,
        borderRadius: 16,
        paddingVertical: 6,
        minWidth: 220,
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
    },
    menuItemText: { fontSize: 15, fontWeight: '600', color: c.text, flexShrink: 1 },
    menuDivider: { height: 1, backgroundColor: c.surfaceSunken, marginHorizontal: 12 },
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
        backgroundColor: c.primary,
        borderBottomRightRadius: 4,
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    theirBubble: {
        backgroundColor: c.surface,
        borderBottomLeftRadius: 4,
        borderWidth: 1,
        borderColor: c.borderSubtle
    },
    messageText: { fontSize: 15, lineHeight: 20 },
    myText: { color: c.onPrimary },
    theirText: { color: c.text },
    timeText: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end', opacity: 0.6 },
    myTime: { color: c.onPrimary },
    theirTime: { color: c.textMuted },
    inputContainer: {
        backgroundColor: c.surface,
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: c.borderSubtle,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.surfaceSunken,
        borderRadius: 25,
        paddingHorizontal: 15,
        minHeight: 50,
        maxHeight: 120,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: c.text,
        paddingVertical: 10,
        marginRight: 10,
    },
    sendBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: c.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    sendBtnDisabled: {
        backgroundColor: c.border,
    },
}));
