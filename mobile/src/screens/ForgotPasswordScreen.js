import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Dimensions, StatusBar } from 'react-native';
import { ArrowLeft, Mail, Smartphone, Lock, CheckCircle2, Eye, EyeOff } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { authApi } from '../api/auth';

const { width } = Dimensions.get('window');

export default function ForgotPasswordScreen() {
    const navigation = useNavigation();
    const [step, setStep] = useState(1); // 1: Identifier, 2: OTP, 3: New Password
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleRequestOTP = async () => {
        if (!identifier) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter your email or phone number' });
            return;
        }
        setLoading(true);
        try {
            await authApi.requestPasswordReset(identifier);
            Toast.show({
                type: 'success',
                text1: 'Verification Sent',
                text2: 'If an account exists, you will receive a code.'
            });
            setStep(2);
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Request Failed',
                text2: error.response?.data?.error || 'Could not send verification code.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!otp || otp.length < 6) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter the 6-digit code' });
            return;
        }
        if (!newPassword || newPassword.length < 6) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Password must be at least 6 characters' });
            return;
        }
        if (newPassword !== confirmPassword) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Passwords do not match' });
            return;
        }

        setLoading(true);
        try {
            await authApi.confirmPasswordReset({
                identifier,
                otp,
                new_password: newPassword,
                confirm_password: confirmPassword
            });
            Toast.show({
                type: 'success',
                text1: 'Password Reset',
                text2: 'Your password has been changed successfully.'
            });
            setTimeout(() => navigation.navigate('Login'), 2000);
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Reset Failed',
                text2: error.response?.data?.error || 'Invalid or expired code.'
            });
        } finally {
            setLoading(false);
        }
    };

    const renderStep1 = () => (
        <>
            <View style={styles.iconCircle}>
                <Smartphone size={40} color="#2E7D32" />
            </View>
            <Text style={styles.heroTitle}>Forgot Password?</Text>
            <Text style={styles.heroSub}>
                Enter the email or phone number associated with your account to receive a reset code.
            </Text>

            <View style={styles.inputSection}>
                <View style={styles.inputWrapper}>
                    <Mail size={20} color="#9BAA9B" />
                    <TextInput
                        style={styles.input}
                        placeholder="Email or phone number"
                        value={identifier}
                        onChangeText={setIdentifier}
                        autoCapitalize="none"
                        placeholderTextColor="#9BAA9B"
                    />
                </View>
            </View>

            <TouchableOpacity
                style={[styles.mainBtn, loading && styles.btnDisabled]}
                onPress={handleRequestOTP}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Code</Text>}
            </TouchableOpacity>
        </>
    );

    const renderStep2 = () => (
        <>
            <View style={styles.iconCircle}>
                <Lock size={40} color="#2E7D32" />
            </View>
            <Text style={styles.heroTitle}>Verification Code</Text>
            <Text style={styles.heroSub}>
                Enter the 6-digit code sent to your {identifier.includes('@') ? 'email' : 'phone'}.
            </Text>

            <View style={styles.inputSection}>
                <View style={styles.inputWrapper}>
                    <CheckCircle2 size={20} color="#9BAA9B" />
                    <TextInput
                        style={styles.input}
                        placeholder="Enter 6-digit code"
                        value={otp}
                        onChangeText={setOtp}
                        keyboardType="number-pad"
                        maxLength={6}
                        placeholderTextColor="#9BAA9B"
                        letterSpacing={step === 2 ? 5 : 0}
                    />
                </View>

                <View style={[styles.inputWrapper, { marginTop: 15 }]}>
                    <Lock size={20} color="#9BAA9B" />
                    <TextInput
                        style={styles.input}
                        placeholder="New Password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showPassword}
                        placeholderTextColor="#9BAA9B"
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                        {showPassword ? <EyeOff size={20} color="#9BAA9B" /> : <Eye size={20} color="#9BAA9B" />}
                    </TouchableOpacity>
                </View>

                <View style={[styles.inputWrapper, { marginTop: 15 }]}>
                    <Lock size={20} color="#9BAA9B" />
                    <TextInput
                        style={styles.input}
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showPassword}
                        placeholderTextColor="#9BAA9B"
                    />
                </View>
            </View>

            <TouchableOpacity
                style={[styles.mainBtn, loading && styles.btnDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
            >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Reset Password</Text>}
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.backTextBtn}
                onPress={() => setStep(1)}
                disabled={loading}
            >
                <Text style={styles.backText}>Change email/phone number</Text>
            </TouchableOpacity>
        </>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />

            <View style={styles.headerBackground}>
                <View style={styles.curvedShape} />
                <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerContent}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => step === 1 ? navigation.goBack() : setStep(1)} style={styles.backBtn}>
                            <ArrowLeft size={24} color="#fff" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Password Reset</Text>
                        <View style={{ width: 40 }} />
                    </View>
                </SafeAreaView>
            </View>

            <View style={styles.contentWrap}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.scrollPadding} showsVerticalScrollIndicator={false}>
                        {step === 1 ? renderStep1() : renderStep2()}

                        <TouchableOpacity style={styles.backTextBtn} onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.backText}>Remember password? <Text style={styles.backLink}>Login</Text></Text>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
            <Toast />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F0F7F4' },
    headerBackground: { height: 160, backgroundColor: '#2E7D32', overflow: 'hidden' },
    curvedShape: {
        position: 'absolute', bottom: -80, left: -width * 0.25,
        width: width * 1.5, height: width * 1.5, borderRadius: width * 0.75,
        backgroundColor: '#388E3C', opacity: 0.3
    },
    headerContent: { paddingHorizontal: 25, paddingTop: 10 },
    headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
    contentWrap: { flex: 1, marginTop: -35, backgroundColor: '#fff', borderTopLeftRadius: 35, borderTopRightRadius: 35 },
    scrollPadding: { padding: 25, paddingBottom: 50, alignItems: 'center' },
    iconCircle: { width: 90, height: 90, borderRadius: 30, backgroundColor: '#F0F7F4', justifyContent: 'center', alignItems: 'center', marginBottom: 25, marginTop: 10 },
    heroTitle: { fontSize: 24, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 12 },
    heroSub: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 22, marginBottom: 35, paddingHorizontal: 20 },
    inputSection: { width: '100%', marginBottom: 30 },
    inputWrapper: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3F4F6',
        borderRadius: 20, paddingHorizontal: 20, height: 60
    },
    input: { flex: 1, marginLeft: 15, fontSize: 16, color: '#1A1A1A' },
    mainBtn: {
        backgroundColor: '#2E7D32', width: '100%', height: 60, borderRadius: 30,
        justifyContent: 'center', alignItems: 'center', shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 6
    },
    btnDisabled: { backgroundColor: '#D1D5DB' },
    btnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    backTextBtn: { marginTop: 25 },
    backText: { fontSize: 14, color: '#6B7280' },
    backLink: { color: '#2E7D32', fontWeight: 'bold' }
});
