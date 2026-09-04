import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme, makeStyles } from '../theme/ThemeContext';

/**
 * The app's single header treatment.
 *
 * Five screens previously used a dark curved header while ten used a flat
 * white one, so moving between them (Profile -> Edit Profile vs Profile ->
 * Transaction History) switched visual language mid-flow. Everything now
 * routes through this.
 *
 * `right` renders an optional trailing control; when omitted a spacer keeps
 * the title optically centred.
 */
export default function ScreenHeader({ title, onBack, right, borderless = false }) {
    const styles = useStyles();
    const { colors } = useTheme();
    return (
        <SafeAreaView edges={['top']} style={[styles.header, borderless && styles.borderless]}>
            {onBack ? (
                <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.6}>
                    <ArrowLeft size={22} color={colors.text} strokeWidth={2.5} />
                </TouchableOpacity>
            ) : (
                <View style={styles.slot} />
            )}

            <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>

            {right ? <View style={styles.rightSlot}>{right}</View> : <View style={styles.slot} />}
        </SafeAreaView>
    );
}

const useStyles = makeStyles((c) => ({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 14,
        backgroundColor: c.surface,
        borderBottomWidth: 1,
        borderBottomColor: c.borderSubtle,
    },
    borderless: {
        borderBottomWidth: 0,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: c.surfaceSunken,
        alignItems: 'center',
        justifyContent: 'center',
    },
    slot: {
        width: 40,
    },
    rightSlot: {
        minWidth: 40,
        alignItems: 'flex-end',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontSize: 17,
        fontWeight: '700',
        color: c.text,
        marginHorizontal: 8,
    },
}));
