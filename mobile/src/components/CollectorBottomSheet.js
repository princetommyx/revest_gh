import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Animated } from 'react-native';
import { Phone, MessageCircle, Clock, UserCheck, MapPin, CheckCircle, User } from 'lucide-react-native';
import PickupProgressRoadmap from './PickupProgressRoadmap';
import { BASE_URL } from '../api/client';

const BRAND_GREEN = '#059669';

// The final node always renders as a checkmark once reached (handled by
// PickupProgressRoadmap itself), so this icon is only a fallback.
const ROADMAP_STEPS = [
    { key: 'requested', label: 'Requested', icon: Clock },
    { key: 'assigned', label: 'Assigned', icon: UserCheck },
    { key: 'arrived', label: 'Arrived', icon: MapPin },
    { key: 'completed', label: 'Completed', icon: CheckCircle },
];

const resolveImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    let cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (!cleanPath.startsWith('/media/')) cleanPath = `/media${cleanPath}`;
    return `${BASE_URL}${cleanPath}`;
};

const jobRef = (id) => `#PU-${String(id).padStart(4, '0')}`;

export default function CollectorBottomSheet({ collector, job, onChatPress, onCallPress, onCancel }) {
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

    // Determine current step index based on job status
    const getStatusIndex = () => {
        if (job.status === 'COMPLETED') return 3;
        if (job.status === 'ARRIVED') return 2;
        if (job.status === 'ACCEPTED' || job.status === 'EN_ROUTE') return 1;
        return 0; // PENDING or other
    };

    const currentStep = getStatusIndex();
    const avatarUrl = resolveImageUrl(collector.profile_picture_url);
    const collectorName = [collector.first_name, collector.last_name].filter(Boolean).join(' ') || collector.username || 'Collector';

    return (
        <Animated.View style={[styles.container, {
            opacity: entrance,
            transform: [{
                translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [24, 0] })
            }]
        }]}>
            <View style={styles.dragHandle} />

            {/* Header: Collector Info & Quick Actions */}
            <View style={styles.header}>
                {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <User size={24} color="#9CA3AF" />
                    </View>
                )}
                <View style={styles.collectorInfo}>
                    <Text style={styles.name} numberOfLines={1}>{collectorName}</Text>
                    <View style={styles.rolePill}>
                        <Text style={styles.rolePillText}>{collector.role === 'RECYCLER' ? 'RECYCLER' : 'COLLECTOR'}</Text>
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

            <Text style={styles.metaRow}>{jobRef(job.id)} · {job.material_type}</Text>

            <View style={styles.divider} />

            {/* Progress Roadmap - since we can't reliably show the collector's
                live position on a map, this shows the real milestones the
                job has actually reached instead. */}
            <View style={{ marginBottom: 24 }}>
                <PickupProgressRoadmap
                    steps={ROADMAP_STEPS}
                    currentIndex={currentStep}
                    isComplete={job.status === 'COMPLETED'}
                />
            </View>

            {/* ETA / Status Info */}
            <View style={styles.etaCard}>
                <Text style={styles.etaTitle}>
                    {currentStep === 0 ? 'Waiting for assignment...' :
                     currentStep === 1 ? 'Collector is on the way' :
                     currentStep === 2 ? 'Collector has arrived at your location' :
                     'Pickup Completed'}
                </Text>
                {currentStep === 1 && (
                    // Distance from the collector's last live position, not
                    // duration_min - the disposer's own fetch has no lat/lon
                    // to compute that against, so it's always null here.
                    <Text style={styles.etaValue}>
                        {job.collector_eta_min != null ? `~${job.collector_eta_min} min` : '—'}
                    </Text>
                )}
            </View>

            {onCancel && currentStep < 2 && (
                <TouchableOpacity style={styles.cancelLink} onPress={onCancel}>
                    <Text style={styles.cancelLinkText}>Cancel pickup</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
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
    collectorInfo: {
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
        backgroundColor: '#ECFDF5',
        borderRadius: 6,
        paddingHorizontal: 7,
        paddingVertical: 3,
    },
    rolePillText: {
        fontSize: 10,
        fontWeight: '700',
        color: BRAND_GREEN,
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
        marginTop: 14,
    },
    divider: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginVertical: 20,
    },
    etaCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F9FAFB',
        padding: 16,
        borderRadius: 16,
    },
    etaTitle: {
        fontSize: 14,
        color: '#4B5563',
        flex: 1,
    },
    etaValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111',
    },
    cancelLink: {
        alignItems: 'center',
        marginTop: 16,
        paddingVertical: 4,
    },
    cancelLinkText: {
        color: '#DC2626',
        fontSize: 13,
        fontWeight: '600',
    },
});
