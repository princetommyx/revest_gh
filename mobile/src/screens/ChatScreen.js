import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    TouchableOpacity, ActivityIndicator, Image, TextInput, Dimensions, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { chatApi } from '../api/chat';
import { MessageSquare, User, Clock, ChevronRight, Bot, Bell, AlertCircle, Check, Search, Filter } from 'lucide-react-native';
import Toast from 'react-native-root-toast';
import { BASE_URL } from '../api/client';
import { notificationsApi } from '../api/notifications';
import { useNotifications } from '../context/NotificationContext';

const { width } = Dimensions.get('window');

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
            Toast.show("All marked as read", { backgroundColor: '#2E7D32' });
        } catch (e) { console.log(e); }
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
                        <View style={styles.avatarPlaceholder}>
                            <User size={24} color="#9BAA9B" />
                        </View>
                    )}
                    {item.unread_count > 0 && <View style={styles.unreadPulse} />}
                </View>
                <View style={styles.convMain}>
                    <View style={styles.convTop}>
                        <Text style={[styles.contactName, item.unread_count > 0 && styles.nameUnread]} numberOfLines={1}>
                            {item.contact_username}
                        </Text>
                        <Text style={styles.convTime}>{formatSmartTime(item.timestamp)}</Text>
                    </View>
                    <View style={styles.convBottom}>
                        <Text style={[styles.lastMsg, item.unread_count > 0 && styles.msgUnread]} numberOfLines={1}>
                            {item.last_message || 'Tap to chat'}
                        </Text>
                        {item.unread_count > 0 && (
                            <View style={styles.countBadge}>
                                <Text style={styles.countText}>{item.unread_count}</Text>
                            </View>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderNotification = ({ item }) => (
        <TouchableOpacity style={[styles.notifCard, !item.is_read && styles.notifUnread]} activeOpacity={0.7}>
            <View style={[styles.notifIcon, { backgroundColor: item.urgency === 'URGENT' ? '#FEF2F2' : '#F0F7F4' }]}>
                {item.urgency === 'URGENT' ? <AlertCircle size={20} color="#EF4444" /> : <Bell size={20} color="#2E7D32" />}
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
            <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />

            {/* Organic Curved Header */}
            <View style={styles.headerBackground}>
                <View style={styles.curvedShape} />
                <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerContent}>
                    <View style={styles.headerRow}>
                        <Text style={styles.headerTitle}>Messages</Text>
                        <TouchableOpacity style={styles.headerIcon}>
                            <Bell size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.headerSubtitle}>Connect with Sellers & Recyclers</Text>
                </SafeAreaView>
            </View>

            {/* Content Overlap */}
            <View style={styles.contentWrap}>
                {/* Search & Tabs */}
                <View style={styles.stickyBar}>
                    <View style={styles.searchBox}>
                        <Search size={18} color="#999" />
                        <TextInput
                            style={styles.searchField}
                            placeholder="Find chats..."
                            value={search}
                            onChangeText={setSearch}
                            placeholderTextColor="#999"
                        />
                        <TouchableOpacity>
                            <Filter size={18} color="#2E7D32" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.tabsRow}>
                        {['All', 'Unread', 'Notifications'].map(tab => (
                            <TouchableOpacity
                                key={tab}
                                style={[styles.tabChip, activeTab === tab && styles.tabChipActive]}
                                onPress={() => setActiveTab(tab)}
                            >
                                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
                                {tab === 'Notifications' && notifications.filter(n => !n.is_read).length > 0 && (
                                    <View style={styles.dot} />
                                )}
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {activeTab === 'Notifications' && notifications.length > 0 && (
                    <TouchableOpacity style={styles.markAll} onPress={handleMarkAllRead}>
                        <Check size={14} color="#2E7D32" />
                        <Text style={styles.markAllText}>Mark all as read</Text>
                    </TouchableOpacity>
                )}

                {loading ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color="#2E7D32" />
                    </View>
                ) : (
                    <FlatList
                        data={activeTab === 'Notifications' ? notifications : filteredConversations}
                        renderItem={activeTab === 'Notifications' ? renderNotification : renderConversation}
                        keyExtractor={item => (activeTab === 'Notifications' ? `notif-${item.id}` : `conv-${item.contact_id}`)}
                        contentContainerStyle={styles.listPadding}
                        showsVerticalScrollIndicator={false}
                        ListHeaderComponent={activeTab !== 'Notifications' && (
                            <TouchableOpacity style={styles.aiBanner} onPress={() => navigation.navigate('SupportChat')}>
                                <View style={styles.aiBotIcon}>
                                    <Bot size={22} color="#fff" />
                                </View>
                                <View style={styles.aiText}>
                                    <Text style={styles.aiLabel}>Revesta AI Assistant</Text>
                                    <Text style={styles.aiCap}>Ask questions about recycling</Text>
                                </View>
                                <ChevronRight size={18} color="#A5D6A7" />
                            </TouchableOpacity>
                        )}
                        ListEmptyComponent={
                            <View style={styles.emptyView}>
                                {activeTab === 'Notifications' ? <Bell size={60} color="#E8F5E9" /> : <MessageSquare size={60} color="#E8F5E9" />}
                                <Text style={styles.emptyTitle}>Nothing here yet</Text>
                                <Text style={styles.emptySub}>Messages and alerts will show up here.</Text>
                            </View>
                        }
                        refreshing={refreshing}
                        onRefresh={loadData}
                    />
                )}
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
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
    headerTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff' },
    headerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 5 },
    contentWrap: { flex: 1, marginTop: -35, backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35 },
    stickyBar: { paddingHorizontal: 25, paddingTop: 25, backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35 },
    searchBox: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6',
        borderRadius: 18, paddingHorizontal: 15, height: 52, marginBottom: 20
    },
    searchField: { flex: 1, marginLeft: 10, fontSize: 14, color: '#333' },
    tabsRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
    tabChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F9FAFB', flexDirection: 'row', alignItems: 'center', gap: 6 },
    tabChipActive: { backgroundColor: '#2E7D32' },
    tabText: { fontSize: 13, fontWeight: '600', color: '#6B7280' },
    tabTextActive: { color: '#fff' },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
    markAll: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end', marginRight: 25, marginBottom: 10, gap: 5 },
    markAllText: { fontSize: 12, fontWeight: '700', color: '#2E7D32' },
    listPadding: { paddingHorizontal: 25, paddingBottom: 40 },
    aiBanner: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#1B5E20',
        padding: 16, borderRadius: 24, marginBottom: 20
    },
    aiBotIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    aiText: { flex: 1, marginLeft: 12 },
    aiLabel: { fontSize: 15, fontWeight: 'bold', color: '#fff' },
    aiCap: { fontSize: 12, color: '#A5D6A7' },
    convCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    avatarWrapper: { position: 'relative' },
    avatar: { width: 56, height: 56, borderRadius: 28 },
    avatarPlaceholder: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#F0F7F4', justifyContent: 'center', alignItems: 'center' },
    unreadPulse: { position: 'absolute', top: 0, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#2E7D32', borderWidth: 2, borderColor: '#fff' },
    convMain: { flex: 1, marginLeft: 16 },
    convTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    contactName: { fontSize: 16, fontWeight: '700', color: '#1A1A1A' },
    nameUnread: { color: '#000' },
    convTime: { fontSize: 12, color: '#9CA3AF' },
    convBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    lastMsg: { fontSize: 14, color: '#6B7280', flex: 1 },
    msgUnread: { color: '#1F2937', fontWeight: 'bold' },
    countBadge: { backgroundColor: '#2E7D32', minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 6, justifyContent: 'center', alignItems: 'center' },
    countText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
    notifCard: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 20, backgroundColor: '#fff', marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
    notifUnread: { backgroundColor: '#F9FAFB' },
    notifIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    notifInfo: { flex: 1, marginLeft: 14 },
    notifTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    notifTitle: { fontSize: 15, fontWeight: 'bold', color: '#1F2937' },
    notifTitleUnread: { color: '#000' },
    notifTimeSmall: { fontSize: 11, color: '#9CA3AF' },
    notifBody: { fontSize: 13, color: '#6B7280', lineHeight: 18 },
    greenDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#2E7D32', marginLeft: 10 },
    emptyView: { alignItems: 'center', paddingVertical: 100 },
    emptyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1F2937', marginTop: 15 },
    emptySub: { fontSize: 14, color: '#9CA3AF', marginTop: 8, textAlign: 'center', paddingHorizontal: 50 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
