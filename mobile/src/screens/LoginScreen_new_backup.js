import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Dimensions, StatusBar } from 'react-native';
import { Mail, Lock, Phone, Eye, EyeOff, User, Check, ArrowLeft } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';
import { Modal, ActivityIndicator as RNActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

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
        <SafeAreaView style={styles.container}>
            <StatusBar translucent backgroundColor="transparent" barStyle="dark-content" />

            <View style={styles.header}>
                {navigation.canGoBack() && (
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ArrowLeft size={24} color="#1a1a1a" />
                    </TouchableOpacity>
                )}
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.headerContent}>
                        <Text style={styles.greetingText}>Welcome Back</Text>
                        <Text style={styles.welcomeText}>Sign in to continue to ReVesta</Text>
                    </View>

                    <View style={styles.formCard}>

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
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContent: {
        paddingHorizontal: 30,
        marginBottom: 40,
    },
    greetingText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1a1a1a',
    },
    welcomeText: {
        fontSize: 16,
        color: '#666',
        marginTop: 8,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 40,
    },
    formCard: {
        paddingHorizontal: 30,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F9FAFB',
        borderRadius: 20,
        padding: 6,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    tabButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 16,
    },
    activeTab: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    tabText: {
        fontSize: 15,
        color: '#999',
        fontWeight: '600',
    },
    activeTabText: {
        color: '#1a1a1a',
    },
    inputGroup: {
        marginBottom: 15,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1.5,
        borderColor: '#F3F4F6',
        height: 64,
        paddingHorizontal: 20,
    },
    iconContainer: {
        marginRight: 15,
    },
    phoneLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
        borderRightWidth: 1.5,
        borderRightColor: '#F3F4F6',
        paddingRight: 15,
    },
    countryCode: {
        fontSize: 16,
        color: '#1a1a1a',
        fontWeight: '600',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1a1a1a',
        height: '100%',
        fontWeight: '500',
    },
    eyeIcon: {
        padding: 10,
    },
    forgotPasswordButton: {
        alignSelf: 'flex-end',
        marginBottom: 35,
        marginTop: 5,
    },
    forgotPasswordText: {
        color: '#2E7D32',
        fontSize: 14,
        fontWeight: 'bold',
    },
    loginButton: {
        backgroundColor: '#1E3A8A', // Deep Blue
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#1E3A8A',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 15,
        elevation: 6,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    },
    signupContainer: {
        alignItems: 'center',
        marginTop: 35,
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

