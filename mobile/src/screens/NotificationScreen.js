import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, SafeAreaView, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNotifications } from '../context/NotificationContext';
import { notificationsApi } from '../api/notifications';


// Simple relative time helper if date-fns is not installed
const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // seconds

    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

export default function NotificationScreen({ navigation }) {
    const { markAllRead } = useNotifications();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchNotifications = async () => {
        try {
            const data = await notificationsApi.getNotifications();
            // Sort by created_at desc if backend doesn't
            setNotifications(data.results || data);
        } catch (error) {
            console.error("Failed to load notifications", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications();
    };

    const handlePress = async (item) => {
        if (!item.is_read) {
            try {
                await notificationsApi.markAsRead(item.id);
                // Update local state
                setNotifications(prev => prev.map(n =>
                    n.id === item.id ? { ...n, is_read: true } : n
                ));
            } catch (e) {
                console.log("Error marking read", e);
            }
        }

        // Handle Deep Linking if data present
        if (item.data && item.data.screen) {
            navigation.navigate(item.data.screen, item.data.params);
        }
    };

    const handleMarkAllRead = async () => {
        await markAllRead();
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    };

    const renderItem = ({ item }) => {
        const isUrgent = item.urgency === 'URGENT';
        return (
            <TouchableOpacity
                style={[
                    styles.itemContainer,
                    !item.is_read && styles.unreadItem,
                    isUrgent && styles.urgentItem
                ]}
                onPress={() => handlePress(item)}
            >
                <View style={styles.iconContainer}>
                    {isUrgent ? (
                        <Ionicons name="alert-circle" size={24} color="#D32F2F" />
                    ) : (
                        <Ionicons name="notifications" size={24} color="#2E7D32" />
                    )}
                </View>
                <View style={styles.textContainer}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.title, !item.is_read && styles.unreadText]}>
                            {item.title}
                        </Text>
                        <Text style={styles.time}>{getRelativeTime(item.created_at)}</Text>
                    </View>
                    <Text style={styles.body} numberOfLines={2}>{item.body}</Text>
                </View>
                {!item.is_read && <View style={styles.dot} />}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                <TouchableOpacity onPress={handleMarkAllRead}>
                    <Text style={styles.markReadText}>Read All</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2E7D32" />
                </View>
            ) : (
                <FlatList
                    data={notifications}
                    renderItem={renderItem}
                    keyExtractor={item => item.id.toString()}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2E7D32']} />}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>No notifications yet</Text>
                        </View>
                    }
                    contentContainerStyle={notifications.length === 0 && styles.center}
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backBtn: { padding: 4 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    markReadText: { color: '#2E7D32', fontWeight: '600' },

    itemContainer: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
        alignItems: 'center'
    },
    unreadItem: { backgroundColor: '#F0F8F1' }, // Light green
    urgentItem: { backgroundColor: '#FFEBEE' }, // Light red

    iconContainer: { marginRight: 15 },
    textContainer: { flex: 1 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    title: { fontSize: 15, fontWeight: '600', color: '#333' },
    unreadText: { fontWeight: 'bold', color: '#000' },
    time: { fontSize: 12, color: '#999' },
    body: { fontSize: 14, color: '#666', lineHeight: 20 },
    dot: {
        width: 10, height: 10, borderRadius: 5, backgroundColor: '#2E7D32', marginLeft: 10
    },

    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40 },
    emptyText: { marginTop: 20, color: '#999', fontSize: 16 }
});
