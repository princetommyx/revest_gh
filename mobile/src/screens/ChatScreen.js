import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList,
    TouchableOpacity, ActivityIndicator, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { chatApi } from '../api/chat';
import { MessageSquare, User, Clock, ChevronRight, Bot } from 'lucide-react-native';
import Toast from 'react-native-root-toast';

export default function ChatScreen() {
    const navigation = useNavigation();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchConversations = async () => {
        try {
            const data = await chatApi.getConversations();
            setConversations(data);
        } catch (error) {
            console.error("Conversations Load Error:", error);
            Toast.show("Failed to load conversations", { backgroundColor: '#E74C3C' });
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchConversations();
        }, [])
    );

    const renderConversation = ({ item }) => (
        <TouchableOpacity
            style={styles.convCard}
            onPress={() => navigation.navigate('ChatDetail', {
                contactId: item.contact_id,
                contactName: item.contact_username
            })}
        >
            <View style={styles.avatarBox}>
                <User size={24} color="#2E7D32" />
                {item.unread_count > 0 && (
                    <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{item.unread_count}</Text>
                    </View>
                )}
            </View>
            <View style={styles.convInfo}>
                <View style={styles.convHeader}>
                    <Text style={styles.contactName}>{item.contact_username}</Text>
                    <Text style={styles.convTime}>
                        {item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </Text>
                </View>
                <Text style={styles.lastMsg} numberOfLines={1}>
                    {item.last_message || 'Start a conversation...'}
                </Text>
            </View>
            <ChevronRight size={20} color="#ccc" />
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2E7D32" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Messages</Text>
            </View>

            <FlatList
                data={conversations}
                renderItem={renderConversation}
                keyExtractor={item => item.contact_id.toString()}
                contentContainerStyle={styles.list}
                ListHeaderComponent={
                    <TouchableOpacity
                        style={styles.aiSupportCard}
                        onPress={() => navigation.navigate('SupportChat')}
                    >
                        <View style={styles.aiIconBox}>
                            <Bot size={24} color="#fff" />
                        </View>
                        <View style={styles.aiInfo}>
                            <Text style={styles.aiTitle}>ReVesta AI Support</Text>
                            <Text style={styles.aiSubtitle}>Get instant help with your orders</Text>
                        </View>
                        <ChevronRight size={20} color="#2E7D32" />
                    </TouchableOpacity>
                }
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <MessageSquare size={60} color="#eee" />
                        <Text style={styles.emptyText}>No messages yet</Text>
                        <Text style={styles.emptySub}>Connect with buyers and sellers in the marketplace</Text>
                    </View>
                }
                onRefresh={fetchConversations}
                refreshing={loading}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f1f1f1' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { paddingHorizontal: 15, paddingVertical: 10 },
    convCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f9f9f9'
    },
    avatarBox: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center'
    },
    unreadBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#E74C3C',
        width: 18,
        height: 18,
        borderRadius: 9,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff'
    },
    unreadText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
    convInfo: { flex: 1, marginLeft: 15, marginRight: 10 },
    convHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    contactName: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
    convTime: { fontSize: 12, color: '#999' },
    lastMsg: { fontSize: 14, color: '#666' },
    emptyBox: { flex: 1, alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
    emptyText: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 20 },
    emptySub: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 10 },

    // AI Support Styles
    aiSupportCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#E8F5E9', padding: 15, borderRadius: 12,
        marginBottom: 15, borderWidth: 1, borderColor: '#C8E6C9'
    },
    aiIconBox: {
        width: 40, height: 40, borderRadius: 20, backgroundColor: '#2E7D32',
        justifyContent: 'center', alignItems: 'center', marginRight: 15
    },
    aiInfo: { flex: 1 },
    aiTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 2 },
    aiSubtitle: { fontSize: 13, color: '#2E7D32' },
});
