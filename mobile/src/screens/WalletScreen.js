import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Modal, TextInput, ScrollView,
    Linking, KeyboardAvoidingView, Platform, Dimensions, StatusBar, RefreshControl
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallet, useOptimisticDeposit, useOptimisticWithdraw, useVerifyPayment } from '../hooks/useWallet';
import { useAuth } from '../context/AuthContext';
import { SkeletonWalletCard, SkeletonWalletPage } from '../components/Skeleton';
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
    primary: '#2E7D32',
    primaryDark: '#1E8449',
    background: '#F0F7F4',
    surface: '#FFFFFF',
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

    // Wallet hooks
    const { data: wallet, isLoading, isRefetching, refetch } = useWallet();
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
                        setModalVisible(false);
                        navigation.navigate('PaystackWebView', {
                            authUrl: res.authorization_url,
                            reference: res.reference
                        });
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
        return <SkeletonWalletPage />;
    }

    const transactions = wallet?.recent_transactions || [];
    const balance = parseFloat(wallet?.balance || 0);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#fff" titleColor="#fff" />
                }
            >
                {/* Organic Curved Header */}
                <View style={styles.headerBackground}>
                    <View style={styles.curvedShape} />
                    <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerContent}>
                        <View style={styles.topHeaderRow}>
                            <Text style={styles.headerTitle}>My Wallet</Text>
                        </View>
                        <View style={styles.balanceSection}>
                            <Text style={styles.balanceLabel}>Total Balance</Text>
                            <Text style={styles.balanceText}>
                                <Text style={styles.currencySymbol}>₵ </Text>
                                {balance.toFixed(2)}
                            </Text>
                        </View>
                    </SafeAreaView>
                </View>

                {/* Overlapping Actions Card */}
                <View style={styles.overlappingCard}>
                    <View style={styles.actionsGrid}>
                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => {
                                setModalType('DEPOSIT');
                                setModalVisible(true);
                            }}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: '#E8F5E9' }]}>
                                <Plus size={24} color="#2E7D32" />
                            </View>
                            <Text style={styles.actionLabel}>Top Up</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionBtn}
                            onPress={() => {
                                setModalType('WITHDRAW');
                                setModalVisible(true);
                            }}
                        >
                            <View style={[styles.actionIconBox, { backgroundColor: '#FFF3E0' }]}>
                                <ArrowUpRight size={24} color="#EF6C00" />
                            </View>
                            <Text style={styles.actionLabel}>Withdraw</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionBtn}>
                            <View style={[styles.actionIconBox, { backgroundColor: '#E3F2FD' }]}>
                                <CreditCard size={24} color="#1976D2" />
                            </View>
                            <Text style={styles.actionLabel}>Cards</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Main Content */}
                <View style={styles.mainContent}>
                    {pendingTxn && (
                        <TouchableOpacity style={styles.verifyCard} onPress={verifyTopUp}>
                            <View style={styles.verifyIconBox}>
                                <ActivityIndicator size="small" color="#fff" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.verifyTitle}>Payment Pending</Text>
                                <Text style={styles.verifySub}>Tap to verify top-up of ₵{parseFloat(pendingTxn.amount).toFixed(2)}</Text>
                            </View>
                            <ChevronRight size={20} color="#fff" />
                        </TouchableOpacity>
                    )}

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Activity</Text>
                        <TouchableOpacity>
                            <Text style={styles.seeAllText}>See All</Text>
                        </TouchableOpacity>
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
                        <View style={styles.txnGroup}>
                            {transactions.map((item, index) => (
                                <View key={item.id || index}>
                                    {renderTransaction({ item })}
                                    {index < transactions.length - 1 && <View style={styles.separator} />}
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </ScrollView>

            {/* Universal Modal */}
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

                                <View style={styles.fieldContainer}>
                                    <View style={styles.inputWrapper}>
                                        <Smartphone size={20} color={COLORS.textLight} />
                                        <TextInput
                                            ref={phoneInputRef}
                                            style={styles.textInput}
                                            placeholder="Mobile Number"
                                            placeholderTextColor={COLORS.textLight}
                                            keyboardType="phone-pad"
                                            value={phone}
                                            onChangeText={setPhone}
                                        />
                                    </View>
                                </View>

                                {modalType === 'WITHDRAW' && (
                                    <View style={styles.fieldContainer}>
                                        <View style={styles.inputWrapper}>
                                            <Banknote size={20} color={COLORS.textLight} />
                                            <TextInput
                                                ref={accountNameInputRef}
                                                style={styles.textInput}
                                                placeholder="Account Name"
                                                placeholderTextColor={COLORS.textLight}
                                                value={accountName}
                                                onChangeText={setAccountName}
                                                autoCapitalize="words"
                                            />
                                        </View>
                                    </View>
                                )}

                                <TouchableOpacity
                                    style={styles.confirmBtn}
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F7F4',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    headerBackground: {
        height: 280,
        backgroundColor: '#2E7D32',
        position: 'relative',
        overflow: 'hidden',
    },
    curvedShape: {
        position: 'absolute',
        bottom: -120,
        left: -width * 0.25,
        width: width * 1.5,
        height: width * 1.5,
        borderRadius: width * 0.75,
        backgroundColor: '#388E3C',
        opacity: 0.3,
    },
    headerContent: {
        paddingHorizontal: 25,
        paddingTop: 20,
        alignItems: 'center',
    },
    topHeaderRow: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        opacity: 0.9,
    },
    balanceSection: {
        alignItems: 'center',
        marginTop: 30,
    },
    balanceLabel: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 8,
        fontWeight: '500',
    },
    balanceText: {
        fontSize: 48,
        fontWeight: 'bold',
        color: '#fff',
    },
    currencySymbol: {
        fontSize: 24,
        opacity: 0.8,
    },
    overlappingCard: {
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: -50,
        borderRadius: 25,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        zIndex: 1,
    },
    actionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    actionBtn: {
        alignItems: 'center',
        flex: 1,
    },
    actionIconBox: {
        width: 56,
        height: 56,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    actionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#333',
    },
    mainContent: {
        marginTop: 30,
        paddingHorizontal: 20,
    },
    verifyCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F59E0B',
        padding: 15,
        borderRadius: 18,
        marginBottom: 25,
        gap: 12,
    },
    verifyIconBox: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    verifyTitle: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 14,
    },
    verifySub: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 12,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingHorizontal: 5,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    seeAllText: {
        fontSize: 14,
        color: '#2E7D32',
        fontWeight: 'bold',
    },
    txnGroup: {
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    txnItem: {
        flexDirection: 'row',
        paddingVertical: 18,
        paddingHorizontal: 15,
        alignItems: 'center',
        gap: 15,
    },
    txnIconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
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
    txnTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
        textTransform: 'capitalize',
    },
    txnAmount: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    txnBottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    txnDate: {
        fontSize: 12,
        color: '#999',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    separator: {
        height: 1,
        backgroundColor: '#F9FAFB',
        marginLeft: 74,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyIconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        elevation: 2,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    emptySub: {
        fontSize: 14,
        color: '#999',
        marginTop: 5,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 30,
        paddingHorizontal: 25,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
    },
    amountInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
        paddingBottom: 5,
    },
    currencyPrefix: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#999',
        marginRight: 5,
    },
    largeAmountInput: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#2E7D32',
        textAlign: 'center',
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 12,
    },
    networkScroll: {
        marginBottom: 20,
    },
    netCard: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EEE',
        marginRight: 10,
        gap: 8,
    },
    netDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    netName: {
        fontSize: 14,
        color: '#666',
    },
    fieldContainer: {
        marginBottom: 15,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#EEE',
        height: 56,
        paddingHorizontal: 15,
        gap: 12,
    },
    textInput: {
        flex: 1,
        fontSize: 15,
        color: '#333',
    },
    confirmBtn: {
        backgroundColor: '#2E7D32',
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    confirmBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
