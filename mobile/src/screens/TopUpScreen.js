import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ActivityIndicator, Modal, SafeAreaView,
    KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../context/AuthContext';
import { walletApi } from '../api/wallet';
import { useWallet, useVerifyPayment } from '../hooks/useWallet';
import { X, ChevronLeft, Wallet, CheckCircle2 } from 'lucide-react-native';

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
            alert('Please enter a valid amount (min 1 GHS).');
            return;
        }

        setLoading(true);
        try {
            // 1. Initialize transaction on backend
            console.log('Initializing payment...', { email: user.email, amount });
            const initResponse = await walletApi.initializePayment(user.email, amount);
            console.log('Init Response:', JSON.stringify(initResponse, null, 2));

            if (initResponse && initResponse.authorization_url) {
                console.log('Setting Paystack URL:', initResponse.authorization_url);
                console.log('Setting Reference:', initResponse.reference);
                setReference(initResponse.reference);
                setPaystackUrl(initResponse.authorization_url);
            } else {
                console.error('Invalid response structure:', initResponse);
                throw new Error(initResponse?.message || 'Could not get payment URL');
            }
        } catch (error) {
            console.error(error);
            alert('Error: ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleWebViewNavigation = (navState) => {
        const { url } = navState;

        // 2. Intercept callback URL
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
                    // Success Screen or Alert
                    alert('Success! Wallet credited.');
                    navigation.goBack();
                } else {
                    alert('Payment is processing. Check balance shortly.');
                    navigation.goBack();
                }
            },
            onError: (err) => {
                setLoading(false);
                alert('Verification failed, but payment might be processing. Check balance later.');
                navigation.goBack();
            }
        });
    };

    const currentBalance = parseFloat(wallet?.balance || 0);
    const isNegative = currentBalance < 0;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#1A1A1A" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Add Funds</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Balance Section */}
                <View style={styles.balanceContainer}>
                    <Text style={styles.balanceLabel}>Current Balance</Text>
                    <Text style={[styles.balanceValue, { color: isNegative ? '#D32F2F' : '#2E7D32' }]}>
                        ₵ {currentBalance.toFixed(2)}
                    </Text>
                    {isNegative && (
                        <View style={styles.warningBox}>
                            <Text style={styles.warningText}>
                                You have an outstanding balance. Please top up to continue receiving requests.
                            </Text>
                        </View>
                    )}
                </View>

                {/* Input Section */}
                <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>Enter Amount to Add</Text>
                    <View style={styles.inputWrapper}>
                        <Text style={styles.currencyPrefix}>₵</Text>
                        <TextInput
                            style={styles.amountInput}
                            placeholder="0.00"
                            placeholderTextColor="#ccc"
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={setAmount}
                            autoFocus={false}
                        />
                    </View>
                </View>

                {/* Quick Amounts */}
                <View style={styles.quickGrid}>
                    {QUICK_AMOUNTS.map((val) => (
                        <TouchableOpacity
                            key={val}
                            style={[
                                styles.quickBtn,
                                amount === val.toString() && styles.quickBtnActive
                            ]}
                            onPress={() => handleQuickAmount(val)}
                        >
                            <Text style={[
                                styles.quickBtnText,
                                amount === val.toString() && styles.quickBtnTextActive
                            ]}>
                                ₵{val}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

            </ScrollView>

            {/* Bottom Action Button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.payBtn, loading && styles.disabledBtn]}
                    onPress={handleStartPayment}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <View style={styles.btnContent}>
                            <Text style={styles.payBtnText}>
                                {amount ? `Add ₵${parseFloat(amount).toFixed(2)}` : 'Add Funds'}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={styles.secureBadge}>
                    <CheckCircle2 size={14} color="#2E7D32" />
                    <Text style={styles.secureText}>Secured by Paystack</Text>
                </View>
            </View>

            {/* Paystack WebView Modal */}
            <Modal visible={!!paystackUrl} animationType="slide" onRequestClose={() => setPaystackUrl(null)}>
                <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Complete Payment</Text>
                        <TouchableOpacity onPress={() => setPaystackUrl(null)} style={styles.closeBtn}>
                            <X size={24} color="#333" />
                        </TouchableOpacity>
                    </View>
                    <WebView
                        source={{ uri: paystackUrl }}
                        style={{ flex: 1 }}
                        onNavigationStateChange={handleWebViewNavigation}
                        startInLoadingState
                        renderLoading={() => <ActivityIndicator size="large" color="#2E7D32" style={styles.loader} />}
                    />
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5'
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
    backBtn: { padding: 4 },

    content: { padding: 24, paddingBottom: 100 },

    balanceContainer: { alignItems: 'center', marginBottom: 40 },
    balanceLabel: { fontSize: 14, color: '#666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 },
    balanceValue: { fontSize: 40, fontWeight: 'bold', letterSpacing: -1 },
    warningBox: {
        marginTop: 15,
        backgroundColor: '#FFEBEE',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    warningText: { color: '#D32F2F', fontSize: 13, textAlign: 'center' },

    inputSection: { marginBottom: 30 },
    inputLabel: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 15 },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: '#2E7D32',
        paddingBottom: 8
    },
    currencyPrefix: { fontSize: 32, fontWeight: 'bold', color: '#1A1A1A', marginRight: 5 },
    amountInput: {
        flex: 1,
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1A1A1A',
        padding: 0,
    },

    quickGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between'
    },
    quickBtn: {
        width: '30%',
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee'
    },
    quickBtnActive: {
        backgroundColor: '#2E7D32',
        borderColor: '#2E7D32'
    },
    quickBtnText: { fontSize: 16, fontWeight: '600', color: '#333' },
    quickBtnTextActive: { color: '#fff' },

    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 24,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f5f5f5'
    },
    payBtn: {
        backgroundColor: '#2E7D32',
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8
    },
    disabledBtn: { opacity: 0.7 },
    payBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

    secureBadge: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 15,
        gap: 6
    },
    secureText: { color: '#666', fontSize: 12 },

    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        backgroundColor: '#fff',
        borderBottomColor: '#eee'
    },
    modalTitle: { fontSize: 16, fontWeight: 'bold' },
    closeBtn: { padding: 4 },
    loader: { position: 'absolute', top: '50%', left: '50%', marginTop: -25, marginLeft: -25 }
});
