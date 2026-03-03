import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Image, Modal, Dimensions, Platform, KeyboardAvoidingView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import {
    ArrowLeft, Truck, Trash2, Recycle, Check, Upload,
    Mail, Lock, Phone, User, FileText, Smartphone
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import * as ImagePicker from 'expo-image-picker';
import { PhoneAuth } from '../services/PhoneAuth';
import Toast from 'react-native-toast-message';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

export default function RegisterScreen() {
    const navigation = useNavigation();
    const { signUp } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

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
    const [isPhoneVerified, setIsPhoneVerified] = useState(false);
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [verifying, setVerifying] = useState(false);

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
        handleChange('role', role);
        setTimeout(() => setStep(2), 200);
    };

    const sendVerification = async () => {
        if (!formData.phone_number || formData.phone_number.length < 9) {
            Alert.alert('Invalid Number', 'Please enter a valid phone number');
            return;
        }
        setVerifying(true);
        try {
            const formattedPhone = formData.phone_number.startsWith('+')
                ? formData.phone_number
                : `+233${formData.phone_number.replace(/^0+/, '')}`;

            await PhoneAuth.signInWithPhoneNumber(formattedPhone);
            setShowOtpModal(true);
            Toast.show({
                type: 'success',
                text1: 'Code Sent',
                text2: 'verification code sent through sms to your number'
            });
        } catch (error) {
            Toast.show({ type: 'error', text1: 'Verification Failed', text2: error.message });
        } finally {
            setVerifying(false);
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
            setIsPhoneVerified(true);
            setShowOtpModal(false);
            Toast.show({ type: 'success', text1: 'Phone Verified', text2: 'You can now proceed' });
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
        if (!isPhoneVerified) {
            Alert.alert('Verification Required', 'Please verify your phone number to continue.');
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

            Toast.show({
                type: 'info',
                text1: 'Creating Account',
                text2: 'This may take a moment...'
            });

            await signUp(actualPayload);

            Toast.show({
                type: 'success',
                text1: 'Account Created',
                text2: 'Welcome to ReVesta!'
            });
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

    const RoleCard = ({ role, title, desc, icon: Icon, color, bgColor }) => {
        const isSelected = formData.role === role;
        return (
            <TouchableOpacity
                onPress={() => handleRoleSelect(role)}
                style={[
                    styles.roleCard,
                    isSelected && { borderColor: '#2E7D32', backgroundColor: '#F0FDF4' }
                ]}
            >
                <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
                    <Icon size={24} color={color} />
                </View>
                <View style={styles.roleInfo}>
                    <Text style={styles.roleTitle}>{title}</Text>
                    <Text style={styles.roleDesc}>{desc}</Text>
                </View>
                {isSelected && <Check size={20} color="#2E7D32" />}
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
        <View style={styles.headerBackground}>
            <LinearGradient
                colors={['#2E7D32', '#1B5E20']}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.curvedShape} />
            <SafeAreaView style={styles.headerContent}>
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <ArrowLeft size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.greetingText}>Sign Up</Text>
                <Text style={styles.welcomeText}>Join Revesta today</Text>
            </SafeAreaView>
        </View>
    );

    if (step === 1) {
        return (
            <View style={styles.container}>
                {renderHeader()}
                <View style={styles.contentContainer}>
                    <View style={styles.formCard}>
                        <Text style={styles.cardTitle}>Choose your role</Text>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.rolesContainer}>
                                <RoleCard
                                    role="COLLECTOR"
                                    title="Become a Collector"
                                    desc="Pick up waste and earn money"
                                    icon={Truck}
                                    color="#2E7D32"
                                    bgColor="#DCFCE7"
                                />
                                <RoleCard
                                    role="SELLER"
                                    title="Become a Disposer"
                                    desc="Dispose of waste responsibly"
                                    icon={Trash2}
                                    color="#2563EB"
                                    bgColor="#DBEAFE"
                                />
                                <RoleCard
                                    role="RECYCLER"
                                    title="Become a Recycler"
                                    desc="Buy and process recyclables"
                                    icon={Recycle}
                                    color="#EA580C"
                                    bgColor="#FFEDD5"
                                />
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {renderHeader()}

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={styles.contentContainer}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.formCard}>
                        <Text style={styles.cardTitle}>Create Account</Text>
                        <Text style={styles.roleLabel}>Registering as {formData.role.toLowerCase()}</Text>

                        <View style={styles.formFields}>
                            <View style={styles.inputWrapper}>
                                <View style={styles.iconContainer}>
                                    <User size={20} color="#666" />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Username"
                                    placeholderTextColor="#999"
                                    value={formData.username}
                                    onChangeText={(val) => handleChange('username', val)}
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={[styles.inputWrapper, { marginTop: 15 }]}>
                                <View style={styles.iconContainer}>
                                    <Mail size={20} color="#666" />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Email Address"
                                    placeholderTextColor="#999"
                                    value={formData.email}
                                    onChangeText={(val) => handleChange('email', val)}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                            </View>

                            <View style={[styles.inputWrapper, { marginTop: 15 }]}>
                                <View style={styles.iconContainer}>
                                    <Phone size={20} color="#666" />
                                </View>
                                <View style={styles.phoneLabel}>
                                    <Text style={styles.countryCode}>🇬🇭 +233</Text>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Mobile number"
                                    placeholderTextColor="#999"
                                    value={formData.phone_number}
                                    onChangeText={(val) => {
                                        handleChange('phone_number', val);
                                        setIsPhoneVerified(false);
                                    }}
                                    keyboardType="phone-pad"
                                />
                                {isPhoneVerified ? (
                                    <Check size={20} color="#2E7D32" />
                                ) : (
                                    <TouchableOpacity
                                        style={styles.verifySmallBtn}
                                        onPress={sendVerification}
                                        disabled={verifying || !formData.phone_number}
                                    >
                                        <Text style={styles.verifySmallText}>{verifying ? '...' : 'Verify'}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>

                            <View style={[styles.inputWrapper, { marginTop: 15 }]}>
                                <View style={styles.iconContainer}>
                                    <Lock size={20} color="#666" />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Password"
                                    placeholderTextColor="#999"
                                    value={formData.password}
                                    onChangeText={(val) => handleChange('password', val)}
                                    secureTextEntry
                                />
                            </View>

                            <View style={[styles.inputWrapper, { marginTop: 15 }]}>
                                <View style={styles.iconContainer}>
                                    <Lock size={20} color="#666" />
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Confirm Password"
                                    placeholderTextColor="#999"
                                    value={formData.confirm_password}
                                    onChangeText={(val) => handleChange('confirm_password', val)}
                                    secureTextEntry
                                />
                            </View>

                            {formData.role === 'COLLECTOR' && (
                                <>
                                    <View style={[styles.inputWrapper, { marginTop: 15 }]}>
                                        <View style={styles.iconContainer}>
                                            <Truck size={20} color="#666" />
                                        </View>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="Vehicle Type (e.g. TRUCK)"
                                            placeholderTextColor="#999"
                                            value={formData.vehicle_type}
                                            onChangeText={(val) => handleChange('vehicle_type', val)}
                                        />
                                    </View>
                                    <View style={[styles.inputWrapper, { marginTop: 15 }]}>
                                        <View style={styles.iconContainer}>
                                            <FileText size={20} color="#666" />
                                        </View>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="License Plate"
                                            placeholderTextColor="#999"
                                            value={formData.license_plate}
                                            onChangeText={(val) => handleChange('license_plate', val)}
                                        />
                                    </View>
                                </>
                            )}

                            {formData.role === 'RECYCLER' && (
                                <View style={{ marginTop: 15 }}>
                                    <Text style={styles.fieldTitle}>Recycler Type</Text>
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
                                            <View style={[styles.inputWrapper, { marginTop: 15 }]}>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="Company Name"
                                                    placeholderTextColor="#999"
                                                    value={formData.company_name}
                                                    onChangeText={(val) => handleChange('company_name', val)}
                                                />
                                            </View>
                                            <View style={[styles.inputWrapper, { marginTop: 15 }]}>
                                                <TextInput
                                                    style={styles.input}
                                                    placeholder="Tax ID"
                                                    placeholderTextColor="#999"
                                                    value={formData.tax_id}
                                                    onChangeText={(val) => handleChange('tax_id', val)}
                                                />
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
                                                        <Upload size={20} color="#2E7D32" />
                                                        <Text style={styles.uploadInfo}>Business Certificate</Text>
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <View style={[styles.inputWrapper, { marginTop: 15 }]}>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="National ID"
                                                placeholderTextColor="#999"
                                                value={formData.national_id}
                                                onChangeText={(val) => handleChange('national_id', val)}
                                            />
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>

                        <TouchableOpacity
                            style={styles.termsWrapper}
                            onPress={() => handleChange('termsAccepted', !formData.termsAccepted)}
                        >
                            <View style={[styles.checkbox, formData.termsAccepted && styles.checkboxActive]}>
                                {formData.termsAccepted && <Check size={12} color="#fff" />}
                            </View>
                            <Text style={styles.termsText}>I accept the Terms and Conditions</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.registerButton}
                            onPress={handleRegister}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.registerButtonText}>Create Account</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.footerLink}>
                            <Text style={styles.footerText}>
                                Already have account? <Text style={styles.footerLinkBold}>Login</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

            <Modal visible={showOtpModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>Verification Code</Text>
                        <Text style={styles.modalDesc}>Sent to {formData.phone_number}</Text>
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
                            onPress={confirmCode}
                            disabled={verifying}
                        >
                            {verifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.modalBtnText}>Confirm</Text>}
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setShowOtpModal(false)}>
                            <Text style={styles.modalCancel}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
            <Toast />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0F7F4',
    },
    headerBackground: {
        height: 280,
        backgroundColor: '#2E7D32',
        position: 'relative',
        overflow: 'hidden',
    },
    curvedShape: {
        position: 'absolute',
        bottom: -120,
        left: -width * 0.25,
        width: width * 1.5,
        height: width * 1.5,
        borderRadius: width * 0.75,
        backgroundColor: '#388E3C',
        opacity: 0.3,
    },
    headerContent: {
        paddingHorizontal: 25,
        paddingTop: 20,
    },
    headerRow: {
        marginBottom: 20,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    greetingText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#fff',
    },
    welcomeText: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 5,
        fontWeight: '500',
    },
    contentContainer: {
        flex: 1,
        marginTop: -50,
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
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 8,
    },
    roleLabel: {
        fontSize: 14,
        color: '#999',
        marginBottom: 25,
        fontWeight: '500',
    },
    rolesContainer: {
        gap: 15,
        paddingBottom: 20,
    },
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderWidth: 2,
        borderColor: '#EEE',
        borderRadius: 18,
        backgroundColor: '#fff',
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15,
    },
    roleInfo: {
        flex: 1,
    },
    roleTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 2,
    },
    roleDesc: {
        fontSize: 12,
        color: '#999',
    },
    formFields: {
        marginBottom: 20,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        height: 56,
        paddingHorizontal: 15,
    },
    iconContainer: {
        marginRight: 10,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#333',
        height: '100%',
    },
    phoneLabel: {
        marginRight: 10,
        borderRightWidth: 1,
        borderRightColor: '#EEE',
        paddingRight: 10,
    },
    countryCode: {
        fontSize: 15,
        color: '#333',
        fontWeight: '600',
    },
    verifySmallBtn: {
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    verifySmallText: {
        color: '#2E7D32',
        fontSize: 12,
        fontWeight: 'bold',
    },
    fieldTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 10,
        marginLeft: 5,
    },
    chipRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 5,
    },
    smallChip: {
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#F5F5F5',
    },
    smallChipActive: {
        backgroundColor: '#2E7D32',
    },
    smallChipText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '600',
    },
    smallChipTextActive: {
        color: '#fff',
    },
    uploadBox: {
        marginTop: 15,
        borderWidth: 1,
        borderColor: '#F3F4F6',
        borderRadius: 15,
        backgroundColor: '#F9FAFB',
        padding: 15,
        borderStyle: 'dashed',
    },
    uploadRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    miniPreview: {
        width: 30,
        height: 30,
        borderRadius: 5,
        marginRight: 10,
    },
    uploadInfo: {
        flex: 1,
        fontSize: 13,
        color: '#666',
    },
    changeLink: {
        fontSize: 12,
        color: '#2E7D32',
        fontWeight: 'bold',
    },
    termsWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
        paddingHorizontal: 5,
    },
    checkbox: {
        width: 18,
        height: 18,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: '#2E7D32',
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxActive: {
        backgroundColor: '#2E7D32',
    },
    termsText: {
        fontSize: 12,
        color: '#999',
    },
    registerButton: {
        backgroundColor: '#2E7D32',
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#2E7D32',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
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
        marginTop: 20,
    },
    footerText: {
        fontSize: 14,
        color: '#999',
    },
    footerLinkBold: {
        color: '#2E7D32',
        fontWeight: 'bold',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    modalCard: {
        backgroundColor: '#fff',
        width: '100%',
        borderRadius: 25,
        padding: 30,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 5,
    },
    modalDesc: {
        fontSize: 14,
        color: '#999',
        marginBottom: 25,
        textAlign: 'center',
    },
    otpInput: {
        width: '100%',
        height: 60,
        backgroundColor: '#F5F5F5',
        borderRadius: 15,
        textAlign: 'center',
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 20,
        letterSpacing: 10,
    },
    modalBtn: {
        backgroundColor: '#2E7D32',
        width: '100%',
        height: 56,
        borderRadius: 15,
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
        fontWeight: '600',
    },
});
