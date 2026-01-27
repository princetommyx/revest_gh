import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { useAuth } from '../context/AuthContext';
import Toast from 'react-native-toast-message';

WebBrowser.maybeCompleteAuthSession();

// Ghana flag component (simple unicode or image if available, using unicode for now)
const Flag = () => <Text style={{ fontSize: 20, marginRight: 5 }}>🇬🇭</Text>;

export default function LoginScreen() {
    const navigation = useNavigation();
    const [loginMethod, setLoginMethod] = useState('phone'); // 'phone' or 'email'
    const [email, setEmail] = useState(''); // Used for Email/Username
    const [phoneNumber, setPhoneNumber] = useState(''); // Used for Phone
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const CountryCode = '+233';

    const [request, response, promptAsync] = Google.useAuthRequest({
        webClientId: '196345204120-trrs708ntrih7r7aaf1bccv2u2io1e1p.apps.googleusercontent.com',
        androidClientId: '196345204120-trrs708ntrih7r7aaf1bccv2u2io1e1p.apps.googleusercontent.com',
        iosClientId: '196345204120-trrs708ntrih7r7aaf1bccv2u2io1e1p.apps.googleusercontent.com',
    });

    React.useEffect(() => {
        if (response?.type === 'success') {
            const { authentication } = response;
            handleGoogleBackend(authentication.accessToken);
        }
    }, [response]);

    const { signIn, googleSignIn } = useAuth();

    const handleGoogleBackend = async (token) => {
        setLoading(true);
        try {
            await googleSignIn(token);
        } catch (error) {
            console.log("Google Login Error:", error);
            Toast.show({
                type: 'error',
                text1: 'Google Login Failed',
                text2: 'Could not authenticate with server'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = async () => {
        let usernameToSubmit = '';

        if (loginMethod === 'phone') {
            if (!phoneNumber) {
                Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Please enter your phone number' });
                return;
            }
            // Format phone number: Remove leading 0 if present, prepend country code
            let cleanNumber = phoneNumber.replace(/\D/g, ''); // Remove non-digits
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
            await signIn(usernameToSubmit, password);
            Toast.show({
                type: 'success',
                text1: 'Welcome back!',
                text2: 'Successfully signed in.'
            });
        } catch (error) {
            console.log(error);
            Toast.show({
                type: 'error',
                text1: 'Login Failed',
                text2: error.response?.data?.detail || 'Invalid credentials'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                            <ArrowLeft size={24} color="#000" />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>Login</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <View style={styles.content}>

                        {/* Tab Switcher */}
                        <View style={styles.tabContainer}>
                            <TouchableOpacity
                                style={[styles.tabButton, loginMethod === 'phone' && styles.activeTab]}
                                onPress={() => setLoginMethod('phone')}
                            >
                                <Text style={[styles.tabText, loginMethod === 'phone' && styles.activeTabText]}>Phone number</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.tabButton, loginMethod === 'email' && styles.activeTab]}
                                onPress={() => setLoginMethod('email')}
                            >
                                <Text style={[styles.tabText, loginMethod === 'email' && styles.activeTabText]}>Email or username</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Inputs */}
                        <View style={styles.formContainer}>
                            {loginMethod === 'phone' ? (
                                <View style={styles.phoneRow}>
                                    <View style={styles.countryCodeContainer}>
                                        <Flag />
                                        <Text style={styles.countryCodeText}>{CountryCode}</Text>
                                    </View>
                                    <View style={styles.phoneInputContainer}>
                                        <TextInput
                                            style={styles.phoneInput}
                                            placeholder="Phone number"
                                            value={phoneNumber}
                                            onChangeText={setPhoneNumber}
                                            keyboardType="phone-pad"
                                            placeholderTextColor="#999"
                                        />
                                    </View>
                                </View>
                            ) : (
                                <View style={styles.inputContainer}>
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

                            <View style={styles.inputContainer}>
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

                            <TouchableOpacity
                                style={styles.forgotPasswordContainer}
                                onPress={() => navigation.navigate('ForgotPassword')}
                            >
                                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Login Button */}
                        <TouchableOpacity
                            style={styles.button}
                            onPress={handleLogin}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Continue</Text>
                            )}
                        </TouchableOpacity>

                        {/* Divider */}
                        <View style={styles.dividerContainer}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.dividerText}>Or continue with</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        {/* Google Button */}
                        <TouchableOpacity
                            style={styles.googleButton}
                            onPress={() => promptAsync()}
                            disabled={!request}
                        >
                            <Image
                                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/2991/2991148.png' }}
                                style={styles.googleIcon}
                            />
                            <Text style={styles.googleButtonText}>Sign in with Google</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.signupContainer}>
                            <Text style={styles.signupText}>
                                Don't have an account? <Text style={styles.signupLink}>Sign Up</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
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
        paddingBottom: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 4,
        marginBottom: 30,
        height: 50,
    },
    tabButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 10,
    },
    activeTab: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
    },
    activeTabText: {
        color: '#000',
        fontWeight: '600',
    },
    formContainer: {
        marginBottom: 20,
    },
    phoneRow: {
        flexDirection: 'row',
        marginBottom: 15,
        gap: 12,
    },
    countryCodeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        paddingHorizontal: 12,
        width: 100,
        height: 56,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    countryCodeText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    phoneInputContainer: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        height: 56,
        justifyContent: 'center',
    },
    phoneInput: {
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#333',
        height: '100%',
    },
    inputContainer: {
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        marginBottom: 15,
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        paddingHorizontal: 16,
        fontSize: 16,
        colors: '#333',
        height: '100%',
    },
    eyeIcon: {
        padding: 10,
    },
    forgotPasswordContainer: {
        alignItems: 'flex-end',
        marginTop: 5,
    },
    forgotPasswordText: {
        color: '#2E7D32',
        fontSize: 14,
        fontWeight: '500',
    },
    button: {
        backgroundColor: '#2E7D32',
        height: 56,
        borderRadius: 28, // Fully rounded
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 30,
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 30,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#E5E7EB',
    },
    dividerText: {
        marginHorizontal: 10,
        color: '#6B7280',
        fontSize: 14,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        height: 56,
        borderRadius: 28,
        marginBottom: 20,
    },
    googleIcon: {
        width: 24,
        height: 24,
        marginRight: 10,
    },
    googleButtonText: {
        color: '#333',
        fontSize: 16,
        fontWeight: '600',
    },
    signupContainer: {
        alignItems: 'center',
        marginTop: 10,
    },
    signupText: {
        color: '#6B7280',
        fontSize: 14,
    },
    signupLink: {
        color: '#2E7D32',
        fontWeight: 'bold',
    },
});

