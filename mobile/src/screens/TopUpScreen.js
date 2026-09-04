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
import { useTheme, makeStyles } from '../theme/ThemeContext';

const QUICK_AMOUNTS = [10, 20, 50, 100, 200, 500];

export default function TopUpScreen({ navigation }) {
    const styles = useStyles();
    const { colors, isDark } = useTheme();
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

    const handleCloseWebView = () => {
        setPaystackUrl(null);
        // Attempt verification on the way out rather than assuming nothing was
        // paid - the user may have completed the charge and simply closed the
        // receipt themselves.
        if (reference) verifyTransaction();
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
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

            <ScreenHeader title="Add Funds" onBack={() => navigation.goBack()} />

            <View style={styles.contentOverlap}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                    {/* Premium Balance Card */}
                    <View style={styles.balanceCard}>
                        <View style={styles.balanceHeader}>
                            <Wallet size={20} color={colors.textSecondary} />
                            <Text style={styles.balanceLabel}>Current Balance</Text>
                        </View>
                        <Text style={[styles.balanceValue, isNegative && { color: colors.danger }]}>
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
                                placeholderTextColor={colors.textMuted}
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
                                <CreditCard size={20} color={colors.text} />
                            </View>
                            <View style={styles.methodText}>
                                <Text style={styles.methodName}>Debit Card / Mobile Money</Text>
                                <Text style={styles.methodDesc}>Instant deposit via Paystack</Text>
                            </View>
                            <Landmark size={18} color={colors.textMuted} />
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
                            <ActivityIndicator color={colors.onPrimary} />
                        ) : (
                            <Text style={styles.payBtnText}>
                                {amount && !isNaN(parseFloat(amount))
                                    ? `Deposit ₵${parseFloat(amount).toFixed(2)}`
                                    : 'Initiate Deposit'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.secureBadgeHorizontal}>
                        <ShieldCheck size={14} color={colors.text} />
                        <Text style={styles.secureLabel}>Secured by Paystack Standard Encryption</Text>
                    </View>
                </View>
            </View>

            {/* Paystack Modal */}
            <Modal visible={!!paystackUrl} animationType="slide">
                <SafeAreaView style={{ flex: 1, backgroundColor: colors.surface }}>
                    <View style={styles.modalHeader}>
                        {/* Closing manually still has to verify. Paystack doesn't
                            always land on a URL we recognise (the user can tap
                            away from the receipt), and there's no webhook - so
                            without this, a completed payment is simply never
                            credited. verify_payment is idempotent server-side,
                            so calling it when nothing was paid is harmless. */}
                        <TouchableOpacity onPress={handleCloseWebView}>
                            <X size={24} color={colors.text} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Secure Payment</Text>
                        <View style={{ width: 24 }} />
                    </View>
                    <WebView
                        source={{ uri: paystackUrl }}
                        style={{ flex: 1 }}
                        onNavigationStateChange={handleWebViewNavigation}
                        startInLoadingState
                        renderLoading={() => <ActivityIndicator size="large" color={colors.text} style={styles.centered} />}
                    />
                </SafeAreaView>
            </Modal>
        </View>
    );
}

const useStyles = makeStyles((c) => ({
    container: { flex: 1, backgroundColor: c.surface },
    contentOverlap: { flex: 1, backgroundColor: c.surface },
    scrollContent: { padding: 25, paddingBottom: 120 },
    balanceCard: {
        backgroundColor: c.surfaceAlt, borderRadius: 24, padding: 25, alignItems: 'center',
        borderWidth: 1, borderColor: c.borderSubtle, marginBottom: 30
    },
    balanceHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    balanceLabel: { fontSize: 13, color: c.textSecondary, fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 0.5 },
    balanceValue: { fontSize: 32, fontWeight: 'bold', color: c.text },
    warningTag: { marginTop: 12, backgroundColor: c.dangerSoft, paddingHorizontal: 15, paddingVertical: 6, borderRadius: 10 },
    warningText: { color: c.danger, fontSize: 12, fontWeight: '600' },
    inputSection: { marginBottom: 30 },
    inputTitle: { fontSize: 15, fontWeight: 'bold', color: c.text, marginBottom: 15 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceSunken,
        borderRadius: 20, paddingHorizontal: 20, height: 65, marginBottom: 20
    },
    currencySymbol: { fontSize: 24, fontWeight: 'bold', color: c.text, marginRight: 10 },
    amountInput: { flex: 1, fontSize: 24, fontWeight: 'bold', color: c.text },
    chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    amountChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: c.surfaceAlt, borderWidth: 1, borderColor: c.borderSubtle },
    activeChip: { backgroundColor: c.primary, borderColor: c.primary },
    chipText: { fontSize: 14, fontWeight: '600', color: c.textSecondary },
    activeChipText: { color: c.onPrimary },
    methodInfo: { marginBottom: 20 },
    methodTitle: { fontSize: 15, fontWeight: 'bold', color: c.text, marginBottom: 15 },
    methodCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: c.surface,
        padding: 18, borderRadius: 20, borderWidth: 1, borderColor: c.borderSubtle,
        shadowColor: c.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2
    },
    methodIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.bg, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    methodText: { flex: 1 },
    methodName: { fontSize: 15, fontWeight: 'bold', color: c.text },
    methodDesc: { fontSize: 12, color: c.textMuted, marginTop: 2 },
    footer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: c.surface, padding: 25, borderTopWidth: 1, borderTopColor: c.borderSubtle },
    payBtn: { backgroundColor: c.primary, height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', shadowColor: c.shadow, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6 },
    payBtnDisabled: { backgroundColor: c.border },
    payBtnText: { color: c.onPrimary, fontSize: 16, fontWeight: 'bold' },
    secureBadgeHorizontal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 15 },
    secureLabel: { fontSize: 11, color: c.textMuted, fontWeight: '500' },
    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.borderSubtle },
    modalTitle: { fontSize: 16, fontWeight: 'bold', color: c.text },
    centered: { position: 'absolute', top: '50%', left: '50%', marginTop: -15, marginLeft: -15 },
}));
