import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Image } from 'react-native';
import { useTheme, makeStyles } from '../theme/ThemeContext';

/**
 * Branded in-page loader - reuses the brand logo and a premium
 * breathing animation so "loading" feels like part of the same app everywhere.
 */
export default function PageLoader({ label, size = 'large', fullScreen = true }) {
    const styles = useStyles();
    const { colors } = useTheme();
    const breatheAnim = useRef(new Animated.Value(1)).current;
    const ring1Scale = useRef(new Animated.Value(0.8)).current;
    const ring1Opacity = useRef(new Animated.Value(0.4)).current;
    const ring2Scale = useRef(new Animated.Value(0.8)).current;
    const ring2Opacity = useRef(new Animated.Value(0.4)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(breatheAnim, { toValue: 1.1, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(breatheAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        ).start();

        const startPing = (scaleV, opacityV, delay) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.parallel([
                        Animated.timing(scaleV, { toValue: 1.6, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                        Animated.timing(opacityV, { toValue: 0, duration: 2000, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                    ]),
                ])
            ).start();
        };
        startPing(ring1Scale, ring1Opacity, 0);
        startPing(ring2Scale, ring2Opacity, 1000);
    }, []);

    const boxSize = size === 'small' ? 56 : 100;
    const wrapSize = size === 'small' ? 36 : 64;
    const ringSize = size === 'small' ? 44 : 80;

    return (
        <View style={[styles.container, fullScreen && styles.fullScreen]}>
            <View style={{ width: boxSize, height: boxSize, justifyContent: 'center', alignItems: 'center' }}>
                <Animated.View style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, opacity: ring1Opacity, transform: [{ scale: ring1Scale }] }]} />
                <Animated.View style={[styles.ring, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, opacity: ring2Opacity, transform: [{ scale: ring2Scale }] }]} />
                <Animated.View style={[styles.iconWrap, { width: wrapSize, height: wrapSize, borderRadius: wrapSize / 2, transform: [{ scale: breatheAnim }] }]}>
                    <Image source={require('../../assets/icon.png')} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
                </Animated.View>
            </View>
            {!!label && <Text style={styles.label}>{label}</Text>}
        </View>
    );
}

const useStyles = makeStyles((c) => ({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 24,
    },
    fullScreen: {
        flex: 1,
        backgroundColor: c.bg,
    },
    ring: {
        position: 'absolute',
        backgroundColor: c.accentSoft,
        borderWidth: 1,
        borderColor: c.accent,
    },
    iconWrap: {
        backgroundColor: c.surface,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        overflow: 'hidden',
    },
    label: {
        marginTop: 16,
        fontSize: 14,
        fontWeight: '600',
        color: c.textSecondary,
    },
}));
