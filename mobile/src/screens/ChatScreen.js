import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    TouchableOpacity, ActivityIndicator, Image, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { chatApi } from '../api/chat';
import { MessageSquare, User, Clock, ChevronRight, Bot, Bell, AlertCircle, Check } from 'lucide-react-native';
import Toast from 'react-native-root-toast';
import { BASE_URL } from '../api/client';
import { notificationsApi } from '../api/notifications';
import { useNotifications } from '../context/NotificationContext';

export default function ChatScreen({ route }) {
    const navigation = useNavigation();
    const { markAllRead } = useNotifications();
    const [conversations, setConversations] = useState([]);
    const [filteredConversations, setFilteredConversations] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('All');
    const [refreshing, setRefreshing] = useState(false);

    const fetchConversations = async () => {
        try {
            const data = await chatApi.getConversations();
            setConversations(data);
            setFilteredConversations(data);
        } catch (error) {
            console.error("Conversations Load Error:", error);
            Toast.show("Failed to load conversations", { backgroundColor: '#E74C3C' });
        }
    };

    const fetchNotifications = async () => {
        try {
            const data = await notificationsApi.getNotifications();
            const results = Array.isArray(data) ? data : (data.results || []);
            setNotifications(results);
        } catch (error) {
            console.error("Failed to load notifications", error);
        }
    };

    const loadData = async () => {
        setLoading(true);
        await Promise.all([fetchConversations(), fetchNotifications()]);
        setLoading(false);
        setRefreshing(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    // Handle initial tab from navigation params
    useEffect(() => {
        if (route.params?.tab) {
            setActiveTab(route.params.tab);
        }
    }, [route.params?.tab]);

    // Filter logic
    useEffect(() => {
        let result = conversations;
        if (search) {
            result = result.filter(c =>
                c.contact_username.toLowerCase().includes(search.toLowerCase()) ||
                (c.last_message && c.last_message.toLowerCase().includes(search.toLowerCase()))
            );
        }
        if (activeTab === 'Unread') {
            result = result.filter(c => c.unread_count > 0);
        }
        setFilteredConversations(result);
    }, [search, activeTab, conversations]);

    const resolveImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    };

    // Generate random pastel color based on name
    const getAvatarColor = (name) => {
        const colors = ['#E57373', '#F06292', '#BA68C8', '#9575CD', '#7986CB', '#64B5F6', '#4FC3F7', '#4DD0E1', '#4DB6AC', '#81C784', '#AED581', '#FFD54F', '#FFB74D', '#FF8A65'];
        let hash = 0;
        for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
        return colors[Math.abs(hash) % colors.length];
    };

    const getInitials = (name) => name ? name.substring(0, 2).toUpperCase() : 'U';

    const formatSmartTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return date.toLocaleDateString([], { weekday: 'short' });
        return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            Toast.show("All notifications marked as read", { backgroundColor: '#2E7D32' });
        } catch (e) {
            console.log("Error marking read", e);
        }
    };

    const handleNotificationPress = async (item) => {
        if (!item.is_read) {
            try {
                await notificationsApi.markAsRead(item.id);
                setNotifications(prev => prev.map(n =>
                    n.id === item.id ? { ...n, is_read: true } : n
                ));
            } catch (e) {
                console.log("Error marking read", e);
            }
        }
    };

    const renderConversation = ({ item }) => {
        const avatarColor = getAvatarColor(item.contact_username || 'User');
        const profileImg = resolveImageUrl(item.contact_profile_image);

        return (
            <TouchableOpacity
                style={styles.convCard}
                onPress={() => navigation.navigate('ChatDetail', {
                    contactId: item.contact_id,
                    contactName: item.contact_username
                })}
            >
                <View style={[styles.avatarBox, !profileImg && { backgroundColor: avatarColor + '20', borderColor: avatarColor + '40' }]}>
                    {profileImg ? (
                        <Image source={{ uri: profileImg }} style={styles.avatarImage} />
                    ) : (
                        <Text style={[styles.avatarInitials, { color: avatarColor }]}>
                            {getInitials(item.contact_username)}
                        </Text>
                    )}
                    {item.unread_count > 0 && (
                        <View style={styles.unreadBadge}>
                            <View style={styles.unreadDot} />
                        </View>
                    )}
                </View>
                <View style={styles.convInfo}>
                    <View style={styles.convHeader}>
                        <Text style={[styles.contactName, item.unread_count > 0 && styles.contactNameUnread]}>
                            {item.contact_username}
                        </Text>
                        <Text style={[styles.convTime, item.unread_count > 0 && styles.convTimeUnread]}>
                            {formatSmartTime(item.timestamp)}
                        </Text>
                    </View>
                    <Text
                        style={[styles.lastMsg, item.unread_count > 0 && styles.unreadMsg]}
                        numberOfLines={1}
                    >
                        {item.last_message || 'Start a conversation...'}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderNotification = ({ item }) => {
        const isUrgent = item.urgency === 'URGENT';
        return (
            <TouchableOpacity
                style={[
                    styles.notifCard,
                    !item.is_read && styles.unreadNotif,
                    isUrgent && styles.urgentNotif
                ]}
                onPress={() => handleNotificationPress(item)}
            >
                <View style={[styles.notifIconBox, isUrgent && { backgroundColor: '#FFEBEE' }]}>
                    {isUrgent ? (
                        <AlertCircle size={24} color="#D32F2F" />
                    ) : (
                        <Bell size={24} color="#2E7D32" />
                    )}
                </View>
                <View style={styles.notifContent}>
                    <View style={styles.notifHeader}>
                        <Text style={[styles.notifTitle, !item.is_read && styles.unreadTitle]} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <Text style={styles.notifTime}>{formatSmartTime(item.created_at)}</Text>
                    </View>
                    <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
                </View>
                {!item.is_read && <View style={styles.notifDot} />}
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2E7D32" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header Section */}
            <View style={styles.headerContainer}>
                <SafeAreaView edges={['top']} style={styles.safeArea}>
                    <View style={styles.searchBarContainer}>
                        {/* <TouchableOpacity style={styles.backButton}>
                            <ChevronLeft size={28} color="#fff" />
                        </TouchableOpacity> */}
                        <View style={styles.searchBar}>
                            <View style={styles.searchIcon}>
                                <MessageSquare size={20} color="#999" />
                            </View>
                            <TextInput
                                style={styles.searchText}
                                placeholder="Search in Messages"
                                placeholderTextColor="#aaa"
                                value={search}
                                onChangeText={setSearch}
                            />
                        </View>
                    </View>
                </SafeAreaView>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    {['All', 'Unread', 'Notifications'].map(tab => {
                        const isNotif = tab === 'Notifications';
                        const unreadNotifs = notifications.filter(n => !n.is_read).length;
                        const unreadMsgs = conversations.filter(c => c.unread_count > 0).length;

                        return (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                    {tab}
                                </Text>
                                {isNotif && unreadNotifs > 0 && (
                                    <View style={styles.badgeCommon}>
                                        <Text style={styles.badgeTextCommon}>{unreadNotifs}</Text>
                                    </View>
                                )}
                                {tab === 'Unread' && unreadMsgs > 0 && (
                                    <View style={[styles.badgeCommon, { backgroundColor: '#2E7D32' }]}>
                                        <Text style={styles.badgeTextCommon}>{unreadMsgs}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* List Header Actions for Notifications */}
            {activeTab === 'Notifications' && notifications.length > 0 && (
                <TouchableOpacity style={styles.markReadAll} onPress={handleMarkAllRead}>
                    <Check size={16} color="#2E7D32" />
                    <Text style={styles.markReadText}>Mark all as read</Text>
                </TouchableOpacity>
            )}

            {/* Chat/Notification List */}
            <FlatList
                data={activeTab === 'Notifications' ? notifications : filteredConversations}
                renderItem={activeTab === 'Notifications' ? renderNotification : renderConversation}
                keyExtractor={item => (activeTab === 'Notifications' ? `notif-${item.id}` : `conv-${item.contact_id}`)}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={
                    activeTab !== 'Notifications' && (
                        <TouchableOpacity
                            style={styles.aiSupportRow}
                            onPress={() => navigation.navigate('SupportChat')}
                        >
                            <View style={styles.aiIconBox}>
                                <Bot size={24} color="#fff" />
                            </View>
                            <View style={styles.aiInfo}>
                                <Text style={styles.aiTitle}>AI Assistant</Text>
                                <Text style={styles.aiSubtitle}>Need help? Ask our bot instantly.</Text>
                            </View>
                            <ChevronRight size={20} color="#ccc" />
                        </TouchableOpacity>
                    )
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        {activeTab === 'Notifications' ? (
                            <>
                                <Bell size={48} color="#ccc" />
                                <Text style={styles.emptyTitle}>All caught up!</Text>
                                <Text style={styles.emptySubtitle}>System alerts and updates will appear here.</Text>
                            </>
                        ) : (
                            <>
                                <MessageSquare size={48} color="#ccc" />
                                <Text style={styles.emptyTitle}>No messages yet</Text>
                                <Text style={styles.emptySubtitle}>Chats with sellers and buyers will appear here.</Text>
                            </>
                        )}
                    </View>
                }
                onRefresh={loadData}
                refreshing={refreshing || loading}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' }, // White background like Jiji

    // Header
    headerContainer: {
        backgroundColor: '#2E7D32',
        elevation: 4,
        zIndex: 10,
    },
    safeArea: {
        paddingBottom: 10,
    },
    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        marginTop: 10,
    },
    searchBar: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 4,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    searchIcon: { marginRight: 10 },
    searchText: { color: '#aaa', fontSize: 15 },

    // Tabs
    tabsContainer: {
        flexDirection: 'row',
        backgroundColor: '#fff',
    },
    tabItem: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
        flexDirection: 'row',
        gap: 6
    },
    tabItemActive: {
        borderBottomColor: '#2E7D32',
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#757575',
    },
    tabTextActive: {
        color: '#2E7D32',
    },
    badgeCommon: {
        backgroundColor: '#E74C3C',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 1,
    },
    badgeTextCommon: { color: '#fff', fontSize: 10, fontWeight: 'bold' },

    // List
    listContent: {
        paddingTop: 0,
    },

    // AI Support Row (Streamlined)
    aiSupportRow: {
        flexDirection: 'row', alignItems: 'center',
        paddingVertical: 12, paddingHorizontal: 16,
        borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
        backgroundColor: '#fff'
    },
    aiIconBox: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: '#2E7D32', // Green circle for bot
        justifyContent: 'center', alignItems: 'center', marginRight: 15
    },
    aiTitle: { fontSize: 16, fontWeight: 'bold', color: '#2E7D32' },
    aiSubtitle: { fontSize: 13, color: '#666' },
    aiInfo: { flex: 1 },

    // Conversation Item (Flat List Style)
    convCard: {
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    avatarBox: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#eee',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e0e0e0',
        marginRight: 15,
        overflow: 'hidden'
    },
    avatarImage: { width: '100%', height: '100%' },
    avatarInitials: { fontSize: 18, fontWeight: 'bold' },

    unreadBadge: {
        position: 'absolute',
        top: -2, right: -2,
        backgroundColor: '#fff',
        width: 12, height: 12,
        borderRadius: 6,
        justifyContent: 'center', alignItems: 'center'
    },
    unreadDot: {
        width: 8, height: 8, borderRadius: 4, backgroundColor: '#2E7D32'
    },
    unreadText: { display: 'none' },

    convInfo: { flex: 1 },
    convHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    contactName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    contactNameUnread: { color: '#000' },

    convTime: { fontSize: 12, color: '#999' },
    convTimeUnread: { color: '#2E7D32', fontWeight: 'bold' },

    lastMsg: { fontSize: 14, color: '#757575' },
    unreadMsg: { color: '#333', fontWeight: '500' },

    // Empty State
    emptyContainer: { flex: 1, alignItems: 'center', marginTop: 100 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginTop: 15 },
    emptySubtitle: { color: '#999', marginTop: 5 },

    // Notifications Styling
    notifCard: {
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: '#fff'
    },
    unreadNotif: { backgroundColor: '#F0F8F1' },
    urgentNotif: { backgroundColor: '#FFEBEE' },
    notifIconBox: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#F0F8F1', justifyContent: 'center', alignItems: 'center',
        marginRight: 15
    },
    notifContent: { flex: 1 },
    notifHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
    notifTitle: { fontSize: 15, fontWeight: '600', color: '#333' },
    unreadTitle: { fontWeight: 'bold', color: '#000' },
    notifTime: { fontSize: 11, color: '#999' },
    notifBody: { fontSize: 13, color: '#666', lineHeight: 18 },
    notifDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2E7D32', marginLeft: 10 },

    markReadAll: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#F9F9F9',
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    markReadText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginLeft: 4
    },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
