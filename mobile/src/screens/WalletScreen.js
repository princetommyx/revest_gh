import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    FlatList, ActivityIndicator, Modal,
    TextInput, ScrollView, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallet, useOptimisticDeposit, useOptimisticWithdraw, useVerifyPayment } from '../hooks/useWallet';
import { SkeletonWalletCard } from '../components/Skeleton';
import {
    Wallet, Plus, ArrowUpRight,
    ArrowDownLeft, History, X,
    Smartphone, CheckCircle2, AlertCircle
} from 'lucide-react-native';
import Toast from 'react-native-root-toast';

const NETWORKS = [
    { id: 'MTN', name: 'MTN MoMo', color: '#FFCC00' },
    { id: 'VOD', name: 'Vodafone Cash', color: '#E60000' },
    { id: 'ATL', name: 'AirtelTigo Money', color: '#003399' },
];

export default function WalletScreen() {
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

    const renderTransaction = ({ item }) => (
        <View style={styles.transactionCard}>
            <View style={[styles.iconBox, { backgroundColor: item.transaction_type === 'DEPOSIT' ? '#E8F5E9' : '#FFEBEE' }]}>
                {item.transaction_type === 'DEPOSIT' ? (
                    <ArrowDownLeft size={20} color="#2E7D32" />
                ) : (
                    <ArrowUpRight size={20} color="#C62828" />
                )}
            </View>
            <View style={styles.transactionInfo}>
                <Text style={styles.transactionType}>{item.transaction_type}</Text>
                <Text style={styles.transactionDesc} numberOfLines={1}>{item.description}</Text>
                <Text style={styles.transactionDate}>{new Date(item.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.transactionAmount, { color: item.transaction_type === 'DEPOSIT' ? '#2E7D32' : '#C62828' }]}>
                    {item.transaction_type === 'DEPOSIT' ? '+' : '-'} {parseFloat(item.amount).toFixed(2)}
                </Text>
                <View style={[styles.statusTag, { backgroundColor: item.status === 'COMPLETED' ? '#E8F5E9' : '#FFF3E0' }]}>
                    <Text style={[styles.statusText, { color: item.status === 'COMPLETED' ? '#2E7D32' : '#E65100' }]}>{item.status}</Text>
                </View>
            </View>
        </View>
    );

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
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => { setModalType('DEPOSIT'); setModalVisible(true); }}
                        >
                            <Plus size={20} color="#fff" />
                            <Text style={styles.actionText}>Top Up</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }]}
                            onPress={() => { setModalType('WITHDRAW'); setModalVisible(true); }}
                        >
                            <ArrowUpRight size={20} color="#fff" />
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
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{modalType === 'DEPOSIT' ? 'MoMo Top Up' : 'MoMo Withdrawal'}</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}><X size={24} color="#666" /></TouchableOpacity>
                        </View>

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
                                style={styles.input}
                                keyboardType="phone-pad"
                                placeholder="024XXXXXXX"
                                value={phone}
                                onChangeText={setPhone}
                            />
                        </View>

                        {modalType === 'WITHDRAW' && (
                            <>
                                <Text style={styles.inputLabel}>Account Name</Text>
                                <TextInput
                                    style={[styles.input, styles.standaloneInput]}
                                    placeholder="Enter registered MoMo name"
                                    value={accountName}
                                    onChangeText={setAccountName}
                                />
                            </>
                        )}

                        <Text style={styles.inputLabel}>Amount (GHS)</Text>
                        <TextInput
                            style={[styles.input, styles.standaloneInput, { fontSize: 24, fontWeight: 'bold' }]}
                            keyboardType="numeric"
                            placeholder="0.00"
                            value={amount}
                            onChangeText={setAmount}
                        />

                        <TouchableOpacity style={styles.confirmButton} onPress={handleAction} disabled={depositMutation.isPending || withdrawMutation.isPending}>
                            {(depositMutation.isPending || withdrawMutation.isPending) ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmButtonText}>Confirm {modalType === 'DEPOSIT' ? 'Deposit' : 'Withdraw'}</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8f9fa' },
    header: { padding: 20, backgroundColor: '#fff' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    balanceCard: {
        margin: 20,
        backgroundColor: '#2E7D32',
        borderRadius: 25,
        padding: 25,
        elevation: 10,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10
    },
    balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginBottom: 5 },
    balanceValue: { color: '#fff', fontSize: 40, fontWeight: 'bold', marginBottom: 25 },
    actionRow: { flexDirection: 'row', gap: 15 },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 14,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8
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
    historyHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    historyTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
    transactionCard: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2
    },
    iconBox: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    transactionInfo: { flex: 1, marginLeft: 15 },
    transactionType: { fontSize: 15, fontWeight: 'bold', color: '#1a1a1a' },
    transactionDesc: { fontSize: 12, color: '#666', marginTop: 2 },
    transactionDate: { fontSize: 11, color: '#999', marginTop: 4 },
    transactionAmount: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
    statusTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
    statusText: { fontSize: 10, fontWeight: 'bold' },

    emptyBox: { alignItems: 'center', marginTop: 50, opacity: 0.5 },
    emptyText: { color: '#999', fontSize: 16, marginTop: 10 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, paddingBottom: 40 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
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
        backgroundColor: '#f1f3f5',
        borderRadius: 15,
        paddingHorizontal: 15,
        marginBottom: 15
    },
    input: { flex: 1, padding: 15, fontSize: 16, color: '#000' },
    standaloneInput: { backgroundColor: '#f1f3f5', borderRadius: 15, marginBottom: 15, paddingHorizontal: 15 },
    confirmButton: { backgroundColor: '#2E7D32', padding: 18, borderRadius: 18, alignItems: 'center', marginTop: 10 },
    confirmButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
