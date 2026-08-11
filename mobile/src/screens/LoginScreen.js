import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Dimensions, Modal, Switch } from 'react-native';
import { Eye, EyeOff, ArrowLeft, Lock } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

const Flag = () => <Text style={{ fontSize: 16, marginRight: 4 }}>🇬🇭</Text>;

export default function LoginScreen() {
    const navigation = useNavigation();
    const [loginMethod, setLoginMethod] = useState('email'); // Default to email to match design
    const [email, setEmail] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
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
                    text2: 'verification code sent through sms to your number'
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

    const handleSocialLogin = (provider) => {
        Toast.show({
            type: 'info',
            text1: 'Coming Soon',
            text2: `${provider} login is not yet integrated.`
        });
    };

    if (showOtpModal) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={[styles.header, { marginTop: 40 }]}>
                    <View style={styles.modalIconContainer}>
                        <Lock size={32} color="#000" />
                    </View>
                    <Text style={styles.greetingText}>Verification Code</Text>
                    <Text style={styles.welcomeText}>
                        Enter the code sent to your {pendingUser?.channel}
                    </Text>
                </View>

                <View style={{ paddingHorizontal: 30, marginTop: 40 }}>
                    <TextInput
                        style={styles.otpInputFull}
                        placeholder="000000"
                        placeholderTextColor="#CCC"
                        value={verificationCode}
                        onChangeText={setVerificationCode}
                        keyboardType="number-pad"
                        maxLength={6}
                    />

                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={confirmLoginCode}
                        disabled={verifying}
                    >
                        {verifying ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loginButtonText}>Verify & Login</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setShowOtpModal(false)}
                        style={{ alignItems: 'center', marginTop: 15 }}
                    >
                        <Text style={{ color: '#999', fontSize: 16, fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <Text style={styles.greetingText}>Welcome Back</Text>
                        <Text style={styles.welcomeText}>Stay connected by signing in with your email and password to access your account.</Text>
                    </View>


                    {/* Tab Switcher - Kept clean to match design */}
                    <View style={styles.tabContainer}>
                        <TouchableOpacity
                            style={[styles.tabButton, loginMethod === 'email' && styles.activeTab]}
                            onPress={() => setLoginMethod('email')}
                        >
                            <Text style={[styles.tabText, loginMethod === 'email' && styles.activeTabText]}>Email</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tabButton, loginMethod === 'phone' && styles.activeTab]}
                            onPress={() => setLoginMethod('phone')}
                        >
                            <Text style={[styles.tabText, loginMethod === 'phone' && styles.activeTabText]}>Phone</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Inputs */}
                    <View style={styles.formSection}>
                        {loginMethod === 'phone' ? (
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Phone Number</Text>
                                <View style={styles.inputWrapper}>
                                    <View style={styles.phoneLabel}>
                                        <Flag />
                                        <Text style={styles.countryCode}>{CountryCode}</Text>
                                    </View>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="000 000 0000"
                                        value={phoneNumber}
                                        onChangeText={setPhoneNumber}
                                        keyboardType="phone-pad"
                                        placeholderTextColor="#999"
                                    />
                                </View>
                            </View>
                        ) : (
                            <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Email Address</Text>
                                <View style={styles.inputWrapper}>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="ethan_miller007@gmail.com"
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        placeholderTextColor="#999"
                                    />
                                </View>
                            </View>
                        )}

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••••"
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
                    </View>

                    <View style={styles.optionsRow}>
                        <View style={styles.rememberMeRow}>
                            <Switch
                                value={rememberMe}
                                onValueChange={setRememberMe}
                                trackColor={{ false: '#E5E7EB', true: '#000' }}
                                thumbColor={'#fff'}
                                ios_backgroundColor="#E5E7EB"
                                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                            />
                            <Text style={styles.rememberMeText}>Remember me</Text>
                        </View>
                        <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')}>
                            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.loginButton}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.loginButtonText}>Sign In</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => navigation.navigate('Register')}
                        style={styles.signupContainer}
                    >
                        <Text style={styles.signupText}>
                            Don't have an account? <Text style={styles.signupLink}>Sign Up</Text>
                        </Text>
                    </TouchableOpacity>

                    <View style={[styles.dividerRow, { marginTop: 30 }]}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or continue with</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <View style={styles.socialRow}>
                        <TouchableOpacity 
                            style={[styles.socialButton, Platform.OS !== 'ios' && { flex: 1 }]} 
                            onPress={() => handleSocialLogin('Google')}
                        >
                            <Text style={styles.googleG}>G</Text>
                            <Text style={styles.socialText}>Google</Text>
                        </TouchableOpacity>
                        
                        {Platform.OS === 'ios' && (
                            <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin('Apple')}>
                                <Text style={styles.appleIcon}></Text>
                                <Text style={styles.socialText}>Apple</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA', // Light gray background
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 25,
        paddingTop: 10,
        paddingBottom: 40,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
        position: 'relative',
    },

    greetingText: {
        fontSize: 26,
        fontWeight: '700',
        color: '#111',
        marginTop: 40,
        marginBottom: 10,
    },
    welcomeText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
    },
    socialRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25,
    },
    socialButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 30,
        height: 56,
        flex: 0.48,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    googleG: {
        fontWeight: 'bold',
        fontSize: 18,
        color: '#DB4437',
        marginRight: 8,
    },
    appleIcon: {
        fontSize: 20,
        color: '#000',
        marginRight: 8,
        marginTop: -2,
    },
    socialText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    dividerText: {
        paddingHorizontal: 15,
        color: '#9CA3AF',
        fontSize: 14,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 30,
        padding: 5,
        marginBottom: 20,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 25,
    },
    activeTab: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        color: '#6B7280',
        fontWeight: '600',
    },
    activeTabText: {
        color: '#111',
    },
    formSection: {
        marginBottom: 20,
    },
    inputGroup: {
        marginBottom: 18,
    },
    inputLabel: {
        fontSize: 14,
        color: '#333',
        marginBottom: 8,
        marginLeft: 4,
        fontWeight: '500',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 30,
        height: 56,
        paddingHorizontal: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.02,
        shadowRadius: 5,
        elevation: 1,
    },
    phoneLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
        borderRightWidth: 1,
        borderRightColor: '#E5E7EB',
        paddingRight: 10,
    },
    countryCode: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#333',
        height: '100%',
    },
    eyeIcon: {
        padding: 5,
    },
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        paddingHorizontal: 4,
    },
    rememberMeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rememberMeText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
    },
    forgotPasswordText: {
        color: '#111',
        fontSize: 14,
        fontWeight: '600',
    },
    loginButton: {
        backgroundColor: '#000',
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    loginButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    signupContainer: {
        alignItems: 'center',
    },
    signupText: {
        color: '#666',
        fontSize: 14,
    },
    signupLink: {
        color: '#000',
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
        borderRadius: 30,
        padding: 30,
        alignItems: 'center',
    },
    modalIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111',
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
        height: 56,
        backgroundColor: '#F9FAFB',
        borderRadius: 28,
        textAlign: 'center',
        fontSize: 24,
        letterSpacing: 8,
        fontWeight: 'bold',
        marginBottom: 25,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    modalBtn: {
        backgroundColor: '#000',
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
        fontWeight: '600',
    },
    otpInputFull: {
        width: '100%',
        height: 60,
        backgroundColor: '#fff',
        borderRadius: 30,
        textAlign: 'center',
        fontSize: 28,
        letterSpacing: 12,
        fontWeight: 'bold',
        marginBottom: 30,
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    }
});
