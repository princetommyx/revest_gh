import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, ScrollView, Animated, Easing } from 'react-native';
import { Phone, MessageCircle, MapPin, CheckCircle, Clock, UserCheck, Package, Navigation, Activity } from 'lucide-react-native';
import AnimatedButton from './AnimatedButton';
import PickupProgressRoadmap from './PickupProgressRoadmap';

// The final node always renders as a checkmark once reached (handled by
// PickupProgressRoadmap itself), so this icon is only a fallback.
const ROADMAP_STEPS = [
    { key: 'requested', label: 'Requested', icon: Clock },
    { key: 'assigned', label: 'Accepted', icon: UserCheck },
    { key: 'arrived', label: 'Arrived', icon: MapPin },
    { key: 'completed', label: 'Completed', icon: CheckCircle },
];

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
    const serviceFee = 0; // Update if applicable
    const total = parseFloat(job.actual_price || job.total_amount || (price + shipping));

    const formatCurrency = (amount) => {
        return `GHS ${amount.toFixed(2)}`;
    };

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
                    <Image
                        source={{ uri: provider.avatar || 'https://via.placeholder.com/150' }}
                        style={styles.avatar}
                    />
                    <View style={styles.providerInfo}>
                        <Text style={styles.name}>{provider.first_name} {provider.last_name}</Text>
                        <Text style={styles.roleInfo}>
                            Disposer • {job.pickup_address?.split(',')[0] || 'Unknown Location'}
                        </Text>
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

                {/* Delivery Time Info - was defaulting to a fabricated "15 min" /
                    "2.5 km" whenever the real estimate was missing (which was
                    always, since duration_min was never actually returned by
                    the list endpoint), so it just always showed the same fake
                    numbers. Show an honest placeholder instead. */}
                <View style={styles.timeRow}>
                    <View style={styles.timeInfo}>
                        <Clock size={16} color="#059669" />
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

                        {/* Item Summary */}
                        <View style={styles.itemSummary}>
                            <View style={styles.itemIconBox}>
                                {job.listing_image ? (
                                    <Image source={{ uri: job.listing_image }} style={styles.itemImage} />
                                ) : (
                                    <Package size={24} color="#666" />
                                )}
                            </View>
                            <View style={styles.itemDetails}>
                                <Text style={styles.itemName}>{job.material_type}</Text>
                                <Text style={styles.itemDesc}>{job.weight_kg ? `${job.weight_kg}kg` : ''} • {job.quantity_estimate}</Text>
                            </View>
                            <View style={styles.itemPriceBox}>
                                <Text style={styles.itemQty}>1x</Text>
                                <Text style={styles.itemPrice}>{formatCurrency(price)}</Text>
                            </View>
                        </View>

                        {/* Payment Summary */}
                        <View style={styles.paymentSummary}>
                            <Text style={styles.paymentTitle}>Payment Summary</Text>
                            <View style={styles.paymentRow}>
                                <Text style={styles.paymentLabel}>Price</Text>
                                <Text style={styles.paymentValue}>{formatCurrency(price)}</Text>
                            </View>
                            <View style={styles.paymentRow}>
                                <Text style={styles.paymentLabel}>Shipping</Text>
                                <Text style={styles.paymentValue}>{formatCurrency(shipping)}</Text>
                            </View>
                            <View style={[styles.paymentRow, styles.paymentTotalRow]}>
                                <Text style={styles.paymentTotalLabel}>Total payment</Text>
                                <Text style={styles.paymentTotalValue}>{formatCurrency(total)}</Text>
                            </View>
                        </View>
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
        borderTopColor: '#059669',
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
        backgroundColor: '#059669',
    },
    newRequestText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#059669',
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
        marginBottom: 20,
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F3F4F6',
    },
    providerInfo: {
        flex: 1,
        marginLeft: 16,
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 4,
    },
    roleInfo: {
        fontSize: 13,
        color: '#6B7280',
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
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
    itemSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
    },
    itemIconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    itemImage: {
        width: 40,
        height: 40,
        borderRadius: 8,
    },
    itemDetails: {
        flex: 1,
        marginLeft: 16,
    },
    itemName: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 4,
    },
    itemDesc: {
        fontSize: 13,
        color: '#6B7280',
    },
    itemPriceBox: {
        alignItems: 'flex-end',
    },
    itemQty: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#3B82F6',
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
