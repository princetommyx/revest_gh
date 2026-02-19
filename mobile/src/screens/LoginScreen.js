import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Dimensions } from 'react-native';
import { Mail, Lock, Phone, Eye, EyeOff, User, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';
import { Modal, ActivityIndicator as RNActivityIndicator } from 'react-native';

const { width } = Dimensions.get('window');

const Flag = () => <Text style={{ fontSize: 18, marginRight: 4 }}>🇬🇭</Text>;

export default function LoginScreen() {
    const navigation = useNavigation();
    const [loginMethod, setLoginMethod] = useState('phone'); // 'phone' or 'email'
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const CountryCode = '+233';

    // Verification State
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [verificationCode, setVerificationCode] = useState('');
    const [verifying, setVerifying] = useState(false);
    const [pendingUser, setPendingUser] = useState(null);

    const { signIn, verifyLogin } = useAuth();

    const handleLogin = async () => {
        let usernameToSubmit = '';

        if (loginMethod === 'phone') {
            if (!phoneNumber) {
                Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter your phone number' });
                return;
            }
            let cleanNumber = phoneNumber.replace(/\D/g, '');
            if (cleanNumber.startsWith('0')) cleanNumber = cleanNumber.substring(1);
            usernameToSubmit = CountryCode + cleanNumber;
        } else {
            if (!email) {
                Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter email or username' });
                return;
            }
            usernameToSubmit = email;
        }

        if (!password) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter your password' });
            return;
        }

        setLoading(true);
        try {
            const result = await signIn(usernameToSubmit, password);

            if (result.status === 'verification_required') {
                setPendingUser({
                    id: result.user_id,
                    channel: result.channel,
                    identifier: result.channel === 'phone' ? phoneNumber : email
                });
                setShowOtpModal(true);
                Toast.show({
                    type: 'info',
                    text1: 'Verification Required',
                    text2: result.message
                });
            } else {
                Toast.show({
                    type: 'success',
                    text1: 'Welcome back!',
                    text2: 'Successfully signed in.'
                });
            }
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Login Failed',
                text2: error.response?.data?.detail || 'Invalid credentials'
            });
        } finally {
            setLoading(false);
        }
    };

    const confirmLoginCode = async () => {
        if (!verificationCode || verificationCode.length < 6) {
            Toast.show({ type: 'error', text1: 'Invalid Code', text2: 'Please enter the 6-digit code' });
            return;
        }

        setVerifying(true);
        try {
            await verifyLogin(pendingUser.id, verificationCode);
            setShowOtpModal(false);
            Toast.show({
                type: 'success',
                text1: 'Verified!',
                text2: 'Welcome back to Revesta.'
            });
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Verification Failed',
                text2: error.response?.data?.detail || 'Invalid or expired code'
            });
        } finally {
            setVerifying(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Curved Header Background */}
            <View style={styles.headerBackground}>
                <View style={styles.curvedShape} />
                <SafeAreaView style={styles.headerContent}>
                    <Text style={styles.greetingText}>Hello!</Text>
                    <Text style={styles.welcomeText}>Welcome to Revesta</Text>
                </SafeAreaView>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1, marginTop: -60 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.formCard}>
                        <Text style={styles.cardTitle}>Login</Text>

                        {/* Tab Switcher */}
                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tabButton, loginMethod === 'phone' && styles.activeTab]}
                                onPress={() => setLoginMethod('phone')}
                            >
                                <Text style={[styles.tabText, loginMethod === 'phone' && styles.activeTabText]}>Phone</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tabButton, loginMethod === 'email' && styles.activeTab]}
                                onPress={() => setLoginMethod('email')}
                            >
                                <Text style={[styles.tabText, loginMethod === 'email' && styles.activeTabText]}>Email</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Inputs */}
                        <View style={styles.inputGroup}>
                            {loginMethod === 'phone' ? (
                                <View style={styles.inputWrapper}>
                                    <View style={styles.iconContainer}>
                                        <Phone size={20} color="#666" />
                                    </View>
                                    <View style={styles.phoneLabel}>
                                        <Flag />
                                        <Text style={styles.countryCode}>{CountryCode}</Text>
                                    </View>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Phone number"
                                        value={phoneNumber}
                                        onChangeText={setPhoneNumber}
                                        keyboardType="phone-pad"
                                        placeholderTextColor="#999"
                                    />
                                </View>
                            ) : (
                                <View style={styles.inputWrapper}>
                                    <View style={styles.iconContainer}>
                                        <Mail size={20} color="#666" />
                                    </View>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Email or username"
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        placeholderTextColor="#999"
                                    />
                                </View>
                            )}

                            <View style={[styles.inputWrapper, { marginTop: 15 }]}>
                                <View style={styles.iconContainer}>
                                    <Lock size={20} color="#666" />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                    placeholderTextColor="#999"
                                />
                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff size={20} color="#999" /> : <Eye size={20} color="#999" />}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.forgotPasswordButton}
                            onPress={() => navigation.navigate('ForgotPassword')}
                        >
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.loginButtonText}>Login</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => navigation.navigate('Register')}
                            style={styles.signupContainer}
                        >
                            <Text style={styles.signupText}>
                                Don't have account? <Text style={styles.signupLink}>Sign Up</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Verification Modal */}
            <Modal visible={showOtpModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalIconContainer}>
                            <Lock size={32} color="#2E7D32" />
                        </View>
                        <Text style={styles.modalTitle}>Verification Code</Text>
                        <Text style={styles.modalDesc}>
                            Enter the code sent to your {pendingUser?.channel}
                        </Text>

                        <TextInput
                            style={styles.otpInput}
                            placeholder="000000"
                            placeholderTextColor="#CCC"
                            value={verificationCode}
                            onChangeText={setVerificationCode}
                            keyboardType="number-pad"
                            maxLength={6}
                        />

                        <TouchableOpacity
                            style={styles.modalBtn}
                            onPress={confirmLoginCode}
                            disabled={verifying}
                        >
                            {verifying ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.modalBtnText}>Verify & Login</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => setShowOtpModal(false)}
                            style={styles.modalCancelBtn}
                        >
                            <Text style={styles.modalCancel}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F7F4', // Very light mint/green
    },
    headerBackground: {
        height: 300,
        backgroundColor: '#2E7D32', // Revesta Primary Green
        position: 'relative',
        overflow: 'hidden',
    },
    curvedShape: {
        position: 'absolute',
        bottom: -150,
        left: -width * 0.25,
        width: width * 1.5,
        height: width * 1.5,
        borderRadius: width * 0.75,
        backgroundColor: '#388E3C', // Slightly lighter green for depth
        opacity: 0.3,
    },
    headerContent: {
        paddingHorizontal: 30,
        paddingTop: 40,
    },
    greetingText: {
        fontSize: 42,
        fontWeight: 'bold',
        color: '#fff',
    },
    welcomeText: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 5,
        fontWeight: '500',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    formCard: {
        backgroundColor: '#fff',
        borderRadius: 30,
        padding: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    cardTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 25,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F5F5F5',
        borderRadius: 15,
        padding: 5,
        marginBottom: 25,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 12,
    },
    activeTab: {
        backgroundColor: '#fff',
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        color: '#999',
        fontWeight: '600',
    },
    activeTabText: {
        color: '#2E7D32',
    },
    inputGroup: {
        marginBottom: 15,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        height: 60,
        paddingHorizontal: 15,
    },
    iconContainer: {
        marginRight: 10,
    },
    phoneLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
        borderRightWidth: 1,
        borderRightColor: '#EEE',
        paddingRight: 10,
    },
    countryCode: {
        fontSize: 16,
        color: '#333',
        fontWeight: '600',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#333',
        height: '100%',
    },
    eyeIcon: {
        padding: 5,
    },
    forgotPasswordButton: {
        alignSelf: 'flex-end',
        marginBottom: 30,
    },
    forgotPasswordText: {
        color: '#999',
        fontSize: 14,
        fontWeight: '500',
    },
    loginButton: {
        backgroundColor: '#2E7D32',
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    signupContainer: {
        alignItems: 'center',
        marginTop: 25,
    },
    signupText: {
        color: '#999',
        fontSize: 14,
    },
    signupLink: {
        color: '#2E7D32',
        fontWeight: 'bold',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        backgroundColor: '#fff',
        borderRadius: 25,
        padding: 30,
        alignItems: 'center',
    },
    modalIconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    modalDesc: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 20,
    },
    otpInput: {
        width: '100%',
        height: 60,
        backgroundColor: '#F9FAFB',
        borderRadius: 15,
        textAlign: 'center',
        fontSize: 24,
        letterSpacing: 10,
        fontWeight: 'bold',
        marginBottom: 25,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    modalBtn: {
        backgroundColor: '#2E7D32',
        width: '100%',
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
    },
    modalBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    modalCancelBtn: {
        padding: 10,
    },
    modalCancel: {
        color: '#999',
        fontSize: 14,
        fontWeight: '500',
    },
});

