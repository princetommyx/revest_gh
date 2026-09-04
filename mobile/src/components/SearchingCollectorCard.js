import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing, Image } from 'react-native';
import { Truck } from 'lucide-react-native';
import { useTheme, makeStyles } from '../theme/ThemeContext';

const VEHICLE_IMAGES = {
    tricycle: require('../../assets/tricycle.jpg'),
    pickup: require('../../assets/pickup.jpg'),
};

const STATUS_MESSAGES = [
    'Looking for nearby collectors...',
    'Checking who is online near you...',
    'Matching you with a collector...',
    'Still searching - almost there...',
];


export default function SearchingCollectorCard({ onCancel, vehicleType }) {
    const styles = useStyles();
    const { colors } = useTheme();
    const ring1Scale = useRef(new Animated.Value(0.6)).current;
    const ring1Opacity = useRef(new Animated.Value(0.35)).current;
    const ring2Scale = useRef(new Animated.Value(0.6)).current;
    const ring2Opacity = useRef(new Animated.Value(0.35)).current;
    const breatheAnim = useRef(new Animated.Value(1)).current;

    const [elapsed, setElapsed] = useState(0);
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const startPing = (scaleV, opacityV, delay) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.parallel([
                        Animated.timing(scaleV, { toValue: 1.8, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                        Animated.timing(opacityV, { toValue: 0, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                    ]),
                ])
            ).start();
        };
        startPing(ring1Scale, ring1Opacity, 0);
        startPing(ring2Scale, ring2Opacity, 1000);

        Animated.loop(
            Animated.sequence([
                Animated.timing(breatheAnim, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(breatheAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        ).start();
    }, []);

    useEffect(() => {
        const tick = setInterval(() => setElapsed(prev => prev + 1), 1000);
        return () => clearInterval(tick);
    }, []);

    useEffect(() => {
        const rotate = setInterval(() => {
            setMessageIndex(prev => (prev + 1) % STATUS_MESSAGES.length);
        }, 3500);
        return () => clearInterval(rotate);
    }, []);

    return (
        <View style={styles.card}>
            <View style={styles.radarBox}>
                <Animated.View style={[styles.ring, { opacity: ring1Opacity, transform: [{ scale: ring1Scale }] }]} />
                <Animated.View style={[styles.ring, { opacity: ring2Opacity, transform: [{ scale: ring2Scale }] }]} />
                <Animated.View style={[styles.iconCircle, { transform: [{ scale: breatheAnim }] }]}>
                    {vehicleType && VEHICLE_IMAGES[vehicleType.toLowerCase()] ? (
                        <Image 
                            source={VEHICLE_IMAGES[vehicleType.toLowerCase()]} 
                            style={styles.vehicleImage} 
                        />
                    ) : (
                        <Truck size={22} color={colors.onPrimary} />
                    )}
                </Animated.View>
            </View>

            <Text style={styles.title}>Finding you a collector</Text>
            <Text style={styles.subtext}>{STATUS_MESSAGES[messageIndex]}</Text>
            <Text style={styles.elapsed}>{elapsed}s</Text>

            {onCancel && (
                <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
                    <Text style={styles.cancelText}>Cancel Request</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const useStyles = makeStyles((c) => ({
    card: {
        backgroundColor: c.surface,
        borderRadius: 24,
        paddingTop: 20,
        paddingBottom: 20,
        paddingHorizontal: 24,
        alignItems: 'center',
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 20,
    },
    radarBox: {
        width: 96,
        height: 96,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    ring: {
        position: 'absolute',
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(5, 150, 105, 0.15)',
    },
    iconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: c.accent,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    vehicleImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: c.text,
        marginBottom: 4,
    },
    subtext: {
        fontSize: 13,
        color: c.textSecondary,
        textAlign: 'center',
        marginBottom: 6,
    },
    elapsed: {
        fontSize: 12,
        color: c.textMuted,
        fontWeight: '600',
        marginBottom: 16,
    },
    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 12,
        backgroundColor: c.dangerSoft,
    },
    cancelText: {
        color: c.danger,
        fontSize: 14,
        fontWeight: '700',
    },
}));
