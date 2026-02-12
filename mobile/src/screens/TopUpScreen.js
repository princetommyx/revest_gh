import React, { useState, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, Modal, SafeAreaView
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useAuth } from '../context/AuthContext';
import { walletApi } from '../api/wallet';
import { useVerifyPayment } from '../hooks/useWallet';
import { X, Lock, CreditCard, ChevronLeft } from 'lucide-react-native';

export default function TopUpScreen({ navigation }) {
    const { user } = useAuth();
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const [paystackUrl, setPaystackUrl] = useState(null);
    const [reference, setReference] = useState(null);
    const verifyMutation = useVerifyPayment();

    const handleStartPayment = async () => {
        if (!amount || isNaN(amount) || Number(amount) < 1) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount (min 1 GHS).');
            return;
        }

        setLoading(true);
        try {
            // 1. Initialize transaction on backend
            const initResponse = await walletApi.initializePayment(user.email, amount);

            if (initResponse && initResponse.authorization_url) {
                setReference(initResponse.reference);
                setPaystackUrl(initResponse.authorization_url);
            } else {
                throw new Error(initResponse?.message || 'Could not get payment URL');
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Could not initialize payment. ' + (error.response?.data?.error || error.message));
        } finally {
            setLoading(false);
        }
    };

    const handleWebViewNavigation = (navState) => {
        const { url } = navState;

        // 2. Intercept callback URL (Paystack standard or custom)
        // Adjust this check based on your Paystack settings or usage of standard callback
        if (url.includes('paystack.co/close') || url.includes('callback') || url.includes('success')) {
            // Close WebView
            setPaystackUrl(null);

            // 3. Verify on backend
            verifyTransaction();
        }
    };

    const verifyTransaction = () => {
        if (!reference) return;

        setLoading(true);
        verifyMutation.mutate(reference, {
            onSuccess: (data) => {
                setLoading(false);
                if (data.wallet) { // Check if wallet object is returned
                    Alert.alert('Success', 'Wallet credited successfully! New Balance: ₵' + data.wallet.balance.toFixed(2), [
                        { text: 'OK', onPress: () => navigation.goBack() }
                    ]);
                } else {
                    Alert.alert('Pending', 'Payment is processing. Check your balance shortly.');
                    navigation.goBack();
                }
            },
            onError: (err) => {
                setLoading(false);
                // Even if frontend verification fails, webhook might have succeeded.
                Alert.alert('Verification', 'Please check your wallet balance. Payment is being processed.');
                navigation.goBack();
            }
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ChevronLeft size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Top Up Wallet</Text>
            </View>

            <View style={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.label}>Enter Amount (GHS)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                        autoFocus
                    />
                    <Text style={styles.helperText}>Minimum deposit: ₵1.00</Text>
                </View>

                <TouchableOpacity
                    style={[styles.payBtn, loading && styles.disabledBtn]}
                    onPress={handleStartPayment}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Lock size={18} color="#fff" />
                            <Text style={styles.payBtnText}>Pay Securely</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={styles.footer}>
                    <CreditCard size={16} color="#888" />
                    <Text style={styles.footerText}>Secured by Paystack</Text>
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
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    backBtn: { padding: 8, marginRight: 8 },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    content: { padding: 20 },
    card: {
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 16,
        marginBottom: 24,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4
    },
    label: { fontSize: 14, color: '#666', marginBottom: 8, textTransform: 'uppercase', fontWeight: 'bold' },
    input: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#333',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#eee'
    },
    helperText: { marginTop: 8, color: '#999', fontSize: 12 },
    payBtn: {
        backgroundColor: '#2E7D32',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 12,
        gap: 8,
        elevation: 4,
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8
    },
    disabledBtn: { opacity: 0.7 },
    payBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 24,
        gap: 8
    },
    footerText: { color: '#888', fontSize: 12 },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#fff',
        elevation: 2
    },
    modalTitle: { fontSize: 16, color: '#666', fontWeight: 'bold' },
    closeBtn: { padding: 8 },
    loader: { position: 'absolute', top: '50%', left: '50%', marginTop: -25, marginLeft: -25 }
});
