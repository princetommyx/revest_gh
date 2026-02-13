import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Modal, TextInput, ScrollView,
    Linking, KeyboardAvoidingView, Platform, Dimensions, StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallet, useOptimisticDeposit, useOptimisticWithdraw, useVerifyPayment } from '../hooks/useWallet';
import { useAuth } from '../context/AuthContext';
import { SkeletonWalletCard } from '../components/Skeleton';
import {
    Wallet, Plus, ArrowUpRight, ArrowDownLeft,
    History, X, Smartphone, CheckCircle2, AlertCircle,
    ChevronRight, CreditCard, Banknote
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

const NETWORKS = [
    { id: 'MTN', name: 'MTN MoMo', color: '#FFCC00', textColor: '#000' },
    { id: 'TEL', name: 'Telecel Cash', color: '#E60000', textColor: '#fff' },
    { id: 'ATL', name: 'AirtelTigo', color: '#003399', textColor: '#fff' },
];

const COLORS = {
    primary: '#27AE60',
    primaryDark: '#1E8449',
    background: '#FFFFFF',
    surface: '#F8F9FA',
    text: '#1F2937',
    textLight: '#6B7280',
    border: '#E5E7EB',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    white: '#FFFFFF',
};

export default function WalletScreen() {
    const { userRole, user } = useAuth();
    const navigation = useNavigation();

    // React Query hooks
    const { data: wallet, isLoading, refetch } = useWallet();
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

    // Refs
    const phoneInputRef = useRef(null);
    const accountNameInputRef = useRef(null);
    const amountInputRef = useRef(null);

    // Payment status
    const [pendingTxn, setPendingTxn] = useState(null);

    const handleAction = () => {
        if (!amount || isNaN(amount) || parseFloat(amount) < 1) {
            Toast.show({ type: 'error', text1: 'Invalid Amount', text2: 'Minimum amount is 1.00' });
            return;
        }
        if (!phone || phone.length < 10) {
            Toast.show({ type: 'error', text1: 'Invalid Number', text2: 'Please enter a valid MoMo number' });
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
                        Toast.show({ type: 'info', text1: 'Redirecting...', text2: 'Opening payment page' });
                        setTimeout(() => Linking.openURL(res.authorization_url), 1000);
                    }
                },
                onError: (err) => {
                    Toast.show({ type: 'error', text1: 'Deposit Failed', text2: err.message || 'Something went wrong' });
                }
            });
        } else {
            if (!accountName) {
                Toast.show({ type: 'error', text1: 'Missing Info', text2: 'Account name is required' });
                return;
            }
            withdrawMutation.mutate({ ...payload, account_name: accountName }, {
                onSuccess: () => {
                    setModalVisible(false);
                    setAmount('');
                    setPhone('');
                    setAccountName('');
                    Toast.show({ type: 'success', text1: 'Withdrawal Initiated', text2: 'Funds will be sent shortly' });
                },
                onError: (e) => {
                    Toast.show({ type: 'error', text1: 'Withdrawal Failed', text2: e.message || 'Unknown error' });
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
                    Toast.show({ type: 'success', text1: 'Payment Verified', text2: 'Your wallet has been updated' });
                } else {
                    Toast.show({ type: 'error', text1: 'Not Verified Yet', text2: 'Please complete the payment first' });
                }
            }
        });
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' }).format(val).replace('GHS', '₵');
    };

    const renderTransaction = ({ item }) => {
        const isCredit = ['DEPOSIT', 'JOB_EARNING'].includes(item.transaction_type);
        const amountColor = isCredit ? COLORS.success : COLORS.text;
        const iconBg = isCredit ? '#ECFDF5' : '#F3F4F6';
        const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;
        const iconColor = isCredit ? COLORS.success : COLORS.textLight;

        return (
            <View style={styles.txnItem}>
                <View style={[styles.txnIconBox, { backgroundColor: iconBg }]}>
                    <Icon size={20} color={iconColor} />
                </View>
                <View style={styles.txnContent}>
                    <View style={styles.txnTopRow}>
                        <Text style={styles.txnTitle}>
                            {item.transaction_type.replace(/_/g, ' ')}
                        </Text>
                        <Text style={[styles.txnAmount, { color: amountColor }]}>
                            {isCredit ? '+' : '-'} {parseFloat(item.amount).toFixed(2)}
                        </Text>
                    </View>
                    <View style={styles.txnBottomRow}>
                        <Text style={styles.txnDate}>
                            {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <View style={[styles.statusBadge,
                        { backgroundColor: item.status === 'COMPLETED' ? '#ECFDF5' : item.status === 'PENDING' ? '#FFFBEB' : '#FEF2F2' }
                        ]}>
                            <Text style={[styles.statusText,
                            { color: item.status === 'COMPLETED' ? COLORS.success : item.status === 'PENDING' ? COLORS.warning : COLORS.error }
                            ]}>
                                {item.status}
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
        );
    };

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Wallet</Text>
                </View>
                <View style={{ padding: 20 }}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </SafeAreaView>
        );
    }

    const transactions = wallet?.recent_transactions || [];
    const balance = parseFloat(wallet?.balance || 0);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.background} />

            {/* Minimal Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Wallet</Text>
                {/* Could add Profile or Settings icon here */}
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshing={isLoading}
                onRefresh={refetch}
            >
                {/* Main Balance Section */}
                <View style={styles.balanceSection}>
                    <Text style={styles.balanceLabel}>Total Balance</Text>
                    <Text style={styles.balanceValue}>
                        <Text style={styles.currencySymbol}>₵</Text>
                        {balance.toFixed(2)}
                    </Text>
                </View>

                {/* Quick Actions */}
                <View style={styles.actionsRow}>
                    {userRole === 'COLLECTOR' && (
                        <TouchableOpacity style={styles.actionBtn} onPress={() => { setModalType('DEPOSIT'); setModalVisible(true); }}>
                            <View style={[styles.actionIconBox, { backgroundColor: COLORS.primary }]}>
                                <Plus size={24} color="#fff" />
                            </View>
                            <Text style={styles.actionLabel}>Top Up</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.actionBtn} onPress={() => { setModalType('WITHDRAW'); setModalVisible(true); }}>
                        <View style={[styles.actionIconBox, { backgroundColor: '#F3F4F6' }]}>
                            <ArrowUpRight size={24} color={COLORS.text} />
                        </View>
                        <Text style={styles.actionLabel}>Withdraw</Text>
                    </TouchableOpacity>

                    {/* Placeholder for future actions */}
                    <TouchableOpacity style={styles.actionBtn} onPress={() => Toast.show({ type: 'info', text1: 'Coming Soon', text2: 'More features on the way!' })}>
                        <View style={[styles.actionIconBox, { backgroundColor: '#F3F4F6' }]}>
                            <CreditCard size={24} color={COLORS.text} />
                        </View>
                        <Text style={styles.actionLabel}>Cards</Text>
                    </TouchableOpacity>
                </View>

                {/* Pending Transaction Alert */}
                {pendingTxn && (
                    <TouchableOpacity style={styles.verifyCard} onPress={verifyTopUp}>
                        <View style={styles.verifyContent}>
                            <View style={styles.verifyIconBox}>
                                <ActivityIndicator size="small" color="#fff" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.verifyTitle}>Payment Pending</Text>
                                <Text style={styles.verifySub}>Tap to verify top-up of ₵{parseFloat(pendingTxn.amount).toFixed(2)}</Text>
                            </View>
                            <ChevronRight size={20} color="#fff" />
                        </View>
                    </TouchableOpacity>
                )}

                {/* Transactions List */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                    {/* <TouchableOpacity><Text style={styles.seeAllText}>See All</Text></TouchableOpacity> */}
                </View>

                {transactions.length === 0 ? (
                    <View style={styles.emptyState}>
                        <View style={styles.emptyIconCircle}>
                            <History size={32} color={COLORS.textLight} />
                        </View>
                        <Text style={styles.emptyText}>No transactions yet</Text>
                        <Text style={styles.emptySub}>Your activity will appear here</Text>
                    </View>
                ) : (
                    <View style={styles.txnList}>
                        {transactions.map((item, index) => (
                            <React.Fragment key={item.id || index}>
                                {renderTransaction({ item })}
                                {index < transactions.length - 1 && <View style={styles.separator} />}
                            </React.Fragment>
                        ))}
                    </View>
                )}

            </ScrollView>

            {/* Universal Modal for Deposit/Withdraw */}
            <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity style={{ flex: 1 }} onPress={() => setModalVisible(false)} />

                        <View style={styles.modalContainer}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{modalType === 'DEPOSIT' ? 'Top Up Wallet' : 'Withdraw Funds'}</Text>
                                <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                                    <X size={20} color={COLORS.textLight} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

                                {/* Amount Input - Large & Clean */}
                                <View style={styles.amountInputContainer}>
                                    <Text style={styles.currencyPrefix}>₵</Text>
                                    <TextInput
                                        ref={amountInputRef}
                                        style={styles.largeAmountInput}
                                        placeholder="0.00"
                                        placeholderTextColor={COLORS.textLight}
                                        keyboardType="numeric"
                                        value={amount}
                                        onChangeText={setAmount}
                                        autoFocus
                                    />
                                </View>

                                {/* Network Selection */}
                                <Text style={styles.inputLabel}>Select Provider</Text>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.networkScroll}>
                                    {NETWORKS.map(net => (
                                        <TouchableOpacity
                                            key={net.id}
                                            style={[
                                                styles.netCard,
                                                network === net.id && { borderColor: net.color, backgroundColor: net.color + '10' }
                                            ]}
                                            onPress={() => setNetwork(net.id)}
                                        >
                                            <View style={[styles.netDot, { backgroundColor: net.color }]} />
                                            <Text style={[styles.netName, network === net.id && { color: COLORS.text, fontWeight: '600' }]}>
                                                {net.name}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>

                                {/* Phone Field */}
                                <View style={styles.fieldContainer}>
                                    <Text style={styles.inputLabel}>Mobile Number</Text>
                                    <View style={styles.inputWrapper}>
                                        <Smartphone size={20} color={COLORS.textLight} />
                                        <TextInput
                                            ref={phoneInputRef}
                                            style={styles.textInput}
                                            placeholder="024 XXX XXXX"
                                            placeholderTextColor={COLORS.textLight}
                                            keyboardType="phone-pad"
                                            value={phone}
                                            onChangeText={setPhone}
                                        />
                                    </View>
                                </View>

                                {/* Warning for Withdraw */}
                                {modalType === 'WITHDRAW' && (
                                    <View style={styles.fieldContainer}>
                                        <Text style={styles.inputLabel}>Name on Account</Text>
                                        <View style={styles.inputWrapper}>
                                            <Banknote size={20} color={COLORS.textLight} />
                                            <TextInput
                                                ref={accountNameInputRef}
                                                style={styles.textInput}
                                                placeholder="e.g. John Doe"
                                                placeholderTextColor={COLORS.textLight}
                                                value={accountName}
                                                onChangeText={setAccountName}
                                                autoCapitalize="words"
                                            />
                                        </View>
                                        <Text style={styles.helperText}>Must match the mobile money account name.</Text>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={[styles.confirmBtn, { opacity: (depositMutation.isPending || withdrawMutation.isPending) ? 0.7 : 1 }]}
                                    onPress={handleAction}
                                    disabled={depositMutation.isPending || withdrawMutation.isPending}
                                >
                                    {(depositMutation.isPending || withdrawMutation.isPending) ? (
                                        <ActivityIndicator color="#fff" />
                                    ) : (
                                        <Text style={styles.confirmBtnText}>
                                            {modalType === 'DEPOSIT' ? 'Confirm Payment' : 'Withdraw Funds'}
                                        </Text>
                                    )}
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
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: COLORS.text,
        letterSpacing: -0.5,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    balanceSection: {
        paddingHorizontal: 24,
        paddingVertical: 32,
        alignItems: 'center',
    },
    balanceLabel: {
        fontSize: 14,
        color: COLORS.textLight,
        fontWeight: '500',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    balanceValue: {
        fontSize: 48,
        fontWeight: '800',
        color: COLORS.text,
        letterSpacing: -2,
    },
    currencySymbol: {
        fontSize: 28,
        fontWeight: '600',
        color: COLORS.textLight,
        marginRight: 4,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 32,
        marginBottom: 40,
    },
    actionBtn: {
        alignItems: 'center',
        gap: 8,
    },
    actionIconBox: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    actionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.text,
    },
    verifyCard: {
        marginHorizontal: 20,
        marginBottom: 32,
        backgroundColor: COLORS.warning,
        borderRadius: 16,
        padding: 4,
        shadowColor: COLORS.warning,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    verifyContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        gap: 12,
    },
    verifyIconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    verifyTitle: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
    verifySub: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 12,
    },
    sectionHeader: {
        paddingHorizontal: 24,
        marginBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    seeAllText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
    },
    txnList: {
        paddingHorizontal: 24,
    },
    txnItem: {
        flexDirection: 'row',
        paddingVertical: 16,
        alignItems: 'center',
        gap: 16,
    },
    txnIconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    txnContent: {
        flex: 1,
    },
    txnTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    txnBottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    txnTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
        textTransform: 'capitalize',
    },
    txnAmount: {
        fontSize: 15,
        fontWeight: '700',
    },
    txnDate: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    separator: {
        height: 1,
        backgroundColor: '#F3F4F6',
        marginLeft: 64, // Align with text start
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 40,
    },
    emptyIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
    },
    emptySub: {
        fontSize: 14,
        color: COLORS.textLight,
        textAlign: 'center',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 24,
        height: '85%',
        paddingHorizontal: 24,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.text,
    },
    closeBtn: {
        padding: 4,
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingBottom: 8,
    },
    currencyPrefix: {
        fontSize: 32,
        fontWeight: '600',
        color: COLORS.textLight,
        marginBottom: 4,
        marginRight: 4,
    },
    largeAmountInput: {
        fontSize: 48,
        fontWeight: '700',
        color: COLORS.text,
        minWidth: 100,
        textAlign: 'center',
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textLight,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    networkScroll: {
        flexGrow: 0,
        marginBottom: 24,
    },
    netCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        marginRight: 12,
        gap: 8,
    },
    netDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    netName: {
        fontSize: 14,
        color: COLORS.textLight,
        fontWeight: '500',
    },
    fieldContainer: {
        marginBottom: 24,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 4,
        height: 56,
        gap: 12,
    },
    textInput: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        height: '100%',
    },
    helperText: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 6,
        marginLeft: 4,
    },
    confirmBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 16,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 16,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    confirmBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
