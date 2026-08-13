import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Image, Modal, Dimensions, Platform, KeyboardAvoidingView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Truck, Trash2, Recycle, Check, Upload, Smartphone, Lock, Edit2, Eye, EyeOff } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { PhoneAuth } from '../services/PhoneAuth';
import Toast from 'react-native-toast-message';
import { authApi } from '../api/auth';

const { width } = Dimensions.get('window');

export default function RegisterScreen() {
    const navigation = useNavigation();
    const { signUp } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        username: '',
        email: '',
        password: '',
        confirm_password: '',
        phone_number: '',
        city: 'Accra',
        role: '',
        vehicle_type: '',
        license_plate: '',
        recycler_type: 'INDIVIDUAL',
        company_name: '',
        tax_id: '',
        national_id: '',
        termsAccepted: false,
    });
    const [certificationImage, setCertificationImage] = useState(null);

    // Phone Verification State
    const [verificationCode, setVerificationCode] = useState('');
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
        });

        if (!result.canceled) {
            setCertificationImage(result.assets[0]);
        }
    };

    const handleChange = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleRoleSelect = (role) => {
        if (role === 'RECYCLER') {
            Toast.show({
                type: 'info',
                text1: 'Coming Soon',
                text2: 'The Recycler role is currently under development.',
            });
            return;
        }
        handleChange('role', role);
        setTimeout(() => setStep(2), 200);
    };

    const completeRegistration = async () => {
        setLoading(true);
        try {
            const payload = {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                password2: formData.confirm_password,
                phone_number: formData.phone_number,
                city: formData.city,
                role: formData.role,
                ...(formData.role === 'COLLECTOR' && {
                    vehicle_type: formData.vehicle_type,
                    license_plate: formData.license_plate
                }),
                ...(formData.role === 'RECYCLER' && {
                    recycler_type: formData.recycler_type,
                    company_name: formData.company_name,
                    tax_id: formData.tax_id,
                    national_id: formData.national_id
                })
            };

            let actualPayload = payload;

            if (formData.role === 'RECYCLER' && formData.recycler_type === 'COMPANY') {
                const data = new FormData();
                Object.keys(payload).forEach(key => {
                    if (payload[key] !== undefined && payload[key] !== null) {
                        data.append(key, payload[key]);
                    }
                });

                if (certificationImage) {
                    const localUri = certificationImage.uri;
                    const filename = localUri.split('/').pop();
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : `image`;

                    data.append('business_certification', {
                        uri: localUri,
                        name: filename,
                        type,
                    });
                }
                actualPayload = data;
            }

            await signUp(actualPayload);
            setShowSuccessModal(true);
        } catch (error) {
            console.log("Registration Error Detail:", error);
            Toast.show({
                type: 'error',
                text1: 'Registration Failed',
                text2: error.response?.data?.detail || 'Something went wrong'
            });
        } finally {
            setLoading(false);
        }
    };

    const sendVerification = async () => {
        if (!formData.phone_number || formData.phone_number.length < 9) {
            Alert.alert('Invalid Number', 'Please enter a valid phone number');
            return;
        }
        setLoading(true); // show loading on the signup button while sending OTP
        try {
            const formattedPhone = formData.phone_number.startsWith('+')
                ? formData.phone_number
                : `+233${formData.phone_number.replace(/^0+/, '')}`;

            await PhoneAuth.signInWithPhoneNumber(formattedPhone);
            setStep(3);
            setVerificationCode('');
            Toast.show({
                type: 'success',
                text1: 'Code Sent',
                text2: 'verification code sent through sms to your number'
            });
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Verification Failed', text2: error.message });
        } finally {
            setLoading(false);
        }
    };

    const confirmCode = async () => {
        if (!verificationCode || verificationCode.length < 6) {
            Alert.alert('Invalid Code', 'Please enter the 6-digit code');
            return;
        }
        setVerifying(true);
        try {
            const formattedPhone = formData.phone_number.startsWith('+')
                ? formData.phone_number
                : `+233${formData.phone_number.replace(/^0+/, '')}`;

            await PhoneAuth.confirmCode(formattedPhone, verificationCode);
            Toast.show({ type: 'success', text1: 'Phone Verified', text2: 'Creating your account...' });
            
            // Proceed to actual registration
            await completeRegistration();
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Invalid Code', text2: error.message });
        } finally {
            setVerifying(false);
        }
    };

    const handleRegister = async () => {
        if (formData.password !== formData.confirm_password) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        if (!formData.username || !formData.email || !formData.password || !formData.phone_number) {
            Alert.alert('Error', 'Please fill all required fields');
            return;
        }
        if (!formData.termsAccepted) {
            Alert.alert('Error', 'You must accept the Terms and Conditions');
            return;
        }

        // Role-specific validation
        if (formData.role === 'COLLECTOR') {
            if (!formData.vehicle_type || !formData.license_plate) {
                Alert.alert('Required Fields', 'Vehicle Type and License Plate are required for Collectors.');
                return;
            }
        }

        if (formData.role === 'RECYCLER') {
            if (formData.recycler_type === 'COMPANY' && !formData.company_name) {
                Alert.alert('Required Fields', 'Company Name is required for Company Recyclers.');
                return;
            }
            if (!certificationImage) {
                Alert.alert('Certification Required', 'Please upload your business certification or national ID.');
                return;
            }
        }

        // Extract payload construction to validate with backend before sending OTP
        const payload = {
            username: formData.username,
            email: formData.email,
            password: formData.password,
            password2: formData.confirm_password,
            phone_number: formData.phone_number,
            city: formData.city,
            role: formData.role,
            ...(formData.role === 'COLLECTOR' && {
                vehicle_type: formData.vehicle_type,
                license_plate: formData.license_plate
            }),
            ...(formData.role === 'RECYCLER' && {
                recycler_type: formData.recycler_type,
                company_name: formData.company_name,
                tax_id: formData.tax_id,
                national_id: formData.national_id
            })
        };

        let actualPayload = payload;

        if (formData.role === 'RECYCLER' && formData.recycler_type === 'COMPANY') {
            const data = new FormData();
            Object.keys(payload).forEach(key => {
                if (payload[key] !== undefined && payload[key] !== null) {
                    data.append(key, payload[key]);
                }
            });

            if (certificationImage) {
                const localUri = certificationImage.uri;
                const filename = localUri.split('/').pop();
                const match = /\.(\w+)$/.exec(filename);
                const type = match ? `image/${match[1]}` : `image`;

                data.append('business_certification', {
                    uri: localUri,
                    name: filename,
                    type,
                });
            }
            actualPayload = data;
        }

        setLoading(true);
        try {
            // Validate with backend before sending OTP
            await authApi.validateRegistration(actualPayload);
            
            // If validation is successful, proceed to send verification code
            await sendVerification();
        } catch (error) {
            console.log("Pre-Registration Validation Error:", error);
            const errorDetail = error.response?.data?.detail || 'Please check the details provided.';
            Alert.alert('Registration Error', errorDetail);
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = (provider) => {
        Toast.show({
            type: 'info',
            text1: 'Coming Soon',
            text2: `${provider} login is not yet integrated.`
        });
    };

    const RoleCard = ({ role, title, desc, icon: Icon, color, bgColor }) => {
        const isSelected = formData.role === role;
        return (
            <TouchableOpacity
                onPress={() => handleRoleSelect(role)}
                style={[
                    styles.roleCard,
                    isSelected && { borderColor: '#111', backgroundColor: '#F9FAFB' }
                ]}
            >
                <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
                    <Icon size={24} color={color} />
                </View>
                <View style={styles.roleInfo}>
                    <Text style={styles.roleTitle}>{title}</Text>
                    <Text style={styles.roleDesc}>{desc}</Text>
                </View>
                {isSelected && <Check size={20} color="#111" />}
            </TouchableOpacity>
        );
    };

    const handleBack = () => {
        if (step === 2) {
            setStep(1);
        } else if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('Login');
        }
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                <ArrowLeft size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.greetingText}>Create your account</Text>
            <Text style={styles.welcomeText}>Provide your full name, email, and password to create your account and get started.</Text>
        </View>
    );

    if (step === 1) {
        return (
            <SafeAreaView style={styles.container}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {renderHeader()}
                    <Text style={styles.cardTitle}>Choose your role</Text>
                    <View style={styles.rolesContainer}>
                        <RoleCard
                            role="COLLECTOR"
                            title="Become a Collector"
                            desc="Pick up waste and earn money"
                            icon={Truck}
                            color="#333"
                            bgColor="#F3F4F6"
                        />
                        <RoleCard
                            role="SELLER"
                            title="Become a Disposer"
                            desc="Dispose of waste responsibly"
                            icon={Trash2}
                            color="#333"
                            bgColor="#F3F4F6"
                        />
                        <RoleCard
                            role="RECYCLER"
                            title="Become a Recycler"
                            desc="Buy and process recyclables"
                            icon={Recycle}
                            color="#333"
                            bgColor="#F3F4F6"
                        />
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    if (step === 3) {
        return (
            <SafeAreaView style={styles.container}>
                <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        <View style={styles.header}>
                            <TouchableOpacity onPress={() => setStep(2)} style={styles.backButton}>
                                <ArrowLeft size={24} color="#000" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.stepContainer}>
                            <Text style={styles.titleCentered}>Enter otp</Text>
                            <Text style={styles.subtitleCentered}>
                                A magic code to sign in was sent to{"\n"}
                                <Text style={{ color: '#000', fontWeight: '500' }}>
                                    {formData.phone_number.startsWith('+') ? formData.phone_number : `+233 ${formData.phone_number.replace(/^0+/, '')}`}
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
                                style={[styles.mainBtn, verificationCode.length < 6 && styles.btnDisabled]}
                                onPress={confirmCode}
                                disabled={verifying || verificationCode.length < 6}
                            >
                                {verifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Continue</Text>}
                            </TouchableOpacity>

                            <TouchableOpacity onPress={sendVerification} style={styles.resendBtn} disabled={loading}>
                                <Text style={styles.resendText}>Didn't get OTP? <Text style={styles.resendLink}>Resend OTP</Text></Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
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
                    {renderHeader()}


                    <View style={styles.formFields}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Username</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="ethan_miller"
                                    placeholderTextColor="#999"
                                    value={formData.username}
                                    onChangeText={(val) => handleChange('username', val.toLowerCase().replace(/\s/g, ''))}
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Email Address</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="ethan_miller007@gmail.com"
                                    placeholderTextColor="#999"
                                    value={formData.email}
                                    onChangeText={(val) => handleChange('email', val)}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Mobile Number</Text>
                            <View style={styles.inputWrapper}>
                                <View style={styles.phoneLabel}>
                                    <Text style={styles.countryCode}>🇬🇭 +233</Text>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="000 000 0000"
                                    placeholderTextColor="#999"
                                    value={formData.phone_number}
                                    onChangeText={(val) => handleChange('phone_number', val)}
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Password</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••••"
                                    placeholderTextColor="#999"
                                    value={formData.password}
                                    onChangeText={(val) => handleChange('password', val)}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff size={20} color="#999" /> : <Eye size={20} color="#999" />}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Confirm Password</Text>
                            <View style={styles.inputWrapper}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="••••••••••"
                                    placeholderTextColor="#999"
                                    value={formData.confirm_password}
                                    onChangeText={(val) => handleChange('confirm_password', val)}
                                    secureTextEntry={!showPassword}
                                />
                                <TouchableOpacity style={styles.eyeIcon} onPress={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <EyeOff size={20} color="#999" /> : <Eye size={20} color="#999" />}
                                </TouchableOpacity>
                            </View>
                        </View>

                        {formData.role === 'COLLECTOR' && (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Vehicle Type</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="e.g. TRUCK"
                                            placeholderTextColor="#999"
                                            value={formData.vehicle_type}
                                            onChangeText={(val) => handleChange('vehicle_type', val)}
                                        />
                                    </View>
                                </View>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>License Plate</Text>
                                    <View style={styles.inputWrapper}>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="AAA-1234"
                                            placeholderTextColor="#999"
                                            value={formData.license_plate}
                                            onChangeText={(val) => handleChange('license_plate', val)}
                                        />
                                    </View>
                                </View>
                            </>
                        )}

                        {formData.role === 'RECYCLER' && (
                            <View style={{ marginTop: 15, marginBottom: 15 }}>
                                <Text style={styles.inputLabel}>Recycler Type</Text>
                                <View style={styles.chipRow}>
                                    <TouchableOpacity
                                        style={[styles.smallChip, formData.recycler_type === 'INDIVIDUAL' && styles.smallChipActive]}
                                        onPress={() => handleChange('recycler_type', 'INDIVIDUAL')}
                                    >
                                        <Text style={[styles.smallChipText, formData.recycler_type === 'INDIVIDUAL' && styles.smallChipTextActive]}>Individual</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.smallChip, formData.recycler_type === 'COMPANY' && styles.smallChipActive]}
                                        onPress={() => handleChange('recycler_type', 'COMPANY')}
                                    >
                                        <Text style={[styles.smallChipText, formData.recycler_type === 'COMPANY' && styles.smallChipTextActive]}>Company</Text>
                                    </TouchableOpacity>
                                </View>

                                {formData.recycler_type === 'COMPANY' ? (
                                    <>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>Company Name</Text>
                                            <View style={styles.inputWrapper}>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="Acme Recycling"
                                                    placeholderTextColor="#999"
                                                    value={formData.company_name}
                                                    onChangeText={(val) => handleChange('company_name', val)}
                                                />
                                            </View>
                                        </View>
                                        <View style={styles.inputGroup}>
                                            <Text style={styles.inputLabel}>Tax ID</Text>
                                            <View style={styles.inputWrapper}>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="TIN-XXXX"
                                                    placeholderTextColor="#999"
                                                    value={formData.tax_id}
                                                    onChangeText={(val) => handleChange('tax_id', val)}
                                                />
                                            </View>
                                        </View>
                                        <TouchableOpacity style={styles.uploadBox} onPress={pickImage}>
                                            {certificationImage ? (
                                                <View style={styles.uploadRow}>
                                                    <Image source={{ uri: certificationImage.uri }} style={styles.miniPreview} />
                                                    <Text style={styles.uploadInfo} numberOfLines={1}>{certificationImage.uri.split('/').pop()}</Text>
                                                    <Text style={styles.changeLink}>Change</Text>
                                                </View>
                                            ) : (
                                                <View style={styles.uploadRow}>
                                                    <Upload size={20} color="#111" />
                                                    <Text style={[styles.uploadInfo, { marginLeft: 10 }]}>Business Certificate</Text>
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </>
                                ) : (
                                    <View style={styles.inputGroup}>
                                        <Text style={styles.inputLabel}>National ID</Text>
                                        <View style={styles.inputWrapper}>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="GHA-XXXXX"
                                                placeholderTextColor="#999"
                                                value={formData.national_id}
                                                onChangeText={(val) => handleChange('national_id', val)}
                                            />
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    <View style={styles.termsRow}>
                        <Switch
                            value={formData.termsAccepted}
                            onValueChange={(val) => handleChange('termsAccepted', val)}
                            trackColor={{ false: '#E5E7EB', true: '#000' }}
                            thumbColor={'#fff'}
                            ios_backgroundColor="#E5E7EB"
                            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                        />
                        <Text style={styles.termsText}>I agree to the Terms & Privacy Policy</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.registerButton}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.registerButtonText}>Sign Up</Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.footerLink}>
                        <Text style={styles.footerText}>
                            Already have an account? <Text style={styles.footerLinkBold}>Sign In</Text>
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


            {/* Success Modal */}
            <Modal visible={showSuccessModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.successIconWrapper}>
                            <Check size={40} color="#fff" />
                        </View>
                        <Text style={styles.modalTitle}>Successful!</Text>
                        <Text style={styles.modalDesc}>Your account is created successfully and ready now.</Text>
                        <TouchableOpacity
                            style={styles.modalBtn}
                            onPress={() => {
                                setShowSuccessModal(false);
                            }}
                        >
                            <Text style={styles.modalBtnText}>Browse Home</Text>
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
        backgroundColor: '#FAFAFA',
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
    backButton: {
        position: 'absolute',
        left: 0,
        top: 0,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
        zIndex: 10,
    },
    greetingText: {
        fontSize: 26,
        fontWeight: '700',
        color: '#111',
        marginTop: 40,
        marginBottom: 10,
        textAlign: 'center',
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
    cardTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 20,
        textAlign: 'center',
    },
    roleLabel: {
        fontSize: 14,
        color: '#999',
        marginBottom: 25,
        fontWeight: '500',
        textAlign: 'center',
    },
    rolesContainer: {
        gap: 15,
        paddingBottom: 20,
    },
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderWidth: 2,
        borderColor: '#E5E7EB',
        borderRadius: 20,
        backgroundColor: '#fff',
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    roleInfo: {
        flex: 1,
    },
    roleTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 4,
    },
    roleDesc: {
        fontSize: 13,
        color: '#666',
    },
    formFields: {
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
    input: {
        flex: 1,
        fontSize: 15,
        color: '#333',
        height: '100%',
    },
    eyeIcon: {
        padding: 5,
    },
    phoneLabel: {
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
    verifySmallBtn: {
        backgroundColor: '#F3F4F6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 15,
    },
    verifySmallText: {
        color: '#111',
        fontSize: 12,
        fontWeight: '600',
    },
    chipRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 5,
    },
    smallChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
    },
    smallChipActive: {
        backgroundColor: '#000',
    },
    smallChipText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    smallChipTextActive: {
        color: '#fff',
    },
    uploadBox: {
        marginTop: 15,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 20,
        backgroundColor: '#fff',
        padding: 20,
        borderStyle: 'dashed',
    },
    uploadRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    miniPreview: {
        width: 36,
        height: 36,
        borderRadius: 8,
        marginRight: 10,
    },
    uploadInfo: {
        flex: 1,
        fontSize: 14,
        color: '#666',
    },
    changeLink: {
        fontSize: 13,
        color: '#111',
        fontWeight: 'bold',
    },
    termsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
        paddingHorizontal: 4,
    },
    termsText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
    },
    registerButton: {
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
    registerButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footerLink: {
        alignItems: 'center',
    },
    footerText: {
        color: '#666',
        fontSize: 14,
    },
    footerLinkBold: {
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
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111',
        marginBottom: 10,
        textAlign: 'center',
    },
    modalDesc: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 25,
        lineHeight: 22,
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
    modalCancel: {
        color: '#999',
        fontSize: 14,
        fontWeight: '600',
    },
    successIconWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#22C55E', // Green check mark
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    verificationContainer: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 40,
    },
    verificationIconWrapper: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FAFAFA', // light outer ring
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
        position: 'relative',
        borderWidth: 1,
        borderColor: '#F3F4F6',
        borderStyle: 'dashed'
    },
    verificationInnerCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#111', // matching app's main dark color
        alignItems: 'center',
        justifyContent: 'center',
    },
    verificationTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#111',
        marginBottom: 10,
    },
    verificationDesc: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 30,
        paddingHorizontal: 20,
        lineHeight: 20,
    },
    otpContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginBottom: 30,
        position: 'relative',
        width: '100%',
        paddingHorizontal: 20,
    },
    otpBox: {
        width: 45,
        height: 55,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAFAFA',
    },
    otpBoxActive: {
        borderColor: '#111',
        backgroundColor: '#fff',
    },
    otpText: {
        fontSize: 24,
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
    phoneDisplayRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 40,
    },
    phoneDisplayText: {
        fontSize: 16,
        color: '#4B5563',
        marginRight: 10,
        fontWeight: '500',
    },
    editPhoneBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FAFAFA',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    sendAgainBtn: {
        width: '100%',
        height: 50,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
        backgroundColor: '#fff'
    },
    sendAgainText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111',
    },
    verifySubmitBtn: {
        width: '100%',
        height: 50,
        borderRadius: 25,
        backgroundColor: '#111',
        alignItems: 'center',
        justifyContent: 'center',
    },
    verifySubmitText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
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
    spacer: {
        flex: 1,
        minHeight: 40,
    },
    mainBtn: {
        width: '100%',
        height: 56,
        borderRadius: 28,
        backgroundColor: '#111',
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
    }
});
