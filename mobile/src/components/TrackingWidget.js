import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Platform } from 'react-native';
import { useNavigation, useNavigationState } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { usePickups } from '../hooks/usePickups';
import { Activity, Navigation } from 'lucide-react-native';

export default function TrackingWidget() {
    const navigation = useNavigation();
    const { userRole, user } = useAuth();
    
    const { data: jobs } = usePickups(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Safely get current route name
    const currentRoute = useNavigationState(state => {
        if (!state || !state.routes) return null;
        try {
            let route = state.routes[state.index];
            if (!route) return null;
            while (route.state && route.state.index !== undefined) {
                route = route.state.routes[route.state.index];
                if (!route) return null;
            }
            return route.name;
        } catch (e) {
            console.log('Error getting current route', e);
            return null;
        }
    });

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 0.4,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                })
            ])
        ).start();
    }, [pulseAnim]);

    // Only show for SELLER for now, as COLLECTOR needs location for usePickups
    if (!user || userRole !== 'SELLER') return null;

    // Hide if already on Pickups screen
    if (currentRoute === 'Pickups') return null;

    const safeJobs = Array.isArray(jobs) ? jobs : [];
    const activeJobs = safeJobs.filter(j => j && (j.status === 'ACCEPTED' || j.status === 'ARRIVED'));
    
    if (activeJobs.length === 0) return null;

    const activeJob = activeJobs[0];

    const getStatusText = () => {
        if (activeJob?.status === 'ARRIVED') return 'Collector Arrived';
        return 'Collector En Route';
    };

    return (
        <TouchableOpacity 
            style={styles.container} 
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Pickups')}
        >
            <View style={styles.content}>
                <Animated.View style={[styles.pulseIcon, { opacity: pulseAnim }]}>
                    <Activity size={18} color="#fff" />
                </Animated.View>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>{getStatusText()}</Text>
                    <Text style={styles.subtitle}>Tap to view tracking map</Text>
                </View>
                <View style={styles.actionIcon}>
                    <Navigation size={16} color="#fff" />
                </View>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 60 : 40,
        left: 20,
        right: 20,
        backgroundColor: '#111',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 9999,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    pulseIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    subtitle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
    },
    actionIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    }
});
