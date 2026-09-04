import React, { useState, useMemo } from 'react';
import {
    View, Text, StyleSheet, SectionList, TouchableOpacity,
    RefreshControl, ScrollView, StatusBar
} from 'react-native';
import { Image } from 'expo-image';
import { Activity } from 'lucide-react-native';
import { usePickupHistory } from '../hooks/usePickupHistory';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import PageLoader from '../components/PageLoader';
import ScreenHeader from '../components/ScreenHeader';
import { getMaterialImage } from './HomeScreen';
import { MATERIAL_PLACEHOLDER, IMAGE_TRANSITION_MS } from '../constants/images';
import { useTheme, makeStyles } from '../theme/ThemeContext';

const STATUS_CONFIG = {
    // Token names, not hex - this map is module scope, where the theme isn't
    // available. Resolved against the palette at render time.
    PENDING: { tone: 'warning', label: 'Pending' },
    ACCEPTED: { tone: 'info', label: 'Accepted' },
    ARRIVED: { tone: 'info', label: 'Collector arrived' },
    COMPLETED: { tone: 'accent', label: 'Completed' },
    CANCELLED: { tone: 'danger', label: 'Cancelled' },
};

const FILTER_OPTIONS = ['ALL', 'PENDING', 'COMPLETED', 'CANCELLED'];

/**
 * The headline amount for a job.
 *
 * Track A is pay-to-clear, so the money is what the pickup cost. Track B is
 * sell-recyclables, so it's what the waste was worth. Reading waste_price for
 * everything - as this screen used to - showed every disposal as GH₵0.00.
 *
 * Deliberately not the collector's take-home: that nets off commission, and
 * the authoritative record for it is the wallet's transaction list.
 */
const jobAmount = (item) => {
    if (item.track_type === 'A') {
        return parseFloat(item.actual_price ?? item.estimated_price ?? 0);
    }
    return parseFloat(item.waste_price ?? 0);
};

const TRACK_LABEL = { A: 'Disposal', B: 'Recyclables', C: 'Purchase' };

export default function PickupHistoryScreen() {
    const styles = useStyles();
    const { colors, isDark } = useTheme();
    const navigation = useNavigation();
    const { userRole } = useAuth();
    const [activeFilter, setActiveFilter] = useState('ALL');
    const { data: pickups, isLoading, refetch, isRefetching } = usePickupHistory(activeFilter);

    const isCollectorSide = userRole === 'COLLECTOR' || userRole === 'RECYCLER';

    // Group into months, the way a statement reads.
    const sections = useMemo(() => {
        const buckets = new Map();
        const now = new Date();

        for (const item of pickups || []) {
            const d = new Date(item.created_at);
            if (isNaN(d)) continue;
            const key = `${d.getFullYear()}-${d.getMonth()}`;
            if (!buckets.has(key)) {
                buckets.set(key, {
                    title: d.toLocaleDateString('en-GB', {
                        month: 'long',
                        // Only spell out the year once it stops being obvious.
                        ...(d.getFullYear() === now.getFullYear() ? {} : { year: 'numeric' }),
                    }),
                    sortKey: d.getFullYear() * 12 + d.getMonth(),
                    data: [],
                });
            }
            buckets.get(key).data.push(item);
        }

        return [...buckets.values()].sort((a, b) => b.sortKey - a.sortKey);
    }, [pickups]);

    const renderRow = ({ item }) => {
        const status = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;
        const amount = jobAmount(item);
        const when = new Date(item.created_at);
        const stamp = isNaN(when)
            ? ''
            : when.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              + ', ' + when.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const other = isCollectorSide ? item.provider_name : item.collector_name;

        return (
            <TouchableOpacity style={styles.row} activeOpacity={0.7}>
                <Image
                    source={{ uri: item.listing_image || getMaterialImage(item.material_type) }}
                    style={styles.thumb}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    placeholder={MATERIAL_PLACEHOLDER}
                    transition={IMAGE_TRANSITION_MS}
                />

                <View style={styles.rowMain}>
                    <Text style={styles.address} numberOfLines={2}>
                        {item.pickup_address || item.material_type || 'Waste pickup'}
                    </Text>
                    <Text style={styles.subline} numberOfLines={1}>
                        {stamp}
                        {item.status !== 'COMPLETED' && (
                            <Text style={{ color: colors[status.tone] || colors.textSecondary }}> · {status.label}</Text>
                        )}
                        {!!other && item.status === 'COMPLETED' && ` · ${other}`}
                    </Text>
                </View>

                <View style={styles.rowRight}>
                    {/* Track A is paid directly to the collector, not through the
                        app - showing "₵0.00" here would read as "this was free". */}
                    {item.track_type === 'A' ? (
                        <Text style={styles.directPayLabel}>Direct pay</Text>
                    ) : (
                        <Text style={styles.amount}>₵{amount.toFixed(2)}</Text>
                    )}
                    <Text style={styles.track}>{TRACK_LABEL[item.track_type] || ''}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
                <Activity size={36} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>Nothing here yet</Text>
            <Text style={styles.emptyText}>
                {activeFilter === 'ALL'
                    ? (isCollectorSide
                        ? 'Jobs you take on will be listed here once they wrap up.'
                        : 'Pickups you request will be listed here.')
                    : `No ${activeFilter.toLowerCase()} pickups.`}
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

            <ScreenHeader title="Pickup History" onBack={() => navigation.goBack()} />

            <View style={styles.filterSection}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterContent}>
                    {FILTER_OPTIONS.map(filter => (
                        <TouchableOpacity
                            key={filter}
                            style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                            onPress={() => setActiveFilter(filter)}
                        >
                            <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                                {filter === 'ALL' ? 'All' : STATUS_CONFIG[filter]?.label || filter}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {isLoading ? (
                <PageLoader label="Loading your history..." />
            ) : (
                <SectionList
                    sections={sections}
                    keyExtractor={(item) => item.id.toString()}
                    renderItem={renderRow}
                    renderSectionHeader={({ section }) => (
                        <Text style={styles.sectionHeader}>{section.title}</Text>
                    )}
                    stickySectionHeadersEnabled={false}
                    contentContainerStyle={[styles.listContent, sections.length === 0 && { flexGrow: 1 }]}
                    ListEmptyComponent={renderEmpty}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.text} />
                    }
                />
            )}
        </View>
    );
}

const useStyles = makeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.surface },

    filterSection: { paddingTop: 16, paddingBottom: 4 },
    filterContent: { paddingHorizontal: 20, gap: 8 },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: c.surfaceSunken,
    },
    filterChipActive: { backgroundColor: c.primary },
    filterText: { fontSize: 13, color: c.textSecondary, fontWeight: '600' },
    filterTextActive: { color: c.onPrimary },

    listContent: { paddingHorizontal: 20, paddingBottom: 60 },

    sectionHeader: {
        fontSize: 20,
        fontWeight: '700',
        color: c.text,
        letterSpacing: -0.3,
        marginTop: 26,
        marginBottom: 6,
    },

    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 14,
    },
    thumb: {
        width: 56,
        height: 56,
        borderRadius: 14,
        backgroundColor: c.surfaceSunken,
    },
    rowMain: { flex: 1 },
    address: {
        fontSize: 15,
        color: c.text,
        fontWeight: '500',
        lineHeight: 20,
        marginBottom: 3,
    },
    subline: { fontSize: 13, color: c.textMuted },
    rowRight: { alignItems: 'flex-end' },
    amount: {
        fontSize: 15,
        fontWeight: '700',
        color: c.text,
        fontVariant: ['tabular-nums'],
    },
    directPayLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: c.textMuted,
    },
    track: { fontSize: 11, color: c.textMuted, marginTop: 2 },

    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 60,
    },
    emptyIconCircle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: c.surfaceAlt,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 18,
    },
    emptyTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: c.text,
        marginBottom: 6,
    },
    emptyText: {
        fontSize: 13.5,
        color: c.textMuted,
        textAlign: 'center',
        paddingHorizontal: 50,
        lineHeight: 19,
    },
}));
