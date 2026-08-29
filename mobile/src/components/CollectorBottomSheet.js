import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { Trash2, Truck, RefreshCw, User } from 'lucide-react-native';
import { BASE_URL } from '../api/client';

const BRAND_GREEN = '#059669';
const BRAND_BEIGE = '#F4F0E6'; // matches the screenshot background

const resolveImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    let cleanPath = path.startsWith('/') ? path : `/${path}`;
    if (!cleanPath.startsWith('/media/')) cleanPath = `/media${cleanPath}`;
    return `${BASE_URL}${cleanPath}`;
};

export default function CollectorBottomSheet({ collector, job, onCancel }) {
    const entrance = useRef(new Animated.Value(0)).current;
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        Animated.spring(entrance, {
            toValue: 1,
            friction: 7,
            tension: 50,
            useNativeDriver: true,
        }).start();
        
        // Simple timer for the UI
        const interval = setInterval(() => {
            setElapsed(prev => prev + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!collector || !job) return null;

    const avatarUrl = resolveImageUrl(collector.profile_picture_url);
    const collectorName = [collector.first_name, collector.last_name].filter(Boolean).join(' ') || collector.username || 'Collector';
    
    const getStatusIndex = () => {
        if (job.status === 'COMPLETED') return 2;
        if (job.status === 'ARRIVED') return 1;
        if (job.status === 'ACCEPTED' || job.status === 'EN_ROUTE') return 0;
        return 0;
    };
    const currentStep = getStatusIndex();

    return (
        <Animated.View style={[styles.container, {
            opacity: entrance,
            transform: [{
                translateY: entrance.interpolate({ inputRange: [0, 1], outputRange: [24, 0] })
            }]
        }]}>
            {/* Header: Collector Info */}
            <View style={styles.header}>
                {avatarUrl ? (
                    <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                ) : (
                    <View style={styles.avatarPlaceholder}>
                        <User size={36} color="#9CA3AF" />
                    </View>
                )}
                <View style={styles.collectorInfo}>
                    <Text style={styles.assignedLabel}>Your Assigned Collector:</Text>
                    <Text style={styles.name} numberOfLines={1}>{collectorName}</Text>
                    <Text style={styles.tagline}>Connecting you with local expertise.</Text>
                </View>
            </View>

            <View style={styles.divider} />

            {/* Horizontal Progress Tracker */}
            <View style={styles.progressContainer}>
                <View style={styles.step}>
                    <Trash2 size={24} color={currentStep >= 0 ? BRAND_GREEN : '#9CA3AF'} />
                    <Text style={[styles.stepLabel, currentStep >= 0 && styles.stepLabelActive]}>Pickup</Text>
                </View>
                
                <View style={styles.progressLineContainer}>
                    <View style={[styles.progressLine, currentStep >= 1 && styles.progressLineActive]} />
                    {currentStep < 1 && <View style={styles.progressArrow} />}
                </View>

                <View style={styles.step}>
                    <Truck size={24} color={currentStep >= 1 ? BRAND_GREEN : '#9CA3AF'} />
                    <Text style={[styles.stepLabel, currentStep >= 1 && styles.stepLabelActive]}>Transport</Text>
                </View>

                <View style={styles.progressLineContainer}>
                    <View style={[styles.progressLine, currentStep >= 2 && styles.progressLineActive]} />
                    {currentStep >= 1 && currentStep < 2 && <View style={styles.progressArrow} />}
                </View>

                <View style={styles.step}>
                    <RefreshCw size={24} color={currentStep >= 2 ? BRAND_GREEN : '#9CA3AF'} />
                    <Text style={[styles.stepLabel, currentStep >= 2 && styles.stepLabelActive]}>Processing</Text>
                </View>
            </View>

            {/* Status Text */}
            <View style={styles.statusBox}>
                <Text style={styles.statusBold}>
                    {currentStep === 0 ? "Finalizing the connection... and on its way." :
                     currentStep === 1 ? "Collector has arrived." : "Pickup completed."}
                </Text>
                {currentStep === 0 && <Text style={styles.timerText}>{elapsed}s</Text>}
                <Text style={styles.statusDesc}>
                    {currentStep === 0 ? "Our nearest qualified collector is accepting the request." :
                     currentStep === 1 ? "The collector is at your location." : "Your waste is being processed."}
                </Text>
            </View>

            {/* Cancel Button */}
            {onCancel && currentStep < 2 && (
                <TouchableOpacity style={styles.cancelLink} onPress={onCancel}>
                    <Text style={styles.cancelLinkText}>Cancel Request</Text>
                </TouchableOpacity>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: BRAND_BEIGE,
        borderRadius: 24,
        padding: 24,
        paddingTop: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E5E7EB',
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
    },
    collectorInfo: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    assignedLabel: {
        fontSize: 14,
        fontWeight: '700',
        color: '#111',
        marginBottom: 2,
    },
    name: {
        fontSize: 22,
        fontWeight: '800',
        color: '#111',
        marginBottom: 4,
    },
    tagline: {
        fontSize: 13,
        fontStyle: 'italic',
        color: '#4B5563',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 24,
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        paddingHorizontal: 8,
    },
    step: {
        alignItems: 'center',
        width: 60,
    },
    stepLabel: {
        fontSize: 12,
        color: '#9CA3AF',
        marginTop: 8,
        fontWeight: '500',
    },
    stepLabelActive: {
        color: '#111',
        fontWeight: '600',
    },
    progressLineContainer: {
        flex: 1,
        height: 2,
        backgroundColor: '#D1D5DB',
        marginHorizontal: 8,
        justifyContent: 'center',
    },
    progressLine: {
        height: '100%',
        backgroundColor: BRAND_GREEN,
        width: 0, // In a real app, this could animate
    },
    progressLineActive: {
        width: '100%',
    },
    progressArrow: {
        position: 'absolute',
        right: 0,
        width: 0,
        height: 0,
        borderTopWidth: 5,
        borderTopColor: 'transparent',
        borderBottomWidth: 5,
        borderBottomColor: 'transparent',
        borderLeftWidth: 8,
        borderLeftColor: BRAND_GREEN,
        transform: [{ translateX: 8 }],
    },
    statusBox: {
        alignItems: 'center',
        marginBottom: 24,
    },
    statusBold: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111',
        textAlign: 'center',
        marginBottom: 4,
    },
    timerText: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 4,
    },
    statusDesc: {
        fontSize: 14,
        color: '#4B5563',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    cancelLink: {
        alignItems: 'center',
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    cancelLinkText: {
        color: '#111',
        fontSize: 16,
        fontWeight: '700',
    },
});
