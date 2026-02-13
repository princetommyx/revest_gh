import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView, ActivityIndicator, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authApi } from '../api/auth';
import { useNavigation } from '@react-navigation/native';

import { ArrowLeft, Truck, Trash2, Recycle, Check, Upload, Image as ImageIcon } from 'lucide-react-native';
import apiClient from '../api/client';
import * as ImagePicker from 'expo-image-picker';

import Toast from 'react-native-toast-message';

const COLORS = {
    primary: '#27AE60', // Matching Web
    secondary: '#2980B9',
    background: '#F4F6F8',
    text: '#1F2937',
    textLight: '#6B7280',
    white: '#FFFFFF',
    border: '#E5E7EB',
};

import { useAuth } from '../context/AuthContext';

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
        // Collector
        vehicle_type: '',
        license_plate: '',
        // Recycler
        recycler_type: 'INDIVIDUAL', // INDIVIDUAL or COMPANY
        company_name: '',
        tax_id: '',
        national_id: '',
        termsAccepted: false,
    });
    const [certificationImage, setCertificationImage] = useState(null);

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
        // Small delay for UI feedback
        setTimeout(() => setStep(2), 200);
    };

    const handleRegister = async () => {
        // Validation
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

        setLoading(true);
        try {
            // Construct payload matching frontend structure
            const payload = {
                username: formData.username,
                email: formData.email,
                password: formData.password,
                password2: formData.confirm_password,
                phone_number: formData.phone_number,
                city: formData.city,
                role: formData.role,
                // Spread role specific fields
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

            // Convert to FormData if image is present or simply to handle file upload standard
            // We'll use FormData if it's a Recycler Company
            let actualPayload = payload;

            if (formData.role === 'RECYCLER' && formData.recycler_type === 'COMPANY') {
                const data = new FormData();
                // Append all text fields
                Object.keys(payload).forEach(key => {
                    if (payload[key] !== undefined && payload[key] !== null) {
                        data.append(key, payload[key]);
                    }
                });

                // Append file
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
                } else {
                    // Optional: Validation if certification is mandatory
                    // For now, let's make it optional or warn
                }
                actualPayload = data;
            }

            // Show progress message

            // Show progress message
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

            let msg = 'Registration failed';
            let shouldRetryLogin = false;

            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                msg = "Server is taking longer than expected. Your account may have been created. Try logging in instead.";
                shouldRetryLogin = true;
            } else if (!error.response) {
                // Network error (no response received)
                msg = "Network Error. Is the backend running at " + apiClient.defaults.baseURL + "?";
                if (error.message) msg += " (" + error.message + ")";
            } else if (error.response?.data) {
                const errorData = error.response.data;

                // Check if account already exists
                const errorStr = JSON.stringify(errorData).toLowerCase();
                if (errorStr.includes('already exists') || errorStr.includes('duplicate')) {
                    msg = "Account already exists. Please try logging in.";
                    shouldRetryLogin = true;
                } else {
                    const firstValue = Object.values(errorData)[0];
                    if (Array.isArray(firstValue)) {
                        msg = firstValue[0];
                    } else if (typeof firstValue === 'string') {
                        msg = firstValue;
                    } else {
                        msg = JSON.stringify(errorData);
                    }
                }
            }

            Toast.show({
                type: shouldRetryLogin ? 'info' : 'error',
                text1: shouldRetryLogin ? 'Try Logging In' : 'Registration Failed',
                text2: msg
            });

            // If account might exist, nav to login after delay
            if (shouldRetryLogin) {
                setTimeout(() => navigation.navigate('Login'), 2000);
            }
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
                    isSelected && { borderColor: COLORS.primary, backgroundColor: '#F0FDF4' }
                ]}
            >
                <View style={[styles.iconCircle, { backgroundColor: bgColor }]}>
                    <Icon size={24} color={color} />
                </View>
                <View style={styles.roleInfo}>
                    <Text style={styles.roleTitle}>{title}</Text>
                    <Text style={styles.roleDesc}>{desc}</Text>
                </View>
                {isSelected && <Check size={20} color={COLORS.primary} />}
            </TouchableOpacity>
        );
    };

    const handleBack = () => {
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
            });
        }
    };

    // Step 1: Role Selection
    if (step === 1) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                        <ArrowLeft size={24} color="#000" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Register</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.content}>
                    <Text style={styles.stepTitle}>Choose your role</Text>

                    <View style={styles.rolesContainer}>
                        <RoleCard
                            role="COLLECTOR"
                            title="Become a Collector"
                            desc="Pick up waste and earn money"
                            icon={Truck}
                            color={COLORS.primary}
                            bgColor="#DCFCE7" // green-100
                        />

                        <RoleCard
                            role="SELLER"
                            title="Become a Disposer"
                            desc="Dispose of waste responsibly"
                            icon={Trash2}
                            color="#2563EB" // blue-600
                            bgColor="#DBEAFE" // blue-100
                        />

                        <RoleCard
                            role="RECYCLER"
                            title="Become a Recycler"
                            desc="Buy and process recyclables"
                            icon={Recycle}
                            color="#EA580C" // orange-600
                            bgColor="#FFEDD5" // orange-100
                        />
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    // Step 2: Details Form
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => setStep(1)} style={styles.backButton}>
                    <ArrowLeft size={24} color="#000" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Details</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <Text style={styles.stepTitle}>Create Account</Text>
                <Text style={styles.subTitle}>Registering as {formData.role.toLowerCase()}</Text>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Username</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Choose a username"
                        placeholderTextColor={COLORS.textLight}
                        value={formData.username}
                        onChangeText={(val) => handleChange('username', val)}
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter email address"
                        placeholderTextColor={COLORS.textLight}
                        value={formData.email}
                        onChangeText={(val) => handleChange('email', val)}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                {/* Password Fields */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Create a password"
                        placeholderTextColor={COLORS.textLight}
                        value={formData.password}
                        onChangeText={(val) => handleChange('password', val)}
                        secureTextEntry
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Confirm Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Repeat password"
                        placeholderTextColor={COLORS.textLight}
                        value={formData.confirm_password}
                        onChangeText={(val) => handleChange('confirm_password', val)}
                        secureTextEntry
                    />
                </View>

                {/* Phone & City */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Phone Number</Text>
                    <View style={styles.phoneContainer}>
                        <View style={styles.phonePrefix}>
                            <Text>🇬🇭 +233</Text>
                        </View>
                        <TextInput
                            style={[styles.input, { flex: 1, borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }]}
                            placeholder="Mobile number"
                            placeholderTextColor={COLORS.textLight}
                            value={formData.phone_number}
                            onChangeText={(val) => handleChange('phone_number', val)}
                            keyboardType="phone-pad"
                        />
                    </View>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>City</Text>
                    {/* Simplified dropdown via simple view for now, could use Picker or Modal */}
                    <View style={styles.pickerFake}>
                        <Text>{formData.city}</Text>
                    </View>
                </View>

                {/* Conditional Fields: Collector */}
                {formData.role === 'COLLECTOR' && (
                    <>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Vehicle Type</Text>
                            {/* Placeholder for Picker */}
                            <TextInput
                                style={styles.input}
                                placeholder="TRUCK, TRICYCLE, MOTORBIKE..."
                                placeholderTextColor={COLORS.textLight}
                                value={formData.vehicle_type}
                                onChangeText={(val) => handleChange('vehicle_type', val)}
                            />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>License Plate</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter license plate"
                                placeholderTextColor={COLORS.textLight}
                                value={formData.license_plate}
                                onChangeText={(val) => handleChange('license_plate', val)}
                            />
                        </View>
                    </>
                )}

                {/* Conditional Fields: Recycler */}
                {formData.role === 'RECYCLER' && (
                    <>
                        <View style={styles.formGroup}>
                            <Text style={styles.label}>Recycler Type</Text>
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity
                                    style={[styles.chip, formData.recycler_type === 'INDIVIDUAL' && styles.chipActive]}
                                    onPress={() => handleChange('recycler_type', 'INDIVIDUAL')}
                                >
                                    <Text style={[styles.chipText, formData.recycler_type === 'INDIVIDUAL' && styles.chipTextActive]}>Individual</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.chip, formData.recycler_type === 'COMPANY' && styles.chipActive]}
                                    onPress={() => handleChange('recycler_type', 'COMPANY')}
                                >
                                    <Text style={[styles.chipText, formData.recycler_type === 'COMPANY' && styles.chipTextActive]}>Company</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {formData.recycler_type === 'COMPANY' ? (
                            <>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Company Name</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Company Name"
                                        placeholderTextColor={COLORS.textLight}
                                        value={formData.company_name}
                                        onChangeText={(val) => handleChange('company_name', val)}
                                    />
                                </View>
                                <View style={styles.formGroup}>
                                    <Text style={styles.label}>Tax ID</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Tax ID"
                                        placeholderTextColor={COLORS.textLight}
                                        value={formData.tax_id}
                                        onChangeText={(val) => handleChange('tax_id', val)}
                                    />
                                </View>
                            </>
                        ) : (
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>National ID</Text>
                                <TextInput
                                    style={styles.input}
                                    placeholder="National ID"
                                    placeholderTextColor={COLORS.textLight}
                                    value={formData.national_id}
                                    onChangeText={(val) => handleChange('national_id', val)}
                                />
                            </View>
                        )}

                        {formData.recycler_type === 'COMPANY' && (
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>Business Certification</Text>
                                <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
                                    {certificationImage ? (
                                        <View style={styles.uploadContent}>
                                            <Image source={{ uri: certificationImage.uri }} style={styles.uploadedPreview} />
                                            <Text style={styles.filename} numberOfLines={1}>
                                                {certificationImage.uri.split('/').pop()}
                                            </Text>
                                            <View style={styles.changeBadge}>
                                                <Text style={styles.changeText}>Change</Text>
                                            </View>
                                        </View>
                                    ) : (
                                        <View style={styles.uploadPlaceholder}>
                                            <Upload size={24} color={COLORS.primary} />
                                            <Text style={styles.uploadText}>Upload Business Certificate</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}

                    </>
                )}

                <View style={styles.termsContainer}>
                    <TouchableOpacity
                        style={[styles.checkbox, formData.termsAccepted && styles.checkboxActive]}
                        onPress={() => handleChange('termsAccepted', !formData.termsAccepted)}
                    >
                        {formData.termsAccepted && <Check size={14} color="#fff" />}
                    </TouchableOpacity>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.termsText}>
                            By registering, you agree to our <Text style={styles.linkText}>Terms of Service</Text> and <Text style={styles.linkText}>Privacy policy</Text>, commit to comply with obligations under the European Union and local legislation and provide only legal services and content on the Revesta Platform.
                        </Text>
                        <Text style={[styles.termsText, { marginTop: 8 }]}>
                            Once you've become a {formData.role.toLowerCase()}, we will occasionally send you offers and promotions related to our services. You can always unsubscribe by changing your communication preferences.
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={handleRegister}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.submitButtonText}>Create Account</Text>
                    )}
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    content: {
        padding: 24,
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 50,
    },
    stepTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        textAlign: 'center',
        marginBottom: 24,
    },
    subTitle: {
        fontSize: 16,
        color: COLORS.textLight,
        textAlign: 'center',
        marginBottom: 24,
        marginTop: -16,
    },
    rolesContainer: {
        gap: 16,
    },
    roleCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderWidth: 2,
        borderColor: COLORS.border,
        borderRadius: 16,
        backgroundColor: COLORS.white,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    roleInfo: {
        flex: 1,
    },
    roleTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    roleDesc: {
        fontSize: 14,
        color: COLORS.textLight,
    },
    formGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 14,
        fontSize: 16,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    phoneContainer: {
        flexDirection: 'row',
    },
    phonePrefix: {
        backgroundColor: COLORS.background,
        paddingHorizontal: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderTopLeftRadius: 12,
        borderBottomLeftRadius: 12,
        marginRight: 1,
    },
    pickerFake: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        padding: 16,
    },
    chip: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: COLORS.background,
    },
    chipActive: {
        backgroundColor: COLORS.primary,
    },
    chipText: {
        color: COLORS.text,
        fontWeight: '500',
    },
    chipTextActive: {
        color: COLORS.white,
    },
    submitButton: {
        backgroundColor: COLORS.primary,
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 24,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    submitButtonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: 'bold',
    },
    termsContainer: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 12,
        alignItems: 'flex-start',
    },
    checkbox: {
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    checkboxActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    termsText: {
        flex: 1,
        fontSize: 12,
        color: COLORS.textLight,
        lineHeight: 18,
    },
    linkText: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    uploadButton: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
        borderRadius: 12,
        backgroundColor: COLORS.background,
        overflow: 'hidden',
    },
    uploadPlaceholder: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    uploadText: {
        color: COLORS.primary,
        fontWeight: '500',
    },
    uploadContent: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    uploadedPreview: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
    },
    filename: {
        flex: 1,
        color: COLORS.text,
        fontSize: 14,
    },
    changeBadge: {
        backgroundColor: COLORS.background,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    changeText: {
        color: COLORS.textLight,
        fontSize: 12,
        fontWeight: '500',
    },
});
