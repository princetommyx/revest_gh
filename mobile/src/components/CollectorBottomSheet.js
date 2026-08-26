import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Platform } from 'react-native';
import { Phone, MessageCircle, MapPin, CheckCircle, Clock, Truck } from 'lucide-react-native';

export default function CollectorBottomSheet({ collector, job, onChatPress, onCallPress }) {
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
        <View style={styles.container}>
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

            {/* Timeline Progress */}
            <View style={styles.timelineContainer}>
                <View style={styles.timelineLine}>
                    <View style={[styles.timelineProgress, { width: `${(currentStep / 3) * 100}%` }]} />
                </View>
                <View style={styles.timelineSteps}>
                    <View style={styles.step}>
                        <View style={[styles.stepIcon, currentStep >= 0 && styles.stepIconActive]}>
                            <Clock size={16} color={currentStep >= 0 ? "#fff" : "#999"} />
                        </View>
                    </View>
                    <View style={styles.step}>
                        <View style={[styles.stepIcon, currentStep >= 1 && styles.stepIconActive]}>
                            <Truck size={16} color={currentStep >= 1 ? "#fff" : "#999"} />
                        </View>
                    </View>
                    <View style={styles.step}>
                        <View style={[styles.stepIcon, currentStep >= 2 && styles.stepIconActive]}>
                            <MapPin size={16} color={currentStep >= 2 ? "#fff" : "#999"} />
                        </View>
                    </View>
                    <View style={styles.step}>
                        <View style={[styles.stepIcon, currentStep >= 3 && styles.stepIconActive]}>
                            <CheckCircle size={16} color={currentStep >= 3 ? "#fff" : "#999"} />
                        </View>
                    </View>
                </View>
                <View style={styles.timelineLabels}>
                    <Text style={[styles.stepLabel, currentStep >= 0 && styles.stepLabelActive]}>Placed</Text>
                    <Text style={[styles.stepLabel, currentStep >= 1 && styles.stepLabelActive]}>En Route</Text>
                    <Text style={[styles.stepLabel, currentStep >= 2 && styles.stepLabelActive]}>Arrived</Text>
                    <Text style={[styles.stepLabel, currentStep >= 3 && styles.stepLabelActive]}>Done</Text>
                </View>
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
                    <Text style={styles.etaValue}>~15 mins</Text>
                )}
            </View>
        </View>
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
    timelineContainer: {
        marginBottom: 24,
    },
    timelineLine: {
        position: 'absolute',
        top: 15,
        left: 20,
        right: 20,
        height: 2,
        backgroundColor: '#F3F4F6',
        zIndex: 0,
    },
    timelineProgress: {
        height: '100%',
        backgroundColor: '#111',
    },
    timelineSteps: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        zIndex: 1,
    },
    step: {
        width: 32,
        alignItems: 'center',
    },
    stepIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepIconActive: {
        backgroundColor: '#111',
    },
    timelineLabels: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    stepLabel: {
        fontSize: 12,
        color: '#9CA3AF',
        width: 50,
        textAlign: 'center',
    },
    stepLabelActive: {
        color: '#111',
        fontWeight: '600',
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
    }
});
