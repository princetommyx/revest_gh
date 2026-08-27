import React, { useEffect, useRef } from 'react';
import { View, Text, Image, StyleSheet, Animated, Easing } from 'react-native';

const BRAND_GREEN = '#059669';

/**
 * Branded in-page loader - reuses the splash screen's radar-ping + breathing
 * icon language so "loading" feels like part of the same app everywhere,
 * instead of a bare platform spinner.
 */
export default function PageLoader({ label, size = 'large', fullScreen = true }) {
    const breatheAnim = useRef(new Animated.Value(1)).current;
    const ring1Scale = useRef(new Animated.Value(0.6)).current;
    const ring1Opacity = useRef(new Animated.Value(0.35)).current;
    const ring2Scale = useRef(new Animated.Value(0.6)).current;
    const ring2Opacity = useRef(new Animated.Value(0.35)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(breatheAnim, { toValue: 1.06, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(breatheAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        ).start();

        const startPing = (scaleV, opacityV, delay) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.parallel([
                        Animated.timing(scaleV, { toValue: 1.8, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                        Animated.timing(opacityV, { toValue: 0, duration: 1800, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                    ]),
                ])
            ).start();
        };
        startPing(ring1Scale, ring1Opacity, 0);
        startPing(ring2Scale, ring2Opacity, 900);
    }, []);

    const boxSize = size === 'small' ? 56 : 88;
    const iconSize = size === 'small' ? 32 : 52;
    const ringSize = size === 'small' ? 44 : 64;

    return (
        <View style={[styles.container, fullScreen && styles.fullScreen]}>
            <View style={{ width: boxSize, height: boxSize, justifyContent: 'center', alignItems: 'center' }}>
                <Animated.View style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, opacity: ring1Opacity, transform: [{ scale: ring1Scale }] }]} />
                <Animated.View style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, opacity: ring2Opacity, transform: [{ scale: ring2Scale }] }]} />
                <Animated.View style={{ transform: [{ scale: breatheAnim }] }}>
                    <Image source={require('../../assets/icon.png')} style={{ width: iconSize, height: iconSize, borderRadius: iconSize / 4 }} resizeMode="contain" />
                </Animated.View>
            </View>
            {!!label && <Text style={styles.label}>{label}</Text>}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
    },
    fullScreen: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    ring: {
        position: 'absolute',
        backgroundColor: 'rgba(5, 150, 105, 0.18)',
    },
    label: {
        marginTop: 16,
        fontSize: 13,
        fontWeight: '600',
        color: '#6B7280',
    },
});
