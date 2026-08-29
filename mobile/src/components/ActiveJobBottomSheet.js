import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ScrollView, Animated, Easing } from 'react-native';
import { Phone, MessageCircle, MapPin, CheckCircle, Clock, UserCheck, Package, Navigation, Activity, User } from 'lucide-react-native';
import AnimatedButton from './AnimatedButton';
import PickupProgressRoadmap from './PickupProgressRoadmap';
import { BASE_URL } from '../api/client';

const BRAND_GREEN = '#059669';

// The final node always renders as a checkmark once reached (handled by
// PickupProgressRoadmap itself), so this icon is only a fallback.
const ROADMAP_STEPS = [
    { key: 'requested', label: 'Requested', icon: Clock },
    { key: 'assigned', label: 'Accepted', icon: UserCheck },
    { key: 'arrived', label: 'Arrived', icon: MapPin },
    { key: 'completed', label: 'Completed', icon: CheckCircle },
];

// Matches the resolver used across the app (EditProfileScreen, ProfileScreen,
// etc.) - a relative path needs the /media prefix and the API host.
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

export default function ActiveJobBottomSheet({ job, onChatPress, onCallPress, onNavigate, onArrive, onComplete, onAccept, requestLoading, isCollapsed, onToggleCollapse }) {
    const pulseAnim = useRef(new Animated.Value(0.5)).current;
    const isPending = job?.status === 'PENDING';

    useEffect(() => {
        if (!isPending) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.5, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [isPending]);

    if (!job) return null;

    const provider = job.provider;
    if (!provider) return null;

    // Determine current step index based on job status
    const getStatusIndex = () => {
        if (job.status === 'COMPLETED') return 3;
        if (job.status === 'ARRIVED') return 2;
        if (job.status === 'ACCEPTED' || job.status === 'EN_ROUTE') return 1;
        return 0; // PENDING or other
    };

    const currentStep = getStatusIndex();

    const price = parseFloat(job.waste_price || job.price || 0);
    const shipping = parseFloat(job.delivery_fee || 0);
    const total = parseFloat(job.actual_price || job.total_amount || (price + shipping));

    const formatCurrency = (amount) => `GHS ${amount.toFixed(2)}`;

    const avatarUrl = resolveImageUrl(provider.profile_picture_url);
    const providerName = [provider.first_name, provider.last_name].filter(Boolean).join(' ') || provider.username || 'Disposer';
    const hasDropoff = !!job.destination_address;

    return (
        <View style={[styles.container, isPending && styles.containerPending]}>
            <TouchableOpacity onPress={onToggleCollapse} style={{ alignItems: 'center' }}>
                <View style={styles.dragHandle} />
            </TouchableOpacity>

            {isPending && (
                <View style={styles.newRequestBadge}>
                    <Animated.View style={[styles.newRequestDot, { opacity: pulseAnim }]} />
                    <Text style={styles.newRequestText}>NEW REQUEST</Text>
                </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
                {/* Header: Disposer Info & Quick Actions */}
                <View style={styles.header}>
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <User size={24} color="#9CA3AF" />
                        </View>
                    )}
                    <View style={styles.providerInfo}>
                        <Text style={styles.name} numberOfLines={1}>{providerName}</Text>
                        <View style={styles.rolePill}>
                            <Text style={styles.rolePillText}>DISPOSER</Text>
                        </View>
                    </View>
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.actionBtn} onPress={onChatPress}>
                            <MessageCircle size={20} color="#111" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={onCallPress}>
                            <Phone size={20} color="#111" />
                        </TouchableOpacity>
                    </View>
                </View>

                <Text style={styles.metaRow}>{jobRef(job.id)} · {formatDate(job.created_at)}</Text>

                {/* Delivery Time Info - was defaulting to a fabricated "15 min" /
                    "2.5 km" whenever the real estimate was missing (which was
                    always, since duration_min was never actually returned by
                    the list endpoint), so it just always showed the same fake
                    numbers. Show an honest placeholder instead. */}
                <View style={styles.timeRow}>
                    <View style={styles.timeInfo}>
                        <Clock size={16} color={BRAND_GREEN} />
                        <Text style={styles.timeLabel}>Your pickup ETA</Text>
                        <Text style={styles.timeValue}>{job.duration_min != null ? `~${Math.round(job.duration_min)} min` : '—'}</Text>
                    </View>
                    <Text style={styles.timeEst}>{job.distance_km != null ? `${job.distance_km} km` : '—'}</Text>
                </View>

                {/* Progress Roadmap - the real milestones this job has reached,
                    in place of a live map position that isn't reliable. */}
                <View style={{ marginBottom: 8 }}>
                    <PickupProgressRoadmap
                        steps={ROADMAP_STEPS}
                        currentIndex={currentStep}
                        isComplete={job.status === 'COMPLETED'}
                    />
                </View>

                {!isCollapsed && (
                    <>
                        <View style={styles.divider} />

                        {/* Route card - pickup (and dropoff, for Track A jobs that
                            have one) alongside a thumbnail of the material, in
                            place of the separate disconnected "item summary" row
                            this used to be. */}
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
                                    <Package size={22} color="#9CA3AF" />
                                )}
                            </View>
                        </View>

                        <Text style={styles.materialLine}>
                            {job.material_type}{job.weight_kg ? ` · ${job.weight_kg}kg` : ''} · {job.quantity_estimate}
                        </Text>

                        {/* Track A is a direct booking - the platform doesn't quote
                            or collect a fee for it, so a Price/Fee/Total breakdown
                            here would just show a misleading GHS 0.00 all the way
                            down. Say what's actually true instead. */}
                        {job.track_type === 'A' ? (
                            <View style={styles.paymentSummary}>
                                <Text style={styles.paymentTitle}>Payment</Text>
                                <Text style={styles.cashNote}>Arranged directly with the disposer - no in-app charge for this job.</Text>
                            </View>
                        ) : (
                            <View style={styles.paymentSummary}>
                                <Text style={styles.paymentTitle}>Payment Summary</Text>
                                <View style={styles.paymentRow}>
                                    <Text style={styles.paymentLabel}>Price</Text>
                                    <Text style={styles.paymentValue}>{formatCurrency(price)}</Text>
                                </View>
                                <View style={styles.paymentRow}>
                                    <Text style={styles.paymentLabel}>Pickup fee</Text>
                                    <Text style={styles.paymentValue}>{formatCurrency(shipping)}</Text>
                                </View>
                                <View style={[styles.paymentRow, styles.paymentTotalRow]}>
                                    <Text style={styles.paymentTotalLabel}>Total payment</Text>
                                    <Text style={styles.paymentTotalValue}>{formatCurrency(total)}</Text>
                                </View>
                            </View>
                        )}
                    </>
                )}

                {/* Actions */}
                <View style={styles.actionContainer}>
                    {job.status === 'PENDING' && (
                        <AnimatedButton style={styles.primaryBtn} onPress={() => onAccept(job.id)} disabled={requestLoading}>
                            {requestLoading ? <Activity color="#fff" /> : <Text style={styles.primaryBtnText}>Accept Job</Text>}
                        </AnimatedButton>
                    )}
                    {job.status === 'ACCEPTED' && (
                        <View style={styles.dualActions}>
                            <AnimatedButton style={[styles.primaryBtn, { flex: 1, backgroundColor: '#F3F4F6' }]} onPress={() => onNavigate(job)}>
                                <Navigation size={20} color="#111" style={{ marginRight: 8 }} />
                                <Text style={[styles.primaryBtnText, { color: '#111' }]}>{isCollapsed ? 'Show Details' : 'Navigate'}</Text>
                            </AnimatedButton>
                            <AnimatedButton style={[styles.primaryBtn, { flex: 1 }]} onPress={() => onArrive(job.id)} disabled={requestLoading}>
                                {requestLoading ? <Activity color="#fff" /> : <Text style={styles.primaryBtnText}>Arrived</Text>}
                            </AnimatedButton>
                        </View>
                    )}
                    {job.status === 'ARRIVED' && (
                        <AnimatedButton style={styles.primaryBtn} onPress={() => onComplete(job.id)} disabled={requestLoading}>
                            {requestLoading ? <Activity color="#fff" /> : <Text style={styles.primaryBtnText}>Complete Job</Text>}
                        </AnimatedButton>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 100 : 90,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
        maxHeight: '100%',
    },
    containerPending: {
        borderTopWidth: 3,
        borderTopColor: BRAND_GREEN,
    },
    newRequestBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'center',
        backgroundColor: '#F0FDF4',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        marginBottom: 16,
    },
    newRequestDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: BRAND_GREEN,
    },
    newRequestText: {
        fontSize: 11,
        fontWeight: '700',
        color: BRAND_GREEN,
        letterSpacing: 0.6,
    },
    dragHandle: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#E5E7EB',
        alignSelf: 'center',
        marginBottom: 20,
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
        backgroundColor: '#F3F4F6',
    },
    avatarPlaceholder: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    providerInfo: {
        flex: 1,
        marginLeft: 14,
        gap: 5,
    },
    name: {
        fontSize: 17,
        fontWeight: '700',
        color: '#111',
    },
    rolePill: {
        alignSelf: 'flex-start',
        backgroundColor: '#F3F4F6',
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    rolePillText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#6B7280',
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
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    metaRow: {
        fontSize: 12,
        color: '#9CA3AF',
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
        color: '#6B7280',
    },
    timeValue: {
        fontSize: 13,
        fontWeight: 'bold',
        color: '#111',
    },
    timeEst: {
        fontSize: 13,
        color: '#6B7280',
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginBottom: 20,
    },
    routeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
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
        backgroundColor: BRAND_GREEN,
        marginRight: 12,
    },
    routeDotDest: {
        width: 9,
        height: 9,
        borderRadius: 2,
        backgroundColor: '#111',
        marginRight: 12,
    },
    routeConnector: {
        width: 1,
        height: 14,
        backgroundColor: '#E5E7EB',
        marginLeft: 4.5,
        marginVertical: 2,
    },
    routeTextCol: {
        flex: 1,
    },
    routeLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#9CA3AF',
        letterSpacing: 0.5,
        marginBottom: 2,
    },
    routeValue: {
        fontSize: 13.5,
        fontWeight: '600',
        color: '#111827',
    },
    routeThumbBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        marginLeft: 12,
    },
    routeThumb: {
        width: 48,
        height: 48,
        borderRadius: 12,
    },
    materialLine: {
        fontSize: 12.5,
        color: '#9CA3AF',
        marginBottom: 20,
        marginLeft: 4,
    },
    paymentSummary: {
        marginBottom: 24,
    },
    paymentTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 16,
    },
    cashNote: {
        fontSize: 13,
        color: '#6B7280',
        lineHeight: 19,
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    paymentLabel: {
        fontSize: 14,
        color: '#6B7280',
    },
    paymentValue: {
        fontSize: 14,
        color: '#374151',
    },
    paymentTotalRow: {
        marginTop: 8,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F3F4F6',
        marginBottom: 0,
    },
    paymentTotalLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111',
    },
    paymentTotalValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111',
    },
    actionContainer: {
        marginTop: 10,
    },
    dualActions: {
        flexDirection: 'row',
        gap: 12,
    },
    primaryBtn: {
        backgroundColor: '#111',
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 8,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: 'bold',
    },
});
