import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getTxnMeta, isCreditAmount, STATUS_LABELS } from '../utils/walletDisplay';
import { formatRelativeTime } from '../utils/dateFormat';
import { useTheme, makeStyles } from '../theme/ThemeContext';

export default function TransactionRow({ item }) {
    const styles = useStyles();
    const { colors } = useTheme();
    const { Icon, color } = getTxnMeta(item.transaction_type);
    const isCredit = isCreditAmount(item.amount);
    const statusMeta = STATUS_LABELS[item.status];

    return (
        <View style={styles.txnItem}>
            <View style={[styles.txnIconBox, { backgroundColor: `${color}1A` }]}>
                <Icon size={20} color={color} />
            </View>
            <View style={styles.txnContent}>
                <Text style={styles.txnTitle} numberOfLines={1}>
                    {item.transaction_type_display || item.transaction_type}
                </Text>
                <Text style={styles.txnSubtitle} numberOfLines={1}>
                    {item.description || formatRelativeTime(item.created_at)}
                </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.txnAmount, { color: isCredit ? colors.success : colors.danger }]}>
                    {isCredit ? '+' : '-'} ₵{Math.abs(parseFloat(item.amount)).toFixed(2)}
                </Text>
                {statusMeta ? (
                    <Text style={[styles.statusTag, { color: statusMeta.color }]}>{statusMeta.label}</Text>
                ) : (
                    <Text style={styles.txnTime}>{formatRelativeTime(item.created_at)}</Text>
                )}
            </View>
        </View>
    );
}

const useStyles = makeStyles((c) => ({
    txnItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 20,
        paddingHorizontal: 16,
        marginBottom: 12,
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 5,
        elevation: 1,
    },
    txnIconBox: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    txnContent: {
        flex: 1,
        marginRight: 10,
    },
    txnTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: c.text,
        marginBottom: 4,
    },
    txnSubtitle: {
        fontSize: 13,
        color: c.textSecondary,
    },
    txnAmount: {
        fontSize: 15,
        fontWeight: '700',
    },
    txnTime: {
        fontSize: 12,
        color: c.textMuted,
        marginTop: 4,
    },
    statusTag: {
        fontSize: 11,
        fontWeight: '700',
        marginTop: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
}));
