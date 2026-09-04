import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    StatusBar, RefreshControl, Image, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { ArrowLeft, Ban, User } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { moderationApi } from '../api/moderation';
import { BASE_URL } from '../api/client';
import PageLoader from '../components/PageLoader';

const resolveImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    let cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (!cleanPath.startsWith('/media/')) cleanPath = `/media${cleanPath}`;
    return `${BASE_URL}${cleanPath}`;
};

const displayName = (u) =>
    [u?.first_name, u?.last_name].filter(Boolean).join(' ') || u?.username || 'User';

export default function BlockedUsersScreen({ navigation }) {
    const [blocked, setBlocked] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [unblockingId, setUnblockingId] = useState(null);

    const fetchBlocked = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        try {
            setBlocked(await moderationApi.getBlockedUsers());
        } catch (error) {
            console.error('Blocked users load error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useFocusEffect(useCallback(() => { fetchBlocked(); }, [fetchBlocked]));

    const confirmUnblock = (entry) => {
        const name = displayName(entry.user);
        Alert.alert(
            `Unblock ${name}?`,
            'They will be able to message you again, and their listings will reappear.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Unblock',
                    onPress: async () => {
                        setUnblockingId(entry.id);
                        try {
                            await moderationApi.unblockUser(entry.user.id);
                            setBlocked(prev => prev.filter(b => b.id !== entry.id));
                            Toast.show({ type: 'success', text1: `${name} unblocked` });
                        } catch (error) {
                            Toast.show({ type: 'error', text1: 'Could not unblock', text2: 'Please try again.' });
                        } finally {
                            setUnblockingId(null);
                        }
                    },
                },
            ]
        );
    };

    const renderRow = ({ item }) => {
        const avatar = resolveImageUrl(item.user?.profile_picture_url);
        const busy = unblockingId === item.id;
        return (
            <View style={styles.row}>
                {avatar ? (
                    <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <User size={20} color="#9CA3AF" />
                    </View>
                )}
                <View style={{ flex: 1 }}>
                    <Text style={styles.name} numberOfLines={1}>{displayName(item.user)}</Text>
                    <Text style={styles.role}>{item.user?.role || 'User'}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.unblockBtn, busy && { opacity: 0.5 }]}
                    onPress={() => confirmUnblock(item)}
                    disabled={busy}
                >
                    {busy
                        ? <ActivityIndicator size="small" color="#111" />
                        : <Text style={styles.unblockBtnText}>Unblock</Text>}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <SafeAreaView edges={['top']} style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <ArrowLeft size={22} color="#111" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Blocked Accounts</Text>
                <View style={{ width: 40 }} />
            </SafeAreaView>

            {loading ? (
                <PageLoader label="Loading blocked accounts..." />
            ) : (
                <FlatList
                    data={blocked}
                    keyExtractor={(item, index) => (item.id ?? index).toString()}
                    renderItem={renderRow}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => fetchBlocked(true)} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyBox}>
                            <Ban size={44} color="#D1D5DB" />
                            <Text style={styles.emptyTitle}>No blocked accounts</Text>
                            <Text style={styles.emptyText}>
                                People you block won't be able to message you, and their listings and
                                pickup requests stay hidden from you.
                            </Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAFAFA' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    backBtn: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#F3F4F6',
        alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
    listContent: { padding: 20, flexGrow: 1 },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6' },
    avatarPlaceholder: {
        width: 44, height: 44, borderRadius: 22, backgroundColor: '#F3F4F6',
        alignItems: 'center', justifyContent: 'center',
    },
    name: { fontSize: 15, fontWeight: '700', color: '#111' },
    role: { fontSize: 12, color: '#9CA3AF', marginTop: 2 },
    unblockBtn: {
        paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
        backgroundColor: '#F3F4F6', minWidth: 84, alignItems: 'center',
    },
    unblockBtnText: { fontSize: 13, fontWeight: '700', color: '#111' },
    emptyBox: { alignItems: 'center', justifyContent: 'center', marginTop: 90, paddingHorizontal: 30 },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111', marginTop: 16, marginBottom: 6 },
    emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', lineHeight: 19 },
});
