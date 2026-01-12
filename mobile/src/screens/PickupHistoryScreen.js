import React, { useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator, ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, User, Clock, TrendingUp } from 'lucide-react-native';
import { usePickupHistory } from '../hooks/usePickupHistory';
import { useNavigation } from '@react-navigation/native';

const STATUS_CONFIG = {
    PENDING: { color: '#F59E0B', label: 'Pending', bg: '#FEF3C7' },
    ACCEPTED: { color: '#3B82F6', label: 'Accepted', bg: '#DBEAFE' },
    ARRIVED: { color: '#8B5CF6', label: 'Arrived', bg: '#EDE9FE' },
    COMPLETED: { color: '#10B981', label: 'Completed', bg: '#D1FAE5' },
    CANCELLED: { color: '#EF4444', label: 'Cancelled', bg: '#FEE2E2' },
};

const FILTER_OPTIONS = ['ALL', 'PENDING', 'COMPLETED', 'CANCELLED'];

export default function PickupHistoryScreen() {
    const navigation = useNavigation();
    const [activeFilter, setActiveFilter] = useState('ALL');
    const { data: pickups, isLoading, refetch, isRefetching } = usePickupHistory(activeFilter);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const renderPickupCard = ({ item }) => {
        const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;

        return (
            <TouchableOpacity
                style={styles.card}
                onPress={() => {
                    // Navigate to pickup detail - reusing PickupsScreen logic
                    // You could create a dedicated detail screen later
                }}
            >
                <View style={styles.cardHeader}>
                    <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                        <Text style={[styles.statusText, { color: statusInfo.color }]}>
                            {statusInfo.label}
                        </Text>
                    </View>
                    <Text style={styles.dateText}>{formatDate(item.created_at)}</Text>
                </View>

                <View style={styles.locationRow}>
                    <MapPin size={16} color="#666" />
                    <Text style={styles.locationText} numberOfLines={1}>
                        {item.pickup_location}
                    </Text>
                </View>

                {item.collector && (
                    <View style={styles.collectorRow}>
                        <User size={16} color="#666" />
                        <Text style={styles.collectorText}>
                            Collector: {item.collector_name || 'Assigned'}
                        </Text>
                    </View>
                )}

                {item.status === 'CANCELLED' && item.cancel_reason && (
                    <View style={styles.cancelReasonRow}>
                        <Text style={styles.cancelReasonLabel}>Reason:</Text>
                        <Text style={styles.cancelReasonText}>{item.cancel_reason.replace(/_/g, ' ')}</Text>
                    </View>
                )}

                <View style={styles.footer}>
                    <View style={styles.priceRow}>
                        <TrendingUp size={16} color="#2E7D32" />
                        <Text style={styles.priceText}>GHS {parseFloat(item.price || 0).toFixed(2)}</Text>
                    </View>
                    {item.scheduled_time && (
                        <View style={styles.timeRow}>
                            <Clock size={14} color="#999" />
                            <Text style={styles.timeText}>
                                {new Date(item.scheduled_time).toLocaleTimeString('en-US', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <MapPin size={64} color="#DDD" />
            <Text style={styles.emptyTitle}>No Pickups Yet</Text>
            <Text style={styles.emptyText}>
                {activeFilter === 'ALL'
                    ? 'Your pickup requests will appear here'
                    : `No ${activeFilter.toLowerCase()} pickups found`
                }
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Pickup History</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.filterWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterContent}
                >
                    {FILTER_OPTIONS.map(filter => (
                        <TouchableOpacity
                            key={filter}
                            style={[
                                styles.filterChip,
                                activeFilter === filter && styles.filterChipActive
                            ]}
                            onPress={() => setActiveFilter(filter)}
                        >
                            <Text style={[
                                styles.filterText,
                                activeFilter === filter && styles.filterTextActive
                            ]}>
                                {filter}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2E7D32" />
                </View>
            ) : (
                <FlatList
                    data={pickups || []}
                    renderItem={renderPickupCard}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={renderEmpty}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={refetch}
                            tintColor="#2E7D32"
                        />
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F9FAFB'
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f1f1',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1a1a1a'
    },
    backBtn: {
        padding: 5
    },
    filterWrapper: {
        backgroundColor: '#fff',
        paddingVertical: 12,
    },
    filterContent: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 10,
        alignItems: 'center',
    },
    filterChip: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 25,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    filterChipActive: {
        backgroundColor: '#2E7D32',
        borderColor: '#2E7D32',
    },
    filterText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '500',
    },
    filterTextActive: {
        color: '#fff',
        fontWeight: 'bold',
    },
    listContent: {
        padding: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    dateText: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    locationText: {
        fontSize: 14,
        color: '#374151',
        flex: 1,
    },
    collectorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    collectorText: {
        fontSize: 13,
        color: '#6B7280',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    priceText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2E7D32',
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeText: {
        fontSize: 12,
        color: '#9CA3AF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#374151',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
    },
    cancelReasonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 12,
        backgroundColor: '#FEE2E2',
        padding: 8,
        borderRadius: 8,
    },
    cancelReasonLabel: {
        fontSize: 12,
        color: '#EF4444',
        fontWeight: '600',
    },
    cancelReasonText: {
        fontSize: 12,
        color: '#991B1B',
        textTransform: 'capitalize',
    },
});
