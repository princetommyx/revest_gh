import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Smartphone, Sun, Moon } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useTheme, makeStyles } from '../theme/ThemeContext';

const OPTIONS = [
    { id: 'system', label: 'System', icon: Smartphone },
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
];

/**
 * Segmented System / Light / Dark control. "System" is the default and the
 * first option deliberately - most people want the app to follow the phone,
 * and only reach for an override when it doesn't.
 */
export default function AppearanceToggle() {
    const { mode, setMode, colors } = useTheme();
    const styles = useStyles();

    return (
        <View style={styles.wrap}>
            {OPTIONS.map(opt => {
                const active = mode === opt.id;
                const Icon = opt.icon;
                return (
                    <TouchableOpacity
                        key={opt.id}
                        style={[styles.segment, active && styles.segmentActive]}
                        onPress={() => {
                            Haptics.selectionAsync();
                            setMode(opt.id);
                        }}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${opt.label} appearance`}
                    >
                        <Icon size={17} color={active ? colors.onPrimary : colors.textSecondary} />
                        <Text style={[styles.label, active && styles.labelActive]}>{opt.label}</Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const useStyles = makeStyles((c) => ({
    wrap: {
        flexDirection: 'row',
        backgroundColor: c.surfaceSunken,
        borderRadius: 14,
        padding: 4,
        gap: 4,
    },
    segment: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        paddingVertical: 11,
        borderRadius: 11,
    },
    segmentActive: {
        backgroundColor: c.primary,
    },
    label: {
        fontSize: 13.5,
        fontWeight: '600',
        color: c.textSecondary,
    },
    labelActive: {
        color: c.onPrimary,
        fontWeight: '700',
    },
}));
