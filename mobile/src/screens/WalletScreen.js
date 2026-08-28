import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, Modal, TextInput, ScrollView,
    KeyboardAvoidingView, Platform, Dimensions, StatusBar, RefreshControl,
    Image
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWallet, useOptimisticDeposit, useOptimisticWithdraw, useVerifyPayment } from '../hooks/useWallet';
import { useAuth } from '../context/AuthContext';
import { SkeletonWalletPage } from '../components/Skeleton';
import { LinearGradient } from 'expo-linear-gradient';
import {
    User, Settings, CreditCard, X, Smartphone, Banknote
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import TransactionRow from '../components/TransactionRow';
import { TAB_BAR_CLEARANCE } from '../constants/layout';

const { width } = Dimensions.get('window');

const NETWORKS = [
    { id: 'MTN', name: 'MTN MoMo', color: '#FFCC00', textColor: '#000' },
    { id: 'TEL', name: 'Telecel Cash', color: '#E60000', textColor: '#fff' },
    { id: 'ATL', name: 'AirtelTigo', color: '#003399', textColor: '#fff' },
];

const COLORS = {
    primary: '#111',
    background: '#FAFAFA',
    surface: '#FFFFFF',
    text: '#111',
    textLight: '#999',
    border: '#E5E7EB',
    success: '#10B981',
    error: '#EF4444',
};

export default function WalletScreen() {
    const { user } = useAuth();
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
    const [phone, setPhone] = useState(user?.phone_number || '');
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
                    Toast.show({ type: 'success', text1: 'Withdrawal Initiated', text2: 'Funds will be sent shortly' });
                },
                onError: (e) => {
                    Toast.show({ type: 'error', text1: 'Withdrawal Failed', text2: e.message || 'Unknown error' });
                }
            });
        }
    };

    if (isLoading) {
        return <SkeletonWalletPage />;
    }

    const transactions = wallet?.recent_transactions || [];
    const balance = parseFloat(wallet?.balance || 0);
    const pendingEarnings = parseFloat(wallet?.pending_earnings || 0);
    const heldEscrow = parseFloat(wallet?.held_escrow || 0);

    return (
        <LinearGradient
            colors={['#EAE6F4', '#F4F9F2', '#FAFAFA', '#FAFAFA']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.container}
        >
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

            <SafeAreaView edges={['top']} style={{ flex: 1 }}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Profile')}>
                        <User size={20} color="#111" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>My Wallet</Text>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Profile')}>
                        <Settings size={20} color="#111" />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
                    
                    {/* Balance Section */}
                    <View style={styles.balanceSection}>
                        <Text style={styles.balanceLabel}>Wallet Balance</Text>
                        <Text style={styles.balanceAmount}>₵{balance.toFixed(2)}</Text>

                        {(pendingEarnings > 0 || heldEscrow > 0) && (
                            <View style={styles.subBalanceRow}>
                                {pendingEarnings > 0 && (
                                    <View style={styles.subBalanceChip}>
                                        <Text style={styles.subBalanceLabel}>Pending Earnings</Text>
                                        <Text style={styles.subBalanceValue}>₵{pendingEarnings.toFixed(2)}</Text>
                                    </View>
                                )}
                                {heldEscrow > 0 && (
                                    <View style={styles.subBalanceChip}>
                                        <Text style={styles.subBalanceLabel}>In Escrow</Text>
                                        <Text style={styles.subBalanceValue}>₵{heldEscrow.toFixed(2)}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity style={[styles.actionItem, { backgroundColor: '#111' }]} onPress={() => { setModalType('DEPOSIT'); setModalVisible(true); }}>
                            <View style={styles.actionIconWrapper}>
                                <CreditCard size={24} color="#FFF" />
                            </View>
                            <Text style={[styles.actionText, { color: '#FFF' }]}>Top Up</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Feed Content */}
                    <View style={styles.feedSection}>
                        <View style={styles.feedHeader}>
                            <Text style={styles.sectionTitle}>Transactions</Text>
                            <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate('TransactionHistory')}>
                                <Text style={styles.viewAllText}>View all</Text>
                            </TouchableOpacity>
                        </View>

                        {transactions.length === 0 ? (
                            <Text style={styles.emptyText}>No recent activity</Text>
                        ) : (
                            transactions.map((item, index) => (
                                <TransactionRow key={item.id || index} item={item} />
                            ))
                        )}
                    </View>
                </ScrollView>
            </SafeAreaView>

            {/* Modal */}
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
                                            style={[styles.netCard, network === net.id && { borderColor: '#111', backgroundColor: '#FAFAFA' }]}
                                            onPress={() => setNetwork(net.id)}
                                        >
                                            <View style={[styles.netDot, { backgroundColor: net.color }]} />
                                            <Text style={[styles.netName, network === net.id && { color: COLORS.text, fontWeight: '600' }]}>{net.name}</Text>
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
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111',
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.7)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        // At 40 the last transaction sat behind the floating tab bar.
        paddingBottom: TAB_BAR_CLEARANCE,
    },
    balanceSection: {
        alignItems: 'center',
        marginTop: 30,
        marginBottom: 40,
    },
    balanceLabel: {
        fontSize: 15,
        color: '#666',
        fontWeight: '500',
        marginBottom: 8,
    },
    balanceAmount: {
        fontSize: 48,
        fontWeight: '800',
        color: '#111',
    },
    subBalanceRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 16,
    },
    subBalanceChip: {
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 8,
        alignItems: 'center',
    },
    subBalanceLabel: {
        fontSize: 11,
        color: '#666',
        fontWeight: '600',
        marginBottom: 2,
    },
    subBalanceValue: {
        fontSize: 15,
        color: '#111',
        fontWeight: '700',
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 40,
        gap: 12,
    },
    actionItem: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderRadius: 20,
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    actionIconWrapper: {
        marginBottom: 8,
    },
    actionText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#111',
    },
    feedSection: {
        paddingHorizontal: 20,
    },
    feedHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#111',
    },
    viewAllBtn: {
        backgroundColor: 'rgba(255,255,255,0.5)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    viewAllText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#111',
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        marginTop: 20,
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
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
        color: '#111',
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
        color: '#111',
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
        backgroundColor: '#111',
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
    },
    confirmBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
