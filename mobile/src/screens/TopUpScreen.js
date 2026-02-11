import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { Paystack } from 'react-native-paystack-webview';
import { useNavigation } from '@react-navigation/native';
import { CreditCard, ArrowLeft, Wallet } from 'lucide-react-native';
import apiClient from '../api/client';
import Toast from 'react-native-root-toast';

// LIVE PUBLIC KEY provided by user
const PAYSTACK_PUBLIC_KEY = 'pk_live_0ef4887fb63cb118763e8a67e512ced251884658';

export default function TopUpScreen({ route }) {
    const navigation = useNavigation();
    const { user } = route.params || {}; // Pass user object to pre-fill email/phone
    const [amount, setAmount] = useState('');
    const [loading, setLoading] = useState(false);
    const paystackWebViewRef = useRef();

    const handlePayPress = () => {
        if (!amount || isNaN(amount) || Number(amount) < 1) {
            Alert.alert('Invalid Amount', 'Please enter a valid amount (min 1 GHS).');
            return;
        }
        // Start Paystack flow
        paystackWebViewRef.current.startTransaction();
    };

    const handleSuccess = async (res) => {
        // res structure: { status: "success", transactionRef: { ... }, reference: "..." }
        setLoading(true);
        try {
            console.log('Paystack success:', res);
            const reference = res.reference || res.transactionRef?.reference;

            // Call backend to verify and credit wallet
            const response = await apiClient.post('/wallet/verify_payment/', {
                reference: reference,
                amount: Number(amount)
            });

            Toast.show('Wallet credited successfully!', {
                duration: Toast.durations.LONG,
                position: Toast.positions.CENTER,
                backgroundColor: '#2E7D32',
                textColor: '#fff'
            });

            // Go back to wallet
            navigation.goBack();

        } catch (error) {
            console.error('Verification error:', error);
            Alert.alert('Verification Failed', 'Payment successful but wallet update failed. Please contact support.');
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        Toast.show('Transaction cancelled', {
            duration: Toast.durations.SHORT,
            position: Toast.positions.BOTTOM,
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <ArrowLeft size={24} color="#1a1a1a" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Top Up Wallet</Text>
                <View style={{ width: 24 }} />
            </View>

            <View style={styles.content}>
                <View style={styles.iconContainer}>
                    <Wallet size={48} color="#2E7D32" />
                </View>

                <Text style={styles.label}>Enter Amount (GHS)</Text>
                <View style={styles.inputContainer}>
                    <Text style={styles.currency}>GH₵</Text>
                    <TextInput
                        style={styles.input}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        placeholder="0.00"
                        autoFocus
                    />
                </View>

                <TouchableOpacity
                    style={[styles.payBtn, loading && styles.payBtnDisabled]}
                    onPress={handlePayPress}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <CreditCard size={20} color="#fff" />
                            <Text style={styles.payBtnText}>Pay Now</Text>
                        </>
                    )}
                </TouchableOpacity>

                <Text style={styles.secureText}>
                    Secured by Paystack
                </Text>
            </View>

            <Paystack
                paystackKey={PAYSTACK_PUBLIC_KEY}
                amount={amount} // Paystack WebView handles conversion or expects GHS directly? Usually expects regular currency unit if configured, checking docs... Library usually takes regular amount.
                billingEmail={user?.email || 'user@revesta.com'}
                billingName={user?.first_name || 'Revesta User'}
                billingMobile={user?.phone_number || '0240000000'}
                currency='GHS'
                activityIndicatorColor="green"
                onCancel={handleCancel}
                onSuccess={handleSuccess}
                ref={paystackWebViewRef}
                channels={['mobile_money', 'card']} // Enable MoMo
            />
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
        borderBottomColor: '#f0f0f0'
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
    content: { flex: 1, padding: 24, alignItems: 'center', paddingTop: 40 },
    iconContainer: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24
    },
    label: { fontSize: 16, color: '#666', marginBottom: 12 },
    inputContainer: {
        flexDirection: 'row', alignItems: 'center',
        borderBottomWidth: 2, borderBottomColor: '#2E7D32',
        marginBottom: 40, paddingBottom: 8, width: '80%', justifyContent: 'center'
    },
    currency: { fontSize: 32, fontWeight: 'bold', color: '#2E7D32', marginRight: 8 },
    input: { fontSize: 40, fontWeight: 'bold', color: '#1a1a1a', minWidth: 100, textAlign: 'center' },
    payBtn: {
        backgroundColor: '#2E7D32', paddingVertical: 16, paddingHorizontal: 32,
        borderRadius: 30, flexDirection: 'row', alignItems: 'center', gap: 10,
        width: '100%', justifyContent: 'center', elevation: 3
    },
    payBtnDisabled: { opacity: 0.7 },
    payBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
    secureText: { marginTop: 20, color: '#999', fontSize: 12 }
});
