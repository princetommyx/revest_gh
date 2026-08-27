import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { authApi } from '../api/auth';
import { getOnlinePreference, setOnlinePreference } from '../utils/collectorPresence';

const BRAND_GREEN = '#059669';

/**
 * Bolt/Uber driver-app style online toggle - the missing piece that lets a
 * collector actually see and control whether they're discoverable for new
 * pickup requests, instead of it happening silently in the background.
 */
export default function OnlineToggleCard({ location }) {
    const [isOnline, setIsOnline] = useState(null); // null = loading
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        getOnlinePreference().then(setIsOnline);
    }, []);

    const coordsOf = (loc) => (loc?.coords ? loc.coords : loc);

    const handleToggle = async (next) => {
        setIsOnline(next);
        setBusy(true);
        Haptics.impactAsync(next ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
        await setOnlinePreference(next);

        const coords = coordsOf(location);
        try {
            if (coords?.latitude && coords?.longitude) {
                await authApi.updateMyLocation({ latitude: coords.latitude, longitude: coords.longitude, is_online: next });
            }
        } catch (e) {
            console.warn('Failed to update online status:', e?.message);
        } finally {
            setBusy(false);
        }
    };

    const online = !!isOnline;

    return (
        <View style={[styles.card, online ? styles.cardOnline : styles.cardOffline]}>
            <View style={styles.textBlock}>
                <View style={styles.statusRow}>
                    <View style={[styles.dot, { backgroundColor: online ? BRAND_GREEN : '#9CA3AF' }]} />
                    <Text style={styles.title}>{online ? "You're Online" : "You're Offline"}</Text>
                </View>
                <Text style={styles.subtitle}>
                    {online ? 'Nearby pickup requests will come to you.' : 'Go online to start receiving requests.'}
                </Text>
            </View>

            {busy || isOnline === null ? (
                <ActivityIndicator color={BRAND_GREEN} />
            ) : (
                <Switch
                    value={online}
                    onValueChange={handleToggle}
                    trackColor={{ false: '#E5E7EB', true: '#A7F3D0' }}
                    thumbColor={online ? BRAND_GREEN : '#f4f3f4'}
                    ios_backgroundColor="#E5E7EB"
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1.5,
    },
    cardOnline: {
        borderColor: '#A7F3D0',
    },
    cardOffline: {
        borderColor: '#F3F4F6',
    },
    textBlock: {
        flex: 1,
        marginRight: 12,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#111',
    },
    subtitle: {
        fontSize: 12,
        color: '#6B7280',
    },
});
