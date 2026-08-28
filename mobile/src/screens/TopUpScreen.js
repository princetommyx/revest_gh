import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ActivityIndicator, Modal, SafeAreaView,
    Platform, ScrollView, StatusBar
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../context/AuthContext';
import { walletApi } from '../api/wallet';
import { useWallet, useVerifyPayment } from '../hooks/useWallet';
import { X, Wallet, ShieldCheck, CreditCard, Landmark } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import ScreenHeader from '../components/ScreenHeader';

const QUICK_AMOUNTS = [10, 20, 50, 100, 200, 500];

export default function TopUpScreen({ navigation }) {
    const { user } = useAuth();
    const { data: wallet, isLoading: isWalletLoading } = useWallet();

    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [paystackUrl, setPaystackUrl] = useState(null);
    const [reference, setReference] = useState(null);
    const verifyMutation = useVerifyPayment();

    const handleQuickAmount = (val) => {
        setAmount(val.toString());
    };

    const handleStartPayment = async () => {
        if (!amount || isNaN(amount) || Number(amount) < 1) {
            Toast.show({ type: 'error', text1: 'Invalid amount', text2: 'Enter an amount of at least ₵1.' });
            return;
        }

        setLoading(true);
        try {
            const initResponse = await walletApi.initializePayment(user.email, amount);
            if (initResponse && initResponse.authorization_url) {
                setReference(initResponse.reference);
                setPaystackUrl(initResponse.authorization_url);
            } else {
                throw new Error(initResponse?.message || 'Could not get payment URL');
            }
        } catch (error) {
            console.error(error);
            Toast.show({
                type: 'error',
                text1: 'Could not start payment',
                text2: error.response?.data?.error || error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    const handleWebViewNavigation = (navState) => {
        const { url } = navState;
        if (url.includes('paystack.co/close') || url.includes('callback') || url.includes('success')) {
            setPaystackUrl(null);
            verifyTransaction();
        }
    };

    const verifyTransaction = () => {
        if (!reference) return;
        setLoading(true);
        verifyMutation.mutate(reference, {
            onSuccess: (data) => {
                setLoading(false);
                if (data.wallet) {
                    Toast.show({ type: 'success', text1: 'Wallet topped up', text2: 'Your balance has been updated.' });
                } else {
                    Toast.show({ type: 'info', text1: 'Payment processing', text2: 'Your balance will update shortly.' });
                }
                navigation.goBack();
            },
            onError: () => {
                setLoading(false);
                Toast.show({
                    type: 'error',
                    text1: 'Could not confirm payment',
                    text2: 'If you were charged, your balance will update shortly.',
                });
                navigation.goBack();
            }
        });
    };

    const currentBalance = parseFloat(wallet?.balance || 0);
    const isNegative = currentBalance < 0;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

            <ScreenHeader title="Add Funds" onBack={() => navigation.goBack()} />

            <View style={styles.contentOverlap}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                    {/* Premium Balance Card */}
                    <View style={styles.balanceCard}>
                        <View style={styles.balanceHeader}>
                            <Wallet size={20} color="#666" />
                            <Text style={styles.balanceLabel}>Current Balance</Text>
                        </View>
                        <Text style={[styles.balanceValue, isNegative && { color: '#E74C3C' }]}>
                            ₵ {currentBalance.toFixed(2)}
                        </Text>
                        {isNegative && (
                            <View style={styles.warningTag}>
                                <Text style={styles.warningText}>Top up to clear outstanding balance</Text>
                            </View>
                        )}
                    </View>

                    {/* Amount Input Section */}
                    <View style={styles.inputSection}>
                        <Text style={styles.inputTitle}>Amount to Deposit</Text>
                        <View style={styles.inputWrapper}>
                            <Text style={styles.currencySymbol}>₵</Text>
                            <TextInput
                                style={styles.amountInput}
                                placeholder="0.00"
                                placeholderTextColor="#9CA3AF"
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                            />
                        </View>

                        {/* Quick Selection Chips */}
                        <View style={styles.chipContainer}>
                            {QUICK_AMOUNTS.map((val) => (
                                <TouchableOpacity
                                    key={val}
                                    style={[styles.amountChip, amount === val.toString() && styles.activeChip]}
                                    onPress={() => handleQuickAmount(val)}
                                >
                                    <Text style={[styles.chipText, amount === val.toString() && styles.activeChipText]}>₵{val}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Info Section */}
                    <View style={styles.methodInfo}>
                        <Text style={styles.methodTitle}>Payment Method</Text>
                        <View style={styles.methodCard}>
                            <View style={styles.methodIcon}>
                                <CreditCard size={20} color="#111" />
                            </View>
                            <View style={styles.methodText}>
                                <Text style={styles.methodName}>Debit Card / Mobile Money</Text>
                                <Text style={styles.methodDesc}>Instant deposit via Paystack</Text>
                            </View>
                            <Landmark size={18} color="#ccc" />
                        </View>
                    </View>

                </ScrollView>

                {/* Secure Footer */}
                <View style={[styles.footer, { paddingBottom: Platform.OS === 'ios' ? 40 : 25 }]}>
                    <TouchableOpacity
                        style={[styles.payBtn, loading && styles.payBtnDisabled]}
                        onPress={handleStartPayment}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.payBtnText}>
                                {amount && !isNaN(parseFloat(amount))
                                    ? `Deposit ₵${parseFloat(amount).toFixed(2)}`
                                    : 'Initiate Deposit'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.secureBadgeHorizontal}>
                        <ShieldCheck size={14} color="#111" />
                        <Text style={styles.secureLabel}>Secured by Paystack Standard Encryption</Text>
                    </View>
                </View>
            </View>

            {/* Paystack Modal */}
            <Modal visible={!!paystackUrl} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity onPress={() => setPaystackUrl(null)}>
                            <X size={24} color="#333" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Secure Payment</Text>
                        <View style={{ width: 24 }} />
                    </View>
                    <WebView
                        source={{ uri: paystackUrl }}
                        style={{ flex: 1 }}
                        onNavigationStateChange={handleWebViewNavigation}
                        startInLoadingState
                        renderLoading={() => <ActivityIndicator size="large" color="#111" style={styles.centered} />}
                    />
                </SafeAreaView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFFFFF' },
    contentOverlap: { flex: 1, backgroundColor: '#fff' },
    scrollContent: { padding: 25, paddingBottom: 120 },
    balanceCard: {
        backgroundColor: '#F9FAFB', borderRadius: 24, padding: 25, alignItems: 'center',
        borderWidth: 1, borderColor: '#F3F4F6', marginBottom: 30
    },
    balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    balanceLabel: { fontSize: 13, color: '#666', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
    balanceValue: { fontSize: 32, fontWeight: 'bold', color: '#1A1A1A' },
    warningTag: { marginTop: 12, backgroundColor: '#FEF2F2', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 10 },
    warningText: { color: '#EF4444', fontSize: 12, fontWeight: '600' },
    inputSection: { marginBottom: 30 },
    inputTitle: { fontSize: 15, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 15 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6',
        borderRadius: 20, paddingHorizontal: 20, height: 65, marginBottom: 20
    },
    currencySymbol: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', marginRight: 10 },
    amountInput: { flex: 1, fontSize: 24, fontWeight: 'bold', color: '#1A1A1A' },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    amountChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#F3F4F6' },
    activeChip: { backgroundColor: '#111', borderColor: '#111' },
    chipText: { fontSize: 14, fontWeight: '600', color: '#666' },
    activeChipText: { color: '#fff' },
    methodInfo: { marginBottom: 20 },
    methodTitle: { fontSize: 15, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 15 },
    methodCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
        padding: 18, borderRadius: 20, borderWidth: 1, borderColor: '#F3F4F6',
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
    },
    methodIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FAFAFA', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    methodText: { flex: 1 },
    methodName: { fontSize: 15, fontWeight: 'bold', color: '#1A1A1A' },
    methodDesc: { fontSize: 12, color: '#999', marginTop: 2 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#fff', padding: 25, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    payBtn: { backgroundColor: '#111', height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: '#111', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
    payBtnDisabled: { backgroundColor: '#D1D5DB' },
    payBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    secureBadgeHorizontal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 15 },
    secureLabel: { fontSize: 11, color: '#999', fontWeight: '500' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    modalTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
    centered: { position: 'absolute', top: '50%', left: '50%', marginTop: -15, marginLeft: -15 },
});
