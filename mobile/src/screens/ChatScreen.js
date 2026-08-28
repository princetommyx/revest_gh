import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    TouchableOpacity, Image, TextInput, Dimensions, StatusBar, ScrollView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { chatApi } from '../api/chat';
import { MessageSquare, User, Bot, Bell, CircleAlert, Check, Search, Mic, Ellipsis } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { BASE_URL } from '../api/client';
import { notificationsApi } from '../api/notifications';
import { useNotifications } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import PageLoader from '../components/PageLoader';

const { width } = Dimensions.get('window');

export default function ChatScreen({ route }) {
    const navigation = useNavigation();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const { markAllRead } = useNotifications();
    
    const [conversations, setConversations] = useState([]);
    const [filteredConversations, setFilteredConversations] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('All');
    const [refreshing, setRefreshing] = useState(false);

    const onlineContacts = conversations.filter(c => c.contact_is_online);

    const fetchConversations = async () => {
        try {
            const data = await chatApi.getConversations();
            setConversations(data);
            setFilteredConversations(data);
        } catch (error) {
            console.error("Conversations Load Error:", error);
            Toast.show({ type: 'error', text1: 'Failed to load conversations' });
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

    useEffect(() => {
        if (route.params?.tab) setActiveTab(route.params.tab);
    }, [route.params?.tab]);

    useEffect(() => {
        let result = conversations;
        if (search) {
            result = result.filter(c =>
                c.contact_username.toLowerCase().includes(search.toLowerCase()) ||
                (c.last_message && c.last_message.toLowerCase().includes(search.toLowerCase()))
            );
        }
        if (activeTab === 'Unread') result = result.filter(c => c.unread_count > 0);
        setFilteredConversations(result);
    }, [search, activeTab, conversations]);

    const resolveImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
    };

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
            Toast.show({ type: 'success', text1: 'All marked as read' });
        } catch (e) { console.log(e); }
    };

    const renderOnlineUser = (item) => {
        const profileImg = resolveImageUrl(item.contact_profile_image);
        return (
            <TouchableOpacity 
                key={item.contact_id} 
                style={styles.onlineUserBox}
                onPress={() => navigation.navigate('ChatDetail', {
                    contactId: item.contact_id,
                    contactName: item.contact_username,
                    contactIsOnline: item.contact_is_online,
                })}
            >
                <View style={styles.onlineAvatarWrap}>
                    {profileImg ? (
                        <Image source={{ uri: profileImg }} style={styles.onlineAvatar} />
                    ) : (
                        <View style={[styles.onlineAvatar, styles.avatarPlaceholder]}>
                            <User size={20} color="#999" />
                        </View>
                    )}
                    {item.contact_is_online && <View style={styles.onlineDot} />}
                </View>
                <Text style={styles.onlineName} numberOfLines={1}>{item.contact_username.split(' ')[0]}</Text>
            </TouchableOpacity>
        );
    };

    const renderConversation = ({ item }) => {
        const profileImg = resolveImageUrl(item.contact_profile_image);
        return (
            <TouchableOpacity
                style={styles.convCard}
                onPress={() => navigation.navigate('ChatDetail', {
                    contactId: item.contact_id,
                    contactName: item.contact_username
                })}
                activeOpacity={0.7}
            >
                <View style={styles.avatarWrapper}>
                    {profileImg ? (
                        <Image source={{ uri: profileImg }} style={styles.avatar} />
                    ) : (
                        <View style={[styles.avatar, styles.avatarPlaceholder]}>
                            <User size={24} color="#999" />
                        </View>
                    )}
                </View>
                <View style={styles.convMain}>
                    <View style={styles.convTop}>
                        <Text style={[styles.contactName, item.unread_count > 0 && styles.nameUnread]} numberOfLines={1}>
                            {item.contact_username}
                        </Text>
                        <Text style={[styles.convTime, item.unread_count > 0 && styles.timeUnread]}>
                            {formatSmartTime(item.timestamp)}
                        </Text>
                    </View>
                    <View style={styles.convBottom}>
                        <Text style={[styles.lastMsg, item.unread_count > 0 && styles.msgUnread]} numberOfLines={1}>
                            {item.last_message || 'Tap to chat'}
                        </Text>
                        {item.unread_count > 0 && (
                            <View style={styles.unreadDot} />
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderNotification = ({ item }) => (
        <TouchableOpacity style={styles.notifCard} activeOpacity={0.7}>
            <View style={[styles.notifIcon, { backgroundColor: item.urgency === 'URGENT' ? '#FEF2F2' : '#F9FAFB' }]}>
                {item.urgency === 'URGENT' ? <CircleAlert size={20} color="#EF4444" /> : <Bell size={20} color="#111" />}
            </View>
            <View style={styles.notifInfo}>
                <View style={styles.notifTop}>
                    <Text style={[styles.notifTitle, !item.is_read && styles.notifTitleUnread]} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.notifTimeSmall}>{formatSmartTime(item.created_at)}</Text>
                </View>
                <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
            </View>
            {!item.is_read && <View style={styles.greenDot} />}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />

            {/* Minimal Header */}
            <SafeAreaView edges={['top']} style={styles.headerArea}>
                <View style={styles.headerRow}>
                    <TouchableOpacity style={styles.headerLeftBtn} onPress={() => navigation.navigate('Profile')}>
                        {user?.profile_picture_url ? (
                            <Image source={{ uri: resolveImageUrl(user.profile_picture_url) }} style={styles.myAvatar} />
                        ) : (
                            <View style={[styles.myAvatar, styles.avatarPlaceholder]}>
                                <User size={18} color="#999" />
                            </View>
                        )}
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Messages</Text>
                    <TouchableOpacity style={styles.headerRightBtn}>
                        <Ellipsis size={24} color="#111" />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <View style={styles.contentWrap}>
                {/* Search Bar */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBox}>
                        <Search size={20} color="#999" />
                        <TextInput
                            style={styles.searchField}
                            placeholder="Search messages..."
                            value={search}
                            onChangeText={setSearch}
                            placeholderTextColor="#999"
                        />
                        <TouchableOpacity>
                            <Mic size={20} color="#999" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Tabs */}
                <View style={styles.tabsContainer}>
                    {['All', 'Unread', 'Notifications'].map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tabChip, activeTab === tab && styles.tabChipActive]}
                            onPress={() => setActiveTab(tab)}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                            {tab === 'Notifications' && notifications.filter(n => !n.is_read).length > 0 && (
                                <View style={styles.tabRedDot} />
                            )}
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Online Users (Horizontal Scroll) - genuinely online contacts
                    only. This used to render the 8 most recent conversations
                    and give every one of them a green "online" dot. */}
                {activeTab === 'All' && onlineContacts.length > 0 && (
                    <View style={styles.onlineUsersSection}>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.onlineScrollContent}
                        >
                            {onlineContacts.slice(0, 8).map(renderOnlineUser)}
                        </ScrollView>
                    </View>
                )}

                {activeTab === 'Notifications' && notifications.length > 0 && (
                    <TouchableOpacity style={styles.markAll} onPress={handleMarkAllRead}>
                        <Check size={14} color="#111" />
                        <Text style={styles.markAllText}>Mark all as read</Text>
                    </TouchableOpacity>
                )}

                {loading ? (
                    <View style={styles.center}>
                        <PageLoader fullScreen={false} label="Loading conversations..." />
                    </View>
                ) : (
                    <FlatList
                        data={activeTab === 'Notifications' ? notifications : filteredConversations}
                        renderItem={activeTab === 'Notifications' ? renderNotification : renderConversation}
                        keyExtractor={item => (activeTab === 'Notifications' ? `notif-${item.id}` : `conv-${item.contact_id}`)}
                        contentContainerStyle={styles.listPadding}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyView}>
                                {activeTab === 'Notifications' ? <Bell size={60} color="#F3F4F6" /> : <MessageSquare size={60} color="#F3F4F6" />}
                                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                                <Text style={styles.emptySub}>Messages and alerts will show up here.</Text>
                            </View>
                        }
                        refreshing={refreshing}
                        onRefresh={loadData}
                    />
                )}
            </View>

            {/* Floating Chat Support Widget */}
            <TouchableOpacity 
                style={styles.floatingWidget} 
                onPress={() => navigation.navigate('SupportChat')}
                activeOpacity={0.8}
            >
                <Bot size={24} color="#FFF" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF' },
    headerArea: { backgroundColor: '#FFF' },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
    headerLeftBtn: { width: 40, height: 40, justifyContent: 'center' },
    myAvatar: { width: 36, height: 36, borderRadius: 18 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#111' },
    headerRightBtn: { width: 40, height: 40, alignItems: 'flex-end', justifyContent: 'center' },
    
    contentWrap: { flex: 1, backgroundColor: '#FFF' },
    
    searchContainer: { paddingHorizontal: 20, paddingVertical: 10 },
    searchBox: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB',
        borderRadius: 24, paddingHorizontal: 16, height: 48,
        borderWidth: 1, borderColor: '#F3F4F6'
    },
    searchField: { flex: 1, marginHorizontal: 12, fontSize: 15, color: '#111' },
    
    tabsContainer: { flexDirection: 'row', paddingHorizontal: 20, marginBottom: 15, gap: 10 },
    tabChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F9FAFB', flexDirection: 'row', alignItems: 'center' },
    tabChipActive: { backgroundColor: '#111' },
    tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
    tabTextActive: { color: '#FFF' },
    tabRedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444', marginLeft: 6 },
    
    onlineUsersSection: { marginBottom: 20 },
    onlineScrollContent: { paddingHorizontal: 20, gap: 20 },
    onlineUserBox: { alignItems: 'center', width: 60 },
    onlineAvatarWrap: { position: 'relative', marginBottom: 8 },
    onlineAvatar: { width: 56, height: 56, borderRadius: 28 },
    onlineDot: { 
        position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, 
        borderRadius: 7, backgroundColor: '#22C55E', borderWidth: 2, borderColor: '#FFF' 
    },
    onlineName: { fontSize: 12, color: '#111', fontWeight: '500' },
    
    avatarPlaceholder: { backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    
    markAll: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginRight: 20, marginBottom: 10, gap: 6 },
    markAllText: { fontSize: 13, fontWeight: '600', color: '#111' },
    
    listPadding: { paddingHorizontal: 20, paddingBottom: 40 },
    
    convCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16 },
    avatarWrapper: { marginRight: 16 },
    avatar: { width: 52, height: 52, borderRadius: 26 },
    convMain: { flex: 1 },
    convTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    contactName: { fontSize: 16, fontWeight: '600', color: '#111', flex: 1, paddingRight: 10 },
    nameUnread: { fontWeight: '800' },
    convTime: { fontSize: 12, color: '#999' },
    timeUnread: { color: '#111', fontWeight: '600' },
    convBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lastMsg: { fontSize: 14, color: '#666', flex: 1, paddingRight: 10 },
    msgUnread: { color: '#111', fontWeight: '600' },
    unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#111' },
    
    notifCard: { flexDirection: 'row', padding: 16, backgroundColor: '#FFF', marginBottom: 8, borderRadius: 16, borderWidth: 1, borderColor: '#F3F4F6' },
    notifIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    notifInfo: { flex: 1, marginLeft: 16 },
    notifTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    notifTitle: { fontSize: 15, fontWeight: '600', color: '#111', flex: 1 },
    notifTitleUnread: { fontWeight: '800' },
    notifTimeSmall: { fontSize: 12, color: '#999' },
    notifBody: { fontSize: 14, color: '#666', lineHeight: 20 },
    greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#111', marginLeft: 12, alignSelf: 'center' },
    
    emptyView: { alignItems: 'center', paddingVertical: 100 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#111', marginTop: 20 },
    emptySub: { fontSize: 15, color: '#999', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    
    floatingWidget: {
        position: 'absolute',
        bottom: 110,
        right: 20,
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#111',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
        zIndex: 100,
    }
});
