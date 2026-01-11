import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

/**
 * Skeleton loading component - replaces spinners for better UX
 * Shows content placeholder while data loads
 */
export const SkeletonCard = ({ style }) => {
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true
                }),
                Animated.timing(shimmer, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true
                })
            ])
        ).start();
    }, []);

    const opacity = shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7]
    });

    return (
        <View style={[styles.card, style]}>
            <Animated.View style={[styles.imagePlaceholder, { opacity }]} />
            <Animated.View style={[styles.textPlaceholder, { opacity }]} />
            <Animated.View style={[styles.textPlaceholder, { opacity, width: '70%' }]} />
            <Animated.View style={[styles.textPlaceholder, { opacity, width: '50%' }]} />
        </View>
    );
};

/**
 * Small skeleton for list items
 */
export const SkeletonListItem = () => {
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true
                }),
                Animated.timing(shimmer, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true
                })
            ])
        ).start();
    }, []);

    const opacity = shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7]
    });

    return (
        <View style={styles.listItem}>
            <Animated.View style={[styles.avatar, { opacity }]} />
            <View style={styles.content}>
                <Animated.View style={[styles.line, { opacity }]} />
                <Animated.View style={[styles.line, { opacity, width: '60%' }]} />
            </View>
        </View>
    );
};

/**
 * Wallet balance skeleton
 */
export const SkeletonWalletCard = () => {
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true
                }),
                Animated.timing(shimmer, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true
                })
            ])
        ).start();
    }, []);

    const opacity = shimmer.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7]
    });

    return (
        <View style={styles.walletCard}>
            <Animated.View style={[styles.label, { opacity }]} />
            <Animated.View style={[styles.balance, { opacity }]} />
            <View style={styles.buttonRow}>
                <Animated.View style={[styles.button, { opacity }]} />
                <Animated.View style={[styles.button, { opacity }]} />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    // Listing Card Skeleton
    card: {
        width: '48.5%',
        backgroundColor: '#fff',
        borderRadius: 8,
        marginBottom: 10,
        overflow: 'hidden',
        elevation: 2
    },
    imagePlaceholder: {
        height: 150,
        backgroundColor: '#E0E0E0',
    },
    textPlaceholder: {
        height: 14,
        backgroundColor: '#E0E0E0',
        margin: 10,
        borderRadius: 4
    },

    // List Item Skeleton
    listItem: {
        flexDirection: 'row',
        padding: 15,
        backgroundColor: '#fff',
        marginBottom: 1
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#E0E0E0'
    },
    content: {
        flex: 1,
        marginLeft: 15,
        justifyContent: 'center'
    },
    line: {
        height: 14,
        backgroundColor: '#E0E0E0',
        marginBottom: 8,
        borderRadius: 4
    },

    // Wallet Card Skeleton
    walletCard: {
        margin: 20,
        backgroundColor: '#2E7D32',
        borderRadius: 25,
        padding: 25,
        elevation: 10
    },
    label: {
        height: 16,
        width: 120,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 4,
        marginBottom: 10
    },
    balance: {
        height: 40,
        width: 180,
        backgroundColor: 'rgba(255,255,255,0.3)',
        borderRadius: 4,
        marginBottom: 25
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 15
    },
    button: {
        flex: 1,
        height: 44,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 15
    }
});
