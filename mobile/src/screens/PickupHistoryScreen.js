import React, { useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ScrollView, Dimensions, StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, MapPin, User, Clock, TrendingUp, ChevronRight, Activity, Calendar } from 'lucide-react-native';
import { usePickupHistory } from '../hooks/usePickupHistory';
import { useNavigation } from '@react-navigation/native';
import PageLoader from '../components/PageLoader';

const { width } = Dimensions.get('window');

const STATUS_CONFIG = {
    PENDING: { color: '#F59E0B', label: 'Pending', bg: '#FFFBEB' },
    ACCEPTED: { color: '#3B82F6', label: 'Accepted', bg: '#EFF6FF' },
    ARRIVED: { color: '#8B5CF6', label: 'Arrived', bg: '#F5F3FF' },
    COMPLETED: { color: '#10B981', label: 'Completed', bg: '#ECFDF5' },
    CANCELLED: { color: '#EF4444', label: 'Cancelled', bg: '#FEF2F2' },
};

const FILTER_OPTIONS = ['ALL', 'PENDING', 'COMPLETED', 'CANCELLED'];

export default function PickupHistoryScreen() {
    const navigation = useNavigation();
    const [activeFilter, setActiveFilter] = useState('ALL');
    const { data: pickups, isLoading, refetch, isRefetching } = usePickupHistory(activeFilter);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const renderPickupCard = ({ item }) => {
        const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;

        return (
            <TouchableOpacity style={styles.card} activeOpacity={0.7}>
                <View style={styles.cardMain}>
                    <View style={styles.cardLeft}>
                        <View style={[styles.statusIndicator, { backgroundColor: statusInfo.color }]} />
                        <View style={styles.infoCol}>
                            <Text style={styles.materialText}>{item.material_type || 'Waste Pickup'}</Text>
                            <View style={styles.locationRow}>
                                <MapPin size={12} color="#999" />
                                <Text style={styles.locationText} numberOfLines={1}>{item.pickup_address}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.cardRight}>
                        <Text style={styles.priceText}>₵{parseFloat(item.waste_price || 0).toFixed(2)}</Text>
                        <View style={[styles.badge, { backgroundColor: statusInfo.bg }]}>
                            <Text style={[styles.badgeText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <View style={styles.footerItem}>
                        <Calendar size={12} color="#999" />
                        <Text style={styles.footerText}>{formatDate(item.created_at)}</Text>
                    </View>
                    {item.collector_name && (
                        <View style={styles.footerItem}>
                            <User size={12} color="#999" />
                            <Text style={styles.footerText}>{item.collector_name}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
                <Activity size={40} color="#111" />
            </View>
            <Text style={styles.emptyTitle}>No Activity Yet</Text>
            <Text style={styles.emptyText}>
                Your {activeFilter !== 'ALL' ? activeFilter.toLowerCase() : ''} pickup history will appear here.
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#111" />

            {/* Organic Curved Header */}
            <View style={styles.headerBackground}>
                <View style={styles.curvedShape} />
                <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerContent}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ArrowLeft size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Pickup History</Text>
                        <View style={{ width: 40 }} />
                    </View>
                </SafeAreaView>
            </View>

            {/* Overlapping Filter & List Container */}
            <View style={styles.contentContainer}>
                <View style={styles.filterSection}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
                        {FILTER_OPTIONS.map(filter => (
                            <TouchableOpacity
                                key={filter}
                                style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                                onPress={() => setActiveFilter(filter)}
                            >
                                <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                                    {filter}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {isLoading ? (
                    <View style={styles.center}>
                        <PageLoader fullScreen={false} label="Loading your history..." />
                    </View>
                ) : (
                    <FlatList
                        data={pickups || []}
                        renderItem={renderPickupCard}
                        keyExtractor={(item) => item.id.toString()}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={renderEmpty}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={isRefetching}
                                onRefresh={refetch}
                                tintColor="#111"
                            />
                        }
                    />
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    headerBackground: {
        height: 180,
        backgroundColor: '#111',
        position: 'relative',
        overflow: 'hidden',
    },
    curvedShape: {
        position: 'absolute',
        bottom: -80,
        left: -width * 0.25,
        width: width * 1.5,
        height: width * 1.5,
        borderRadius: width * 0.75,
        backgroundColor: '#222',
        opacity: 0.3,
    },
    headerContent: {
        paddingHorizontal: 25,
        paddingTop: 10,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
    },
    contentContainer: {
        flex: 1,
        marginTop: -30,
        backgroundColor: '#fff',
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        paddingTop: 25,
    },
    filterSection: {
        marginBottom: 15,
    },
    filterContent: {
        paddingHorizontal: 25,
        gap: 12,
    },
    filterChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 15,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    filterChipActive: {
        backgroundColor: '#111',
        borderColor: '#111',
        shadowColor: '#111',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    filterText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
    },
    filterTextActive: {
        color: '#fff',
    },
    listContent: {
        paddingHorizontal: 25,
        paddingBottom: 40,
        paddingTop: 10,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    cardMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    statusIndicator: {
        width: 4,
        height: 40,
        borderRadius: 2,
        marginRight: 12,
    },
    infoCol: {
        flex: 1,
    },
    materialText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationText: {
        fontSize: 13,
        color: '#999',
    },
    cardRight: {
        alignItems: 'flex-end',
    },
    priceText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 6,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    cardFooter: {
        flexDirection: 'row',
        marginTop: 15,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#F9FAFB',
        gap: 15,
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    footerText: {
        fontSize: 12,
        color: '#999',
        fontWeight: '500',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 80,
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FAFAFA',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 14,
        color: '#9CA3AF',
        textAlign: 'center',
        paddingHorizontal: 40,
        lineHeight: 20,
    },
});
