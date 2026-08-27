import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, Easing, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * Skeleton loading component - replaces spinners for better UX
 * Shows content placeholder while data loads
 */

/**
 * Shimmer box - a placeholder block with a light sweeping highlight
 * (Bolt/Uber-style shimmer) instead of a flat opacity pulse.
 */
const ShimmerBox = ({ style }) => {
    const translateX = useRef(new Animated.Value(0)).current;
    const [width, setWidth] = useState(0);

    useEffect(() => {
        if (!width) return;
        translateX.setValue(-width);
        const loop = Animated.loop(
            Animated.timing(translateX, {
                toValue: width,
                duration: 1100,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: true,
            })
        );
        loop.start();
        return () => loop.stop();
    }, [width]);

    return (
        <View style={[styles.shimmerBase, style]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
            {width > 0 && (
                <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
                    <LinearGradient
                        colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={StyleSheet.absoluteFill}
                    />
                </Animated.View>
            )}
        </View>
    );
};

export const SkeletonCard = ({ style }) => (
    <View style={[styles.card, style]}>
        <ShimmerBox style={styles.imagePlaceholder} />
        <ShimmerBox style={styles.textPlaceholder} />
        <ShimmerBox style={[styles.textPlaceholder, { width: '70%' }]} />
        <ShimmerBox style={[styles.textPlaceholder, { width: '50%' }]} />
    </View>
);

/**
 * Small skeleton for list items
 */
export const SkeletonListItem = () => (
    <View style={styles.listItem}>
        <ShimmerBox style={styles.avatar} />
        <View style={styles.content}>
            <ShimmerBox style={styles.line} />
            <ShimmerBox style={[styles.line, { width: '60%' }]} />
        </View>
    </View>
);

/**
 * Wallet Screen Skeleton
 */
export const SkeletonWalletPage = () => (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
        {/* Header */}
        <View style={{ padding: 24, paddingVertical: 16 }}>
            <ShimmerBox style={{ width: 100, height: 30, backgroundColor: '#E0E0E0', borderRadius: 4 }} />
        </View>

        {/* Balance Section */}
        <View style={{ alignItems: 'center', paddingVertical: 32 }}>
            <ShimmerBox style={{ width: 100, height: 16, backgroundColor: '#E0E0E0', borderRadius: 4, marginBottom: 16 }} />
            <ShimmerBox style={{ width: 200, height: 60, backgroundColor: '#E0E0E0', borderRadius: 8 }} />
        </View>

        {/* Actions Row */}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 32, marginBottom: 40 }}>
            {[1, 2, 3].map(i => (
                <View key={i} style={{ alignItems: 'center', gap: 8 }}>
                    <ShimmerBox style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: '#E0E0E0' }} />
                    <ShimmerBox style={{ width: 40, height: 12, borderRadius: 4, backgroundColor: '#E0E0E0' }} />
                </View>
            ))}
        </View>

        {/* Transactions */}
        <View style={{ paddingHorizontal: 24 }}>
            <ShimmerBox style={{ width: 150, height: 24, backgroundColor: '#E0E0E0', borderRadius: 4, marginBottom: 24 }} />

            {[1, 2, 3, 4].map(i => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 16 }}>
                    <ShimmerBox style={{ width: 48, height: 48, borderRadius: 16, backgroundColor: '#E0E0E0' }} />
                    <View style={{ flex: 1 }}>
                        <ShimmerBox style={{ width: '60%', height: 16, backgroundColor: '#E0E0E0', borderRadius: 4, marginBottom: 8 }} />
                        <ShimmerBox style={{ width: '40%', height: 12, backgroundColor: '#E0E0E0', borderRadius: 4 }} />
                    </View>
                </View>
            ))}
        </View>
    </View>
);
/**
 * Wallet balance skeleton (Legacy)
 */
export const SkeletonWalletCard = () => (
    <View style={styles.walletCard}>
        <ShimmerBox style={styles.label} />
        <ShimmerBox style={styles.balance} />
        <View style={styles.buttonRow}>
            <ShimmerBox style={styles.button} />
            <ShimmerBox style={styles.button} />
        </View>
    </View>
);

const styles = StyleSheet.create({
    shimmerBase: {
        backgroundColor: '#E5E7EB',
        overflow: 'hidden',
    },

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
        backgroundColor: '#111',
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
