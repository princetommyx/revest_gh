import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Modal } from 'react-native';
import { ArrowLeft, Eye, EyeOff, CircleCheck, Flag } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { authApi } from '../api/auth';

export default function ForgotPasswordScreen() {
    const navigation = useNavigation();
    const [step, setStep] = useState(1); // 1: Identifier, 2: OTP, 3: New Password
    const [resetMethod, setResetMethod] = useState('email');
    const CountryCode = '+233';
    
    // State
    const [identifier, setIdentifier] = useState('');
    const [verificationCode, setVerificationCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const handleRequestOTP = async () => {
        if (!identifier) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: `Please enter your ${resetMethod}` });
            return;
        }
        setLoading(true);
        try {
            let formattedIdentifier = identifier;
            if (resetMethod === 'phone') {
                formattedIdentifier = identifier.startsWith('+') 
                    ? identifier 
                    : `+233${identifier.replace(/^0+/, '')}`;
            }
            await authApi.requestPasswordReset(formattedIdentifier);
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

    const handleVerifyOTP = () => {
        if (!verificationCode || verificationCode.length < 6) {
            Toast.show({ type: 'error', text1: 'Invalid Code', text2: 'Please enter the 6-digit code' });
            return;
        }
        // Proceed to new password step
        setStep(3);
    };

    const handleResetPassword = async () => {
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
            let formattedIdentifier = identifier;
            if (resetMethod === 'phone') {
                formattedIdentifier = identifier.startsWith('+') 
                    ? identifier 
                    : `+233${identifier.replace(/^0+/, '')}`;
            }
            await authApi.confirmPasswordReset({
                identifier: formattedIdentifier,
                otp: verificationCode,
                new_password: newPassword,
                confirm_password: confirmPassword
            });
            setShowSuccessModal(true);
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

    const handleDone = () => {
        setShowSuccessModal(false);
        navigation.navigate('Login');
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={() => { step === 1 ? navigation.goBack() : setStep(step - 1) }} style={styles.backButton}>
                <ArrowLeft size={20} color="#111" />
            </TouchableOpacity>
        </View>
    );

    const renderStepIndicator = () => (
        <View style={styles.stepIndicatorContainer}>
            <View style={[styles.stepLine, step === 1 && styles.stepLineActive]} />
            <View style={[styles.stepLine, step === 2 && styles.stepLineActive]} />
            <View style={[styles.stepLine, step === 3 && styles.stepLineActive]} />
        </View>
    );

    const renderStep1 = () => {
        const isFilled = identifier.length > 0;
        return (
            <View style={styles.stepContainer}>
                <Text style={styles.titleCentered}>Forget password</Text>
                <Text style={styles.subtitleCentered}>Select which methods you'd like to reset.</Text>

                {/* Tab Switcher */}
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[styles.tabButton, resetMethod === 'email' && styles.activeTab]}
                        onPress={() => { setResetMethod('email'); setIdentifier(''); }}
                    >
                        <Text style={[styles.tabText, resetMethod === 'email' && styles.activeTabText]}>Email</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabButton, resetMethod === 'phone' && styles.activeTab]}
                        onPress={() => { setResetMethod('phone'); setIdentifier(''); }}
                    >
                        <Text style={[styles.tabText, resetMethod === 'phone' && styles.activeTabText]}>Phone</Text>
                    </TouchableOpacity>
                </View>

                {resetMethod === 'email' ? (
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Email Address</Text>
                        <View style={styles.inputWrapperFilled}>
                            <TextInput
                                style={styles.input}
                                placeholder="Email I'D"
                                value={identifier}
                                onChangeText={setIdentifier}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                placeholderTextColor="#999"
                            />
                        </View>
                    </View>
                ) : (
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Phone Number</Text>
                        <View style={styles.inputWrapperFilled}>
                            <View style={styles.phoneLabel}>
                                <Text style={{ fontSize: 18 }}>🇬🇭</Text>
                                <Text style={styles.countryCode}>{CountryCode}</Text>
                            </View>
                            <TextInput
                                style={styles.input}
                                placeholder="000 000 0000"
                                value={identifier}
                                onChangeText={setIdentifier}
                                keyboardType="phone-pad"
                                placeholderTextColor="#999"
                            />
                        </View>
                    </View>
                )}

                <View style={styles.spacer} />

                <TouchableOpacity
                    style={[styles.mainBtn, !isFilled && styles.btnDisabled]}
                    onPress={handleRequestOTP}
                    disabled={loading || !isFilled}
                >
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Continue</Text>}
                </TouchableOpacity>
            </View>
        );
    };

    const renderStep2 = () => {
        const isFilled = verificationCode.length === 6;
        return (
            <View style={styles.stepContainer}>
                <Text style={styles.titleCentered}>Enter otp</Text>
                <Text style={styles.subtitleCentered}>
                    A magic code to sign in was sent to{"\n"}
                    <Text style={{ color: '#000', fontWeight: '500' }}>
                        {resetMethod === 'phone' ? (identifier.startsWith('+') ? identifier : `+233 ${identifier.replace(/^0+/, '')}`) : identifier}
                    </Text>
                </Text>

                <View style={styles.otpContainerCircles}>
                    <TextInput
                        style={styles.hiddenOtpInput}
                        value={verificationCode}
                        onChangeText={setVerificationCode}
                        keyboardType="number-pad"
                        maxLength={6}
                        autoFocus
                    />
                    {[0, 1, 2, 3, 4, 5].map(i => (
                        <View key={i} style={[styles.otpCircle, verificationCode.length === i && styles.otpCircleActive]}>
                            <Text style={styles.otpText}>{verificationCode[i] || ''}</Text>
                        </View>
                    ))}
                </View>

                <View style={styles.spacer} />

                <TouchableOpacity
                    style={[styles.mainBtn, !isFilled && styles.btnDisabled]}
                    onPress={handleVerifyOTP}
                    disabled={!isFilled}
                >
                    <Text style={styles.btnText}>Continue</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleRequestOTP} style={styles.resendBtn} disabled={loading}>
                    <Text style={styles.resendText}>Didn't get OTP? <Text style={styles.resendLink}>Resend OTP</Text></Text>
                </TouchableOpacity>
            </View>
        );
    };

    const renderStep3 = () => {
        const isFilled = newPassword.length > 0 && confirmPassword.length > 0;
        return (
            <View style={styles.stepContainer}>
                <Text style={styles.titleCentered}>Reset password</Text>
                <Text style={styles.subtitleCentered}>Select which methods you'd like to reset.</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>New password</Text>
                    <View style={styles.inputWrapperFilled}>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            value={newPassword}
                            onChangeText={setNewPassword}
                            secureTextEntry={!showPassword}
                            placeholderTextColor="#999"
                        />
                        <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff size={20} color="#999" /> : <Eye size={20} color="#999" />}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Confirm password</Text>
                    <View style={styles.inputWrapperFilled}>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showPassword}
                            placeholderTextColor="#999"
                        />
                        <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff size={20} color="#999" /> : <Eye size={20} color="#999" />}
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.spacer} />

                <TouchableOpacity
                    style={[styles.mainBtn, !isFilled && styles.btnDisabled]}
                    onPress={handleResetPassword}
                    disabled={loading || !isFilled}
                >
                    {loading ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <ActivityIndicator color="#fff" style={{ marginRight: 10 }} />
                            <Text style={styles.btnText}>Submitting...</Text>
                        </View>
                    ) : (
                        <Text style={styles.btnText}>Continue</Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {renderHeader()}
                    
                    {step === 1 && renderStep1()}
                    {step === 2 && renderStep2()}
                    {step === 3 && renderStep3()}

                    {renderStepIndicator()}
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal visible={showSuccessModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <TouchableOpacity style={styles.modalCloseIcon} onPress={handleDone}>
                            <Text style={styles.modalCloseText}>✕</Text>
                        </TouchableOpacity>
                        
                        <View style={styles.successIconWrapper}>
                            <CircleCheck size={50} color="#10B981" />
                        </View>
                        
                        <Text style={styles.modalTitle}>Password Changed!</Text>
                        <Text style={styles.modalDesc}>Password updated successfully! You're all set to continue using your account safely.</Text>
                        
                        <TouchableOpacity
                            style={styles.modalDoneBtn}
                            onPress={handleDone}
                        >
                            <Text style={styles.modalDoneBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            
            <Toast />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff', // Pure white background matching mockup
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 20, // Reduced bottom padding since step indicator is at bottom
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20, // Reduced margin since titles are centered below
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FAFAFA',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F3F4F6'
    },
    stepContainer: {
        flex: 1,
    },
    titleCentered: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitleCentered: {
        fontSize: 14,
        color: '#666',
        lineHeight: 22,
        marginBottom: 30,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 30,
        padding: 5,
        marginBottom: 25,
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
    phoneLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
        paddingRight: 10,
        borderRightWidth: 1,
        borderRightColor: '#E5E7EB',
    },
    countryCode: {
        fontSize: 15,
        color: '#111',
        marginLeft: 5,
        fontWeight: '500',
    },
    inputGroup: {
        marginBottom: 25,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111',
        marginBottom: 10,
    },
    inputWrapperFilled: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        backgroundColor: '#F7F7F9', // Very light gray filled input
        height: 60,
        paddingHorizontal: 16,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#111',
        paddingVertical: 0,
    },
    eyeIcon: {
        padding: 5,
    },
    spacer: {
        flex: 1,
        minHeight: 40,
    },
    mainBtn: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        backgroundColor: '#111', // Maintaining dark colors
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 'auto',
        marginBottom: 15,
    },
    btnDisabled: {
        backgroundColor: '#E5E7EB',
    },
    btnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    // OTP Styles
    otpContainerCircles: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 30,
        position: 'relative',
        width: '100%',
    },
    otpCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F7F7F9',
        alignItems: 'center',
        justifyContent: 'center',
    },
    otpCircleActive: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#111',
    },
    otpText: {
        fontSize: 20,
        fontWeight: '600',
        color: '#111',
    },
    hiddenOtpInput: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        opacity: 0,
        zIndex: 10,
    },
    resendBtn: {
        alignItems: 'center',
        marginBottom: 20,
    },
    resendText: {
        fontSize: 14,
        color: '#666',
    },
    resendLink: {
        color: '#111',
        fontWeight: 'bold',
        textDecorationLine: 'underline',
    },
    // Step Indicator
    stepIndicatorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 20,
        marginBottom: 10,
    },
    stepLine: {
        width: 30,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#E5E7EB',
    },
    stepLineActive: {
        backgroundColor: '#111',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 30,
        alignItems: 'center',
        position: 'relative',
    },
    modalCloseIcon: {
        position: 'absolute',
        top: -50,
        alignSelf: 'center',
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCloseText: {
        fontSize: 20,
        color: '#111',
        fontWeight: '600',
    },
    successIconWrapper: {
        width: 150,
        height: 120,
        backgroundColor: '#F3F4F6',
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 25,
        marginTop: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 12,
        textAlign: 'center',
    },
    modalDesc: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    modalDoneBtn: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        backgroundColor: '#111',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalDoneBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    }
});
