import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Modal } from 'react-native';
import { ArrowLeft, Eye, EyeOff, CircleCheck } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { authApi } from '../api/auth';
import { useTheme, makeStyles } from '../theme/ThemeContext';

export default function ForgotPasswordScreen() {
    const styles = useStyles();
    const { colors, isDark } = useTheme();
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

    const formattedIdentifier = () => (
        resetMethod === 'phone'
            ? (identifier.startsWith('+') ? identifier : `+233${identifier.replace(/^0+/, '')}`)
            : identifier
    );

    const handleRequestOTP = async () => {
        if (!identifier) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: `Please enter your ${resetMethod}` });
            return;
        }
        setLoading(true);
        try {
            await authApi.requestPasswordReset(formattedIdentifier());
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

    const handleVerifyOTP = async () => {
        if (!verificationCode || verificationCode.length < 6) {
            Toast.show({ type: 'error', text1: 'Invalid Code', text2: 'Please enter the 6-digit code' });
            return;
        }

        // Check the code now rather than letting the user type a whole new
        // password before finding out it was wrong.
        setLoading(true);
        try {
            await authApi.verifyPasswordResetOtp(formattedIdentifier(), verificationCode);
            setStep(3);
        } catch (error) {
            Toast.show({
                type: 'error',
                text1: 'Invalid Code',
                text2: error.response?.data?.error || 'That code is incorrect or has expired.'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async () => {
        // Must match the server's MinimumLengthValidator (8), otherwise a
        // 6-or-7 character password passes here and is rejected on submit.
        if (!newPassword || newPassword.length < 8) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Password must be at least 8 characters' });
            return;
        }
        if (newPassword !== confirmPassword) {
            Toast.show({ type: 'error', text1: 'Validation Error', text2: 'Passwords do not match' });
            return;
        }

        setLoading(true);
        try {
            await authApi.confirmPasswordReset({
                identifier: formattedIdentifier(),
                otp: verificationCode,
                new_password: newPassword,
                confirm_password: confirmPassword
            });
            setShowSuccessModal(true);
        } catch (error) {
            const message = error.response?.data?.error || 'Something went wrong. Please try again.';
            Toast.show({ type: 'error', text1: 'Reset Failed', text2: message });

            // If the code lapsed while they were typing, send them back to the
            // step that can actually fix it instead of stranding them here.
            if (/code/i.test(message)) {
                setVerificationCode('');
                setStep(2);
            }
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
                <ArrowLeft size={20} color={colors.text} />
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
                                placeholder="revestagh@gmail.com"
                                value={identifier}
                                onChangeText={setIdentifier}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                placeholderTextColor={colors.textMuted}
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
                                placeholderTextColor={colors.textMuted}
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
                    {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.btnText}>Continue</Text>}
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
                    A code to reset your password was sent to{"\n"}
                    <Text style={{ color: colors.text, fontWeight: '500' }}>
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
                    style={[styles.mainBtn, (!isFilled || loading) && styles.btnDisabled]}
                    onPress={handleVerifyOTP}
                    disabled={!isFilled || loading}
                >
                    {loading ? <ActivityIndicator color={colors.onPrimary} /> : <Text style={styles.btnText}>Continue</Text>}
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
                            placeholderTextColor={colors.textMuted}
                        />
                        <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color={colors.textMuted} />}
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
                            placeholderTextColor={colors.textMuted}
                        />
                        <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff size={20} color={colors.textMuted} /> : <Eye size={20} color={colors.textMuted} />}
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
                            <ActivityIndicator color={colors.onPrimary} style={{ marginRight: 10 }} />
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
                            <CircleCheck size={50} color={colors.success} />
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

const useStyles = makeStyles((c) => ({
    container: {
        flex: 1,
        backgroundColor: c.surface, // Pure white background matching mockup
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
        backgroundColor: c.bg,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: c.borderSubtle
    },
    stepContainer: {
        flex: 1,
    },
    titleCentered: {
        fontSize: 24,
        fontWeight: 'bold',
        color: c.text,
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitleCentered: {
        fontSize: 14,
        color: c.textSecondary,
        lineHeight: 22,
        marginBottom: 30,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: c.surfaceSunken,
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
        backgroundColor: c.surface,
        shadowColor: c.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    tabText: {
        fontSize: 14,
        color: c.textSecondary,
        fontWeight: '600',
    },
    activeTabText: {
        color: c.text,
    },
    phoneLabel: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 10,
        paddingRight: 10,
        borderRightWidth: 1,
        borderRightColor: c.border,
    },
    countryCode: {
        fontSize: 15,
        color: c.text,
        marginLeft: 5,
        fontWeight: '500',
    },
    inputGroup: {
        marginBottom: 25,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: c.text,
        marginBottom: 10,
    },
    inputWrapperFilled: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        backgroundColor: c.surfaceAlt, // Very light gray filled input
        height: 60,
        paddingHorizontal: 16,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: c.text,
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
        backgroundColor: c.primary, // Maintaining dark colors
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 'auto',
        marginBottom: 15,
    },
    btnDisabled: {
        backgroundColor: c.surfaceSunken,
    },
    btnText: {
        fontSize: 16,
        fontWeight: '600',
        color: c.onPrimary,
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
        backgroundColor: c.surfaceAlt,
        alignItems: 'center',
        justifyContent: 'center',
    },
    otpCircleActive: {
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.primary,
    },
    otpText: {
        fontSize: 20,
        fontWeight: '600',
        color: c.text,
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
        color: c.textSecondary,
    },
    resendLink: {
        color: c.text,
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
        backgroundColor: c.surfaceSunken,
    },
    stepLineActive: {
        backgroundColor: c.primary,
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
        backgroundColor: c.surface,
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
        backgroundColor: c.surface,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalCloseText: {
        fontSize: 20,
        color: c.text,
        fontWeight: '600',
    },
    successIconWrapper: {
        width: 150,
        height: 120,
        backgroundColor: c.surfaceSunken,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 25,
        marginTop: 10,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: c.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    modalDesc: {
        fontSize: 14,
        color: c.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    modalDoneBtn: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        backgroundColor: c.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalDoneBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: c.onPrimary,
    }
}));
