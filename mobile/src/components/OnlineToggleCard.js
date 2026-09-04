import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, ActivityIndicator } from 'react-native';
import * as Haptics from 'expo-haptics';
import { authApi } from '../api/auth';
import { getOnlinePreference, setOnlinePreference } from '../utils/collectorPresence';
import { useTheme, makeStyles } from '../theme/ThemeContext';


/**
 * Bolt/Uber driver-app style online toggle - the missing piece that lets a
 * collector actually see and control whether they're discoverable for new
 * pickup requests, instead of it happening silently in the background.
 */
export default function OnlineToggleCard({ location }) {
    const styles = useStyles();
    const { colors } = useTheme();
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
                    <View style={[styles.dot, { backgroundColor: online ? colors.accent : colors.textMuted }]} />
                    <Text style={styles.title}>{online ? "You're Online" : "You're Offline"}</Text>
                </View>
                <Text style={styles.subtitle}>
                    {online ? 'Nearby pickup requests will come to you.' : 'Go online to start receiving requests.'}
                </Text>
            </View>

            {busy || isOnline === null ? (
                <ActivityIndicator color={colors.accent} />
            ) : (
                <Switch
                    value={online}
                    onValueChange={handleToggle}
                    trackColor={{ false: colors.border, true: colors.accentSoft }}
                    thumbColor={online ? colors.accent : colors.surface}
                    ios_backgroundColor={colors.border}
                />
            )}
        </View>
    );
}

const useStyles = makeStyles((c) => ({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: c.surface,
        borderRadius: 20,
        padding: 18,
        marginBottom: 16,
        borderWidth: 1.5,
    },
    cardOnline: {
        borderColor: c.accent,
    },
    cardOffline: {
        borderColor: c.borderSubtle,
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
        color: c.text,
    },
    subtitle: {
        fontSize: 12,
        color: c.textSecondary,
    },
}));
