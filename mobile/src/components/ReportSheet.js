import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal,
    TextInput, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { X, Check, Flag } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { moderationApi, REPORT_REASONS } from '../api/moderation';
import { useTheme, makeStyles } from '../theme/ThemeContext';

/**
 * One report flow shared by every user-generated surface - a chat message, a
 * marketplace listing, or a user. Google Play requires reporting to be
 * reachable from the content itself, so this is designed to be dropped in
 * next to whatever is being reported rather than living on its own screen.
 *
 * Props:
 *   visible, onClose
 *   targetType: 'USER' | 'LISTING' | 'MESSAGE'
 *   targetId
 *   targetLabel: what the user sees they're reporting ("Kwame", "this listing")
 *   onReported: optional callback after a successful report
 */
export default function ReportSheet({ visible, onClose, targetType, targetId, targetLabel, onReported }) {
    const styles = useStyles();
    const { colors } = useTheme();
    const [reason, setReason] = useState(null);
    const [details, setDetails] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const close = () => {
        setReason(null);
        setDetails('');
        onClose?.();
    };

    const submit = async () => {
        if (!reason) return;
        setSubmitting(true);
        try {
            await moderationApi.report({ targetType, targetId, reason, details });
            close();
            Toast.show({
                type: 'success',
                text1: 'Report submitted',
                text2: 'Thanks - our team will review this.',
            });
            onReported?.();
        } catch (error) {
            const data = error.response?.data;
            const detail = data?.detail
                || (data && typeof data === 'object' ? Object.values(data).flat()[0] : null);
            Toast.show({
                type: 'error',
                text1: 'Could not submit report',
                text2: typeof detail === 'string' ? detail : 'Please try again.',
            });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={styles.overlay}>
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={close} />
                    <View style={styles.sheet}>
                        <View style={styles.headerRow}>
                            <View style={styles.titleWrap}>
                                <View style={styles.iconBox}>
                                    <Flag size={16} color={colors.warning} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.title}>Report {targetLabel}</Text>
                                    <Text style={styles.subtitle}>Tell us what's wrong. Reports are confidential.</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={close} style={styles.closeBtn}>
                                <X size={18} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                            {REPORT_REASONS.map(r => {
                                const active = reason === r.id;
                                return (
                                    <TouchableOpacity
                                        key={r.id}
                                        style={[styles.reasonRow, active && styles.reasonRowActive]}
                                        onPress={() => setReason(r.id)}
                                    >
                                        <Text style={[styles.reasonText, active && styles.reasonTextActive]}>
                                            {r.label}
                                        </Text>
                                        {active && <Check size={18} color={colors.text} />}
                                    </TouchableOpacity>
                                );
                            })}

                            <TextInput
                                style={styles.detailsInput}
                                placeholder="Add any details (optional)"
                                placeholderTextColor={colors.textMuted}
                                value={details}
                                onChangeText={setDetails}
                                multiline
                                maxLength={1000}
                            />
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.submitBtn, (!reason || submitting) && styles.submitBtnDisabled]}
                            onPress={submit}
                            disabled={!reason || submitting}
                        >
                            {submitting
                                ? <ActivityIndicator color={colors.onPrimary} />
                                : <Text style={styles.submitBtnText}>Submit report</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const useStyles = makeStyles((c) => ({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: {
        backgroundColor: c.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: Platform.OS === 'ios' ? 34 : 20,
        maxHeight: '85%',
    },
    headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
    titleWrap: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, flex: 1 },
    iconBox: {
        width: 34, height: 34, borderRadius: 10, backgroundColor: c.warningSoft,
        alignItems: 'center', justifyContent: 'center',
    },
    title: { fontSize: 17, fontWeight: '800', color: c.text, marginBottom: 2 },
    subtitle: { fontSize: 13, color: c.textSecondary, lineHeight: 18 },
    closeBtn: {
        width: 30, height: 30, borderRadius: 15, backgroundColor: c.surfaceSunken,
        alignItems: 'center', justifyContent: 'center', marginLeft: 8,
    },
    reasonRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderWidth: 1.5, borderColor: c.borderSubtle, borderRadius: 14,
        paddingHorizontal: 16, paddingVertical: 14, marginBottom: 10,
    },
    reasonRowActive: { borderColor: c.primary, backgroundColor: c.bg },
    reasonText: { fontSize: 14.5, color: c.textSecondary },
    reasonTextActive: { color: c.text, fontWeight: '700' },
    detailsInput: {
        borderWidth: 1.5, borderColor: c.borderSubtle, borderRadius: 14,
        paddingHorizontal: 16, paddingVertical: 12, minHeight: 88,
        fontSize: 14.5, color: c.text, textAlignVertical: 'top', marginTop: 4, marginBottom: 8,
    },
    submitBtn: {
        backgroundColor: c.primary, borderRadius: 16, paddingVertical: 16,
        alignItems: 'center', marginTop: 12,
    },
    submitBtnDisabled: { opacity: 0.4 },
    submitBtnText: { color: c.onPrimary, fontSize: 15.5, fontWeight: '700' },
}));
