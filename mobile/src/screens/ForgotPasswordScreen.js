import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, Dimensions, StatusBar } from 'react-native';
import { ArrowLeft, Mail, ChevronRight } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { authApi } from '../api/auth';

const { width } = Dimensions.get('window');

export default function ForgotPasswordScreen() {
    const navigation = useNavigation();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSendResetLink = async () => {
        if (!email) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter your email' });
            return;
        }
        setLoading(true);
        try {
            await authApi.requestPasswordReset(email);
            Toast.show({ type: 'success', text1: 'Email Sent', text2: 'Check your inbox for the reset link.' });
            setTimeout(() => navigation.goBack(), 2000);
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Request Failed', text2: 'Could not send link.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#2E7D32" />

            {/* Organic Curved Header */}
            <View style={styles.headerBackground}>
                <View style={styles.curvedShape} />
                <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerContent}>
                    <View style={styles.headerRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
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
                        <View style={styles.iconCircle}>
                            <Mail size={40} color="#2E7D32" />
                        </View>
                        <Text style={styles.heroTitle}>Forgot Password?</Text>
                        <Text style={styles.heroSub}>
                            Don't worry! Enter the email address associated with your account and we'll send you instructions to reset your password.
                        </Text>

                        <View style={styles.inputSection}>
                            <View style={styles.inputWrapper}>
                                <Mail size={20} color="#9BAA9B" />
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter your email"
                                    value={email}
                                    onChangeText={setEmail}
                                    autoCapitalize="none"
                                    keyboardType="email-address"
                                    placeholderTextColor="#9BAA9B"
                                />
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.mainBtn, loading && styles.btnDisabled]}
                            onPress={handleSendResetLink}
                            disabled={loading}
                        >
                            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Send Reset Link</Text>}
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.backTextBtn} onPress={() => navigation.goBack()}>
                            <Text style={styles.backText}>Remember password? <Text style={styles.backLink}>Login</Text></Text>
                        </TouchableOpacity>
                    </ScrollView>
                </KeyboardAvoidingView>
            </View>
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
