import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Truck, ChevronRight, Search } from 'lucide-react-native';
import { useTheme, makeStyles } from '../theme/ThemeContext';


/**
 * Bolt-style "you have something in progress" takeover for the Home
 * screen - surfaces an active or pending pickup right where the user
 * lands, instead of only inside the Pickups tab.
 */
export default function ActivePickupBanner({ job, role, onPress }) {
    const styles = useStyles();
    const { colors } = useTheme();
    const pulseAnim = useRef(new Animated.Value(0.4)).current;
    const isPending = job.status === 'PENDING';

    useEffect(() => {
        if (!isPending) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0.4, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [isPending]);

    const isCollectorView = role === 'COLLECTOR' || role === 'RECYCLER';

    const getCopy = () => {
        if (job.status === 'PENDING') {
            return isCollectorView
                ? { title: 'New request pending', subtitle: `${job.material_type || 'Waste'} pickup awaiting your acceptance` }
                : { title: 'Finding you a collector', subtitle: `${job.material_type || 'Your'} pickup request is out to nearby collectors` };
        }
        if (job.status === 'ARRIVED') {
            return isCollectorView
                ? { title: "You've arrived", subtitle: 'Confirm the pickup to complete this job' }
                : { title: 'Collector has arrived', subtitle: 'They are waiting at your pickup location' };
        }
        // ACCEPTED
        return isCollectorView
            ? { title: 'Pickup in progress', subtitle: `Head to the ${job.material_type || 'waste'} pickup location` }
            : { title: 'Collector is on the way', subtitle: job.collector_name ? `${job.collector_name} is en route to you` : 'Your collector is en route' };
    };

    const { title, subtitle } = getCopy();

    return (
        <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
            <View style={styles.iconBox}>
                {isPending ? (
                    <Animated.View style={{ opacity: pulseAnim }}>
                        <Search size={22} color={colors.onPrimary} />
                    </Animated.View>
                ) : (
                    <Truck size={22} color={colors.onPrimary} />
                )}
            </View>
            <View style={styles.textBlock}>
                <Text style={styles.title}>{title}</Text>
                <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
            </View>
            <ChevronRight size={20} color={colors.onPrimary} />
        </TouchableOpacity>
    );
}

const useStyles = makeStyles((c) => ({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: c.accent,
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    textBlock: {
        flex: 1,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: c.onPrimary,
        marginBottom: 2,
    },
    subtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.85)',
    },
}));
