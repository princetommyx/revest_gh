import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Animated, Dimensions } from 'react-native';
import { Phone, MessageCircle, Clock, Package, User } from 'lucide-react-native';
import PickupProgressRoadmap from './PickupProgressRoadmap';
import { ROADMAP_STEPS } from './ActiveJobBottomSheet';
import { BASE_URL } from '../api/client';
import { useTheme, makeStyles } from '../theme/ThemeContext';

// Same cap/scroll approach as ActiveJobBottomSheet - without it a long card
// (roadmap + route + material line) can push the collector's name off the
// top edge on a shorter screen.
const CARD_MAX_HEIGHT = Dimensions.get('window').height * 0.74;

const resolveImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    let cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (!cleanPath.startsWith('/media/')) cleanPath = `/media${cleanPath}`;
    return `${BASE_URL}${cleanPath}`;
};

const jobRef = (id) => `#PU-${String(id).padStart(4, '0')}`;

const formatDate = (value) => {
    const d = new Date(value);
    if (isNaN(d)) return '';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export default function CollectorBottomSheet({ collector, job, onChatPress, onCallPress, onCancel }) {
    const styles = useStyles();
    const { colors } = useTheme();
    const entrance = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(entrance, {
            toValue: 1,
            friction: 7,
            tension: 50,
            useNativeDriver: true,
        }).start();
    }, []);

    if (!collector || !job) return null;

    const avatarUrl = resolveImageUrl(collector.profile_picture_url);
    const collectorName = [collector.first_name, collector.last_name].filter(Boolean).join(' ') || collector.username || 'Collector';
    const hasDropoff = !!job.destination_address;

    // Same real milestones as the collector's own sheet (ActiveJobBottomSheet) -
    // no invented "Transport" / "Processing" stages that don't map to an
    // actual PickupRequest status.
    const getStatusIndex = () => {
        if (job.status === 'COMPLETED') return 3;
        if (job.status === 'ARRIVED') return 2;
        if (job.status === 'ACCEPTED' || job.status === 'EN_ROUTE') return 1;
        return 0;
    };
    const currentStep = getStatusIndex();
    const canCancel = currentStep < 2; // Not sensible to cancel once the collector has arrived.

    return (
        <Animated.View style={[styles.container, {
            opacity: entrance,
            transform: [{
                translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [24, 0] })
            }]
        }]}>
            <ScrollView showsVerticalScrollIndicator={false} bounces={false} contentContainerStyle={{ paddingBottom: 4 }}>
                {/* Header: Collector Info & Quick Actions - mirrors ActiveJobBottomSheet
                    so both sides of a job get the same quality of "who's on the other
                    end and how do I reach them" experience. */}
                <View style={styles.header}>
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <User size={24} color={colors.textMuted} />
                        </View>
                    )}
                    <View style={styles.collectorInfo}>
                        <Text style={styles.name} numberOfLines={1}>{collectorName}</Text>
                        <View style={styles.rolePill}>
                            <Text style={styles.rolePillText}>COLLECTOR</Text>
                        </View>
                    </View>
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={onChatPress}>
                            <MessageCircle size={20} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={onCallPress}>
                            <Phone size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={styles.metaRow}>{jobRef(job.id)} · {formatDate(job.created_at)}</Text>

                <View style={styles.timeRow}>
                    <View style={styles.timeInfo}>
                        <Clock size={16} color={colors.accent} />
                        <Text style={styles.timeLabel}>Collector ETA</Text>
                        <Text style={styles.timeValue}>{job.duration_min != null ? `~${Math.round(job.duration_min)} min` : '—'}</Text>
                    </View>
                    <Text style={styles.timeEst}>{job.distance_km != null ? `${job.distance_km} km` : '—'}</Text>
                </View>

                <View style={{ marginBottom: 8 }}>
                    <PickupProgressRoadmap
                        steps={ROADMAP_STEPS}
                        currentIndex={currentStep}
                        isComplete={job.status === 'COMPLETED'}
                    />
                </View>

                <View style={styles.divider} />

                {/* Route card - the same pickup (and dropoff, for Track A) summary
                    the collector sees, so the disposer can confirm it's correct. */}
                <View style={styles.routeCard}>
                    <View style={styles.routeAddresses}>
                        <View style={styles.routeRow}>
                            <View style={styles.routeDotPickup} />
                            <View style={styles.routeTextCol}>
                                <Text style={styles.routeLabel}>PICKUP</Text>
                                <Text style={styles.routeValue} numberOfLines={1}>
                                    {job.pickup_address || 'Current location'}
                                </Text>
                            </View>
                        </View>
                        {hasDropoff && (
                            <>
                                <View style={styles.routeConnector} />
                                <View style={styles.routeRow}>
                                    <View style={styles.routeDotDest} />
                                    <View style={styles.routeTextCol}>
                                        <Text style={styles.routeLabel}>DELIVER TO</Text>
                                        <Text style={styles.routeValue} numberOfLines={1}>
                                            {job.destination_address}
                                        </Text>
                                    </View>
                                </View>
                            </>
                        )}
                    </View>
                    <View style={styles.routeThumbBox}>
                        {job.listing_image ? (
                            <Image source={{ uri: job.listing_image }} style={styles.routeThumb} />
                        ) : (
                            <Package size={22} color={colors.textMuted} />
                        )}
                    </View>
                </View>

                <Text style={styles.materialLine}>
                    {job.material_type}{job.weight_kg ? ` · ${job.weight_kg}kg` : ''} · {job.quantity_estimate}
                </Text>

                {canCancel && onCancel && (
                    <TouchableOpacity style={styles.cancelLink} onPress={onCancel}>
                        <Text style={styles.cancelLinkText}>Cancel Request</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </Animated.View>
    );
}

const useStyles = makeStyles((c) => ({
    container: {
        backgroundColor: c.surface,
        borderRadius: 24,
        padding: 24,
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
        maxHeight: CARD_MAX_HEIGHT,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: c.surfaceSunken,
    },
    avatarPlaceholder: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: c.surfaceSunken,
        alignItems: 'center',
        justifyContent: 'center',
    },
    collectorInfo: {
        flex: 1,
        marginLeft: 14,
        gap: 5,
    },
    name: {
        fontSize: 17,
        fontWeight: '700',
        color: c.text,
    },
    rolePill: {
        alignSelf: 'flex-start',
        backgroundColor: c.surfaceSunken,
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    rolePillText: {
        fontSize: 10,
        fontWeight: '700',
        color: c.textSecondary,
        letterSpacing: 0.5,
    },
    actions: {
        flexDirection: 'row',
        gap: 10,
    },
    actionBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: c.surfaceSunken,
        alignItems: 'center',
        justifyContent: 'center',
    },
    metaRow: {
        fontSize: 12,
        color: c.textMuted,
        fontWeight: '500',
        marginBottom: 18,
        fontVariant: ['tabular-nums'],
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    timeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    timeLabel: {
        fontSize: 13,
        color: c.textSecondary,
    },
    timeValue: {
        fontSize: 13,
        fontWeight: 'bold',
        color: c.text,
    },
    timeEst: {
        fontSize: 13,
        color: c.textSecondary,
    },
    divider: {
        height: 1,
        backgroundColor: c.surfaceSunken,
        marginBottom: 20,
    },
    routeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.surfaceAlt,
        borderRadius: 16,
        padding: 16,
        marginBottom: 10,
    },
    routeAddresses: {
        flex: 1,
    },
    routeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    routeDotPickup: {
        width: 9,
        height: 9,
        borderRadius: 4.5,
        backgroundColor: c.accent,
        marginRight: 12,
    },
    routeDotDest: {
        width: 9,
        height: 9,
        borderRadius: 2,
        backgroundColor: c.primary,
        marginRight: 12,
    },
    routeConnector: {
        width: 1,
        height: 14,
        backgroundColor: c.surfaceSunken,
        marginLeft: 4.5,
        marginVertical: 2,
    },
    routeTextCol: {
        flex: 1,
    },
    routeLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: c.textMuted,
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    routeValue: {
        fontSize: 13.5,
        fontWeight: '600',
        color: c.text,
    },
    routeThumbBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: c.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: c.borderSubtle,
        marginLeft: 12,
    },
    routeThumb: {
        width: 48,
        height: 48,
        borderRadius: 12,
    },
    materialLine: {
        fontSize: 12.5,
        color: c.textMuted,
        marginBottom: 16,
        marginLeft: 4,
    },
    cancelLink: {
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: c.borderSubtle,
    },
    cancelLinkText: {
        color: c.text,
        fontSize: 16,
        fontWeight: '700',
    },
}));
