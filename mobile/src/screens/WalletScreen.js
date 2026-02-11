import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, ActivityIndicator, Modal,
    TextInput, ScrollView, Linking, KeyboardAvoidingView, Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallet, useOptimisticDeposit, useOptimisticWithdraw, useVerifyPayment } from '../hooks/useWallet';
import { useAuth } from '../context/AuthContext';
import { SkeletonWalletCard } from '../components/Skeleton';
import {
    Wallet, Plus, ArrowUpRight,
    ArrowDownLeft, History, X,
    Smartphone, CheckCircle2, AlertCircle
} from 'lucide-react-native';
import Toast from 'react-native-root-toast';

const NETWORKS = [
    { id: 'MTN', name: 'MTN MoMo', color: '#FFCC00' },
    { id: 'TEL', name: 'Telecel Cash', color: '#E60000' },
    { id: 'ATL', name: 'AirtelTigo Money', color: '#003399' },
];

export default function WalletScreen() {
    const { userRole, user } = useAuth();
    const navigation = useNavigation();
    // React Query hooks with optimistic updates
    const { data: wallet, isLoading } = useWallet();
    const depositMutation = useOptimisticDeposit();
    const withdrawMutation = useOptimisticWithdraw();
    const verifyMutation = useVerifyPayment();

    const [modalVisible, setModalVisible] = useState(false);
    const [modalType, setModalType] = useState('DEPOSIT');

    // Form fields
    const [amount, setAmount] = useState('');
    const [phone, setPhone] = useState('');
    const [network, setNetwork] = useState('MTN');
    const [accountName, setAccountName] = useState('');

    // Refs for keyboard navigation
    const phoneInputRef = useRef(null);
    const accountNameInputRef = useRef(null);
    const amountInputRef = useRef(null);

    // Payment status
    const [pendingTxn, setPendingTxn] = useState(null);

    const handleAction = () => {
        if (!amount || isNaN(amount) || parseFloat(amount) < 1) {
            Toast.show("Minimum amount is 1.00", { backgroundColor: '#E74C3C' });
            return;
        }
        if (!phone || phone.length < 10) {
            Toast.show("Please enter a valid MoMo number", { backgroundColor: '#E74C3C' });
            return;
        }

        const payload = {
            amount: parseFloat(amount),
            phone_number: phone,
            network: network
        };

        if (modalType === 'DEPOSIT') {
            depositMutation.mutate(payload, {
                onSuccess: (res) => {
                    setPendingTxn(res.transaction);
                    setModalVisible(false);
                    if (res.authorization_url) {
                        Toast.show("Redirecting to secure payment...", { backgroundColor: '#2E7D32' });
                        setTimeout(() => Linking.openURL(res.authorization_url), 1000);
                    }
                }
            });
        } else {
            if (!accountName) {
                Toast.show("Account name is required for withdrawal", { backgroundColor: '#E74C3C' });
                return;
            }
            withdrawMutation.mutate({ ...payload, account_name: accountName }, {
                onSuccess: () => {
                    setModalVisible(false);
                    setAmount('');
                }
            });
        }
    };

    const verifyTopUp = () => {
        if (!pendingTxn) return;
        verifyMutation.mutate(pendingTxn.reference, {
            onSuccess: (result) => {
                if (result?.verified) {
                    setPendingTxn(null);
                    setAmount('');
                    setPhone('');
                }
            }
        });
    };

    const renderTransaction = ({ item }) => {
        // Determine type-based styles
        let isCredit = ['DEPOSIT', 'JOB_EARNING'].includes(item.transaction_type);
        let iconColor = isCredit ? '#2E7D32' : '#C62828';
        let bgColor = isCredit ? '#E8F5E9' : '#FFEBEE';
        let sign = isCredit ? '+' : '-';

        return (
            <View style={styles.transactionCard}>
                <View style={[styles.iconBox, { backgroundColor: bgColor }]}>
                    {isCredit ? (
                        <ArrowDownLeft size={20} color={iconColor} />
                    ) : (
                        <ArrowUpRight size={20} color={iconColor} />
                    )}
                </View>
                <View style={styles.transactionInfo}>
                    <Text style={styles.transactionType}>
                        {item.transaction_type.replace('_', ' ')}
                    </Text>
                    <Text style={styles.transactionDesc} numberOfLines={1}>{item.description}</Text>
                    <Text style={styles.transactionDate}>
                        {new Date(item.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.transactionAmount, { color: iconColor }]}>
                        {sign} {parseFloat(item.amount).toFixed(2)}
                    </Text>
                    <View style={[styles.statusTag, { backgroundColor: item.status === 'COMPLETED' ? '#E8F5E9' : '#FFF3E0' }]}>
                        <Text style={[styles.statusText, { color: item.status === 'COMPLETED' ? '#2E7D32' : '#E65100' }]}>
                            {item.status}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    // Skeleton loading state - no spinner!
    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>My Wallet</Text>
                </View>
                <SkeletonWalletCard />
            </SafeAreaView>
        );
    }

    const transactions = wallet?.recent_transactions || [];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>My Wallet</Text>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 30 }}>
                <View style={styles.balanceCard}>
                    <Text style={styles.balanceLabel}>Current Balance</Text>
                    <Text style={styles.balanceValue}>
                        {wallet?.currency || 'GHS'} {parseFloat(wallet?.balance || 0).toFixed(2)}
                    </Text>
                    <View style={styles.actionRow}>
                        {userRole === 'COLLECTOR' && (
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => navigation.navigate('TopUp', { user })}
                            >
                                <Plus size={20} color="#fff" />
                                <Text style={styles.actionText}>Top Up</Text>
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => { setModalType('WITHDRAW'); setModalVisible(true); }}
                        >
                            <ArrowUpRight size={20} color="#2E7D32" />
                            <Text style={styles.actionText}>Withdraw</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {pendingTxn && (
                    <View style={styles.pendingCard}>
                        <View style={styles.pendingInfo}>
                            <AlertCircle size={20} color="#E65100" />
                            <Text style={styles.pendingText}>Top-up of ₵{parseFloat(pendingTxn.amount).toFixed(2)} is pending</Text>
                        </View>
                        <TouchableOpacity style={styles.verifyBtn} onPress={verifyTopUp} disabled={verifyMutation.isPending}>
                            {verifyMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.verifyBtnText}>Verify Payment</Text>}
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.historySection}>
                    <View style={styles.historyHeader}>
                        <History size={20} color="#666" />
                        <Text style={styles.historyTitle}>Recent Transactions</Text>
                    </View>

                    {transactions.length === 0 ? (
                        <View style={styles.emptyBox}>
                            <Wallet size={50} color="#eee" />
                            <Text style={styles.emptyText}>No transactions yet.</Text>
                        </View>
                    ) : (
                        transactions.map(item => renderTransaction({ item }))
                    )}
                </View>
            </ScrollView>

            <Modal animationType="slide" transparent={true} visible={modalVisible}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{modalType === 'DEPOSIT' ? 'MoMo Top Up' : 'MoMo Withdrawal'}</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)}><X size={24} color="#666" /></TouchableOpacity>
                            </View>

                            <ScrollView
                                keyboardShouldPersistTaps="handled"
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingBottom: 20 }}
                            >
                                <Text style={styles.inputLabel}>Select Network</Text>
                                <View style={styles.networkRow}>
                                    {NETWORKS.map(net => (
                                        <TouchableOpacity
                                            key={net.id}
                                            style={[styles.netChip, network === net.id && { borderColor: net.color, backgroundColor: net.color + '10' }]}
                                            onPress={() => setNetwork(net.id)}
                                        >
                                            <View style={[styles.netDot, { backgroundColor: net.color }]} />
                                            <Text style={[styles.netName, network === net.id && { color: '#000', fontWeight: 'bold' }]}>{net.name}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                <Text style={styles.inputLabel}>MoMo Number</Text>
                                <View style={styles.inputBox}>
                                    <Smartphone size={18} color="#888" />
                                    <TextInput
                                        ref={phoneInputRef}
                                        style={styles.input}
                                        keyboardType="phone-pad"
                                        placeholder="024XXXXXXX"
                                        value={phone}
                                        onChangeText={setPhone}
                                        returnKeyType="next"
                                        onSubmitEditing={() => {
                                            if (modalType === 'WITHDRAW') {
                                                // Focus account name if withdrawal
                                                accountNameInputRef.current?.focus();
                                            } else {
                                                // Focus amount if deposit
                                                amountInputRef.current?.focus();
                                            }
                                        }}
                                        blurOnSubmit={false}
                                    />
                                </View>

                                {modalType === 'WITHDRAW' && (
                                    <>
                                        <Text style={styles.inputLabel}>Account Name</Text>
                                        <TextInput
                                            ref={accountNameInputRef}
                                            style={[styles.input, styles.standaloneInput]}
                                            placeholder="Enter registered MoMo name"
                                            value={accountName}
                                            onChangeText={setAccountName}
                                            returnKeyType="next"
                                            onSubmitEditing={() => amountInputRef.current?.focus()}
                                            blurOnSubmit={false}
                                        />
                                    </>
                                )}

                                <Text style={styles.inputLabel}>Amount (GHS)</Text>
                                <TextInput
                                    ref={amountInputRef}
                                    style={[styles.input, styles.standaloneInput, { fontSize: 24, fontWeight: 'bold' }]}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                    value={amount}
                                    onChangeText={setAmount}
                                    returnKeyType="done"
                                    blurOnSubmit={true}
                                />

                                <TouchableOpacity style={styles.confirmButton} onPress={handleAction} disabled={depositMutation.isPending || withdrawMutation.isPending}>
                                    {(depositMutation.isPending || withdrawMutation.isPending) ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Confirm {modalType === 'DEPOSIT' ? 'Deposit' : 'Withdraw'}</Text>}
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0'
    },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#1A1A1A' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    balanceCard: {
        marginHorizontal: 20,
        marginTop: 20,
        marginBottom: 24,
        backgroundColor: '#2E7D32',
        borderRadius: 24,
        padding: 28,
        elevation: 8,
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 16
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 14,
        marginBottom: 8,
        letterSpacing: 0.5,
        textTransform: 'uppercase'
    },
    balanceValue: {
        color: '#fff',
        fontSize: 44,
        fontWeight: 'bold',
        marginBottom: 28,
        letterSpacing: -1
    },
    actionRow: { flexDirection: 'row', gap: 12 },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    actionText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 15 },

    pendingCard: {
        marginHorizontal: 20,
        marginBottom: 20,
        backgroundColor: '#FFF3E0',
        borderRadius: 15,
        padding: 15,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FFE0B2'
    },
    pendingInfo: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    pendingText: { fontSize: 13, color: '#E65100', fontWeight: '500' },
    verifyBtn: { backgroundColor: '#E65100', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    verifyBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },

    historySection: { flex: 1, paddingHorizontal: 20 },
    historyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
        marginTop: 8
    },
    historyTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
    transactionCard: {
        backgroundColor: '#fff',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8
    },
    iconBox: {
        width: 52,
        height: 52,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center'
    },
    transactionInfo: { flex: 1, marginLeft: 16 },
    transactionType: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 4
    },
    transactionDesc: { fontSize: 13, color: '#666', marginTop: 2 },
    transactionDate: { fontSize: 11, color: '#999', marginTop: 6 },
    transactionAmount: { fontSize: 17, fontWeight: 'bold', marginBottom: 6 },
    statusTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8
    },
    statusText: { fontSize: 10, fontWeight: 'bold', letterSpacing: 0.5 },

    emptyBox: {
        alignItems: 'center',
        marginTop: 80,
        opacity: 0.6,
        paddingHorizontal: 40
    },
    emptyText: {
        color: '#999',
        fontSize: 16,
        marginTop: 16,
        textAlign: 'center'
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end'
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 28,
        paddingBottom: 40
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 28
    },
    modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },
    inputLabel: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 12, marginTop: 10 },
    networkRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
    netChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 10,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#f1f3f5',
        gap: 6
    },
    netDot: { width: 8, height: 8, borderRadius: 4 },
    netName: { fontSize: 11, color: '#888' },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 16,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E8E8E8'
    },
    input: { flex: 1, padding: 16, fontSize: 16, color: '#1A1A1A' },
    standaloneInput: {
        backgroundColor: '#F8F9FA',
        borderRadius: 16,
        marginBottom: 16,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: '#E8E8E8'
    },
    confirmButton: {
        backgroundColor: '#2E7D32',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 12,
        elevation: 4,
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8
    },
    confirmButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: 'bold',
        letterSpacing: 0.5
    },
});
