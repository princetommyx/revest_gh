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
import {
    Search, PieChart, Gift, Plus,
    ArrowUpRight, CreditCard, ChevronRight,
    X, Smartphone, Banknote, CheckCircle2,
    ArrowDownLeft, History
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';

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

    const renderTransaction = ({ item }) => {
        const isCredit = ['DEPOSIT', 'JOB_EARNING', 'ESCROW_RELEASE', 'SALE_EARNING'].includes(item.transaction_type);
        const Icon = isCredit ? ArrowDownLeft : ArrowUpRight;
        const iconColor = isCredit ? COLORS.success : COLORS.text;
        const iconBg = isCredit ? '#ECFDF5' : '#F3F4F6';

        return (
            <View style={styles.txnItem}>
                <View style={[styles.txnIconBox, { backgroundColor: iconBg }]}>
                    <Icon size={20} color={iconColor} />
                </View>
                <View style={styles.txnContent}>
                    <Text style={styles.txnTitle}>{item.transaction_type.replace(/_/g, ' ')}</Text>
                    <Text style={styles.txnDate}>
                        {new Date(item.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.txnAmount, { color: isCredit ? COLORS.success : COLORS.text }]}>
                        {isCredit ? '+' : '-'}₵{parseFloat(item.amount).toFixed(2)}
                    </Text>
                    <Text style={[styles.txnStatus, { color: item.status === 'COMPLETED' ? COLORS.success : COLORS.textLight }]}>
                        {item.status}
                    </Text>
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
            <StatusBar barStyle="dark-content" backgroundColor="#FAFAFA" />

            <SafeAreaView edges={['top']} style={{ flex: 1 }}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>My Account</Text>
                        <Text style={styles.headerSubtitle}>{user?.phone_number || '00-00-00'}</Text>
                    </View>
                    <View style={styles.headerIcons}>
                        <TouchableOpacity style={styles.iconBtn}>
                            <Search size={22} color="#111" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn}>
                            <PieChart size={22} color="#111" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.iconBtn}>
                            <Gift size={22} color="#F59E0B" />
                        </TouchableOpacity>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}>
                    
                    {/* Balance Card */}
                    <View style={styles.balanceCard}>
                        <Text style={styles.balanceLabel}>Current balance</Text>
                        <Text style={styles.balanceAmount}>₵{balance.toFixed(2)}</Text>
                        
                        {/* Progress Bar (Mockup Style) */}
                        <View style={styles.progressSection}>
                            <Text style={styles.progressText}>
                                <Text style={{color: '#EF4444'}}>₵0</Text> spent of ₵{balance.toFixed(2)}
                            </Text>
                            <View style={styles.progressBarBg}>
                                <View style={[styles.progressBarFill, { width: '10%' }]} />
                                <View style={[styles.progressHandle, { left: '10%' }]} />
                            </View>
                        </View>
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.actionsRow}>
                        <TouchableOpacity style={styles.actionItem} onPress={() => { setModalType('WITHDRAW'); setModalVisible(true); }}>
                            <View style={styles.actionIconCircle}>
                                <ArrowUpRight size={20} color="#111" />
                            </View>
                            <Text style={styles.actionText}>Withdraw</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionItem} onPress={() => { setModalType('DEPOSIT'); setModalVisible(true); }}>
                            <View style={[styles.actionIconCircle, styles.dashedCircle]}>
                                <Plus size={20} color="#111" />
                            </View>
                            <Text style={styles.actionText}>Top Up</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Feed Content */}
                    <View style={styles.feedSection}>
                        <Text style={styles.sectionTitle}>Transactions</Text>
                        {transactions.length === 0 ? (
                            <Text style={styles.emptyText}>No recent activity</Text>
                        ) : (
                            transactions.map((item, index) => (
                                <View key={item.id || index}>
                                    {renderTransaction({ item })}
                                    {index < transactions.length - 1 && <View style={styles.separator} />}
                                </View>
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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    headerIcons: {
        flexDirection: 'row',
        gap: 12,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    balanceCard: {
        backgroundColor: '#FFF',
        marginHorizontal: 20,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 10,
        elevation: 2,
    },
    balanceLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    balanceAmount: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 20,
    },
    progressSection: {
        width: '100%',
        alignItems: 'center',
    },
    progressText: {
        fontSize: 12,
        color: '#666',
        marginBottom: 10,
    },
    progressBarBg: {
        width: '80%',
        height: 6,
        backgroundColor: '#F3F4F6',
        borderRadius: 3,
        position: 'relative',
    },
    progressBarFill: {
        position: 'absolute',
        height: '100%',
        backgroundColor: '#111',
        borderRadius: 3,
        left: 0,
    },
    progressHandle: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#111',
        top: -3,
        marginLeft: -6,
    },
    cardsScroll: {
        paddingHorizontal: 20,
        paddingVertical: 25,
    },
    virtualCard: {
        width: width - 40,
        height: 200,
        backgroundColor: '#111', // Dark card
        borderRadius: 24,
        padding: 24,
        justifyContent: 'space-between',
        shadowColor: '#111',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 10,
    },
    cardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardLogo: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    chip: {
        width: 40,
        height: 30,
        backgroundColor: '#D1D5DB',
        borderRadius: 6,
        opacity: 0.8,
    },
    cardNumber: {
        color: '#FFF',
        fontSize: 22,
        letterSpacing: 3,
        marginVertical: 10,
    },
    cardBottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    cardLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
        marginBottom: 4,
    },
    cardValue: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '500',
    },
    mcCircles: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    mcCircle: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 30,
        marginTop: 30,
        marginBottom: 30,
    },
    actionItem: {
        alignItems: 'center',
    },
    actionIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    dashedCircle: {
        borderWidth: 1.5,
        borderColor: '#111',
        borderStyle: 'dashed',
    },
    actionText: {
        fontSize: 12,
        color: '#333',
        fontWeight: '500',
    },
    feedSection: {
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 15,
        marginLeft: 5,
    },
    txnItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    txnIconBox: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    txnContent: {
        flex: 1,
    },
    txnTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111',
        textTransform: 'capitalize',
        marginBottom: 4,
    },
    txnDate: {
        fontSize: 12,
        color: '#999',
    },
    txnAmount: {
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    txnStatus: {
        fontSize: 11,
        fontWeight: '600',
    },
    separator: {
        height: 0, // removed to match mockup's clean look
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
