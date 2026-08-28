import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform, Animated } from 'react-native';
import { Phone, MessageCircle, Clock, UserCheck, MapPin, CheckCircle } from 'lucide-react-native';
import PickupProgressRoadmap from './PickupProgressRoadmap';

// The final node always renders as a checkmark once reached (handled by
// PickupProgressRoadmap itself), so this icon is only a fallback.
const ROADMAP_STEPS = [
    { key: 'requested', label: 'Requested', icon: Clock },
    { key: 'assigned', label: 'Assigned', icon: UserCheck },
    { key: 'arrived', label: 'Arrived', icon: MapPin },
    { key: 'completed', label: 'Completed', icon: CheckCircle },
];

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
                <Image
                    source={{ uri: collector.avatar || 'https://via.placeholder.com/150' }}
                    style={styles.avatar}
                />
                <View style={styles.collectorInfo}>
                    <Text style={styles.name}>{collector.first_name} {collector.last_name}</Text>
                    <Text style={styles.vehicleInfo}>
                        {collector.vehicle_type || 'Truck'} • {collector.license_plate || 'No Plate'}
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
                    <Text style={styles.etaValue}>~{job.duration_min ? Math.round(job.duration_min) : 15} min</Text>
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
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#F3F4F6',
    },
    collectorInfo: {
        flex: 1,
        marginLeft: 16,
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 4,
    },
    vehicleInfo: {
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
